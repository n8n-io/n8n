#!/bin/bash
set -euo pipefail

node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function walk(directory) {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap(function mapEntry(entry) {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) return walk(target);
		return target.endsWith('.vue') ? [target] : [];
	});
}

const files = walk('src');
let violations = 0;
let checks = 0;

for (const file of files) {
	const source = fs.readFileSync(file, 'utf8');
	const template = source.match(/<template[^>]*>([\s\S]*?)<\/template>/)?.[1] ?? '';
	const tags = template.match(/<[^!][^>]*>/g) ?? [];

	for (const tag of tags) {
		checks += 3;
		if (/\btabindex=["'][1-9]\d*["']/.test(tag)) violations += 1;
		if (/^<img\b/i.test(tag) && !/\balt=/.test(tag)) violations += 1;
		if (/^<(div|span|p|li)\b/i.test(tag) && /(?:@click|v-on:click)(?:\.|=)/.test(tag)) {
			const hasKeyboardSemantics = /\b(role=["'](?:button|link|checkbox|radio|tab|menuitem)["']|tabindex=["']0["']|@key(?:down|up)|v-on:key(?:down|up))/.test(tag);
			const isPropagationOnly = /@click(?:\.[\w-]+)*\s*(?:=\s*["'][^"']*["'])?/.test(tag) && /@click\.stop(?:\s|>|=)/.test(tag);
			if (!hasKeyboardSemantics && !isPropagationOnly) violations += 1;
		}
	}
}

console.log(`METRIC accessibility_violations=${violations}`);
console.log(`METRIC audit_checks=${checks}`);
console.log('METRIC affected_tests=0');
NODE
