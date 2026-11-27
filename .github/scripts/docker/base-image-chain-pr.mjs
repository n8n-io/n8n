#!/usr/bin/env node
/**
 * Prepares the next pin PR of a base image chain, after master published our
 * own images.
 *
 * A refresh PR that changes DHI_REF or DEBIAN_DHI_REF makes master publish a
 * new n8nio/base, and a second PR pins it (see docker/AGENTS.md). The Node PR
 * also changes NODE_VERSION, so master also publishes n8nio/node-pc and
 * n8nio/node-patched. The script reads the images that the publishing commit
 * tagged, and updates their pins in docker/docker-bake.hcl. For the Node PR, one
 * PR pins the images of both workflows when both published, so the Alpine and
 * the Debian images move to the new Node together.
 *
 * Usage: node base-image-chain-pr.mjs --workflow <file> --sha <commit>
 *   --subject <commit subject> --run-url <url> --body <file> [--any-commit]
 * Writes changed=true|false, title=<PR title> and branch=<PR branch> to
 * $GITHUB_OUTPUT, and the PR body to $GITHUB_STEP_SUMMARY.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { readNodeVersion } from '../resolve-node-version.mjs';
import { readPin } from './base-image-candidates.mjs';
import { GROUPS, updatePins } from './base-image-pin-pr.mjs';

const BAKE_FILE = 'docker/docker-bake.hcl';

/** The bake file's dhi_node_version(): dhi.io/node:26.13.0-alpine3.24-dev@... -> 26.13.0 */
const dhiNodeVersion = (ref) => /^dhi\.io\/node:([0-9.]+)-/.exec(ref)[1];

/** For each publishing workflow, the PR title and the pins of the images it tagged. */
export const CHAIN = {
	'build-base-image.yml': {
		title: 'build: Pin the base images that master published',
		pins: (hcl, sha) => [
			{
				name: 'RUNTIME_IMAGE',
				tag: `n8nio/base:${dhiNodeVersion(readPin(hcl, 'DHI_REF').ref)}-${sha}`,
			},
			{
				name: 'DEBIAN_RUNTIME_IMAGE',
				tag: `n8nio/base:${dhiNodeVersion(readPin(hcl, 'DEBIAN_DHI_REF').ref)}-debian-${sha}`,
			},
		],
	},
	'build-node-pc-image.yml': {
		title: 'build: Pin the Node builder images that master published',
		pins: (hcl, sha) => [
			{ name: 'N8N_BUILDER_IMAGE', tag: `n8nio/node-patched:${readNodeVersion(hcl)}-${sha}-dev` },
			{ name: 'PC_BUILDER_IMAGE', tag: `n8nio/node-pc:${readNodeVersion(hcl)}-${sha}-dev` },
		],
	},
};

/**
 * The titles of the refresh PRs, also the Node PR (`build: Update Node to <version>`).
 * Only their merge commits continue a chain.
 */
export const REFRESH_TITLES = Object.values(GROUPS);

export const isRefreshCommit = (subject) =>
	REFRESH_TITLES.some((title) => subject.startsWith(title));

/** The merge of the Node PR, which changes the inputs of every chain workflow. */
export const isNodeCommit = (subject) => subject.startsWith(`${GROUPS.node} `);

/** The branch of the chain PR of one workflow. */
export const chainBranchOf = (workflow) =>
	`base-image-refresh/chain-${workflow.replace(/\.yml$/, '')}`;

/** The chain PR of the Node PR: one PR for the images of every chain workflow. */
export const NODE_CHAIN = {
	title: 'build: Pin the images of the Node update that master published',
	branch: 'base-image-refresh/chain-node',
};

/** The master commit in the tag of a pin that n8n published (`-<sha>@` or `-<sha>-dev@`), or null. */
export const commitOf = (ref) => /-([0-9a-f]{40})(?:-dev)?@/.exec(ref)?.[1] ?? null;

/**
 * The pins to change. `publishedHcl` is the bake file at `sha`: the tags use
 * its versions, because master can change them after the run. `resolve`
 * returns the digest of a tag, or null when the run did not publish it (its
 * inputs did not change). `contains(older, newer)` tells whether master reached
 * `older` before `newer`, so a late run never moves a pin back to an older image.
 */
export async function planPins(hcl, workflow, sha, { publishedHcl = hcl, resolve, contains }) {
	const changes = [];
	for (const { name, tag } of CHAIN[workflow].pins(publishedHcl, sha)) {
		const digest = resolve(tag);
		if (!digest) continue;
		const pinned = readPin(hcl, name).ref;
		const newest = `${tag}@${digest}`;
		if (pinned === newest) continue;
		const pinnedCommit = commitOf(pinned);
		if (pinnedCommit && !(await contains(pinnedCommit, sha))) continue;
		changes.push({ source: name, pinned, newest });
	}
	return changes;
}

/**
 * The pins of the Node PR at `sha`: the images of every chain workflow. While
 * one workflow has not published yet, `missing` lists its tags and there is no
 * change, so the next workflow run opens the PR.
 */
export async function planNodeChain(hcl, sha, { publishedHcl = hcl, resolve, contains }) {
	const missing = Object.values(CHAIN)
		.flatMap(({ pins }) => pins(publishedHcl, sha))
		.map(({ tag }) => tag)
		.filter((tag) => !resolve(tag));
	if (missing.length > 0) return { changes: [], missing };
	const changes = [];
	for (const workflow of Object.keys(CHAIN)) {
		changes.push(...(await planPins(hcl, workflow, sha, { publishedHcl, resolve, contains })));
	}
	return { changes, missing };
}

/** The Markdown body of the chain PR. */
export function renderBody(changes, { runUrl, node = false }) {
	const intro = node
		? `Master published the images of the Node update ([publish run](${runUrl})). This PR pins them together, so the Alpine and the Debian images move to the new Node at once, as \`docker/AGENTS.md\` describes.`
		: `Master published new images of the base image chain ([publish run](${runUrl})). This PR pins them, as \`docker/AGENTS.md\` describes.`;
	return [
		intro,
		'',
		'| Pin | From | To |',
		'| --- | --- | --- |',
		...changes.map(
			({ source, pinned, newest }) => `| \`${source}\` | \`${pinned}\` | \`${newest}\` |`,
		),
		'',
		'_Opened by `sec-base-image-refresh.yml`._',
		'',
	].join('\n');
}

/** The digest of a tag, or null when the registry does not have the tag. */
export function resolveDigest(tag) {
	try {
		const out = execFileSync(
			'docker',
			['buildx', 'imagetools', 'inspect', tag, '--format', '{{json .Manifest}}'],
			{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
		);
		return JSON.parse(out).digest ?? null;
	} catch (error) {
		// The run did not publish the tag. Any other error stops the job, so a person can run it again.
		if (/: not found\b/.test(String(error.stderr ?? ''))) return null;
		throw error;
	}
}

/**
 * fetch, and once more after a network error. On the runners, a request after
 * a long step can go out on a keep-alive connection that the server already closed.
 */
export async function fetchWithRetry(url, init) {
	try {
		return await fetch(url, init);
	} catch (error) {
		// fetch rejects with a TypeError for network errors. A timeout is not a TypeError.
		if (!(error instanceof TypeError)) throw error;
		return await fetch(url, init);
	}
}

/** A GET request to the GitHub REST API of this repository. */
export async function github(path, accept) {
	const {
		GITHUB_API_URL = 'https://api.github.com',
		GITHUB_REPOSITORY,
		GITHUB_TOKEN,
	} = process.env;
	const response = await fetchWithRetry(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/${path}`, {
		headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept },
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) throw new Error(`${path} returned ${response.status}`);
	return response;
}

/** Whether `newer` contains `older` on master, from the GitHub compare API. */
export async function contains(older, newer) {
	const response = await github(`compare/${older}...${newer}`, 'application/vnd.github+json');
	const { status } = await response.json();
	return status === 'ahead' || status === 'identical';
}

/** The bake file at a commit. */
export async function bakeFileAt(sha) {
	const response = await github(
		`contents/${BAKE_FILE}?ref=${sha}`,
		'application/vnd.github.raw+json',
	);
	return await response.text();
}

async function main() {
	const { values } = parseArgs({
		options: {
			workflow: { type: 'string' },
			sha: { type: 'string' },
			subject: { type: 'string', default: '' },
			'run-url': { type: 'string' },
			body: { type: 'string' },
			'any-commit': { type: 'boolean', default: false },
		},
	});
	if (!CHAIN[values.workflow] || !/^[0-9a-f]{40}$/.test(values.sha ?? '') || !values.body) {
		throw new Error('--workflow, --sha <full commit SHA> and --body are required');
	}

	const node = !values['any-commit'] && isNodeCommit(values.subject);
	const { title, branch } = node
		? NODE_CHAIN
		: { title: CHAIN[values.workflow].title, branch: chainBranchOf(values.workflow) };
	let changes = [];
	if (node || values['any-commit'] || isRefreshCommit(values.subject)) {
		const hcl = readFileSync(BAKE_FILE, 'utf8');
		// Each workflow run of the Node PR checks the same tags, so resolve each tag once.
		const digests = new Map();
		const resolve = (tag) => {
			if (!digests.has(tag)) digests.set(tag, resolveDigest(tag));
			return digests.get(tag);
		};
		const deps = { publishedHcl: await bakeFileAt(values.sha), resolve, contains };
		if (node) {
			const plan = await planNodeChain(hcl, values.sha, deps);
			changes = plan.changes;
			if (plan.missing.length > 0)
				console.log(`The Node update waits for: ${plan.missing.join(', ')}`);
		} else {
			changes = await planPins(hcl, values.workflow, values.sha, deps);
		}
		if (changes.length > 0) {
			writeFileSync(BAKE_FILE, updatePins(hcl, changes));
			const body = renderBody(changes, { runUrl: values['run-url'], node });
			writeFileSync(values.body, body);
			if (process.env.GITHUB_STEP_SUMMARY)
				appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## The chain PR\n\n${body}`);
		}
		console.log(
			`${node ? 'Node update' : values.workflow}: ${changes.map((change) => change.source).join(', ') || 'no pin to change'}`,
		);
	} else {
		console.log(`Skip: ${values.sha} is not the merge of a refresh PR.`);
	}

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`changed=${changes.length > 0}\ntitle=${title}\nbranch=${branch}\n`,
		);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
