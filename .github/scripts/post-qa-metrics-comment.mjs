#!/usr/bin/env node
/**
 * Fetches QA metric comparisons and posts/updates a PR comment.
 *
 * Usage:
 *   node .github/scripts/post-qa-metrics-comment.mjs --metrics memory-heap-used-baseline
 *   node .github/scripts/post-qa-metrics-comment.mjs --metrics memory-heap-used-baseline --pr 27880 --dry-run
 *
 * Env:
 *   QA_METRICS_COMMENT_WEBHOOK_URL - n8n workflow webhook (required)
 *   QA_METRICS_WEBHOOK_USER/PASSWORD - Basic auth for webhook
 *   GITHUB_TOKEN - For posting comments (not needed with --dry-run)
 *   GITHUB_REF, GITHUB_REPOSITORY, GITHUB_SHA - Auto-set in CI
 */

import { parseArgs } from 'node:util';

const MARKER = '<!-- n8n-qa-metrics-comparison -->';

const { values } = parseArgs({
	options: {
		metrics: { type: 'string' },
		pr: { type: 'string' },
		'baseline-days': { type: 'string', default: '14' },
		'dry-run': { type: 'boolean', default: false },
	},
	strict: true,
});

const metrics = values.metrics?.split(',').map((m) => m.trim());
if (!metrics?.length) {
	console.error('--metrics is required (comma-separated metric names)');
	process.exit(1);
}

const pr = parseInt(values.pr ?? inferPr(), 10);
if (!pr) {
	console.error('--pr is required (or set GITHUB_REF)');
	process.exit(1);
}

const webhookUrl = process.env.QA_METRICS_COMMENT_WEBHOOK_URL;
if (!webhookUrl) {
	console.error('QA_METRICS_COMMENT_WEBHOOK_URL is required');
	process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY ?? 'n8n-io/n8n';
const sha = process.env.GITHUB_SHA?.slice(0, 8) ?? '';
const baselineDays = parseInt(values['baseline-days'], 10);

// --- Fetch ---

const headers = { 'Content-Type': 'application/json' };
const user = process.env.QA_METRICS_WEBHOOK_USER;
const pass = process.env.QA_METRICS_WEBHOOK_PASSWORD;
if (user && pass) {
	headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

console.log(`PR #${pr}: fetching ${metrics.join(', ')} (${baselineDays}-day baseline)`);

let res;
try {
	res = await fetch(webhookUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			pr_number: pr,
			github_repo: repo,
			git_sha: sha,
			baseline_days: baselineDays,
			metric_names: metrics,
		}),
		signal: AbortSignal.timeout(60_000),
	});
} catch (err) {
	console.warn(`Webhook unreachable, skipping metrics comment: ${err.message}`);
	process.exit(0);
}

if (!res.ok) {
	const text = await res.text().catch(() => '');
	console.warn(`Webhook failed: ${res.status} ${res.statusText}\n${text}`);
	console.warn('Skipping metrics comment.');
	process.exit(0);
}

const { markdown, has_data } = await res.json();

if (!has_data || !markdown) {
	console.log('No metric data available, skipping.');
	process.exit(0);
}

if (values['dry-run']) {
	console.log('\n--- DRY RUN ---\n');
	console.log(markdown);
	process.exit(0);
}

// --- Post comment ---

const token = process.env.GITHUB_TOKEN;
if (!token) {
	console.error('GITHUB_TOKEN is required to post comments');
	process.exit(1);
}

const [owner, repoName] = repo.split('/');
const ghHeaders = {
	Accept: 'application/vnd.github+json',
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json',
};

const comments = await fetch(
	`https://api.github.com/repos/${owner}/${repoName}/issues/${pr}/comments?per_page=100`,
	{ headers: ghHeaders },
).then((r) => r.json());

const existing = Array.isArray(comments)
	? comments.find((c) => c.body?.includes(MARKER))
	: null;

if (existing) {
	await fetch(
		`https://api.github.com/repos/${owner}/${repoName}/issues/comments/${existing.id}`,
		{ method: 'PATCH', headers: ghHeaders, body: JSON.stringify({ body: markdown }) },
	);
	console.log(`Updated comment ${existing.id}`);
} else {
	const created = await fetch(
		`https://api.github.com/repos/${owner}/${repoName}/issues/${pr}/comments`,
		{ method: 'POST', headers: ghHeaders, body: JSON.stringify({ body: markdown }) },
	).then((r) => r.json());
	console.log(`Created comment ${created.id}`);
}

function inferPr() {
	const match = (process.env.GITHUB_REF ?? '').match(/refs\/pull\/(\d+)/);
	return match?.[1];
}
