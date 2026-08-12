import type { IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

export type { ProactiveOffer } from './instanceAiPanel.types';

/**
 * Structured context handed to the agent inside a seeded message.
 *
 * The block rides along in the message text rather than in a dedicated field so
 * no backend change is needed: `executions.tool.ts` and `credentials.tool.ts`
 * already let the agent read a failed run or a credential, and the workflow
 * attachment carries the `executionId`. The block is stripped before the text
 * is rendered, so the chat bubble stays plain language.
 */
export const PROACTIVE_CONTEXT_TYPES = [
	'execution-error',
	'credential-error',
	'focused-nodes',
] as const;

export type ProactiveContextType = (typeof PROACTIVE_CONTEXT_TYPES)[number];

/** Per-field cap — an unbounded stack trace would crowd out the rest of the prompt. */
export const CONTEXT_VALUE_MAX_LENGTH = 2000;

const CONTEXT_TAG = 'context';

/** Matches a complete block, plus the trailing newline so stripping leaves no blank gap. */
const CONTEXT_BLOCK_REGEX = /[ \t]*<context\b[^>]*>[\s\S]*?<\/context>[ \t]*\r?\n?/gi;

/** An opener with no closer — strip to the end rather than leak raw markup. */
const DANGLING_CONTEXT_BLOCK_REGEX = /[ \t]*<context\b[^>]*>[\s\S]*$/i;

const CONTEXT_TYPE_ATTRIBUTE_REGEX = /<context\b[^>]*\btype="([^"]*)"/i;

type ContextFields = Record<string, string | number | undefined>;

function normalizeValue(value: string | number): string {
	const flattened = String(value).replace(/\s+/g, ' ').trim();

	// A node name or error string carrying a context tag would close the block
	// early, leaving the remainder visible in the bubble and confusing the model.
	const defanged = flattened.replace(/<\/?context\b/gi, CONTEXT_TAG);

	if (defanged.length <= CONTEXT_VALUE_MAX_LENGTH) return defanged;
	return `${defanged.slice(0, CONTEXT_VALUE_MAX_LENGTH - 1)}…`;
}

/**
 * Build one `<context>` block: a single tag name, a `type` attribute and a
 * `key: value` body. Field order follows insertion order; empty and `undefined`
 * fields are dropped so a partially known error doesn't render blank lines.
 */
export function buildContextBlock(type: ProactiveContextType, fields: ContextFields): string {
	const body = Object.entries(fields)
		.filter(([, value]) => value !== undefined && String(value).trim().length > 0)
		.map(([key, value]) => `${key}: ${normalizeValue(value as string | number)}`)
		.join('\n');

	return `<${CONTEXT_TAG} type="${type}">\n${body}\n</${CONTEXT_TAG}>`;
}

/**
 * Strip every context block so the message renders as the plain-language text
 * alone. Total on purpose: it runs per message render, and a message whose
 * `content` hasn't arrived yet must not break the transcript.
 */
export function stripContextBlocks(text: string | undefined | null): string {
	if (!text) return '';

	return text
		.replace(CONTEXT_BLOCK_REGEX, '')
		.replace(DANGLING_CONTEXT_BLOCK_REGEX, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function hasContextBlock(text: string | undefined | null): boolean {
	return Boolean(text) && /<context\b[^>]*>/i.test(text as string);
}

/** Type of the first block, used to pick the chip shown in place of the markup. */
export function getContextBlockType(text: string | undefined | null): ProactiveContextType | null {
	if (!text) return null;

	const type = CONTEXT_TYPE_ATTRIBUTE_REGEX.exec(text)?.[1];
	return PROACTIVE_CONTEXT_TYPES.find((known) => known === type) ?? null;
}

/** Pull complete context blocks out so a user-edited lead can reattach them on send. */
export function extractContextBlocks(text: string): string {
	const blocks = text.match(/<context\b[^>]*>[\s\S]*?<\/context>/gi);
	return blocks?.join('\n\n') ?? '';
}

/** Read one `key: value` line from the first context block body. */
export function getContextBlockField(text: string, field: string): string | null {
	const blockMatch = /<context\b[^>]*>([\s\S]*?)<\/context>/i.exec(text);
	if (!blockMatch) return null;

	const prefix = `${field}: `;
	for (const line of blockMatch[1].split('\n')) {
		if (line.startsWith(prefix)) return line.slice(prefix.length);
	}
	return null;
}

/**
 * Hover copy for the execution-error chip — failed node (if known) plus the
 * error message, so the pill label stays short and the detail is one hover away.
 */
export function getExecutionErrorChipTooltip(text: string): string | null {
	if (getContextBlockType(text) !== 'execution-error') return null;

	const message = getContextBlockField(text, 'message');
	if (!message) return null;

	const failedNode = getContextBlockField(text, 'failed node');
	const nodeName = failedNode?.replace(/\s*\([^)]*\)\s*$/, '').trim();
	return nodeName ? `${nodeName}\n${message}` : message;
}

const CONTEXT_CHIPS: Record<ProactiveContextType, { icon: IconName; labelKey: BaseTextKey }> = {
	'execution-error': {
		icon: 'triangle-alert',
		labelKey: 'instanceAi.proactive.context.executionError',
	},
	'credential-error': {
		icon: 'key-round',
		labelKey: 'instanceAi.proactive.context.credentialError',
	},
	'focused-nodes': {
		icon: 'layers',
		labelKey: 'instanceAi.proactive.context.focusedNodes',
	},
};

/** Context types that land on the explain / debug / fix chooser. */
export const PROACTIVE_ERROR_CONTEXT_TYPES = new Set<ProactiveContextType>([
	'execution-error',
	'credential-error',
]);

/**
 * Pill standing in for a stripped `<context>` block. Shared by the message
 * bubble (what the agent was given) and the floating composer (what a follow-up
 * question will land on), so the two never drift apart.
 */
export function getProactiveContextChip(text: string): { icon: IconName; label: string } | null {
	const i18n = useI18n();
	const type = getContextBlockType(text);
	if (!type) return null;

	const { icon, labelKey } = CONTEXT_CHIPS[type];
	return { icon, label: i18n.baseText(labelKey) };
}

/**
 * Dismissal / dedupe keys for proactive offers, stored alongside the
 * handoff-context keys in `dismissedContextKeys`.
 */
export function executionErrorOfferKey(executionId: string): string {
	return `execution-error:${executionId}`;
}

/** Bounded, readable stand-in for the error string — dismissal keys are persisted. */
function errorFingerprint(errorMessage: string): string {
	return errorMessage.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 64);
}

/**
 * Scoped by credential identity *and* the error, so dismissing the offer for one
 * credential doesn't suppress it for another of the same type, and re-running the
 * same failing test doesn't re-offer — while a credential that starts failing
 * differently still does. Pass the credential id when known, otherwise its
 * display name.
 */
export function credentialErrorOfferKey(
	credentialType: string,
	credentialRef: string,
	errorMessage: string,
): string {
	return `credential-error:${credentialType}:${credentialRef}:${errorFingerprint(errorMessage)}`;
}

/** One offer per new empty workflow canvas — a fresh id means a fresh invite. */
export function emptyWorkflowOfferKey(workflowId: string): string {
	return `empty-workflow:${workflowId}`;
}

export interface ExecutionErrorContext {
	workflowName: string;
	workflowId: string;
	executionId: string;
	executionStatus: string;
	nodeName: string;
	nodeType: string;
	errorMessage: string;
}

export interface CredentialErrorContext {
	credentialType: string;
	/** Credential name as shown in the UI — never its decrypted data. */
	displayName: string;
	/** Node the credential is configured for; absent outside the editor (e.g. the credentials list). */
	nodeName?: string;
	/** The auth error string only; no tokens, keys or headers. */
	errorMessage: string;
	/** Lets the agent read the credential directly instead of guessing which one failed. */
	credentialId?: string;
}

/**
 * Seeded message for a failed run: a short ask the transcript can stand on once
 * the block is stripped (workflow / error already show as chips), followed by
 * the machine-readable context.
 */
export function buildExecutionErrorSeedMessage(context: ExecutionErrorContext): string {
	const i18n = useI18n();

	const lead = i18n.baseText('instanceAi.proactive.executionError.prompt');

	const block = buildContextBlock('execution-error', {
		workflow: `${context.workflowName} (id: ${context.workflowId})`,
		execution: `${context.executionId} (status: ${context.executionStatus})`,
		'failed node': `${context.nodeName} (${context.nodeType})`,
		message: context.errorMessage,
	});

	return `${lead}\n\n${block}`;
}

/**
 * Draft for a credential that failed to authenticate: a short ask the transcript
 * can stand on once the block is stripped (the credential and error show as a
 * chip), followed by the machine-readable context.
 *
 * Asks for an explanation, not a fix: the agent cannot resolve a 401 because it
 * cannot see the user's API key. Its value here is saying what the error means
 * and what to change.
 */
export function buildCredentialErrorSeedMessage(context: CredentialErrorContext): string {
	const i18n = useI18n();

	const lead = i18n.baseText('instanceAi.proactive.credentialError.prompt');

	const block = buildContextBlock('credential-error', {
		credential: `${context.displayName} (type: ${context.credentialType})`,
		'credential id': context.credentialId,
		node: context.nodeName,
		message: context.errorMessage,
	});

	return `${lead}\n\n${block}`;
}

/**
 * Seeded draft for a brand-new empty canvas. No `<context>` block and no
 * workflow attachment — the route id is client-minted until something is saved,
 * so there is nothing useful to hand the agent yet.
 */
export function buildEmptyWorkflowSeedMessage(): string {
	return useI18n().baseText('instanceAi.proactive.emptyWorkflow.prompt');
}

export type FocusedNodesContextInput = {
	nodeName: string;
	nodeType: string;
};

/**
 * Machine-readable node focus for a user message. The FE shows individual node
 * chips; this block is stripped from the bubble and tells the agent which
 * canvas nodes the user pinned.
 */
export function buildFocusedNodesContextBlock(nodes: FocusedNodesContextInput[]): string {
	if (nodes.length === 0) return '';

	const list = nodes.map((node) => `${node.nodeName} (${node.nodeType})`).join(', ');
	return buildContextBlock('focused-nodes', { nodes: list });
}
