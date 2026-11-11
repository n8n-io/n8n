import type { Request, Response } from 'express';
import FormData from 'form-data';
import multer from 'multer';
import fs from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

describe('Multer disk upload cleanup', () => {
	let uploadDir: string;

	beforeEach(async () => {
		uploadDir = await mkdtemp(join(tmpdir(), 'n8n-multer-test-'));
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(uploadDir, { recursive: true, force: true });
	});

	const upload = async (storage: multer.StorageEngine, size: number) => {
		const form = new FormData();
		form.append('file', Buffer.alloc(size, 'a'), 'upload.txt');
		const body = form.getBuffer();
		const stream = new PassThrough();
		const req = Object.assign(stream, {
			headers: { ...form.getHeaders(), 'content-length': String(body.length) },
		}) as unknown as Request;
		const handler = multer({ storage, limits: { fileSize: 32 } }).array('file');
		const error = await new Promise<unknown>((resolve) => {
			void handler(req, {} as Response, resolve);
			stream.end(body);
		});
		return { error, req };
	};

	test('keeps a file at the size limit', async () => {
		const storage = multer.diskStorage({ destination: uploadDir });

		const { error, req } = await upload(storage, 32);

		expect(error).toBeUndefined();
		const files = req.files as Express.Multer.File[];
		expect(files).toHaveLength(1);
		expect(await readFile(files[0].path)).toEqual(Buffer.alloc(32, 'a'));
	});

	test.each([false, true])(
		'removes an oversized file when a delayed write error is %s',
		async (failWrite) => {
			const storage = multer.diskStorage({ destination: uploadDir });
			const removeFile = vi.spyOn(storage, '_removeFile');
			let inputClosed = false;
			const handleFile = storage._handleFile.bind(storage);
			vi.spyOn(storage, '_handleFile').mockImplementation((req, file, callback) => {
				file.stream.once('close', () => {
					inputClosed = true;
				});
				handleFile(req, file, callback);
			});

			let bytesWritten = 0;
			let failedAfterInputClosed = false;
			if (failWrite) {
				const createWriteStream = fs.createWriteStream;
				vi.spyOn(fs, 'createWriteStream').mockImplementation((...args) => {
					const stream = createWriteStream(...args);
					// Report the write error after the truncated input stream closes.
					stream._final = (callback) => {
						setImmediate(() => {
							bytesWritten = stream.bytesWritten;
							failedAfterInputClosed = inputClosed;
							callback(Object.assign(new Error('Write failed'), { code: 'ENOSPC' }));
						});
					};
					return stream;
				});
			}

			const { error, req } = await upload(storage, 1024);

			expect(error).toMatchObject({ code: 'LIMIT_FILE_SIZE', storageErrors: [] });
			expect(req.files).toEqual([]);
			if (failWrite) {
				expect(bytesWritten).toBeGreaterThan(0);
				expect(failedAfterInputClosed).toBe(true);
			}
			expect(await readdir(uploadDir)).toEqual([]);
			expect(removeFile).toHaveBeenCalledTimes(1);
		},
	);

	test('skips file removal when storage fails before it assigns a path', async () => {
		const storageError = new Error('Destination unavailable');
		const storage = multer.diskStorage({
			destination: (_req, file, callback) => {
				file.stream.once('close', () => callback(storageError, ''));
				file.stream.resume();
			},
		});
		const removeFile = vi.spyOn(storage, '_removeFile');

		const { error, req } = await upload(storage, 1024);

		expect(error).toMatchObject({ code: 'LIMIT_FILE_SIZE', storageErrors: [] });
		expect(req.files).toEqual([]);
		expect(removeFile).not.toHaveBeenCalled();
		expect(await readdir(uploadDir)).toEqual([]);
	});
});
