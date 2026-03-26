import { createPinia, setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useWorkflowHistoryStore } from './workflowHistory.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as whApi from '@n8n/rest-api-client/api/workflowHistory';

vi.mock('@n8n/rest-api-client/api/workflowHistory');

describe('Workflow history store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	test.each([
		[true, 1, 1],
		[true, 2, 2],
		[false, 1, 2],
		[false, 2, 1],
		[false, -1, 2],
		[false, 2, -1],
		[false, -1, -1],
	])(
		'should set `shouldUpgrade` to %s when evaluatedPruneTime is %s and licensePruneTime is %s',
		(shouldUpgrade, evaluatedPruneTime, licensePruneTime) => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const settingsStore = useSettingsStore();

			settingsStore.settings = {
				workflowHistory: {
					pruneTime: evaluatedPruneTime,
					licensePruneTime,
				},
			} as FrontendSettings;

			expect(workflowHistoryStore.shouldUpgrade).toBe(shouldUpgrade);
		},
	);

	describe('updateWorkflowHistoryVersion', () => {
		it('should call API with correct parameters', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const versionId = 'version-456';
			const updateData = { name: 'Updated Version', description: 'Updated description' };

			vi.mocked(whApi.updateWorkflowHistoryVersion).mockResolvedValue(undefined);

			await workflowHistoryStore.updateWorkflowHistoryVersion(workflowId, versionId, updateData);

			expect(whApi.updateWorkflowHistoryVersion).toHaveBeenCalledWith(
				rootStore.restApiContext,
				workflowId,
				versionId,
				updateData,
			);
			expect(rootStore).toBeDefined();
		});

		it('should handle updating only name', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const versionId = 'version-456';
			const updateData = { name: 'Updated Version' };

			vi.mocked(whApi.updateWorkflowHistoryVersion).mockResolvedValue(undefined);

			await workflowHistoryStore.updateWorkflowHistoryVersion(workflowId, versionId, updateData);

			expect(whApi.updateWorkflowHistoryVersion).toHaveBeenCalledWith(
				rootStore.restApiContext,
				workflowId,
				versionId,
				updateData,
			);
		});

		it('should handle updating only description', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const versionId = 'version-456';
			const updateData = { description: 'Updated description' };

			vi.mocked(whApi.updateWorkflowHistoryVersion).mockResolvedValue(undefined);

			await workflowHistoryStore.updateWorkflowHistoryVersion(workflowId, versionId, updateData);

			expect(whApi.updateWorkflowHistoryVersion).toHaveBeenCalledWith(
				rootStore.restApiContext,
				workflowId,
				versionId,
				updateData,
			);
		});

		it('should handle setting description to null', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const versionId = 'version-456';
			const updateData = { description: null };

			vi.mocked(whApi.updateWorkflowHistoryVersion).mockResolvedValue(undefined);

			await workflowHistoryStore.updateWorkflowHistoryVersion(workflowId, versionId, updateData);

			expect(whApi.updateWorkflowHistoryVersion).toHaveBeenCalledWith(
				rootStore.restApiContext,
				workflowId,
				versionId,
				updateData,
			);
		});

		it('should propagate API errors', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowId = 'workflow-123';
			const versionId = 'version-456';
			const updateData = { name: 'Updated Version' };
			const error = new Error('API Error');

			vi.mocked(whApi.updateWorkflowHistoryVersion).mockRejectedValue(error);

			await expect(
				workflowHistoryStore.updateWorkflowHistoryVersion(workflowId, versionId, updateData),
			).rejects.toThrow('API Error');
		});
	});
});
