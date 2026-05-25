import { Workspace } from '@n8n/agents';

import { type SandboxConfig, createSandbox, createWorkspace } from '../create-workspace';
import { DaytonaFilesystem } from '../daytona-filesystem';
import { DaytonaSandbox } from '../daytona-sandbox';
import { LocalFilesystem } from '../local-filesystem';
import { LocalSandbox } from '../local-sandbox';
import { N8nSandboxFilesystem } from '../n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from '../n8n-sandbox-sandbox';

function getPrivateOptions(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object') return {};
	const options = (value as Record<PropertyKey, unknown>).options;
	return options && typeof options === 'object' ? (options as Record<string, unknown>) : {};
}

describe('createSandbox', () => {
	const originalEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it('should return undefined when sandbox is disabled', async () => {
		const config: SandboxConfig = { enabled: false, provider: 'local' };

		const result = await createSandbox(config);

		expect(result).toBeUndefined();
	});

	it('should return a DaytonaSandbox for "daytona" provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			id: 'instance-ai-thread-thread-1',
			name: 'instance-ai-thread-thread-1',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			timeout: 60_000,
			createTimeoutSeconds: 900,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result)).toEqual(
			expect.objectContaining({
				id: 'instance-ai-thread-thread-1',
				name: 'instance-ai-thread-thread-1',
				apiKey: 'test-key',
				apiUrl: 'https://api.daytona.io',
				image: 'node:20',
				language: 'typescript',
				timeout: 60_000,
				createTimeoutSeconds: 900,
				ephemeral: true,
			}),
		);
	});

	it('should preserve Daytona labels and default create timeout', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			labels: {
				'n8n-builder': 'instance-ai-thread-thread-1',
				thread_id: 'thread-1',
				run_id: 'run-1',
			},
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result)).toEqual(
			expect.objectContaining({
				createTimeoutSeconds: 300,
				ephemeral: true,
				labels: {
					'n8n-builder': 'instance-ai-thread-thread-1',
					thread_id: 'thread-1',
					run_id: 'run-1',
				},
			}),
		);
	});

	it('should resolve apiKey via getAuthToken in proxy mode', async () => {
		const getAuthToken = jest.fn().mockResolvedValue('jwt-token-123');
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			getAuthToken,
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result)).toEqual(
			expect.objectContaining({
				apiKey: 'jwt-token-123',
				apiUrl: 'https://proxy.example.com',
			}),
		);
	});

	it('should use default timeout of 300_000 for "daytona" provider when not specified', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result).timeout).toBe(300_000);
	});

	it('should not include image in DaytonaSandbox config when not specified', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result)).not.toHaveProperty('image');
	});

	it('should return a LocalSandbox for "local" provider in non-production', async () => {
		process.env.NODE_ENV = 'development';
		const config: SandboxConfig = { enabled: true, provider: 'local' };

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(LocalSandbox);
		if (!(result instanceof LocalSandbox)) throw new Error('Expected LocalSandbox');
		expect(result.workingDirectory).toMatch(/workspace$/);
	});

	it('should throw in production when provider is "local"', async () => {
		process.env.NODE_ENV = 'production';
		const config: SandboxConfig = { enabled: true, provider: 'local' };

		await expect(createSandbox(config)).rejects.toThrow(
			'LocalSandbox (provider: "local") is not allowed in production. Use "daytona" provider for isolated sandbox execution.',
		);
	});

	it('should return an N8nSandboxServiceSandbox for "n8n-sandbox" provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(N8nSandboxServiceSandbox);
		expect(getPrivateOptions(result)).toEqual({
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		});
	});
});

describe('createWorkspace', () => {
	it('should return undefined when sandbox is undefined', () => {
		const result = createWorkspace(undefined);

		expect(result).toBeUndefined();
	});

	it('should wrap LocalSandbox with LocalFilesystem', () => {
		const sandbox = new LocalSandbox({ workingDirectory: './workspace' });

		const result = createWorkspace(sandbox);

		expect(result).toBeInstanceOf(Workspace);
		expect(result?.sandbox).toBe(sandbox);
		expect(result?.filesystem).toBeInstanceOf(LocalFilesystem);
	});

	it('should wrap DaytonaSandbox with DaytonaFilesystem', () => {
		const sandbox = new DaytonaSandbox({ apiKey: 'key' });

		const result = createWorkspace(sandbox);

		expect(result).toBeInstanceOf(Workspace);
		expect(result?.sandbox).toBe(sandbox);
		expect(result?.filesystem).toBeInstanceOf(DaytonaFilesystem);
	});

	it('should wrap N8nSandboxServiceSandbox with N8nSandboxFilesystem', () => {
		const sandbox = new N8nSandboxServiceSandbox({
			apiKey: 'key',
			serviceUrl: 'https://sandbox.example.com',
		});

		const result = createWorkspace(sandbox);

		expect(result).toBeInstanceOf(Workspace);
		expect(result?.sandbox).toBe(sandbox);
		expect(result?.filesystem).toBeInstanceOf(N8nSandboxFilesystem);
	});
});
