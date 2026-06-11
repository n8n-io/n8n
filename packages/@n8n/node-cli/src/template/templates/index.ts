import { customTemplate } from './declarative/custom/template';
import { githubIssuesTemplate } from './declarative/github-issues/template';
import { customMemoryTemplate } from './programmatic/ai/memory-custom/template';
import { customChatModelTemplate } from './programmatic/ai/model-ai-custom/template';
import { customChatModelExampleTemplate } from './programmatic/ai/model-ai-custom-example/template';
import { openaiChatModelTemplate } from './programmatic/ai/model-openai-compatible/template';
import { exampleTemplate } from './programmatic/example/template';

export const templates = {
	declarative: {
		githubIssues: githubIssuesTemplate,
		custom: customTemplate,
	},
	programmatic: {
		example: exampleTemplate,
		openaiChatModel: openaiChatModelTemplate,
		customChatModel: customChatModelTemplate,
		customChatMemory: customMemoryTemplate,
		customChatModelExample: customChatModelExampleTemplate,
	},
} as const;

export type TemplateMap = typeof templates;
export type TemplateType = keyof TemplateMap;
export type TemplateName<T extends TemplateType> = keyof TemplateMap[T];

export function getTemplate<T extends TemplateType, N extends TemplateName<T>>(
	type: T,
	name: N,
): TemplateMap[T][N] {
	return templates[type][name];
}

export function isTemplateType(val: unknown): val is TemplateType {
	return typeof val === 'string' && val in templates;
}

export function isTemplateName<T extends TemplateType>(
	type: T,
	name: unknown,
): name is TemplateName<T> {
	return typeof name === 'string' && name in templates[type];
}
