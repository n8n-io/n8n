import { afterEach, beforeEach, expect, it } from 'vitest';

import {
	chunksOfType,
	collectStreamChunks,
	collectTextDeltas,
	describeIf,
	findAllToolCalls,
	findAllToolResults,
	getModel,
} from './helpers';
import { Agent, Workspace, type FileEntry } from '../../index';
import { InMemoryFilesystem, FakeProcessManager, FakeSandbox } from '../workspace/test-utils';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const describe = describeIf('anthropic');

describe('workspace agent integration', () => {
	let memFs: InMemoryFilesystem;
	let fakeProcessManager: FakeProcessManager;
	let fakeSandbox: FakeSandbox;
	let workspace: Workspace;

	beforeEach(async () => {
		memFs = new InMemoryFilesystem('agent-test-fs');
		fakeProcessManager = new FakeProcessManager();
		fakeSandbox = new FakeSandbox('agent-test', fakeProcessManager);
		workspace = new Workspace({
			id: 'agent-ws',
			filesystem: memFs,
			sandbox: fakeSandbox,
		});
		await workspace.init();
	});

	afterEach(async () => {
		await workspace.destroy();
	});

	it('agent uses workspace_write_file and workspace_read_file tools', async () => {
		const agent = new Agent('workspace-file-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. When asked to create a file, use workspace_write_file. ' +
					'When asked to read a file, use workspace_read_file. Be concise.',
			)
			.workspace(workspace);

		const result = await agent.generate(
			'Write "Hello from n8n!" to /greeting.txt, then read it back and tell me the contents. You MUST call both tools',
		);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		const toolResults = findAllToolResults(result.messages);

		const writeCall = toolCalls.find((tc) => tc.toolName === 'workspace_write_file');
		expect(writeCall).toBeDefined();

		const readCall = toolCalls.find((tc) => tc.toolName === 'workspace_read_file');
		expect(readCall).toBeDefined();

		const readResult = toolResults.find((tr) => tr.toolName === 'workspace_read_file');
		expect(readResult).toBeDefined();
		expect(readResult!.state).toBe('resolved');
		expect((readResult as unknown as { output: { content: string } }).output.content).toContain(
			'Hello from n8n!',
		);

		expect(memFs.getFileContent('/greeting.txt')).toBe('Hello from n8n!');
	});

	it('agent uses workspace_execute_command tool', async () => {
		fakeProcessManager.commandHandler = (cmd) => {
			if (cmd.includes('echo')) {
				const match = cmd.match(/echo\s+"?([^"]*)"?/);
				const text = match?.[1] ?? 'unknown';
				return { stdout: `${text}\n`, stderr: '', exitCode: 0 };
			}
			return { stdout: `ran: ${cmd}\n`, stderr: '', exitCode: 0 };
		};

		const agent = new Agent('workspace-exec-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a shell assistant. When asked to run a command, use workspace_execute_command. Be concise.',
			)
			.workspace(workspace);

		const result = await agent.generate('Run the command: echo "n8n workspace test"');

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		const execCall = toolCalls.find((tc) => tc.toolName === 'workspace_execute_command');
		expect(execCall).toBeDefined();

		const toolResults = findAllToolResults(result.messages);
		const execResult = toolResults.find((tr) => tr.toolName === 'workspace_execute_command');
		expect(execResult).toBeDefined();
		expect(execResult!.state).toBe('resolved');
		expect((execResult as unknown as { output: { success: boolean } }).output.success).toBe(true);
	});

	it('agent uses workspace_list_files for a pre-existing directory', async () => {
		await memFs.mkdir('/project', { recursive: true });
		await memFs.writeFile('/project/index.ts', 'console.log("hello")');
		await memFs.writeFile('/project/README.md', '# Project');

		const agent = new Agent('workspace-list-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. For directory listing requests, call workspace_list_files with the exact path the user provides. Be concise and list the filenames you find.',
			)
			.workspace(workspace);

		const result = await agent.generate(
			'Call workspace_list_files exactly once with path="/project" and recursive=false. Then answer with only the returned filenames.',
		);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		const listCall = toolCalls.find((tc) => tc.toolName === 'workspace_list_files');
		expect(listCall).toBeDefined();
		expect(listCall?.input).toEqual(expect.objectContaining({ path: '/project' }));

		const toolResults = findAllToolResults(result.messages);
		const listResult = toolResults.find((tr) => tr.toolName === 'workspace_list_files');
		expect(listResult).toBeDefined();
		expect(listResult!.state).toBe('resolved');
		const entries = (listResult as unknown as { output: { entries: FileEntry[] } }).output.entries;
		const names = entries.map((e) => e.name);
		expect(names).toContain('index.ts');
		expect(names).toContain('README.md');
	});

	it('stream: agent writes a file and streams the response', async () => {
		const agent = new Agent('workspace-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. When asked to create a file, use workspace_write_file. Be very concise.',
			)
			.workspace(workspace);

		const { stream } = await agent.stream(
			'Create a file at /hello.txt with the content "streaming works"',
		);
		const chunks = await collectStreamChunks(stream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		const lastFinish = finishChunks[finishChunks.length - 1] as {
			type: 'finish';
			finishReason: string;
		};
		expect(lastFinish.finishReason).toBe('stop');

		const text = collectTextDeltas(chunks);
		expect(text.length).toBeGreaterThan(0);

		expect(memFs.getFileContent('/hello.txt')).toBe('streaming works');
	});

	it('agent uses workspace_file_stat to get file metadata', async () => {
		await memFs.writeFile('/data.json', '{"key": "value", "count": 42}');

		const agent = new Agent('workspace-stat-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. Use workspace_file_stat to get file info. Report the file size and type. Be concise.',
			)
			.workspace(workspace);

		const result = await agent.generate('What is the size and type of /data.json?');

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		const statCall = toolCalls.find((tc) => tc.toolName === 'workspace_file_stat');
		expect(statCall).toBeDefined();

		const toolResults = findAllToolResults(result.messages);
		const statResult = toolResults.find((tr) => tr.toolName === 'workspace_file_stat');
		expect(statResult).toBeDefined();
		expect(statResult!.state).toBe('resolved');
		const stat = (statResult as unknown as { output: { type: string; size: number } }).output;
		expect(stat.type).toBe('file');
		expect(stat.size).toBe(29);
	});

	it('agent edits files with append, copy, move, delete, and rmdir tools', async () => {
		await memFs.mkdir('/project', { recursive: true });
		await memFs.mkdir('/project/remove-me', { recursive: true });
		await memFs.writeFile('/project/source.txt', 'alpha');
		await memFs.writeFile('/project/remove-me/old.txt', 'remove this');

		const agent = new Agent('workspace-file-edit-test')
			.model(getModel('anthropic'))
			.instructions(
				[
					'You are a file manager.',
					'Use the exact workspace tools requested by the user.',
					'Do not substitute other workspace tools when exact tools are named.',
					'Be concise after the tools complete.',
				].join(' '),
			)
			.workspace(workspace);

		const result = await agent.generate(
			[
				'Perform these exact workspace tool calls in order:',
				'1. Call workspace_append_file with path="/project/source.txt" and content="-beta".',
				'2. Call workspace_copy_file with src="/project/source.txt", dest="/project/copied.txt", overwrite=true.',
				'3. Call workspace_move_file with src="/project/copied.txt", dest="/project/moved.txt", overwrite=true.',
				'4. Call workspace_delete_file with path="/project/source.txt".',
				'5. Call workspace_rmdir with path="/project/remove-me", recursive=true, force=false.',
				'Then answer only: done.',
			].join('\n'),
		);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		expect(toolCalls.map((toolCall) => toolCall.toolName)).toEqual(
			expect.arrayContaining([
				'workspace_append_file',
				'workspace_copy_file',
				'workspace_move_file',
				'workspace_delete_file',
				'workspace_rmdir',
			]),
		);
		expect(
			toolCalls.find((toolCall) => toolCall.toolName === 'workspace_append_file')?.input,
		).toEqual(expect.objectContaining({ path: '/project/source.txt', content: '-beta' }));
		expect(
			toolCalls.find((toolCall) => toolCall.toolName === 'workspace_copy_file')?.input,
		).toEqual(
			expect.objectContaining({
				src: '/project/source.txt',
				dest: '/project/copied.txt',
				overwrite: true,
			}),
		);
		expect(
			toolCalls.find((toolCall) => toolCall.toolName === 'workspace_move_file')?.input,
		).toEqual(
			expect.objectContaining({
				src: '/project/copied.txt',
				dest: '/project/moved.txt',
				overwrite: true,
			}),
		);
		expect(
			toolCalls.find((toolCall) => toolCall.toolName === 'workspace_delete_file')?.input,
		).toEqual(expect.objectContaining({ path: '/project/source.txt' }));
		expect(toolCalls.find((toolCall) => toolCall.toolName === 'workspace_rmdir')?.input).toEqual(
			expect.objectContaining({ path: '/project/remove-me', recursive: true }),
		);

		const toolResults = findAllToolResults(result.messages);
		for (const toolName of [
			'workspace_append_file',
			'workspace_copy_file',
			'workspace_move_file',
			'workspace_delete_file',
			'workspace_rmdir',
		]) {
			const toolResult = toolResults.find((result) => result.toolName === toolName);
			expect(toolResult).toBeDefined();
			expect(toolResult!.state).toBe('resolved');
		}

		expect(await memFs.exists('/project/source.txt')).toBe(false);
		expect(await memFs.exists('/project/copied.txt')).toBe(false);
		expect(await memFs.exists('/project/moved.txt')).toBe(true);
		expect(memFs.getFileContent('/project/moved.txt')).toBe('alpha-beta');
		expect(await memFs.exists('/project/remove-me')).toBe(false);
	});

	it('agent applies single and batch string replacements', async () => {
		await memFs.mkdir('/project', { recursive: true });
		await memFs.writeFile(
			'/project/config.ts',
			[
				'export const region = "OLD_REGION";',
				'export const owner = "OLD_OWNER";',
				'export const status = "OLD_STATUS";',
			].join('\n'),
		);

		const agent = new Agent('workspace-str-replace-test')
			.model(getModel('anthropic'))
			.instructions(
				[
					'You are a file editor.',
					'Use workspace_str_replace_file for single exact replacements.',
					'Use workspace_batch_str_replace_file for batch exact replacements.',
					'Do not rewrite the whole file.',
				].join(' '),
			)
			.workspace(workspace);

		const result = await agent.generate(
			[
				'Perform these exact workspace edits:',
				'1. Call workspace_str_replace_file on /project/config.ts replacing old_str="OLD_REGION" with new_str="EU_CENTRAL".',
				'2. Call workspace_batch_str_replace_file on /project/config.ts with replacements:',
				'   - old_str="OLD_OWNER", new_str="API_TEAM"',
				'   - old_str="OLD_STATUS", new_str="READY"',
				'Then answer only: done.',
			].join('\n'),
		);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		expect(toolCalls.map((toolCall) => toolCall.toolName)).toEqual(
			expect.arrayContaining(['workspace_str_replace_file', 'workspace_batch_str_replace_file']),
		);
		expect(
			toolCalls.find((toolCall) => toolCall.toolName === 'workspace_str_replace_file')?.input,
		).toEqual(
			expect.objectContaining({
				path: '/project/config.ts',
				old_str: 'OLD_REGION',
				new_str: 'EU_CENTRAL',
			}),
		);
		expect(
			toolCalls.find((toolCall) => toolCall.toolName === 'workspace_batch_str_replace_file')?.input,
		).toEqual(
			expect.objectContaining({
				path: '/project/config.ts',
				replacements: expect.arrayContaining([
					expect.objectContaining({ old_str: 'OLD_OWNER', new_str: 'API_TEAM' }),
					expect.objectContaining({ old_str: 'OLD_STATUS', new_str: 'READY' }),
				]),
			}),
		);

		const toolResults = findAllToolResults(result.messages);
		for (const toolName of ['workspace_str_replace_file', 'workspace_batch_str_replace_file']) {
			const toolResult = toolResults.find((result) => result.toolName === toolName);
			expect(toolResult).toBeDefined();
			expect(toolResult!.state).toBe('resolved');
			expect((toolResult as unknown as { output: { success: boolean } }).output.success).toBe(true);
		}

		const edited = memFs.getFileContent('/project/config.ts');
		expect(edited).toContain('EU_CENTRAL');
		expect(edited).toContain('API_TEAM');
		expect(edited).toContain('READY');
		expect(edited).not.toContain('OLD_REGION');
		expect(edited).not.toContain('OLD_OWNER');
		expect(edited).not.toContain('OLD_STATUS');
	});

	it('agent handles multi-step workflow: mkdir, write, list, read', async () => {
		const agent = new Agent('workspace-workflow-test')
			.model(getModel('anthropic'))
			.instructions(
				"You are a file manager. Follow the user's instructions step by step using workspace tools. " +
					'Available: workspace_mkdir, workspace_write_file, workspace_list_files, workspace_read_file. Be concise.',
			)
			.workspace(workspace);

		const result = await agent.generate(
			'1. Create a directory /app\n' +
				'2. Write "export default {}" to /app/config.ts\n' +
				'3. List files in /app\n' +
				'4. Read /app/config.ts and tell me its contents',
		);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolResults = findAllToolResults(result.messages);
		const resultToolNames = toolResults.map((tr) => tr.toolName);

		expect(resultToolNames).toContain('workspace_write_file');
		expect(resultToolNames).toContain('workspace_read_file');

		const readResult = toolResults.find((tr) => tr.toolName === 'workspace_read_file');
		expect(readResult).toBeDefined();
		expect(readResult!.state).toBe('resolved');
		expect((readResult as unknown as { output: { content: string } }).output.content).toContain(
			'export default {}',
		);

		expect(memFs.getFileContent('/app/config.ts')).toBe('export default {}');
	});
});
