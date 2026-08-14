import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/vue/schema';
import { z } from 'zod';
import { signpostRoles } from './signposts';
import { disclosureValues } from './visualGrammar';

const nodeId = z.string().nullable().optional();

function modelProps<T extends z.ZodRawShape>(shape: T) {
	return z.object(shape).strict();
}

export const catalog = defineCatalog(schema, {
	components: {
		Screen: {
			props: modelProps({
				title: z.string().nullable(),
				summary: z.string(),
			}),
			slots: ['default'],
			description:
				'Use as the single top-level page container with a required 1-2 sentence plain-language summary under the title, not for a section or step.',
		},
		AdaptiveStoryboard: {
			props: modelProps({}),
			slots: ['default'],
			description:
				'Use for lead handling, qualification, branching decisions, conditional paths, or a multi-phase narrative. Organize 3-5 editorial chapters and use Branch for genuine alternatives; do not use for operational monitoring or a primarily chronological schedule.',
		},
		OutcomeBoard: {
			props: modelProps({}),
			slots: ['default'],
			description:
				'Use for operations, monitoring, parallel outcomes, service health, recovery, and status-heavy workflows. Arrange 3-5 asymmetrical operational sections by importance; do not use for a lead narrative or a primarily chronological schedule.',
		},
		GuidedTimeline: {
			props: modelProps({}),
			slots: ['default'],
			description:
				'Use for chronological scheduling, appointments, hand-offs, itineraries, and staged work where order or timing is the main meaning. Present 3-5 sequential sections; do not use for parallel operational monitoring or branching lead qualification.',
		},
		Hero: {
			props: modelProps({
				title: z.string(),
				subtitle: z.string().nullable().optional(),
			}),
			slots: ['default'],
			description:
				'Use once near the top to announce the workflow outcome or promise, not for ordinary section titles.',
		},
		Summary: {
			props: modelProps({
				text: z.string(),
			}),
			description:
				'Use for a short plain-language overview of what the workflow achieves, distinct from Screen.summary when extra framing is needed.',
		},
		Chapter: {
			props: modelProps({
				title: z.string(),
				caption: z.string().nullable().optional(),
				signpost: z.enum(signpostRoles).nullable().optional(),
			}),
			slots: ['default'],
			description:
				'Use to group a major stage of the story (When/Then/If), not a single node beat; prefer Chapter over Group for narrative hierarchy. Set signpost to comesIn, works, or goesOut when the stage is clearly what starts the workflow, the work it does, or what the user ends up with.',
		},
		Beat: {
			props: modelProps({
				title: z.string(),
				caption: z.string().nullable().optional(),
				disclosure: z.enum(disclosureValues).optional(),
			}),
			slots: ['default'],
			description:
				'Use for one narrative moment that may wrap a metaphor or Cluster, not for an entire workflow phase. Set disclosure to expandable when the detail inside is worth a click but not worth showing up front.',
		},
		Caption: {
			props: modelProps({
				text: z.string(),
			}),
			description:
				'Use for a short supporting label under a chapter, beat, or composition, not primary body copy.',
		},
		Stack: {
			props: modelProps({ direction: z.enum(['row', 'column']).default('column') }),
			slots: ['default'],
			description:
				'Use to arrange sibling content in a row or column without adding a heading; prefer Timeline, Split, Branch, Grid, or Cluster when the story needs stronger structure.',
		},
		Split: {
			props: modelProps({
				ratio: z.enum(['1fr-1fr', '1fr-2fr', '2fr-1fr']).default('1fr-1fr'),
			}),
			slots: ['default'],
			description:
				'Use for two side-by-side narrative columns (for example trigger vs outcome), not a multi-item Grid.',
		},
		Lane: {
			props: modelProps({
				role: z.enum(signpostRoles),
				title: z.string().nullable().optional(),
			}),
			slots: ['default'],
			description:
				'Use inside a section to signpost one of the three parts of a workflow: role comesIn for what sets it off, works for what it does, goesOut for what the user ends up with. Use it in place of an unlabelled Stack when that reading helps; do not place it directly under Screen and do not use it as a fourth archetype.',
		},
		Ends: {
			props: modelProps({
				inboundLabel: z.string().nullable().optional(),
				outboundLabel: z.string().nullable().optional(),
			}),
			slots: ['default'],
			description:
				'Use to pair what arrives with what the workflow produces: give it exactly two children, the inbound operation first and the outbound operation second. Prefer Lane or the archetype sections when a stage has more than two operations.',
		},
		FlowCanvas: {
			props: modelProps({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
				layout: z.enum(['auto', 'sequence', 'branch', 'hub', 'parallel']).default('auto'),
			}),
			slots: ['default'],
			description:
				'Use as a topology lens inside an archetype section only when connections materially aid understanding. Never place it directly under Screen and never use it as a fourth archetype.',
		},
		FlowNode: {
			props: modelProps({
				nodeId,
				nodeIds: z.array(z.string()).optional(),
				label: z.string().nullable().optional(),
			}).superRefine((value, ctx) => {
				const hasNodeId = typeof value.nodeId === 'string' && value.nodeId.length > 0;
				const hasNodeIds = Array.isArray(value.nodeIds) && value.nodeIds.length > 0;
				if (hasNodeId === hasNodeIds) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Provide exactly one of nonempty nodeId or nonempty nodeIds',
					});
				}
			}),
			slots: ['default'],
			description:
				'Use inside FlowCanvas to wrap one existing node-adapted visual. Supply exactly one of a nonempty real nodeId or a nonempty real nodeIds array matching the wrapped workflow operation or group.',
		},
		FlowConnection: {
			props: modelProps({
				fromNodeId: z.string(),
				toNodeId: z.string(),
				type: z.string().default('main'),
				outputIndex: z.number().int().nonnegative().default(0),
				label: z.string().nullable().optional(),
			}),
			description:
				'Use only as connection metadata for a readable branch, error, or tool label, and only when the tuple exactly matches an existing workflow connection.',
		},
		Branch: {
			props: modelProps({
				title: z.string().nullable().optional(),
			}),
			slots: ['default'],
			description:
				'Use to present alternative paths visually after a Decision, not as a substitute for Decision itself.',
		},
		Cluster: {
			props: modelProps({
				title: z.string(),
				summary: z.string(),
				nodeIds: z.array(z.string()),
				disclosure: z.enum(disclosureValues).optional(),
			}),
			slots: ['default'],
			description:
				'Use when several related nodes belong in one beat: put every included node id in nodeIds so logos and click-to-open still work while the summary explains the group; do not emit one card per clustered node. Set disclosure to expandable to keep the per-node detail behind a click.',
		},
		Spotlight: {
			props: modelProps({
				label: z.string().nullable().optional(),
			}),
			slots: ['default'],
			description:
				'Use to emphasize a single critical metaphor or outcome inside a Grid or board layout, not for ordinary sequential steps.',
		},
		Group: {
			props: modelProps({ title: z.string() }),
			slots: ['default'],
			description:
				'Use to label a related section of content inside a screen or layout; prefer Chapter when building narrative hierarchy.',
		},
		Heading: {
			props: modelProps({ text: z.string() }),
			description: 'Use for a standalone heading, not body copy or a titled content group.',
		},
		Text: {
			props: modelProps({ text: z.string() }),
			description: 'Use for neutral explanatory copy, not warnings or workflow actions.',
		},
		Callout: {
			props: modelProps({ text: z.string() }),
			description: 'Use for important supporting information that should stand out from Text.',
		},
		When: {
			props: modelProps({
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
				app: z.string().nullable().optional(),
				nodeId,
			}),
			description:
				'Use for a workflow trigger or starting condition; always include nodeId when it represents a node. Set app only for an external service trigger; omit it for schedule, form, webhook, chat, file, and manual starts.',
		},
		Form: {
			props: modelProps({
				title: z.string(),
				fields: z.array(z.object({ label: z.string(), type: z.string() })),
				nodeId,
			}),
			description:
				'Use for a form trigger and its input fields, not a generic When trigger; always include nodeId.',
		},
		ChatMessage: {
			props: modelProps({
				app: z.string(),
				to: z.string(),
				bodyPreview: z.string(),
				nodeId,
			}),
			description:
				'Use for Slack, Teams, Discord, Telegram, or WhatsApp messages; use Email or Sms for those channels and always include nodeId.',
		},
		Email: {
			props: modelProps({
				to: z.string(),
				subject: z.string(),
				bodyPreview: z.string(),
				nodeId,
			}),
			description:
				'Use for email delivery with a subject; use ChatMessage or Sms for other messages and always include nodeId.',
		},
		Sms: {
			props: modelProps({
				to: z.string(),
				bodyPreview: z.string(),
				nodeId,
			}),
			description:
				'Use for SMS or phone-network text delivery; use ChatMessage for app messaging and always include nodeId.',
		},
		HttpCall: {
			props: modelProps({
				method: z.string(),
				url: z.string(),
				nodeId,
			}),
			description:
				'Use for an HTTP API request, not a database query or file transfer; always include nodeId.',
		},
		Terminal: {
			props: modelProps({
				command: z.string(),
				cwd: z.string().nullable().optional(),
				nodeId,
			}),
			description:
				'Use for an SSH or shell command, not a code transformation; always include nodeId.',
		},
		FileTransfer: {
			props: modelProps({
				direction: z.enum(['upload', 'download', 'copy']),
				app: z.string(),
				path: z.string(),
				nodeId,
			}),
			description:
				'Use for uploading, downloading, or copying a file; use Spreadsheet for row operations and always include nodeId.',
		},
		Spreadsheet: {
			props: modelProps({
				app: z.string(),
				operation: z.string(),
				sheet: z.string(),
				nodeId,
			}),
			description:
				'Use for Google Sheets or Airtable row and sheet operations, not generic file transfer; always include nodeId.',
		},
		Database: {
			props: modelProps({
				operation: z.string(),
				table: z.string(),
				nodeId,
			}),
			description:
				'Use for SQL database operations on a table, not spreadsheets or CRM records; always include nodeId.',
		},
		Crm: {
			props: modelProps({
				app: z.string(),
				operation: z.string(),
				object: z.string(),
				matchOn: z.string().nullable().optional(),
				nodeId,
			}),
			description:
				'Use for CRM records in HubSpot, Salesforce, or Pipedrive, not generic database rows; always include nodeId.',
		},
		CalendarEvent: {
			props: modelProps({
				title: z.string(),
				when: z.string(),
				attendees: z.string().nullable().optional(),
				nodeId,
			}),
			description:
				'Use for creating or changing a calendar event, not a schedule trigger; always include nodeId.',
		},
		Decision: {
			props: modelProps({
				question: z.string(),
				branches: z.array(z.object({ label: z.string(), condition: z.string() })),
				nodeId,
			}),
			description:
				'Use for If, Switch, or Filter branching, not human approval or waiting; always include nodeId.',
		},
		Wait: {
			props: modelProps({
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use for a timed or event-based pause, not a human approval step; always include nodeId.',
		},
		Approval: {
			props: modelProps({
				via: z.string(),
				waitingFor: z.string(),
				nodeId,
			}),
			description:
				'Use when workflow progress depends on a human decision, not a simple Wait; always include nodeId.',
		},
		AiTask: {
			props: modelProps({
				task: z.string(),
				promptExcerpt: z.string(),
				model: z.string().nullable().optional(),
				tools: z.array(z.string()).optional(),
				nodeId,
			}),
			description:
				'Use for an AI agent, classifier, extractor, or summarizer, not deterministic Transform logic; include model and tools when known and always include nodeId.',
		},
		Knowledge: {
			props: modelProps({
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use for retrieval or knowledge-source work, not a general AI generation task; always include nodeId.',
		},
		Transform: {
			props: modelProps({
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use for deterministic data mapping or code transformation, not an AiTask; always include nodeId.',
		},
		Step: {
			props: modelProps({
				title: z.string(),
				summary: z.string(),
				nodeId,
			}),
			description:
				'Use as a generic workflow step only when no domain-specific component fits; always include nodeId.',
		},
		Grid: {
			props: modelProps({ columns: z.number().default(2) }),
			slots: ['default'],
			description:
				'Use for a multi-column collection of peer items, not a linear Stack; pair with Spotlight for outcome boards.',
		},
		Tabs: {
			props: modelProps({ title: z.string().nullable().optional() }),
			slots: ['default'],
			description: 'Use for alternative peer views where only one section is active at a time.',
		},
		Accordion: {
			props: modelProps({ title: z.string().nullable().optional() }),
			slots: ['default'],
			description:
				'Use for collapsible supporting detail, not primary workflow sections or sequential steps; it starts closed, so never put the main explanation inside it.',
		},
		Reveal: {
			props: modelProps({ label: z.string() }),
			slots: ['default'],
			description:
				'Use to keep a long exact value out of the main reading order: the full prompt, query, condition, URL, or payload, behind a closed toggle whose label says in plain language what is inside. Do not use it for a whole workflow stage.',
		},
		Timeline: {
			props: modelProps({ title: z.string().nullable().optional() }),
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
