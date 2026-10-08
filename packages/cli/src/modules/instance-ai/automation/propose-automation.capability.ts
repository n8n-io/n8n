import type { CallToolResult } from '@modelcontextprotocol/server';
import {
	AUTOMATION_LOCAL_TARGET_ID,
	AUTOMATION_PROPOSAL_LIMITS,
	automationProposalCardSchema,
	automationProposalResultSchema,
} from '@n8n/api-types';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { lazyImport } from '@n8n/utils/lazy-import';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import {
	type CapabilityAnswer,
	type CapabilityArgs,
	type CapabilityCard,
	type CapabilityCardPayload,
	type CapabilityContext,
	type CapabilitySurface,
	type CapabilityToolDefinition,
	defineCapability,
} from '@/services/capabilities/capability';
import { PROPOSE_AUTOMATION_CAPABILITY_NAME } from '@/services/capabilities/capability-scopes';

import { AutomationBlockedError, isExpectedFailure } from './automation-errors';
import type * as ProposalServiceModule from './automation-proposal.service';
import type { AutomationProposal } from './automation-proposal.service';

export { PROPOSE_AUTOMATION_CAPABILITY_NAME };

const inputSchema = {
	workflowId: z.string().min(1).describe('The ID of the workflow to keep and turn on'),
	title: z
		.string()
		.trim()
		.min(1)
		.max(AUTOMATION_PROPOSAL_LIMITS.titleLength)
		.describe('A short name for the automation, for example "Morning sales digest"'),
	why: z
		.array(z.string().trim().min(1).max(AUTOMATION_PROPOSAL_LIMITS.whyLength))
		.max(AUTOMATION_PROPOSAL_LIMITS.whyItems)
		.default([])
		.describe('Up to five short reasons why this should run on its own, in the words of the user'),
	cron: z
		.string()
		.max(200)
		.optional()
		.describe(
			'Five-field cron expression of the schedule trigger as you understand it, for example "0 8 * * 1-5". Leave it out for other triggers. The card shows only the schedule that n8n reads from the Schedule Trigger. When your cron differs from it, or n8n cannot show the schedule as one cron expression, the result has a warning.',
		),
	activate: z
		.boolean()
		.optional()
		.describe(
			'MCP clients: true turns the workflow on after it is saved. The n8n Assistant ignores this value, because the user chooses on the card.',
		),
	versionId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'MCP clients: the saved version that the user agreed to turn on. When the workflow has a different saved version, nothing changes. The n8n Assistant ignores this value and uses the version on the card.',
		),
	target: z
		.literal(AUTOMATION_LOCAL_TARGET_ID)
		.optional()
		.describe('Where the automation runs. Only "local" (this n8n instance) is available.'),
} satisfies z.ZodRawShape;

type ProposeAutomationArgs = CapabilityArgs<typeof inputSchema>;

const DESCRIPTION = [
	'Offer to keep a workflow and turn it on, so that it runs on its own on this n8n instance.',
	'Call it after you built and tested a workflow that the user wants to repeat (for example on a schedule, or each time a form, chat message, webhook or app event arrives), or when the user asks to automate a workflow.',
	'Do not call it for a one-off job, or for a workflow that the user wants to run only by hand.',
];

const DESCRIPTION_OF_SURFACE: Record<CapabilitySurface, string> = {
	assistant:
		'The user answers on a card: turn it on, save it but leave it off, or not now. Keeping an archived workflow restores it. The result says if the workflow is kept and active.',
	// The built-in MCP tools do not act on archived workflows, so this tool does not restore them.
	mcp: 'The workflow must be available in MCP and must not be archived. Set activate to true to turn it on after it is saved. The result says if the workflow is kept and active.',
};

const describeFor = (surface: CapabilitySurface) =>
	[...DESCRIPTION, DESCRIPTION_OF_SURFACE[surface]].join(' ');

const loadProposalService = async () => {
	const { AutomationProposalService } = await lazyImport<typeof ProposalServiceModule>(
		async () => await import('./automation-proposal.service.js'),
	);
	return Container.get(AutomationProposalService);
};

/**
 * An admin block is a denied action, as in the confirmation bridge. Another refusal that the user
 * or the model can act on becomes a tool error with its message.
 */
function toToolError(error: unknown): CallToolResult {
	if (error instanceof AutomationBlockedError) {
		const denied = { denied: true, message: error.message };
		return { content: [{ type: 'text', text: JSON.stringify(denied) }], structuredContent: denied };
	}
	if (!isExpectedFailure(error)) throw error;
	return { content: [{ type: 'text', text: error.message }], isError: true };
}

function toCard({ card, workflowName }: AutomationProposal): CapabilityCard {
	return {
		message: card.canActivate
			? `Want "${card.title}" to run automatically?`
			: `Keep "${card.title}" as a workflow?`,
		severity: 'info',
		resourceName: workflowName,
		fields: { automationProposal: card },
		// The same lists as in the card, so that the frontend and the server agree.
		offered: card.offered,
	};
}

/** The part of the checkpoint card that pins the version which the user saw. */
const pinnedCardSchema = z.object({
	automationProposal: automationProposalCardSchema.pick({ versionId: true }),
});

/**
 * The card answer decides the action. `activate` comes only from the chosen values, never from
 * the model, so a plain approval keeps the workflow without turning it on. The version comes
 * from the card in the server checkpoint, so "Turn it on" publishes only what the card showed.
 */
export function applyAutomationAnswer(
	args: ProposeAutomationArgs,
	answer: CapabilityAnswer,
	card: CapabilityCardPayload,
): ProposeAutomationArgs {
	const pinned = pinnedCardSchema.safeParse(card);
	if (!pinned.success) throw new UserError('The confirmation card of this call is missing');
	const values = isRecord(answer.values) ? answer.values : {};
	return {
		...args,
		target: AUTOMATION_LOCAL_TARGET_ID,
		activate: values.activate === true,
		versionId: pinned.data.automationProposal.versionId,
	};
}

async function proposeCard(
	args: ProposeAutomationArgs,
	context: CapabilityContext,
): Promise<CapabilityCard> {
	const service = await loadProposalService();
	return toCard(await service.propose(args, context));
}

function buildTool(context: CapabilityContext): CapabilityToolDefinition<typeof inputSchema> {
	return {
		name: PROPOSE_AUTOMATION_CAPABILITY_NAME,
		config: {
			description: describeFor(context.surface),
			inputSchema,
			outputSchema: automationProposalResultSchema.shape,
			annotations: {
				title: 'Propose automation',
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async (args) => {
			try {
				const result = await (await loadProposalService()).apply(args, context);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
					structuredContent: result,
				};
			} catch (error) {
				return toToolError(error);
			}
		},
	};
}

/**
 * Keeps a workflow that the n8n Assistant built and turns it on. The Assistant shows a card first,
 * and the user chooses. MCP clients own consent, so they act at once, on this instance only.
 */
export const proposeAutomationCapability = defineCapability({
	name: PROPOSE_AUTOMATION_CAPABILITY_NAME,
	scope: 'workflow:write',
	surfaces: ['assistant', 'mcp'],
	assistant: {
		alwaysLoaded: true,
		confirm: proposeCard,
		applyAnswer: applyAutomationAnswer,
		// Every answer keeps the workflow, so workflow changes must be allowed. The model's
		// `activate` must not choose the admin gate, so the service checks publishing and
		// restoring itself, on the card and again on the answer.
		permission: () => 'updateWorkflow',
	},
	build: buildTool,
});
