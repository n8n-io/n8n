import type { BreakingChangeLightReportResult } from '@n8n/api-types';

import { migrationReportCsvFilename, toMigrationReportCsv } from '../migration-report-csv';

type LightReport = BreakingChangeLightReportResult['report'];
type WorkflowRule = LightReport['workflowResults'][number];
type InstanceRule = LightReport['instanceResults'][number];

const HEADER =
	'target_version,current_version,synced_at,total_workflows,affected_workflows,affected_instance_rules,rule_kind,rule_id,rule_title,impact,impact_label,unresolved_workflows,wont_fix_workflows';

function workflowRule(overrides: Partial<WorkflowRule> = {}): WorkflowRule {
	return {
		ruleId: 'removed-nodes-v3',
		ruleTitle: 'Removed nodes',
		ruleDescription: 'Some nodes are gone.',
		ruleImpact: 'executionsFail',
		recommendations: [],
		migratable: false,
		nbAffectedWorkflows: 4,
		nbWontFixWorkflows: 1,
		...overrides,
	};
}

function instanceRule(overrides: Partial<InstanceRule> = {}): InstanceRule {
	return {
		ruleId: 'removed-env-var-v3',
		ruleTitle: 'Removed env var',
		ruleDescription: 'An env var is gone.',
		ruleImpact: 'upgradeBlocked',
		recommendations: [],
		migratable: false,
		instanceIssues: [],
		...overrides,
	};
}

function report(
	overrides: Partial<Omit<BreakingChangeLightReportResult, 'report'>> & {
		report?: Partial<LightReport>;
	} = {},
): BreakingChangeLightReportResult {
	return {
		totalWorkflows: 10,
		totalAffectedWorkflows: 5,
		shouldCache: false,
		...overrides,
		report: {
			generatedAt: new Date('2026-10-20T08:30:00.000Z'),
			targetVersion: 'v3',
			currentVersion: '2.10.0',
			instanceResults: [],
			workflowResults: [],
			...overrides.report,
		},
	};
}

describe('toMigrationReportCsv', () => {
	it('writes one row per workflow rule, with the instance totals repeated on each row', () => {
		const csv = toMigrationReportCsv(
			report({
				report: {
					workflowResults: [
						workflowRule(),
						workflowRule({
							ruleId: 'code-node-v3',
							ruleTitle: 'Code node',
							ruleImpact: 'behaviorChanges',
							nbAffectedWorkflows: 0,
							nbWontFixWorkflows: 2,
						}),
					],
				},
			}),
		);

		expect(csv.split('\r\n')).toEqual([
			HEADER,
			'v3,2.10.0,2026-10-20T08:30:00.000Z,10,5,0,workflow,removed-nodes-v3,Removed nodes,executionsFail,Executions will fail,4,1',
			'v3,2.10.0,2026-10-20T08:30:00.000Z,10,5,0,workflow,code-node-v3,Code node,behaviorChanges,Behavior changes,0,2',
			'',
		]);
	});

	it('writes an instance rule as a row without workflow counts, and counts it in the totals', () => {
		const csv = toMigrationReportCsv(
			report({ report: { instanceResults: [instanceRule()], workflowResults: [workflowRule()] } }),
		);

		expect(csv.split('\r\n')).toEqual([
			HEADER,
			'v3,2.10.0,2026-10-20T08:30:00.000Z,10,5,1,workflow,removed-nodes-v3,Removed nodes,executionsFail,Executions will fail,4,1',
			'v3,2.10.0,2026-10-20T08:30:00.000Z,10,5,1,instance,removed-env-var-v3,Removed env var,upgradeBlocked,Upgrade blocked,,',
			'',
		]);
	});

	it('writes one row with the totals and empty rule columns when no rule fired', () => {
		const csv = toMigrationReportCsv(report({ totalAffectedWorkflows: 0 }));

		expect(csv.split('\r\n')).toEqual([
			HEADER,
			'v3,2.10.0,2026-10-20T08:30:00.000Z,10,0,0,,,,,,,',
			'',
		]);
	});

	it('leaves synced_at empty before the first sync', () => {
		const csv = toMigrationReportCsv(report({ report: { generatedAt: undefined } }));

		expect(csv.split('\r\n')[1]).toBe('v3,2.10.0,,10,5,0,,,,,,,');
	});

	it('quotes a field that contains a comma, a quote, or a line break', () => {
		const csv = toMigrationReportCsv(
			report({
				report: {
					workflowResults: [
						workflowRule({ ruleTitle: 'Nodes, removed' }),
						workflowRule({ ruleId: 'quoted', ruleTitle: 'The "Code" node' }),
						workflowRule({ ruleId: 'multiline', ruleTitle: 'Line one\nline two' }),
					],
				},
			}),
		);

		const rows = csv.split('\r\n');
		expect(rows[1]).toContain(',"Nodes, removed",');
		expect(rows[2]).toContain(',"The ""Code"" node",');
		// A quoted line break does not end the record, so the row stays one line.
		expect(rows[3]).toBe(
			'v3,2.10.0,2026-10-20T08:30:00.000Z,10,5,0,workflow,multiline,"Line one\nline two",executionsFail,Executions will fail,4,1',
		);
	});

	it.each([
		{ impact: 'upgradeBlocked', label: 'Upgrade blocked' },
		{ impact: 'executionsFail', label: 'Executions will fail' },
		{ impact: 'executionsMightFail', label: 'Executions might fail' },
		{ impact: 'behaviorChanges', label: 'Behavior changes' },
		{ impact: 'capabilityRemoved', label: 'Capability removed' },
	] as const)(
		'writes the report label "$label" after the raw $impact impact',
		({ impact, label }) => {
			const csv = toMigrationReportCsv(
				report({
					report: {
						workflowResults: [workflowRule({ ruleImpact: impact })],
						instanceResults: [instanceRule({ ruleImpact: impact })],
					},
				}),
			);

			const rows = csv.split('\r\n');
			expect(rows[1]).toContain(`,${impact},${label},`);
			expect(rows[2]).toContain(`,${impact},${label},`);
		},
	);
});

describe('migrationReportCsvFilename', () => {
	it('names the file after the target version and the day of the export', () => {
		expect(migrationReportCsvFilename('v3', new Date('2026-10-20T23:59:59.000Z'))).toBe(
			'migration-report-v3-2026-10-20.csv',
		);
	});
});
