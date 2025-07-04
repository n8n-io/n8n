import { escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { isAllowedInDotNotation } from '@/plugins/codemirror/completions/utils';
import { useI18n } from '@n8n/i18n';
import type { IPinData, IRunData, IDataObject } from 'n8n-workflow';

function useJsonFieldCompletions() {
	const i18n = useI18n();
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();

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
	const matcherJsonFieldCompletions = (
		context: CompletionContext,
		matcher: string,
		variablesToValues: Record<string, string>,
	): CompletionResult | null => {
		const pattern = new RegExp(`(${escape(matcher)})\..*`);
		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const inputNodeName = getInputNodeName();
		if (!inputNodeName) return null;

		const [varName] = preCursor.text.split('.');
		const originalValue = variablesToValues[varName];
		if (!originalValue) return null;

		for (const accessor of ['first', 'last', 'item']) {
			if (originalValue.includes(accessor) || preCursor.text.includes(accessor)) {
				const jsonOutput = getJsonOutput(inputNodeName, { accessor });
				if (!jsonOutput) return null;
				return toJsonFieldCompletions(preCursor, jsonOutput, matcher);
			}
		}

		if (originalValue.includes('all')) {
			const match = originalValue.match(/\$(input|\(.*\))\.all\(\)\[(?<index>.+)\]$/);
			if (!match?.groups?.index) return null;

			const { index } = match.groups;
			const jsonOutput = getJsonOutput(inputNodeName, { index: Number(index) });
			if (!jsonOutput) return null;

			return toJsonFieldCompletions(preCursor, jsonOutput, matcher);
		}

		return null;
	};

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
	const inputJsonFieldCompletions = (context: CompletionContext): CompletionResult | null => {
		const patterns = {
			first: /\$input\.first\(\)\.json(\[|\.).*/,
			last: /\$input\.last\(\)\.json(\[|\.).*/,
			item: /\$input\.item\.json(\[|\.).*/,
			all: /\$input\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
		};

		for (const [name, regex] of Object.entries(patterns)) {
			const preCursor = context.matchBefore(regex);
			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

			const inputNodeName = getInputNodeName();
			if (!inputNodeName) continue;

			if (name === 'first' || name === 'last') {
				const jsonOutput = getJsonOutput(inputNodeName, { accessor: name });
				if (!jsonOutput) continue;
				return toJsonFieldCompletions(preCursor, jsonOutput, `$input.${name}().json`);
			}

			if (name === 'item') {
				const jsonOutput = getJsonOutput(inputNodeName, { accessor: 'item' });
				if (!jsonOutput) continue;
				return toJsonFieldCompletions(preCursor, jsonOutput, '$input.item.json');
			}

			if (name === 'all') {
				const match = preCursor.text.match(regex);
				if (!match?.groups?.index) continue;

				const { index } = match.groups;
				const jsonOutput = getJsonOutput(inputNodeName, { index: Number(index) });
				if (!jsonOutput) continue;

				return toJsonFieldCompletions(preCursor, jsonOutput, `$input.all()[${index}].json`);
			}
		}

		return null;
	};

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
	const selectorJsonFieldCompletions = (context: CompletionContext): CompletionResult | null => {
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
				const jsonOutput = getJsonOutput(quotedNodeName, { accessor: name });
				if (!jsonOutput) continue;
				return toJsonFieldCompletions(preCursor, jsonOutput, `${selector}.${name}().json`);
			}

			if (name === 'item') {
				const jsonOutput = getJsonOutput(quotedNodeName, { accessor: 'item' });
				if (!jsonOutput) continue;
				return toJsonFieldCompletions(preCursor, jsonOutput, `${selector}.item.json`);
			}

			if (name === 'all') {
				const regexMatch = preCursor.text.match(regex);
				if (!regexMatch?.groups?.index) continue;

				const { index } = regexMatch.groups;
				const jsonOutput = getJsonOutput(quotedNodeName, { index: Number(index) });
				if (!jsonOutput) continue;

				return toJsonFieldCompletions(preCursor, jsonOutput, `${selector}.all()[${index}].json`);
			}
		}

		return null;
	};

	const getInputNodeName = (): string | null => {
		try {
			const activeNode = ndvStore.activeNode;
			if (activeNode) {
				const input = workflowsStore.connectionsByDestinationNode[activeNode.name];
				return input.main[0] ? input.main[0][0].node : null;
			}
		} catch (e) {
			console.error(e);
			return null;
		}
		return null;
	};

	/**
	 * .json -> .json['field']
	 * .json -> .json.field
	 */
	const toJsonFieldCompletions = (
		preCursor: NonNullable<ReturnType<CompletionContext['matchBefore']>>,
		jsonOutput: IDataObject,
		matcher: string,
	): CompletionResult | null => {
		if (
			/\.json\[/.test(preCursor.text) ||
			new RegExp(`(${escape(matcher)})\\[`).test(preCursor.text)
		) {
			const options: Completion[] = Object.keys(jsonOutput)
				.map((field) => `${matcher}['${field}']`)
				.map((label) => ({
					label,
					info: i18n.baseText('codeNodeEditor.completer.json'),
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
				.map((label) => ({
					label,
					info: i18n.baseText('codeNodeEditor.completer.json'),
				}));

			return {
				from: preCursor.from,
				options,
			};
		}

		return null;
	};

	/**
	 * Get the `json` output of a node from `runData` or `pinData`.
	 *
	 * `accessor` is the method or property used to find the item index.
	 * `index` is only passed for `all()`.
	 */
	const getJsonOutput = (
		quotedNodeName: string,
		options?: { accessor?: string; index?: number },
	) => {
		let nodeName = quotedNodeName;

		const isSingleQuoteWrapped = quotedNodeName.startsWith("'") && quotedNodeName.endsWith("'");
		const isDoubleQuoteWrapped = quotedNodeName.startsWith('"') && quotedNodeName.endsWith('"');

		if (isSingleQuoteWrapped) {
			nodeName = quotedNodeName.replace(/^'/, '').replace(/'$/, '');
		} else if (isDoubleQuoteWrapped) {
			nodeName = quotedNodeName.replace(/^"/, '').replace(/"$/, '');
		}

		const pinData: IPinData | undefined = useWorkflowsStore().pinnedWorkflowData;

		const nodePinData = pinData?.[nodeName];

		if (nodePinData) {
			try {
				let itemIndex = options?.index ?? 0;

				if (options?.accessor === 'last') {
					itemIndex = nodePinData.length - 1;
				}

				return nodePinData[itemIndex].json;
			} catch {}
		}

		const runData: IRunData | null = useWorkflowsStore().getWorkflowRunData;

		const nodeRunData = runData?.[nodeName];

		if (!nodeRunData) return null;

		try {
			let itemIndex = options?.index ?? 0;

			if (options?.accessor === 'last') {
				const inputItems = nodeRunData[0].data?.main[0] ?? [];
				itemIndex = inputItems.length - 1;
			}

			return nodeRunData[0].data?.main[0]?.[itemIndex].json;
		} catch {
			return null;
		}
	};

	return {
		matcherJsonFieldCompletions,
		inputJsonFieldCompletions,
		selectorJsonFieldCompletions,
	};
}

export { useJsonFieldCompletions };
