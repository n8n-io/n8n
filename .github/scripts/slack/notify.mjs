#!/usr/bin/env node
/**
 * Send a Slack chat.postMessage from a GitHub Actions step.
 *
 * Usage:
 *   node .github/scripts/slack/notify.mjs \
 *     --channel '#alerts-build' \
 *     --text 'CI failed on master'
 *
 * Rich blocks via a builder module under .github/scripts/slack/:
 *   node .github/scripts/slack/notify.mjs \
 *     --channel C0AHNJU9XFA \
 *     --text 'Trivy: 14 high vulns in nightly' \
 *     --blocks trivy \
 *     --results trivy-results.json \
 *     --image-ref $IMAGE_REF
 *
 * --blocks <name> resolves to ./build-<name>-blocks.mjs (default export receives the args).
 * Builders read repo / run context from $GITHUB_* runner env vars.
 *
 * Bot token: $SLACK_TOKEN (required).
 *
 * Exits non-zero on any Slack API error so the step fails loudly.
 */
import { pathToFileURL } from 'node:url';

export async function sendSlackMessage({ token, channel, text, blocks }) {
	const payload = { channel, text };
	if (blocks) payload.blocks = blocks;

	const res = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	});

	const body = await res.json();
	if (!body.ok) {
		console.error('Slack chat.postMessage failed:');
		console.error(JSON.stringify(body, null, 2));
		process.exit(1);
	}
	console.log(`Slack message posted to ${body.channel} at ts=${body.ts}`);
	return body;
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) continue;
		const key = a.slice(2);
		const next = argv[i + 1];
		const value = next && !next.startsWith('--') ? next : 'true';
		out[key] = value;
		if (value !== 'true') i++;
	}
	return out;
}

function kebabToCamel(s) {
	return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	const channel = args.channel;
	const text = args.text;
	const blocksName = args.blocks;

	if (!channel) throw new Error('--channel is required');
	if (!text) throw new Error('--text is required');

	const token = process.env.SLACK_TOKEN;
	if (!token) throw new Error('SLACK_TOKEN env var is required');

	let blocks;
	if (blocksName) {
		const { default: builder } = await import(`./build-${blocksName}-blocks.mjs`);
		const builderArgs = Object.fromEntries(
			Object.entries(args)
				.filter(([k]) => k !== 'channel' && k !== 'text' && k !== 'blocks')
				.map(([k, v]) => [kebabToCamel(k), v]),
		);
		blocks = builder(builderArgs);
	}

	await sendSlackMessage({ token, channel, text, blocks });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
