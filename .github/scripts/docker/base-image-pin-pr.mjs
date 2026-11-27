#!/usr/bin/env node
/**
 * Prepares a pin PR from the result of base-image-candidates.mjs.
 *
 * The daily PR takes the ready candidates with auto-merge. The review PR takes
 * the ready candidates without auto-merge (they add a package, or a manual run
 * skipped the 24-hour gate), so a person reviews them. The Node PR takes the
 * Node patch: all Node pins and NODE_VERSION. The script updates the pins in
 * docker/docker-bake.hcl and writes the PR body.
 *
 * Usage: node base-image-pin-pr.mjs --candidates <json> --group daily|review|node
 *   --body <file>
 * Writes changed=true|false, sources=<names> and title=<PR title> to
 * $GITHUB_OUTPUT, and the PR body to $GITHUB_STEP_SUMMARY, so a preview run
 * shows the PR.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { SEVERITIES } from './base-image-candidates.mjs';

const BAKE_FILE = 'docker/docker-bake.hcl';

/** The PR title of each group. The chain continues after the merge of these PRs. */
export const GROUPS = {
	daily: 'build: Update base image digests with fewer OS findings',
	review: 'build: Update base image digests that need a review',
	node: 'build: Update Node to',
};

/** The group of a ready result. A result from before the `group` field has only `autoMerge`. */
const groupOf = (result) => result.group ?? (result.autoMerge ? 'daily' : 'review');

/** The ready candidates of a group. */
export function selectGroup(results, group) {
	return results.filter((result) => result.status === 'ready' && groupOf(result) === group);
}

/** The PR title of a group. The Node PR names the new version. */
export function titleOf(group, results) {
	return group === 'node' ? `${GROUPS.node} ${results[0].nodePatch.to}` : GROUPS[group];
}

/** Sets NODE_VERSION from `from` to `to`. */
export function updateNodeVersion(hcl, { from, to }) {
	const line = (version) => `variable "NODE_VERSION" { default = "${version}" }`;
	const count = hcl.split(line(from)).length - 1;
	if (count !== 1) throw new Error(`NODE_VERSION ${from} is in ${BAKE_FILE} ${count} times`);
	return hcl.replace(line(from), line(to));
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
	const lines = [];
	if (group === 'node') {
		const { from, to, security } = results[0].nodePatch;
		lines.push(
			`This PR updates Node from \`${from}\` to \`${to}\`: \`NODE_VERSION\` and all the Node pins below. The Alpine and the Debian images stay on the same Node, and CI reads \`NODE_VERSION\`.`,
			'',
		);
		if (security)
			lines.push(
				`nodejs.org marks a patch up to \`${to}\` as a security release: see the [Node.js security releases](https://nodejs.org/en/blog/vulnerability).`,
				'',
			);
		lines.push(
			'This PR has no auto-merge. After the merge, master compiles `n8nio/node-pc` and `n8nio/node-patched` from the new Node, and the chain PRs pin the new images.',
			'',
		);
	} else {
		lines.push(
			'This PR updates the base image pins below to digests with fewer fixable OS findings.',
			'',
		);
	}
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
		const removed = removedFindings(result);
		if (removed.length === 0) {
			lines.push(
				result.platforms.length === 0
					? 'The release images take only the Node of this image, so no scan covers it.'
					: 'This pin removes no fixable OS finding.',
				'',
			);
			continue;
		}
		lines.push(
			'| CVE | Severity | Package | Installed | Fixed | Platforms |',
			'| --- | --- | --- | --- | --- | --- |',
		);
		for (const finding of removed) {
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
		throw new Error('--candidates, --group daily|review|node and --body are required');
	}

	const results = selectGroup(JSON.parse(readFileSync(values.candidates, 'utf8')), values.group);
	if (results.length > 0) {
		let hcl = updatePins(readFileSync(BAKE_FILE, 'utf8'), results);
		if (values.group === 'node') hcl = updateNodeVersion(hcl, results[0].nodePatch);
		writeFileSync(BAKE_FILE, hcl);
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
		const title = results.length > 0 ? titleOf(values.group, results) : '';
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`changed=${results.length > 0}\nsources=${sources}\ntitle=${title}\n`,
		);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
