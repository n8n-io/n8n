import { detectContainerEngine } from './container-engine';

const execFile = vi.hoisted(() => vi.fn<(cmd: string, args: string[]) => Promise<unknown>>());
vi.mock('node:child_process', () => ({ execFile, execFileSync: vi.fn() }));
vi.mock('node:util', () => ({
	promisify: () => execFile,
}));

/** Makes `cmd --version` succeed only for the listed binaries. */
const availableBinaries = (present: string[], dockerVersionOutput = 'Docker version 27.0.0') => {
	execFile.mockImplementation(async (cmd: string, args: string[]) => {
		if (!present.includes(cmd)) throw new Error('not found');
		if (cmd === 'docker' && args[0] === 'version') {
			return await Promise.resolve({ stdout: dockerVersionOutput });
		}
		return await Promise.resolve({ stdout: '' });
	});
};

describe('detectContainerEngine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.CONTAINER_ENGINE;
	});

	it('prefers docker when both are present', async () => {
		availableBinaries(['docker', 'podman']);
		await expect(detectContainerEngine()).resolves.toBe('docker');
	});

	it('uses podman when the docker CLI is a podman shim', async () => {
		availableBinaries(['docker', 'podman'], 'podman version 5.8.3');
		await expect(detectContainerEngine()).resolves.toBe('podman');
	});

	it('falls back to podman when docker is absent', async () => {
		availableBinaries(['podman']);
		await expect(detectContainerEngine()).resolves.toBe('podman');
	});

	it('honours the CONTAINER_ENGINE override without probing', async () => {
		process.env.CONTAINER_ENGINE = 'podman';
		availableBinaries(['docker']);
		await expect(detectContainerEngine()).resolves.toBe('podman');
		expect(execFile).not.toHaveBeenCalled();
	});

	it('rejects an unsupported CONTAINER_ENGINE', async () => {
		process.env.CONTAINER_ENGINE = 'containerd';
		await expect(detectContainerEngine()).rejects.toThrow('not supported');
	});

	it('points at --external-n8n when no engine is found', async () => {
		availableBinaries([]);
		await expect(detectContainerEngine()).rejects.toThrow('--external-n8n');
	});
});
