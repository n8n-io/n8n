import { Command } from '@oclif/core';
import * as os from 'node:os';
import * as path from 'node:path';

import { installSkillSyncHooks } from '../../skill-sync/install-hooks';

export default class McpSetup extends Command {
	static override description =
		'Install Claude Code hooks that sync the skills of a connected n8n MCP server into Claude Code';

	static override examples = ['<%= config.bin %> mcp setup'];

	async run(): Promise<void> {
		await this.parse(McpSetup);
		const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
		const { settingsPath, hookPath } = installSkillSyncHooks(
			configDir,
			path.join(this.config.root, 'dist', 'skill-sync'),
		);
		this.log(`Installed the n8n skill sync hook ${hookPath}`);
		this.log(`Updated ${settingsPath}`);
		this.log('Start a new Claude Code session to sync the skills of your n8n MCP server.');
	}
}
