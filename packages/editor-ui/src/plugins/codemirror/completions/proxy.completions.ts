import { i18n } from '@/plugins/i18n';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { isAllowedInDotNotation, longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { IDataObject } from 'n8n-workflow';
import type { Word } from '@/types/completions';

/**
 * Completions from proxies to their content.
 */
export function proxyCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(
		/\$(input|\(.+\)|prevNode|parameter|json|execution|workflow)*(\.|\[)(\w|\W)*/,
	);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const toResolve = word.text.endsWith('.')
		? word.text.slice(0, -1)
		: word.text.split('.').slice(0, -1).join('.');

	let options: Completion[] = [];

	try {
		const resolved = resolveParameter(`={{ ${toResolve} }}`);

		if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) return null;

		// resolved to proxy

		options = generateOptions(toResolve, resolved, word);
	} catch (_) {
		return null;
	}

	let userInputTail = '';

	const delimiter = word.text.includes('json[') ? 'json[' : '.';

	userInputTail = word.text.split(delimiter).pop() as string;

	if (userInputTail !== '') {
		options = options.filter((o) => o.label.startsWith(userInputTail) && userInputTail !== o.label);
	}

	return {
		from: word.to - userInputTail.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix([userInputTail, completion.label]);

			return [0, lcp.length];
		},
	};
}

function generateOptions(toResolve: string, proxy: IDataObject, word: Word): Completion[] {
	const SKIP_SET = new Set(['__ob__', 'pairedItem']);
	const BOOST_SET = new Set(['item', 'all', 'first', 'last']);

	if (word.text.includes('json[')) {
		return Object.keys(proxy.json as object)
			.filter((key) => !SKIP_SET.has(key))
			.map((key) => {
				return {
					label: `'${key}']`,
					type: 'keyword',
				};
			});
	}

	const proxyName = toResolve.startsWith('$(') ? '$()' : toResolve;

	return (Reflect.ownKeys(proxy) as string[])
		.filter((key) => {
			if (word.text.endsWith('json.')) return !SKIP_SET.has(key) && isAllowedInDotNotation(key);

			return !SKIP_SET.has(key);
		})
		.sort((a, b) => {
			if (BOOST_SET.has(a)) return -1;
			if (BOOST_SET.has(b)) return 1;

			return a.localeCompare(b);
		})
		.map((key) => {
			ensureKeyCanBeResolved(proxy, key);

			const isFunction = typeof proxy[key] === 'function';

			const option: Completion = {
				label: key,
				type: isFunction ? 'function' : 'keyword',
			};

			const infoKey = [proxyName, key].join('.');
			const info = i18n.proxyVars[infoKey];

			if (info) option.info = info;

			return option;
		});
}

function ensureKeyCanBeResolved(proxy: IDataObject, key: string) {
	try {
		proxy[key];
	} catch (error) {
		// e.g. attempting to access non-parent node with `$()`
		throw new Error('Cannot generate options', { cause: error });
	}
}
