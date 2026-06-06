vi.mock('@n8n/utils', () => ({
	getJwtExpiry: vi.fn(() => undefined),
}));

import { createFilesystem, createSandbox } from '../create-workspace';
import { DaytonaFilesystem } from '../daytona-filesystem';
import { DaytonaSandbox } from '../daytona-sandbox';
import { N8nSandboxFilesystem } from '../n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from '../n8n-sandbox-sandbox';
import type { SandboxConfig } from '../types';

function getPrivateOptions(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object') return {};
	const options = (value as Record<PropertyKey, unknown>).options;
	return options && typeof options === 'object' ? (options as Record<string, unknown>) : {};
}

type DaytonaCreateCandidate = { params: { labels?: Record<string, string> } };

function getPrivateCreateParams(value: unknown): DaytonaCreateCandidate[] {
	if (!(value instanceof DaytonaSandbox)) return [];
	const createSandboxParams = (
		value as unknown as { createSandboxParams: () => DaytonaCreateCandidate[] }
	).createSandboxParams;
	return createSandboxParams.call(value);
}

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
		expect(getPrivateOptions(result)).toEqual(
			expect.objectContaining({
				id: 'instance-ai-thread-thread-1',
				name: 'instance-ai-thread-thread-1',
				apiKey: 'test-key',
				apiUrl: 'https://api.daytona.io',
				image: 'node:20',
				snapshot: 'n8n-instance-ai-1.0.0',
				language: 'typescript',
				timeout: 60_000,
				createTimeoutSeconds: 900,
			}),
		);
		expect(getPrivateCreateParams(result)[0]?.params).not.toHaveProperty('labels');
	});

	it('preserves Daytona labels and default create timeout', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiKey: 'test-key',
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
				labels: {
					'n8n-builder': 'instance-ai-thread-thread-1',
					thread_id: 'thread-1',
					run_id: 'run-1',
				},
			}),
		);
		expect(getPrivateCreateParams(result)[0]?.params.labels).toEqual({
			'n8n-builder': 'instance-ai-thread-thread-1',
			thread_id: 'thread-1',
			run_id: 'run-1',
		});
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
		expect(getPrivateOptions(result)).toEqual(
			expect.objectContaining({
				apiKey: undefined,
				getAuthToken,
				apiUrl: 'https://proxy.example.com',
			}),
		);
	});

	it('uses default timeout of 300_000 for daytona provider when not specified', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiKey: 'test-key',
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result).timeout).toBe(300_000);
	});

	it('does not include image in DaytonaSandbox config when not specified', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiKey: 'test-key',
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(getPrivateOptions(result)).not.toHaveProperty('image');
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
		expect(getPrivateOptions(result)).toEqual({
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		});
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
		expect(getPrivateSandbox(result)).toBe(sandbox);
	});

	it('creates an N8nSandboxFilesystem for N8nSandboxServiceSandbox', () => {
		const sandbox = new N8nSandboxServiceSandbox({
			apiKey: 'key',
			serviceUrl: 'https://sandbox.example.com',
		});

		const result = createFilesystem(sandbox);

		expect(result).toBeInstanceOf(N8nSandboxFilesystem);
		expect(getPrivateSandbox(result)).toBe(sandbox);
		expect(result?.provider).toBe('n8n-sandbox');
	});
});

function getPrivateSandbox(value: unknown): unknown {
	if (!value || typeof value !== 'object') return undefined;
	return (value as Record<PropertyKey, unknown>).sandbox;
}
