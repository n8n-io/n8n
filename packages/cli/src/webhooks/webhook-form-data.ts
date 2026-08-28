import formidable from 'formidable';
import type { IncomingMessage } from 'http';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';
import { discardBlankFileInputs } from '@/webhooks/webhook-blank-file-inputs';

// formidable reports the status code it considers appropriate on `httpCode`
// (413 for a file or field exceeding a limit, 400 for a request it cannot
// parse). n8n's error classifier reads `httpStatusCode`, not `httpCode`, so
// without this mapping every parse failure surfaces as a generic 500.
const getFormidableHttpCode = (error: unknown): number | undefined => {
	if (typeof error !== 'object' || error === null || !('httpCode' in error)) return undefined;
	const { httpCode } = error;
	return typeof httpCode === 'number' ? httpCode : undefined;
};

const mapFormParseError = (error: unknown): Error => {
	switch (getFormidableHttpCode(error)) {
		case 413:
			return new ContentTooLargeError('The submitted form data exceeds the allowed size.');
		case 400:
			return BadRequestError.wrap('The submitted form data could not be parsed.', error);
		default:
			return error instanceof Error ? error : new Error(String(error));
	}
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
export const createMultiFormDataParser = (maxFormDataSizeInMb: number) => {
	return async function parseMultipartFormData(req: IncomingMessage): Promise<{
		data: formidable.Fields;
		files: formidable.Files;
	}> {
		const { encoding } = req;

		const form = formidable({
			multiples: true,
			encoding: encoding as formidable.BufferEncoding,
			maxFileSize: maxFormDataSizeInMb * 1024 * 1024,
			// Accept an empty file so that every part is parsed and counted against
			// the limit above, and so that a file the user selected still parses when
			// it holds no bytes. `discardBlankFileInputs` removes the parts that turn
			// out to be file inputs left empty. formidable rejects an empty file by
			// default, and its `minFileSize` default of 1 rejects it again on its own.
			allowEmptyFiles: true,
			minFileSize: 0,
			// TODO: pass a custom `fileWriteStreamHandler` to create binary data files directly
		});

		// `parse` returns a promise when it is called without a callback.
		let parsed: [formidable.Fields, formidable.Files];
		try {
			parsed = await form.parse(req);
		} catch (error) {
			throw mapFormParseError(error);
		}

		const [data, parsedFiles] = parsed;
		const files = await discardBlankFileInputs(parsedFiles);

		normalizeFormData(data);
		normalizeFormData(files);

		return { data, files };
	};
};
