// ---------------------------------------------------------------------------
// Grades a routing results set: resolves the route of each trial, asks the
// judge where calls cannot decide it, and applies the accept tokens with the
// v2 and strict scores. Shared by the grader CLI (grade.ts) and the discovery
// CLI, which grades inline for `--output-dir`.
// ---------------------------------------------------------------------------

import {
	applyVerdict,
	casePasses,
	intentSkillLoaded,
	isSameDirectionClarify,
	judgeFailure,
	type PendingResolution,
	resolveTrial,
	routeLabel,
	type RouteResolution,
	staleStopCall,
	strictTrialPasses,
	trialPasses,
} from './grade-resolve';
import type { GradedCase, GradedRun, PendingRerunCase } from './grade-report';
import type { RoutingCase, RoutingResults, TrialResult } from './grade-types';
import { mapWithConcurrency, type RoutingJudge } from './judge';

interface PendingTrial {
	caseIndex: number;
	trialIndex: number;
	pending: PendingResolution;
}

export async function gradeRoutingResults(
	results: RoutingResults,
	cases: Map<string, RoutingCase>,
	judge: Pick<RoutingJudge, 'judge'>,
	concurrency: number,
	/** Where the results came from, for the report. */
	file: string,
): Promise<GradedRun> {
	const missingCaseIds: string[] = [];
	const emptyCaseIds: string[] = [];
	const pendingRerun: PendingRerunCase[] = [];
	const graded: Array<{ routingCase: RoutingCase; trials: TrialResult[] }> = [];
	for (const caseResult of results.cases) {
		const routingCase = cases.get(caseResult.id);
		if (!routingCase) {
			missingCaseIds.push(caseResult.id);
			continue;
		}
		if (caseResult.trials.length === 0) {
			emptyCaseIds.push(caseResult.id);
			continue;
		}
		const staleTrials = caseResult.trials.flatMap((trial) => {
			const stopCall = staleStopCall(trial);
			return stopCall === undefined ? [] : [{ trial: trial.trial, stopCall }];
		});
		if (staleTrials.length > 0) {
			pendingRerun.push({
				id: caseResult.id,
				bucket: routingCase.bucket,
				trials: caseResult.trials.length,
				staleTrials,
			});
			continue;
		}
		graded.push({ routingCase, trials: caseResult.trials });
	}

	const pendingTrials: PendingTrial[] = graded.flatMap(({ routingCase, trials }, caseIndex) =>
		trials.map((trial, trialIndex) => ({
			caseIndex,
			trialIndex,
			pending: resolveTrial(routingCase, trial),
		})),
	);

	const resolutions = await mapWithConcurrency(
		pendingTrials,
		concurrency,
		async ({ pending }): Promise<{ resolution: RouteResolution; cached?: boolean }> => {
			if (pending.kind === 'resolved') return { resolution: pending.resolution };
			try {
				const { verdict, cached } = await judge.judge(pending.input);
				return { resolution: applyVerdict(pending, verdict), cached };
			} catch (error) {
				return { resolution: judgeFailure(pending, error) };
			}
		},
	);

	const gradedCases: GradedCase[] = graded.map(({ routingCase }) => ({
		id: routingCase.id,
		bucket: routingCase.bucket,
		accepts: routingCase.accepts,
		policyDependent: routingCase.policyDependent,
		trials: [],
		passedTrials: 0,
		pass: false,
		strictPassedTrials: 0,
		strictPass: false,
	}));
	for (const [index, { caseIndex, trialIndex, pending }] of pendingTrials.entries()) {
		const { routingCase, trials } = graded[caseIndex];
		const trial = trials[trialIndex];
		const { resolution, cached } = resolutions[index];
		gradedCases[caseIndex].trials.push({
			trial: trial.trial,
			streamStatus: trial.streamStatus,
			runError: trial.runError,
			skillLoaded: intentSkillLoaded(trial),
			resolution,
			label: routeLabel(resolution),
			pass: trialPasses(routingCase, resolution),
			strictPass: strictTrialPasses(routingCase, resolution),
			sameDirectionClarify: isSameDirectionClarify(routingCase.bucket, resolution),
			judged: pending.kind === 'judge',
			judgeCached: cached,
		});
	}
	for (const gradedCase of gradedCases) {
		const total = gradedCase.trials.length;
		gradedCase.passedTrials = gradedCase.trials.filter((trial) => trial.pass).length;
		gradedCase.pass = casePasses(gradedCase.passedTrials, total);
		gradedCase.strictPassedTrials = gradedCase.trials.filter((trial) => trial.strictPass).length;
		gradedCase.strictPass = casePasses(gradedCase.strictPassedTrials, total);
	}

	return {
		meta: {
			file,
			runId: results.runId,
			variant: results.variant,
			model: results.model,
			startedAt: results.startedAt,
			finishedAt: results.finishedAt,
		},
		cases: gradedCases,
		missingCaseIds,
		emptyCaseIds,
		pendingRerun,
	};
}
