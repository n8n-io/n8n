import { indexedDbCache } from '@/app/plugins/cache';
import { jsonParse } from 'n8n-workflow';
import { ref } from 'vue';

const actionTypes = [
	'evaluations',
	'errorWorkflow',
	'timeSaved',
	'workflow-mcp-access',
	'instance-mcp-access',
] as const;

export type ActionType = (typeof actionTypes)[number];

export interface UserEvaluationPreferences {
	order: string[];
	visibility: Record<string, boolean>;
}
export interface WorkflowSettings {
	firstActivatedAt?: number;
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

	return {
		getWorkflowSettings,
		upsertWorkflowSettings,
		updateFirstActivatedAt,
		getEvaluationPreferences,
		saveEvaluationPreferences,
		isCacheLoading,
	};
}
