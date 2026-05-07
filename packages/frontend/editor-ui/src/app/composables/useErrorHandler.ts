import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { captureException } from '@sentry/vue';
import type { BaseTextKey } from '@n8n/i18n';

export interface ErrorHandlerOptions {
	/** Source identifier for Sentry tags (e.g., 'ai-builder', 'workflow-editor') */
	source: string;
	/** i18n key for the error toast title */
	titleKey?: BaseTextKey;
}

export interface HandleErrorOptions {
	/** Additional context for the error (used in console log and Sentry tags) */
	context?: string;
	/** Override the default toast title */
	title?: string;
	/** Override the default toast message (defaults to error.message) */
	message?: string;
}

/**
 * Composable for unified error handling.
 * Shows error toast, logs to console, and captures exception to Sentry.
 */
export function useErrorHandler(options: ErrorHandlerOptions) {
	const toast = useToast();
	const i18n = useI18n();

	/**
	 * Handle an error by showing a toast, logging to console, and capturing to Sentry.
	 */
	function handleError(error: unknown, errorOptions?: HandleErrorOptions): void {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const context = errorOptions?.context;

		console.error(`[${options.source}${context ? ` - ${context}` : ''}]`, error);

		captureException(error, {
			tags: {
				source: options.source,
				context,
			},
		});

		const title =
			errorOptions?.title ?? (options.titleKey ? i18n.baseText(options.titleKey) : 'Error');

		toast.showMessage({
			type: 'error',
			title,
			message: errorOptions?.message ?? errorMessage,
		});
	}

	return { handleError };
}
