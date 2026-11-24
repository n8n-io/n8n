import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { effectScope, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { listAgentsPage } from '@/features/agents/composables/useAgentApi';
import { mockedStore } from '@/__tests__/utils';

import type { WorkflowArtifactReference } from '../assistantAtMentions.types';
import { useAssistantMentionAvailability } from './useAssistantMentionAvailability';

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage: vi.fn(),
}));

describe('useAssistantMentionAvailability', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.mocked(listAgentsPage).mockReset();
		vi.mocked(listAgentsPage).mockResolvedValue({ data: [], count: 0 } as never);
	});

	function enableAgents(count: number) {
		mockedStore(useSettingsStore).isAgentsEnabled = true;
		vi.mocked(listAgentsPage).mockResolvedValue({ data: [], count } as never);
	}

	function setup(
		options: {
			enabled?: boolean;
			projectId?: string;
			artifacts?: WorkflowArtifactReference[];
		} = {},
	) {
		const enabled = ref(options.enabled ?? true);
		const projectId = ref(options.projectId);
		const artifacts = ref(options.artifacts ?? []);
		const scope = effectScope();
		let availability!: ReturnType<typeof useAssistantMentionAvailability>;
		scope.run(() => {
			availability = useAssistantMentionAvailability({ enabled, projectId, artifacts });
		});
		return { availability, artifacts, enabled, projectId, scope };
	}

	it('uses one bounded workflow row to resolve project availability', async () => {
		const store = useWorkflowsListStore();
		vi.mocked(store.searchWorkflows).mockResolvedValue([{ id: 'workflow-1' }] as never);

		const { availability, scope } = setup({ projectId: 'project-1' });

		await vi.waitFor(() => expect(availability.isAvailable.value).toBe(true));
		expect(store.searchWorkflows).toHaveBeenCalledExactlyOnceWith({
			projectId: 'project-1',
			isArchived: false,
			select: ['id', 'updatedAt'],
			options: { take: 1, skip: 0, sortBy: 'updatedAt:asc', includeScopes: false },
		});
		scope.stop();
	});

	it('uses an existing workflow artifact without a list request', () => {
		const store = useWorkflowsListStore();
		const { availability, scope } = setup({
			projectId: 'project-1',
			artifacts: [{ id: 'workflow-1', name: 'Orders' }],
		});

		expect(availability.isAvailable.value).toBe(true);
		expect(store.searchWorkflows).not.toHaveBeenCalled();
		scope.stop();
	});

	it('does not query without the rollout flag or a project', () => {
		const store = useWorkflowsListStore();
		const disabled = setup({ enabled: false, projectId: 'project-1' });
		const withoutProject = setup();

		expect(disabled.availability.isAvailable.value).toBe(false);
		expect(withoutProject.availability.isAvailable.value).toBe(false);
		expect(store.searchWorkflows).not.toHaveBeenCalled();
		disabled.scope.stop();
		withoutProject.scope.stop();
	});

	it('can refresh after a transient availability failure', async () => {
		const store = useWorkflowsListStore();
		vi.mocked(store.searchWorkflows)
			.mockRejectedValueOnce(new Error('Request failed'))
			.mockResolvedValue([{ id: 'workflow-1' }] as never);
		const { availability, scope } = setup({ projectId: 'project-1' });

		await vi.waitFor(() => expect(availability.isLoading.value).toBe(false));
		expect(availability.isAvailable.value).toBe(false);

		await availability.refresh();
		expect(availability.isAvailable.value).toBe(true);
		scope.stop();
	});

	it('does not list agents when agents are off', async () => {
		const store = useWorkflowsListStore();
		vi.mocked(store.searchWorkflows).mockResolvedValue([] as never);
		const { availability, scope } = setup({ projectId: 'project-1' });

		await vi.waitFor(() => expect(availability.isLoading.value).toBe(false));
		expect(availability.isAvailable.value).toBe(false);
		expect(listAgentsPage).not.toHaveBeenCalled();
		scope.stop();
	});

	it('is available for a project that has an agent but no workflows', async () => {
		enableAgents(1);
		const store = useWorkflowsListStore();
		vi.mocked(store.searchWorkflows).mockResolvedValue([] as never);
		const { availability, scope } = setup({ projectId: 'project-1' });

		await vi.waitFor(() => expect(availability.isAvailable.value).toBe(true));
		expect(listAgentsPage).toHaveBeenCalledWith(expect.anything(), 'project-1', { limit: 1 });
		scope.stop();
	});

	it('finds an agent when the workflow request fails', async () => {
		enableAgents(1);
		const store = useWorkflowsListStore();
		vi.mocked(store.searchWorkflows).mockRejectedValue(new Error('Request failed'));
		const { availability, scope } = setup({ projectId: 'project-1' });

		await vi.waitFor(() => expect(availability.isAvailable.value).toBe(true));
		scope.stop();
	});

	it('keeps the last result when a check fails and the other finds nothing', async () => {
		enableAgents(1);
		const store = useWorkflowsListStore();
		vi.mocked(store.searchWorkflows).mockResolvedValue([] as never);
		const { availability, scope } = setup({ projectId: 'project-1' });
		await vi.waitFor(() => expect(availability.isAvailable.value).toBe(true));

		vi.mocked(listAgentsPage).mockRejectedValue(new Error('Request failed'));
		await availability.refresh();

		expect(availability.isAvailable.value).toBe(true);
		scope.stop();
	});
});
