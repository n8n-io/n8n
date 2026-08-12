import type { OneOffTaskContract } from '../contracts';
import { formatOneOffTaskPrompt } from '../prompt-formatter';

const fullContract: OneOffTaskContract = {
	goal: 'Create a Google Sheet named "Leads" with columns Name, Email, Company, Stage.',
	constraints: ['Do not modify any existing spreadsheet', 'Create at most one new file'],
	verification: 'The sheet exists and its header row contains exactly the 4 requested columns.',
	credentials: [
		{
			name: 'Google Sheets',
			type: 'googleSheetsOAuth2Api',
			envVars: [{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', field: 'access_token' }],
		},
	],
	credentialCatalog: [
		{ name: 'Slack Bot', type: 'slackApi' },
		{ name: 'Notion', type: 'notionApi' },
	],
	priorReport: 'Previously created the "Q1 Leads" sheet with 3 columns.',
};

describe('formatOneOffTaskPrompt', () => {
	it('renders every contract field', () => {
		const prompt = formatOneOffTaskPrompt(fullContract);

		// Goal
		expect(prompt).toContain(fullContract.goal);
		// Every constraint
		for (const constraint of fullContract.constraints) {
			expect(prompt).toContain(`- ${constraint}`);
		}
		// Verification criteria
		expect(prompt).toContain(fullContract.verification);
		// Injected credential: name, type, env var, field
		expect(prompt).toContain('Google Sheets');
		expect(prompt).toContain('googleSheetsOAuth2Api');
		expect(prompt).toContain('N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN');
		expect(prompt).toContain('access_token');
		// Catalog entries: names and types
		expect(prompt).toContain('Slack Bot');
		expect(prompt).toContain('slackApi');
		expect(prompt).toContain('Notion');
		expect(prompt).toContain('notionApi');
		// Prior report
		expect(prompt).toContain(fullContract.priorReport!);
	});

	it('instructs read-back verification and the report_result finish', () => {
		const prompt = formatOneOffTaskPrompt(fullContract);
		expect(prompt).toContain('read-back');
		expect(prompt).toContain('report_result');
	});

	it('tells the harness never to print credential values', () => {
		const prompt = formatOneOffTaskPrompt(fullContract);
		expect(prompt).toMatch(/Never print/i);
	});

	it('renders explicit placeholders for empty sections', () => {
		const minimal: OneOffTaskContract = {
			goal: 'Count the rows in a public CSV.',
			constraints: [],
			verification: 'The reported count matches the file.',
			credentials: [],
			credentialCatalog: [],
		};
		const prompt = formatOneOffTaskPrompt(minimal);

		expect(prompt).toContain('None beyond your baked-in rules.');
		expect(prompt).toContain('None injected yet.');
		expect(prompt).toContain('No further credentials are available to request.');
		expect(prompt).not.toContain('Prior task report');
	});

	it('tells the harness to request catalog credentials via needs_credential', () => {
		const prompt = formatOneOffTaskPrompt(fullContract);
		expect(prompt).toContain('needs_credential');
	});
});
