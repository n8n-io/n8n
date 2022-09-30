import Vue from 'vue';
import { IDataObject, IPinData, IRunData } from 'n8n-workflow';
import { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { isAllowedInDotNotation, escape } from '../utils';
import { toVariableOption } from '../utils';
import { labelInfo } from '../constants';
import type { CodeNodeEditorMixin } from '../types';

export const jsonFieldCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * - Complete `$input.first().json[` to `['field']`.
		 * - Complete `$input.last().json[` to `['field']`.
		 * - Complete `$input.item.json[` to `['field']` in single-item mode.
		 * - Complete `$input.all()[index].json[` to `['field']`.
		 *
		 * - Complete `$input.first().json.` to `.field`.
		 * - Complete `$input.last().json.` to `.field`.
		 * - Complete `$input.item.json.` to `.field` in single-item mode.
		 * - Complete `$input.all()[index].json.` to `.field`.
		 */
		inputJsonFieldCompletions(
			context: CompletionContext,
			matcher: string | null = null,
		): CompletionResult | null {
			const patterns =
				matcher === null
					? {
							first: /\$input\.first\(\)\.json(\[|\.).*/,
							last: /\$input\.last\(\)\.json(\[|\.).*/,
							item: /\$input\.item\.json(\[|\.).*/,
							all: /\$input\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
					  }
					: {
							first: new RegExp(`(${escape(matcher)})\..*`),
							last: new RegExp(`(${escape(matcher)})\..*`),
							item: new RegExp(`(${escape(matcher)})\..*`),
							all: new RegExp(`(${escape(matcher)})\..*`),
					  };

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const inputNodeName = this.getInputNodeName();

				if (!inputNodeName) continue;

				if (name === 'first' || name === 'last') {
					const accessor = preCursor.text.includes('first') ? 'first' : 'last';

					const jsonOutput = this.getJsonOutput(inputNodeName, { accessor });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(
						preCursor,
						jsonOutput,
						matcher ?? `$input.${name}().json`,
					);
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const jsonOutput = this.getJsonOutput(inputNodeName, { accessor: 'item' });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, matcher ?? '$input.item.json');
				}

				if (name === 'all') {
					const match = preCursor.text.match(regex);

					if (!match?.groups?.index) continue;

					const { index } = match.groups;

					const jsonOutput = this.getJsonOutput(inputNodeName, { index: Number(index) });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(
						preCursor,
						jsonOutput,
						matcher ?? `$input.all()[${index}].json`,
					);
				}
			}

			return null;
		},

		/**
		 * Complete `$('nodeName').first().json[` to `['field']`.
		 * Complete `$('nodeName').last().json[` to `['field']`.
		 * Complete `$('nodeName').item.json[` to `['field']` in single-item mode.
		 * Complete `$('nodeName').all()[index].json[` to `['field']`.
		 *
		 * Complete `$('nodeName').first().json.` to `.field`.
		 * Complete `$('nodeName').last().json.` to `.field`.
		 * Complete `$('nodeName').item.json.` to `.field` in single-item mode.
		 * Complete `$('nodeName').all()[index].json.` to `.field`.
		 */
		selectorJsonFieldCompletions(
			context: CompletionContext,
			matcher = null,
		): CompletionResult | null {
			const patterns =
				matcher === null
					? {
							first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)\.json(\[|\.).*/,
							last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)\.json(\[|\.).*/,
							item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json(\[|\.).*/,
							all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
					  }
					: {
							first: new RegExp(`(${matcher})\..*`),
							last: new RegExp(`(${matcher})\..*`),
							item: new RegExp(`(${matcher})\..*`),
							all: new RegExp(`(${matcher})\..*`),
					  };

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (!match?.groups?.quotedNodeName) continue;

				const { quotedNodeName } = match.groups;

				const start = matcher ?? `$(${match.groups.quotedNodeName})`;

				if (name === 'first' || name === 'last') {
					const accessor = preCursor.text.includes('first') ? 'first' : 'last';

					const jsonOutput = this.getJsonOutput(quotedNodeName, { accessor });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, `${start}.${name}().json`);
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const jsonOutput = this.getJsonOutput(quotedNodeName, { accessor: 'item' });

					if (!jsonOutput) continue;

					return this.toJsonFieldCompletions(preCursor, jsonOutput, `${start}.item.json`);
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
						`${start}.all()[${index}].json`,
					);
				}
			}

			return null;
		},

		getInputNodeName() {
			try {
				const activeNode = this.$store.getters.activeNode;
				const workflow = this.getCurrentWorkflow();
				const input = workflow.connectionsByDestinationNode[activeNode.name];

				return input.main[0][0].node;
			} catch (_) {
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
			path: string, // e.g. $input.first().json or x (user-defined variable)
		) {
			if (preCursor.text.endsWith('.json[') || preCursor.text.endsWith(`${path}[`)) {
				const options: Completion[] = Object.keys(jsonOutput)
					.map((field) => `${path}['${field}']`)
					.map((label) => ({ label, info: labelInfo.json }));

				return {
					from: preCursor.from,
					options,
				};
			}

			if (preCursor.text.endsWith('.json.') || preCursor.text.endsWith(`${path}.`)) {
				const options: Completion[] = Object.keys(jsonOutput)
					.filter(isAllowedInDotNotation)
					.map((field) => `${path}.${field}`)
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

			const pinData: IPinData | undefined = this.$store.getters.pinData;

			const nodePinData = pinData && pinData[nodeName];

			if (nodePinData) {
				try {
					let itemIndex = options?.index ?? 0;

					if (options?.accessor === 'last') {
						itemIndex = nodePinData.length - 1;
					}

					return nodePinData[itemIndex].json;
				} catch (_) {}
			}

			const runData: IRunData | null = this.$store.getters.getWorkflowRunData;

			const nodeRunData = runData && runData[nodeName];

			if (!nodeRunData) return null;

			try {
				let itemIndex = options?.index ?? 0;

				if (options?.accessor === 'last') {
					const inputItems = nodeRunData[0].data!.main[0]!;
					itemIndex = inputItems.length - 1;
				}

				return nodeRunData[0].data!.main[0]![itemIndex].json;
			} catch (_) {
				return null;
			}
		},
	},
});
