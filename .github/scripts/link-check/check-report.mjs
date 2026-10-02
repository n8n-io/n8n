#!/usr/bin/env node
/**
 * Decide which failures in a lychee JSON report are broken links.
 *
 * Usage:
 *   node .github/scripts/link-check/check-report.mjs lychee-report.json
 *
 * Lychee cannot do this itself: it cannot run a browser, it checks anchors the
 * same way on all hosts, and it does not know when a line changed.
 *
 * - Missing anchors count only on docs.n8n.io. Many other sites add their
 *   anchors with JavaScript.
 * - 403, 429, 999, rejected redirects, 5xx, timeouts, and network errors open
 *   again in headless Chrome. Many sites block HTTP clients but serve browsers,
 *   and a later request shows if a failure persists. Chrome opens no new links
 *   after 8 minutes, and an open page can take one more minute. Links that
 *   Chrome did not open count as broken.
 * - A broken docs.n8n.io link on a line that changed in the last 30 days is
 *   pending, because code often ships before its docs page. Needs git history
 *   for that period.
 * - Other failures, such as 404, are broken.
 *
 * Prints the broken and pending links, adds them to $GITHUB_STEP_SUMMARY, and
 * exits 1 if there are broken links. Needs Chrome, which GitHub-hosted Ubuntu
 * runners include.
 */
import { execFileSync } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const STRICT_ANCHOR_HOST = 'docs.n8n.io';
const BROWSER_CONCURRENCY = 4;
const BROWSER_BUDGET_MS = 8 * 60 * 1000;
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const BROWSER_STATUSES = new Set([403, 429, 999]);
const CHALLENGE_TITLE = /just a moment|attention required|security checkpoint/i;

export function collectFailures(report) {
	const failures = [
		...Object.entries(report.error_map ?? {}),
		...Object.entries(report.timeout_map ?? {}),
	].flatMap(([file, entries]) =>
		entries.map((entry) => ({
			file,
			line: entry.span?.line,
			url: entry.url,
			// A remapped URL is checked at its new address. The report shows the URL from the code.
			sourceUrl: entry.remap?.original?.url ?? entry.url,
			code: entry.status?.code ?? null,
			text: entry.status?.text ?? '',
		})),
	);

	// Lychee reports a repeated URL as "Error (cached)" without the reason.
	const firstReport = new Map(
		failures.filter((f) => !f.text.includes('(cached)')).map((f) => [f.url, f]),
	);
	return failures.map((f) => {
		const first = firstReport.get(f.url);
		return first ? { ...f, code: first.code, text: first.text } : f;
	});
}

export function classify({ url, code, text }) {
	if (code === null && /fragment/i.test(text)) {
		return new URL(url).hostname === STRICT_ANCHOR_HOST ? 'broken' : 'ignore';
	}
	if (
		/^timeout$|^network error/i.test(text) ||
		BROWSER_STATUSES.has(code) ||
		(code >= 300 && code < 400) ||
		code >= 500
	) {
		return 'browser';
	}
	return 'broken';
}

export function isBrowserPass({ status, title }) {
	return (
		status > 0 && status < 400 && !/\b404\b|not found/i.test(title) && !CHALLENGE_TITLE.test(title)
	);
}

/** Returns the commit time of a `git blame --porcelain` line in ms, or null if the commit is at the edge of the fetched history. */
export function parseBlameTime(porcelain) {
	if (/^boundary$/m.test(porcelain)) return null;
	const time = porcelain.match(/^committer-time (\d+)$/m);
	return time ? Number(time[1]) * 1000 : null;
}

export function isInGracePeriod({ url }, changedAt, now) {
	return (
		new URL(url).hostname === STRICT_ANCHOR_HOST &&
		changedAt !== null &&
		now - changedAt < GRACE_PERIOD_MS
	);
}

function lineChangedAt({ file, line }) {
	try {
		const porcelain = execFileSync(
			'git',
			['blame', '--porcelain', '-L', `${line},${line}`, '--', file],
			{
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			},
		);
		return parseBlameTime(porcelain);
	} catch {
		// A line that git cannot blame counts as old, so the link is reported.
		return null;
	}
}

async function checkPage(context, url) {
	const page = await context.newPage();
	try {
		const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
		let status = response?.status() ?? 0;
		page.on('response', (r) => {
			if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) status = r.status();
		});
		// Bot challenges such as Cloudflare's pass after a few seconds, then reload the page.
		await page
			.waitForFunction(
				(source) => !new RegExp(source, 'i').test(document.title),
				CHALLENGE_TITLE.source,
				{ timeout: 30_000 },
			)
			.catch(() => {});
		const result = { status, title: await page.title() };
		console.log(`browser: ${result.status} "${result.title}" ${url}`);
		return result;
	} catch (error) {
		const reason = error.message.split('\n')[0];
		console.log(`browser: failed ${url}: ${reason}`);
		return { status: 0, title: reason };
	} finally {
		await page.close();
	}
}

/** Splits URLs into groups by host, so that each host gets one request at a time. */
export function groupByHost(urls) {
	return [...Map.groupBy(urls, (url) => new URL(url).hostname).values()];
}

async function checkInBrowser(urls) {
	const { chromium } = await import('playwright-core');
	const browser = await chromium.launch({ channel: 'chrome' });
	const version = browser.version();
	// The default headless user agent contains "HeadlessChrome", which bot filters block.
	const context = await browser.newContext({
		userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`,
	});

	const queue = groupByHost(urls);
	const results = new Map();
	const skipped = [];
	const deadline = Date.now() + BROWSER_BUDGET_MS;
	const worker = async () => {
		for (let group = queue.shift(); group; group = queue.shift()) {
			for (const url of group) {
				if (Date.now() > deadline) skipped.push(url);
				else results.set(url, await checkPage(context, url));
			}
		}
	};
	await Promise.all(Array.from({ length: BROWSER_CONCURRENCY }, worker));
	await browser.close();
	if (skipped.length > 0) {
		console.log(`browser: time budget used, did not open ${skipped.length} links`);
	}
	return results;
}

function formatReport(broken) {
	const byUrl = Map.groupBy(broken, (f) => f.url);
	return [...byUrl].map(([url, list]) => {
		const where = list.map((f) => `${f.file}:${f.line}`).join(', ');
		return `- ${list[0].sourceUrl} (${list[0].text || list[0].code}) in ${where}`;
	});
}

async function main() {
	const [reportPath] = process.argv.slice(2);
	if (!reportPath) throw new Error('Usage: check-report.mjs <lychee-report.json>');

	const report = JSON.parse(await readFile(reportPath, 'utf8'));
	// An empty or unexpected report means lychee checked nothing, not that every link works.
	if (!('error_map' in report) || !report.total) {
		throw new Error(`Lychee report has no checked links: ${reportPath}`);
	}
	const failures = collectFailures(report);
	const toBrowser = [
		...new Set(failures.filter((f) => classify(f) === 'browser').map((f) => f.url)),
	];
	const browserResults = toBrowser.length > 0 ? await checkInBrowser(toBrowser) : new Map();

	const broken = failures.flatMap((f) => {
		const kind = classify(f);
		if (kind === 'broken') return [f];
		if (kind !== 'browser') return [];
		// Links that Chrome did not open keep the reason from lychee.
		const result = browserResults.get(f.url);
		if (!result) return [f];
		return isBrowserPass(result)
			? []
			: [{ ...f, text: `browser ${result.status} "${result.title}"` }];
	});
	const now = Date.now();
	const pending = new Set(broken.filter((f) => isInGracePeriod(f, lineChangedAt(f), now)));
	const lines = formatReport(broken.filter((f) => !pending.has(f)));
	const pendingLines = formatReport([...pending]);
	const summary = [
		lines.length === 0
			? 'No broken links found.'
			: `Found ${lines.length} broken links:\n\n${lines.join('\n')}`,
		pendingLines.length > 0 &&
			`${pendingLines.length} docs.n8n.io links changed in the last 30 days and do not work yet:\n\n${pendingLines.join('\n')}`,
	]
		.filter(Boolean)
		.join('\n\n');

	console.log(summary);
	if (process.env.GITHUB_STEP_SUMMARY) {
		await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Link check\n\n${summary}\n`);
	}
	if (lines.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
