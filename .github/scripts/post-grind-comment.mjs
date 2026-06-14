#!/usr/bin/env node
/**
 * Posts or updates a sticky PR comment with grind results.
 *
 * Modelled on post-qa-metrics-comment.mjs — finds the existing comment by
 * its `<!-- grind-results -->` marker and PATCHes it in place; falls back
 * to creating a new comment when none exists.
 *
 * Usage:
 *   node .github/scripts/post-grind-comment.mjs --body grind-comment.md
 *   node .github/scripts/post-grind-comment.mjs --body grind-comment.md --pr 31095 --dry-run
 *
 * Env:
 *   GITHUB_TOKEN - required unless --dry-run
 *   GITHUB_REPOSITORY - auto-set in CI (e.g. n8n-io/n8n)
 *   GITHUB_REF - auto-set in CI; PR number is derived from it if --pr omitted
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const MARKER = '<!-- grind-results -->';

const { values } = parseArgs({
	options: {
		body: { type: 'string' },
		pr: { type: 'string' },
		'dry-run': { type: 'boolean', default: false },
	},
	strict: true,
});

if (!values.body) {
	console.error('--body <path> is required');
	process.exit(1);
}

const body = readFileSync(values.body, 'utf8');
if (!body.startsWith(MARKER)) {
	console.error(`Comment body must start with marker ${MARKER}`);
	process.exit(1);
}

const pr = parseInt(values.pr ?? inferPr() ?? '', 10);
if (!pr) {
	console.error('--pr is required (or set GITHUB_REF=refs/pull/<n>/...)');
	process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY ?? 'n8n-io/n8n';

if (values['dry-run']) {
	console.log(`--- DRY RUN: would post to ${repo}#${pr} ---`);
	console.log(body);
	process.exit(0);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
	console.error('GITHUB_TOKEN is required to post comments');
	process.exit(1);
}

const [owner, repoName] = repo.split('/');
const headers = {
	Accept: 'application/vnd.github+json',
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json',
};

const listRes = await fetch(
	`https://api.github.com/repos/${owner}/${repoName}/issues/${pr}/comments?per_page=100`,
	{ headers },
);
if (!listRes.ok) {
	console.error(`List comments failed: ${listRes.status} ${listRes.statusText}`);
	process.exit(1);
}
const comments = await listRes.json();
const existing = Array.isArray(comments)
	? comments.find((c) => typeof c.body === 'string' && c.body.startsWith(MARKER))
	: null;

if (existing) {
	const patchRes = await fetch(
		`https://api.github.com/repos/${owner}/${repoName}/issues/comments/${existing.id}`,
		{ method: 'PATCH', headers, body: JSON.stringify({ body }) },
	);
	if (!patchRes.ok) {
		console.error(`Patch failed: ${patchRes.status} ${patchRes.statusText}`);
		process.exit(1);
	}
	console.log(`Updated comment ${existing.id}`);
} else {
	const postRes = await fetch(
		`https://api.github.com/repos/${owner}/${repoName}/issues/${pr}/comments`,
		{ method: 'POST', headers, body: JSON.stringify({ body }) },
	);
	if (!postRes.ok) {
		console.error(`Create failed: ${postRes.status} ${postRes.statusText}`);
		process.exit(1);
	}
	const created = await postRes.json();
	console.log(`Created comment ${created.id}`);
}

function inferPr() {
	const match = (process.env.GITHUB_REF ?? '').match(/refs\/pull\/(\d+)/);
	return match?.[1];
}
