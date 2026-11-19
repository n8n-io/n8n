import { createPinia, setActivePinia } from 'pinia';
import { saveAs } from 'file-saver';
import type { FrontendSettings } from '@n8n/api-types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { getNewWorkflow } from '@/app/api/workflows';
import { useWorkflowHistoryStore } from './workflowHistory.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as whApi from '@n8n/rest-api-client/api/workflowHistory';
import * as instanceVersionHistoryApi from '@n8n/rest-api-client/api/instance-version-history';

const emptyCanvasGroupsEnabled = vi.hoisted(() => ({ value: false }));

vi.mock('@/features/workflows/canvas/composables/useEmptyCanvasGroupsFlag', () => ({
	useEmptyCanvasGroupsFlag: () => emptyCanvasGroupsEnabled,
}));
vi.mock('@/app/api/workflows', () => ({ getNewWorkflow: vi.fn() }));

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
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
		it('should call the API with the rest context, workflow id and page, and return its result', async () => {
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
					settings: null,
				},
			];

			vi.mocked(whApi.getPublishTimeline).mockResolvedValue(events);

			const result = await workflowHistoryStore.getPublishTimeline(workflowId, {
				take: 100,
				skip: 0,
			});

			expect(whApi.getPublishTimeline).toHaveBeenCalledWith(rootStore.restApiContext, workflowId, {
				take: 100,
				skip: 0,
			});
			expect(result).toBe(events);
		});

		it('should propagate API errors', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			vi.mocked(whApi.getPublishTimeline).mockRejectedValue(new Error('API Error'));

			await expect(
				workflowHistoryStore.getPublishTimeline('workflow-123', { take: 100, skip: 0 }),
			).rejects.toThrow('API Error');
		});
	});

	describe('restoreWorkflow', () => {
		it('sends the version it restores, so the server can keep its nodes', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowsStore = useWorkflowsStore();
			const nodes = [{ id: 'node-1', name: 'Call' }];
			vi.mocked(whApi.getWorkflowVersion).mockResolvedValue({
				nodes,
				connections: {},
				nodeGroups: [],
			} as unknown as Awaited<ReturnType<typeof whApi.getWorkflowVersion>>);
			const updateWorkflow = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({} as Awaited<ReturnType<typeof workflowsStore.updateWorkflow>>);

			await workflowHistoryStore.restoreWorkflow('workflow-123', 'version-456');

			expect(updateWorkflow).toHaveBeenCalledWith(
				'workflow-123',
				expect.objectContaining({ nodes, restoredFromVersionId: 'version-456' }),
				true,
			);
		});
	});

	describe('downloadVersion', () => {
		const readDownloadedFile = async (): Promise<Record<string, unknown>> => {
			const [blob] = vi.mocked(saveAs).mock.calls[0];
			// jsdom Blob has no `text()`
			const text = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = () => reject(new Error('Could not read the downloaded file'));
				reader.readAsText(blob as Blob);
			});
			return JSON.parse(text);
		};

		it('downloads the engine and the version ID of the selected version', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowsListStore = useWorkflowsListStore();

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
				name: 'Original workflow',
				versionId: 'draft-version',
				settings: { engineType: 'v1', timezone: 'Europe/Kyiv' },
			} as never);
			vi.mocked(whApi.getWorkflowVersion).mockResolvedValue({
				versionId: 'version-456',
				nodes: [],
				connections: {},
				nodeGroups: [],
				settings: { engineType: 'v2' },
			} as never);

			await workflowHistoryStore.downloadVersion('workflow-123', 'version-456', {
				formattedCreatedAt: '2026-09-24',
			});

			const file = await readDownloadedFile();
			expect(file.settings).toEqual({ engineType: 'v2', timezone: 'Europe/Kyiv' });
			expect(file.versionId).toBe('version-456');
		});

		it('downloads only the fields of Export JSON', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowsListStore = useWorkflowsListStore();
			useRootStore().setInstanceId('instance-123');

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
				id: 'workflow-123',
				name: 'Original workflow',
				active: false,
				versionId: 'draft-version',
				settings: {},
				tags: [],
				pinData: {},
				meta: { templateId: '42' },
				activeVersion: { versionId: 'active-version' },
				homeProject: { id: 'project-1', name: 'Jane Doe <jane@example.com>' },
				sharedWithProjects: [],
				scopes: ['workflow:read'],
				checksum: 'abc',
			} as never);
			vi.mocked(whApi.getWorkflowVersion).mockResolvedValue({
				versionId: 'version-456',
				nodes: [],
				connections: {},
				nodeGroups: [],
				settings: {},
			} as never);

			await workflowHistoryStore.downloadVersion('workflow-123', 'version-456', {
				formattedCreatedAt: '2026-09-24',
			});

			const file = await readDownloadedFile();
			expect(Object.keys(file).sort()).toEqual([
				'active',
				'connections',
				'id',
				'meta',
				'name',
				'nodeGroups',
				'nodes',
				'pinData',
				'settings',
				'tags',
				'versionId',
			]);
			expect(file.meta).toEqual({ templateId: '42', instanceId: 'instance-123' });
		});
	});

	describe('cloneIntoNewWorkflow', () => {
		it('clones the workflow on the engine of the selected version', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowsListStore = useWorkflowsListStore();
			const workflowsStore = useWorkflowsStore();

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
				name: 'Original workflow',
			} as never);
			vi.mocked(whApi.getWorkflowVersion).mockResolvedValue({
				nodes: [],
				connections: {},
				nodeGroups: [],
				settings: { engineType: 'v2' },
			} as never);
			vi.mocked(getNewWorkflow).mockResolvedValue({ name: 'Cloned workflow' } as never);
			vi.spyOn(workflowsStore, 'createNewWorkflow').mockResolvedValue({} as never);

			await workflowHistoryStore.cloneIntoNewWorkflow('workflow-123', 'version-456', {
				formattedCreatedAt: '2026-09-24',
			});

			expect(workflowsStore.createNewWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ settings: { engineType: 'v2' } }),
			);
		});

		it('removes empty groups before cloning when the feature is disabled', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowsListStore = useWorkflowsListStore();
			const workflowsStore = useWorkflowsStore();
			const anchor = {
				id: 'anchor',
				name: 'Empty group anchor',
				type: 'n8n-nodes-base.noOp',
				parameters: { emptyGroupAnchor: true },
			};
			const group = { id: 'group', name: 'Empty group', nodeIds: ['anchor'] };

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
				name: 'Original workflow',
			} as never);
			vi.mocked(whApi.getWorkflowVersion).mockResolvedValue({
				nodes: [anchor],
				connections: {},
				nodeGroups: [group],
			} as never);
			vi.mocked(getNewWorkflow).mockResolvedValue({ name: 'Cloned workflow' } as never);
			vi.spyOn(workflowsStore, 'createNewWorkflow').mockResolvedValue({} as never);

			await workflowHistoryStore.cloneIntoNewWorkflow('workflow-123', 'version-456', {
				formattedCreatedAt: '2026-09-24',
			});

			expect(workflowsStore.createNewWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ nodes: [], connections: {}, nodeGroups: undefined }),
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
