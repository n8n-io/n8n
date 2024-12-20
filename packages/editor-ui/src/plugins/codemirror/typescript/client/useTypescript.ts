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
import { linter } from '@codemirror/lint';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import { NodeConnectionType, type CodeExecutionMode, type INodeExecutionData } from 'n8n-workflow';
import { toRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { RemoteLanguageServiceWorkerInit } from '../types';
import { typescriptCompletionSource } from './completions';
import { typescriptWorkerFacet } from './facet';
import { typescriptHoverTooltips } from './hoverTooltip';
import { typescriptLintSource } from './linter';

export async function useTypescript(
	view: MaybeRefOrGetter<EditorView>,
	mode: MaybeRefOrGetter<CodeExecutionMode>,
	id: MaybeRefOrGetter<string>,
) {
	const { init } = Comlink.wrap<RemoteLanguageServiceWorkerInit>(
		new Worker(new URL('../worker/typescript.worker.ts', import.meta.url), { type: 'module' }),
	);
	const { getInputDataWithPinned, getSchemaForExecutionData } = useDataSchema();
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const { debounce } = useDebounce();
	const activeNodeName = ndvStore.activeNodeName;

	watch(
		[() => workflowsStore.getWorkflowExecution, () => workflowsStore.getWorkflowRunData],
		debounce(
			async () => {
				await worker.updateNodeTypes();
				forceParse(toValue(view));
			},
			{ debounceTime: 200, trailing: true },
		),
	);

	watch(toRef(mode), async (newMode) => {
		await worker.updateMode(newMode);
		forceParse(toValue(view));
	});

	const worker = await init(
		{
			id: toValue(id),
			content: toValue(view).state.doc.toString(),
			allNodeNames: autocompletableNodeNames(),
			variables: useEnvironmentsStore().variables.map((v) => v.key),
			inputNodeNames: activeNodeName
				? workflowsStore
						.getCurrentWorkflow()
						.getParentNodes(activeNodeName, NodeConnectionType.Main, 1)
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
						ndvStore.ndvInputRunIndex ?? 0,
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

	return [
		typescriptWorkerFacet.of({ worker }),
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
			if (!update.docChanged) return;
			await worker.updateFile(update.state.doc.toString());
		}),
	];
}
