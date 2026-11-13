import { mock } from 'vitest-mock-extended';

import type { BinaryDataConfig } from 'n8n-core';

import { CompiledEngineProcesses } from '../compiled-engine-processes';

type BinaryEnv = { binaryData(pathVariable: string): Record<string, string> };

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
});
