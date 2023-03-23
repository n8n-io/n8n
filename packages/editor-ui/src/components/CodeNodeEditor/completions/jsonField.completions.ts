import Vue from 'vue';
import { escape, toVariableOption } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { IDataObject, IPinData, IRunData } from 'n8n-workflow';
import type { CodeNodeEditorMixin } from '../types';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { isAllowedInDotNotation } from '@/plugins/codemirror/completions/utils';

export const jsonFieldCompletions = (Vue as CodeNodeEditorMixin).extend({
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
	},
	methods: {
		/**
		 * - Complete `x.first().json.` to `.field`.
		 * - Complete `x.last().json.` to `.field`.
		 * - Complete `x.all()[index].json.` to `.field`.
		 * - Complete `x.item.json.` to `.field`.
		 *
		 * - Complete `x.first().json[` to `['field']`.
		 * - Complete `x.last().json[` to `['field']`.
		 * - Complete `x.all()[index].json[` to `['field']`.
		 * - Complete `x.item.json[` to `['field']`.
		 */
		matcherJsonFieldCompletions(
			context: CompletionContext,
			matcher: string,
			variablesToValues: Record<string, string>,
		): CompletionResult | null {
			const pattern = new RegExp(`(${escape(matcher)})\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const inputNodeName = this.getInputNodeName();

			if (!inputNodeName) return null;

			const [varName] = preCursor.text.split('.');

			const originalValue = variablesToValues[varName];

			if (!originalValue) return null;

			for (const accessor of ['first', 'last', 'item']) {
				/**
				 * const x = $input.first(); // accessor in original value
				 * x.json
				 *
				 * const x = $input;
				 * x.first().json // accessor in preCursor.text
				 */
				if (originalValue.includes(accessor) || preCursor.text.includes(accessor)) {
					const jsonOutput = this.getJsonOutput(inputNodeName, { accessor });

					if (!jsonOutput) return null;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, matcher);
				}
			}

			if (originalValue.includes('all')) {
				const match = originalValue.match(/\$(input|\(.*\))\.all\(\)\[(?<index>.+)\]$/);

				if (!match?.groups?.index) return null;

				const { index } = match.groups;

				const jsonOutput = this.getJsonOutput(inputNodeName, { index: Number(index) });

				if (!jsonOutput) return null;

				return this.toJsonFieldCompletions(preCursor, jsonOutput, matcher);
			}

			return null;
		},

		/**
		 * - Complete `$input.first().json.` to `.field`.
		 * - Complete `$input.last().json.` to `.field`.
		 * - Complete `$input.all()[index].json.` to `.field`.
		 * - Complete `$input.item.json.` to `.field`.
		 *
		 * - Complete `$input.first().json[` to `['field']`.
		 * - Complete `$input.last().json[` to `['field']`.
		 * - Complete `$input.all()[index].json[` to `['field']`.
		 * - Complete `$input.item.json[` to `['field']`.
		 */
		inputJsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const patterns = {
				first: /\$input\.first\(\)\.json(\[|\.).*/,
				last: /\$input\.last\(\)\.json(\[|\.).*/,
				item: /\$input\.item\.json(\[|\.).*/,
				all: /\$input\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
			};

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const inputNodeName = this.getInputNodeName();

				if (!inputNodeName) continue;

				if (name === 'first' || name === 'last') {
					const jsonOutput = this.getJsonOutput(inputNodeName, { accessor: name });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, `$input.${name}().json`);
				}

				if (name === 'item') {
					const jsonOutput = this.getJsonOutput(inputNodeName, { accessor: 'item' });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, '$input.item.json');
				}

				if (name === 'all') {
					const match = preCursor.text.match(regex);

					if (!match?.groups?.index) continue;

					const { index } = match.groups;

					const jsonOutput = this.getJsonOutput(inputNodeName, { index: Number(index) });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, `$input.all()[${index}].json`);
				}
			}

			return null;
		},

		/**
		 * Complete `$('nodeName').first().json.` to `.field`.
		 * Complete `$('nodeName').last().json.` to `.field`.
		 * Complete `$('nodeName').all()[index].json.` to `.field`.
		 * Complete `$('nodeName').item.json.` to `.field`.
		 *
		 * Complete `$('nodeName').first().json[` to `['field']`.
		 * Complete `$('nodeName').last().json[` to `['field']`.
		 * Complete `$('nodeName').all()[index].json[` to `['field']`.
		 * Complete `$('nodeName').item.json[` to `['field']`.
		 */
		selectorJsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const patterns = {
				first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)\.json(\[|\.).*/,
				last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)\.json(\[|\.).*/,
				item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json(\[|\.).*/,
				all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
			};

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (!match?.groups?.quotedNodeName) continue;

				const { quotedNodeName } = match.groups;

				const selector = `$(${match.groups.quotedNodeName})`;

				if (name === 'first' || name === 'last') {
					const jsonOutput = this.getJsonOutput(quotedNodeName, { accessor: name });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, `${selector}.${name}().json`);
				}

				if (name === 'item') {
					const jsonOutput = this.getJsonOutput(quotedNodeName, { accessor: 'item' });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, `${selector}.item.json`);
				}

				if (name === 'all') {
					const match = preCursor.text.match(regex);

					if (!match?.groups?.index) continue;

					const { index } = match.groups;

					const jsonOutput = this.getJsonOutput(quotedNodeName, { index: Number(index) });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(
						preCursor,
						jsonOutput,
						`${selector}.all()[${index}].json`,
					);
				}
			}

			return null;
		},

		getInputNodeName() {
			try {
				const activeNode = this.ndvStore.activeNode;
				if (activeNode) {
					const workflow = this.getCurrentWorkflow();
					const input = workflow.connectionsByDestinationNode[activeNode.name];

					return input.main[0][0].node;
				}
			} catch {
				return null;
			}
		},

		/**
		 * .json -> .json['field']
		 * .json -> .json.field
		 */
		toJsonFieldCompletions(
			preCursor: NonNullable<ReturnType<CompletionContext['matchBefore']>>,
			jsonOutput: IDataObject,
			matcher: string, // e.g. `$input.first().json` or `x` (user-defined variable)
		) {
			if (
				/\.json\[/.test(preCursor.text) ||
				new RegExp(`(${escape(matcher)})\\[`).test(preCursor.text)
			) {
				const options: Completion[] = Object.keys(jsonOutput)
					.map((field) => `${matcher}['${field}']`)
					.map((label) => ({
						label,
						info: this.$locale.baseText('codeNodeEditor.completer.json'),
					}));

				return {
					from: preCursor.from,
					options,
				};
			}

			if (
				/\.json\./.test(preCursor.text) ||
				new RegExp(`(${escape(matcher)})\.`).test(preCursor.text)
			) {
				const options: Completion[] = Object.keys(jsonOutput)
					.filter(isAllowedInDotNotation)
					.map((field) => `${matcher}.${field}`)
					.map(toVariableOption);

				return {
					from: preCursor.from,
					options,
				};
			}

			return null;
		},

		/**
		 * Get the `json` output of a node from `runData` or `pinData`.
		 *
		 * `accessor` is the method or property used to find the item index.
		 * `index` is only passed for `all()`.
		 */
		getJsonOutput(quotedNodeName: string, options?: { accessor?: string; index?: number }) {
			const nodeName = quotedNodeName.replace(/['"]/g, '');

			const pinData: IPinData | undefined = this.workflowsStore.getPinData;

			const nodePinData = pinData && pinData[nodeName];

			if (nodePinData) {
				try {
					let itemIndex = options?.index ?? 0;

					if (options?.accessor === 'last') {
						itemIndex = nodePinData.length - 1;
					}

					return nodePinData[itemIndex].json;
				} catch {}
			}

			const runData: IRunData | null = this.workflowsStore.getWorkflowRunData;

			const nodeRunData = runData && runData[nodeName];

			if (!nodeRunData) return null;

			try {
				let itemIndex = options?.index ?? 0;

				if (options?.accessor === 'last') {
					const inputItems = nodeRunData[0].data!.main[0]!;
					itemIndex = inputItems.length - 1;
				}

				return nodeRunData[0].data!.main[0]![itemIndex].json;
			} catch {
				return null;
			}
		},
	},
});
