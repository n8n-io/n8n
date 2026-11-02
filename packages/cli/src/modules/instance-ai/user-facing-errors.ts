import { formatAttachmentSizeLimit } from '@n8n/api-types';
import { isQuotaExhaustedError } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { OperationalError, UserError } from 'n8n-workflow';

import { isStreamTransportError } from './stream-transport-error';

function isSandboxEndpointNotAllowedError(error: unknown): boolean {
	return getErrorMessage(error).toLowerCase().includes('endpoint not allowed');
}

export function isStaleResumeError(error: unknown): boolean {
	// Name check instead of instanceof: the class crosses the @n8n/agents package boundary.
	return error instanceof Error && error.name === 'StaleResumeError';
}

/** Signals that the failure is about an attached file rather than the request as a whole. */
const ATTACHMENT_SUBJECT_PATTERN = /image|attachment/;

/** Signals that the attachment was refused for its size/decodability, not merely mentioned. */
const ATTACHMENT_REFUSAL_PATTERN = /exceed|too large|maximum|max allowed|could not process/;

/**
 * Every scrap of message text reachable from an error, following `cause` chains,
 * arrays (an aggregate of stream failures) and the message-bearing fields the AI
 * SDK hangs the provider's response on.
 *
 * Needed because the terminal error is the ai-sdk's `AI_NoOutputGeneratedError`
 * wrapper: the provider's actual refusal is nested underneath it, and a plain
 * `error.message` check sees only "No output generated".
 */
function collectErrorText(value: unknown, depth = 0): string[] {
	if (depth > 4 || value === null || value === undefined) return [];
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap((item) => collectErrorText(item, depth + 1));
	if (value instanceof Error) {
		return [value.message, ...collectErrorText(Reflect.get(value, 'cause'), depth + 1)];
	}
	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return ['message', 'error', 'responseBody', 'data', 'cause', 'errors'].flatMap((key) =>
			collectErrorText(record[key], depth + 1),
		);
	}
	return [];
}

/**
 * True when the provider refused an attached file outright. Both signals must be
 * present: matching on the subject alone would misclassify unrelated failures that
 * happen to mention an image.
 *
 * Matched on the message text because the provider surfaces this as a plain 400
 * with no machine-readable discriminator. `validateAttachmentSizes` rejects the
 * known cases before the request is built, so this is the net for provider-side
 * limits we don't model (pixel dimensions, per-provider ceilings, format quirks) —
 * without it, such a rejection sticks in thread history and fails every later turn.
 */
export function isAttachmentRejectedByProviderError(error: unknown): boolean {
	const haystack = [getErrorMessage(error), ...collectErrorText(error)].join(' ').toLowerCase();
	return ATTACHMENT_SUBJECT_PATTERN.test(haystack) && ATTACHMENT_REFUSAL_PATTERN.test(haystack);
}

/**
 * Shown when the user has exhausted their AI credits/quota. Self-contained so it
 * still reads clearly on older clients that don't render the structured
 * `quota_exhausted` error state; kept in sync with the FE i18n copy.
 */
export const QUOTA_EXHAUSTED_USER_MESSAGE =
	"You've run out of AI credits. Upgrade your plan to continue using the n8n Assistant.";

export const OPERATIONAL_ERROR_USER_MESSAGE =
	'I hit an operational error before I could finish that response. Please try again.';

const GENERIC_ERROR_USER_MESSAGE =
	'Something went wrong before I could finish that response. Please try again.';

/** Structured error code for the UI when a run failed because credits ran out. */
export function getUserFacingErrorCode(error: unknown): 'quota_exhausted' | undefined {
	return isQuotaExhaustedError(error) ? 'quota_exhausted' : undefined;
}

export type TerminalErrorCode = NonNullable<ReturnType<typeof getUserFacingErrorCode>>;

/** `fallback` lets a caller name what specifically failed when the error itself
 *  carries no user-facing meaning. */
export function getUserFacingErrorMessage(
	error: unknown,
	fallback: string = GENERIC_ERROR_USER_MESSAGE,
	opts: {
		/**
		 * Whether the refused attachment was actually removed from thread history.
		 * `false` means the thread still replays it, so the guidance must send the user
		 * to a new conversation rather than promise a clean slate.
		 */
		attachmentRemoved?: boolean;
	} = {},
): string {
	if (isQuotaExhaustedError(error)) {
		return QUOTA_EXHAUSTED_USER_MESSAGE;
	}

	if (isStreamTransportError(error)) {
		return 'The connection to the AI provider dropped before I could finish that response. Please try again.';
	}

	if (error instanceof UserError) {
		return error.message;
	}

	if (isStaleResumeError(error)) {
		return "This approval was already handled. If the assistant isn't responding, send a new message to continue.";
	}

	if (isSandboxEndpointNotAllowedError(error)) {
		return "I couldn't finish preparing the workspace sandbox. Please try again in a moment.";
	}

	// Deliberately no "try again": retrying replays the same attachment. Wording stays
	// generic because PDFs and spreadsheets get refused too, and the size hint is only
	// offered when the error actually says so — the provider's text is usually
	// unavailable here, and guessing "too large" would misdirect the user.
	if (opts.attachmentRemoved !== undefined || isAttachmentRejectedByProviderError(error)) {
		const sizeAdvice = isAttachmentRejectedByProviderError(error)
			? ` Keep it under ${formatAttachmentSizeLimit()}, and for images no more than 8000x8000 pixels.`
			: '';

		return opts.attachmentRemoved === false
			? 'I could not read one of the attached files, and I could not remove it from this ' +
					`conversation either. Start a new chat and attach it again.${sizeAdvice}`
			: 'I could not read one of the attached files, so I left it out. Attach it again — ' +
					`ideally a smaller version.${sizeAdvice}`;
	}

	if (error instanceof OperationalError) {
		return OPERATIONAL_ERROR_USER_MESSAGE;
	}

	return fallback;
}

/**
 * Masked terminal failures whose real cause is unrecoverable from the error
 * object: the ai-sdk's flush wrapper when zero steps were recorded (created
 * without `cause`), and undici's `TypeError: terminated` when the upstream
 * connection is killed mid-stream. When the credit wall hits at the model call
 * instead of the token endpoint, the run dies with one of these rather than a
 * classified quota error — see `reclassifyMaskedStreamFailure`.
 */
export function isMaskedStreamFailure(error: unknown): error is Error {
	if (!(error instanceof Error)) return false;
	if (error.name === 'AI_NoOutputGeneratedError') return true;
	return error.name === 'TypeError' && error.message === 'terminated';
}
