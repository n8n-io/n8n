import { Workspace } from '@n8n/agents';
import type * as SharedSandboxMod from '@n8n/ai-utilities/sandbox';
import type { SandboxFilesystem, SandboxInstance } from '@n8n/ai-utilities/sandbox';

const {
	mockCreateSharedSandbox,
	mockCreateFilesystem,
	mockSnapshotManagerConstructor,
	mockEnsureSnapshot,
	mockEnsureImage,
	mockDaytonaConstructor,
} = vi.hoisted(() => ({
	mockCreateSharedSandbox: vi.fn(),
	mockCreateFilesystem: vi.fn(),
	mockSnapshotManagerConstructor: vi.fn(),
	mockEnsureSnapshot: vi.fn(),
	mockEnsureImage: vi.fn(),
	mockDaytonaConstructor: vi.fn(),
}));

vi.mock('@n8n/ai-utilities/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof SharedSandboxMod>()),
	createSandbox: mockCreateSharedSandbox,
	createFilesystem: mockCreateFilesystem,
}));

vi.mock('../snapshot-manager', () => ({
	SnapshotManager: class {
		constructor(
			baseImage: string | undefined,
			logger: unknown,
			n8nVersion: string | undefined,
			errorReporter: unknown,
		) {
			mockSnapshotManagerConstructor(baseImage, logger, n8nVersion, errorReporter);
		}

		ensureSnapshot = mockEnsureSnapshot;
		ensureImage = mockEnsureImage;
	},
}));

vi.mock('../lazy-daytona', () => ({
	loadDaytona: () => ({
		Daytona: class {
			constructor(config: unknown) {
				mockDaytonaConstructor(config);
			}
		},
	}),
}));

import {
	type SandboxConfig,
	type InstanceAiCreateSandboxOptions,
	createSandbox,
	createWorkspace,
} from '../create-workspace';

type DaytonaSandboxConfig = Extract<SandboxConfig, { enabled: true; provider: 'daytona' }>;

const sandbox = {
	id: 'sandbox-1',
	name: 'Sandbox',
	provider: 'daytona',
	status: 'running',
} satisfies SandboxInstance;

const filesystem = {
	id: 'filesystem-1',
	name: 'Filesystem',
	provider: 'daytona',
	status: 'ready',
	readFile: vi.fn(),
	writeFile: vi.fn(),
	appendFile: vi.fn(),
	deleteFile: vi.fn(),
	copyFile: vi.fn(),
	moveFile: vi.fn(),
	mkdir: vi.fn(),
	rmdir: vi.fn(),
	readdir: vi.fn(),
	exists: vi.fn(),
	stat: vi.fn(),
} satisfies SandboxFilesystem;

const logger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
};

const errorReporter = {
	error: vi.fn(),
};

describe('createSandbox', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateSharedSandbox.mockResolvedValue(sandbox);
		mockEnsureSnapshot.mockResolvedValue('snapshot-name');
		mockEnsureImage.mockResolvedValue({ dockerfile: 'FROM node:20' });
	});

	it('returns undefined when sandbox is disabled', async () => {
		const config: SandboxConfig = { enabled: false, provider: 'n8n-sandbox' };

		const result = await createSandbox(config);

		expect(result).toBeUndefined();
		expect(mockCreateSharedSandbox).not.toHaveBeenCalled();
	});

	it('delegates n8n-sandbox config to the shared factory without snapshot fallback', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		};

		await expect(createSandbox(config, { logger, errorReporter })).resolves.toBe(sandbox);

		expect(mockSnapshotManagerConstructor).not.toHaveBeenCalled();
		expect(mockCreateSharedSandbox).toHaveBeenCalledWith(config, { logger, errorReporter });
	});

	it('delegates Daytona config when snapshot fallback is not requested', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			timeout: 60_000,
		};

		await expect(createSandbox(config)).resolves.toBe(sandbox);

		expect(mockSnapshotManagerConstructor).not.toHaveBeenCalled();
		expect(mockCreateSharedSandbox).toHaveBeenCalledWith(config, {
			logger: undefined,
			errorReporter: undefined,
		});
	});

	it('prepares snapshot and image in Daytona direct snapshot fallback mode', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			n8nVersion: '1.2.3',
		};
		const options: InstanceAiCreateSandboxOptions = {
			logger,
			errorReporter,
			useSnapshotFallback: true,
		};

		await expect(createSandbox(config, options)).resolves.toBe(sandbox);

		expect(mockSnapshotManagerConstructor).toHaveBeenCalledWith(
			'node:20',
			logger,
			'1.2.3',
			errorReporter,
		);
		expect(mockDaytonaConstructor).toHaveBeenCalledWith({
			apiKey: 'test-key',
			apiUrl: 'https://api.daytona.io',
		});
		expect(mockEnsureSnapshot).toHaveBeenCalledWith(expect.any(Object), 'direct');
		expect(mockEnsureImage).toHaveBeenCalledWith();
		expect(mockCreateSharedSandbox).toHaveBeenCalledWith(
			{
				...config,
				image: { dockerfile: 'FROM node:20' },
				snapshot: 'snapshot-name',
			},
			{ logger, errorReporter },
		);
	});

	it('uses a no-op logger for snapshot fallback when no logger is provided', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiKey: 'test-key',
			n8nVersion: '1.2.3',
		};

		await createSandbox(config, { useSnapshotFallback: true });

		expect(mockSnapshotManagerConstructor).toHaveBeenCalledWith(
			undefined,
			expect.anything(),
			'1.2.3',
			undefined,
		);
	});

	it('does not pass a Daytona image descriptor back into SnapshotManager as a base image', async () => {
		const image = { dockerfile: 'FROM node:20' } as NonNullable<DaytonaSandboxConfig['image']>;
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiKey: 'test-key',
			image,
			n8nVersion: '1.2.3',
		};

		await createSandbox(config, { logger, useSnapshotFallback: true });

		expect(mockSnapshotManagerConstructor).toHaveBeenCalledWith(
			undefined,
			logger,
			'1.2.3',
			undefined,
		);
	});

	it('prepares snapshot and image in Daytona proxy snapshot fallback mode', async () => {
		const getAuthToken = vi.fn().mockResolvedValue('jwt-token');
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			getAuthToken,
			image: 'node:20',
			n8nVersion: '1.2.3',
		};

		await expect(
			createSandbox(config, {
				logger,
				errorReporter,
				useSnapshotFallback: true,
			}),
		).resolves.toBe(sandbox);

		expect(mockDaytonaConstructor).not.toHaveBeenCalled();
		expect(mockEnsureSnapshot).toHaveBeenCalledWith(undefined, 'proxy');
		expect(mockEnsureImage).toHaveBeenCalledWith();
		expect(mockCreateSharedSandbox).toHaveBeenCalledWith(
			{
				...config,
				image: { dockerfile: 'FROM node:20' },
				snapshot: 'snapshot-name',
			},
			{ logger, errorReporter },
		);
	});
});

describe('createWorkspace', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateFilesystem.mockReturnValue(filesystem);
	});

	it('returns undefined when sandbox is undefined', () => {
		const result = createWorkspace(undefined);

		expect(result).toBeUndefined();
		expect(mockCreateFilesystem).not.toHaveBeenCalled();
	});

	it('wraps a shared sandbox with its shared filesystem', () => {
		const result = createWorkspace(sandbox);

		expect(result).toBeInstanceOf(Workspace);
		expect(result?.sandbox).toBe(sandbox);
		expect(result?.filesystem).toBe(filesystem);
		expect(mockCreateFilesystem).toHaveBeenCalledWith(sandbox);
	});
});
