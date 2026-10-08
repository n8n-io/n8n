import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { FrontendModuleSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import WorkflowDetails from '@/app/components/MainHeader/WorkflowDetails.vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { INSTANCE_AI_THREAD_VIEW } from '../../constants';
import { clearWorkflowProvenanceCache } from '../useWorkflowProvenance';

// Proves the header mounts the badge. The badge's own cases are in AssistantMadeBadge.test.ts.

const { fetchWorkflowProvenance } = vi.hoisted(() => ({ fetchWorkflowProvenance: vi.fn() }));

vi.mock('../provenance.api', () => ({ fetchWorkflowProvenance }));

vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => true) }));

const flushPromises = async () => await new Promise(setImmediate);

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/', name: 'home', component: { template: '<div />' } },
		{ path: '/workflow/:workflowId', name: 'workflow', component: { template: '<div />' } },
		{
			path: '/assistant/:threadId',
			name: INSTANCE_AI_THREAD_VIEW,
			component: { template: '<div />' },
		},
	],
});

const renderHeader = createComponentRenderer(WorkflowDetails, {
	props: { id: 'wf-1', name: 'Daily report', tags: [], isArchived: false },
	global: {
		plugins: [router],
		provide: { [WorkflowIdKey as symbol]: computed(() => 'wf-1') },
		stubs: {
			RouterLink: false,
			FolderBreadcrumbs: { template: '<div><slot name="append" /></div>' },
			ActionsDropdownMenu: true,
			WorkflowHeaderDraftPublishActions: true,
			ConnectionTracker: true,
		},
	},
});

describe('WorkflowDetails: Assistant badge', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(async () => {
		vi.clearAllMocks();
		clearWorkflowProvenanceCache();
		createTestingPinia();

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive = vi.fn((name: string) => name === 'instance-ai');
		settingsStore.moduleSettings = {
			'instance-ai': { enabled: true, setupCompleted: true } as NonNullable<
				FrontendModuleSettings['instance-ai']
			>,
		};
		workflowsStore = mockedStore(useWorkflowsStore);

		fetchWorkflowProvenance.mockResolvedValue({
			workflowId: 'wf-1',
			threadId: 'thread-1',
			createdAt: '2026-10-01T09:30:00.000Z',
			canOpenThread: true,
		});
		await router.push('/workflow/wf-1');
	});

	it('shows the badge for a saved workflow that the Assistant built', async () => {
		workflowsStore.isWorkflowSaved = { 'wf-1': true };

		renderHeader();
		await flushPromises();

		expect(fetchWorkflowProvenance).toHaveBeenCalledWith(expect.anything(), 'wf-1');
		expect(screen.getByTestId('workflow-assistant-made-link')).toHaveAttribute(
			'href',
			'/assistant/thread-1',
		);
	});

	it('sends no request for a workflow that is not saved yet', async () => {
		workflowsStore.isWorkflowSaved = {};

		renderHeader();
		await flushPromises();

		expect(fetchWorkflowProvenance).not.toHaveBeenCalled();
		expect(screen.queryByText('Made with n8n Assistant')).not.toBeInTheDocument();
	});
});
