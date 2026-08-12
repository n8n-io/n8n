import { n8nLang as baseN8nLang } from '@n8n/expression-editor';

import { n8nCompletionSourceFns } from './completions/addCompletions';

export { n8nAutocompletion } from '@n8n/expression-editor';

export function n8nLang() {
	return baseN8nLang(n8nCompletionSourceFns);
}
