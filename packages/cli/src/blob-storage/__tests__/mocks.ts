export const body = Buffer.from('payload-bytes', 'utf-8');

/** A provider SDK error as surfaced by the wrapping service (wrapped, original on `cause`). */
const wrapProviderError = (cause: unknown) => new Error('Request to provider failed', { cause });

export const s3NotFoundError = wrapProviderError(
	Object.assign(new Error('missing'), { name: 'NoSuchKey' }),
);

export const s3NoSuchBucketError = wrapProviderError(
	Object.assign(new Error('bucket missing'), {
		name: 'NoSuchBucket',
		$metadata: { httpStatusCode: 404 },
	}),
);

export const s3ThrottledError = wrapProviderError(
	Object.assign(new Error('slow down'), { name: 'ThrottlingException' }),
);

export const azureNotFoundError = wrapProviderError(
	Object.assign(new Error('missing'), { code: 'BlobNotFound' }),
);

export const azureThrottledError = wrapProviderError(
	Object.assign(new Error('slow down'), { code: 'ServerBusy' }),
);
