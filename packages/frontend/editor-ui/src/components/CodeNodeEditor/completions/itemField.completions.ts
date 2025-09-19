import { addInfoRenderer, addVarType, escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useI18n } from '@n8n/i18n';

export function useItemFieldCompletions(language: 'python' | 'javaScript') {
	const i18n = useI18n();

	/**
	 * - Complete `x.first().` to `.json .binary`
	 * - Complete `x.last().` to `.json .binary`
	 * - Complete `x.all()[index].` to `.json .binary`
	 * - Complete `x.item.` to `.json .binary`.
	 */
	const matcherItemFieldCompletions = (
		context: CompletionContext,
		matcher: string,
		variablesToValues: Record<string, string>,
	): CompletionResult | null => {
		const preCursor = context.matchBefore(new RegExp(`${escape(matcher)}\..*`));

		if (!preCursor) return null;

		const [varName] = preCursor.text.split('.');

		const originalValue = variablesToValues[varName];

		if (!originalValue) return null;

		const options: Completion[] = [
			{
				label: `${matcher}.json`,
				info: i18n.baseText('codeNodeEditor.completer.json'),
			},
			{
				label: `${matcher}.binary`,
				info: i18n.baseText('codeNodeEditor.completer.binary'),
			},
		];

		return {
			from: preCursor.from,
			options: options.map(addVarType),
		};
	};

	/**
	 * - Complete `$input.first().` to `.json .binary`.
	 * - Complete `$input.last().` to `.json .binary`.
	 * - Complete `$input.all()[index].` to `.json .binary`.
	 * - Complete `$input.item.` to `.json .binary`.
	 */
	const inputMethodCompletions = (context: CompletionContext): CompletionResult | null => {
		const prefix = language === 'python' ? '_' : '$';
		const patterns = {
			first: new RegExp(`\\${prefix}input\\.first\\(\\)\\..*`),
			last: new RegExp(`\\${prefix}input\\.last\\(\\)\\..*`),
			item: new RegExp(`\\${prefix}input\\.item\\..*`),
			all: /\$input\.all\(\)\[(?<index>\w+)\]\..*/,
		};

		for (const [name, regex] of Object.entries(patterns)) {
			const preCursor = context.matchBefore(regex);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

			let replacementBase = '';

			if (name === 'item') replacementBase = `${prefix}input.item`;

			if (name === 'first') replacementBase = `${prefix}input.first()`;

			if (name === 'last') replacementBase = `${prefix}input.last()`;

			if (name === 'all') {
				const match = preCursor.text.match(regex);

				if (!match?.groups?.index) continue;

				const { index } = match.groups;

				replacementBase = `${prefix}input.all()[${index}]`;
			}

			const options: Completion[] = [
				{
					label: `${replacementBase}.json`,
					info: i18n.baseText('codeNodeEditor.completer.json'),
				},
				{
					label: `${replacementBase}.binary`,
					info: i18n.baseText('codeNodeEditor.completer.binary'),
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType).map(addInfoRenderer),
			};
		}

		return null;
	};

	/**
	 * - Complete `$('nodeName').first().` to `.json .binary`.
	 * - Complete `$('nodeName').last().` to `.json .binary`.
	 * - Complete `$('nodeName').all()[index].` to `.json .binary`.
	 * - Complete `$('nodeName').item.` to `.json .binary`.
	 */
	const selectorMethodCompletions = (
		context: CompletionContext,
		matcher: string | null = null,
	): CompletionResult | null => {
		const patterns = {
			first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)\..*/,
			last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)\..*/,
			item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\..*/,
			all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\..*/,
		};

		for (const [name, regex] of Object.entries(patterns)) {
			const preCursor = context.matchBefore(regex);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

			const match = preCursor.text.match(regex);

			let start = '';

			if (!matcher && match?.groups?.quotedNodeName) {
				start = `$(${match.groups.quotedNodeName})`;
			}

			let replacementBase = '';

			if (name === 'item') replacementBase = `${start}.item`;

			if (name === 'first') replacementBase = `${start}.first()`;

			if (name === 'last') replacementBase = `${start}.last()`;

			if (name === 'all') {
				const match = preCursor.text.match(regex);

				if (!match?.groups?.index) continue;

				replacementBase = `${start}.all()[${match.groups.index}]`;
			}

			const options: Completion[] = [
				{
					label: `${replacementBase}.json`,
					info: i18n.baseText('codeNodeEditor.completer.json'),
				},
				{
					label: `${replacementBase}.binary`,
					info: i18n.baseText('codeNodeEditor.completer.binary'),
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		}

		return null;
	};

	return {
		matcherItemFieldCompletions,
		inputMethodCompletions,
		selectorMethodCompletions,
	};
}
