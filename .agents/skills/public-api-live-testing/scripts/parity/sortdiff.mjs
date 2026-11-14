#!/usr/bin/env node
// Compares two result files from run.mjs and groups body differences by cause.
// Usage: node sortdiff.mjs <masterFile> <branchFile>
// Exits 1 when any case differs.

import { readFileSync } from 'node:fs';

const [masterFile, branchFile] = process.argv.slice(2);
if (!masterFile || !branchFile) {
	console.error('Usage: node sortdiff.mjs <masterFile> <branchFile>');
	process.exit(2);
}

const master = JSON.parse(readFileSync(masterFile, 'utf8'));
const branch = JSON.parse(readFileSync(branchFile, 'utf8'));

function sortKeys(value) {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, sortKeys(value[key])]),
		);
	}
	return value;
}

// Values that differ between two independently seeded instances.
function normalize(value) {
	return JSON.stringify(sortKeys(value), null, 1)
		.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<TS>')
		.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
		.replace(
			/"(id|workflowId|projectId|versionId|activeVersionId|sourceWorkflowId|userId|parentFolderId)": "[^"]*"/g,
			'"$1": "<ID>"',
		);
}

const oneLine = (text, max) => text.replace(/\s+/g, ' ').slice(0, max);

// Multiset difference, so a line that repeats a different number of times shows up.
function linesNotIn(text, other) {
	const remaining = new Map();
	for (const line of other.split('\n')) remaining.set(line, (remaining.get(line) ?? 0) + 1);
	const result = [];
	for (const line of text.split('\n')) {
		const count = remaining.get(line) ?? 0;
		if (count > 0) remaining.set(line, count - 1);
		else result.push(line.trim());
	}
	return result.sort();
}

const keys = [...new Set([...Object.keys(master), ...Object.keys(branch)])].sort();
const missing = [];
const statusDiffs = [];
const bodyDiffs = [];

for (const key of keys) {
	const m = master[key];
	const b = branch[key];
	if (!m || !b) {
		missing.push({ key, side: m ? 'master only' : 'branch only' });
		continue;
	}
	if (m.status !== b.status) {
		statusDiffs.push({ key, m, b });
		continue;
	}
	const masterBody = normalize(m.body);
	const branchBody = normalize(b.body);
	if (masterBody !== branchBody) bodyDiffs.push({ key, masterBody, branchBody });
}

const identical = keys.length - missing.length - statusDiffs.length - bodyDiffs.length;
console.log(
	`total ${keys.length} | missing ${missing.length} | status-diff ${statusDiffs.length} | body-diff ${bodyDiffs.length} | identical ${identical}`,
);

if (missing.length) {
	console.log('\n=== MISSING (case exists on one side only) ===');
	for (const { key, side } of missing) console.log(`  ${key}: ${side}`);
}

if (statusDiffs.length) {
	console.log('\n=== STATUS CODE DIFFS ===');
	for (const { key, m, b } of statusDiffs) {
		console.log(`\n--- ${key}: master ${m.status} -> branch ${b.status}`);
		console.log(`  master: ${oneLine(normalize(m.body), 300)}`);
		console.log(`  branch: ${oneLine(normalize(b.body), 300)}`);
	}
}

if (bodyDiffs.length) {
	console.log('\n=== BODY DIFFS, SAME STATUS (key order ignored, grouped by cause) ===');
	const groups = new Map();
	for (const { key, masterBody, branchBody } of bodyDiffs) {
		const signature = JSON.stringify({
			masterOnly: linesNotIn(masterBody, branchBody),
			branchOnly: linesNotIn(branchBody, masterBody),
		});
		if (!groups.has(signature)) groups.set(signature, []);
		groups.get(signature).push(key);
	}
	let index = 0;
	for (const [signature, groupKeys] of groups) {
		const { masterOnly, branchOnly } = JSON.parse(signature);
		console.log(
			`\n--- group ${++index} (${groupKeys.length} cases), e.g. ${groupKeys.slice(0, 3).join(', ')}`,
		);
		console.log('  master-only lines:', JSON.stringify(masterOnly).slice(0, 700));
		console.log('  branch-only lines:', JSON.stringify(branchOnly).slice(0, 700));
	}
}

process.exit(identical === keys.length ? 0 : 1);
