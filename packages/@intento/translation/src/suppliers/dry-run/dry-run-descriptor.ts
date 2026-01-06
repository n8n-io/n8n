import type { IDescriptor } from 'intento-core';

import { SPLIT } from 'context/*';

export const DryRunDescriptor: IDescriptor = {
	name: 'ai.text.translate.dry-run',
	credentials: 'intento-credentials.dry-run',
	node: 'intentoDryRunTranslationNode',
	tool: 'intentoDryRunTranslationTool',
	displayName: 'DryRun',
	description: 'Dry run translation service for testing purposes',
	batchLimit: SPLIT.BOUNDARIES.BATCH_SIZE.max,
	segmentLimit: SPLIT.BOUNDARIES.SEGMENT_SIZE.max,
};
