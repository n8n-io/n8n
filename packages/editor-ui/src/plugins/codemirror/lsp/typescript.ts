import { useDataSchema } from '@/composables/useDataSchema';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { autocompletion, type CompletionSource } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { linter, type LintSource } from '@codemirror/lint';
import { combineConfig, Facet } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Comlink from 'comlink';
import { NodeConnectionType, type CodeExecutionMode, type INodeExecutionData } from 'n8n-workflow';
import { useNDVStore } from '../../../stores/ndv.store';
import { autocompletableNodeNames, stripExcessParens } from '../completions/utils';
import type { LanguageServiceWorker } from './types';
import { dollarOptions } from '../completions/dollar.completions';

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
	const { pos, explicit } = context;

	let word = context.matchBefore(/[\$\w]*/);
	if (!word?.text) {
		word = context.matchBefore(/\./);
	}

	if (!word?.text && explicit) {
		return {
			from: pos,
			options: dollarOptions().map(stripExcessParens(context)),
		};
	}

	const result = await worker.getCompletionsAtPos(context.pos);

	if (!result) return result;

	return {
		from: word ? (word.text === '.' ? word.to : word.from) : pos,
		options: result.options,
	};
};

const tsLint: LintSource = async (view) => {
	const { worker } = view.state.facet(tsFacet);
	return await worker.getDiagnostics();
};

// type HoverSource = Parameters<typeof hoverTooltip>[0];
// const tsHover: HoverSource = async (view, pos) => {
// 	const { worker } = view.state.facet(tsFacet);

// 	const info = await worker.getHoverTooltip(pos);

// 	if (!info) return null;

// 	return {
// 		pos: info.start,
// 		end: info.end,
// 		create: () => {
// 			const div = document.createElement('div');
// 			if (info.quickInfo?.displayParts) {
// 				for (const part of info.quickInfo.displayParts) {
// 					const span = div.appendChild(document.createElement('span'));
// 					span.className = `quick-info-${part.kind}`;
// 					span.innerText = part.text;
// 				}
// 			}
// 			return { dom: div };
// 		},
// 	};
// };

function webWorker(path: string) {
	return new Worker(new URL(path, import.meta.url), { type: 'module' });
}

export async function typescript(initialValue: string, mode: CodeExecutionMode) {
	const worker = Comlink.wrap<LanguageServiceWorker>(webWorker('./worker/typescript.worker.ts'));
	const { getInputDataWithPinned, getSchemaForExecutionData } = useDataSchema();
	const activeNodeName = useNDVStore().activeNodeName;

	await worker.init(
		initialValue,
		Comlink.proxy(async (nodeName) => {
			const node = useWorkflowsStore().getNodeByName(nodeName);

			if (node) {
				const inputData: INodeExecutionData[] = getInputDataWithPinned(node);
				const schema = getSchemaForExecutionData(executionDataToJson(inputData), true);

				return schema;
			}

			return undefined;
		}),
		autocompletableNodeNames(),
		activeNodeName
			? useWorkflowsStore()
					.getCurrentWorkflow()
					.getParentNodes(activeNodeName, NodeConnectionType.Main, 1)
			: [],
		mode,
	);

	return {
		extension: [
			tsFacet.of({ worker }),
			javascriptLanguage,
			autocompletion({
				icons: false,
				defaultKeymap: false,
				override: [tsCompletions],
			}),
			linter(tsLint),
			// hoverTooltip(tsHover),
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
