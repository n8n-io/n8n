import { benchmarkTaskSchema } from '../benchmark.schema';

const sender = 'jordan.lee@example.com';
const recentDatePattern = '(?:after:20\\d{2}[-/]\\d{2}[-/]\\d{2}|newer_than:7d)';

export const listUnreadEmailsFromSenderTask = benchmarkTaskSchema.parse({
	id: 'list-unread-emails-from-sender',
	title: 'Gmail search emails',
	prompt: `Show me unread emails from ${sender} received during the last seven days.`,
	categories: ['discovery', 'filtering', 'date-range', 'read-only', 'execution'],
	variants: ['eval-gmail-json-schema-generic-batch', 'eval-gmail-action-lookup'],
	timeoutMs: 120_000,
	oracle: {
		allowedActionIds: ['n8n-nodes-base.gmail@2.2/message.getAll'],
		requiredInput: {
			filters: {
				sender,
				readStatus: 'unread',
				receivedAfter: { $regex: '^20\\d{2}-\\d{2}-\\d{2}' },
			},
		},
		alternativeInputs: [
			{
				filters: {
					q: {
						$regex: `(?=.*from:${sender.replaceAll('.', '\\.')})(?=.*is:unread)(?=.*${recentDatePattern})`,
					},
				},
			},
			{
				filters: {
					q: {
						$regex: `(?=.*from:${sender.replaceAll('.', '\\.')})(?=.*${recentDatePattern})`,
					},
					labelIds: ['UNREAD'],
				},
			},
			{
				filters: {
					sender,
					readStatus: 'unread',
					q: { $regex: recentDatePattern },
				},
			},
		],
		forbiddenInputPaths: [],
		finalAnswerIncludes: [sender, '3', 'unread'],
	},
	fixtures: {
		executionItems: [
			{
				id: 'message-001',
				labels: ['INBOX', 'UNREAD'],
				Subject: 'Project Atlas kickoff',
				From: `Jordan Lee <${sender}>`,
				snippet: 'Kickoff agenda and preparation notes for Project Atlas.',
			},
			{
				id: 'message-002',
				labels: ['INBOX', 'UNREAD'],
				Subject: 'Quarterly planning review',
				From: `Jordan Lee <${sender}>`,
				snippet: 'Updated planning review time and discussion topics.',
			},
			{
				id: 'message-003',
				labels: ['INBOX', 'UNREAD'],
				Subject: 'Team operations sync',
				From: `Jordan Lee <${sender}>`,
				snippet: 'Notes and follow-ups for the weekly operations sync.',
			},
		],
	},
	source: {
		kind: 'recorded-conversation',
		threadId: 'redacted',
		relatedThreadIds: [],
		agentName: 'Gmail MCP variants',
		catalogVersion: 'masked-gmail-get-many',
		model: 'anthropic/claude-sonnet-5',
		observedDurationMs: 19_888,
		observedPromptTokens: 50_127,
		observedCompletionTokens: 1_260,
		observedCostUsd: 0.0546026,
	},
});
