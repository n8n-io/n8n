import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { WorkspaceFilesystem } from '@n8n/agents';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { InstanceAiSessionUploadFilesService } from '../instance-ai-session-upload-files.service';
import type { InstanceAiChatAttachmentService } from '../instance-ai-chat-attachment.service';
import type { InstanceAiChatAttachment } from '../entities/instance-ai-chat-attachment.entity';

const sessionId = '00000000-0000-4000-8000-000000000001';
const workspaceRoot = '/workspace';
const MB = 1024 * 1024;

function attachment(partial: {
	id: string;
	fileName?: string;
	fileSizeBytes: number;
	createdAt: string;
	messageId?: string | null;
	binaryDataId?: string;
}): InstanceAiChatAttachment {
	return {
		id: partial.id,
		fileName: partial.fileName ?? 'data.csv',
		fileSizeBytes: partial.fileSizeBytes,
		createdAt: new Date(partial.createdAt),
		messageId: partial.messageId ?? null,
		binaryDataId: partial.binaryDataId ?? `bin-${partial.id}`,
		mimeType: 'text/csv',
	} as InstanceAiChatAttachment;
}

function makeService(enabled = true) {
	const binaryDataService = mock<BinaryDataService>();
	const attachments = mock<InstanceAiChatAttachmentService>();
	binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('col\n1\n'));
	attachments.listForWorkingSet.mockResolvedValue([]);
	const service = new InstanceAiSessionUploadFilesService(
		mock<Logger>(),
		mock<GlobalConfig>({ instanceAi: { sessionFilesEnabled: enabled } }),
		binaryDataService,
		attachments,
	);
	return { service, binaryDataService, attachments };
}

function fakeFilesystem() {
	const files = new Map<string, string | Buffer>();
	const filesystem = mock<WorkspaceFilesystem>();
	filesystem.mkdir.mockResolvedValue(undefined);
	filesystem.rmdir.mockResolvedValue(undefined);
	filesystem.writeFile.mockImplementation(async (path, content) => {
		files.set(path, typeof content === 'string' ? content : Buffer.from(content));
	});
	filesystem.deleteFile.mockImplementation(async (path) => {
		files.delete(path);
	});
	filesystem.readdir.mockImplementation(async (dir) => {
		const prefix = dir.endsWith('/') ? dir : `${dir}/`;
		return [...files.keys()]
			.filter((path) => path.startsWith(prefix))
			.map((path) => ({
				name: path.slice(prefix.length),
				type: 'file' as const,
			}));
	});
	return { filesystem, files };
}

describe('InstanceAiSessionUploadFilesService', () => {
	it('writes an uploaded CSV into the session upload directory', async () => {
		const { service, attachments } = makeService();
		const { filesystem, files } = fakeFilesystem();
		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'att-1',
				messageId: 'msg-1',
				fileSizeBytes: 5,
				createdAt: '2026-01-01T00:00:00.000Z',
			}),
		]);
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });

		await service.materialize({ sessionId, filesystem, workspaceRoot });

		expect(files.get(`${workspaceRoot}/uploads/${sessionId}/msg-1/data.csv`)?.toString()).toBe(
			'col\n1\n',
		);
		expect(files.has(`${workspaceRoot}/uploads/${sessionId}/manifest.json`)).toBe(true);
		expect([...files.keys()].some((path) => path.includes('/outputs/'))).toBe(false);
	});

	it('skips a file that exceeds the working set remainder', async () => {
		const { service, attachments } = makeService();
		const { filesystem, files } = fakeFilesystem();
		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'big',
				messageId: 'msg-new',
				fileSizeBytes: 180 * MB,
				createdAt: '2026-01-02T00:00:00.000Z',
			}),
			attachment({
				id: 'small',
				messageId: 'msg-old',
				fileSizeBytes: 30 * MB,
				createdAt: '2026-01-01T00:00:00.000Z',
			}),
		]);
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });

		await service.materialize({ sessionId, filesystem, workspaceRoot });

		expect(files.has(`${workspaceRoot}/uploads/${sessionId}/msg-old/data.csv`)).toBe(false);
		const manifest = JSON.parse(
			String(files.get(`${workspaceRoot}/uploads/${sessionId}/manifest.json`)),
		) as { skipped: Array<{ id: string; reason: string }> };
		expect(manifest.skipped).toEqual([
			expect.objectContaining({ id: 'small', reason: 'working_set_cap' }),
		]);
	});

	it('marks missing bytes as unavailable and omits them from disk', async () => {
		const { service, binaryDataService, attachments } = makeService();
		const { filesystem, files } = fakeFilesystem();
		binaryDataService.getAsBuffer.mockRejectedValue(new Error('gone'));
		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'att-1',
				messageId: 'msg-1',
				fileSizeBytes: 5,
				createdAt: '2026-01-01T00:00:00.000Z',
			}),
		]);
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });

		await service.materialize({ sessionId, filesystem, workspaceRoot });

		expect(files.has(`${workspaceRoot}/uploads/${sessionId}/msg-1/data.csv`)).toBe(false);
		const manifest = JSON.parse(
			String(files.get(`${workspaceRoot}/uploads/${sessionId}/manifest.json`)),
		) as { skipped: Array<{ reason: string }> };
		expect(manifest.skipped[0]?.reason).toBe('unavailable');
	});

	it('evicts a file that dropped out of the working set', async () => {
		const { service, attachments } = makeService();
		const { filesystem, files } = fakeFilesystem();
		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'old',
				messageId: 'msg-old',
				fileSizeBytes: 5,
				createdAt: '2026-01-01T00:00:00.000Z',
			}),
		]);
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });
		await service.materialize({ sessionId, filesystem, workspaceRoot });
		expect(files.has(`${workspaceRoot}/uploads/${sessionId}/msg-old/data.csv`)).toBe(true);

		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'new',
				messageId: 'msg-new',
				fileSizeBytes: 5,
				createdAt: '2026-01-03T00:00:00.000Z',
			}),
		]);
		await service.materialize({ sessionId, filesystem, workspaceRoot });

		expect(files.has(`${workspaceRoot}/uploads/${sessionId}/msg-old/data.csv`)).toBe(false);
		expect(files.has(`${workspaceRoot}/uploads/${sessionId}/msg-new/data.csv`)).toBe(true);
	});

	it('does not rewrite when the attachment signature is unchanged', async () => {
		const { service, attachments } = makeService();
		const { filesystem } = fakeFilesystem();
		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'att-1',
				messageId: 'msg-1',
				fileSizeBytes: 5,
				createdAt: '2026-01-01T00:00:00.000Z',
			}),
		]);
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });
		await service.materialize({ sessionId, filesystem, workspaceRoot });
		filesystem.writeFile.mockClear();

		const result = await service.materialize({ sessionId, filesystem, workspaceRoot });

		expect(result.changed).toBe(false);
		expect(filesystem.writeFile).not.toHaveBeenCalled();
	});

	it('sets onDisk on decorated attachment ids', async () => {
		const { service, attachments } = makeService();
		const { filesystem } = fakeFilesystem();
		attachments.listForWorkingSet.mockResolvedValue([
			attachment({
				id: 'att-1',
				messageId: 'msg-1',
				fileSizeBytes: 5,
				createdAt: '2026-01-01T00:00:00.000Z',
			}),
		]);
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });
		await service.materialize({ sessionId, filesystem, workspaceRoot });

		const decorated = service.decorateList(sessionId, [
			{
				id: 'att-1',
				kind: 'attachment',
				fileName: 'data.csv',
				mimeType: 'text/csv',
				sizeBytes: 5,
				createdAt: '2026-01-01T00:00:00.000Z',
				previewable: true,
				onDisk: false,
			},
			{
				id: 'out-1',
				kind: 'output',
				fileName: 'hello.md',
				mimeType: 'text/markdown',
				sizeBytes: 4,
				createdAt: '2026-01-02T00:00:00.000Z',
				previewable: true,
				onDisk: false,
			},
		]);

		expect(decorated.files[0]?.onDisk).toBe(true);
		expect(decorated.files[1]?.onDisk).toBe(false);
	});
});
