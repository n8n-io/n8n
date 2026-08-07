import formidable from 'formidable';
import type { IncomingMessage } from 'http';

import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';

// formidable flags "payload too large" conditions (a file too big, the total
// upload too big, too many files/fields) with `httpCode: 413`. n8n's error
// classifier reads `httpStatusCode`, not formidable's `httpCode`, so without
// this mapping these surface as a generic 500 instead of a 413.
const isPayloadTooLargeError = (error: unknown): boolean =>
	typeof error === 'object' && error !== null && 'httpCode' in error && error.httpCode === 413;

const mapFormParseError = (error: unknown): Error => {
	if (isPayloadTooLargeError(error)) {
		return new ContentTooLargeError('The submitted form data exceeds the allowed size.');
	}
	return error instanceof Error ? error : new Error(String(error));
};

const normalizeFormData = <T>(values: Record<string, T | T[]>) => {
	for (const key in values) {
		const value = values[key];
		if (Array.isArray(value) && value.length === 1) {
			values[key] = value[0];
		}
	}
};

/**
 * Creates a function that parses the multipart form data into the request's `body` property
 */
export const createMultiFormDataParser = (maxFormDataSizeInMb: number, maxFiles: number) => {
	return async function parseMultipartFormData(req: IncomingMessage): Promise<{
		data: formidable.Fields;
		files: formidable.Files;
	}> {
		const { encoding } = req;

		const maxFileSize = maxFormDataSizeInMb * 1024 * 1024;

		const form = formidable({
			multiples: true,
			encoding: encoding as formidable.BufferEncoding,
			maxFileSize,
			// formidable defaults `maxFiles` to Infinity and only enforces a count
			// when it is finite, so set an explicit cap. Without it, a request with a
			// very large number of parts opens a temp file per part before any size
			// check runs.
			maxFiles,
			// formidable defaults `maxTotalFileSize` to `maxFileSize`; set it explicitly
			// so the aggregate budget across all parts is clear at the call site.
			maxTotalFileSize: maxFileSize,
			// TODO: pass a custom `fileWriteStreamHandler` to create binary data files directly
		});

		return await new Promise((resolve, reject) => {
			form.parse(req, (error, data, files) => {
				if (error) {
					reject(mapFormParseError(error));
					return;
				}
				normalizeFormData(data);
				normalizeFormData(files);
				resolve({ data, files });
			});
		});
	};
};
