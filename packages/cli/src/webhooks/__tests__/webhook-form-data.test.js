'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const express_1 = __importDefault(require('express'));
const nock_1 = __importDefault(require('nock'));
const node_http_1 = require('node:http');
const supertest_1 = __importDefault(require('supertest'));
const middlewares_1 = require('@/middlewares');
const webhook_form_data_1 = require('../webhook-form-data');
jest.unmock('node:fs');
class TestServer {
	constructor() {
		this.testFn = async () => {};
		this.hasBeenCalled = false;
		this.app = (0, express_1.default)();
		this.app.use(middlewares_1.rawBodyReader, async (req, res) => {
			try {
				this.hasBeenCalled = true;
				await this.testFn(req);
			} finally {
				res.end('done');
			}
		});
		this.server = (0, node_http_1.createServer)(this.app);
		this.agent = supertest_1.default.agent(this.app);
	}
	assertHasBeenCalled() {
		expect(this.hasBeenCalled).toBeTruthy();
	}
	reset() {
		this.testFn = async () => {};
		this.hasBeenCalled = false;
	}
	sendRequestToHandler(handlerFn) {
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
			nock_1.default.enableNetConnect('127.0.0.1');
			testServer.start();
		});
		afterEach(() => {
			testServer.reset();
		});
		afterAll(async () => {
			await testServer.stop();
		});
		it('should parse fields from the multipart form data', async () => {
			const parseFn = (0, webhook_form_data_1.createMultiFormDataParser)(1);
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
			const parseFn = (0, webhook_form_data_1.createMultiFormDataParser)(1);
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
			const parseFn = (0, webhook_form_data_1.createMultiFormDataParser)(1);
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
			const parseFn = (0, webhook_form_data_1.createMultiFormDataParser)(oneByteInMb);
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
//# sourceMappingURL=webhook-form-data.test.js.map
