import { Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { BaseCommand } from '../../base-command';

export default class WorkflowRulesExport extends BaseCommand {
	static override description =
		'Export the Workflow Rules of the instance, for "workflow-rules check --rules"';

	static override examples = [
		'<%= config.bin %> workflow-rules export --output-file workflow-rules.json',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		'output-file': Flags.string({
			char: 'o',
			description: 'Write the rules to this file instead of stdout',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(WorkflowRulesExport);
		await this.execute(async () => {
			const bundle = await this.getClient(flags).exportWorkflowRules();
			const text = `${JSON.stringify(bundle, null, 2)}\n`;
			if (flags['output-file']) {
				fs.writeFileSync(flags['output-file'], text);
				if (!flags.quiet) this.log(`Wrote the Workflow Rules to ${flags['output-file']}`);
				return;
			}
			this.log(text.trimEnd());
		});
	}
}
