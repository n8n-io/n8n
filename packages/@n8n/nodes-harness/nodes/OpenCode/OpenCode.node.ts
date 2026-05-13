import { join } from 'node:path';

import type { IExecuteFunctions, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { BaseHarnessNode } from '../../src/base/BaseHarnessNode';
import type { HarnessEvent } from '../../src/types';

/** Map credential provider to the corresponding environment variable name. */
function providerEnvVar(provider: string): string {
	switch (provider) {
		case 'anthropic':
			return 'ANTHROPIC_API_KEY';
		case 'openai':
			return 'OPENAI_API_KEY';
		case 'google':
			return 'GOOGLE_API_KEY';
		default:
			return 'ANTHROPIC_API_KEY';
	}
}

/**
 * OpenCode Harness Node
 *
 * Executes the OpenCode CLI (AI coding assistant) in an isolated workspace
 * and returns a structured diff of all changes made by the agent.
 *
 * Two outputs:
 * - Summary: execution metadata, diff stats, agent events
 * - Files:   one item per changed file with binary data
 */
export class OpenCode extends BaseHarnessNode {
	description: INodeTypeDescription = {
		displayName: 'OpenCode',
		name: 'openCode',
		group: ['transform'],
		version: 1,
		subtitle: 'AI Harness',
		description:
			'Execute the OpenCode AI coding agent in an isolated workspace and capture all changes as a structured diff',
		defaults: {
			name: 'OpenCode',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['Summary', 'Files'],
		credentials: [
			{
				name: 'openCodeApi',
				required: true,
			},
			{
				name: 'gitPassword',
				required: false,
				displayOptions: {
					show: {
						workspaceSource: ['git'],
					},
				},
			},
		],
		properties: [
			// --- Workspace Source ---
			{
				displayName: 'Workspace Source',
				name: 'workspaceSource',
				type: 'options',
				options: [
					{
						name: 'Git Repository',
						value: 'git',
						description: 'Clone a repository from a URL',
					},
					{
						name: 'Local Directory',
						value: 'directory',
						description: 'Use an existing directory on disk (creates a working copy)',
					},
					{
						name: 'Input Files',
						value: 'input',
						description: 'Use binary files from the upstream node as workspace content',
					},
					{
						name: 'Previous Harness Output',
						value: 'previous',
						description: "Continue from a previous harness node's workspace (for chaining)",
					},
				],
				default: 'git',
				description: 'Where to get the source files for the workspace',
			},

			// --- Git ---
			{
				displayName: 'Repository URL',
				name: 'repoUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { workspaceSource: ['git'] } },
				placeholder: 'https://github.com/user/repo.git',
				description: 'Git repository URL to clone',
			},
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: 'main',
				displayOptions: { show: { workspaceSource: ['git'] } },
				description: 'Branch to clone',
			},

			// --- Local Directory ---
			{
				displayName: 'Directory Path',
				name: 'directoryPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { workspaceSource: ['directory'] } },
				placeholder: '/home/user/projects/my-repo',
				description:
					'Path to the directory on the n8n server. A working copy will be created; the original is never modified.',
			},

			// --- Prompt ---
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				required: true,
				description: 'The instruction to send to OpenCode',
				placeholder: 'Add unit tests for the UserService class',
			},

			// --- Model ---
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Claude Sonnet 4 (Recommended)',
						value: 'anthropic/claude-sonnet-4-20250514',
					},
					{ name: 'Claude Opus 4', value: 'anthropic/claude-opus-4-6' },
					{ name: 'GPT-4o', value: 'openai/gpt-4o' },
					{ name: 'GPT-4.1', value: 'openai/gpt-4.1' },
				],
				default: 'anthropic/claude-sonnet-4-20250514',
				description: 'The AI model to use for code generation',
			},

			// --- Agent ---
			{
				displayName: 'Agent',
				name: 'agent',
				type: 'options',
				options: [
					{
						name: 'Build (Code Changes)',
						value: 'build',
						description: 'Make code changes and modifications',
					},
					{
						name: 'Plan (Analysis Only)',
						value: 'plan',
						description: 'Analyze and plan without making changes',
					},
				],
				default: 'build',
				description: 'The OpenCode agent mode to use',
			},

			// --- Timeout ---
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 600,
				description: 'Maximum execution time in seconds',
				typeOptions: { minValue: 30, maxValue: 3600 },
			},

			// --- Retain Workspace ---
			{
				displayName: 'Retain Workspace',
				name: 'retainWorkspace',
				type: 'boolean',
				default: false,
				description:
					'Whether to keep the workspace directory after execution for chaining with downstream harness nodes',
			},

			// --- Auto-approve ---
			{
				displayName: 'Auto-Approve Permissions',
				name: 'autoApprovePermissions',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'Automatically approve all file edit and command permissions. Required for fully automated execution. Uses --dangerously-skip-permissions.',
			},
		],
	};

	protected buildCommand(ctx: IExecuteFunctions, itemIndex: number) {
		const prompt = ctx.getNodeParameter('prompt', itemIndex) as string;
		const model = ctx.getNodeParameter('model', itemIndex) as string;
		const agent = ctx.getNodeParameter('agent', itemIndex) as string;
		const autoApprove = ctx.getNodeParameter('autoApprovePermissions', itemIndex) as boolean;

		const args = ['run', '--format', 'json'];

		if (model) {
			args.push('--model', model);
		}

		if (agent) {
			args.push('--agent', agent);
		}

		if (autoApprove) {
			args.push('--dangerously-skip-permissions');
		}

		// Use -- separator to safely pass the prompt.
		args.push('--', prompt);

		return { command: 'opencode', args };
	}

	protected async buildEnv(ctx: IExecuteFunctions, _itemIndex: number) {
		const credentials = await ctx.getCredentials('openCodeApi');
		const provider = credentials.provider as string;
		const apiKey = credentials.apiKey as string;

		// Per-execution isolation directories.
		const isolatedRoot = join(this.workspace?.path ?? '/tmp', '.opencode-state');

		return {
			// System essentials.
			...this.getBaseEnv(),

			// Per-execution XDG isolation.
			XDG_DATA_HOME: join(isolatedRoot, 'data'),
			XDG_CONFIG_HOME: join(isolatedRoot, 'config'),
			XDG_CACHE_HOME: join(isolatedRoot, 'cache'),
			XDG_STATE_HOME: join(isolatedRoot, 'state'),

			// OpenCode-specific isolation overrides.
			OPENCODE_CONFIG_DIR: join(isolatedRoot, 'config'),
			OPENCODE_DB: join(isolatedRoot, 'opencode.db'),
			OPENCODE_DISABLE_PROJECT_CONFIG: '1',
			OPENCODE_DISABLE_AUTOUPDATE: '1',
			OPENCODE_DISABLE_AUTOCOMPACT: '1',
			OPENCODE_DISABLE_PRUNE: '1',
			OPENCODE_DISABLE_LSP_DOWNLOAD: '1',
			OPENCODE_DISABLE_MODELS_FETCH: '1',
			OPENCODE_DISABLE_CLAUDE_CODE: '1',
			OPENCODE_DISABLE_MOUSE: '1',
			OPENCODE_DISABLE_TERMINAL_TITLE: '1',

			// Provider API key.
			[providerEnvVar(provider)]: apiKey,
		};
	}

	protected override parseEvents(stdout: string): HarnessEvent[] {
		const events: HarnessEvent[] = [];
		if (!stdout.trim()) return events;

		for (const line of stdout.split('\n')) {
			if (!line.trim()) continue;
			try {
				const parsed = JSON.parse(line) as HarnessEvent;
				if (parsed.type) {
					events.push(parsed);
				}
			} catch {
				// Non-JSON lines (progress messages, etc.) are ignored.
			}
		}

		return events;
	}
}
