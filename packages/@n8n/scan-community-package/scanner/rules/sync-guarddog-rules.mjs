#!/usr/bin/env node
// Refreshes scanner/rules/guarddog/ from a GuardDog release tag.
//   node scanner/rules/sync-guarddog-rules.mjs v3.2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tag = process.argv[2];
if (!tag) {
	console.error('usage: sync-guarddog-rules.mjs <guarddog tag, e.g. v3.2.0>');
	process.exit(1);
}

const base = `https://raw.githubusercontent.com/DataDog/guarddog/${tag}`;
const api = `https://api.github.com/repos/DataDog/guarddog/contents/guarddog/analyzer/sourcecode?ref=${tag}`;
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guarddog');

const get = async (url) => {
	const res = await fetch(url, { headers: { 'user-agent': 'n8n-scan-community-package' } });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return res;
};

const listing = await (await get(api)).json();
const files = listing.filter((f) => /\.(yar|meta)$/.test(f.name));

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
for (const f of files) {
	fs.writeFileSync(path.join(outDir, f.name), await (await get(f.download_url)).text());
}
fs.writeFileSync(path.join(outDir, 'LICENSE'), await (await get(`${base}/LICENSE`)).text());
fs.writeFileSync(path.join(outDir, 'VERSION'), `${tag}\n`);
console.log(`synced ${files.length} rule files from GuardDog ${tag}`);
