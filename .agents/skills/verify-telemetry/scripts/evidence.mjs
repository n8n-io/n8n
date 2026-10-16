#!/usr/bin/env node
// Prints the evidence block for the local telemetry stand (see ../SKILL.md).
// usage: evidence.mjs [--stand-dir DIR] [--base-url URL] [--repo DIR] <n8n.audit.name | "Telemetry event name">...
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
	const index = args.indexOf(name);
	if (index === -1) return fallback;
	const [, value] = args.splice(index, 2);
	return value;
};
const standDir = option('--stand-dir', process.env.N8N_STAND_DIR ?? '/tmp/n8n-telemetry-stand');
const baseUrl = option('--base-url', 'http://localhost:5678');
const repo = option('--repo', process.cwd());
const names = args;
if (names.length === 0) {
	console.error(
		'usage: evidence.mjs [--stand-dir DIR] [--base-url URL] <n8n.audit.name | "Telemetry event name">...',
	);
	process.exit(2);
}
const auditNames = names.filter((name) => name.startsWith('n8n.'));
const telemetryNames = names.filter((name) => !name.startsWith('n8n.'));

const readLines = (file) =>
	existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
const parseJson = (text) => {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
};
const fetchText = (url) => {
	try {
		return execSync(`curl -sf ${JSON.stringify(url)}`, { encoding: 'utf8' });
	} catch {
		return '';
	}
};

// Audit events: one JSON object per line. n8n rotates the file on every start
// (n8nEventLog-1.log is the previous run), so read every rotation, oldest first.
const auditDir = path.join(standDir, 'home', '.n8n');
const rotation = (file) => Number(/-(\d+)\.log$/.exec(file)?.[1] ?? 0);
const auditFiles = existsSync(auditDir)
	? readdirSync(auditDir)
			.filter((file) => /^n8nEventLog(-\d+)?\.log$/.test(file))
			.sort((a, b) => rotation(b) - rotation(a))
	: [];
const audit = new Map(auditNames.map((name) => [name, { count: 0, last: undefined }]));
for (const file of auditFiles) {
	for (const line of readLines(path.join(auditDir, file))) {
		const event = parseJson(line);
		const entry = event && audit.get(event.eventName);
		if (entry) {
			entry.count += 1;
			entry.last = event;
		}
	}
}

// Telemetry: every request the clients sent to the capture server, grouped by source.
const captureFile = path.join(standDir, 'capture.log');
const sourceOf = (url) => {
	if (url === '/v1/batch') return 'backend RudderStack';
	if (url.startsWith('/v1/')) return 'browser RudderStack';
	if (/batch|capture|^\/e\/?/.test(url)) return 'PostHog';
	return url;
};
const telemetry = new Map(telemetryNames.map((name) => [name, new Map()]));
for (const line of readLines(captureFile)) {
	const request = parseJson(line);
	const body = request?.body ? parseJson(request.body) : undefined;
	if (!body) continue;
	const messages = Array.isArray(body.batch) ? body.batch : body.event ? [body] : [];
	for (const message of messages) {
		const bySource = telemetry.get(message.event);
		if (!bySource) continue;
		const source = sourceOf(request.url);
		const entry = bySource.get(source) ?? { count: 0, last: undefined };
		entry.count += 1;
		entry.last = { at: request.at, properties: message.properties };
		bySource.set(source, entry);
	}
}

// Prometheus: counters derived from the audit names, summed over label sets.
const metrics = fetchText(`${baseUrl}/metrics`);
const counterName = (auditName) => `${auditName.replace(/^n8n\./, 'n8n_').replace(/\./g, '_')}_total`;
const counterValue = (name) => {
	let total = 0;
	let found = false;
	for (const line of metrics.split('\n')) {
		if (line.startsWith(`${name} `) || line.startsWith(`${name}{`)) {
			found = true;
			total += Number(line.trim().split(/\s+/).pop());
		}
	}
	return found ? total : undefined;
};

const cliPackage = parseJson(
	existsSync(path.join(repo, 'packages/cli/package.json'))
		? readFileSync(path.join(repo, 'packages/cli/package.json'), 'utf8')
		: '',
);
const version = cliPackage?.version ?? 'unknown version';
let commit = 'unknown commit';
try {
	commit = execSync('git rev-parse --short HEAD', { cwd: repo, encoding: 'utf8' }).trim();
} catch {
	// not a git checkout
}
const when = `${new Date().toISOString().slice(0, 16)}Z`;

const rows = [];
for (const [name, entry] of audit) rows.push(`| Audit \`${name}\` | n8nEventLog.log | ${entry.count} |`);
for (const [name, bySource] of telemetry) {
	if (bySource.size === 0) rows.push(`| Telemetry \`${name}\` | capture.log | 0 |`);
	for (const [source, entry] of bySource) rows.push(`| Telemetry \`${name}\` | ${source} | ${entry.count} |`);
}
for (const name of auditNames) {
	const counter = counterName(name);
	const value = counterValue(counter);
	rows.push(`| Counter \`${counter}\` | GET /metrics | ${value ?? (metrics ? 'absent' : 'stand not reachable')} |`);
}

const details = (title, value) =>
	value === undefined
		? ''
		: `\n<details><summary>${title}</summary>\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n</details>\n`;

let out = `### Local verification: ${names.join(', ')}\n`;
out += `Stand: n8n ${version} · ${commit} · ${when}\n`;
out += 'Action: <what was triggered, how many times, through which paths>\n\n';
out += `| Signal | Source | Count |\n|---|---|---|\n${rows.join('\n')}\n`;
for (const [name, entry] of audit) out += details(`Last audit event \`${name}\``, entry.last);
for (const [name, bySource] of telemetry) {
	for (const [source, entry] of bySource) {
		out += details(`Last telemetry payload \`${name}\`, ${source}`, entry.last?.properties);
	}
}
const nothing =
	[...audit.values()].every((entry) => entry.count === 0) &&
	[...telemetry.values()].every((bySource) => bySource.size === 0);
if (nothing) out += '\nNo matching events yet: trigger the action, wait ten seconds for the RudderStack flush, rerun.\n';
if (auditFiles.length > 1) {
	out += `\nAudit counts include ${auditFiles.length - 1} rotated log file(s) from earlier starts; the Prometheus counter counts since the last start only.\n`;
}
process.stdout.write(out);
