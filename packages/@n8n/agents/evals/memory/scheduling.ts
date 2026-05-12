import type { MemoryEvalCategory, MemoryEvalScenario } from './scenarios';

export interface EvalJob {
	order: number;
	repeat: number;
	scenario: MemoryEvalScenario;
}

export function createEvalJobs(input: {
	scenarios: MemoryEvalScenario[];
	repeats: number;
	parallelTopics: boolean;
}): EvalJob[] {
	const jobs: EvalJob[] = [];
	for (let repeat = 1; repeat <= input.repeats; repeat++) {
		const repeatScenarios = input.parallelTopics
			? interleaveScenariosByCategory(input.scenarios)
			: input.scenarios;

		for (const scenario of repeatScenarios) {
			jobs.push({ order: jobs.length, repeat, scenario });
		}
	}
	return jobs;
}

export function countSelectedCategories(scenarios: MemoryEvalScenario[]): number {
	return new Set(scenarios.map((scenario) => scenario.category)).size;
}

export function resolveEffectiveConcurrency(input: {
	configuredConcurrency: number;
	explicitConcurrency: boolean;
	parallelTopics: boolean;
	selectedCategoryCount: number;
	jobCount: number;
}): number {
	if (input.jobCount < 1) return 0;

	const configuredConcurrency = Math.max(1, Math.floor(input.configuredConcurrency));
	const selectedCategoryCount = Math.max(1, input.selectedCategoryCount);
	const requestedConcurrency =
		input.parallelTopics && !input.explicitConcurrency
			? selectedCategoryCount
			: configuredConcurrency;

	return Math.min(requestedConcurrency, input.jobCount);
}

function interleaveScenariosByCategory(scenarios: MemoryEvalScenario[]): MemoryEvalScenario[] {
	const categories: MemoryEvalCategory[] = [];
	const byCategory = new Map<MemoryEvalCategory, MemoryEvalScenario[]>();

	for (const scenario of scenarios) {
		const existing = byCategory.get(scenario.category);
		if (existing) {
			existing.push(scenario);
			continue;
		}

		categories.push(scenario.category);
		byCategory.set(scenario.category, [scenario]);
	}

	const interleaved: MemoryEvalScenario[] = [];
	for (let round = 0; round < scenarios.length; round++) {
		let addedInRound = false;
		for (const category of categories) {
			const scenario = byCategory.get(category)?.[round];
			if (scenario === undefined) continue;

			interleaved.push(scenario);
			addedInRound = true;
		}
		if (!addedInRound) break;
	}

	return interleaved;
}
