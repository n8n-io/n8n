import { WorkflowPublishedVersionRepository, WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { checkEngineV2Eligibility, type EngineV2ReasonCode } from '@n8n/workflow-engine-check';
import { z } from 'zod';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { BaseCommand } from '../base-command';

const PAGE_SIZE = 100;

const flagsSchema = z.object({
	json: z
		.boolean()
		.default(false)
		.describe(
			'Print the report as JSON. Set N8N_LOG_LEVEL=silent to keep log lines out of the output.',
		),
});

interface EligibilityReport {
	total: number;
	eligible: number;
	eligiblePercent: number;
	published: { total: number; eligible: number; eligiblePercent: number };
	/** Number of workflows with at least one reason of this code, highest count first. */
	reasons: Partial<Record<EngineV2ReasonCode, number>>;
}

@Command({
	name: 'engine:eligibility-report',
	description:
		'Report how many workflows on this instance can run on engine v2, and why the others cannot. Read-only.',
	examples: ['', '--json'],
	flagsSchema,
})
export class EngineEligibilityReport extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const report = await this.buildReport();

		if (this.flags.json) {
			process.stdout.write(JSON.stringify(report, null, 2) + '\n');
		} else {
			process.stdout.write(formatTable(report));
		}
	}

	/**
	 * A published workflow is checked by its live published version, because that is what triggers
	 * run. `activeVersionId` is not used: it can name a version that is not live yet.
	 */
	private async buildReport(): Promise<EligibilityReport> {
		const { nodes: nodeTypes } = await Container.get(LoadNodesAndCredentials).collectTypes();
		const workflowRepository = Container.get(WorkflowRepository);
		const publishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);

		let total = 0;
		let eligible = 0;
		const published = { total: 0, eligible: 0 };
		const reasonCounts = new Map<EngineV2ReasonCode, number>();

		let afterId: string | undefined;
		while (true) {
			const page = await workflowRepository.findEngineEligibilityScanPage(afterId, PAGE_SIZE);
			if (page.length === 0) break;
			afterId = page[page.length - 1].id;
			const publishedVersions = await publishedVersionRepository.findPublishedVersionContents(
				page.map(({ id }) => id),
			);

			for (const workflow of page) {
				const publishedVersion = publishedVersions.get(workflow.id);
				const version = publishedVersion ?? workflow;
				const result = checkEngineV2Eligibility(
					{ nodes: version.nodes, connections: version.connections, settings: workflow.settings },
					nodeTypes,
				);

				total++;
				if (result.eligible) eligible++;
				if (publishedVersion) {
					published.total++;
					if (result.eligible) published.eligible++;
				}
				for (const code of new Set(result.reasons.map((reason) => reason.code))) {
					reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1);
				}
			}
		}

		return {
			total,
			eligible,
			eligiblePercent: toPercent(eligible, total),
			published: { ...published, eligiblePercent: toPercent(published.eligible, published.total) },
			reasons: Object.fromEntries([...reasonCounts].sort(([, a], [, b]) => b - a)),
		};
	}

	async catch(error: Error) {
		this.logger.error('Failed to build the engine v2 eligibility report');
		this.logger.error(error.message);
	}
}

function toPercent(part: number, total: number) {
	if (total === 0) return 0;
	return Math.round((part / total) * 1000) / 10;
}

function formatTable(report: EligibilityReport) {
	const lines = [
		`Eligible for engine v2: ${report.eligible} of ${report.total} workflows (${report.eligiblePercent}%)`,
		`Published workflows: ${report.published.eligible} of ${report.published.total} eligible (${report.published.eligiblePercent}%)`,
	];

	const reasons = Object.entries(report.reasons);
	if (reasons.length > 0) {
		const width = Math.max(...reasons.map(([code]) => code.length));
		lines.push('', `${'Reason code'.padEnd(width)}  Workflows`);
		for (const [code, count] of reasons) lines.push(`${code.padEnd(width)}  ${count}`);
	}

	return lines.join('\n') + '\n';
}
