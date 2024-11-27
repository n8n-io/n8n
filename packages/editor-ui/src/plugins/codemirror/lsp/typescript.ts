import { useDataSchema } from '@/composables/useDataSchema';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { type CompletionSource } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport } from '@codemirror/language';
import { linter, type LintSource } from '@codemirror/lint';
import { combineConfig, Facet } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import { NodeConnectionType, type CodeExecutionMode, type INodeExecutionData } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import { autocompletableNodeNames } from '../completions/utils';
import { n8nAutocompletion } from '../n8nLang';
import type { LanguageServiceWorker } from './types';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import useEnvironmentsStore from '../../../stores/environments.ee.store';

export const tsFacet = Facet.define<
	{ worker: Comlink.Remote<LanguageServiceWorker> },
	{ worker: Comlink.Remote<LanguageServiceWorker> }
>({
	combine(configs) {
		return combineConfig(configs, {});
	},
});

const tsCompletions: CompletionSource = async (context) => {
	const { worker } = context.state.facet(tsFacet);
	const { pos } = context;

	let word = context.matchBefore(/[\$\w]*/);
	if (!word?.text) {
		word = context.matchBefore(/\./);
	}

	const result = await worker.getCompletionsAtPos(context.pos);

	if (context.aborted) return null;
	if (!result) return result;

	return {
		from: word ? (word.text === '.' ? word.to : word.from) : pos,
		options: result.options,
	};
};

const tsLint: LintSource = async (view) => {
	const { worker } = view.state.facet(tsFacet);
	const docLength = view.state.doc.length;
	return (await worker.getDiagnostics()).filter((diag) => {
		return diag.from < docLength && diag.to <= docLength && diag.from >= 0;
	});
};

type HoverSource = Parameters<typeof hoverTooltip>[0];
const tsHover: HoverSource = async (view, pos) => {
	const { worker } = view.state.facet(tsFacet);

	const info = await worker.getHoverTooltip(pos);

	if (!info) return null;

	return {
		pos: info.start,
		end: info.end,
		create: () => {
			const div = document.createElement('div');
			if (info.quickInfo?.displayParts) {
				for (const part of info.quickInfo.displayParts) {
					const span = div.appendChild(document.createElement('span'));
					span.className = `quick-info-${part.kind}`;
					span.innerText = part.text;
				}
			}
			return { dom: div };
		},
	};
};

export async function typescript(initialValue: string, mode: CodeExecutionMode) {
	const worker = Comlink.wrap<LanguageServiceWorker>(
		new Worker(new URL('./worker/typescript.worker.ts', import.meta.url), { type: 'module' }),
	);
	const { getInputDataWithPinned, getSchemaForExecutionData } = useDataSchema();
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const activeNodeName = ndvStore.activeNodeName;

	await worker.init(
		{
			content: initialValue,
			allNodeNames: autocompletableNodeNames(),
			variables: useEnvironmentsStore().variables.map((v) => v.key),
			inputNodeNames: activeNodeName
				? workflowsStore
						.getCurrentWorkflow()
						.getParentNodes(activeNodeName, NodeConnectionType.Main, 1)
				: [],
			mode,
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

				return { json: schema, binary: Object.keys(binaryData) };
			}

			return undefined;
		}),
	);

	return {
		extension: [
			tsFacet.of({ worker }),
			new LanguageSupport(
				javascriptLanguage,
				javascriptLanguage.data.of({ autocomplete: tsCompletions }),
			),
			n8nAutocompletion(),
			linter(tsLint),
			hoverTooltip(tsHover, {
				hideOnChange: true,
				hoverTime: 500,
			}),
			EditorView.updateListener.of(async (update) => {
				if (!update.docChanged) return;
				await worker.updateFile(update.state.doc.toString());
			}),
		],
		updateMode: (newMode: CodeExecutionMode) => {
			void worker.updateMode(newMode);
		},
	};
}
