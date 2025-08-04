'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const n8n_workflow_1 = require('n8n-workflow');
const nock_1 = __importDefault(require('nock'));
const npm_utils_1 = require('../npm-utils');
describe('verifyIntegrity', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';
	const integrity = 'sha512-hash==';
	afterEach(() => {
		nock_1.default.cleanAll();
	});
	it('should verify integrity successfully', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { integrity },
			});
		await expect(
			(0, npm_utils_1.verifyIntegrity)(packageName, version, registryUrl, integrity),
		).resolves.not.toThrow();
	});
	it('should throw error if checksum does not match', async () => {
		const wrongHash = 'sha512-nottherighthash==';
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				dist: { integrity },
			});
		await expect(
			(0, npm_utils_1.verifyIntegrity)(packageName, version, registryUrl, wrongHash),
		).rejects.toThrow(n8n_workflow_1.UnexpectedError);
	});
	it('should throw error if metadata request fails', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);
		await expect(
			(0, npm_utils_1.verifyIntegrity)(packageName, version, registryUrl, integrity),
		).rejects.toThrow();
	});
	it('should throw UnexpectedError and preserve original error as cause', async () => {
		const integrity = 'sha512-somerandomhash==';
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');
		try {
			await (0, npm_utils_1.verifyIntegrity)(packageName, version, registryUrl, integrity);
			throw new Error('Expected error was not thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(n8n_workflow_1.UnexpectedError);
			expect(error.message).toBe('Checksum verification failed');
			expect(error.cause).toBeDefined();
			expect(error.cause.message).toContain('Network failure');
		}
	});
});
describe('isVersionExists', () => {
	const registryUrl = 'https://registry.npmjs.org';
	const packageName = 'test-package';
	const version = '1.0.0';
	afterEach(() => {
		nock_1.default.cleanAll();
	});
	it('should return true when package version exists', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(200, {
				name: packageName,
				version,
			});
		const result = await (0, npm_utils_1.isVersionExists)(packageName, version, registryUrl);
		expect(result).toBe(true);
	});
	it('should throw UnexpectedError when package version does not exist (404)', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);
		await expect(
			(0, npm_utils_1.isVersionExists)(packageName, version, registryUrl),
		).rejects.toThrow(n8n_workflow_1.UnexpectedError);
	});
	it('should throw UnexpectedError with proper message on 404', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(404);
		try {
			await (0, npm_utils_1.isVersionExists)(packageName, version, registryUrl);
			throw new Error('Expected error was not thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(n8n_workflow_1.UnexpectedError);
			expect(error.message).toBe('Package version does not exist');
			expect(error.cause).toBeDefined();
		}
	});
	it('should throw UnexpectedError for network failures', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.replyWithError('Network failure');
		try {
			await (0, npm_utils_1.isVersionExists)(packageName, version, registryUrl);
			throw new Error('Expected error was not thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(n8n_workflow_1.UnexpectedError);
			expect(error.message).toBe('Failed to check package version existence');
			expect(error.cause).toBeDefined();
			expect(error.cause.message).toContain('Network failure');
		}
	});
	it('should throw UnexpectedError for server errors (500)', async () => {
		(0, nock_1.default)(registryUrl)
			.get(`/${encodeURIComponent(packageName)}/${version}`)
			.reply(500);
		await expect(
			(0, npm_utils_1.isVersionExists)(packageName, version, registryUrl),
		).rejects.toThrow(n8n_workflow_1.UnexpectedError);
	});
});
//# sourceMappingURL=npm-utils.test.js.map
