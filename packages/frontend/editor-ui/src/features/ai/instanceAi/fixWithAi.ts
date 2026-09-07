import { useI18n } from '@n8n/i18n';

export interface FixWithAiError {
	nodeName: string;
	errorMessage: string;
}

export function isFixWithAiError(value: unknown): value is FixWithAiError {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { nodeName?: unknown }).nodeName === 'string' &&
		typeof (value as { errorMessage?: unknown }).errorMessage === 'string'
	);
}

export function buildFixWithAiPrompt(context: {
	workflowName?: string;
	errors: FixWithAiError[];
}): string {
	const i18n = useI18n();

	if (context.errors.length === 1) {
		const { nodeName, errorMessage } = context.errors[0];

		if (context.workflowName) {
			return i18n.baseText('instanceAi.fixWithAi.prompt.singleInWorkflow', {
				interpolate: { nodeName, errorMessage, workflowName: context.workflowName },
			});
		}

		return i18n.baseText('instanceAi.fixWithAi.prompt.single', {
			interpolate: { nodeName, errorMessage },
		});
	}

	const errorList = context.errors
		.map(({ nodeName, errorMessage }) =>
			i18n.baseText('instanceAi.fixWithAi.prompt.errorLine', {
				interpolate: { nodeName, errorMessage },
			}),
		)
		.join('\n');

	if (context.workflowName) {
		return i18n.baseText('instanceAi.fixWithAi.prompt.multipleInWorkflow', {
			interpolate: { errorList, workflowName: context.workflowName },
		});
	}

	return i18n.baseText('instanceAi.fixWithAi.prompt.multiple', {
		interpolate: { errorList },
	});
}
