vi.mock('@n8n/utils', () => ({
	getJwtExpiry: vi.fn(() => undefined),
}));

import { createFilesystem, createSandbox } from '../create-workspace';
import { DaytonaFilesystem } from '../daytona-filesystem';
import { DaytonaSandbox } from '../daytona-sandbox';
import { N8nSandboxFilesystem } from '../n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from '../n8n-sandbox-sandbox';
import type { SandboxConfig } from '../types';

describe('createSandbox', () => {
	it('returns undefined when sandbox is disabled', async () => {
		const config: SandboxConfig = { enabled: false, provider: 'n8n-sandbox' };

		const result = await createSandbox(config);

		expect(result).toBeUndefined();
	});

	it('returns a DaytonaSandbox for daytona provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			id: 'instance-ai-thread-thread-1',
			name: 'instance-ai-thread-thread-1',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			snapshot: 'n8n-instance-ai-1.0.0',
			timeout: 60_000,
			createTimeoutSeconds: 900,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(result?.id).toBe('instance-ai-thread-thread-1');
		expect(result?.provider).toBe('daytona');
	});

	it('passes getAuthToken through to DaytonaSandbox in proxy mode', async () => {
		const getAuthToken = vi.fn().mockResolvedValue('jwt-token-123');
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			getAuthToken,
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(getAuthToken).not.toHaveBeenCalled();
		expect(result).toBeInstanceOf(DaytonaSandbox);
	});

	it('returns an N8nSandboxServiceSandbox for n8n-sandbox provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(N8nSandboxServiceSandbox);
		expect(result?.provider).toBe('n8n-sandbox');
	});
});

describe('createFilesystem', () => {
	it('returns undefined when sandbox is undefined', () => {
		const result = createFilesystem(undefined);

		expect(result).toBeUndefined();
	});

	it('creates a DaytonaFilesystem for DaytonaSandbox', () => {
		const sandbox = new DaytonaSandbox({ apiKey: 'key' });

		const result = createFilesystem(sandbox);

		expect(result).toBeInstanceOf(DaytonaFilesystem);
		expect(result.id).toBe(`daytona-fs-${sandbox.id}`);
	});

	it('creates an N8nSandboxFilesystem for N8nSandboxServiceSandbox', () => {
		const sandbox = new N8nSandboxServiceSandbox({
			apiKey: 'key',
			serviceUrl: 'https://sandbox.example.com',
		});

		const result = createFilesystem(sandbox);

		expect(result).toBeInstanceOf(N8nSandboxFilesystem);
		expect(result.provider).toBe('n8n-sandbox');
	});
});
