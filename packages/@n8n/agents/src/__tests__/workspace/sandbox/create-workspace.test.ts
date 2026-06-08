vi.mock('@n8n/utils', () => ({
	getJwtExpiry: vi.fn(() => undefined),
}));

import { DaytonaFilesystem } from '../../../workspace/filesystem/daytona-filesystem';
import { N8nSandboxFilesystem } from '../../../workspace/filesystem/n8n-sandbox-filesystem';
import { createFilesystem, createSandbox } from '../../../workspace/sandbox/create-workspace';
import { DaytonaSandbox } from '../../../workspace/sandbox/daytona-sandbox';
import { N8nSandboxServiceSandbox } from '../../../workspace/sandbox/n8n-sandbox-sandbox';
import type { SandboxConfig } from '../../../workspace/sandbox/types';

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

	it('does not include sandbox secrets in unsupported provider errors', async () => {
		const config = {
			enabled: true,
			provider: 'unsupported',
			daytonaApiKey: 'daytona-secret',
			apiKey: 'sandbox-secret',
		} as unknown as SandboxConfig;

		let error: unknown;
		try {
			await createSandbox(config);
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(Error);
		if (!(error instanceof Error)) return;
		expect(error.message).toBe('Unsupported sandbox provider: unsupported');
		expect(error.message).not.toContain('daytona-secret');
		expect(error.message).not.toContain('sandbox-secret');
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
