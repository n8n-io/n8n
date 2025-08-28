import { Command, Flags } from '@oclif/core';
import { spawn } from 'node:child_process';

import { detectPackageManager } from '../utils/package-manager';

export default class Lint extends Command {
	static override description = 'Lint the node in the current directory. Includes auto-fixing.';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {
		fix: Flags.boolean({ description: 'Automatically fix problems', default: false }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Lint);

		const commands = ['exec', '--', 'eslint', '.'];

		if (flags.fix) {
			commands.push('--fix');
		}

		const child = spawn((await detectPackageManager()) ?? 'npm', commands, {
			stdio: 'inherit',
			cwd: process.cwd(),
		});

		child.on('exit', (code, signal) => {
			if (signal) {
				process.kill(process.pid, signal);
			} else {
				process.exit(code ?? 0);
			}
		});
	}
}
