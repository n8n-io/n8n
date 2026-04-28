import { afterEach, beforeEach, expect, it } from 'vitest';

import { Agent } from '../../../sdk/agent';
import type { FileEntry } from '../../../workspace/types';
import { Workspace } from '../../../workspace/workspace';
import { InMemoryFilesystem, FakeProcessManager, FakeSandbox } from '../../workspace/test-utils';
import {
	chunksOfType,
	collectStreamChunks,
	collectTextDeltas,
	describeIf,
	findAllToolCalls,
	findAllToolResults,
	getModel,
} from '../helpers';

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
		expect((readResult!.result as { content: string }).content).toContain('Hello from n8n!');

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
		expect((execResult!.result as { success: boolean }).success).toBe(true);
	});

	it('agent uses workspace_mkdir and workspace_list_files together', async () => {
		await memFs.mkdir('/project', { recursive: true });
		await memFs.writeFile('/project/index.ts', 'console.log("hello")');
		await memFs.writeFile('/project/README.md', '# Project');

		const agent = new Agent('workspace-list-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a file manager. Use workspace_list_files to list files. Be concise and list the filenames you find.',
			)
			.workspace(workspace);

		const result = await agent.generate('List the files in the /project directory.');

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		const toolCalls = findAllToolCalls(result.messages);
		const listCall = toolCalls.find((tc) => tc.toolName === 'workspace_list_files');
		expect(listCall).toBeDefined();

		const toolResults = findAllToolResults(result.messages);
		const listResult = toolResults.find((tr) => tr.toolName === 'workspace_list_files');
		expect(listResult).toBeDefined();
		const entries = (listResult!.result as unknown as { entries: FileEntry[] }).entries;
		const names = entries.map((e) => e.name);
		expect(names).toContain('index.ts');
		expect(names).toContain('README.md');
	});

	it('workspace instructions are appended to agent instructions', () => {
		new Agent('workspace-instructions-test')
			.model(getModel('anthropic'))
			.instructions('Base instructions.')
			.workspace(workspace);
		const tools = workspace.getTools();
		expect(tools.length).toBe(13);

		const instructions = workspace.getInstructions();
		expect(instructions).toContain('Fake sandbox');
		expect(instructions).toContain('In-memory filesystem');
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
		const stat = statResult!.result as { type: string; size: number };
		expect(stat.type).toBe('file');
		expect(stat.size).toBe(29);
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
		expect((readResult!.result as { content: string }).content).toContain('export default {}');

		expect(memFs.getFileContent('/app/config.ts')).toBe('export default {}');
	});
});
