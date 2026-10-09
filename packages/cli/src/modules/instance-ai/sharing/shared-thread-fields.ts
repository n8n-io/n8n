import type { InstanceAiThreadInfo } from '@n8n/api-types';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { ProjectService } from '@/services/project.service.ee';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '../../agents/repositories/agent-execution-thread.repository';
import { userDisplayName } from '../../agents/utils/user-display-name';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_RUN_TARGET_LOST_KEY,
	ASSISTANT_TURN_DEFAULTS_KEY,
} from '../assistant-turn-options';

type SharingFields = Pick<InstanceAiThreadInfo, 'sharedWith' | 'owner'>;

/**
 * Thread metadata that only the owner gets. The turn defaults hold the owner's push connection,
 * and the lost link marker names the owner's link.
 */
const OWNER_ONLY_METADATA_KEYS: readonly string[] = [
	ASSISTANT_TURN_DEFAULTS_KEY,
	ASSISTANT_RUN_TARGET_LOST_KEY,
];

/**
 * The thread as `viewer` may see it: without the owner-only metadata, run target and lost link
 * of another user's thread. Both name the owner's link.
 */
function forViewer(viewer: User, thread: InstanceAiThreadInfo): InstanceAiThreadInfo {
	if (thread.resourceId === viewer.id) return thread;
	const { runTarget: _runTarget, lostRunTarget: _lostRunTarget, ...teammateView } = thread;
	if (!teammateView.metadata) return teammateView;
	const metadata = Object.fromEntries(
		Object.entries(teammateView.metadata).filter(
			([key]) => !OWNER_ONLY_METADATA_KEYS.includes(key),
		),
	);
	return { ...teammateView, metadata };
}

/** Marks the shared threads of a thread list with the project and the owner. */
@Service()
export class SharedThreadFields {
	constructor(
		private readonly threads: AgentExecutionThreadRepository,
		private readonly projectService: ProjectService,
		private readonly users: UserRepository,
	) {}

	/** Adds `sharedWith` and `owner` to the shared threads of a list, as `viewer` may see them. */
	async addTo(viewer: User, threads: InstanceAiThreadInfo[]): Promise<InstanceAiThreadInfo[]> {
		const ids = threads.map(({ id }) => id);
		const shared = await this.threads.findSharedByIds(ASSISTANT_AGENT_ID, ids);
		if (shared.length === 0) return threads;
		const fields = await this.fieldsOf(shared);
		return threads.map((thread) => ({ ...forViewer(viewer, thread), ...fields.get(thread.id) }));
	}

	private async fieldsOf(shared: AgentExecutionThread[]): Promise<Map<string, SharingFields>> {
		const projectNames = await this.projectNames(shared.map(({ projectId }) => projectId));
		const ownerNames = await this.ownerNames(shared.flatMap(({ ownerId }) => ownerId ?? []));
		const fields = new Map<string, SharingFields>();
		for (const thread of shared) {
			const ownerId = thread.ownerId ?? '';
			fields.set(thread.id, {
				sharedWith: {
					projectId: thread.projectId,
					projectName: projectNames.get(thread.projectId) ?? '',
				},
				owner: { id: ownerId, name: ownerNames.get(ownerId) ?? '' },
			});
		}
		return fields;
	}

	private async projectNames(projectIds: string[]): Promise<Map<string, string>> {
		const unique = [...new Set(projectIds)];
		const projects = await Promise.all(
			unique.map(async (id) => await this.projectService.findProject(id)),
		);
		return new Map(
			projects.flatMap((project): [string, string][] =>
				project ? [[project.id, project.name]] : [],
			),
		);
	}

	private async ownerNames(ownerIds: string[]): Promise<Map<string, string>> {
		const owners = await this.users.findManyByIds([...new Set(ownerIds)]);
		return new Map(owners.map((owner): [string, string] => [owner.id, userDisplayName(owner)]));
	}
}
