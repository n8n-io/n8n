import type { IDescriptor } from 'intento-core';

export const TranslationAgentDescriptor: IDescriptor = {
	name: 'ai.text.translation.agent',
	symbol: '🤖 [Translation Agent]',
	tool: 'intentoTranslationAgentTool',
	node: 'intentoTranslationAgentNode',
	displayName: 'Translation Agent',
	description: 'AI-powered translation agent for intelligent text translation workflows',
};
