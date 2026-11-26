import type { Workspace } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { AgentSandboxFilesService } from '../../agent-sandbox-files.service';
import { createImportFilesTool, IMPORT_FILES_TOOL_NAME } from '../import-files.tool';

describe('createImportFilesTool', () => {
	const workspace = mock<Workspace>();
	const sandboxFiles = mock<AgentSandboxFilesService>();
	const build = () =>
		createImportFilesTool({ projectId: 'project-1', workspace, sandboxFiles }).build();

	it('builds a tool with the correct name', () => {
		expect(build().name).toBe(IMPORT_FILES_TOOL_NAME);
	});

	it('lists the copies under imported, so the chat does not show them as new files', async () => {
		const copy = {
			fileId: 'f1',
			fileName: 'sales.csv',
			mimeType: 'text/csv',
			sizeBytes: 3,
			path: 'inputs/sales.csv',
		};
		sandboxFiles.importFiles.mockResolvedValue([copy]);

		const abortSignal = new AbortController().signal;

		const result = await build().handler!(
			{ files: { 'sales.csv': 'f1' } },
			{
				parentTelemetry: undefined,
				persistence: { threadId: 'thread-1', resourceId: 'user-1' },
				abortSignal,
			},
		);

		expect(result).toEqual({ imported: [copy] });
		// A cancelled run stops the copy.
		expect(sandboxFiles.importFiles).toHaveBeenCalledWith(
			workspace,
			{ 'sales.csv': 'f1' },
			{ projectId: 'project-1', threadId: 'thread-1' },
			abortSignal,
		);
	});
});
