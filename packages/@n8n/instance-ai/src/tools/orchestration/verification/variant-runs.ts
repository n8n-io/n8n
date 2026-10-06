import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { VerificationAnalysis } from './analyze-result';
import { prepareVerificationRun, type PreparedVerificationRun } from './prepare-run';
import type { ExecutionRunResult, VerifyToolInput } from './types';
import { itemsForNode } from '../../../utils/node-keyed-items';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { declaredVariants, type DeclaredVariant } from '../../workflows/declared-shapes';
import { MAX_VARIANT_RUNS } from '../../workflows/reverify-description';

/**
 * Node contracts: `variants` runs the workflow once more for each union branch of a declared
 * output that the default fixture does not take, e.g. the null branch of a nullable field.
 */

interface VariantPass {
	readonly variant: DeclaredVariant;
	readonly result: ExecutionRunResult;
	readonly analysis: VerificationAnalysis;
}

/** One entry of the `variants` result. */
export interface VariantRun {
	readonly nodeName?: string;
	readonly branch: string;
	readonly success: boolean;
	readonly executionId?: string;
	readonly lastNodeExecuted?: string;
	readonly error?: string;
}

/**
 * Runs the variants one at a time, at most {@link MAX_VARIANT_RUNS}. A variant can only pin a
 * node that verification pins or reads live, in `slice` when set and without a fixture override.
 * Each run pins every live read with its declared fixture, so a variant run sends no request.
 */
export async function runDeclaredVariants(args: {
	workflow: WorkflowJSON;
	buildOutcome: WorkflowBuildOutcome;
	input: Pick<VerifyToolInput, 'fixtureOverrides' | 'allowZeroItemFixtures'>;
	slice?: ReadonlySet<string>;
	run: (prepared: PreparedVerificationRun) => Promise<ExecutionRunResult>;
	analyze: (result: ExecutionRunResult, prepared: PreparedVerificationRun) => VerificationAnalysis;
}): Promise<{ passes: VariantPass[]; notRun: number }> {
	const { workflow, buildOutcome, input, slice } = args;
	const liveReads = buildOutcome.liveReadFallbacks ?? {};
	const pinnable = new Set([
		...(buildOutcome.nodeSimulationPlan ?? [])
			.filter(({ verdict, haltBranch }) => verdict === 'simulate' && !haltBranch)
			.map(({ nodeName }) => nodeName),
		...Object.keys(liveReads),
	]);
	const variants = declaredVariants(
		workflow,
		(nodeName) =>
			itemsForNode(liveReads, nodeName) ?? itemsForNode(buildOutcome.simulationFixtures, nodeName),
		(nodeName) =>
			pinnable.has(nodeName) &&
			itemsForNode(input.fixtureOverrides, nodeName) === undefined &&
			(slice?.has(nodeName) ?? true),
	);
	const passes: VariantPass[] = [];
	for (const variant of variants.slice(0, MAX_VARIANT_RUNS)) {
		const ready = prepareVerificationRun(buildOutcome, {
			...input,
			fixtureOverrides: {
				...liveReads,
				...input.fixtureOverrides,
				[variant.nodeName]: variant.items,
			},
		});
		if (ready.kind === 'blocked') continue;
		const result = await args.run(ready.prepared);
		passes.push({ variant, result, analysis: args.analyze(result, ready.prepared) });
	}
	return { passes, notRun: variants.length - passes.length };
}

const variantLabel = ({ variant }: VariantPass) => `${variant.nodeName} ${variant.branch}`;

/**
 * The run and analysis of the normal run with the failed variant runs added: the verification
 * succeeds only when each run succeeds. Coverage stays that of the normal run.
 */
export function withVariantFailures(
	main: { result: ExecutionRunResult; analysis: VerificationAnalysis },
	passes: readonly VariantPass[],
): { result: ExecutionRunResult; analysis: VerificationAnalysis } {
	const failed = passes.filter(({ analysis }) => !analysis.success);
	const [first] = failed;
	if (!first) return main;
	const errorMessage = failed
		.map((pass) => `[variant ${variantLabel(pass)}] ${pass.analysis.errorMessage ?? 'failed'}`)
		.join('; ');
	return {
		result: {
			...main.result,
			status: first.result.status === 'success' ? 'error' : first.result.status,
			error: errorMessage,
		},
		analysis: {
			...main.analysis,
			success: false,
			errorMessage,
			nodeErrors: [
				...main.analysis.nodeErrors,
				...failed.flatMap((pass) =>
					pass.analysis.nodeErrors.map((nodeError) => ({
						...nodeError,
						message: `[variant ${variantLabel(pass)}] ${nodeError.message ?? 'node execution failed'}`,
					})),
				),
			],
			remediation: first.analysis.remediation,
		},
	};
}

/** The `variants` result: the normal run first, then each variant run. */
export function variantRunsOf(
	main: { result: ExecutionRunResult; analysis: VerificationAnalysis },
	passes: readonly VariantPass[],
): VariantRun[] {
	const entry = (
		run: { result: ExecutionRunResult; analysis: VerificationAnalysis },
		branch: string,
		nodeName?: string,
	): VariantRun => ({
		...(nodeName ? { nodeName } : {}),
		branch,
		success: run.analysis.success,
		...(run.result.executionId ? { executionId: run.result.executionId } : {}),
		...(run.result.lastNodeExecuted ? { lastNodeExecuted: run.result.lastNodeExecuted } : {}),
		...(run.analysis.success ? {} : { error: run.analysis.errorMessage ?? 'failed' }),
	});
	return [
		entry(main, 'default fixtures'),
		...passes.map((pass) => entry(pass, pass.variant.branch, pass.variant.nodeName)),
	];
}

/** Why fewer variants ran than asked, or `undefined`. */
export function variantsNote(args: {
	mainFailed: boolean;
	scriptedGate: boolean;
	ran: number;
	notRun: number;
}): string | undefined {
	if (args.scriptedGate) return 'Variants do not run with a scripted wait gate.';
	if (args.mainFailed) return 'Variants did not run, because the normal run failed.';
	if (args.notRun > 0) {
		return `${args.notRun} more branch(es) did not run (limit ${MAX_VARIANT_RUNS}). Use \`until\` or \`fixtureOverrides\` to run them.`;
	}
	return args.ran === 0
		? 'No declared `schema` in this run has a null or `anyOf` branch, so only the normal run ran.'
		: undefined;
}
