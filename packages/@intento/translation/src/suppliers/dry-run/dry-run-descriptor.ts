import { SPLIT } from 'context/*';
import type { ITranslationDescriptor } from 'types/*';

export const DryRunDescriptor: ITranslationDescriptor = {
	name: 'ai.text.translate.dry-run',
	credentials: 'intento-credentials.dry-run',
	node: 'intentoDryRunTranslationNode',
	tool: 'intentoDryRunTranslationTool',
	displayName: 'DryRun',
	description: 'Dry run translation service for testing purposes',
	batchLimit: SPLIT.BOUNDARIES.BATCH_SIZE.max,
	segmentLimit: SPLIT.BOUNDARIES.SEGMENT_SIZE.max,
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
