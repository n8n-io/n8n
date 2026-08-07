import {
	GET_JSON_EDITING_GUIDANCE,
	MAX_WORKFLOW_JSON_WRITE_CHARS,
	WORKFLOW_JSON_WRITE_GUIDANCE,
	guardWorkspaceWriteFileTool,
	isOversizedWorkflowJsonWrite,
} from '../guard-workflow-json-write';

describe('guard-workflow-json-write', () => {
	it('flags oversized .workflow.json writes only', () => {
		const oversized = 'x'.repeat(MAX_WORKFLOW_JSON_WRITE_CHARS + 1);
		expect(isOversizedWorkflowJsonWrite('src/workflows/dash.workflow.json', oversized)).toBe(true);
		expect(isOversizedWorkflowJsonWrite('src/workflows/dash.workflow.ts', oversized)).toBe(false);
		expect(isOversizedWorkflowJsonWrite('src/workflows/dash.workflow.json', '{}\n')).toBe(false);
	});

	it('rejects oversized workspace_write_file calls with remediation', async () => {
		const writeFile = vi.fn(async () => ({ success: true }));
		const tool = guardWorkspaceWriteFileTool({
			name: 'workspace_write_file',
			description: 'Write content to a file in the workspace',
			handler: writeFile,
		});

		await expect(
			tool.handler?.(
				{
					path: 'src/workflows/dashboard.workflow.json',
					content: 'x'.repeat(MAX_WORKFLOW_JSON_WRITE_CHARS + 1),
				},
				{},
			),
		).rejects.toThrow(WORKFLOW_JSON_WRITE_GUIDANCE);
		expect(writeFile).not.toHaveBeenCalled();
		expect(tool.systemInstruction).toContain('get-as-code');
	});

	it('allows small .workflow.json writes and non-json paths', async () => {
		const writeFile = vi.fn(async () => ({ success: true }));
		const tool = guardWorkspaceWriteFileTool({
			name: 'workspace_write_file',
			description: 'Write content to a file in the workspace',
			handler: writeFile,
		});

		await expect(
			tool.handler?.({ path: 'src/workflows/small.workflow.json', content: '{"name":"ok"}' }, {}),
		).resolves.toEqual({ success: true });
		await expect(
			tool.handler?.(
				{
					path: 'src/workflows/large.workflow.ts',
					content: 'x'.repeat(MAX_WORKFLOW_JSON_WRITE_CHARS + 1),
				},
				{},
			),
		).resolves.toEqual({ success: true });
		expect(writeFile).toHaveBeenCalledTimes(2);
	});

	it('exposes editing guidance for get-json results', () => {
		expect(GET_JSON_EDITING_GUIDANCE).toContain('get-as-code');
		expect(GET_JSON_EDITING_GUIDANCE).toContain('workspace_write_file');
	});
});
