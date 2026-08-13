import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/vue/schema';
import { z } from 'zod';

const nodeId = z.string().nullable().optional();

export const catalog = defineCatalog(schema, {
	components: {
		Screen: {
			props: z.object({ title: z.string().nullable() }),
			slots: ['default'],
			description: 'Use as the single top-level page container, not for a section or step.',
		},
		Stack: {
			props: z.object({ direction: z.enum(['row', 'column']).default('column') }),
			slots: ['default'],
			description: 'Use to arrange sibling content in a row or column without adding a heading.',
		},
		Group: {
			props: z.object({ title: z.string() }),
			slots: ['default'],
			description: 'Use to label a related section of content inside a screen or layout.',
		},
		Heading: {
			props: z.object({ text: z.string() }),
			description: 'Use for a standalone heading, not body copy or a titled content group.',
		},
		Text: {
			props: z.object({ text: z.string() }),
			description: 'Use for neutral explanatory copy, not warnings or workflow actions.',
		},
		Callout: {
			props: z.object({ text: z.string() }),
			description: 'Use for important supporting information that should stand out from Text.',
		},
		When: {
			props: z.object({
				kind: z.enum([
					'schedule',
					'form',
					'webhook',
					'chat',
					'email',
					'file',
					'appEvent',
					'manual',
				]),
				summary: z.string(),
				app: z.string().nullable(),
				nodeId,
			}),
			description:
				'Use for a workflow trigger or starting condition; always include nodeId when it represents a node.',
		},
		Form: {
			props: z.object({
				title: z.string(),
				fields: z.array(z.object({ label: z.string(), type: z.string() })),
				nodeId,
			}),
			description:
				'Use for a form trigger and its input fields, not a generic When trigger; always include nodeId.',
		},
		ChatMessage: {
			props: z.object({
				app: z.string(),
				to: z.string(),
				bodyPreview: z.string(),
				nodeId,
			}),
			description:
				'Use for Slack, Teams, Discord, Telegram, or WhatsApp messages; use Email or Sms for those channels and always include nodeId.',
		},
		Email: {
			props: z.object({
				to: z.string(),
				subject: z.string(),
				bodyPreview: z.string(),
				nodeId,
			}),
			description:
				'Use for email delivery with a subject; use ChatMessage or Sms for other messages and always include nodeId.',
		},
		Sms: {
			props: z.object({
				to: z.string(),
				bodyPreview: z.string(),
				nodeId,
			}),
			description:
				'Use for SMS or phone-network text delivery; use ChatMessage for app messaging and always include nodeId.',
		},
		HttpCall: {
			props: z.object({
				method: z.string(),
				url: z.string(),
				nodeId,
			}),
			description:
				'Use for an HTTP API request, not a database query or file transfer; always include nodeId.',
		},
		Terminal: {
			props: z.object({
				command: z.string(),
				cwd: z.string().nullable(),
				nodeId,
			}),
			description:
				'Use for an SSH or shell command, not a code transformation; always include nodeId.',
		},
		FileTransfer: {
			props: z.object({
				direction: z.enum(['upload', 'download', 'copy']),
				app: z.string(),
				path: z.string(),
				nodeId,
			}),
			description:
				'Use for uploading, downloading, or copying a file; use Spreadsheet for row operations and always include nodeId.',
		},
		Spreadsheet: {
			props: z.object({
				app: z.string(),
				operation: z.string(),
				sheet: z.string(),
				nodeId,
			}),
			description:
				'Use for Google Sheets or Airtable row and sheet operations, not generic file transfer; always include nodeId.',
		},
		Database: {
			props: z.object({
				operation: z.string(),
				table: z.string(),
				nodeId,
			}),
			description:
				'Use for SQL database operations on a table, not spreadsheets or CRM records; always include nodeId.',
		},
		Crm: {
			props: z.object({
				app: z.string(),
				operation: z.string(),
				object: z.string(),
				matchOn: z.string().nullable(),
				nodeId,
			}),
			description:
				'Use for CRM records in HubSpot, Salesforce, or Pipedrive, not generic database rows; always include nodeId.',
		},
		CalendarEvent: {
			props: z.object({
				title: z.string(),
				when: z.string(),
				attendees: z.string().nullable(),
				nodeId,
			}),
			description:
				'Use for creating or changing a calendar event, not a schedule trigger; always include nodeId.',
		},
		Decision: {
			props: z.object({
				question: z.string(),
				branches: z.array(z.object({ label: z.string(), condition: z.string() })),
				nodeId,
			}),
			description:
				'Use for If, Switch, or Filter branching, not human approval or waiting; always include nodeId.',
		},
		Wait: {
			props: z.object({
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use for a timed or event-based pause, not a human approval step; always include nodeId.',
		},
		Approval: {
			props: z.object({
				via: z.string(),
				waitingFor: z.string(),
				nodeId,
			}),
			description:
				'Use when workflow progress depends on a human decision, not a simple Wait; always include nodeId.',
		},
		AiTask: {
			props: z.object({
				task: z.string(),
				promptExcerpt: z.string(),
				nodeId,
			}),
			description:
				'Use for an AI agent, classifier, extractor, or summarizer, not deterministic Transform logic; always include nodeId.',
		},
		Knowledge: {
			props: z.object({
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use for retrieval or knowledge-source work, not a general AI generation task; always include nodeId.',
		},
		Transform: {
			props: z.object({
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use for deterministic data mapping or code transformation, not an AiTask; always include nodeId.',
		},
		Step: {
			props: z.object({
				title: z.string(),
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use as a generic workflow step only when no domain-specific component fits; always include nodeId.',
		},
		Grid: {
			props: z.object({ columns: z.number().default(2) }),
			slots: ['default'],
			description: 'Use for a multi-column collection of peer items, not a linear Stack.',
		},
		Tabs: {
			props: z.object({ title: z.string().nullable() }),
			slots: ['default'],
			description: 'Use for alternative peer views where only one section is active at a time.',
		},
		Accordion: {
			props: z.object({ title: z.string().nullable() }),
			slots: ['default'],
			description: 'Use for collapsible detail sections, not primary sequential workflow steps.',
		},
		Timeline: {
			props: z.object({ title: z.string().nullable() }),
			slots: ['default'],
			description: 'Use for ordered events or workflow progression, not unrelated grouped content.',
		},
	},
	actions: {
		openNode: {
			params: z.object({ nodeId: z.string() }),
			description: 'Open this node in the editor',
		},
	},
});

export type CatalogTypeName = keyof typeof catalog.data.components;
