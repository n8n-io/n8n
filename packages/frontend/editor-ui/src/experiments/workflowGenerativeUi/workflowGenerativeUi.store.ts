import { defineStore } from 'pinia';
import type { Spec } from '@json-render/core';
import { computed, ref, shallowReactive, shallowRef } from 'vue';
import { useStorage } from '@/app/composables/useStorage';
import { generateSpec, GenerateSpecError } from './generate';
import { SpecHistory, historyKey } from './history';
import {
	buildWorkflowUiPayload,
	hashWorkflowUiPayload,
	type WorkflowUiPayload,
} from './workflowPayload';

export type WorkflowGenerativeUiView = 'canvas' | 'story' | 'play';
export type WorkflowGenerativeUiError =
	| 'missing-key'
	| 'missing-workflow'
	| 'unauthorized'
	| 'generate-failed';

type WorkflowGetter = () => {
	name: string;
	nodes: Array<Record<string, unknown>>;
	connections: unknown;
};

export function buildFallbackSpec(payload: WorkflowUiPayload): Spec {
	const childKeys = payload.nodes.map((_, index) => `step-${index}`);
	const elements: Spec['elements'] = {
		screen: {
			type: 'Screen',
			props: { title: payload.name },
			children: childKeys,
		},
	};

	payload.nodes.forEach((node, index) => {
		const key = `step-${index}`;
		elements[key] = {
			type: 'Step',
			props: {
				title: node.name,
				summary: node.action ?? node.operation ?? node.subtitle ?? node.type,
				nodeId: node.id,
			},
			on: {
				press: {
					action: 'openNode',
					params: { nodeId: node.id },
				},
			},
			children: [],
		};
	});

	return { root: 'screen', elements };
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

export const useWorkflowGenerativeUiStore = defineStore('workflowGenerativeUi', () => {
	const view = ref<WorkflowGenerativeUiView>('canvas');
	const lookOnly = ref(false);
	const apiKey = useStorage('n8n.workflowGenerativeUi.apiKey', '');
	const isGenerating = ref(false);
	const error = ref<WorkflowGenerativeUiError | null>(null);
	const histories = shallowReactive(new Map<string, SpecHistory>());
	const activeHistoryKey = ref<string | null>(null);
	const activeSpec = shallowRef<unknown>();
	const canUndo = computed(() => {
		if (activeHistoryKey.value === null) return false;
		return (histories.get(activeHistoryKey.value)?.length ?? 0) >= 2;
	});
	let getWorkflow: WorkflowGetter | undefined;
	let activeRequest: AbortController | undefined;

	function setWorkflowGetter(getter: WorkflowGetter) {
		getWorkflow = getter;
	}

	function abortActiveRequest() {
		activeRequest?.abort();
		activeRequest = undefined;
		isGenerating.value = false;
	}

	function currentContext() {
		if (view.value === 'canvas') return undefined;
		if (!getWorkflow) {
			error.value = 'missing-workflow';
			return undefined;
		}

		const payload = buildWorkflowUiPayload(getWorkflow());
		const key = historyKey(hashWorkflowUiPayload(payload), view.value);
		activeHistoryKey.value = key;
		return { payload, key, view: view.value };
	}

	function setGenerationError(generationError: unknown) {
		error.value =
			generationError instanceof GenerateSpecError && generationError.code === 'unauthorized'
				? 'unauthorized'
				: 'generate-failed';
	}

	async function generateCurrent(): Promise<void> {
		abortActiveRequest();
		const context = currentContext();
		if (!context) return;
		if (!apiKey.value) {
			error.value = 'missing-key';
			return;
		}

		const request = new AbortController();
		activeRequest = request;
		isGenerating.value = true;
		error.value = null;
		const history = histories.get(context.key) ?? new SpecHistory();
		histories.set(context.key, history);

		try {
			const spec = await generateSpec({
				apiKey: apiKey.value,
				view: context.view,
				payload: context.payload,
				signal: request.signal,
			});
			if (activeRequest !== request) return;
			history.reset(spec);
			activeSpec.value = spec;
		} catch (generationError) {
			if (activeRequest !== request || isAbortError(generationError)) return;
			setGenerationError(generationError);
			const spec = buildFallbackSpec(context.payload);
			history.reset(spec);
			activeSpec.value = spec;
		} finally {
			if (activeRequest === request) {
				activeRequest = undefined;
				isGenerating.value = false;
			}
		}
	}

	async function setView(nextView: WorkflowGenerativeUiView): Promise<void> {
		abortActiveRequest();
		view.value = nextView;
		error.value = null;

		if (nextView === 'canvas') {
			activeHistoryKey.value = null;
			activeSpec.value = undefined;
			return;
		}

		const context = currentContext();
		if (!context) {
			activeSpec.value = undefined;
			return;
		}
		const existingSpec = histories.get(context.key)?.current();
		if (existingSpec !== undefined) {
			activeSpec.value = existingSpec;
			return;
		}

		activeSpec.value = undefined;
		await generateCurrent();
	}

	async function regenerate(): Promise<void> {
		const context = currentContext();
		if (!context) return;
		histories.delete(context.key);
		await generateCurrent();
	}

	async function followUp(instruction: string): Promise<void> {
		const context = currentContext();
		if (!context) return;
		const history = histories.get(context.key) ?? new SpecHistory();
		const currentSpec = history.current();
		if (!apiKey.value) {
			error.value = 'missing-key';
			return;
		}

		histories.set(context.key, history);
		abortActiveRequest();
		const request = new AbortController();
		activeRequest = request;
		isGenerating.value = true;
		error.value = null;

		try {
			const spec = await generateSpec({
				apiKey: apiKey.value,
				view: context.view,
				payload: context.payload,
				currentSpec,
				instruction,
				signal: request.signal,
			});
			if (activeRequest !== request) return;
			if (currentSpec === undefined) history.reset(spec);
			else history.push(spec);
			activeSpec.value = spec;
		} catch (generationError) {
			if (activeRequest !== request || isAbortError(generationError)) return;
			setGenerationError(generationError);
			if (currentSpec === undefined) {
				const spec = buildFallbackSpec(context.payload);
				history.reset(spec);
				activeSpec.value = spec;
			}
		} finally {
			if (activeRequest === request) {
				activeRequest = undefined;
				isGenerating.value = false;
			}
		}
	}

	function undo(): void {
		if (activeHistoryKey.value === null) return;
		const spec = histories.get(activeHistoryKey.value)?.undo();
		if (spec !== undefined) activeSpec.value = spec;
	}

	function invalidateHistories(): void {
		abortActiveRequest();
		histories.clear();
		activeHistoryKey.value = null;
		activeSpec.value = undefined;
		error.value = null;
	}

	return {
		view,
		lookOnly,
		apiKey,
		isGenerating,
		error,
		histories,
		activeSpec,
		canUndo,
		setWorkflowGetter,
		setView,
		regenerate,
		followUp,
		undo,
		invalidateHistories,
	};
});
