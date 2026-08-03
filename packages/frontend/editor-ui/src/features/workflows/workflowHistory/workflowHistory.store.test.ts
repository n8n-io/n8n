import { createPinia, setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useWorkflowHistoryStore } from './workflowHistory.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as whApi from '@n8n/rest-api-client/api/workflowHistory';
import * as instanceVersionHistoryApi from '@n8n/rest-api-client/api/instance-version-history';

vi.mock('@n8n/rest-api-client/api/workflowHistory');
vi.mock('@n8n/rest-api-client/api/instance-version-history');

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

	describe('getPublishTimeline', () => {
		it('should call the API with the rest context and workflow id and return its result', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const events = [
				{
					id: 1,
					workflowId,
					versionId: 'v1',
					event: 'activated' as const,
					createdAt: '2026-01-01T00:00:00Z',
					userId: null,
					user: null,
					versionName: 'Release 1',
				},
			];

			vi.mocked(whApi.getPublishTimeline).mockResolvedValue(events);

			const result = await workflowHistoryStore.getPublishTimeline(workflowId);

			expect(whApi.getPublishTimeline).toHaveBeenCalledWith(rootStore.restApiContext, workflowId);
			expect(result).toBe(events);
		});

		it('should propagate API errors', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			vi.mocked(whApi.getPublishTimeline).mockRejectedValue(new Error('API Error'));

			await expect(workflowHistoryStore.getPublishTimeline('workflow-123')).rejects.toThrow(
				'API Error',
			);
		});
	});

	describe('getVersionFirstAdoptionDate', () => {
		it('should forward the rest context and version and return the date', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const version = { major: 2, minor: 17, patch: 0 };

			vi.mocked(instanceVersionHistoryApi.getFirstAdoptionDate).mockResolvedValue(
				'2026-01-01T00:00:00Z',
			);

			const result = await workflowHistoryStore.getVersionFirstAdoptionDate(version);

			expect(instanceVersionHistoryApi.getFirstAdoptionDate).toHaveBeenCalledWith(
				rootStore.restApiContext,
				version,
			);
			expect(result).toBe('2026-01-01T00:00:00Z');
		});

		it('should return null when the API responds with null', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			vi.mocked(instanceVersionHistoryApi.getFirstAdoptionDate).mockResolvedValue(null);

			const result = await workflowHistoryStore.getVersionFirstAdoptionDate({
				major: 2,
				minor: 17,
				patch: 0,
			});

			expect(result).toBeNull();
		});
	});
});
