import type { LinkedInstanceRemoteProject } from '@n8n/api-types';

import { RemoteInstanceError } from '../remote/remote-instance.errors';
import type { RemoteSession } from './linked-instance-sessions';
import {
	importOnRemote,
	publishOnRemote,
	type RemoteImportArgs,
	type RemoteImportResult,
} from './remote-transfer-tools';
import { isProjectRefusal, RemoteImportError, TRANSFER_WARNINGS } from './transfer-errors';

/** What happened in the linked instance during a push. */
export type RemoteOutcome = {
	imported: RemoteImportResult;
	/** `null`: the personal project of the token's user. */
	targetProject: LinkedInstanceRemoteProject | null;
	/** A version of the copy is live there. It can be an earlier version, see `publishFailed`. */
	published: boolean;
	/** The move asked to publish the copy, and the new version did not go live. */
	publishFailed: boolean;
	warnings: string[];
};

type SentCopy = Pick<RemoteOutcome, 'imported' | 'targetProject' | 'warnings'>;

type PublishOutcome = { published: boolean; failed: boolean; warnings: string[] };

/**
 * Imports into the project. A failure names the project, so that the message of the user
 * points to the place that the import used.
 * @throws {RemoteImportError}
 */
async function importInto(
	session: RemoteSession,
	args: RemoteImportArgs,
	project: LinkedInstanceRemoteProject | null,
): Promise<RemoteImportResult> {
	try {
		return await importOnRemote(session, project ? { ...args, projectId: project.id } : args);
	} catch (error) {
		if (error instanceof RemoteInstanceError) throw new RemoteImportError(error, project);
		throw error;
	}
}

/**
 * Imports into the default project of the link. When the linked instance refuses that project,
 * for example because the token's user is a viewer there, the personal project takes the workflow.
 * @throws {RemoteImportError}
 */
export async function importWithFallback(
	session: RemoteSession,
	args: RemoteImportArgs,
): Promise<SentCopy> {
	const project = session.link.defaultRemoteProject;
	try {
		return {
			imported: await importInto(session, args, project),
			targetProject: project,
			warnings: [],
		};
	} catch (error) {
		if (project === null || !isProjectRefusal(error)) throw error;
		return {
			imported: await importInto(session, args, null),
			targetProject: null,
			warnings: [TRANSFER_WARNINGS.personalProjectFallback(session.link.name, project.name)],
		};
	}
}

/**
 * Why the copy must not go live yet. A copy with missing node types cannot be published. A copy
 * with credentials without a value can be published, but it would run without them.
 */
export function publishBlockers(name: string, imported: RemoteImportResult): string[] {
	const blockers: string[] = [];
	if (imported.missingNodeTypes.length > 0) {
		blockers.push(TRANSFER_WARNINGS.missingNodeTypes(name));
	}
	const emptyCredentials = imported.credentialsNeedingSetup.length;
	if (emptyCredentials > 0) {
		blockers.push(TRANSFER_WARNINGS.credentialsNeedSetup(name, emptyCredentials));
	}
	return blockers;
}

/**
 * Puts the new version of the copy live, when nothing blocks it. A failure is a warning, and an
 * earlier version can stay live: `published` then stays `true`.
 */
export async function publishCopy(
	session: RemoteSession,
	imported: RemoteImportResult,
): Promise<PublishOutcome> {
	// A re-import of a live copy can put the new version live by itself. A publish then adds
	// nothing, and the linked instance can refuse it, for example while someone edits the copy.
	if (imported.newVersionLive === true) return { published: true, failed: false, warnings: [] };
	const { name } = session.link;
	const blockers = publishBlockers(name, imported);
	if (blockers.length > 0) {
		return { published: imported.published, failed: true, warnings: blockers };
	}
	const outcome = await publishOnRemote(session, imported.workflowId);
	if (outcome.ok) return { published: true, failed: false, warnings: [] };
	const warning =
		outcome.failure === 'unavailable'
			? TRANSFER_WARNINGS.cannotPublish(name)
			: TRANSFER_WARNINGS.publishFailed(name, outcome.reason);
	return { published: imported.published, failed: true, warnings: [warning] };
}
