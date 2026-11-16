import { FsByteStore } from '@n8n/blob-storage';
import { BinaryDataBlobManager } from 'n8n-core';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

/**
 * `wfrt` writes stored responses in the layout of n8n's file system manager
 * (`workflow-runtime/src/shell/blob_store.zig`). Its tests hold the texts below. When this test
 * fails, n8n changed the layout: change `blob_store.zig` and `core/binary_names.zig` with it.
 */
describe('the layout of the file system binary data manager, which wfrt writes too', () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'compiled-binary-layout-'));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	const manager = () =>
		new BinaryDataBlobManager(
			new FsByteStore({ storagePath: root, reportError: () => {} }),
			mock(),
		);

	it('writes <uuid> and <uuid>.metadata under workflows/<wf>/executions/<e>/binary_data', async () => {
		const { fileId, fileSize } = await manager().store(
			{ type: 'execution', workflowId: 'wf1', executionId: 'wfrt-7' },
			Buffer.from('%PDF-1.7 hello'),
			{ fileName: 'report.pdf', mimeType: 'application/pdf' },
		);

		expect(fileSize).toBe(14);
		expect(fileId).toMatch(
			/^workflows\/wf1\/executions\/wfrt-7\/binary_data\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		const uuid = fileId.slice(fileId.lastIndexOf('/') + 1);
		const dir = join(root, 'workflows/wf1/executions/wfrt-7/binary_data');
		expect(readdirSync(dir).sort()).toEqual([uuid, `${uuid}.metadata`]);
		expect(readFileSync(join(dir, uuid), 'utf8')).toBe('%PDF-1.7 hello');
		expect(readFileSync(join(dir, `${uuid}.metadata`), 'utf8')).toBe(
			'{"fileName":"report.pdf","mimeType":"application/pdf","fileSize":14}',
		);
	});

	it('leaves a file name that is absent out of the metadata', async () => {
		const { fileId } = await manager().store(
			{ type: 'execution', workflowId: 'wf1', executionId: '9' },
			Buffer.from(''),
			{ mimeType: 'text/plain' },
		);

		expect(readFileSync(join(root, `${fileId}.metadata`), 'utf8')).toBe(
			'{"mimeType":"text/plain","fileSize":0}',
		);
	});
});
