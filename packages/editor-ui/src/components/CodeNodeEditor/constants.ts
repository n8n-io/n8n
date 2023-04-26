import { STICKY_NODE_TYPE } from '@/constants';
import type { Diagnostic } from '@codemirror/lint';

export const NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION = [STICKY_NODE_TYPE];

export const AUTOCOMPLETABLE_BUILT_IN_MODULES = [
	'console',
	'constants',
	'crypto',
	'dns',
	'dns/promises',
	'fs',
	'fs/promises',
	'http',
	'http2',
	'https',
	'inspector',
	'module',
	'os',
	'path',
	'process',
	'readline',
	'url',
	'util',
	'zlib',
];

export const DEFAULT_LINTER_SEVERITY: Diagnostic['severity'] = 'error';

export const DEFAULT_LINTER_DELAY_IN_MS = 300;

/**
 * Length of the start of the script wrapper, used as offset for the linter to find a location in source text.
 */
export const OFFSET_FOR_SCRIPT_WRAPPER = 'module.exports = async function() {'.length;

export const ALL_ITEMS_PLACEHOLDER = `
// Loop over input items and add a new field
// called 'myNewField' to the JSON of each one
for (const item of $input.all()) {
  item.json.myNewField = 1;
}

return $input.all();
`.trim();

export const EACH_ITEM_PLACEHOLDER = `
// Add a new field called 'myNewField' to the
// JSON of the item
$input.item.json.myNewField = 1;

return $input.item;
`.trim();

export const CODE_LANGUAGES = ['javaScript', 'json'] as const;
export const CODE_MODES = ['runOnceForAllItems', 'runOnceForEachItem'] as const;
