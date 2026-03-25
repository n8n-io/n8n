import { CoverageMap } from 'istanbul-lib-coverage';
import { ProxifiedModule } from 'magicast';
import { Profiler } from 'node:inspector';
import { ResolvedCoverageOptions, CoverageProvider, Vitest, ReportContext } from 'vitest/node';
import TestExclude from 'test-exclude';
import { BaseCoverageProvider } from 'vitest/coverage';

interface ScriptCoverageWithOffset extends Profiler.ScriptCoverage {
	startOffset: number;
}
declare class V8CoverageProvider extends BaseCoverageProvider<ResolvedCoverageOptions<"v8">> implements CoverageProvider {
	name: "v8";
	version: string;
	testExclude: InstanceType<typeof TestExclude>;
	initialize(ctx: Vitest): void;
	createCoverageMap(): CoverageMap;
	generateCoverage({ allTestsRun }: ReportContext): Promise<CoverageMap>;
	generateReports(coverageMap: CoverageMap, allTestsRun?: boolean): Promise<void>;
	parseConfigModule(configFilePath: string): Promise<ProxifiedModule<any>>;
	private getUntestedFiles;
	private v8ToIstanbul;
	private getSources;
	private convertCoverage;
}

export { V8CoverageProvider };
export type { ScriptCoverageWithOffset };
