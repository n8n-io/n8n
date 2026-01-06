import type { IDescriptor } from 'intento-core';

export const DeeplDescriptor: IDescriptor = {
	name: 'ai.text.translate.deepl.api.v2',
	credentials: 'ai.text.translate.deepl.api.v2',
	node: 'intentoDeeplTranslationNode',
	tool: 'intentoDeeplTranslationTool',
	displayName: 'DeepL',
	description: 'DeepL translation service with advanced features like glossaries and tone adjustment',
};
