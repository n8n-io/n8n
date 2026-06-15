type RetrieveSourceMap = (source: string) => { url: string; map: string } | null;
type RetrieveFile = (path: string) => string | null;

interface SourceMapSupportModule {
	install(options: { retrieveSourceMap?: RetrieveSourceMap; retrieveFile?: RetrieveFile }): void;
}

const EMPTY_SOURCE_MAP = '{"version":3,"sources":[],"names":[],"mappings":""}';
const EMPTY_SOURCE_FILE = '\n';

function loadSourceMapSupport(): SourceMapSupportModule | undefined {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('source-map-support') as SourceMapSupportModule;
		return mod;
	} catch {
		return undefined;
	}
}

const FILTERED_PATH_FRAGMENTS = [
	'/node_modules/@mastra/core/dist/chunk-',
	'/node_modules/@ai-sdk/',
	'/node_modules/langsmith/',
	'/node_modules/zod/',
	'/node_modules/ai/',
];

function isFilteredPath(source: unknown): source is string {
	if (typeof source !== 'string') return false;
	const normalizedSource = source.replace(/\\/g, '/');
	for (const frag of FILTERED_PATH_FRAGMENTS) {
		if (normalizedSource.includes(frag)) return true;
	}
	return false;
}

const sms = loadSourceMapSupport();
sms?.install({
	retrieveSourceMap(source) {
		return isFilteredPath(source) ? { url: source, map: EMPTY_SOURCE_MAP } : null;
	},
	retrieveFile(path) {
		// source-map-support falls through on falsy handler results.
		return isFilteredPath(path) ? EMPTY_SOURCE_FILE : null;
	},
});
