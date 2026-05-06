import type { EvalProactiveOfferCase } from './types';

/**
 * Hand-curated prompts that exercise the proactive eval-offer behavior.
 *
 * 9 prompts produce workflows with at least one langchain/AI node — the agent
 * must call `evals(action="offer")` after the post-build flow and the
 * Approve/Deny widget must appear.
 *
 * 1 prompt produces a workflow with NO AI nodes — the offer widget must NOT
 * appear (the precheck inside the offer tool returns `eligible: false`
 * without suspending).
 */
const ALL_CASES: readonly EvalProactiveOfferCase[] = [
	{
		slug: 'slack-summarizer',
		prompt:
			'Build me a workflow that fetches messages from Slack channel #engineering for the past 24 hours and uses an AI agent to summarize them, then sends the summary back to me on Slack.',
		expectsOffer: true,
	},
	{
		slug: 'gmail-categorizer',
		prompt:
			'Create a workflow that watches my Gmail inbox and uses AI to categorize each new message into one of the labels: Work, Personal, Newsletter, Spam.',
		expectsOffer: true,
	},
	{
		slug: 'telegram-calendar-bot',
		prompt:
			'Make a Telegram bot that, when I send it a question about my schedule, looks up my Google Calendar events and answers using AI.',
		expectsOffer: true,
	},
	{
		slug: 'rss-news-summary',
		prompt:
			'Every weekday morning at 8am, fetch articles from a list of RSS feeds, use AI to write a single concise news brief, and send it to me by email.',
		expectsOffer: true,
	},
	{
		slug: 'support-draft-response',
		prompt:
			'Build a workflow that, when a new support ticket arrives via webhook, uses an AI agent to draft a friendly response and saves the draft to a Google Doc for review.',
		expectsOffer: true,
	},
	{
		slug: 'pdf-data-extraction',
		prompt:
			'Create a workflow that, when a PDF is uploaded to a folder, uses AI to extract structured data (invoice number, total, date) and appends it as a row to a Google Sheet.',
		expectsOffer: true,
	},
	{
		slug: 'chat-with-database',
		prompt:
			'Set up a chat trigger workflow where users can ask natural-language questions about a Postgres database and an AI agent answers them by querying the right tables.',
		expectsOffer: true,
	},
	{
		slug: 'whatsapp-auto-reply',
		prompt:
			'Build a workflow that monitors WhatsApp messages and uses an AI agent to draft a polite auto-reply when I am out of office, then sends it.',
		expectsOffer: true,
	},
	{
		slug: 'weekly-content-recap',
		prompt:
			'Every Friday at 5pm, gather all blog posts published this week from a Notion database, use AI to write a short recap, and post it to Slack.',
		expectsOffer: true,
	},
	{
		slug: 'sheets-to-notion-sync',
		prompt:
			'Every day at 9am, copy newly added rows from a Google Sheet into a Notion database. No AI processing — just a direct sync.',
		expectsOffer: false,
	},
];

interface LoadOptions {
	filter?: string;
}

export function loadEvalProactiveOfferCases(options: LoadOptions = {}): EvalProactiveOfferCase[] {
	if (options.filter === undefined) {
		return [...ALL_CASES];
	}
	return ALL_CASES.filter((testCase) => testCase.slug.includes(options.filter!));
}
