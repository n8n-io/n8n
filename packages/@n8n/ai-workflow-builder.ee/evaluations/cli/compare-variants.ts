/**
 * SDK Variant Comparison Report Generator
 *
 * Generates comparison reports across SDK interface variants including:
 * - Overall scores per variant
 * - Per-pattern category breakdown
 * - Common failure modes per variant
 * - Side-by-side code examples
 *
 * Usage:
 *   pnpm eval:compare-variants --results-dir=./eval-results
 */

import * as fs from 'fs';
import * as path from 'path';

import { getVariantDescription, AVAILABLE_VARIANTS, type SdkVariant } from '../sdk-variants';

// =============================================================================
// Types
// =============================================================================

interface EvaluationResult {
	id: string;
	prompt: string;
	category?: string;
	scores: {
		overall: number;
		codeTypecheck?: number;
		codeLlmJudge?: number;
		programmatic?: number;
	};
	violations?: string[];
	generatedCode?: string;
}

interface VariantResults {
	variant: SdkVariant;
	description: string;
	results: EvaluationResult[];
	summary: {
		totalTests: number;
		averageOverall: number;
		averageTypecheck: number;
		averageLlmJudge: number;
		averageProgrammatic: number;
		passingTests: number; // Score >= 0.8
		failingTests: number; // Score < 0.5
	};
	byCategory: Map<
		string,
		{
			count: number;
			averageScore: number;
			passRate: number;
		}
	>;
	commonFailures: Array<{
		pattern: string;
		count: number;
		examples: string[];
	}>;
}

interface ComparisonReport {
	generatedAt: string;
	variants: VariantResults[];
	categoryComparison: Map<string, Map<SdkVariant, number>>;
	winner: {
		overall: SdkVariant;
		byCategory: Map<string, SdkVariant>;
	};
}

// =============================================================================
// Result Loading
// =============================================================================

function loadVariantResults(resultsDir: string, variant: SdkVariant): VariantResults | null {
	const variantDir = path.join(resultsDir, `eval-results-${variant}`);

	if (!fs.existsSync(variantDir)) {
		console.warn(`Results not found for variant: ${variant} (expected: ${variantDir})`);
		return null;
	}

	// Look for results CSV or JSON
	const csvPath = path.join(variantDir, 'results.csv');
	const jsonPath = path.join(variantDir, 'results.json');

	let results: EvaluationResult[] = [];

	if (fs.existsSync(jsonPath)) {
		const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
		results = Array.isArray(data) ? data : (data.results ?? []);
	} else if (fs.existsSync(csvPath)) {
		// Parse CSV (simple implementation)
		const content = fs.readFileSync(csvPath, 'utf-8');
		const lines = content.trim().split('\n');
		const headers = lines[0].split(',');

		for (let i = 1; i < lines.length; i++) {
			const values = lines[i].split(',');
			const row: Record<string, string> = {};
			headers.forEach((h, idx) => (row[h] = values[idx] ?? ''));

			results.push({
				id: row.id ?? `test-${i}`,
				prompt: row.prompt ?? '',
				category: row.category,
				scores: {
					overall: parseFloat(row.overall ?? '0'),
					codeTypecheck: row.codeTypecheck ? parseFloat(row.codeTypecheck) : undefined,
					codeLlmJudge: row.codeLlmJudge ? parseFloat(row.codeLlmJudge) : undefined,
					programmatic: row.programmatic ? parseFloat(row.programmatic) : undefined,
				},
			});
		}
	} else {
		console.warn(`No results file found in ${variantDir}`);
		return null;
	}

	// Calculate summary statistics
	const totalTests = results.length;
	const averageOverall = results.reduce((sum, r) => sum + r.scores.overall, 0) / totalTests || 0;
	const averageTypecheck =
		results.reduce((sum, r) => sum + (r.scores.codeTypecheck ?? 0), 0) / totalTests || 0;
	const averageLlmJudge =
		results.reduce((sum, r) => sum + (r.scores.codeLlmJudge ?? 0), 0) / totalTests || 0;
	const averageProgrammatic =
		results.reduce((sum, r) => sum + (r.scores.programmatic ?? 0), 0) / totalTests || 0;
	const passingTests = results.filter((r) => r.scores.overall >= 0.8).length;
	const failingTests = results.filter((r) => r.scores.overall < 0.5).length;

	// Group by category
	const byCategory = new Map<string, { count: number; total: number; passing: number }>();
	for (const result of results) {
		const category = result.category ?? 'unknown';
		const current = byCategory.get(category) ?? { count: 0, total: 0, passing: 0 };
		current.count++;
		current.total += result.scores.overall;
		if (result.scores.overall >= 0.8) current.passing++;
		byCategory.set(category, current);
	}

	const byCategoryFormatted = new Map<
		string,
		{ count: number; averageScore: number; passRate: number }
	>();
	for (const [cat, data] of byCategory) {
		byCategoryFormatted.set(cat, {
			count: data.count,
			averageScore: data.total / data.count,
			passRate: data.passing / data.count,
		});
	}

	// Identify common failures
	const failurePatterns = new Map<string, { count: number; examples: string[] }>();
	for (const result of results) {
		if (result.violations) {
			for (const violation of result.violations) {
				// Extract pattern from violation message
				const pattern = extractFailurePattern(violation);
				const current = failurePatterns.get(pattern) ?? { count: 0, examples: [] };
				current.count++;
				if (current.examples.length < 3) {
					current.examples.push(result.id);
				}
				failurePatterns.set(pattern, current);
			}
		}
	}

	const commonFailures = Array.from(failurePatterns.entries())
		.map(([pattern, data]) => ({ pattern, count: data.count, examples: data.examples }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return {
		variant,
		description: getVariantDescription(variant),
		results,
		summary: {
			totalTests,
			averageOverall,
			averageTypecheck,
			averageLlmJudge,
			averageProgrammatic,
			passingTests,
			failingTests,
		},
		byCategory: byCategoryFormatted,
		commonFailures,
	};
}

function extractFailurePattern(violation: string): string {
	// Extract key pattern from violation message
	// e.g., "Cannot find name 'onTrue'" -> "Cannot find name"
	const patterns = [
		/Cannot find name/,
		/Property .* does not exist/,
		/Type .* is not assignable/,
		/Expected \d+ arguments/,
		/Missing expression syntax/,
		/Invalid API usage/,
		/Security issue/,
	];

	for (const pattern of patterns) {
		if (pattern.test(violation)) {
			return pattern.source.replace(/\.\*/g, '...');
		}
	}

	return 'Other';
}

// =============================================================================
// Report Generation
// =============================================================================

function generateComparisonReport(variantResults: VariantResults[]): ComparisonReport {
	// Category comparison: category -> variant -> score
	const categoryComparison = new Map<string, Map<SdkVariant, number>>();
	const allCategories = new Set<string>();

	for (const vr of variantResults) {
		for (const [cat] of vr.byCategory) {
			allCategories.add(cat);
		}
	}

	for (const cat of allCategories) {
		const catMap = new Map<SdkVariant, number>();
		for (const vr of variantResults) {
			const catData = vr.byCategory.get(cat);
			catMap.set(vr.variant, catData?.averageScore ?? 0);
		}
		categoryComparison.set(cat, catMap);
	}

	// Determine winners
	const overallWinner = variantResults.reduce((best, vr) =>
		vr.summary.averageOverall > best.summary.averageOverall ? vr : best,
	);

	const categoryWinners = new Map<string, SdkVariant>();
	for (const cat of allCategories) {
		let bestVariant: SdkVariant = 'current';
		let bestScore = 0;
		for (const vr of variantResults) {
			const score = vr.byCategory.get(cat)?.averageScore ?? 0;
			if (score > bestScore) {
				bestScore = score;
				bestVariant = vr.variant;
			}
		}
		categoryWinners.set(cat, bestVariant);
	}

	return {
		generatedAt: new Date().toISOString(),
		variants: variantResults,
		categoryComparison,
		winner: {
			overall: overallWinner.variant,
			byCategory: categoryWinners,
		},
	};
}

function formatReportAsMarkdown(report: ComparisonReport): string {
	const lines: string[] = [];

	lines.push('# SDK Variant Comparison Report');
	lines.push('');
	lines.push(`Generated: ${report.generatedAt}`);
	lines.push('');

	// Overall winner
	lines.push('## Overall Winner');
	lines.push('');
	const winnerData = report.variants.find((v) => v.variant === report.winner.overall);
	lines.push(`**${report.winner.overall}** (${winnerData?.description})`);
	lines.push(`- Average Score: ${(winnerData?.summary.averageOverall ?? 0 * 100).toFixed(1)}%`);
	lines.push('');

	// Summary table
	lines.push('## Summary by Variant');
	lines.push('');
	lines.push('| Variant | Total Tests | Avg Overall | Avg Typecheck | Avg LLM Judge | Pass Rate |');
	lines.push('|---------|-------------|-------------|---------------|---------------|-----------|');

	for (const vr of report.variants) {
		const passRate = ((vr.summary.passingTests / vr.summary.totalTests) * 100).toFixed(1);
		lines.push(
			`| ${vr.variant} | ${vr.summary.totalTests} | ${(vr.summary.averageOverall * 100).toFixed(1)}% | ${(vr.summary.averageTypecheck * 100).toFixed(1)}% | ${(vr.summary.averageLlmJudge * 100).toFixed(1)}% | ${passRate}% |`,
		);
	}
	lines.push('');

	// Category breakdown
	lines.push('## Scores by Category');
	lines.push('');

	const categories = Array.from(report.categoryComparison.keys()).sort();
	if (categories.length > 0) {
		const headerVariants = report.variants.map((v) => v.variant);
		lines.push(`| Category | ${headerVariants.join(' | ')} | Winner |`);
		lines.push(`|----------|${headerVariants.map(() => '------').join('|')}|--------|`);

		for (const cat of categories) {
			const catScores = report.categoryComparison.get(cat);
			const scores = headerVariants.map((v) => {
				const score = catScores?.get(v) ?? 0;
				return `${(score * 100).toFixed(1)}%`;
			});
			const winner = report.winner.byCategory.get(cat) ?? '-';
			lines.push(`| ${cat} | ${scores.join(' | ')} | ${winner} |`);
		}
		lines.push('');
	}

	// Common failures per variant
	lines.push('## Common Failure Modes');
	lines.push('');

	for (const vr of report.variants) {
		lines.push(`### ${vr.variant}`);
		lines.push('');

		if (vr.commonFailures.length === 0) {
			lines.push('No common failures identified.');
		} else {
			for (const failure of vr.commonFailures.slice(0, 5)) {
				lines.push(`- **${failure.pattern}** (${failure.count} occurrences)`);
				if (failure.examples.length > 0) {
					lines.push(`  - Examples: ${failure.examples.join(', ')}`);
				}
			}
		}
		lines.push('');
	}

	// Recommendations
	lines.push('## Recommendations');
	lines.push('');

	const bestVariant = report.variants.find((v) => v.variant === report.winner.overall);
	const worstVariant = report.variants.reduce((worst, vr) =>
		vr.summary.averageOverall < worst.summary.averageOverall ? vr : worst,
	);

	lines.push(`1. **Best Overall**: ${report.winner.overall}`);
	lines.push(`   - ${bestVariant?.description}`);
	lines.push(
		`   - Highest average score: ${((bestVariant?.summary.averageOverall ?? 0) * 100).toFixed(1)}%`,
	);
	lines.push('');

	if (worstVariant.variant !== report.winner.overall) {
		lines.push(`2. **Needs Improvement**: ${worstVariant.variant}`);
		lines.push(`   - ${worstVariant.description}`);
		lines.push(
			`   - Lowest average score: ${(worstVariant.summary.averageOverall * 100).toFixed(1)}%`,
		);
		if (worstVariant.commonFailures.length > 0) {
			lines.push(`   - Most common issue: ${worstVariant.commonFailures[0].pattern}`);
		}
	}

	return lines.join('\n');
}

// =============================================================================
// CLI
// =============================================================================

function parseCliArgs(argv: string[]): { resultsDir: string; output?: string } {
	let resultsDir = './';
	let output: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === '--help' || arg === '-h') {
			console.log(`
SDK Variant Comparison Report Generator

USAGE:
  pnpm eval:compare-variants [options]

OPTIONS:
  --results-dir <dir>   Directory containing eval-results-* subdirs (default: ./)
  --output <file>       Output file for report (default: stdout)
  --help, -h            Show this help

The tool looks for directories named:
  eval-results-current/
  eval-results-builder/
  eval-results-graph/

Each should contain a results.json or results.csv file.
`);
			process.exit(0);
		}

		if (arg.startsWith('--results-dir=')) {
			resultsDir = arg.split('=')[1];
		} else if (arg === '--results-dir') {
			resultsDir = argv[++i];
		} else if (arg.startsWith('--output=')) {
			output = arg.split('=')[1];
		} else if (arg === '--output') {
			output = argv[++i];
		}
	}

	return { resultsDir, output };
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));

	console.log('Loading variant results...');

	const variantResults: VariantResults[] = [];
	for (const variant of AVAILABLE_VARIANTS) {
		const results = loadVariantResults(args.resultsDir, variant);
		if (results) {
			variantResults.push(results);
			console.log(`  Loaded ${results.results.length} results for ${variant}`);
		}
	}

	if (variantResults.length === 0) {
		console.error('No variant results found. Run evaluations first.');
		process.exit(1);
	}

	if (variantResults.length < 2) {
		console.warn('Warning: Only found results for 1 variant. Comparison limited.');
	}

	console.log('');
	console.log('Generating comparison report...');

	const report = generateComparisonReport(variantResults);
	const markdown = formatReportAsMarkdown(report);

	if (args.output) {
		fs.writeFileSync(args.output, markdown);
		console.log(`Report saved to: ${args.output}`);
	} else {
		console.log('');
		console.log(markdown);
	}
}

// Run if called directly
main().catch((error) => {
	console.error('Comparison failed:', error);
	process.exit(1);
});
