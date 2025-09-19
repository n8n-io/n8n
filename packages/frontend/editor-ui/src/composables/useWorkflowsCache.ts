import { indexedDbCache } from '@/plugins/cache';
import { jsonParse } from 'n8n-workflow';
import { ref } from 'vue';

const actionTypes = ['evaluations', 'errorWorkflow', 'timeSaved'] as const;

export type ActionType = (typeof actionTypes)[number];

export interface UserEvaluationPreferences {
	order: string[];
	visibility: Record<string, boolean>;
}
export interface WorkflowSettings {
	firstActivatedAt?: number;
	suggestedActions?: {
		[K in ActionType]?: { ignored: boolean };
	};
	evaluationRuns?: UserEvaluationPreferences;
}

export function useWorkflowSettingsCache() {
	const isCacheLoading = ref<boolean>(true);
	const cachePromise = ref(
		indexedDbCache('n8n-local', 'workflows').finally(() => {
			isCacheLoading.value = false;
		}),
	);

	async function getWorkflowsCache() {
		return await cachePromise.value;
	}

	async function getWorkflowSettings(workflowId: string): Promise<WorkflowSettings> {
		const cache = await getWorkflowsCache();
		return jsonParse<WorkflowSettings>(cache.getItem(workflowId) ?? '', {
			fallbackValue: {},
		});
	}

	async function getMergedWorkflowSettings(workflowId: string): Promise<WorkflowSettings> {
		const workflowSettings = await getWorkflowSettings(workflowId);

		const cache = await getWorkflowsCache();
		const globalPreferences = jsonParse<WorkflowSettings>(cache.getItem('*') ?? '', {
			fallbackValue: {},
		});

		workflowSettings.suggestedActions = {
			...(workflowSettings.suggestedActions ?? {}),
			...(globalPreferences.suggestedActions ?? {}),
		};

		return workflowSettings;
	}

	async function upsertWorkflowSettings(
		workflowId: string,
		updates: Partial<WorkflowSettings>,
	): Promise<void> {
		const cache = await getWorkflowsCache();
		const existingSettings = await getWorkflowSettings(workflowId);

		const updatedSettings: WorkflowSettings = {
			...existingSettings,
			...updates,
		};

		// Deep merge suggestedActions if provided
		if (updates.suggestedActions) {
			updatedSettings.suggestedActions = {
				...(existingSettings.suggestedActions ?? {}),
				...updates.suggestedActions,
			};
		}

		cache.setItem(workflowId, JSON.stringify(updatedSettings));
	}

	async function updateFirstActivatedAt(workflowId: string): Promise<void> {
		const existingSettings = await getWorkflowSettings(workflowId);

		// Only update if not already set
		if (!existingSettings?.firstActivatedAt) {
			await upsertWorkflowSettings(workflowId, {
				firstActivatedAt: Date.now(),
			});
		}
	}

	async function ignoreSuggestedAction(workflowId: string, action: ActionType): Promise<void> {
		await upsertWorkflowSettings(workflowId, {
			suggestedActions: {
				[action]: { ignored: true },
			},
		});
	}

	async function getEvaluationPreferences(workflowId: string): Promise<UserEvaluationPreferences> {
		return (
			(await getWorkflowSettings(workflowId))?.evaluationRuns ?? {
				order: [],
				visibility: {},
			}
		);
	}

	async function saveEvaluationPreferences(
		workflowId: string,
		evaluationRuns: UserEvaluationPreferences,
	): Promise<void> {
		await upsertWorkflowSettings(workflowId, { evaluationRuns });
	}

	async function ignoreAllSuggestedActionsForAllWorkflows(actionsToIgnore: ActionType[]) {
		await upsertWorkflowSettings(
			'*',
			actionsToIgnore.reduce<WorkflowSettings>((accu, key) => {
				accu.suggestedActions = accu.suggestedActions ?? {};
				accu.suggestedActions[key] = {
					ignored: true,
				};

				return accu;
			}, {}),
		);
	}

	return {
		getWorkflowSettings,
		getMergedWorkflowSettings,
		upsertWorkflowSettings,
		updateFirstActivatedAt,
		ignoreSuggestedAction,
		ignoreAllSuggestedActionsForAllWorkflows,
		getEvaluationPreferences,
		saveEvaluationPreferences,
		isCacheLoading,
	};
}
