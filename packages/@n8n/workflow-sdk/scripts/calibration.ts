/**
 * Calibration runner.
 *
 * Loads `examples/_calibration.json` (hand-tagged expert verdicts), runs the
 * rubric over each entry, and reports:
 *   - Spearman rank correlation between rubric scores and expert verdicts
 *   - Top disagreements with explanations
 *
 * Usage: pnpm criteria:calibrate
 *
 * The calibration file is a manually maintained JSON. Tagging convention:
 *   { id: 1954, verdict: 'helpful' | 'borderline' | 'not-helpful', rationale: '...' }
 * One entry per workflow id. 20-30 entries is the right size to anchor the
 * rubric without overfitting.
 */
import * as fs from 'fs';
import * as path from 'path';

import { scoreDetailedTemplate, type ScoreResult } from './criteria';
import { fetchDetail, loadCachedCatalog, type CatalogEntry } from './fetch-templates';

const CALIBRATION_PATH = path.resolve(__dirname, '../examples/_calibration.json');

const VERDICT_TO_RANK: Record<string, number> = {
	helpful: 2,
	borderline: 1,
	'not-helpful': 0,
};

interface CalibrationEntry {
	id: number;
	// 'TBD' is a placeholder for unlabelled entries; scoring skips them.
	verdict: 'helpful' | 'borderline' | 'not-helpful' | 'TBD' | string;
	rationale?: string;
}

interface CalibrationFile {
	expert_tagged: CalibrationEntry[];
}

interface ScoredCalibrationEntry extends CalibrationEntry {
	score: number;
	breakdown: ScoreResult['breakdown'];
	name: string;
}

function loadCalibration(): CalibrationFile {
	if (!fs.existsSync(CALIBRATION_PATH)) {
		throw new Error(
			`Calibration file not found at ${CALIBRATION_PATH}. ` +
				'Create it with shape { "expert_tagged": [{"id": N, "verdict": "helpful", "rationale": "..."}] }',
		);
	}
	return JSON.parse(fs.readFileSync(CALIBRATION_PATH, 'utf-8')) as CalibrationFile;
}

/** Spearman rank correlation between two parallel arrays. Higher = stronger agreement. */
export function spearmanCorrelation(xs: number[], ys: number[]): number {
	if (xs.length !== ys.length) throw new Error('arrays must have equal length');
	if (xs.length < 2) return 0;
	const xRanks = ranksWithTies(xs);
	const yRanks = ranksWithTies(ys);
	const n = xs.length;
	const meanX = xRanks.reduce((a, b) => a + b, 0) / n;
	const meanY = yRanks.reduce((a, b) => a + b, 0) / n;
	let num = 0;
	let denX = 0;
	let denY = 0;
	for (let i = 0; i < n; i++) {
		const dx = xRanks[i] - meanX;
		const dy = yRanks[i] - meanY;
		num += dx * dy;
		denX += dx * dx;
		denY += dy * dy;
	}
	if (denX === 0 || denY === 0) return 0;
	return num / Math.sqrt(denX * denY);
}

/** Average rank for ties (standard for Spearman). */
function ranksWithTies(values: number[]): number[] {
	const indexed = values.map((v, i) => ({ v, i }));
	indexed.sort((a, b) => a.v - b.v);
	const ranks = new Array<number>(values.length);
	let i = 0;
	while (i < indexed.length) {
		let j = i;
		while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
		const avgRank = (i + j) / 2 + 1;
		for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
		i = j + 1;
	}
	return ranks;
}

async function scoreCalibration(
	calib: CalibrationFile,
	catalog: CatalogEntry[],
): Promise<ScoredCalibrationEntry[]> {
	const byId = new Map(catalog.map((c) => [c.id, c]));
	const out: ScoredCalibrationEntry[] = [];
	for (const entry of calib.expert_tagged) {
		if (!Object.hasOwn(VERDICT_TO_RANK, entry.verdict)) {
			console.warn(`  skipping ${entry.id}: verdict not yet labelled (got "${entry.verdict}")`);
			continue;
		}
		const cat = byId.get(entry.id);
		if (!cat) {
			console.warn(`  skipping ${entry.id}: not in cached catalog`);
			continue;
		}
		const detail = await fetchDetail(entry.id);
		if (!detail) {
			console.warn(`  skipping ${entry.id}: detail fetch failed`);
			continue;
		}
		const result = scoreDetailedTemplate(cat, detail, []);
		out.push({
			...entry,
			score: result.total,
			breakdown: result.breakdown,
			name: detail.data.attributes.name,
		});
	}
	return out;
}

function printTopDisagreements(scored: ScoredCalibrationEntry[]): void {
	const expertRanks = ranksWithTies(scored.map((s) => VERDICT_TO_RANK[s.verdict]));
	const rubricRanks = ranksWithTies(scored.map((s) => s.score));
	const disagreements = scored.map((s, i) => ({
		entry: s,
		expertRank: expertRanks[i],
		rubricRank: rubricRanks[i],
		gap: Math.abs(expertRanks[i] - rubricRanks[i]),
	}));
	disagreements.sort((a, b) => b.gap - a.gap);
	console.log('\nTop disagreements (rubric rank vs expert rank):');
	for (const d of disagreements.slice(0, 10)) {
		const direction = d.rubricRank > d.expertRank ? 'overrated' : 'underrated';
		console.log(
			`  ${direction.padEnd(10)} gap=${d.gap.toFixed(1).padStart(4)} | ` +
				`rubric=${d.rubricRank.toFixed(0).padStart(3)} expert=${d.expertRank.toFixed(0).padStart(3)} | ` +
				`verdict=${d.entry.verdict.padEnd(11)} | ${d.entry.id} ${d.entry.name.slice(0, 50)}`,
		);
		if (d.entry.rationale) console.log(`             expert: "${d.entry.rationale}"`);
	}
}

async function main() {
	const calib = loadCalibration();
	console.log(`Loaded ${calib.expert_tagged.length} calibration entries\n`);

	const catalog = loadCachedCatalog();
	const scored = await scoreCalibration(calib, catalog);

	if (scored.length < 2) {
		console.error('Not enough scored entries to compute correlation');
		process.exit(1);
	}

	const expertScores = scored.map((s) => VERDICT_TO_RANK[s.verdict]);
	const rubricScores = scored.map((s) => s.score);
	const rho = spearmanCorrelation(expertScores, rubricScores);

	console.log(`Calibration set size: ${scored.length}`);
	console.log(`Spearman rank correlation: ${rho.toFixed(3)}`);
	console.log(`Threshold (Phase 1 ships at): 0.700`);
	console.log(`Status: ${rho >= 0.7 ? 'PASS' : 'TUNE WEIGHTS'}`);

	printTopDisagreements(scored);
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
