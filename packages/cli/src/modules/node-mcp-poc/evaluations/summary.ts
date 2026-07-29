import type { BenchmarkRun, BenchmarkTask } from './benchmark.schema';
import { BENCHMARK_VARIANTS, getBenchmarkVariant, type BenchmarkFlavor } from './variants';

export interface BenchmarkAggregate {
	key: string;
	taskId?: string;
	evaluationName?: string;
	model?: string;
	variant?: string;
	variantName?: string;
	flavor?: BenchmarkFlavor;
	category?: string;
	runs: number;
	successRate: number;
	medianDurationMs: number;
	p95DurationMs: number;
	medianToolCalls: number;
	invalidCallRate: number;
	medianTokens: number;
	medianCostUsd: number;
}

function percentile(values: number[], fraction: number) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function aggregate(
	key: string,
	runs: BenchmarkRun[],
	dimensions: Pick<
		BenchmarkAggregate,
		'taskId' | 'evaluationName' | 'model' | 'variant' | 'variantName' | 'flavor' | 'category'
	> = {},
): BenchmarkAggregate {
	const toolCalls = runs.flatMap((run) => run.toolCalls);
	const invalidCalls = toolCalls.filter(
		(call) => call.outcome === 'protocol_invalid' || call.outcome === 'semantic_invalid',
	);
	return {
		key,
		...dimensions,
		runs: runs.length,
		successRate: runs.length > 0 ? runs.filter((run) => run.success).length / runs.length : 0,
		medianDurationMs: percentile(
			runs.map((run) => run.durationMs),
			0.5,
		),
		p95DurationMs: percentile(
			runs.map((run) => run.durationMs),
			0.95,
		),
		medianToolCalls: percentile(
			runs.map((run) => run.toolCalls.length),
			0.5,
		),
		invalidCallRate: toolCalls.length > 0 ? invalidCalls.length / toolCalls.length : 0,
		medianTokens: percentile(
			runs.map((run) => run.usage?.totalTokens ?? 0),
			0.5,
		),
		medianCostUsd: percentile(
			runs.map((run) => run.usage?.cost ?? 0),
			0.5,
		),
	};
}

export function summarizeRuns(runs: BenchmarkRun[], tasks: BenchmarkTask[]) {
	const taskById = new Map(tasks.map((task) => [task.id, task]));
	const armKeys = new Set(runs.map((run) => `${run.taskId}\u0000${run.model}\u0000${run.variant}`));
	const arms = [...armKeys].map((key) => {
		const [taskId = '', model = '', variant = ''] = key.split('\u0000');
		const definition = getBenchmarkVariant(variant);
		return aggregate(
			key,
			runs.filter((run) => run.taskId === taskId && run.model === model && run.variant === variant),
			{
				taskId,
				evaluationName: taskById.get(taskId)?.title ?? taskId,
				model,
				variant,
				variantName: definition?.name ?? variant,
				flavor: definition?.flavor,
			},
		);
	});

	const flavors = [...new Set(BENCHMARK_VARIANTS.map((variant) => variant.flavor))].map((flavor) =>
		aggregate(
			flavor,
			runs.filter((run) => getBenchmarkVariant(run.variant)?.flavor === flavor),
			{ flavor },
		),
	);

	const categories = [...new Set(tasks.flatMap((task) => task.categories))].map((category) =>
		aggregate(
			category,
			runs.filter((run) => taskById.get(run.taskId)?.categories.includes(category) === true),
			{ category },
		),
	);

	return {
		generatedAt: new Date().toISOString(),
		overall: aggregate('overall', runs),
		arms,
		flavors,
		categories,
		runs,
		tasks,
		variants: BENCHMARK_VARIANTS,
	};
}

export type BenchmarkSummary = ReturnType<typeof summarizeRuns>;
