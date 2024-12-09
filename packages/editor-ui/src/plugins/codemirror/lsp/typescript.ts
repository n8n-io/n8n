import { useDataSchema } from '@/composables/useDataSchema';
import { useDebounce } from '@/composables/useDebounce';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import {
	completeFromList,
	snippetCompletion,
	type CompletionSource,
} from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport } from '@codemirror/language';
import { linter, type LintSource } from '@codemirror/lint';
import { combineConfig, Facet } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';
import * as Comlink from 'comlink';
import { NodeConnectionType, type CodeExecutionMode, type INodeExecutionData } from 'n8n-workflow';
import { watch } from 'vue';
import { autocompletableNodeNames } from '../completions/utils';
import { n8nAutocompletion } from '../n8nLang';
import type { LanguageServiceWorker } from './types';

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

	const result = await worker.getCompletionsAtPos(context.pos, word?.text ?? '');

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
		above: true,
		create: () => {
			const div = document.createElement('div');
			div.classList.add('cm-tooltip-lint');
			const wrapper = document.createElement('div');
			wrapper.classList.add('cm-diagnostic');
			div.appendChild(wrapper);
			const text = document.createElement('div');
			text.classList.add('cm-diagnosticText');
			wrapper.appendChild(text);

			if (info.quickInfo?.displayParts) {
				for (const part of info.quickInfo.displayParts) {
					const span = text.appendChild(document.createElement('span'));
					if (
						part.kind === 'keyword' &&
						['string', 'number', 'boolean', 'object'].includes(part.text)
					) {
						span.className = 'ts-primitive';
					} else if (part.kind === 'punctuation' && ['(', ')'].includes(part.text)) {
						span.className = 'ts-text';
					} else {
						span.className = `ts-${part.kind}`;
					}
					span.innerText = part.text;
				}
			}
			return { dom: div };
		},
	};
};

export async function useTypescript(initialValue: string, mode: CodeExecutionMode, id: string) {
	const worker = Comlink.wrap<LanguageServiceWorker>(
		new Worker(new URL('./worker/typescript.worker.ts', import.meta.url), { type: 'module' }),
	);
	const { getInputDataWithPinned, getSchemaForExecutionData } = useDataSchema();
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const { debounce } = useDebounce();
	const activeNodeName = ndvStore.activeNodeName;

	console.log('init');

	watch(
		[() => workflowsStore.getWorkflowExecution, () => workflowsStore.getWorkflowRunData],
		debounce(async () => await worker.updateNodeTypes(), { debounceTime: 200, trailing: true }),
	);

	await worker.init(
		{
			id,
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
			new LanguageSupport(javascriptLanguage, [
				javascriptLanguage.data.of({ autocomplete: tsCompletions }),
				javascriptLanguage.data.of({
					autocomplete: completeFromList([
						snippetCompletion('console.log(#{})', { label: 'log', detail: 'Log to console' }),
						snippetCompletion('for (const #{1:element} of #{2:array}) {\n\t#{}\n}', {
							label: 'forof',
							detail: 'For-of Loop',
						}),
						snippetCompletion(
							'for (const #{1:key} in #{2:object}) {\n\tif (Object.prototype.hasOwnProperty.call(#{2:object}, #{1:key})) {\n\t\tconst #{3:element} = #{2:object}[#{1:key}];\n\t\t#{}\n\t}\n}',
							{
								label: 'forin',
								detail: 'For-in Loop',
							},
						),
						snippetCompletion(
							'for (let #{1:index} = 0; #{1:index} < #{2:array}.length; #{1:index}++) {\n\tconst #{3:element} = #{2:array}[#{1:index}];\n\t#{}\n}',
							{
								label: 'for',
								detail: 'For Loop',
							},
						),
						snippetCompletion('if (#{1:condition}) {\n\t#{}\n}', {
							label: 'if',
							detail: 'If Statement',
						}),
						snippetCompletion('if (#{1:condition}) {\n\t#{}\n} else {\n\t\n}', {
							label: 'ifelse',
							detail: 'If-Else Statement',
						}),
						snippetCompletion('function #{1:name}(#{2:params}) {\n\t#{}\n}', {
							label: 'function',
							detail: 'Function Statement',
						}),
						snippetCompletion('function #{1:name}(#{2:params}) {\n\t#{}\n}', {
							label: 'fn',
							detail: 'Function Statement',
						}),
						snippetCompletion(
							'switch (#{1:key}) {\n\tcase #{2:value}:\n\t\t#{}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}',
							{
								label: 'switch',
								detail: 'Switch Statement',
							},
						),
						snippetCompletion('try {\n\t#{}\n} catch (#{1:error}) {\n\t\n}', {
							label: 'trycatch',
							detail: 'Try-Catch Statement',
						}),
						snippetCompletion('while (#{1:condition}) {\n\t#{}\n}', {
							label: 'while',
							detail: 'While Statement',
						}),
					]),
				}),
			]),
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
