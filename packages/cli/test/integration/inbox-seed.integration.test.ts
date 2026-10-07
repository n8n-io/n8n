import { mockInstance } from '@n8n/backend-test-utils';
import * as db from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { InboxSourceRegistry } from '@/modules/inbox/inbox-source.registry';
import { InboxService } from '@/modules/inbox/inbox.service';
import { SelfHealingResultService } from '@/modules/instance-ai/self-healing/self-healing-result.service';
import { WorkflowSuggestionService } from '@/modules/instance-ai/workflow-suggestions/workflow-suggestion.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { createUser } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublicationNotifier);
setupTestServer({ modules: ['instance-ai', 'inbox'], endpointGroups: [] });

type SeededResult = {
	resultId: string;
	workflowId: string;
	projectId: string;
	outcome: string;
};
type SeedRuntime = {
	db: typeof db;
	container: typeof Container;
	stringify: typeof stringify;
	results: SelfHealingResultService;
	suggestions: WorkflowSuggestionService;
	policy: PolicyEnforcementService;
};

let seedInbox: (runtime: SeedRuntime, userId: string) => Promise<SeededResult[]>;
let runtime: SeedRuntime;

beforeAll(async () => {
	const seedPath = path.resolve(__dirname, '../../../../scripts/instance-seeding/seedInbox.mjs');
	const seed = (await import(seedPath)) as { seedInbox: typeof seedInbox };
	seedInbox = seed.seedInbox;
	runtime = {
		db,
		container: Container,
		stringify,
		results: Container.get(SelfHealingResultService),
		suggestions: Container.get(WorkflowSuggestionService),
		policy: Container.get(PolicyEnforcementService),
	};
	Container.get(InboxSourceRegistry).register({
		type: 'self_healing_result',
		isEnabled: async () => true,
		list: async (user, query) => await runtime.results.listForInbox(user, query),
		count: async (user) => await runtime.results.countForInbox(user),
	});
});

it('stores the four seed cases through completion and returns them through Inbox', async () => {
	const user = await createUser();
	const seeded = await seedInbox(runtime, user.id);
	expect(seeded.map(({ outcome }) => outcome)).toEqual([
		'fix_ready',
		'needs_you',
		'needs_you',
		'could_not_fix',
	]);
	const inbox = Container.get(InboxService);
	const page = await inbox.list(user, { state: 'open', limit: 20 });
	expect(page.data.map(({ id }) => id).sort()).toEqual(
		seeded.map(({ resultId }) => resultId).sort(),
	);
	expect(await inbox.getSummary(user)).toMatchObject({
		counts: { open: 4, closed: 0 },
		partial: false,
	});
	for (const [index, result] of seeded.entries()) {
		const detail = await runtime.results.getDetail(
			user,
			result.projectId,
			result.workflowId,
			result.resultId,
		);
		expect(detail.execution.status).toBe('available');
		expect(detail.reviewState).toBe('open');
		expect(!!detail.suggestion).toBe(index < 2);
	}

	const otherUser = await createUser();
	const others = await seedInbox(runtime, otherUser.id);
	const replaced = await seedInbox(runtime, user.id);
	expect(replaced.map(({ workflowId }) => workflowId)).toEqual(
		seeded.map(({ workflowId }) => workflowId),
	);
	expect(replaced.map(({ resultId }) => resultId)).not.toEqual(
		seeded.map(({ resultId }) => resultId),
	);
	for (const result of others) {
		await expect(
			runtime.results.getDetail(otherUser, result.projectId, result.workflowId, result.resultId),
		).resolves.toMatchObject({ reviewState: 'open' });
	}
});

it('preserves a seed workflow whose ownership changed', async () => {
	const user = await createUser();
	const seeded = await seedInbox(runtime, user.id);
	const other = await createUser();
	const otherProject = await Container.get(db.ProjectRepository).getPersonalProjectForUserOrFail(
		other.id,
	);
	const first = seeded[0];
	await Container.get(db.SharedWorkflowRepository).update(
		{ workflowId: first.workflowId, role: 'workflow:owner' },
		{ projectId: otherProject.id },
	);
	await expect(seedInbox(runtime, user.id)).rejects.toThrow('no longer belongs to this seed');
	expect(
		await Container.get(db.WorkflowRepository).findOneBy({ id: first.workflowId }),
	).not.toBeNull();
});
