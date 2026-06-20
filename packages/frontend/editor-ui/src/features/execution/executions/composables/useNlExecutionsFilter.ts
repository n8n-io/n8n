import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useExecutionsStore } from '../executions.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { generateCodeForPrompt } from '@/features/ai/assistant/assistant.api';
import {
	NlExecutionFilterAiResponseSchema,
	type NlExecutionFilterAiResponse,
} from '../nlFilter/nlFilter.types';
import { buildNlFilterPrompt } from '../nlFilter/nlFilter.prompt';
import { aiResponseToExecutionFilter } from '../nlFilter/nlFilter.mapper';

type TranslateOk = { ok: true; appliedFromText: string };
type TranslateErr = { ok: false; reason: 'parse' | 'schema' | 'network' };
export type TranslateResult = TranslateOk | TranslateErr;

/**
 * Pipeline: user text → prompt → /ai/ask-ai → JSON.parse → zod →
 * ExecutionFilterType → store.setFilters().
 *
 * On any error along the path the store is NOT mutated; the caller
 * decides how to surface the failure (toast).
 */
export function useNlExecutionsFilter() {
	const rootStore = useRootStore();
	const executionsStore = useExecutionsStore();
	const workflowsListStore = useWorkflowsListStore();

	const isTranslating = ref(false);

	async function translate(userText: string): Promise<TranslateResult> {
		const trimmed = userText.trim();
		if (trimmed.length === 0) return { ok: false, reason: 'parse' };

		isTranslating.value = true;
		try {
			const workflows = workflowsListStore.allWorkflows.map((wf) => ({
				id: wf.id,
				name: wf.name,
			}));

			const prompt = buildNlFilterPrompt({
				now: new Date(),
				userText: trimmed,
				workflows,
			});

			// Minimal valid AiAskRequestDto context. The /ai/ask-ai endpoint
			// is repurposed here as a generic prompt channel; the AI is
			// instructed inside `question` to emit a JSON object as the
			// `code` string.
			const { code } = await generateCodeForPrompt(rootStore.restApiContext, {
				question: prompt,
				context: {
					schema: [],
					inputSchema: {
						nodeName: 'executions',
						schema: { type: 'object', value: [], path: '' },
					},
					pushRef: rootStore.pushRef,
					ndvPushRef: '',
				},
				forNode: 'executions-nl-filter',
			});

			let parsed: unknown;
			try {
				parsed = JSON.parse(code);
			} catch {
				return { ok: false, reason: 'parse' };
			}

			const validation = NlExecutionFilterAiResponseSchema.safeParse(parsed);
			if (!validation.success) {
				return { ok: false, reason: 'schema' };
			}

			const aiResponse: NlExecutionFilterAiResponse = validation.data;
			const filter = aiResponseToExecutionFilter(aiResponse, workflows);
			executionsStore.setFilters(filter);
			executionsStore.resetData();
			await executionsStore.fetchExecutions();

			return { ok: true, appliedFromText: trimmed };
		} catch {
			return { ok: false, reason: 'network' };
		} finally {
			isTranslating.value = false;
		}
	}

	return { translate, isTranslating };
}
