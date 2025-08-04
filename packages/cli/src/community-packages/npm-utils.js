'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.verifyIntegrity = verifyIntegrity;
exports.isVersionExists = isVersionExists;
const axios_1 = __importDefault(require('axios'));
const n8n_workflow_1 = require('n8n-workflow');
const REQUEST_TIMEOUT = 30000;
async function verifyIntegrity(packageName, version, registryUrl, expectedIntegrity) {
	const timeoutOption = { timeout: REQUEST_TIMEOUT };
	try {
		const url = `${registryUrl.replace(/\/+$/, '')}/${encodeURIComponent(packageName)}`;
		const metadata = await axios_1.default.get(`${url}/${version}`, timeoutOption);
		if (metadata?.data?.dist?.integrity !== expectedIntegrity) {
			throw new n8n_workflow_1.UnexpectedError(
				'Checksum verification failed. Package integrity does not match.',
			);
		}
	} catch (error) {
		throw new n8n_workflow_1.UnexpectedError('Checksum verification failed', { cause: error });
	}
}
async function isVersionExists(packageName, version, registryUrl) {
	const timeoutOption = { timeout: REQUEST_TIMEOUT };
	try {
		const url = `${registryUrl.replace(/\/+$/, '')}/${encodeURIComponent(packageName)}`;
		await axios_1.default.get(`${url}/${version}`, timeoutOption);
		return true;
	} catch (error) {
		if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
			throw new n8n_workflow_1.UnexpectedError('Package version does not exist', {
				cause: error,
			});
		}
		throw new n8n_workflow_1.UnexpectedError('Failed to check package version existence', {
			cause: error,
		});
	}
}
//# sourceMappingURL=npm-utils.js.map
