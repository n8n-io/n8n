/**
 * Output-schema coverage report.
 *
 * For every resource/operation combination the type generator can emit an
 * `Output` type for, checks whether a matching `__schema__` file was found.
 * Mirrors the discovery generation itself uses (see planSplitVersionFiles in
 * generate-types.ts) so the numbers reported here match what actually lands
 * in generated `.ts` files.
 *
 * Coverage decisions are made on the latest version of each node, so the
 * headline metric and the per-node table only count each node's latest
 * version. The all-versions number is reported alongside for context.
 * Legacy descriptions of versioned nodes (their `defaultVersion` points at a
 * newer description) are excluded from both metrics and the table.
 */

import {
	discoverSchemasForNode,
	extractDiscriminatorCombinations,
	findSchemaForOperation,
	isCustomApiCall,
	type NodeTypeDescription,
} from './generate-types';

export interface UncoveredCombo {
	resource: string;
	operation: string;
}

export interface NodeSchemaCoverage {
	nodeName: string;
	latestVersion: number;
	latestTotalCombos: number;
	latestCoveredCombos: number;
	allTotalCombos: number;
	allCoveredCombos: number;
	/** Combos without an output schema on the latest version. */
	uncovered: UncoveredCombo[];
}

interface CoverageTotals {
	totalCombos: number;
	coveredCombos: number;
	coveragePercent: number;
}

export interface SchemaCoverageReport {
	latest: CoverageTotals;
	allVersions: CoverageTotals;
	nodes: NodeSchemaCoverage[];
}

function resourceOperationCombos(node: NodeTypeDescription): UncoveredCombo[] {
	const combos: UncoveredCombo[] = [];
	for (const combo of extractDiscriminatorCombinations(node)) {
		if (
			combo.resource !== undefined &&
			combo.operation !== undefined &&
			!isCustomApiCall(combo.operation)
		) {
			combos.push({ resource: combo.resource, operation: combo.operation });
		}
	}
	return combos;
}

/**
 * A versioned node ships one description per major implementation; only the
 * one whose version list contains `defaultVersion` is the current node. The
 * others are legacy and never the target of coverage work.
 */
function isLegacyDescription(node: NodeTypeDescription, versions: number[]): boolean {
	return node.defaultVersion !== undefined && !versions.includes(node.defaultVersion);
}

/**
 * Compute coverage for every current node with resource+operation
 * discriminators. Only those nodes are counted: the generator never looks up
 * an output schema for `mode`-discriminated nodes today (see
 * `planSplitVersionFiles`), so counting those would misrepresent coverage as
 * a gap this tool can close.
 */
export function computeSchemaCoverage(nodes: NodeTypeDescription[]): SchemaCoverageReport {
	const nodeReports: NodeSchemaCoverage[] = [];

	for (const node of nodes) {
		const combos = resourceOperationCombos(node);
		if (combos.length === 0) continue;

		const versions = Array.isArray(node.version) ? node.version : [node.version];
		if (isLegacyDescription(node, versions)) continue;

		const latestVersion = Math.max(...versions);
		const uncovered: UncoveredCombo[] = [];
		let latestCoveredCombos = 0;
		let allCoveredCombos = 0;

		for (const version of versions) {
			const schemas = discoverSchemasForNode(node.name, version, node.schemaPath);
			for (const combo of combos) {
				if (findSchemaForOperation(schemas, combo.resource, combo.operation)) {
					allCoveredCombos++;
					if (version === latestVersion) latestCoveredCombos++;
				} else if (version === latestVersion) {
					uncovered.push(combo);
				}
			}
		}

		nodeReports.push({
			nodeName: node.name,
			latestVersion,
			latestTotalCombos: combos.length,
			latestCoveredCombos,
			allTotalCombos: combos.length * versions.length,
			allCoveredCombos,
			uncovered,
		});
	}

	return {
		latest: sumTotals(nodeReports, (n) => [n.latestTotalCombos, n.latestCoveredCombos]),
		allVersions: sumTotals(nodeReports, (n) => [n.allTotalCombos, n.allCoveredCombos]),
		nodes: nodeReports.sort((a, b) => b.uncovered.length - a.uncovered.length),
	};
}

function sumTotals(
	nodes: NodeSchemaCoverage[],
	pick: (node: NodeSchemaCoverage) => [total: number, covered: number],
): CoverageTotals {
	let totalCombos = 0;
	let coveredCombos = 0;
	for (const node of nodes) {
		const [total, covered] = pick(node);
		totalCombos += total;
		coveredCombos += covered;
	}
	return {
		totalCombos,
		coveredCombos,
		coveragePercent: totalCombos === 0 ? 0 : roundToOneDecimal((coveredCombos / totalCombos) * 100),
	};
}

function roundToOneDecimal(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Human-readable markdown table, sorted by most-uncovered-combos first. */
export function formatCoverageMarkdown(report: SchemaCoverageReport): string {
	const lines: string[] = [
		'# Output schema coverage',
		'',
		`Covered (latest node version): ${report.latest.coveragePercent}% (${report.latest.coveredCombos}/${report.latest.totalCombos})`,
		`Covered (all node versions): ${report.allVersions.coveragePercent}% (${report.allVersions.coveredCombos}/${report.allVersions.totalCombos})`,
		'',
		'| Node | Latest version | Covered / Total | % | Top uncovered combos |',
		'| --- | --- | --- | --- | --- |',
	];

	for (const node of report.nodes) {
		if (node.latestTotalCombos === 0) continue;
		const percent = roundToOneDecimal((node.latestCoveredCombos / node.latestTotalCombos) * 100);
		const topUncovered = node.uncovered
			.slice(0, 5)
			.map((combo) => `${combo.resource}/${combo.operation}`)
			.join(', ');
		lines.push(
			`| ${node.nodeName} | ${node.latestVersion} | ${node.latestCoveredCombos}/${node.latestTotalCombos} | ${percent}% | ${topUncovered} |`,
		);
	}

	return lines.join('\n');
}
