import { ref } from 'vue';
import { indexedDbCache } from '@/plugins/cache';
import { jsonParse } from 'n8n-workflow';

export interface WorkflowSettings {
	firstActivatedAt?: number;
	suggestedActions?: {
		evaluations?: { ignored: boolean };
		errorWorkflow?: { ignored: boolean };
		timeSaved?: { ignored: boolean };
	};
}

export interface UserEvaluationPreferences {
	order: string[];
	visibility: Record<string, boolean>;
}

export function useWorkflowsCache() {
	const cacheLoading = ref(false);
	const cacheError = ref<Error | null>(null);

	async function getCache(dbName: string, storeName: string) {
		cacheLoading.value = true;
		cacheError.value = null;

		try {
			const cache = await indexedDbCache(dbName, storeName);
			return cache;
		} catch (error) {
			cacheError.value = error as Error;
			throw error;
		} finally {
			cacheLoading.value = false;
		}
	}

	async function getWorkflowSettings(workflowId: string): Promise<WorkflowSettings | null> {
		try {
			const cache = await getCache('workflows', 'settings');
			const settingsJson = cache.getItem(workflowId);
			if (!settingsJson) {
				return null;
			}
			return JSON.parse(settingsJson);
		} catch (error) {
			console.error('Error getting workflow settings:', error);
			return null;
		}
	}

	async function upsertWorkflowSettings(
		workflowId: string,
		updates: Partial<WorkflowSettings>,
	): Promise<void> {
		try {
			const cache = await getCache('workflows', 'settings');
			const existingSettings = (await getWorkflowSettings(workflowId)) || {};

			const updatedSettings: WorkflowSettings = {
				...existingSettings,
				...updates,
			};

			// Deep merge suggestedActions if provided
			if (updates.suggestedActions) {
				updatedSettings.suggestedActions = {
					...existingSettings.suggestedActions,
					...updates.suggestedActions,
				};
			}

			cache.setItem(workflowId, JSON.stringify(updatedSettings));
		} catch (error) {
			console.error('Error upserting workflow settings:', error);
			throw error;
		}
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

	async function ignoreSuggestedAction(
		workflowId: string,
		action: 'evaluations' | 'errorWorkflow' | 'timeSaved',
	): Promise<void> {
		await upsertWorkflowSettings(workflowId, {
			suggestedActions: {
				[action]: { ignored: true },
			},
		});
	}

	async function getEvaluationPreferences(workflowId: string): Promise<UserEvaluationPreferences> {
		const cache = await getCache('workflows', 'evaluations');
		const preferencesJson = cache.getItem(workflowId);

		return jsonParse(preferencesJson ?? '', {
			fallbackValue: {
				order: [],
				visibility: {},
			},
		});
	}

	async function saveEvaluationPreferences(
		workflowId: string,
		preferences: UserEvaluationPreferences,
	): Promise<void> {
		const cache = await getCache('workflows', 'evaluations');
		cache.setItem(workflowId, JSON.stringify(preferences));
	}

	return {
		cacheLoading,
		cacheError,
		getCache,
		getWorkflowSettings,
		upsertWorkflowSettings,
		updateFirstActivatedAt,
		ignoreSuggestedAction,
		getEvaluationPreferences,
		saveEvaluationPreferences,
	};
}
