import { IMPORT_PACKAGE_REQUEST_FORM_FIELDS } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import {
	createN8nPackageMulterOptions,
	getPackageUploadFile,
	listUploadFiles,
	resolveImportPackageUpload,
} from '../../utils/import-package-upload';

function makeFile(fieldname: string, buffer: Buffer = Buffer.from('data')): Express.Multer.File {
	return { fieldname, buffer } as Express.Multer.File;
}

describe('createN8nPackageMulterOptions', () => {
	it('uses memory storage and scales fileSize with payloadSizeMax', () => {
		const globalConfig = Container.get(GlobalConfig);
		globalConfig.endpoints.payloadSizeMax = 8;

		const options = createN8nPackageMulterOptions(globalConfig);

		expect(options.storage).toBeInstanceOf(multer.memoryStorage().constructor);
		expect(options.limits).toEqual({
			fileSize: 8 * 1024 * 1024,
			files: 1,
			parts: IMPORT_PACKAGE_REQUEST_FORM_FIELDS.length + 2,
			fieldSize: 64 * 1024,
		});
	});

	it('allows the package file plus every documented form field', () => {
		// busboy emits partsLimit when the part count *reaches* the limit, so the
		// limit must strictly exceed the largest legitimate request.
		const options = createN8nPackageMulterOptions(Container.get(GlobalConfig));
		const maxLegitimateParts = IMPORT_PACKAGE_REQUEST_FORM_FIELDS.length + 1;

		expect(options.limits?.parts).toBeGreaterThan(maxLegitimateParts);
	});
});

describe('listUploadFiles', () => {
	it('returns an empty array when files are absent', () => {
		expect(listUploadFiles({})).toEqual([]);
	});

	it('returns array uploads as-is', () => {
		const files = [makeFile('package'), makeFile('other')];
		expect(listUploadFiles({ files })).toBe(files);
	});

	it('flattens record-shaped uploads from multer.fields-style parsing', () => {
		const packageFile = makeFile('package');
		const otherFile = makeFile('other');
		expect(
			listUploadFiles({
				files: { package: [packageFile], other: [otherFile] },
			}),
		).toEqual([packageFile, otherFile]);
	});
});

describe('getPackageUploadFile', () => {
	const packageBuffer = Buffer.from('tar-bytes');

	it('finds package in array-shaped files', () => {
		const packageFile = makeFile('package', packageBuffer);
		expect(getPackageUploadFile({ files: [makeFile('other'), packageFile] })).toBe(packageFile);
	});

	it('finds package in record-shaped files', () => {
		const packageFile = makeFile('package', packageBuffer);
		expect(getPackageUploadFile({ files: { package: [packageFile] } })).toBe(packageFile);
	});

	it('uses the first entry when package is an array', () => {
		const first = makeFile('package', packageBuffer);
		const second = makeFile('package', Buffer.from('other'));
		expect(getPackageUploadFile({ files: { package: [first, second] } })).toBe(first);
	});

	it('returns undefined when package part is missing', () => {
		expect(getPackageUploadFile({ files: [makeFile('other')] })).toBeUndefined();
	});
});

describe('resolveImportPackageUpload', () => {
	const packageBuffer = Buffer.from('tar-bytes');

	it('returns the package file part', () => {
		const file = resolveImportPackageUpload({
			files: [makeFile('package', packageBuffer)],
			body: { projectId: 'proj-1', package: '' },
		});

		expect(file.buffer).toBe(packageBuffer);
	});

	it('accepts routing, credential binding, and workflow policy fields in the body', () => {
		expect(() =>
			resolveImportPackageUpload({
				files: [makeFile('package', packageBuffer)],
				body: {
					folderId: 'fld-1',
					bindings: '{"credentials":{"source":"target"}}',
					workflowConflictPolicy: 'skip',
					package: '',
				},
			}),
		).not.toThrow();
	});

	it('rejects missing package', () => {
		expect(() => resolveImportPackageUpload({ body: {} })).toThrow(BadRequestError);
		expect(() => resolveImportPackageUpload({ body: {} })).toThrow(
			'Multipart field "package" is required',
		);
	});

	it('rejects package part with an empty buffer', () => {
		expect(() =>
			resolveImportPackageUpload({
				files: [makeFile('package', Buffer.alloc(0))],
			}),
		).toThrow('Multipart field "package" is required');
	});

	it('rejects unexpected file fields', () => {
		expect(() =>
			resolveImportPackageUpload({
				files: [makeFile('package', packageBuffer), makeFile('extra')],
			}),
		).toThrow('Unexpected file upload field; only "package" is allowed');
	});

	it('rejects unexpected form fields', () => {
		expect(() =>
			resolveImportPackageUpload({
				files: [makeFile('package', packageBuffer)],
				body: { evil: 'true' },
			}),
		).toThrow('Unexpected form field "evil"');
	});
});
