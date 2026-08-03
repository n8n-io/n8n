import { SandboxServiceError } from '@n8n/sandbox-client';

import { N8nSandboxFilesystem } from '../../../workspace/filesystem/n8n-sandbox-filesystem';
import { N8nSandboxServiceSandbox } from '../../../workspace/sandbox/n8n-sandbox-sandbox';

const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();
const mockReadFile = vi.fn();
const mockStat = vi.fn();

vi.mock('@n8n/sandbox-client', () => {
	class MockSandboxServiceError extends Error {
		readonly status: number;

		constructor(message: string, status: number) {
			super(message);
			this.name = 'SandboxServiceError';
			this.status = status;
		}
	}

	return {
		SandboxServiceError: MockSandboxServiceError,
		SandboxClient: class {
			mkdir = mockMkdir;
			writeFile = mockWriteFile;
			readFile = mockReadFile;
			stat = mockStat;
		},
	};
});

function createFilesystem() {
	const sandbox = new N8nSandboxServiceSandbox({
		id: 'sb-test',
		apiKey: 'key',
		serviceUrl: 'https://sandbox.test',
	});
	vi.spyOn(sandbox, 'ensureRunning').mockResolvedValue(undefined);
	return new N8nSandboxFilesystem(sandbox);
}

describe('N8nSandboxFilesystem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMkdir.mockResolvedValue(undefined);
		mockWriteFile.mockResolvedValue(undefined);
		mockReadFile.mockResolvedValue(Buffer.from('file content'));
		mockStat.mockResolvedValue({
			name: 'file.txt',
			path: '/workspace/file.txt',
			type: 'file',
			size: 12,
			createdAt: '2024-01-01T00:00:00.000Z',
			modifiedAt: '2024-01-02T00:00:00.000Z',
		});
	});

	it('calls mkdir for parent directory before writeFile when recursive is true', async () => {
		const filesystem = createFilesystem();

		await filesystem.writeFile('/workspace/nested/file.txt', 'hello', { recursive: true });

		expect(mockMkdir).toHaveBeenCalledWith('sb-test', '/workspace/nested', true);
		expect(mockWriteFile).toHaveBeenCalledWith(
			'sb-test',
			'/workspace/nested/file.txt',
			'hello',
			true,
		);
	});

	it('returns string content when readFile is called with utf8 encoding', async () => {
		const filesystem = createFilesystem();

		const content = await filesystem.readFile('/workspace/file.txt', { encoding: 'utf8' });

		expect(content).toBe('file content');
		expect(mockReadFile).toHaveBeenCalledWith('sb-test', '/workspace/file.txt');
	});

	it('returns false from exists on SandboxServiceError 404', async () => {
		mockStat.mockRejectedValue(new SandboxServiceError('not found', 404));
		const filesystem = createFilesystem();

		await expect(filesystem.exists('/workspace/missing.txt')).resolves.toBe(false);
	});

	it('rethrows non-404 errors from exists', async () => {
		const error = new SandboxServiceError('server error', 500);
		mockStat.mockRejectedValue(error);
		const filesystem = createFilesystem();

		await expect(filesystem.exists('/workspace/file.txt')).rejects.toBe(error);
	});

	it('maps sandbox client stat fields into FileStat', async () => {
		const filesystem = createFilesystem();

		const result = await filesystem.stat('/workspace/file.txt');

		expect(result).toEqual({
			name: 'file.txt',
			path: '/workspace/file.txt',
			type: 'file',
			size: 12,
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			modifiedAt: new Date('2024-01-02T00:00:00.000Z'),
		});
	});
});
