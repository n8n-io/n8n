import Vue from 'vue';

import {
	autocompletion,
	completeFromList,
	CompletionContext,
	CompletionResult,
	snippetCompletion,
} from '@codemirror/autocomplete';
import { snippets as originalJsSnippets } from '@codemirror/lang-javascript';

import type { Extension } from '@codemirror/state';
import type { CodeNodeEditorMixin } from './types';
import { INodeUi } from '@/Interface';

// @TODO: Go back one char after function completion

const N8N_FUNCTIONS = [
	{ label: '$evaluateExpression()', info: 'expression: string, itemIndex?: number' },
	{ label: '$getNodeParameter()', info: 'paramName: string, itemIndex: number' },
	{ label: '$getWorkflowStaticData()', info: "type: 'global' | 'node'" },
	{ label: '$item()', info: 'itemIndex: number, runIndex?: number' },
	{ label: '$items()', info: 'nodeName?: string, outputIndex?: number, runIndex?: number' },
	{ label: '$input.first()', info: 'First input item of this node' },
	{ label: '$input.last()', info: 'Last input item of this node' },
	{ label: '$input.all()', info: 'All input items of this node' },
	{ label: '$input.item(index)', info: 'Specific input item of this node' },
];

const N8N_GENERAL_VARS = [
	{ label: '$env', info: 'Environment variables' },
	{ label: '$executionId', info: 'ID of the current execution' },
	{ label: '$mode', info: 'Workflow execution mode' },
	{ label: '$parameter', info: 'Parameters of current node' },
	{ label: '$resumeWebhookUrl', info: 'Webhook URL to call to resume a waiting workflow' },
	{ label: '$workflow', info: 'Workflow metadata' },
	{ label: '$now', info: 'Current date and time' },
	{ label: '$today', info: 'Current date' },
	{ label: '$runIndex', info: 'Index of the current run' },
];

const N8N_EACH_ITEM_VARS = [
	{ label: '$json', info: "Data in the item's `json` key" },
	{ label: '$binary', info: "Data in the item's `binary` key" },
	{ label: '$position', info: 'Index of the item in its array' },
];

export const autocompleterExtension = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		autocompletionExtension(): Extension {
			return autocompletion({
				override: [this.n8nMainCompletions, this.n8nNodeNameCompletions, this.jsSnippets()],
			});
		},
		n8nMainCompletions(context: CompletionContext): CompletionResult | null {
			const word = context.matchBefore(/\$\w*/);

			if (!word || (word.from === word.to && !context.explicit)) return null;

			const options = [
				...N8N_FUNCTIONS.map(({ label, info }) => ({ label, type: 'function', info })),
				...N8N_GENERAL_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
			];

			if (this.mode === 'runOnceForEachItem') {
				options.push(
					...N8N_EACH_ITEM_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
				);
			}

			return {
				from: word.from,
				options,
			};
		},
		n8nNodeNameCompletions(context: CompletionContext): CompletionResult | null {
			const word = context.matchBefore(/\$\(*/);

			if (!word || (word.from === word.to && !context.explicit)) return null;

			const nodeNames = this.$store.getters.allNodes.map(({ name }: INodeUi) => name);

			// @TODO: Disable closing bracket matching for $(nodeName) and $input

			const options = nodeNames.flatMap((nodeName: string) => {
				return [
					{
						label: `$('${nodeName}').first()`,
						type: 'variable',
						info: `First output item of ${nodeName}`,
					},
					{
						label: `$('${nodeName}').last()`,
						type: 'variable',
						info: `Last output item of '${nodeName}'`,
					},
					{
						label: `$('${nodeName}').all()`,
						type: 'variable',
						info: `All output items of '${nodeName}'`,
					},
					{
						label: `$('${nodeName}').item(index)`,
						type: 'variable',
						info: `Specific output item of ${nodeName}`,
					},
				];
			});

			return {
				from: word.from,
				options,
			};
		},
		jsSnippets() {
			return completeFromList([
				...originalJsSnippets,
				snippetCompletion('DateTime', { label: 'DateTime' }),
				snippetCompletion('Interval', { label: 'Interval' }),
				snippetCompletion('Duration', { label: 'Duration' }),
			]);
		},
	},
});
