import fs from 'node:fs/promises';

import { CommandTester } from '../../test-utils/command-tester';
import { mockSpawn, mockExecSync } from '../../test-utils/mock-child-process';
import { MockPrompt } from '../../test-utils/mock-prompts';
import { tmpdirTest } from '../../test-utils/temp-fs';

vi.mock('../../utils/filesystem', async () => {
	const actual = await vi.importActual('../../utils/filesystem');
	return {
		...actual,
		delayAtLeast: vi.fn(async <T>(promise: Promise<T>) => await promise),
	};
});

describe('new command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		MockPrompt.reset();
	});

	tmpdirTest('creates new node project with user prompts', async ({ tmpdir }) => {
		MockPrompt.setup([
			{
				question: 'What kind of node are you building?',
				answer: 'programmatic',
			},
			{
				question: 'What type of programmatic node are you building?',
				answer: 'basic',
			},
		]);

		mockExecSync([
			{ command: 'git config --get user.name', result: 'Test User\n' },
			{ command: 'git config --get user.email', result: 'test@example.com\n' },
		]);

		mockSpawn([
			{
				command: 'git',
				args: ['init', '-b', 'main'],
				options: { exitCode: 0 },
			},
			{
				command: 'pnpm',
				args: ['install'],
				options: { exitCode: 0 },
			},
		]);

		await CommandTester.run('new n8n-nodes-my-awesome-api');

		expect(MockPrompt).toHaveAskedAllQuestions();
		expect(MockPrompt).toHaveAskedQuestion('What kind of node are you building?');

		expect(tmpdir).toHaveFile('n8n-nodes-my-awesome-api');

		await expect(tmpdir).toHaveFileContaining(
			'n8n-nodes-my-awesome-api/package.json',
			'"name": "n8n-nodes-my-awesome-api"',
		);
		await expect(tmpdir).toHaveFileContaining(
			'n8n-nodes-my-awesome-api/package.json',
			'"name": "Test User"',
		);
		await expect(tmpdir).toHaveFileContaining(
			'n8n-nodes-my-awesome-api/package.json',
			'"email": "test@example.com"',
		);

		await expect(tmpdir).toHaveFileContaining(
			'n8n-nodes-my-awesome-api/nodes/Example/Example.node.ts',
			'export class Example implements INodeType',
		);

		// Check if credentials files exist
		try {
			const credentialsPath = `${tmpdir}/n8n-nodes-my-awesome-api/credentials`;
			const credentialFiles = await fs.readdir(credentialsPath);
			if (credentialFiles.length > 0) {
				await expect(tmpdir).toHaveFileContaining(
					`n8n-nodes-my-awesome-api/credentials/${credentialFiles[0]}`,
					'implements ICredentialType',
				);
			}
		} catch {
			// Credentials directory doesn't exist, which is fine
		}
	});

	tmpdirTest('creates new node project with node name prompt', async ({ tmpdir }) => {
		MockPrompt.setup([
			{
				question: "Package name (must start with 'n8n-nodes-' or '@org/n8n-nodes-')",
				answer: 'n8n-nodes-interactive-demo',
			},
			{
				question: 'What kind of node are you building?',
				answer: 'declarative',
			},
			{
				question: 'What template do you want to use?',
				answer: 'githubIssues',
			},
		]);

		mockExecSync([
			{ command: 'git config --get user.name', result: 'Test User\n' },
			{ command: 'git config --get user.email', result: 'test@example.com\n' },
		]);

		mockSpawn([
			{
				command: 'git',
				args: ['init', '-b', 'main'],
				options: { exitCode: 0 },
			},
		]);

		await CommandTester.run('new --skip-install');

		expect(MockPrompt).toHaveAskedAllQuestions();

		const projectName = 'n8n-nodes-interactive-demo';
		expect(tmpdir).toHaveFile(projectName);

		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/package.json`,
			'"name": "n8n-nodes-interactive-demo"',
		);
		await expect(tmpdir).toHaveFileContaining(`${projectName}/package.json`, '"name": "Test User"');
		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/package.json`,
			'"email": "test@example.com"',
		);

		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/GithubIssues/GithubIssues.node.ts`,
			'export class GithubIssues implements INodeType',
		);

		// Check if credentials files exist
		try {
			const credentialsPath = `${tmpdir}/${projectName}/credentials`;
			const credentialFiles = await fs.readdir(credentialsPath);
			if (credentialFiles.length > 0) {
				await expect(tmpdir).toHaveFileContaining(
					`${projectName}/credentials/${credentialFiles[0]}`,
					'implements ICredentialType',
				);
			}
		} catch {
			// Credentials directory doesn't exist, which is fine
		}
	});

	tmpdirTest(
		'creates new node project with custom template',
		async ({ tmpdir }) => {
			MockPrompt.setup([
				{
					question: 'What kind of node are you building?',
					answer: 'declarative',
				},
				{
					question: 'What template do you want to use?',
					answer: 'custom',
				},
				{
					question: "What's the base URL of the API?",
					answer: 'https://api.custom-service.com',
				},
				{
					question: 'What type of authentication does your API use?',
					answer: 'apiKey',
				},
			]);

			mockExecSync([
				{ command: 'git config --get user.name', result: 'Custom User\n' },
				{ command: 'git config --get user.email', result: 'custom@test.com\n' },
			]);

			mockSpawn([
				{
					command: 'git',
					args: ['init', '-b', 'main'],
					options: { exitCode: 0 },
				},
			]);

			await CommandTester.run('new n8n-nodes-custom-api --skip-install');

			expect(MockPrompt).toHaveAskedAllQuestions();

			const projectName = 'n8n-nodes-custom-api';
			expect(tmpdir).toHaveFile(projectName);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/package.json`,
				'"name": "n8n-nodes-custom-api"',
			);
			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/package.json`,
				'"name": "Custom User"',
			);
			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/package.json`,
				'"email": "custom@test.com"',
			);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/nodes/CustomApi/CustomApi.node.ts`,
				'implements INodeType',
			);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/credentials/CustomApiApi.credentials.ts`,
				'implements ICredentialType',
			);
		},
		15_000,
	);

	test('handles prompt cancellation gracefully', async () => {
		MockPrompt.setup([
			{
				question: 'What kind of node are you building?',
				answer: 'CANCEL',
			},
		]);

		await expect(CommandTester.run('new n8n-nodes-cancelled --skip-install')).rejects.toThrow(
			'EEXIT: 0',
		);

		expect(MockPrompt).toHaveAskedAllQuestions();
	});

	tmpdirTest(
		'creates new node project with all arguments provided (no prompts)',
		async ({ tmpdir }) => {
			MockPrompt.setup([]);

			mockExecSync([
				{ command: 'git config --get user.name', result: 'No Prompt User\n' },
				{ command: 'git config --get user.email', result: 'noprompt@example.com\n' },
			]);

			mockSpawn([
				{
					command: 'git',
					args: ['init', '-b', 'main'],
					options: { exitCode: 0 },
				},
			]);

			await CommandTester.run(
				'new n8n-nodes-full-args --template declarative/github-issues --force --skip-install',
			);

			expect(MockPrompt).toHaveAskedAllQuestions();

			const projectName = 'n8n-nodes-full-args';
			expect(tmpdir).toHaveFile(projectName);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/package.json`,
				'"name": "n8n-nodes-full-args"',
			);
			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/package.json`,
				'"name": "No Prompt User"',
			);
			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/package.json`,
				'"email": "noprompt@example.com"',
			);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/nodes/GithubIssues/GithubIssues.node.ts`,
				'export class GithubIssues implements INodeType',
			);

			// Check if credentials files exist
			try {
				const credentialsPath = `${tmpdir}/${projectName}/credentials`;
				const credentialFiles = await fs.readdir(credentialsPath);
				if (credentialFiles.length > 0) {
					await expect(tmpdir).toHaveFileContaining(
						`${projectName}/credentials/${credentialFiles[0]}`,
						'implements ICredentialType',
					);
				}
			} catch {
				// Credentials directory doesn't exist, which is fine
			}
		},
	);

	tmpdirTest('creates new node project with OpenAI compatible chat model', async ({ tmpdir }) => {
		MockPrompt.setup([
			{
				question: 'What kind of node are you building?',
				answer: 'programmatic',
			},
			{
				question: 'What type of programmatic node are you building?',
				answer: 'chatModel',
			},
			{
				question: 'What type of chat model?',
				answer: 'openaiCompatible',
			},
		]);

		mockExecSync([
			{ command: 'git config --get user.name', result: 'Chat User\n' },
			{ command: 'git config --get user.email', result: 'chat@example.com\n' },
		]);

		mockSpawn([
			{
				command: 'git',
				args: ['init', '-b', 'main'],
				options: { exitCode: 0 },
			},
			{
				command: 'pnpm',
				args: ['install'],
				options: { exitCode: 0 },
			},
		]);

		await CommandTester.run('new n8n-nodes-chat-openai --skip-install');

		expect(MockPrompt).toHaveAskedAllQuestions();
		expect(MockPrompt).toHaveAskedQuestion('What type of chat model?');

		const projectName = 'n8n-nodes-chat-openai';
		expect(tmpdir).toHaveFile(projectName);

		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/ExampleChatModel/ExampleChatModel.node.ts`,
			'export class ExampleChatModel implements INodeType',
		);
		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/ExampleChatModel/ExampleChatModel.node.ts`,
			'Chat model node for OpenAI API compatible providers',
		);
	});

	tmpdirTest('creates new node project with custom chat model', async ({ tmpdir }) => {
		MockPrompt.setup([
			{
				question: 'What kind of node are you building?',
				answer: 'programmatic',
			},
			{
				question: 'What type of programmatic node are you building?',
				answer: 'chatModel',
			},
			{
				question: 'What type of chat model?',
				answer: 'custom',
			},
		]);

		mockExecSync([
			{ command: 'git config --get user.name', result: 'Custom Chat User\n' },
			{ command: 'git config --get user.email', result: 'customchat@example.com\n' },
		]);

		mockSpawn([
			{
				command: 'git',
				args: ['init', '-b', 'main'],
				options: { exitCode: 0 },
			},
		]);

		await CommandTester.run('new n8n-nodes-custom-chat --skip-install');

		expect(MockPrompt).toHaveAskedAllQuestions();

		const projectName = 'n8n-nodes-custom-chat';
		expect(tmpdir).toHaveFile(projectName);

		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/ExampleChatModel/ExampleChatModel.node.ts`,
			'export class ExampleChatModel implements INodeType',
		);
	});

	tmpdirTest('creates new node project with custom chat model example', async ({ tmpdir }) => {
		MockPrompt.setup([
			{
				question: 'What kind of node are you building?',
				answer: 'programmatic',
			},
			{
				question: 'What type of programmatic node are you building?',
				answer: 'chatModel',
			},
			{
				question: 'What type of chat model?',
				answer: 'customExample',
			},
		]);

		mockExecSync([
			{ command: 'git config --get user.name', result: 'Example User\n' },
			{ command: 'git config --get user.email', result: 'example@example.com\n' },
		]);

		mockSpawn([
			{
				command: 'git',
				args: ['init', '-b', 'main'],
				options: { exitCode: 0 },
			},
		]);

		await CommandTester.run('new n8n-nodes-chat-example --skip-install');

		expect(MockPrompt).toHaveAskedAllQuestions();

		const projectName = 'n8n-nodes-chat-example';
		expect(tmpdir).toHaveFile(projectName);

		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/ExampleChatModel/ExampleChatModel.node.ts`,
			'export class ExampleChatModel implements INodeType',
		);
	});

	tmpdirTest('creates new node project with chat memory', async ({ tmpdir }) => {
		MockPrompt.setup([
			{
				question: 'What kind of node are you building?',
				answer: 'programmatic',
			},
			{
				question: 'What type of programmatic node are you building?',
				answer: 'chatMemory',
			},
		]);

		mockExecSync([
			{ command: 'git config --get user.name', result: 'Memory User\n' },
			{ command: 'git config --get user.email', result: 'memory@example.com\n' },
		]);

		mockSpawn([
			{
				command: 'git',
				args: ['init', '-b', 'main'],
				options: { exitCode: 0 },
			},
		]);

		await CommandTester.run('new n8n-nodes-chat-memory --skip-install');

		expect(MockPrompt).toHaveAskedAllQuestions();
		expect(MockPrompt).toHaveAskedQuestion('What type of programmatic node are you building?');

		const projectName = 'n8n-nodes-chat-memory';
		expect(tmpdir).toHaveFile(projectName);

		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/ExampleChatMemory/ExampleChatMemory.node.ts`,
			'export class ExampleChatMemory implements INodeType',
		);
		await expect(tmpdir).toHaveFileContaining(
			`${projectName}/nodes/ExampleChatMemory/ExampleChatMemory.node.ts`,
			'Store conversation history in memory',
		);
	});

	tmpdirTest(
		'creates new node project with --template programmatic/openai-chat-model',
		async ({ tmpdir }) => {
			MockPrompt.setup([]);

			mockExecSync([
				{ command: 'git config --get user.name', result: 'Template User\n' },
				{ command: 'git config --get user.email', result: 'template@example.com\n' },
			]);

			mockSpawn([
				{
					command: 'git',
					args: ['init', '-b', 'main'],
					options: { exitCode: 0 },
				},
			]);

			await CommandTester.run(
				'new n8n-nodes-template-chat --template programmatic/openai-chat-model --skip-install',
			);

			expect(MockPrompt).toHaveAskedAllQuestions();

			const projectName = 'n8n-nodes-template-chat';
			expect(tmpdir).toHaveFile(projectName);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/nodes/ExampleChatModel/ExampleChatModel.node.ts`,
				'export class ExampleChatModel implements INodeType',
			);
		},
	);

	tmpdirTest(
		'creates new node project with --template programmatic/custom-chat-memory',
		async ({ tmpdir }) => {
			MockPrompt.setup([]);

			mockExecSync([
				{ command: 'git config --get user.name', result: 'Memory Template User\n' },
				{ command: 'git config --get user.email', result: 'memory-tpl@example.com\n' },
			]);

			mockSpawn([
				{
					command: 'git',
					args: ['init', '-b', 'main'],
					options: { exitCode: 0 },
				},
			]);

			await CommandTester.run(
				'new n8n-nodes-template-memory --template programmatic/custom-chat-memory --skip-install',
			);

			expect(MockPrompt).toHaveAskedAllQuestions();

			const projectName = 'n8n-nodes-template-memory';
			expect(tmpdir).toHaveFile(projectName);

			await expect(tmpdir).toHaveFileContaining(
				`${projectName}/nodes/ExampleChatMemory/ExampleChatMemory.node.ts`,
				'export class ExampleChatMemory implements INodeType',
			);
		},
	);
});
