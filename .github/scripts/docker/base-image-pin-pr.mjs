#!/usr/bin/env node
/**
 * Prepares a pin PR from the result of base-image-candidates.mjs.
 *
 * The daily PR takes the ready candidates with auto-merge. The review PR takes
 * the ready candidates without auto-merge (they add a package, or a manual run
 * skipped the 24-hour gate), so a person reviews them. The script updates their
 * pins in docker/docker-bake.hcl and writes the PR body.
 *
 * Usage: node base-image-pin-pr.mjs --candidates <json> --group daily|review
 *   --body <file>
 * Writes changed=true|false and sources=<names> to $GITHUB_OUTPUT, and the PR
 * body to $GITHUB_STEP_SUMMARY, so a preview run shows the PR.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { SEVERITIES } from './base-image-candidates.mjs';

const BAKE_FILE = 'docker/docker-bake.hcl';

export const GROUPS = {
	daily: (result) => result.autoMerge === true,
	review: (result) => result.autoMerge === false,
};

/** The ready candidates of a group. */
export function selectGroup(results, group) {
	return results.filter((result) => result.status === 'ready' && GROUPS[group](result));
}

/** Replaces the pinned ref of each result with its newest ref. */
export function updatePins(hcl, results) {
	let updated = hcl;
	for (const result of results) {
		const quoted = `"${result.pinned}"`;
		const count = updated.split(quoted).length - 1;
		if (count !== 1) throw new Error(`${result.pinned} is in ${BAKE_FILE} ${count} times`);
		updated = updated.replace(quoted, `"${result.newest}"`);
	}
	return updated;
}

const digestOf = (ref) => ref.split('@')[1].slice(0, 'sha256:'.length + 12);

/** The removed findings of a result, once for each CVE and package, with their platforms. */
export function removedFindings(result) {
	const findings = new Map();
	for (const platform of result.platforms) {
		for (const finding of platform.removed) {
			const key = `${finding.id} ${finding.pkg}`;
			const entry = findings.get(key) ?? { ...finding, platforms: [] };
			entry.platforms.push(platform.platform);
			findings.set(key, entry);
		}
	}
	return [...findings.values()].sort(
		(a, b) =>
			SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.id.localeCompare(b.id),
	);
}

/** The Markdown body of the pin PR. */
export function renderBody(results, { group, runUrl }) {
	const lines = [
		'This PR updates the base image pins below to digests with fewer fixable OS findings.',
		'',
	];
	if (group === 'review') {
		lines.push(
			'This PR has no auto-merge. Review each pin below before you merge: it adds packages to the image, or a manual run skipped the 24-hour gate.',
			'',
		);
	}
	for (const result of results) {
		lines.push(
			`### \`${result.source}\``,
			'',
			`\`${digestOf(result.pinned)}…\` → \`${result.newest}\``,
			'',
			`Publisher: ${result.publisher.publisher}, verified. Published: ${result.publisher.publishedAt ?? 'unknown'}.`,
			'',
		);
		if (result.gateSkipped)
			lines.push(
				`A manual run skipped the 24-hour gate: ${result.publisher.publishedAt ? 'this digest is less than 24 hours old' : 'the publish time of this digest is unknown'}.`,
				'',
			);
		const added = [...new Set(result.platforms.flatMap((platform) => platform.addedPackages))];
		if (added.length > 0)
			lines.push(`New packages: ${added.map((name) => `\`${name}\``).join(', ')}.`, '');
		lines.push(
			'| CVE | Severity | Package | Installed | Fixed | Platforms |',
			'| --- | --- | --- | --- | --- | --- |',
		);
		for (const finding of removedFindings(result)) {
			lines.push(
				`| ${finding.id} | ${finding.severity} | ${finding.pkg} | ${finding.installed} | ${finding.fixed} | ${finding.platforms.join(', ')} |`,
			);
		}
		lines.push('');
	}
	lines.push(`_Opened by \`sec-base-image-refresh.yml\` ([run](${runUrl}))._`);
	return `${lines.join('\n')}\n`;
}

function main() {
	const { values } = parseArgs({
		options: {
			candidates: { type: 'string' },
			group: { type: 'string' },
			body: { type: 'string' },
		},
	});
	if (!values.candidates || !GROUPS[values.group] || !values.body) {
		throw new Error('--candidates, --group daily|review and --body are required');
	}

	const results = selectGroup(JSON.parse(readFileSync(values.candidates, 'utf8')), values.group);
	if (results.length > 0) {
		writeFileSync(BAKE_FILE, updatePins(readFileSync(BAKE_FILE, 'utf8'), results));
		const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
		const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
		const body = renderBody(results, { group: values.group, runUrl });
		writeFileSync(values.body, body);
		if (process.env.GITHUB_STEP_SUMMARY)
			appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## The ${values.group} PR\n\n${body}`);
	}

	const sources = results.map((result) => result.source).join(',');
	console.log(`${values.group}: ${sources || 'no ready candidate'}`);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`changed=${results.length > 0}\nsources=${sources}\n`,
		);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
