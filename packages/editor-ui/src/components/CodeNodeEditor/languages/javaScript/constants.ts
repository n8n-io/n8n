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

/**
 * Length of the start of the script wrapper, used as offset for the linter to find a location in source text.
 */
export const OFFSET_FOR_SCRIPT_WRAPPER = 'module.exports = async function() {'.length;
