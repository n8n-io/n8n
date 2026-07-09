export const body = Buffer.from('payload-bytes', 'utf-8');

/** A provider SDK error as surfaced by the wrapping service (wrapped, original on `cause`). */
export const wrapProviderError = (cause: unknown) =>
	new Error('Request to provider failed', { cause });
