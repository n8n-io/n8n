import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import {
	NodeHelpers,
	parseCssVariables,
	assembleFormCss,
	applyFormThemePreset,
	resolveFormTheme,
} from 'n8n-workflow';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import type { INodeUi } from '@/Interface';
import { fetchFormPreview } from '../api';

// ---------------------------------------------------------------------------
// Global scope state — shared across all form node modals
// ---------------------------------------------------------------------------

type Scope = 'current' | 'all';
const globalScope = ref<Scope>('all');

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useFormAppearance(nodeId: string) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();

	// -------------------------------------------------------------------------
	// Node helpers
	// -------------------------------------------------------------------------

	const node = computed<INodeUi | undefined>(() =>
		workflowDocumentStore.value.allNodes.find((n) => n.id === nodeId),
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
		workflowDocumentStore.value.allNodes.find((n) => n.type === FORM_TRIGGER_NODE_TYPE),
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

	const assembledCss = computed(() => assembleFormCss(localOverrides.value));

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
				respondWith: (params.respondWith as string) || 'text',
				responseText: (params.responseText as string) || '',
				redirectUrl: (params.redirectUrl as string) || '',
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

		// Override any viewport-relative height (e.g. injected `body { height: 100vh }`)
		// so scrollHeight reflects actual content height rather than the collapsed viewport.
		const doc = iframe.contentDocument;
		doc.documentElement.style.height = 'auto';
		if (doc.body) doc.body.style.height = 'auto';

		function updateHeight() {
			if (!iframe?.contentDocument) return;
			const contentH = Math.max(
				iframe.contentDocument.documentElement.scrollHeight,
				iframe.contentDocument.body?.scrollHeight ?? 0,
			);
			const paneH = iframe.parentElement?.clientHeight ?? 0;
			iframe.style.height = `${Math.max(contentH, paneH)}px`;
		}

		updateHeight();

		doc.querySelectorAll('img').forEach((img) => {
			if (!img.complete) {
				img.addEventListener('load', updateHeight, { once: true });
				img.addEventListener('error', updateHeight, { once: true });
			}
		});
	}

	const debouncedFetchPreview = useDebounceFn(
		fetchPreview,
		getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
	);

	// Serialize to avoid re-fetching when the reference changes but content is the same
	// (e.g. after a node issues update that re-assigns the node object in the store).
	const previewParamsKey = computed(() => JSON.stringify(previewParams.value));

	watch(
		previewParamsKey,
		() => {
			void debouncedFetchPreview();
		},
		{ immediate: true },
	);

	// -------------------------------------------------------------------------
	// Save
	// -------------------------------------------------------------------------

	const isSaving = ref(false);

	function applyToNode(nodes: INodeUi[], idx: number) {
		const target = nodes[idx];
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

		nodes[idx] = {
			...target,
			parameters: {
				...target.parameters,
				options: opts as INodeParameters,
			},
		};
	}

	async function save(scope: 'current' | 'all' = 'current') {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return;

		const nodes = workflowDocumentStore.value.allNodes.map((n) => ({ ...n }));
		const FORM_TYPES = new Set([FORM_TRIGGER_NODE_TYPE, FORM_NODE_TYPE]);
		const targets =
			scope === 'all'
				? nodes.map((n, i) => (FORM_TYPES.has(n.type) ? i : -1)).filter((i) => i !== -1)
				: (() => {
						const i = nodes.findIndex((n) => n.id === nodeId);
						return i === -1 ? [] : [i];
					})();

		for (const idx of targets) {
			applyToNode(nodes, idx);
		}

		isSaving.value = true;
		try {
			await workflowsStore.updateWorkflow(workflowId, {
				nodes,
				versionId: workflowDocumentStore.value.versionId,
			});
			// `updateWorkflow` only writes versionId/checksum back to the document
			// store; nodes stay stale. Replace the whole node list so `hasUnsavedChanges`
			// and downstream computeds see the new state. `setNodes` doesn't mark
			// `uiStore.stateIsDirty` (unlike `setNodeParameters`), which is important
			// here because the Forms view is read-only and the backend broadcasts a
			// workflow-update push right after this PATCH — a stale dirty flag would
			// trigger the "Workflow updated elsewhere" warning against our own save.
			workflowDocumentStore.value.setNodes(nodes);
		} finally {
			isSaving.value = false;
		}
	}

	const activeTheme = computed((): string => resolveFormTheme(localOverrides.value));

	function applyTheme(themeId: string) {
		const overrides = applyFormThemePreset(themeId);
		if (overrides) localOverrides.value = overrides;
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
		activeTheme,
		applyTheme,
		reset,
		save,
		onIframeLoad,
		fetchPreview,
	};
}
