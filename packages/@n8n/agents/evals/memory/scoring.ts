import type {
	CountExpectation,
	EntryExpectation,
	KeywordExpectation,
	MemoryEvalCategory,
	MemoryEvalScenario,
} from './scenarios';

export interface CheckResult {
	name: string;
	passed: boolean;
	detail: string;
}

export interface MemoryEvalScore {
	passed: boolean;
	checks: CheckResult[];
	answerPassed: boolean | null;
	retrievalTop1Hit: boolean | null;
	retrievalTop3Hit: boolean | null;
	retrievalTop12Hit: boolean | null;
	scopeLeakCount: number;
}

export interface CategorySummary {
	category: MemoryEvalCategory;
	scenarios: number;
	passed: number;
	passRate: number;
	answerScenarios: number;
	answerPassed: number;
	answerPassRate: number | null;
}

export function normalizeForMatch(value: string): string {
	return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesKeyword(text: string, keyword: string): boolean {
	return normalizeForMatch(text).includes(normalizeForMatch(keyword));
}

function formatMissing(missing: string[]): string {
	return missing.length === 0 ? 'none' : missing.join(', ');
}

function scoreKeywordExpectation(
	name: string,
	text: string,
	expectation: KeywordExpectation | undefined,
): CheckResult[] {
	if (!expectation) return [];
	const checks: CheckResult[] = [];
	const contains = expectation.contains ?? [];
	if (contains.length > 0) {
		const missing = contains.filter((keyword) => !includesKeyword(text, keyword));
		checks.push({
			name: `${name}: expected keywords`,
			passed: missing.length === 0,
			detail: `missing: ${formatMissing(missing)}`,
		});
	}

	const excludes = expectation.excludes ?? [];
	if (excludes.length > 0) {
		const present = excludes.filter((keyword) => includesKeyword(text, keyword));
		checks.push({
			name: `${name}: forbidden keywords`,
			passed: present.length === 0,
			detail: `present: ${formatMissing(present)}`,
		});
	}

	return checks;
}

function entryMatches(entry: string, expectation: EntryExpectation | CountExpectation): boolean {
	return expectation.containsAll.every((keyword) => includesKeyword(entry, keyword));
}

function scoreEntryExpectations(
	name: string,
	entries: string[],
	expectations: EntryExpectation[] | undefined,
): CheckResult[] {
	return (expectations ?? []).map((expectation) => {
		const matched = entries.some((entry) => entryMatches(entry, expectation));
		return {
			name: `${name}: ${expectation.label}`,
			passed: matched,
			detail: matched
				? 'matched'
				: `no entry contained all of: ${expectation.containsAll.join(', ')}`,
		};
	});
}

function scoreForbiddenEntries(entries: string[], forbidden: string[] | undefined): CheckResult[] {
	if (!forbidden || forbidden.length === 0) return [];
	const joined = entries.join('\n');
	const present = forbidden.filter((keyword) => includesKeyword(joined, keyword));
	return [
		{
			name: 'episodic entries: forbidden keywords',
			passed: present.length === 0,
			detail: `present: ${formatMissing(present)}`,
		},
	];
}

function scoreCountExpectations(
	entries: string[],
	expectations: CountExpectation[] | undefined,
): CheckResult[] {
	return (expectations ?? []).map((expectation) => {
		const count = entries.filter((entry) => entryMatches(entry, expectation)).length;
		return {
			name: `episodic entries: ${expectation.label}`,
			passed: count <= expectation.max,
			detail: `matched ${count}, max ${expectation.max}`,
		};
	});
}

function scoreRetrievalRank(
	retrievedEntries: string[],
	expectations: EntryExpectation[] | undefined,
): Pick<MemoryEvalScore, 'retrievalTop1Hit' | 'retrievalTop3Hit' | 'retrievalTop12Hit'> {
	if (!expectations || expectations.length === 0) {
		return { retrievalTop1Hit: null, retrievalTop3Hit: null, retrievalTop12Hit: null };
	}

	const ranks = expectations.map((expectation) =>
		retrievedEntries.findIndex((entry) => entryMatches(entry, expectation)),
	);
	const hasTop = (limit: number) => ranks.every((rank) => rank >= 0 && rank < limit);

	return {
		retrievalTop1Hit: hasTop(1),
		retrievalTop3Hit: hasTop(3),
		retrievalTop12Hit: hasTop(12),
	};
}

export function scoreScenario(input: {
	scenario: MemoryEvalScenario;
	entries: string[];
	retrievedEntries: string[];
	answer: string;
	userProfile: string;
	sessionMemory: string;
	backgroundErrors: number;
}): MemoryEvalScore {
	const { scenario } = input;
	const checks: CheckResult[] = [
		...scoreEntryExpectations('episodic entries', input.entries, scenario.expect.entries),
		...scoreForbiddenEntries(input.entries, scenario.expect.forbiddenEntries),
		...scoreCountExpectations(input.entries, scenario.expect.maxMatchingEntries),
		...scoreEntryExpectations('retrieval', input.retrievedEntries, scenario.expect.retrieval),
		...scoreKeywordExpectation('answer', input.answer, scenario.expect.answer),
		...scoreKeywordExpectation('user profile', input.userProfile, scenario.expect.userProfile),
		...scoreKeywordExpectation(
			'session memory',
			input.sessionMemory,
			scenario.expect.sessionMemory,
		),
	];

	if (input.backgroundErrors > 0) {
		checks.push({
			name: 'runtime background errors',
			passed: false,
			detail: `${input.backgroundErrors} AgentEvent.Error event(s)`,
		});
	}

	const answerChecks = checks.filter((check) => check.name.startsWith('answer:'));
	const answerPassed =
		answerChecks.length === 0 ? null : answerChecks.every((check) => check.passed);
	const retrieval = scoreRetrievalRank(input.retrievedEntries, scenario.expect.retrieval);
	const scopeLeakCount = (scenario.expect.forbiddenEntries ?? []).filter((keyword) =>
		input.retrievedEntries.some((entry) => includesKeyword(entry, keyword)),
	).length;

	return {
		passed: checks.every((check) => check.passed),
		checks,
		answerPassed,
		...retrieval,
		scopeLeakCount,
	};
}

export function summarizeCategories(
	results: Array<{ scenario: MemoryEvalScenario; score: MemoryEvalScore }>,
): CategorySummary[] {
	const byCategory = new Map<
		MemoryEvalCategory,
		Array<{ scenario: MemoryEvalScenario; score: MemoryEvalScore }>
	>();
	for (const result of results) {
		const bucket = byCategory.get(result.scenario.category) ?? [];
		bucket.push(result);
		byCategory.set(result.scenario.category, bucket);
	}

	return [...byCategory.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([category, rows]) => {
			const passed = rows.filter((row) => row.score.passed).length;
			const answerRows = rows.filter((row) => row.score.answerPassed !== null);
			const answerPassed = answerRows.filter((row) => row.score.answerPassed === true).length;
			return {
				category,
				scenarios: rows.length,
				passed,
				passRate: passed / rows.length,
				answerScenarios: answerRows.length,
				answerPassed,
				answerPassRate: answerRows.length > 0 ? answerPassed / answerRows.length : null,
			};
		});
}
