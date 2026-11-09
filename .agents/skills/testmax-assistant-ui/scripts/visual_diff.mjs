#!/usr/bin/env node
// Compare the captures of each visual scenario: this branch against master.
//
//   node visual_diff.mjs <run-dir>
//
// Reads runs/<id>/captures/*.png (branch) and runs/<id>--master/captures/*.png (master) for each
// visual scenario in plan/scenarios.json. Writes visual/<id>/<name>.diff.png and visual.json:
//   [{scenario, name, status: unchanged|changed|branch-only|master-only, changedPixels, ratio,
//     branchSize, masterSize, diff}]
// A pixel counts as changed when one color channel differs by more than PIXEL_THRESHOLD. A capture
// counts as changed when more than RATIO_THRESHOLD of its pixels changed, or its size changed.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadPng } from '../../testmax-n8n-ai/scripts/n8n_browser.mjs';

const PIXEL_THRESHOLD = 32;
const RATIO_THRESHOLD = 0.0005;
const PNG = loadPng();
const runDir = resolve(process.argv[2] ?? '.');
const plan = JSON.parse(readFileSync(join(runDir, 'plan', 'scenarios.json'), 'utf8'));

const read = (file) => PNG.sync.read(readFileSync(file));
const names = (dir) =>
	existsSync(dir)
		? readdirSync(dir)
				.filter((f) => f.endsWith('.png'))
				.map((f) => f.slice(0, -4))
		: [];

function compare(branch, master) {
	const width = Math.max(branch.width, master.width);
	const height = Math.max(branch.height, master.height);
	const diff = new PNG({ width, height });
	let changed = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const o = (y * width + x) * 4;
			const inB = x < branch.width && y < branch.height;
			const inM = x < master.width && y < master.height;
			const b = inB ? (y * branch.width + x) * 4 : -1;
			const m = inM ? (y * master.width + x) * 4 : -1;
			let differs = !inB || !inM;
			if (!differs) {
				for (let c = 0; c < 4 && !differs; c++)
					differs = Math.abs(branch.data[b + c] - master.data[m + c]) > PIXEL_THRESHOLD;
			}
			if (differs) {
				changed++;
				diff.data.set([224, 17, 95, 255], o);
			} else {
				// The unchanged page shows as a faint gray copy of the branch screen.
				const gray =
					0.299 * branch.data[b] + 0.587 * branch.data[b + 1] + 0.114 * branch.data[b + 2];
				const v = Math.round(255 - (255 - gray) * 0.25);
				diff.data.set([v, v, v, 255], o);
			}
		}
	}
	return { diff, changed, ratio: changed / (width * height) };
}

const results = [];
for (const s of plan.scenarios.filter((x) => x.kind === 'visual')) {
	const branchDir = join(runDir, 'runs', s.id, 'captures');
	const masterDir = join(runDir, 'runs', `${s.id}--master`, 'captures');
	const all = [...new Set([...names(branchDir), ...names(masterDir)])].sort();
	for (const name of all) {
		const entry = { scenario: s.id, name };
		const hasB = existsSync(join(branchDir, `${name}.png`));
		const hasM = existsSync(join(masterDir, `${name}.png`));
		if (!hasB || !hasM) {
			results.push({ ...entry, status: hasB ? 'branch-only' : 'master-only' });
			continue;
		}
		const branch = read(join(branchDir, `${name}.png`));
		const master = read(join(masterDir, `${name}.png`));
		const { diff, changed, ratio } = compare(branch, master);
		const out = join(runDir, 'visual', s.id);
		mkdirSync(out, { recursive: true });
		writeFileSync(join(out, `${name}.diff.png`), PNG.sync.write(diff));
		const resized = branch.width !== master.width || branch.height !== master.height;
		results.push({
			...entry,
			status: resized || ratio > RATIO_THRESHOLD ? 'changed' : 'unchanged',
			changedPixels: changed,
			ratio,
			branchSize: [branch.width, branch.height],
			masterSize: [master.width, master.height],
			diff: `visual/${s.id}/${name}.diff.png`,
		});
	}
}
writeFileSync(join(runDir, 'visual.json'), JSON.stringify(results, null, 2));
const changed = results.filter((r) => r.status !== 'unchanged').length;
console.log(`${results.length} captures compared, ${changed} with a difference`);
