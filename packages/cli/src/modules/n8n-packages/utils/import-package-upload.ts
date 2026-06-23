import type { GlobalConfig } from '@n8n/config';
import multer from 'multer';

import { IMPORT_PACKAGE_REQUEST_FORM_FIELDS } from '@n8n/api-types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Allowed keys on `req.body` after multipart parsing. Includes `package` because
 * express-openapi-validator inserts an empty-string placeholder for file parts.
 */
const IMPORT_PACKAGE_BODY_FIELD_SET = new Set<string>([
	...IMPORT_PACKAGE_REQUEST_FORM_FIELDS,
	'package',
]);

/** Max length for multipart text fields, including JSON credential bindings. */
const IMPORT_PACKAGE_FIELD_SIZE_BYTES = 64 * 1024;

/**
 * `package` file + every documented form field, plus one because busboy rejects
 * the request when the part count reaches (not exceeds) the limit.
 */
const IMPORT_PACKAGE_MAX_PARTS = IMPORT_PACKAGE_REQUEST_FORM_FIELDS.length + 2;

export function createN8nPackageMulterOptions(globalConfig: GlobalConfig): multer.Options {
	const maxFileSizeBytes = globalConfig.endpoints.payloadSizeMax * 1024 * 1024;
	return {
		storage: multer.memoryStorage(),
		limits: {
			fileSize: maxFileSizeBytes,
			files: 1,
			parts: IMPORT_PACKAGE_MAX_PARTS,
			fieldSize: IMPORT_PACKAGE_FIELD_SIZE_BYTES,
		},
	};
}

export function listUploadFiles(req: {
	files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
}): Express.Multer.File[] {
	if (!req.files) return [];
	if (Array.isArray(req.files)) return req.files;
	return Object.values(req.files).flat();
}

export function getPackageUploadFile(req: {
	files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
}): Express.Multer.File | undefined {
	const files = listUploadFiles(req);
	return files.find((file) => file.fieldname === 'package');
}

export function resolveImportPackageUpload(req: {
	files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
	body?: Record<string, unknown>;
}): Express.Multer.File {
	const packageFile = getPackageUploadFile(req);
	if (!packageFile?.buffer?.length) {
		throw new BadRequestError('Multipart field "package" is required');
	}

	for (const file of listUploadFiles(req)) {
		if (file.fieldname !== 'package') {
			throw new BadRequestError('Unexpected file upload field; only "package" is allowed');
		}
	}

	for (const key of Object.keys(req.body ?? {})) {
		if (!IMPORT_PACKAGE_BODY_FIELD_SET.has(key)) {
			throw new BadRequestError(`Unexpected form field "${key}"`);
		}
	}

	return packageFile;
}
