import { snippets } from '@codemirror/lang-javascript';
import { completeFromList, snippetCompletion } from "@codemirror/autocomplete";

/**
 * https://github.com/codemirror/lang-javascript/blob/main/src/snippets.ts
 */
export const jsSnippets = completeFromList([
	...snippets.filter((snippet) => snippet.label !== 'class'),
	snippetCompletion('console.log(${arg})', { label: 'console.log()' }),
	snippetCompletion('DateTime', { label: 'DateTime' }),
	snippetCompletion('Interval', { label: 'Interval' }),
	snippetCompletion('Duration', { label: 'Duration' }),
]);
