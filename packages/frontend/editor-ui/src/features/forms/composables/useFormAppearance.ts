import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { NodeHelpers } from 'n8n-workflow';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import type { INodeUi } from '@/Interface';
import { fetchFormPreview } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCssVariables(css: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const match of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
		result[`--${match[1]}`] = match[2].trim();
	}
	return result;
}

function assembleCss(overrides: Record<string, string>): string {
	const entries = Object.entries(overrides);
	if (entries.length === 0) return '';
	const lines = entries.map(([k, v]) => `\t${k}: ${v};`).join('\n');
	return `:root {\n${lines}\n}`;
}

// ---------------------------------------------------------------------------
// Global scope state — shared across all form node modals
// ---------------------------------------------------------------------------

type Scope = 'current' | 'all';
const globalScope = ref<Scope>('current');

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useFormAppearance(nodeId: string) {
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();

	// -------------------------------------------------------------------------
	// Node helpers
	// -------------------------------------------------------------------------

	const node = computed<INodeUi | undefined>(() =>
		workflowsStore.workflow.nodes.find((n) => n.id === nodeId),
	);

	const isTrigger = computed(() => node.value?.type === FORM_TRIGGER_NODE_TYPE);
	const isCompletion = computed(() => node.value?.parameters?.operation === 'completion');

	const resolvedParameters = computed((): INodeParameters => {
		if (!node.value) return {};
		const nodeType = nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
		if (!nodeType) return node.value.parameters;
		return (
			NodeHelpers.getNodeParameters(
				nodeType.properties,
				node.value.parameters,
				true,
				false,
				node.value,
				nodeType,
			) ?? node.value.parameters
		);
	});

	const optionsCollectionDefaults = computed(() => {
		const nodeType = nodeTypesStore.getNodeType(node.value?.type ?? '', node.value?.typeVersion);
		const collection = nodeType?.properties.find(
			(p): p is INodeProperties => p.name === 'options' && p.type === 'collection',
		);
		const items = collection?.options as INodeProperties[] | undefined;
		return Object.fromEntries(items?.map((p) => [p.name, p.default]) ?? []);
	});

	const triggerNode = computed<INodeUi | undefined>(() =>
		workflowsStore.workflow.nodes.find((n) => n.type === FORM_TRIGGER_NODE_TYPE),
	);

	const triggerResolvedParameters = computed((): INodeParameters => {
		if (!triggerNode.value) return {};
		const nodeType = nodeTypesStore.getNodeType(
			triggerNode.value.type,
			triggerNode.value.typeVersion,
		);
		if (!nodeType) return triggerNode.value.parameters;
		return (
			NodeHelpers.getNodeParameters(
				nodeType.properties,
				triggerNode.value.parameters,
				true,
				false,
				triggerNode.value,
				nodeType,
			) ?? triggerNode.value.parameters
		);
	});

	// -------------------------------------------------------------------------
	// Appearance state
	// -------------------------------------------------------------------------

	const localOverrides = ref<Record<string, string>>({});
	const localAppendAttribution = ref(true);

	function triggerAppendAttribution(): boolean {
		const triggerOptions = triggerResolvedParameters.value.options as INodeParameters | undefined;
		return (triggerOptions?.appendAttribution as boolean | undefined) ?? true;
	}

	function initFromNode() {
		const options = node.value?.parameters?.options as INodeParameters | undefined;
		const existingCss = (options?.customCss as string | undefined) ?? '';
		localOverrides.value = existingCss ? parseCssVariables(existingCss) : {};
		localAppendAttribution.value =
			(options?.appendAttribution as boolean | undefined) ?? triggerAppendAttribution();
	}

	initFromNode();

	const assembledCss = computed(() => assembleCss(localOverrides.value));

	const savedCss = computed(() => {
		const options = node.value?.parameters?.options as INodeParameters | undefined;
		return (options?.customCss as string | undefined) ?? '';
	});

	const savedAppendAttribution = computed(() => {
		const options = node.value?.parameters?.options as INodeParameters | undefined;
		return (options?.appendAttribution as boolean | undefined) ?? triggerAppendAttribution();
	});

	const hasUnsavedChanges = computed(
		() =>
			assembledCss.value !== savedCss.value ||
			localAppendAttribution.value !== savedAppendAttribution.value,
	);

	const scope = globalScope;

	function reset() {
		localOverrides.value = {};
		localAppendAttribution.value = true;
	}

	// -------------------------------------------------------------------------
	// Preview
	// -------------------------------------------------------------------------

	const previewHtml = ref('');
	const iframeEl = ref<HTMLIFrameElement | null>(null);

	const previewParams = computed(() => {
		if (!node.value) return null;
		const params = resolvedParameters.value;

		if (isCompletion.value) {
			return {
				formTitle: (params.completionTitle as string) || '',
				formDescription: (params.completionMessage as string) ?? '',
				formFields: [],
				isCompletion: true,
				nodeVersion: node.value.typeVersion,
				customCss: assembledCss.value,
				appendAttribution: localAppendAttribution.value,
			};
		}

		const options = params.options as INodeParameters | undefined;
		const triggerParams = triggerResolvedParameters.value;
		const triggerOptions = triggerParams.options as INodeParameters | undefined;
		const defaults = optionsCollectionDefaults.value;
		return {
			formTitle: isTrigger.value
				? ((params.formTitle as string) ?? '')
				: (options?.formTitle as string) || (triggerParams.formTitle as string) || '',
			formDescription: isTrigger.value
				? ((params.formDescription as string) ?? '')
				: (options?.formDescription as string) || (triggerParams.formDescription as string) || '',
			buttonLabel:
				(options?.buttonLabel as string) ||
				(triggerOptions?.buttonLabel as string) ||
				(defaults.buttonLabel as string) ||
				undefined,
			formFields: (params.formFields as { values?: INodeParameters[] })?.values ?? [],
			nodeVersion: node.value.typeVersion,
			customCss: assembledCss.value,
			appendAttribution: localAppendAttribution.value,
		};
	});

	async function fetchPreview() {
		if (!previewParams.value) return;
		try {
			const html = await fetchFormPreview(rootStore.restUrl, previewParams.value);
			if (html) previewHtml.value = html;
		} catch {
			// preview is best-effort
		}
	}

	function onIframeLoad() {
		const iframe = iframeEl.value;
		if (!iframe?.contentDocument) return;
		const contentH = iframe.contentDocument.documentElement.scrollHeight;
		const paneH = iframe.parentElement?.clientHeight ?? 0;
		iframe.style.height = `${Math.max(contentH, paneH)}px`;
	}

	const debouncedFetchPreview = useDebounceFn(
		fetchPreview,
		getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
	);

	watch(
		previewParams,
		() => {
			void debouncedFetchPreview();
		},
		{ immediate: true, deep: true },
	);

	// -------------------------------------------------------------------------
	// Save
	// -------------------------------------------------------------------------

	const isSaving = ref(false);

	function applyToNode(idx: number) {
		const target = workflowsStore.workflow.nodes[idx];
		const opts = { ...((target.parameters.options as Record<string, unknown>) ?? {}) };

		if (assembledCss.value) {
			opts.customCss = assembledCss.value;
		} else {
			delete opts.customCss;
		}

		if (!localAppendAttribution.value) {
			opts.appendAttribution = false;
		} else {
			delete opts.appendAttribution;
		}

		workflowsStore.workflow.nodes[idx].parameters = {
			...target.parameters,
			options: opts as INodeParameters,
		};
	}

	async function save(scope: 'current' | 'all' = 'current') {
		if (!workflowsStore.workflowId) return;

		const FORM_TYPES = new Set([FORM_TRIGGER_NODE_TYPE, FORM_NODE_TYPE]);
		const targets =
			scope === 'all'
				? workflowsStore.workflow.nodes
						.map((n, i) => (FORM_TYPES.has(n.type) ? i : -1))
						.filter((i) => i !== -1)
				: (() => {
						const i = workflowsStore.workflow.nodes.findIndex((n) => n.id === nodeId);
						return i === -1 ? [] : [i];
					})();

		for (const idx of targets) {
			applyToNode(idx);
		}

		isSaving.value = true;
		try {
			await workflowsStore.updateWorkflow(workflowsStore.workflowId, {
				nodes: workflowsStore.workflow.nodes,
				versionId: workflowsStore.workflow.versionId,
			});
		} finally {
			isSaving.value = false;
		}
	}

	return {
		localOverrides,
		localAppendAttribution,
		scope,
		assembledCss,
		previewHtml,
		iframeEl,
		isSaving,
		hasUnsavedChanges,
		reset,
		save,
		onIframeLoad,
	};
}
