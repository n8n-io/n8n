import type { IDescriptor } from 'intento-core';

export const DryRunDescriptor: IDescriptor = {
	name: 'ai.text.translate.dry-run',
	credentials: 'intento-credentials.dry-run',
	node: 'intentoDryRunTranslationNode',
	tool: 'intentoDryRunTranslationTool',
	displayName: 'DryRun',
	description: 'Dry run translation service for testing purposes',
};
