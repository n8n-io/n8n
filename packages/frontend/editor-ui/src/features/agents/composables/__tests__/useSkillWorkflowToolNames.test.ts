import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';

import {
	useSkillWorkflowNames,
	useSkillWorkflowToolNames,
} from '@/features/agents/composables/useSkillWorkflowToolNames';

const searchWorkflows = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows }),
}));

const workflowsInSkillsEnabled = ref(true);
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: (name: string, variant: string) =>
			workflowsInSkillsEnabled.value && name === '152_workflows_in_skills' && variant === 'variant',
	}),
}));

const scopes: EffectScope[] = [];

function runInScope<T>(setup: () => T): T {
	const scope = effectScope();
	scopes.push(scope);
	return scope.run(setup)!;
}

function useInScope(toolNames: () => string[]) {
	return runInScope(() => useSkillWorkflowToolNames(toolNames));
}

describe('useSkillWorkflowToolNames', () => {
	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
	});

	beforeEach(() => {
		searchWorkflows.mockReset();
		workflowsInSkillsEnabled.value = true;
	});

	it('names the workflow tool of a skill after its workflow', async () => {
		searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Lucky code' }]);

		const { skillWorkflowName } = useInScope(() => ['workflow_wf1', 'send_report']);
		await flushPromises();

		expect(searchWorkflows).toHaveBeenCalledWith({
			ids: ['wf1'],
			select: ['id', 'name'],
			options: { take: 1, includeScopes: false },
		});
		expect(skillWorkflowName('workflow_wf1')).toBe('Lucky code');
		expect(skillWorkflowName('send_report')).toBeUndefined();
	});

	it('requests each workflow only once', async () => {
		searchWorkflows.mockResolvedValue([{ id: 'wf2', name: 'Notify team' }]);

		useInScope(() => ['workflow_wf2']);
		const { skillWorkflowName } = useInScope(() => ['workflow_wf2']);
		await flushPromises();

		expect(searchWorkflows).toHaveBeenCalledTimes(1);
		expect(skillWorkflowName('workflow_wf2')).toBe('Notify team');
	});

	it('keeps the tool name when the workflow cannot be read, and requests it again later', async () => {
		searchWorkflows.mockRejectedValueOnce(new Error('Network error'));
		searchWorkflows.mockResolvedValueOnce([{ id: 'wf3', name: 'Lookup order' }]);
		const toolNames = ref(['workflow_wf3']);

		const { skillWorkflowName } = useInScope(() => toolNames.value);
		await flushPromises();

		expect(skillWorkflowName('workflow_wf3')).toBeUndefined();

		toolNames.value = ['workflow_wf3', 'send_report'];
		await flushPromises();

		expect(searchWorkflows).toHaveBeenCalledTimes(2);
		expect(skillWorkflowName('workflow_wf3')).toBe('Lookup order');
	});

	it('requests the names of many workflows in batches of 50', async () => {
		const workflowIds = Array.from({ length: 120 }, (_, index) => `batch${index}`);
		searchWorkflows.mockImplementation(async ({ ids }: { ids: string[] }) =>
			ids.map((id) => ({ id, name: `Workflow ${id}` })),
		);

		const { skillWorkflowName } = useInScope(() => workflowIds.map((id) => `workflow_${id}`));
		await flushPromises();

		expect(searchWorkflows.mock.calls.map(([{ ids }]) => ids.length)).toEqual([50, 50, 20]);
		expect(searchWorkflows.mock.calls.map(([{ options }]) => options.take)).toEqual([50, 50, 20]);
		expect(skillWorkflowName('workflow_batch0')).toBe('Workflow batch0');
		expect(skillWorkflowName('workflow_batch119')).toBe('Workflow batch119');
	});

	it('requests nothing when the feature flag is off', async () => {
		workflowsInSkillsEnabled.value = false;

		useInScope(() => ['workflow_wf4']);
		await flushPromises();

		expect(searchWorkflows).not.toHaveBeenCalled();
	});

	it('loads the current names again for each new builder view', async () => {
		searchWorkflows.mockResolvedValueOnce([{ id: 'wf5', name: 'Old name' }]);
		const first = runInScope(() => useSkillWorkflowNames(() => ['wf5']));
		await flushPromises();

		searchWorkflows.mockResolvedValueOnce([{ id: 'wf5', name: 'New name' }]);
		const second = runInScope(() => useSkillWorkflowNames(() => ['wf5']));
		await flushPromises();

		expect(searchWorkflows).toHaveBeenCalledTimes(2);
		expect(first.workflowName('wf5')).toBe('Old name');
		expect(second.workflowName('wf5')).toBe('New name');
	});
});
