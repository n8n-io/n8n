import formidable from 'formidable';
import type { IncomingMessage } from 'http';

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

		const formEncoding = (
			encoding && Buffer.isEncoding(encoding)
				? encoding
				: encoding === 'iso-8859-1'
					? 'latin1'
					: 'utf-8'
		) as formidable.BufferEncoding;

		const form = formidable({
			multiples: true,
			encoding: formEncoding,
			maxFileSize: maxFormDataSizeInMb * 1024 * 1024,
			// TODO: pass a custom `fileWriteStreamHandler` to create binary data files directly
		});

		return await new Promise((resolve) => {
			form.parse(req, async (_err, data, files) => {
				normalizeFormData(data);
				normalizeFormData(files);
				resolve({ data, files });
			});
		});
	};
};
