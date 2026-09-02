import express from 'express';
import nock from 'nock';
import type { Server, IncomingMessage } from 'node:http';
import { createServer } from 'node:http';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';
import { rawBodyReader } from '@/middlewares';

import { createMultiFormDataParser } from '../webhook-form-data';

// Formidable requires FS to store the uploaded files
vi.unmock('node:fs');

/** Test server for testing the form data parsing */
class TestServer {
	agent: TestAgent;

	private app: express.Application;

	private server: Server;

	private testFn: (req: IncomingMessage) => Promise<void> = async () => {};

	private hasBeenCalled = false;

	private failure?: Error;

	constructor() {
		this.app = express();
		// rawBodyReader is required to parse the encoding of the incoming request
		this.app.use(rawBodyReader, async (req, res) => {
			try {
				this.hasBeenCalled = true;

				await this.testFn(req);
			} catch (error) {
				// Express does not forward a rejected async handler, so keep the
				// failure and rethrow it from `assertHasBeenCalled`.
				this.failure = error instanceof Error ? error : new Error(String(error));
			} finally {
				res.end('done');
			}
		});

		this.server = createServer(this.app);
		this.agent = request.agent(this.app);
	}

	assertHasBeenCalled() {
		if (this.failure) throw this.failure;
		expect(this.hasBeenCalled).toBeTruthy();
	}

	reset() {
		this.testFn = async () => {};
		this.hasBeenCalled = false;
		this.failure = undefined;
	}

	sendRequestToHandler(handlerFn: (req: IncomingMessage) => Promise<void>) {
		this.testFn = handlerFn;

		return this.agent.post('/');
	}

	start() {
		this.server.listen(0);
	}

	async stop() {
		await new Promise((resolve) => this.server.close(resolve));
	}
}

describe('webhook-form-data', () => {
	describe('createMultiFormDataParser', () => {
		const oneKbData = Buffer.from('1'.repeat(1024));
		const testServer = new TestServer();

		beforeAll(() => {
			nock.enableNetConnect('127.0.0.1');

			testServer.start();
		});

		afterEach(() => {
			testServer.reset();
		});

		afterAll(async () => {
			await testServer.stop();
		});

		it('should parse fields from the multipart form data', async () => {
			const parseFn = createMultiFormDataParser(1);

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {
							foo: 'bar',
						},
						files: {},
					});
				})
				.field('foo', 'bar')
				.expect(200);

			testServer.assertHasBeenCalled();
		});

		it('should parse text/plain file from the multipart form data', async () => {
			const parseFn = createMultiFormDataParser(1);

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {
							filename: 'file.txt',
						},
						files: {
							file: expect.objectContaining({
								originalFilename: 'file.txt',
								size: oneKbData.length,
								mimetype: 'text/plain',
							}),
						},
					});
				})
				.attach('file', oneKbData, 'file.txt')
				.field('filename', 'file.txt');

			testServer.assertHasBeenCalled();
		});

		it('should parse multiple files and fields from the multipart form data', async () => {
			const parseFn = createMultiFormDataParser(1);

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {
							file1: 'file.txt',
							file2: 'file.bin',
						},
						files: {
							txt_file: expect.objectContaining({
								originalFilename: 'file.txt',
								size: oneKbData.length,
								mimetype: 'text/plain',
							}),
							bin_file: expect.objectContaining({
								originalFilename: 'file.bin',
								size: oneKbData.length,
								mimetype: 'application/octet-stream',
							}),
						},
					});
				})
				.attach('txt_file', oneKbData, 'file.txt')
				.attach('bin_file', oneKbData, 'file.bin')
				.field('file1', 'file.txt')
				.field('file2', 'file.bin');

			testServer.assertHasBeenCalled();
		});

		it('should reject with a 413 error when a single file exceeds the limit', async () => {
			const oneByteInMb = 1 / 1024 / 1024;
			const parseFn = createMultiFormDataParser(oneByteInMb);

			await testServer
				.sendRequestToHandler(async (req) => {
					const rejection = parseFn(req);
					await expect(rejection).rejects.toBeInstanceOf(ContentTooLargeError);
					await expect(rejection).rejects.toMatchObject({ httpStatusCode: 413 });
				})
				.attach('file', oneKbData, 'file.txt');

			testServer.assertHasBeenCalled();
		});

		it('should reject with a 413 error when the total upload size exceeds the limit', async () => {
			const twoKbData = Buffer.alloc(2 * 1024, 'x');
			const oneKbInMb = 1 / 1024;
			const parseFn = createMultiFormDataParser(oneKbInMb);

			await testServer
				.sendRequestToHandler(async (req) => {
					const rejection = parseFn(req);
					await expect(rejection).rejects.toBeInstanceOf(ContentTooLargeError);
					await expect(rejection).rejects.toMatchObject({ httpStatusCode: 413 });
				})
				.attach('file', twoKbData, 'large-upload.bin');

			testServer.assertHasBeenCalled();
		});

		it('should skip a file input the user left empty', async () => {
			const parseFn = createMultiFormDataParser(1);
			// A browser sends an unselected file input as a 0-byte part with an
			// empty filename. supertest cannot express that, so build the body by hand.
			const boundary = 'emptyFileBoundary';
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="comment"',
				'',
				'no file attached',
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename=""',
				'Content-Type: application/octet-stream',
				'',
				'',
				`--${boundary}--`,
				'',
			].join('\r\n');

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {
							comment: 'no file attached',
						},
						files: {},
					});
				})
				.set('Content-Type', `multipart/form-data; boundary=${boundary}`)
				.send(body)
				.expect(200);

			testServer.assertHasBeenCalled();
		});

		it('should keep the filled entries when one field repeats with a blank input', async () => {
			const parseFn = createMultiFormDataParser(1);
			const boundary = 'repeatedFieldBoundary';
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="attachments"; filename="file.txt"',
				'Content-Type: text/plain',
				'',
				'hello',
				`--${boundary}`,
				'Content-Disposition: form-data; name="attachments"; filename=""',
				'Content-Type: application/octet-stream',
				'',
				'',
				`--${boundary}--`,
				'',
			].join('\r\n');

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					// One entry remains, so `normalizeFormData` unwraps the array.
					expect(parsedData).toStrictEqual({
						data: {},
						files: {
							attachments: expect.objectContaining({
								originalFilename: 'file.txt',
								size: 'hello'.length,
							}),
						},
					});
				})
				.set('Content-Type', `multipart/form-data; boundary=${boundary}`)
				.send(body)
				.expect(200);

			testServer.assertHasBeenCalled();
		});

		it('should count an empty-filename part against the size limit', async () => {
			const oneKbInMb = 1 / 1024;
			const parseFn = createMultiFormDataParser(oneKbInMb);
			const boundary = 'oversizedEmptyNameBoundary';
			// The part declares no filename, so it is a candidate for removal, but
			// its content must still meet the limit. Removal happens after
			// formidable has accounted for the bytes, never instead of it.
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="oversized"; filename=""',
				'Content-Type: application/octet-stream',
				'',
				'x'.repeat(64 * 1024),
				`--${boundary}--`,
				'',
			].join('\r\n');

			await testServer
				.sendRequestToHandler(async (req) => {
					const rejection = parseFn(req);
					await expect(rejection).rejects.toBeInstanceOf(ContentTooLargeError);
					await expect(rejection).rejects.toMatchObject({ httpStatusCode: 413 });
				})
				.set('Content-Type', `multipart/form-data; boundary=${boundary}`)
				.send(body);

			testServer.assertHasBeenCalled();
		});

		it('should keep a file part that omits the filename', async () => {
			const parseFn = createMultiFormDataParser(1);

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {},
						files: {
							file: expect.objectContaining({
								originalFilename: null,
								size: oneKbData.length,
								mimetype: 'application/octet-stream',
							}),
						},
					});
				})
				// supertest omits the filename attribute when `attach` gets no
				// filename, which is how non-browser clients upload content too.
				.attach('file', oneKbData)
				.expect(200);

			testServer.assertHasBeenCalled();
		});

		it('should keep only the file inputs the user filled in', async () => {
			const parseFn = createMultiFormDataParser(1);
			const boundary = 'mixedFileBoundary';
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="empty_input"; filename=""',
				'Content-Type: application/octet-stream',
				'',
				'',
				`--${boundary}`,
				'Content-Disposition: form-data; name="filled_input"; filename="file.txt"',
				'Content-Type: text/plain',
				'',
				'hello',
				`--${boundary}--`,
				'',
			].join('\r\n');

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {},
						files: {
							filled_input: expect.objectContaining({
								originalFilename: 'file.txt',
								size: 'hello'.length,
								mimetype: 'text/plain',
							}),
						},
					});
				})
				.set('Content-Type', `multipart/form-data; boundary=${boundary}`)
				.send(body)
				.expect(200);

			testServer.assertHasBeenCalled();
		});

		it('should parse a selected file that holds no bytes', async () => {
			const parseFn = createMultiFormDataParser(1);

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {},
						files: {
							file: expect.objectContaining({
								originalFilename: 'empty.txt',
								size: 0,
							}),
						},
					});
				})
				.attach('file', Buffer.alloc(0), 'empty.txt')
				.expect(200);

			testServer.assertHasBeenCalled();
		});

		it('should reject with a 400 error when the multipart body is malformed', async () => {
			const parseFn = createMultiFormDataParser(1);
			const boundary = 'malformedBoundary';
			// The body ends before the closing boundary, so the parser cannot finish.
			const body = [`--${boundary}`, 'Content-Disposition: form-data; name="foo"', '', 'bar'].join(
				'\r\n',
			);

			await testServer
				.sendRequestToHandler(async (req) => {
					const rejection = parseFn(req);
					await expect(rejection).rejects.toBeInstanceOf(BadRequestError);
					await expect(rejection).rejects.toMatchObject({ httpStatusCode: 400 });
				})
				.set('Content-Type', `multipart/form-data; boundary=${boundary}`)
				.send(body);

			testServer.assertHasBeenCalled();
		});

		it('should reject with the original error when formidable reports another status', async () => {
			const parseFn = createMultiFormDataParser(1);
			const boundary = 'unknownEncodingBoundary';
			// formidable answers an unsupported transfer-encoding with a 501, which
			// is neither a 400 nor a 413 and must not be relabelled as one.
			const body = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="file.txt"',
				'Content-Type: text/plain',
				'Content-Transfer-Encoding: uuencode',
				'',
				'hello',
				`--${boundary}--`,
				'',
			].join('\r\n');

			await testServer
				.sendRequestToHandler(async (req) => {
					const rejection = parseFn(req);
					await expect(rejection).rejects.toThrow('unknown transfer-encoding');
					// The 501 proves the parse reached neither mapped status.
					await expect(rejection).rejects.toMatchObject({ httpCode: 501 });
					await expect(rejection).rejects.not.toBeInstanceOf(BadRequestError);
					await expect(rejection).rejects.not.toBeInstanceOf(ContentTooLargeError);
				})
				.set('Content-Type', `multipart/form-data; boundary=${boundary}`)
				.send(body);

			testServer.assertHasBeenCalled();
		});
	});
});
