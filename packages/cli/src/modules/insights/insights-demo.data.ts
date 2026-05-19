import type { InsightsSummaryUnit } from '@n8n/api-types';

export const INSIGHTS_ANALYST_DEMO_PROJECT_ID = 'ins-demo-project';
export const INSIGHTS_ANALYST_DEMO_PROJECT_NAME = 'Demo Operations';

export type InsightsAnalystDemoWorkflow = {
	id: string;
	name: string;
	story: string;
	trend: 'positive' | 'negative' | 'neutral';
	metric: {
		value: number;
		unit: InsightsSummaryUnit;
	};
	timeSavedPerExecution: number;
	dailySuccesses: number;
	dailyFailures: number;
	averageRuntimeMs: number;
	previousPeriodMultiplier: number;
};

export const INSIGHTS_ANALYST_SUGGESTED_PROMPTS = [
	'Which workflows saved us the most time?',
	'Why did failures increase?',
	'Summarize this for an ops review.',
];

export const INSIGHTS_ANALYST_DEMO_WORKFLOWS: InsightsAnalystDemoWorkflow[] = [
	{
		id: 'ins-demo-wf-01',
		name: 'Invoice intake triage',
		story: 'Routes supplier invoices, extracts totals, and asks finance to review only exceptions.',
		trend: 'positive',
		metric: { value: 940, unit: 'minute' },
		timeSavedPerExecution: 18,
		dailySuccesses: 18,
		dailyFailures: 1,
		averageRuntimeMs: 34_000,
		previousPeriodMultiplier: 0.78,
	},
	{
		id: 'ins-demo-wf-02',
		name: 'Customer renewal monitor',
		story:
			'Checks upcoming renewals, enriches account context, and posts next steps to the account team.',
		trend: 'positive',
		metric: { value: 760, unit: 'minute' },
		timeSavedPerExecution: 15,
		dailySuccesses: 16,
		dailyFailures: 1,
		averageRuntimeMs: 29_000,
		previousPeriodMultiplier: 0.84,
	},
	{
		id: 'ins-demo-wf-03',
		name: 'Warehouse exception digest',
		story: 'Collects delayed shipments and summarizes where operations should intervene first.',
		trend: 'negative',
		metric: { value: 16, unit: 'count' },
		timeSavedPerExecution: 11,
		dailySuccesses: 12,
		dailyFailures: 3,
		averageRuntimeMs: 51_000,
		previousPeriodMultiplier: 0.55,
	},
	{
		id: 'ins-demo-wf-04',
		name: 'Support escalation router',
		story: 'Classifies support tickets and escalates accounts with repeated severity increases.',
		trend: 'neutral',
		metric: { value: 420, unit: 'minute' },
		timeSavedPerExecution: 10,
		dailySuccesses: 13,
		dailyFailures: 1,
		averageRuntimeMs: 26_000,
		previousPeriodMultiplier: 0.95,
	},
	{
		id: 'ins-demo-wf-05',
		name: 'Sales lead enrichment',
		story: 'Enriches new inbound leads and writes the research summary back to the CRM.',
		trend: 'positive',
		metric: { value: 360, unit: 'minute' },
		timeSavedPerExecution: 8,
		dailySuccesses: 15,
		dailyFailures: 0,
		averageRuntimeMs: 21_000,
		previousPeriodMultiplier: 0.72,
	},
	{
		id: 'ins-demo-wf-06',
		name: 'Compliance evidence pack',
		story: 'Builds a daily audit packet from ticket, deployment, and approval records.',
		trend: 'neutral',
		metric: { value: 310, unit: 'minute' },
		timeSavedPerExecution: 20,
		dailySuccesses: 5,
		dailyFailures: 0,
		averageRuntimeMs: 46_000,
		previousPeriodMultiplier: 1,
	},
	{
		id: 'ins-demo-wf-07',
		name: 'Failed payment recovery',
		story: 'Flags failed payments, updates billing notes, and prepares customer-facing follow-up.',
		trend: 'negative',
		metric: { value: 9, unit: 'count' },
		timeSavedPerExecution: 7,
		dailySuccesses: 9,
		dailyFailures: 2,
		averageRuntimeMs: 32_000,
		previousPeriodMultiplier: 0.68,
	},
	{
		id: 'ins-demo-wf-08',
		name: 'Vendor onboarding checklist',
		story: 'Keeps vendor onboarding moving by nudging owners when approvals or documents stall.',
		trend: 'neutral',
		metric: { value: 95, unit: 'minute' },
		timeSavedPerExecution: 5,
		dailySuccesses: 6,
		dailyFailures: 0,
		averageRuntimeMs: 18_000,
		previousPeriodMultiplier: 1.08,
	},
];
