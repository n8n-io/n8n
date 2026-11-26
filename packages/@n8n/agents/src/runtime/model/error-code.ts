import { errorChain } from '@n8n/utils/errors/error-chain';
import { isRecord } from '@n8n/utils/is-record';

/**
 * Whether an error, one of its causes, or the provider payload attached to it
 * (`data` or `error`, optionally with a nested `error`) carries the given code.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
	return errorChain(error)
		.flatMap((entry) => [entry, entry.data, entry.error])
		.flatMap((detail) =>
			isRecord(detail) && isRecord(detail.error) ? [detail, detail.error] : [detail],
		)
		.some((detail) => isRecord(detail) && detail.code === code);
}
