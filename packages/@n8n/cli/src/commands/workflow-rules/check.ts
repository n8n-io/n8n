import type { RulesExportBundle } from '@n8n/workflow-rules';
import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';

import { BaseCommand, EXIT_BLOCKED, EXIT_ERROR } from '../../base-command';
import { discoverWorkflows } from '../../workflow-rules/discover';
import {
	checkOffline,
	parseRulesBundle,
	summarize,
	type CheckReport,
} from '../../workflow-rules/evaluate-offline';
import { formatReport, shouldFail, toFailOn, toReportFormat } from '../../workflow-rules/report';

const MAX_WORKFLOWS_PER_REQUEST = 500;

export default class WorkflowRulesCheck extends BaseCommand {
	static override description =
		'Check workflow files against the Workflow Rules. Exits with code 4 when a finding blocks.';

	static override examples = [
		'<%= config.bin %> workflow-rules check .',
		'<%= config.bin %> workflow-rules check workflows --rules workflow-rules.json',
		'<%= config.bin %> workflow-rules check . --output github --fail-on warn',
	];

	static override strict = false;

	static override args = {
		paths: Args.string({
			description: 'Files or folders to check. Folders are searched for workflow JSON files.',
			default: '.',
		}),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		rules: Flags.string({
			description:
				'A rules file from "workflow-rules export". Checks offline, without calling the instance.',
		}),
		project: Flags.string({
			description: 'Apply this project’s rules to workflows whose project cannot be detected',
		}),
		output: Flags.string({
			description: 'Report format. "github" prints GitHub Actions annotations.',
			options: ['text', 'json', 'github'],
			default: 'text',
		}),
		'fail-on': Flags.string({
			description: 'Which findings make the command fail',
			options: ['block', 'warn', 'never'],
			default: 'block',
		}),
	};

	async run(): Promise<void> {
		const { argv, flags } = await this.parse(WorkflowRulesCheck);
		const paths = argv.length > 0 ? argv.map(String) : ['.'];

		await this.execute(async () => {
			for (const target of paths) {
				if (!fs.existsSync(target)) this.error(`Path not found: ${target}`, { exit: EXIT_ERROR });
			}

			const { workflows, unreadable } = discoverWorkflows(paths);
			for (const { file, reason } of unreadable) {
				this.warn(`Skipped ${file}: ${reason}`);
			}
			if (workflows.length === 0) {
				this.error('No workflow files found.', { exit: EXIT_ERROR });
			}
			const withProject = workflows.map((item) => ({
				...item,
				projectId: item.projectId ?? flags.project,
			}));

			let report: CheckReport;
			if (flags.rules) {
				let bundle: RulesExportBundle;
				try {
					bundle = parseRulesBundle(fs.readFileSync(flags.rules, 'utf-8'));
				} catch (error) {
					this.error(error instanceof Error ? error.message : String(error), { exit: EXIT_ERROR });
				}
				report = checkOffline(bundle, withProject);
			} else {
				const client = this.getClient(flags);
				const results: CheckReport['results'] = [];
				for (let start = 0; start < withProject.length; start += MAX_WORKFLOWS_PER_REQUEST) {
					const batch = withProject.slice(start, start + MAX_WORKFLOWS_PER_REQUEST);
					const response = await client.checkWorkflowRules(
						batch.map(({ file, workflow, projectId }) => ({ workflow, projectId, source: file })),
					);
					results.push(...response.results);
				}
				report = { results, summary: summarize(results) };
			}

			const failOn = toFailOn(flags['fail-on']);
			this.log(formatReport(report, toReportFormat(flags.output), failOn));
			if (shouldFail(report, failOn)) this.exit(EXIT_BLOCKED);
		});
	}
}
