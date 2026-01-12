import type { ITranslationDescriptor } from 'types/*';

export const DryRunDescriptor: ITranslationDescriptor = {
	name: 'ai.text.translate.dry-run',
	symbol: '🚚 [Intento DryRun]',
	credentials: 'intento-credentials.dry-run',
	node: 'intentoDryRunTranslationNode',
	tool: 'intentoDryRunTranslationTool',
	displayName: 'DryRun',
	description: 'Dry run translation service for testing purposes',
	batchLimit: Infinity,
	segmentLimit: Infinity,
	languageMap: {
		from: new Map<string, string>(),
		to: new Map<string, string>(),
	},
	knownLanguages: {
		// empty sets indicate that all languages are supported
		from: new Set<string>(),
		to: new Set<string>(),
	},
};
