/**
 * Build Block Kit blocks for the nightly Trivy vulnerability digest.
 *
 * Workflow-specific inputs (passed via notify.mjs flags):
 *   results    — path to trivy-results.json
 *   imageRef   — full image reference (ghcr.io/n8n-io/n8n:nightly)
 *
 * Repo / run context is read from the GitHub Actions runner env
 * (GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID). Pass `env` to
 * override in tests.
 */
import { readFileSync } from 'node:fs';

const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEVERITY_EMOJI = {
	CRITICAL: ':red_circle:',
	HIGH: ':large_orange_circle:',
	MEDIUM: ':large_yellow_circle:',
	LOW: ':large_green_circle:',
};
const MAX_CVE_BLOCKS = 8;

export default function buildTrivyBlocks({ results, imageRef, env = process.env }) {
	const repoName = env.GITHUB_REPOSITORY;
	const repoUrl = `${env.GITHUB_SERVER_URL}/${repoName}`;
	const runUrl = `${repoUrl}/actions/runs/${env.GITHUB_RUN_ID}`;

	const report = JSON.parse(readFileSync(results, 'utf8'));

	const allVulns = (report.Results ?? [])
		.flatMap((r) => r.Vulnerabilities ?? [])
		.filter((v) => v && v.VulnerabilityID);

	const seen = new Set();
	const uniqueVulns = [];
	for (const v of allVulns) {
		if (seen.has(v.VulnerabilityID)) continue;
		seen.add(v.VulnerabilityID);
		uniqueVulns.push(v);
	}

	const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
	for (const v of uniqueVulns) {
		if (v.Severity in counts) counts[v.Severity]++;
	}

	const cvssOf = (v) => v?.CVSS?.nvd?.V3Score ?? 0;

	uniqueVulns.sort((a, b) => {
		const sevDiff = (SEVERITY_RANK[a.Severity] ?? 99) - (SEVERITY_RANK[b.Severity] ?? 99);
		if (sevDiff !== 0) return sevDiff;
		return cvssOf(b) - cvssOf(a);
	});

	const cveBlock = (v) => ({
		type: 'section',
		text: {
			type: 'mrkdwn',
			text: [
				`${SEVERITY_EMOJI[v.Severity] ?? ':white_circle:'} *<https://nvd.nist.gov/vuln/detail/${v.VulnerabilityID}|${v.VulnerabilityID}>* (CVSS: \`${v.CVSS?.nvd?.V3Score ?? 'N/A'}\`)`,
				`*Package:* \`${v.PkgName}@${v.InstalledVersion}\` → \`${v.FixedVersion ?? 'No fix available'}\``,
			].join('\n'),
		},
	});

	return [
		{
			type: 'header',
			text: { type: 'plain_text', text: ':warning: Trivy Scan: Vulnerabilities Detected' },
		},
		{
			type: 'section',
			fields: [
				{ type: 'mrkdwn', text: `*Repository:*\n<${repoUrl}|${repoName}>` },
				{ type: 'mrkdwn', text: `*Image:*\n\`${imageRef}\`` },
				{ type: 'mrkdwn', text: `*Critical:*\n:red_circle: ${counts.CRITICAL}` },
				{ type: 'mrkdwn', text: `*High:*\n:large_orange_circle: ${counts.HIGH}` },
				{ type: 'mrkdwn', text: `*Medium:*\n:large_yellow_circle: ${counts.MEDIUM}` },
				{ type: 'mrkdwn', text: `*Low:*\n:large_green_circle: ${counts.LOW}` },
			],
		},
		{
			type: 'context',
			elements: [
				{ type: 'mrkdwn', text: `:shield: ${uniqueVulns.length} unique CVEs affecting packages` },
			],
		},
		{ type: 'divider' },
		...uniqueVulns.slice(0, MAX_CVE_BLOCKS).map(cveBlock),
		{ type: 'divider' },
		{
			type: 'actions',
			elements: [
				{
					type: 'button',
					text: { type: 'plain_text', text: ':github: View Full Report' },
					style: 'primary',
					url: runUrl,
				},
			],
		},
	];
}
