import { mock } from 'vitest-mock-extended';

import type { BinaryDataConfig } from 'n8n-core';

import type { GlobalConfig } from '@n8n/config';

import {
	CompiledEngineProcesses,
	sqlTimestampZone,
	wfrtUserAgent,
} from '../compiled-engine-processes';
import { CompiledEngineConfig } from '../compiled-engine.config';

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

describe('the listen address of wfrt', () => {
	const argsWith = (
		listenAddress: string,
		sqlMysql = false,
		workloadClasses = '',
		sqlMssql = false,
		smtpNative = false,
	) => {
		const config = mock<CompiledEngineConfig>({
			listenAddress,
			sqlMysql,
			sqlMssql,
			smtpNative,
			workloadClasses,
			workloadClassSlots: 'background=64',
			workloadClassHostSteps: '',
			port: 5690,
			adminPort: 5691,
			targetRate: 0,
			maxConnections: 0,
			http2: true,
			connectionPool: 'shared',
			readTimeoutMs: 0,
			originLimits: '',
			dataDir: '/tmp/compiled-engine-test',
		});
		const globalConfig = mock<GlobalConfig>({ endpoints: { payloadSizeMax: 16 } });
		const processes = new CompiledEngineProcesses(
			config,
			mock(),
			mock(),
			globalConfig,
			mock(),
			mock(),
			mock(),
		);
		return (processes as unknown as { wfrtArgs(): string[] }).wfrtArgs();
	};
	const hostOf = (args: string[]) => args[args.indexOf('--host') + 1];

	it('starts wfrt on the loopback address by default', () => {
		expect(new CompiledEngineConfig().listenAddress).toBe('127.0.0.1');
		expect(hostOf(argsWith('127.0.0.1'))).toBe('127.0.0.1');
	});

	it('starts wfrt on the address of the setting', () => {
		expect(hostOf(argsWith('0.0.0.0'))).toBe('0.0.0.0');
	});

	it('starts wfrt with the MySQL client only with the setting', () => {
		expect(new CompiledEngineConfig().sqlMysql).toBe(false);
		expect(argsWith('127.0.0.1')).not.toContain('--sql-mysql');
		expect(argsWith('127.0.0.1', true)).toContain('--sql-mysql');
	});

	it('starts wfrt with the SQL Server client only with the setting', () => {
		expect(new CompiledEngineConfig().sqlMssql).toBe(false);
		expect(argsWith('127.0.0.1')).not.toContain('--sql-mssql');
		expect(argsWith('127.0.0.1', true)).not.toContain('--sql-mssql');
		expect(argsWith('127.0.0.1', false, '', true)).toContain('--sql-mssql');
	});

	it('starts wfrt with the SMTP client only with the setting', () => {
		expect(new CompiledEngineConfig().smtpNative).toBe(false);
		expect(argsWith('127.0.0.1')).not.toContain('--smtp-native');
		expect(argsWith('127.0.0.1', true, '', true)).not.toContain('--smtp-native');
		expect(argsWith('127.0.0.1', false, '', false, true)).toContain('--smtp-native');
	});

	it('starts wfrt with workload classes only with the setting', () => {
		expect(argsWith('127.0.0.1').join(' ')).not.toContain('--class');
		const args = argsWith('127.0.0.1', false, 'critical=a;background=b');
		expect(args[args.indexOf('--classes') + 1]).toBe('critical,background,default');
		expect(args[args.indexOf('--class-slots') + 1]).toBe('background=64');
		expect(args).not.toContain('--class-host-steps');
	});
});

describe('sqlTimestampZone', () => {
	it('tells wfrt to read a timestamp without a zone as UTC only when n8n runs in UTC', () => {
		expect(sqlTimestampZone('UTC')).toBe('utc');
		expect(sqlTimestampZone('Etc/UTC')).toBe('utc');
		expect(sqlTimestampZone('Europe/Berlin')).toBeUndefined();
		// London is not UTC in summer.
		expect(sqlTimestampZone('Europe/London')).toBeUndefined();
	});
});
