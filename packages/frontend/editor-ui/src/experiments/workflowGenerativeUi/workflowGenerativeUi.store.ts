import { defineStore } from 'pinia';
import type { Spec } from '@json-render/core';
import { useStorage } from '@n8n/composables/useStorage';
import { computed, ref, shallowReactive, shallowRef } from 'vue';
import { generateSpec, GenerateSpecError, validateGeneratedSpec } from './generate';
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
	id: string;
	name: string;
	nodes: Array<Record<string, unknown>>;
	connections: unknown;
};

function fallbackArchetype(payload: WorkflowUiPayload): 'AdaptiveStoryboard' | 'GuidedTimeline' {
	const outgoing = new Map<string, number>();
	let branches = false;
	for (const connection of payload.connections) {
		if (connection.type !== 'main') continue;
		if (connection.outputIndex > 0) branches = true;
		const count = (outgoing.get(connection.sourceNodeId) ?? 0) + 1;
		outgoing.set(connection.sourceNodeId, count);
		if (count > 1) branches = true;
	}
	return branches ? 'AdaptiveStoryboard' : 'GuidedTimeline';
}

export function buildFallbackSpec(payload: WorkflowUiPayload): Spec {
	const summary = `A plain list of every step in ${payload.name}.`;
	const nodeCount = payload.nodes.length;
	const sectionCount = 3;
	const perSection = Math.ceil(nodeCount / sectionCount);

	const sections: Record<string, Spec['elements'][string]> = {};
	const sectionKeys: string[] = [];

	for (let section = 0; section < sectionCount; section++) {
		const sectionNodes = payload.nodes.slice(section * perSection, (section + 1) * perSection);
		const sectionKey = `section-${section}`;
		sectionKeys.push(sectionKey);
		const stepKeys: string[] = [];

		sectionNodes.forEach((node, offset) => {
			const stepKey = `step-${section * perSection + offset}`;
			stepKeys.push(stepKey);
			sections[stepKey] = {
				type: 'Step',
				props: {
					title: node.name,
					summary: node.action ?? node.operation ?? node.subtitle ?? node.type,
					nodeId: node.id,
				},
				on: { press: { action: 'openNode', params: { nodeId: node.id } } },
				children: [],
			};
		});

		sections[sectionKey] = {
			type: 'Group',
			props: { title: `Stage ${section + 1}` },
			children: stepKeys,
		};
	}

	const spec = {
		root: 'screen',
		elements: {
			screen: {
				type: 'Screen',
				props: { title: payload.name, summary },
				children: ['archetype'],
			},
			archetype: {
				type: fallbackArchetype(payload),
				props: {},
				children: sectionKeys,
			},
			...sections,
		},
	};
	try {
		return validateGeneratedSpec(spec, payload);
	} catch {
		return spec;
	}
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

export const useWorkflowGenerativeUiStore = defineStore('workflowGenerativeUi', () => {
	const view = ref<WorkflowGenerativeUiView>('canvas');
	const lookOnly = ref(false);
	const apiKey = useStorage('n8n.workflowGenerativeUi.apiKey');
	const isGenerating = ref(false);
	const error = ref<WorkflowGenerativeUiError | null>(null);
	const errorDetail = ref<string | null>(null);
	const histories = shallowReactive(new Map<string, SpecHistory>());
	// The workflow content each view was generated from, so drift can be reported
	// without regenerating behind the reader's back.
	const generatedHashes = shallowReactive(new Map<string, string>());
	const activeHistoryKey = ref<string | null>(null);
	const activeSpec = shallowRef<unknown>();
	const canUndo = computed(() => {
		if (activeHistoryKey.value === null) return false;
		return (histories.get(activeHistoryKey.value)?.length ?? 0) >= 2;
	});
	const isStale = computed(() => {
		const key = activeHistoryKey.value;
		if (key === null || activeSpec.value === undefined || view.value === 'canvas') return false;
		const generatedHash = generatedHashes.get(key);
		if (generatedHash === undefined || !getWorkflow) return false;
		return generatedHash !== hashWorkflowUiPayload(buildWorkflowUiPayload(getWorkflow()));
	});
	let getWorkflow: WorkflowGetter | undefined;
	let activeRequest: AbortController | undefined;

	function setWorkflowGetter(getter: WorkflowGetter) {
		getWorkflow = getter;
	}

	function setError(next: WorkflowGenerativeUiError | null) {
		error.value = next;
		errorDetail.value = null;
	}

	function abortActiveRequest() {
		activeRequest?.abort();
		activeRequest = undefined;
		isGenerating.value = false;
	}

	function currentContext() {
		if (view.value === 'canvas') return undefined;
		if (!getWorkflow) {
			setError('missing-workflow');
			return undefined;
		}

		const workflow = getWorkflow();
		const payload = buildWorkflowUiPayload(workflow);
		const key = historyKey(workflow.id, view.value);
		activeHistoryKey.value = key;
		return { payload, key, view: view.value };
	}

	function setGenerationError(generationError: unknown) {
		const isSpecError = generationError instanceof GenerateSpecError;
		error.value =
			isSpecError && generationError.code === 'unauthorized' ? 'unauthorized' : 'generate-failed';
		if (isSpecError) {
			errorDetail.value = generationError.detail ?? generationError.message;
			return;
		}
		errorDetail.value = generationError instanceof Error ? generationError.message : null;
	}

	async function generateCurrent(): Promise<void> {
		abortActiveRequest();
		const context = currentContext();
		if (!context) return;
		const key = apiKey.value;
		if (!key) {
			setError('missing-key');
			return;
		}

		const request = new AbortController();
		activeRequest = request;
		isGenerating.value = true;
		setError(null);
		const history = histories.get(context.key) ?? new SpecHistory();
		histories.set(context.key, history);
		const previousSpec = history.current();

		try {
			const spec = validateGeneratedSpec(
				await generateSpec({
					apiKey: key,
					view: context.view,
					payload: context.payload,
					signal: request.signal,
				}),
				context.payload,
			);
			if (activeRequest !== request) return;
			history.reset(spec);
			activeSpec.value = spec;
			generatedHashes.set(context.key, hashWorkflowUiPayload(context.payload));
		} catch (generationError) {
			if (activeRequest !== request || isAbortError(generationError)) return;
			setGenerationError(generationError);
			if (previousSpec === undefined) {
				const spec = buildFallbackSpec(context.payload);
				history.reset(spec);
				activeSpec.value = spec;
				generatedHashes.set(context.key, hashWorkflowUiPayload(context.payload));
			} else {
				activeSpec.value = previousSpec;
			}
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
		setError(null);

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
		await generateCurrent();
	}

	async function followUp(instruction: string): Promise<void> {
		const context = currentContext();
		if (!context) return;
		const history = histories.get(context.key) ?? new SpecHistory();
		const currentSpec = history.current();
		const key = apiKey.value;
		if (!key) {
			setError('missing-key');
			return;
		}

		histories.set(context.key, history);
		abortActiveRequest();
		const request = new AbortController();
		activeRequest = request;
		isGenerating.value = true;
		setError(null);

		try {
			const spec = validateGeneratedSpec(
				await generateSpec({
					apiKey: key,
					view: context.view,
					payload: context.payload,
					currentSpec,
					instruction,
					signal: request.signal,
				}),
				context.payload,
			);
			if (activeRequest !== request) return;
			if (currentSpec === undefined) history.reset(spec);
			else history.push(spec);
			activeSpec.value = spec;
			generatedHashes.set(context.key, hashWorkflowUiPayload(context.payload));
		} catch (generationError) {
			if (activeRequest !== request || isAbortError(generationError)) return;
			setGenerationError(generationError);
			if (currentSpec === undefined) {
				const spec = buildFallbackSpec(context.payload);
				history.reset(spec);
				activeSpec.value = spec;
				generatedHashes.set(context.key, hashWorkflowUiPayload(context.payload));
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
		generatedHashes.clear();
		activeHistoryKey.value = null;
		activeSpec.value = undefined;
		setError(null);
	}

	return {
		view,
		lookOnly,
		apiKey,
		isGenerating,
		error,
		errorDetail,
		histories,
		activeHistoryKey,
		activeSpec,
		canUndo,
		isStale,
		setWorkflowGetter,
		setView,
		regenerate,
		followUp,
		undo,
		invalidateHistories,
	};
});
