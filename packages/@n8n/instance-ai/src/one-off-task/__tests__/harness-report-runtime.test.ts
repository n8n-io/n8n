import { harnessReportSchema, type HarnessReport } from '../contracts';
import { REPORT_RUNTIME_SOURCE } from '../harness-assets/report-runtime';

type ValidationResult = { ok: true; report: HarnessReport } | { ok: false; errors: string[] };

interface ReportRuntime {
	validateHarnessReport(value: unknown): ValidationResult;
}

// Evaluating the shipped source string (the exact code the sandbox receives)
// keeps this test honest — there is no second implementation to drift from.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const buildRuntime = new Function(
	`${REPORT_RUNTIME_SOURCE}\nreturn { validateHarnessReport };`,
) as () => ReportRuntime;
const runtime = buildRuntime();

const validReports: Array<[string, unknown]> = [
	[
		'completed report with full evidence',
		{
			status: 'completed',
			summary: 'Created the spreadsheet with 4 columns',
			actions: [
				{ description: 'POST sheets.googleapis.com/v4/spreadsheets', service: 'Google Sheets' },
				{ description: 'PUT values into header row' },
			],
			verification: [
				{
					check: 'Read the sheet back',
					result: 'Header row is Name, Email, Status, Notes',
					passed: true,
				},
			],
			artifacts: [{ label: 'Spreadsheet', url: 'https://docs.google.com/spreadsheets/d/abc' }],
		},
	],
	[
		'completed report with empty arrays',
		{ status: 'completed', summary: 'Nothing to do', actions: [], verification: [], artifacts: [] },
	],
	[
		'needs_credential report for an existing credential',
		{
			status: 'needs_credential',
			progressSummary: 'Drafted the export script; blocked on Slack access',
			request: { kind: 'existing', credentialName: 'Slack account' },
		},
	],
	[
		'needs_credential report with a new-credential recipe',
		{
			status: 'needs_credential',
			progressSummary: 'The task needs an Airtable key',
			request: {
				kind: 'new',
				recipe: {
					serviceName: 'Airtable',
					placeholders: [
						{ name: 'api_key', title: 'API key', info: 'Create a personal access token' },
						{ name: 'base_id', title: 'Base ID' },
					],
					docsUrl: 'https://airtable.com/create/tokens',
					testUrl: 'https://api.airtable.com/v0/meta/whoami',
				},
			},
		},
	],
	[
		'needs_credential recipe without optional fields',
		{
			status: 'needs_credential',
			progressSummary: 'Blocked on credentials',
			request: {
				kind: 'new',
				recipe: { serviceName: 'Acme Corp', placeholders: [{ name: 'token', title: 'Token' }] },
			},
		},
	],
	[
		'failed report',
		{
			status: 'failed',
			reason: 'The API rejected the payload and the retry budget ran out',
			actions: [{ description: 'POST api.example.test/v1/items (3 attempts)' }],
		},
	],
	[
		'completed report with unknown keys (stripped)',
		{
			status: 'completed',
			summary: 'Done',
			actions: [{ description: 'GET api.example.test', extra: 'stripped' }],
			verification: [],
			artifacts: [],
			debug: { stripped: true },
		},
	],
];

const invalidReports: Array<[string, unknown]> = [
	['null', null],
	['a string', 'completed'],
	['an array', []],
	['missing status', { summary: 'x', actions: [], verification: [], artifacts: [] }],
	['unknown status', { status: 'partial', summary: 'x' }],
	[
		'completed without summary',
		{ status: 'completed', actions: [], verification: [], artifacts: [] },
	],
	[
		'completed with non-array actions',
		{ status: 'completed', summary: 'x', actions: 'none', verification: [], artifacts: [] },
	],
	[
		'completed with non-boolean passed',
		{
			status: 'completed',
			summary: 'x',
			actions: [],
			verification: [{ check: 'c', result: 'r', passed: 'yes' }],
			artifacts: [],
		},
	],
	[
		'completed with artifact missing url',
		{
			status: 'completed',
			summary: 'x',
			actions: [],
			verification: [],
			artifacts: [{ label: 'Sheet' }],
		},
	],
	[
		'completed with non-string action service',
		{
			status: 'completed',
			summary: 'x',
			actions: [{ description: 'd', service: 42 }],
			verification: [],
			artifacts: [],
		},
	],
	[
		'needs_credential without progressSummary',
		{ status: 'needs_credential', request: { kind: 'existing', credentialName: 'X' } },
	],
	['needs_credential without request', { status: 'needs_credential', progressSummary: 'x' }],
	[
		'needs_credential with unknown request kind',
		{ status: 'needs_credential', progressSummary: 'x', request: { kind: 'oauth' } },
	],
	[
		'needs_credential existing without credentialName',
		{ status: 'needs_credential', progressSummary: 'x', request: { kind: 'existing' } },
	],
	[
		'needs_credential new without recipe',
		{ status: 'needs_credential', progressSummary: 'x', request: { kind: 'new' } },
	],
	[
		'needs_credential recipe placeholder missing title',
		{
			status: 'needs_credential',
			progressSummary: 'x',
			request: {
				kind: 'new',
				recipe: { serviceName: 'Acme Corp', placeholders: [{ name: 'api_key' }] },
			},
		},
	],
	['failed without reason', { status: 'failed', actions: [] }],
	['failed without actions', { status: 'failed', reason: 'broke' }],
];

describe('validateHarnessReport (literal schema copy)', () => {
	describe('stays in sync with harnessReportSchema from contracts.ts', () => {
		it.each(validReports)('both accept %s', (_name, report) => {
			const zodResult = harnessReportSchema.safeParse(report);
			const runtimeResult = runtime.validateHarnessReport(report);
			expect(zodResult.success).toBe(true);
			expect(runtimeResult.ok).toBe(true);
			// Normalized output must match zod's parse output (unknown keys stripped).
			if (zodResult.success && runtimeResult.ok) {
				expect(runtimeResult.report).toEqual(zodResult.data);
			}
		});

		it.each(invalidReports)('both reject %s', (_name, report) => {
			expect(harnessReportSchema.safeParse(report).success).toBe(false);
			const runtimeResult = runtime.validateHarnessReport(report);
			expect(runtimeResult.ok).toBe(false);
			if (!runtimeResult.ok) {
				expect(runtimeResult.errors.length).toBeGreaterThan(0);
			}
		});
	});

	it('reports every problem, not just the first', () => {
		const result = runtime.validateHarnessReport({
			status: 'completed',
			actions: 'nope',
			verification: [{ check: 1, result: 2, passed: 'x' }],
			artifacts: {},
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThan(3);
		}
	});
});
