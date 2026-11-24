import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils/string/truncate';

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
 * Cuts each error to a short prefix, so a long error (such as an HTTP response
 * body) cannot push the message over the chat message limit. The caller
 * attaches the failed execution, and the agent reads the full error from it.
 */
const ERROR_PREFIX_LENGTH = 500;

export function buildFixWithAiPrompt(context: {
	workflowName?: string;
	errors: FixWithAiError[];
}): string {
	const i18n = useI18n();
	const errors = context.errors.map(({ nodeName, errorMessage }) => ({
		nodeName,
		errorMessage: truncate(errorMessage, ERROR_PREFIX_LENGTH),
	}));

	if (errors.length === 1) {
		const { nodeName, errorMessage } = errors[0];

		if (context.workflowName) {
			return i18n.baseText('instanceAi.fixWithAi.prompt.singleInWorkflow', {
				interpolate: { nodeName, errorMessage, workflowName: context.workflowName },
			});
		}

		return i18n.baseText('instanceAi.fixWithAi.prompt.single', {
			interpolate: { nodeName, errorMessage },
		});
	}

	const errorList = errors
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
