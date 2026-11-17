import { mock } from 'vitest-mock-extended';

import type { BinaryDataConfig } from 'n8n-core';

import { CompiledEngineProcesses, wfrtUserAgent } from '../compiled-engine-processes';

type BinaryEnv = {
	binaryData(pathVariable: string): Record<string, string>;
	hostEnvAccess(): Record<string, string>;
};

function processesWith(config: Partial<BinaryDataConfig>) {
	const binaryDataConfig = mock<BinaryDataConfig>(config);
	const processes = new CompiledEngineProcesses(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		binaryDataConfig,
	);
	return processes as unknown as BinaryEnv;
}

describe('CompiledEngineProcesses', () => {
	it('gives the host and wfrt the binary data path of the instance in filesystem mode', () => {
		const processes = processesWith({ mode: 'filesystem', localStoragePath: '/data/storage' });
		expect(processes.binaryData('N8N_BINARY_DATA_STORAGE_PATH')).toEqual({
			N8N_DEFAULT_BINARY_DATA_MODE: 'filesystem',
			N8N_BINARY_DATA_STORAGE_PATH: '/data/storage',
		});
	});

	it('gives only the mode in other modes', () => {
		const processes = processesWith({ mode: 's3', localStoragePath: '/data/storage' });
		expect(processes.binaryData('WFRT_BINARY_DATA_STORAGE_PATH')).toEqual({
			N8N_DEFAULT_BINARY_DATA_MODE: 's3',
		});
	});

	it('says that wfrt stores responses only in filesystem mode', () => {
		const stores = (mode: BinaryDataConfig['mode']) =>
			(processesWith({ mode }) as unknown as CompiledEngineProcesses).storesResponses;
		expect(stores('filesystem')).toBe(true);
		expect(stores('default')).toBe(false);
		expect(stores('s3')).toBe(false);
		expect(stores('database')).toBe(false);
	});

	it('blocks $env in the host unless n8n allows env access in nodes', () => {
		const processes = processesWith({});
		const original = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;
		try {
			delete process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;
			expect(processes.hostEnvAccess()).toEqual({ WF_FALLBACK_BLOCK_ENV_ACCESS: 'true' });
			process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';
			expect(processes.hostEnvAccess()).toEqual({ WF_FALLBACK_BLOCK_ENV_ACCESS: 'true' });
			process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false';
			expect(processes.hostEnvAccess()).toEqual({ WF_FALLBACK_BLOCK_ENV_ACCESS: 'false' });
		} finally {
			if (original === undefined) delete process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;
			else process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = original;
		}
	});
});

describe('wfrtUserAgent', () => {
	it('passes the user agent of n8n to wfrt', () => {
		expect(wfrtUserAgent('n8n')).toBe('n8n');
		expect(wfrtUserAgent('Mozilla/5.0 (compatible; n8n/2.48.0; +https://n8n.io/)')).toBe(
			'Mozilla/5.0 (compatible; n8n/2.48.0; +https://n8n.io/)',
		);
	});

	it('keeps the default of wfrt for a value that cannot be a header value', () => {
		expect(wfrtUserAgent('')).toBeUndefined();
		expect(wfrtUserAgent('a\r\nx: y')).toBeUndefined();
		expect(wfrtUserAgent('a'.repeat(257))).toBeUndefined();
	});
});
