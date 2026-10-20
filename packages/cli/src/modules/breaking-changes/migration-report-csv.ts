import type { BreakingChangeLightReportResult, BreakingChangeVersion } from '@n8n/api-types';

/**
 * One flat table: one row per rule that fired, with the instance totals
 * repeated on every row so the file loads into a spreadsheet as is.
 */
const COLUMNS = [
	'target_version',
	'current_version',
	'synced_at',
	'total_workflows',
	'affected_workflows',
	'affected_instance_rules',
	'rule_kind',
	'rule_id',
	'rule_title',
	'impact',
	// Open and notified findings: a notification does not resolve a finding.
	'unresolved_workflows',
	'wont_fix_workflows',
] as const;

type CsvValue = string | number | undefined;

/** RFC 4180: a field with a comma, a quote, or a line break is quoted, and quotes are doubled. */
function toCsvField(value: CsvValue): string {
	if (value === undefined) return '';
	const text = String(value);
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsvLine(values: readonly CsvValue[]): string {
	return values.map(toCsvField).join(',');
}

/** The report overview as CSV text. */
export function toMigrationReportCsv(result: BreakingChangeLightReportResult): string {
	const { report } = result;
	const totals: CsvValue[] = [
		report.targetVersion,
		report.currentVersion,
		report.generatedAt ? new Date(report.generatedAt).toISOString() : undefined,
		result.totalWorkflows,
		result.totalAffectedWorkflows,
		report.instanceResults.length,
	];

	const ruleRows: CsvValue[][] = [
		...report.workflowResults.map((rule) => [
			...totals,
			'workflow',
			rule.ruleId,
			rule.ruleTitle,
			rule.ruleImpact,
			rule.nbAffectedWorkflows,
			rule.nbWontFixWorkflows,
		]),
		...report.instanceResults.map((rule) => [
			...totals,
			'instance',
			rule.ruleId,
			rule.ruleTitle,
			rule.ruleImpact,
			undefined,
			undefined,
		]),
	];
	// The totals still reach the reader when no rule fired.
	const emptyRuleColumns = new Array<undefined>(COLUMNS.length - totals.length).fill(undefined);
	const rows = ruleRows.length > 0 ? ruleRows : [[...totals, ...emptyRuleColumns]];

	return [COLUMNS, ...rows].map(toCsvLine).join('\r\n') + '\r\n';
}

/** The download name: the target version and the day of the export, in UTC. */
export function migrationReportCsvFilename(
	targetVersion: BreakingChangeVersion,
	now: Date,
): string {
	const day = now.toISOString().slice(0, 10);
	return `migration-report-${targetVersion}-${day}.csv`;
}
