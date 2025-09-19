import express from 'express';
import nock from 'nock';
import type { Server, IncomingMessage } from 'node:http';
import { createServer } from 'node:http';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';

import { rawBodyReader } from '@/middlewares';

import { createMultiFormDataParser } from '../webhook-form-data';

// Formidable requires FS to store the uploaded files
jest.unmock('node:fs');

/** Test server for testing the form data parsing */
class TestServer {
	agent: TestAgent;

	private app: express.Application;

	private server: Server;

	private testFn: (req: IncomingMessage) => Promise<void> = async () => {};

	private hasBeenCalled = false;

	constructor() {
		this.app = express();
		// rawBodyReader is required to parse the encoding of the incoming request
		this.app.use(rawBodyReader, async (req, res) => {
			try {
				this.hasBeenCalled = true;

				await this.testFn(req);
			} finally {
				res.end('done');
			}
		});

		this.server = createServer(this.app);
		this.agent = request.agent(this.app);
	}

	assertHasBeenCalled() {
		expect(this.hasBeenCalled).toBeTruthy();
	}

	reset() {
		this.testFn = async () => {};
		this.hasBeenCalled = false;
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

		it('should ignore file that is too large', async () => {
			const oneByteInMb = 1 / 1024 / 1024;
			const parseFn = createMultiFormDataParser(oneByteInMb);

			await testServer
				.sendRequestToHandler(async (req) => {
					const parsedData = await parseFn(req);

					expect(parsedData).toStrictEqual({
						data: {},
						files: {},
					});
				})
				.attach('file', oneKbData, 'file.txt');

			testServer.assertHasBeenCalled();
		});
	});
});
