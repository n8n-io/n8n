import formidable from 'formidable';
import type { IncomingMessage } from 'http';
import { rm } from 'node:fs/promises';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';

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

// A browser submits a file input the user left empty as a 0-byte part that
// declares `filename=""`. A part that omits the filename attribute altogether
// is a different case: formidable reports `null` rather than an empty string,
// and non-browser clients upload real content that way.
const isBlankFileInput = (file: formidable.File): boolean =>
	file.originalFilename === '' && file.size === 0;

/**
 * Removes the file inputs the user left empty, so the request produces no
 * binary for those fields. formidable applies its size limits while it writes
 * each part, so the parser discards these afterwards rather than skipping them
 * with formidable's `filter` option, which would exempt the part from those
 * limits.
 */
const discardBlankFileInputs = async (files: Record<string, formidable.File[] | undefined>) => {
	const discarded: formidable.File[] = [];

	for (const key in files) {
		const entries = files[key];
		if (!entries) continue;

		const kept = entries.filter((file) => !isBlankFileInput(file));
		if (kept.length === entries.length) continue;

		discarded.push(...entries.filter(isBlankFileInput));
		if (kept.length === 0) {
			delete files[key];
		} else {
			files[key] = kept;
		}
	}

	// A discarded part still reached disk as an empty temp file.
	await Promise.all(discarded.map(async (file) => await rm(file.filepath, { force: true })));
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
			// A file is a valid upload even when it holds no bytes.
			// formidable rejects 0-byte files by default, and its
			// `minFileSize` default of 1 rejects them again on its own.
			allowEmptyFiles: true,
			minFileSize: 0,
			// TODO: pass a custom `fileWriteStreamHandler` to create binary data files directly
		});

		return await new Promise((resolve, reject) => {
			form.parse(req, (error, data, files) => {
				if (error) {
					reject(mapFormParseError(error));
					return;
				}
				discardBlankFileInputs(files)
					.then(() => {
						normalizeFormData(data);
						normalizeFormData(files);
						resolve({ data, files });
					})
					.catch(reject);
			});
		});
	};
};
