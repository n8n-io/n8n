import type { InstanceAiToolCallState } from '@n8n/api-types';

type TemplateChoiceItem = { templateId: number; name: string; description?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseTemplateChoiceItem(value: unknown): TemplateChoiceItem | null {
	if (!isRecord(value)) return null;

	const { templateId, name, description } = value;
	if (typeof templateId !== 'number' || typeof name !== 'string') {
		return null;
	}

	return {
		templateId,
		name,
		...(typeof description === 'string' ? { description } : {}),
	};
}

function parseTemplateChoiceArgs(toolCall: InstanceAiToolCallState): {
	templates: TemplateChoiceItem[];
	totalResults?: number;
	introMessage?: string;
} {
	if (!isRecord(toolCall.args)) {
		return { templates: [] };
	}

	const templates = Array.isArray(toolCall.args.templates)
		? toolCall.args.templates
				.map(parseTemplateChoiceItem)
				.filter((item): item is TemplateChoiceItem => item !== null)
		: [];

	return {
		templates,
		...(typeof toolCall.args.totalResults === 'number'
			? { totalResults: toolCall.args.totalResults }
			: {}),
		...(typeof toolCall.args.introMessage === 'string'
			? { introMessage: toolCall.args.introMessage }
			: {}),
	};
}

export function isTemplateChoiceToolCall(toolCall: InstanceAiToolCallState): boolean {
	if (toolCall.confirmation?.inputType === 'template-choice') {
		return true;
	}

	if (toolCall.toolName !== 'choose-workflow-template') {
		return false;
	}

	return parseTemplateChoiceArgs(toolCall).templates.length > 0;
}

export function getTemplateChoiceTemplates(
	toolCall: InstanceAiToolCallState,
): TemplateChoiceItem[] {
	if (toolCall.confirmation?.templates?.length) {
		return toolCall.confirmation.templates;
	}

	return parseTemplateChoiceArgs(toolCall).templates;
}

export function getTemplateChoiceTotalResults(toolCall: InstanceAiToolCallState): number {
	if (typeof toolCall.confirmation?.totalResults === 'number') {
		return toolCall.confirmation.totalResults;
	}

	const { totalResults, templates } = parseTemplateChoiceArgs(toolCall);
	return totalResults ?? templates.length;
}

export function getTemplateChoiceIntroMessage(
	toolCall: InstanceAiToolCallState,
): string | undefined {
	if (typeof toolCall.confirmation?.introMessage === 'string') {
		return toolCall.confirmation.introMessage;
	}

	const { introMessage } = parseTemplateChoiceArgs(toolCall);
	if (typeof introMessage === 'string') {
		return introMessage;
	}

	return typeof toolCall.confirmation?.message === 'string'
		? toolCall.confirmation.message
		: undefined;
}
