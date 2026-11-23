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

/**
 * Names the failed nodes only. The caller attaches the failed execution, and the
 * agent reads the errors from it, so a long error cannot push the message over
 * the chat message limit.
 */
export function buildFixWithAiPrompt(context: {
	workflowName?: string;
	errors: Array<Pick<FixWithAiError, 'nodeName'>>;
}): string {
	const i18n = useI18n();

	if (context.errors.length === 1) {
		const { nodeName } = context.errors[0];

		if (context.workflowName) {
			return i18n.baseText('instanceAi.fixWithAi.prompt.singleInWorkflow', {
				interpolate: { nodeName, workflowName: context.workflowName },
			});
		}

		return i18n.baseText('instanceAi.fixWithAi.prompt.single', {
			interpolate: { nodeName },
		});
	}

	const errorList = context.errors
		.map(({ nodeName }) =>
			i18n.baseText('instanceAi.fixWithAi.prompt.errorLine', {
				interpolate: { nodeName },
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
