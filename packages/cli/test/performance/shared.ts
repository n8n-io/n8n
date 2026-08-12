import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createOwner } from '../integration/shared/db/users';

/** Prose padding so each workflow carries a realistic JSON payload. */
export const LOREM =
	'This node handles the customer onboarding flow. It reads from the CRM, ' +
	'normalises the payload, and forwards it to the billing pipeline. Retries ' +
	'are configured for transient upstream failures. Owner: platform team. ';

/** One node per workflow; every corpus row matches '%step 3 of flow%'. */
export const singleStepNode = (idx: number): INode[] => [
	{
		id: uuid(),
		name: `Step 3 of flow ${idx}`,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: { body: LOREM.repeat(6) },
	},
];

/**
 * Truncates workflow-related tables, creates an owner, and bulk-seeds `count`
 * workflows (all owned by the owner's personal project).
 */
export async function seedCorpus(
	count: number,
	buildNodes: (idx: number) => INode[] = singleStepNode,
): Promise<{ owner: User; projectId: string }> {
	await testDb.truncate(['SharedWorkflow', 'ProjectRelation', 'WorkflowEntity', 'Project', 'User']);
	const owner = await createOwner();
	const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id);

	const repo = Container.get(WorkflowRepository);
	const shared = Container.get(SharedWorkflowRepository);
	const CHUNK = 250;

	for (let start = 0; start < count; start += CHUNK) {
		const size = Math.min(CHUNK, count - start);
		const rows = Array.from({ length: size }, (_, i) => {
			const idx = start + i;
			return repo.create({
				id: `perf-wf-${idx.toString().padStart(7, '0')}`,
				name: `Perf Workflow ${idx}`,
				active: false,
				isArchived: false,
				nodes: buildNodes(idx),
				connections: {},
				nodeGroups: [],
				versionId: uuid(),
				settings: {},
			});
		});
		await repo.insert(rows);
		await shared.insert(
			rows.map((w) => ({
				workflowId: w.id,
				projectId: project.id,
				role: 'workflow:owner' as const,
			})),
		);
	}

	return { owner, projectId: project.id };
}
