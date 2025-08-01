import { vi } from 'vitest';
import {
	useWorkflowSettingsCache,
	type ActionType,
	type WorkflowSettings,
} from './useWorkflowsCache';

// Mock the cache plugin
const mockCache = {
	getItem: vi.fn(),
	setItem: vi.fn(),
};

vi.mock('@/plugins/cache', () => ({
	indexedDbCache: vi.fn(async () => await Promise.resolve(mockCache)),
}));

describe('useWorkflowSettingsCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCache.getItem.mockReturnValue(null);
		mockCache.setItem.mockClear();
	});

	describe('basic functionality', () => {
		it('should initialize with loading state', async () => {
			const { isCacheLoading } = useWorkflowSettingsCache();
			expect(isCacheLoading.value).toBe(true); // Initially loading

			// Wait for cache promise to resolve
			await vi.waitFor(() => {
				expect(isCacheLoading.value).toBe(false);
			});
		});

		it('should get workflow settings from empty cache', async () => {
			const { getWorkflowSettings } = useWorkflowSettingsCache();
			const settings = await getWorkflowSettings('workflow-1');

			expect(mockCache.getItem).toHaveBeenCalledWith('workflow-1');
			expect(settings).toEqual({});
		});

		it('should get existing workflow settings from cache', async () => {
			const existingSettings: WorkflowSettings = {
				firstActivatedAt: 123456789,
				suggestedActions: {
					evaluations: { ignored: true },
				},
			};
			mockCache.getItem.mockReturnValue(JSON.stringify(existingSettings));

			const { getWorkflowSettings } = useWorkflowSettingsCache();
			const settings = await getWorkflowSettings('workflow-1');

			expect(settings).toEqual(existingSettings);
		});

		it('should handle malformed JSON gracefully', async () => {
			mockCache.getItem.mockReturnValue('invalid-json{');

			const { getWorkflowSettings } = useWorkflowSettingsCache();
			const settings = await getWorkflowSettings('workflow-1');

			expect(settings).toEqual({});
		});
	});

	describe('getMergedWorkflowSettings', () => {
		it('should return workflow settings when no global preferences exist', async () => {
			const workflowSettings: WorkflowSettings = {
				suggestedActions: {
					evaluations: { ignored: true },
				},
			};
			mockCache.getItem
				.mockReturnValueOnce(JSON.stringify(workflowSettings)) // workflow settings
				.mockReturnValueOnce(null); // global settings

			const { getMergedWorkflowSettings } = useWorkflowSettingsCache();
			const merged = await getMergedWorkflowSettings('workflow-1');

			expect(merged).toEqual(workflowSettings);
			expect(mockCache.getItem).toHaveBeenCalledWith('workflow-1');
			expect(mockCache.getItem).toHaveBeenCalledWith('*');
		});

		it('should merge workflow and global suggested actions', async () => {
			const workflowSettings: WorkflowSettings = {
				suggestedActions: {
					evaluations: { ignored: true },
				},
			};
			const globalSettings: WorkflowSettings = {
				suggestedActions: {
					errorWorkflow: { ignored: true },
					timeSaved: { ignored: true },
				},
			};
			mockCache.getItem
				.mockReturnValueOnce(JSON.stringify(workflowSettings))
				.mockReturnValueOnce(JSON.stringify(globalSettings));

			const { getMergedWorkflowSettings } = useWorkflowSettingsCache();
			const merged = await getMergedWorkflowSettings('workflow-1');

			expect(merged.suggestedActions).toEqual({
				evaluations: { ignored: true },
				errorWorkflow: { ignored: true },
				timeSaved: { ignored: true },
			});
		});

		it('should prioritize global settings over workflow settings', async () => {
			const workflowSettings: WorkflowSettings = {
				suggestedActions: {
					evaluations: { ignored: false },
				},
			};
			const globalSettings: WorkflowSettings = {
				suggestedActions: {
					evaluations: { ignored: true },
				},
			};
			mockCache.getItem
				.mockReturnValueOnce(JSON.stringify(workflowSettings))
				.mockReturnValueOnce(JSON.stringify(globalSettings));

			const { getMergedWorkflowSettings } = useWorkflowSettingsCache();
			const merged = await getMergedWorkflowSettings('workflow-1');

			expect(merged.suggestedActions?.evaluations?.ignored).toBe(true);
		});
	});

	describe('upsertWorkflowSettings', () => {
		it('should create new workflow settings', async () => {
			const updates: Partial<WorkflowSettings> = {
				firstActivatedAt: 123456789,
			};

			const { upsertWorkflowSettings } = useWorkflowSettingsCache();
			await upsertWorkflowSettings('workflow-1', updates);

			expect(mockCache.setItem).toHaveBeenCalledWith('workflow-1', JSON.stringify(updates));
		});

		it('should update existing workflow settings', async () => {
			const existingSettings: WorkflowSettings = {
				firstActivatedAt: 123456789,
				suggestedActions: {
					evaluations: { ignored: true },
				},
			};
			mockCache.getItem.mockReturnValue(JSON.stringify(existingSettings));

			const updates: Partial<WorkflowSettings> = {
				evaluationRuns: {
					order: ['run1', 'run2'],
					visibility: { run1: true, run2: false },
				},
			};

			const { upsertWorkflowSettings } = useWorkflowSettingsCache();
			await upsertWorkflowSettings('workflow-1', updates);

			const expectedSettings = {
				...existingSettings,
				...updates,
			};
			expect(mockCache.setItem).toHaveBeenCalledWith(
				'workflow-1',
				JSON.stringify(expectedSettings),
			);
		});

		it('should deep merge suggested actions', async () => {
			const existingSettings: WorkflowSettings = {
				suggestedActions: {
					evaluations: { ignored: true },
					errorWorkflow: { ignored: false },
				},
			};
			mockCache.getItem.mockReturnValue(JSON.stringify(existingSettings));

			const updates: Partial<WorkflowSettings> = {
				suggestedActions: {
					errorWorkflow: { ignored: true },
					timeSaved: { ignored: true },
				},
			};

			const { upsertWorkflowSettings } = useWorkflowSettingsCache();
			await upsertWorkflowSettings('workflow-1', updates);

			const expectedSettings: WorkflowSettings = {
				suggestedActions: {
					evaluations: { ignored: true },
					errorWorkflow: { ignored: true },
					timeSaved: { ignored: true },
				},
			};
			expect(mockCache.setItem).toHaveBeenCalledWith(
				'workflow-1',
				JSON.stringify(expectedSettings),
			);
		});
	});

	describe('updateFirstActivatedAt', () => {
		it('should set firstActivatedAt when not present', async () => {
			const now = Date.now();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			const { updateFirstActivatedAt } = useWorkflowSettingsCache();
			await updateFirstActivatedAt('workflow-1');

			expect(mockCache.setItem).toHaveBeenCalledWith(
				'workflow-1',
				JSON.stringify({ firstActivatedAt: now }),
			);
		});

		it('should not overwrite existing firstActivatedAt', async () => {
			const existingSettings: WorkflowSettings = {
				firstActivatedAt: 123456789,
			};
			mockCache.getItem.mockReturnValue(JSON.stringify(existingSettings));

			const { updateFirstActivatedAt } = useWorkflowSettingsCache();
			await updateFirstActivatedAt('workflow-1');

			expect(mockCache.setItem).not.toHaveBeenCalled();
		});
	});

	describe('suggested actions', () => {
		it('should ignore suggested action for specific workflow', async () => {
			const { ignoreSuggestedAction } = useWorkflowSettingsCache();
			await ignoreSuggestedAction('workflow-1', 'evaluations');

			expect(mockCache.setItem).toHaveBeenCalledWith(
				'workflow-1',
				JSON.stringify({
					suggestedActions: {
						evaluations: { ignored: true },
					},
				}),
			);
		});

		it('should ignore all suggested actions globally', async () => {
			const actionsToIgnore: ActionType[] = ['evaluations', 'errorWorkflow', 'timeSaved'];

			const { ignoreAllSuggestedActionsForAllWorkflows } = useWorkflowSettingsCache();
			await ignoreAllSuggestedActionsForAllWorkflows(actionsToIgnore);

			expect(mockCache.setItem).toHaveBeenCalledWith(
				'*',
				JSON.stringify({
					suggestedActions: {
						evaluations: { ignored: true },
						errorWorkflow: { ignored: true },
						timeSaved: { ignored: true },
					},
				}),
			);
		});
	});

	describe('evaluation preferences', () => {
		it('should get default evaluation preferences when none exist', async () => {
			const { getEvaluationPreferences } = useWorkflowSettingsCache();
			const prefs = await getEvaluationPreferences('workflow-1');

			expect(prefs).toEqual({
				order: [],
				visibility: {},
			});
		});

		it('should get existing evaluation preferences', async () => {
			const existingSettings: WorkflowSettings = {
				evaluationRuns: {
					order: ['run1', 'run2'],
					visibility: { run1: true, run2: false },
				},
			};
			mockCache.getItem.mockReturnValue(JSON.stringify(existingSettings));

			const { getEvaluationPreferences } = useWorkflowSettingsCache();
			const prefs = await getEvaluationPreferences('workflow-1');

			expect(prefs).toEqual(existingSettings.evaluationRuns);
		});

		it('should save evaluation preferences', async () => {
			const evaluationRuns = {
				order: ['run1', 'run2', 'run3'],
				visibility: { run1: true, run2: true, run3: false },
			};

			const { saveEvaluationPreferences } = useWorkflowSettingsCache();
			await saveEvaluationPreferences('workflow-1', evaluationRuns);

			expect(mockCache.setItem).toHaveBeenCalledWith(
				'workflow-1',
				JSON.stringify({ evaluationRuns }),
			);
		});
	});

	describe('edge cases', () => {
		it('should handle concurrent operations correctly', async () => {
			const { getWorkflowSettings, upsertWorkflowSettings } = useWorkflowSettingsCache();

			// Simulate concurrent operations
			const promises = [
				getWorkflowSettings('workflow-1'),
				upsertWorkflowSettings('workflow-1', { firstActivatedAt: 123 }),
				getWorkflowSettings('workflow-1'),
			];

			await Promise.all(promises);

			expect(mockCache.getItem).toHaveBeenCalledTimes(3); // 2 direct gets + 1 from upsert
			expect(mockCache.setItem).toHaveBeenCalledTimes(1);
		});

		it('should handle empty string from cache', async () => {
			mockCache.getItem.mockReturnValue('');

			const { getWorkflowSettings } = useWorkflowSettingsCache();
			const settings = await getWorkflowSettings('workflow-1');

			expect(settings).toEqual({});
		});

		it('should handle undefined suggestedActions in updates', async () => {
			const existingSettings: WorkflowSettings = {
				firstActivatedAt: 123456789,
				suggestedActions: {
					evaluations: { ignored: true },
				},
			};
			mockCache.getItem.mockReturnValue(JSON.stringify(existingSettings));

			const updates: Partial<WorkflowSettings> = {
				suggestedActions: undefined,
			};

			const { upsertWorkflowSettings } = useWorkflowSettingsCache();
			await upsertWorkflowSettings('workflow-1', updates);

			// suggestedActions will be overwritten with undefined due to spread operator
			expect(mockCache.setItem).toHaveBeenCalledWith(
				'workflow-1',
				JSON.stringify({
					firstActivatedAt: 123456789,
					suggestedActions: undefined,
				}),
			);
		});
	});
});
