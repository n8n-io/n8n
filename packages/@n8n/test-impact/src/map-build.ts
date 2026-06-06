import { CoverageReport, type CoverageReportOptions } from 'monocart-coverage-reports';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Force every lcov record's `TN:` to the real spec id, so the impact-map merge
 * attributes the file→spec edges to that spec (monocart stamps its own TN).
 */
export function forceSpecTn(lcov: string, spec: string): string {
	let out = lcov.replace(/^TN:.*$/gm, `TN:${spec}`);
	if (!out.startsWith('TN:')) out = `TN:${spec}\n${out}`;
	return out;
}

export interface EmitPerSpecLcovsOptions {
	/** Dir of per-spec raw-coverage folders, each with a `.spec` marker + `raw-*.json`. */
	bySpecDir: string;
	/** Where to write `<slug><suffix>.lcov`. */
	outDir: string;
	/** monocart report options (the bundle-specific entry/source filters live here). */
	coverageOptions: CoverageReportOptions;
	/** Output filename suffix — `''` frontend, `'-backend'` backend. */
	suffix?: string;
	/**
	 * Feed a spec's raw files into the report. Frontend adds raws directly;
	 * backend resolves dist→source first. Return `false` to skip the spec.
	 * Keeps this kernel framework-agnostic — the runner-specific raw handling
	 * (and any n8n dist→src resolution) is injected by the caller.
	 */
	feedRaws: (
		report: CoverageReport,
		rawFiles: string[],
		dir: string,
		spec: string,
	) => boolean | Promise<boolean>;
}

export interface EmitStats {
	dirs: number;
	withMarker: number;
	withRaw: number;
	emitted: number;
}

/**
 * Turn per-spec raw coverage folders into one lcov per spec (TN-tagged with the
 * spec id) under `outDir`. These per-spec lcovs are the impact-map inputs — a
 * git diff then selects the specs that executed the touched code. Generic over
 * how raws are fed in (see {@link EmitPerSpecLcovsOptions.feedRaws}).
 */
export async function emitPerSpecLcovs(opts: EmitPerSpecLcovsOptions): Promise<EmitStats> {
	const { bySpecDir, outDir, coverageOptions, suffix = '', feedRaws } = opts;
	const stats: EmitStats = { dirs: 0, withMarker: 0, withRaw: 0, emitted: 0 };
	if (!existsSync(bySpecDir)) return stats;

	mkdirSync(outDir, { recursive: true });
	const dirs = readdirSync(bySpecDir).filter((d) => statSync(join(bySpecDir, d)).isDirectory());
	stats.dirs = dirs.length;

	for (const slug of dirs) {
		const dir = join(bySpecDir, slug);
		const specMarker = join(dir, '.spec');
		if (!existsSync(specMarker)) continue;
		stats.withMarker++;
		const spec = readFileSync(specMarker, 'utf8').trim();
		const rawFiles = readdirSync(dir).filter((f) => f.startsWith('raw-') && f.endsWith('.json'));
		if (!rawFiles.length) continue;
		stats.withRaw++;

		const report = new CoverageReport({
			...coverageOptions,
			name: spec,
			outputDir: dir,
			reports: ['lcovonly'],
		});
		if (!(await feedRaws(report, rawFiles, dir, spec))) continue;

		const result = await report.generate();
		const lcovPath = join(dir, 'lcov.info');
		if (!result?.files?.length || !existsSync(lcovPath)) continue;
		writeFileSync(
			join(outDir, `${slug}${suffix}.lcov`),
			forceSpecTn(readFileSync(lcovPath, 'utf8'), spec),
		);
		stats.emitted++;
	}
	return stats;
}
