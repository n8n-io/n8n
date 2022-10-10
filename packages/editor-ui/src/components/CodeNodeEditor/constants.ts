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

