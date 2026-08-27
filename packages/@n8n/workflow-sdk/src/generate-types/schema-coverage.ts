/**
 * Output-schema coverage report.
 *
 * For every resource/operation combination the type generator can emit an
 * `Output` type for, checks whether a matching `__schema__` file was found.
 * Mirrors the discovery generation itself uses (see planSplitVersionFiles in
 * generate-types.ts) so the numbers reported here match what actually lands
 * in generated `.ts` files.
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
	version: number;
}

export interface NodeSchemaCoverage {
	nodeName: string;
	totalCombos: number;
	coveredCombos: number;
	uncovered: UncoveredCombo[];
}

export interface SchemaCoverageReport {
	totalCombos: number;
	coveredCombos: number;
	coveragePercent: number;
	nodes: NodeSchemaCoverage[];
}

function resourceOperationCombos(node: NodeTypeDescription): Array<{
	resource: string;
	operation: string;
}> {
	const combos: Array<{ resource: string; operation: string }> = [];
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
 * Compute coverage across every node/version/resource/operation combination.
 * Only resource+operation discriminated nodes are counted: the generator
 * never looks up an output schema for `mode`-discriminated nodes today (see
 * `planSplitVersionFiles`), so counting those would misrepresent coverage as
 * a gap this tool can close.
 */
export function computeSchemaCoverage(nodes: NodeTypeDescription[]): SchemaCoverageReport {
	const nodeReports: NodeSchemaCoverage[] = [];

	for (const node of nodes) {
		const combos = resourceOperationCombos(node);
		if (combos.length === 0) continue;

		const versions = Array.isArray(node.version) ? node.version : [node.version];
		const uncovered: UncoveredCombo[] = [];
		let coveredCombos = 0;

		for (const version of versions) {
			const schemas = discoverSchemasForNode(node.name, version, node.schemaPath);
			for (const combo of combos) {
				if (findSchemaForOperation(schemas, combo.resource, combo.operation)) {
					coveredCombos++;
				} else {
					uncovered.push({ resource: combo.resource, operation: combo.operation, version });
				}
			}
		}

		nodeReports.push({
			nodeName: node.name,
			totalCombos: combos.length * versions.length,
			coveredCombos,
			uncovered,
		});
	}

	const totalCombos = nodeReports.reduce((sum, n) => sum + n.totalCombos, 0);
	const coveredCombos = nodeReports.reduce((sum, n) => sum + n.coveredCombos, 0);

	return {
		totalCombos,
		coveredCombos,
		coveragePercent: totalCombos === 0 ? 0 : roundToOneDecimal((coveredCombos / totalCombos) * 100),
		nodes: nodeReports.sort((a, b) => b.uncovered.length - a.uncovered.length),
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
		`Total combos: ${report.totalCombos}`,
		`Covered: ${report.coveredCombos} (${report.coveragePercent}%)`,
		'',
		'| Node | Covered / Total | % | Top uncovered combos |',
		'| --- | --- | --- | --- |',
	];

	for (const node of report.nodes) {
		if (node.totalCombos === 0) continue;
		const percent = roundToOneDecimal((node.coveredCombos / node.totalCombos) * 100);
		const topUncovered = node.uncovered
			.slice(0, 5)
			.map((combo) => `${combo.resource}/${combo.operation}@${combo.version}`)
			.join(', ');
		lines.push(
			`| ${node.nodeName} | ${node.coveredCombos}/${node.totalCombos} | ${percent}% | ${topUncovered} |`,
		);
	}

	return lines.join('\n');
}
