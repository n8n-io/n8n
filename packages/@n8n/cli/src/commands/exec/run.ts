import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { parseParamFlag, parseToolId } from './parse-tool-id';
import { BaseCommand } from '../../base-command';

interface ExecuteNodeResponse {
	executionId?: string;
	status?: string;
	executionUrl?: string;
	output?: unknown;
	error?: { message?: string };
	[key: string]: unknown;
}

export default class ExecRun extends BaseCommand {
	static override description = 'Execute a single n8n node by tool id (e.g. "slack.message.send")';

	static override examples = [
		'<%= config.bin %> exec run slack.message.send --credential c1 --param channel=#test --param text=hi',
		'<%= config.bin %> exec run set.json --param mode=raw --input @payload.json',
		'<%= config.bin %> exec run slack.message.send --credential c1 --dry-run',
	];

	static override args = {
		toolId: Args.string({
			description: 'Tool id (e.g. "slack.message.send" or "set.json")',
			required: true,
		}),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		credential: Flags.string({
			description: 'Credential ID to bind to the node',
		}),
		param: Flags.string({
			description: 'Parameter to pass as key=value (repeatable, string values only)',
			multiple: true,
			default: [],
		}),
		input: Flags.string({
			description:
				'Path to a JSON file (with optional leading @) whose contents are merged into the parameters',
		}),
		dryRun: Flags.boolean({
			description: 'Validate inputs and return the resolved node spec without dispatching',
			default: false,
			aliases: ['dry-run'],
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ExecRun);
		await this.execute(async () => {
			const client = this.getClient(flags);

			const { nodeType, resource, operation } = parseToolId(args.toolId);

			const params: Record<string, unknown> = {};
			if (flags.input) {
				const path = flags.input.startsWith('@') ? flags.input.slice(1) : flags.input;
				const raw = fs.readFileSync(path, 'utf-8');
				const parsed: unknown = JSON.parse(raw);
				if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
					this.error('--input file must contain a JSON object');
				}
				Object.assign(params, parsed as Record<string, unknown>);
			}
			for (const entry of flags.param) {
				const { key, value } = parseParamFlag(entry);
				params[key] = value;
			}

			const parameters: Record<string, unknown> = {
				...(resource ? { resource } : {}),
				...(operation ? { operation } : {}),
				...params,
			};

			const response = (await client.executeNode({
				nodeType,
				parameters,
				...(flags.credential ? { credentialId: flags.credential } : {}),
				...(flags.dryRun ? { dryRun: true } : {}),
				caller: { kind: 'cli', name: 'n8n-cli' },
			})) as ExecuteNodeResponse;

			this.output(response, flags);
		});
	}
}
