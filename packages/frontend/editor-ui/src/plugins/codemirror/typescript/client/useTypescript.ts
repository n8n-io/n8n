import { useDataSchema } from '@/composables/useDataSchema';
import { useDebounce } from '@/composables/useDebounce';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { autocompletableNodeNames } from '@/plugins/codemirror/completions/utils';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { forceParse } from '@/utils/forceParse';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { autocompletion } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport } from '@codemirror/language';
import { Text, type Extension } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import { NodeConnectionTypes, type CodeExecutionMode, type INodeExecutionData } from 'n8n-workflow';
import { onBeforeUnmount, ref, toRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { LanguageServiceWorker, RemoteLanguageServiceWorkerInit } from '../types';
import { typescriptCompletionSource } from './completions';
import { typescriptWorkerFacet } from './facet';
import { typescriptHoverTooltips } from './hoverTooltip';
import { linter } from '@codemirror/lint';
import { typescriptLintSource } from './linter';
import type { TargetNodeParameterContext } from '@/Interface';
import { TARGET_NODE_PARAMETER_FACET } from '../../completions/constants';

export function useTypescript(
	view: MaybeRefOrGetter<EditorView | undefined>,
	mode: MaybeRefOrGetter<CodeExecutionMode>,
	id: MaybeRefOrGetter<string>,
	targetNodeParameterContext?: MaybeRefOrGetter<TargetNodeParameterContext | undefined>,
) {
	const { getInputDataWithPinned, getSchemaForExecutionData } = useDataSchema();
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const { debounce } = useDebounce();
	const activeNodeName = toValue(targetNodeParameterContext)?.nodeName ?? ndvStore.activeNodeName;
	const worker = ref<Comlink.Remote<LanguageServiceWorker>>();
	const webWorker = ref<Worker>();

	async function createWorker(): Promise<Extension> {
		webWorker.value = new Worker(new URL('../worker/typescript.worker.ts', import.meta.url), {
			type: 'module',
		});
		const { init } = Comlink.wrap<RemoteLanguageServiceWorkerInit>(webWorker.value);
		worker.value = await init(
			{
				id: toValue(id),
				content: Comlink.proxy((toValue(view)?.state.doc ?? Text.empty).toJSON()),
				allNodeNames: autocompletableNodeNames(toValue(targetNodeParameterContext)),
				variables: useEnvironmentsStore().variables.map((v) => v.key),
				inputNodeNames: activeNodeName
					? workflowsStore.workflowObject.getParentNodes(
							activeNodeName,
							NodeConnectionTypes.Main,
							1,
						)
					: [],
				mode: toValue(mode),
			},
			Comlink.proxy(async (nodeName) => {
				const node = workflowsStore.getNodeByName(nodeName);

				if (node) {
					const inputData: INodeExecutionData[] = getInputDataWithPinned(node);
					const schema = getSchemaForExecutionData(executionDataToJson(inputData), true);
					const execution = workflowsStore.getWorkflowExecution;
					const binaryData = useNodeHelpers()
						.getBinaryData(
							execution?.data?.resultData?.runData ?? null,
							node.name,
							toValue(targetNodeParameterContext) === undefined
								? (ndvStore.ndvInputRunIndex ?? 0)
								: 0,
							0,
						)
						.filter((data) => Boolean(data && Object.keys(data).length));

					return {
						json: schema,
						binary: Object.keys(binaryData.reduce((acc, obj) => ({ ...acc, ...obj }), {})),
						params: getSchemaForExecutionData([node.parameters]),
					};
				}

				return undefined;
			}),
		);

		const editor = toValue(view);

		if (editor) {
			forceParse(editor);
		}

		return [
			typescriptWorkerFacet.of({ worker: worker.value }),
			TARGET_NODE_PARAMETER_FACET.of(toValue(targetNodeParameterContext)),
			new LanguageSupport(javascriptLanguage, [
				javascriptLanguage.data.of({ autocomplete: typescriptCompletionSource }),
			]),
			autocompletion({ icons: false, aboveCursor: true }),
			linter(typescriptLintSource),
			hoverTooltip(typescriptHoverTooltips, {
				hideOnChange: true,
				hoverTime: 500,
			}),
			EditorView.updateListener.of(async (update) => {
				if (update.docChanged) {
					void worker.value?.updateFile(update.changes.toJSON());
				}
			}),
		];
	}

	async function onWorkflowDataChange() {
		const editor = toValue(view);
		if (!editor || !worker.value) return;

		await worker.value.updateNodeTypes();

		forceParse(editor);
	}

	watch(
		[() => workflowsStore.getWorkflowExecution, () => workflowsStore.getWorkflowRunData],
		debounce(onWorkflowDataChange, { debounceTime: 200, trailing: true }),
	);

	watch(toRef(mode), async (newMode) => {
		const editor = toValue(view);
		if (!editor || !worker.value) return;

		await worker.value.updateMode(newMode);
		forceParse(editor);
	});

	onBeforeUnmount(() => {
		if (webWorker.value) webWorker.value.terminate();
	});

	return {
		createWorker,
	};
}
