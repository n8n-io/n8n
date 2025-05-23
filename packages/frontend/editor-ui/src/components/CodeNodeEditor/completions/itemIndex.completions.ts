import { useI18n } from '@n8n/i18n';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeExecutionMode } from 'n8n-workflow';
import { toValue, type MaybeRefOrGetter } from 'vue';
import { escape } from '../utils';

export function useItemIndexCompletions(mode: MaybeRefOrGetter<CodeExecutionMode>) {
	const i18n = useI18n();
	/**
	 * - Complete `$input.` to `.first() .last() .all() .itemMatching()` in all-items mode.
	 * - Complete `$input.` to `.item` in single-item mode.
	 */
	const inputCompletions = (
		context: CompletionContext,
		matcher = '$input',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = [];

		if (toValue(mode) === 'runOnceForAllItems') {
			options.push(
				{
					label: `${matcher}.first()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.first'),
				},
				{
					label: `${matcher}.last()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.last'),
				},
				{
					label: `${matcher}.all()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.all'),
				},
				{
					label: `${matcher}.itemMatching()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.itemMatching'),
				},
			);
		}

		if (toValue(mode) === 'runOnceForEachItem') {
			options.push({
				label: `${matcher}.item`,
				type: 'variable',
				info: i18n.baseText('codeNodeEditor.completer.$input.item'),
			});
		}

		return {
			from: preCursor.from,
			options,
		};
	};

	/**
	 * - Complete `$('nodeName').` to `.params .context` in both modes.
	 * - Complete `$('nodeName').` to `.first() .last() .all() .itemMatching()` in all-items mode.
	 * - Complete `$('nodeName').` to `.item` in single-item mode.
	 */
	const selectorCompletions = (context: CompletionContext, matcher: string | null = null) => {
		const pattern =
			matcher === null
				? /\$\((?<quotedNodeName>['"][\S\s]+['"])\)\..*/ // $('nodeName').
				: new RegExp(`${matcher}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const match = preCursor.text.match(pattern);

		let replacementBase = '';

		if (matcher === null && match?.groups?.quotedNodeName) {
			replacementBase = `$(${match.groups.quotedNodeName})`;
		} else if (matcher) {
			replacementBase = matcher;
		}

		const options: Completion[] = [
			{
				label: `${replacementBase}.params`,
				type: 'variable',
				info: i18n.baseText('codeNodeEditor.completer.selector.params'),
			},
			{
				label: `${replacementBase}.context`,
				type: 'variable',
				info: i18n.baseText('codeNodeEditor.completer.selector.context'),
			},
		];

		if (toValue(mode) === 'runOnceForAllItems') {
			options.push(
				{
					label: `${replacementBase}.first()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.first'),
				},
				{
					label: `${replacementBase}.last()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.last'),
				},
				{
					label: `${replacementBase}.all()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.$input.all'),
				},
				{
					label: `${replacementBase}.itemMatching()`,
					type: 'function',
					info: i18n.baseText('codeNodeEditor.completer.selector.itemMatching'),
				},
			);
		}

		if (toValue(mode) === 'runOnceForEachItem') {
			options.push({
				label: `${replacementBase}.item`,
				type: 'variable',
				info: i18n.baseText('codeNodeEditor.completer.selector.item'),
			});
		}

		return {
			from: preCursor.from,
			options,
		};
	};

	return {
		inputCompletions,
		selectorCompletions,
	};
}
