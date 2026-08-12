import { useI18n } from '@n8n/i18n';

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
export const PROACTIVE_CONTEXT_TYPES = ['execution-error', 'credential-error'] as const;

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

/** Strip every context block so the message renders as the plain-language text alone. */
export function stripContextBlocks(text: string): string {
	return text
		.replace(CONTEXT_BLOCK_REGEX, '')
		.replace(DANGLING_CONTEXT_BLOCK_REGEX, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function hasContextBlock(text: string): boolean {
	return /<context\b[^>]*>/i.test(text);
}

/** Type of the first block, used to pick the chip shown in place of the markup. */
export function getContextBlockType(text: string): ProactiveContextType | null {
	const type = CONTEXT_TYPE_ATTRIBUTE_REGEX.exec(text)?.[1];
	return PROACTIVE_CONTEXT_TYPES.find((known) => known === type) ?? null;
}

/**
 * Dismissal / dedupe keys for proactive offers, stored alongside the
 * handoff-context keys in `dismissedContextKeys`.
 */
export function executionErrorOfferKey(executionId: string): string {
	return `execution-error:${executionId}`;
}

/**
 * Scoped by credential identity, so dismissing the offer for one credential
 * doesn't suppress it for another of the same type. Pass the credential id when
 * known, otherwise its display name.
 */
export function credentialErrorOfferKey(credentialType: string, credentialRef: string): string {
	return `credential-error:${credentialType}:${credentialRef}`;
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
	nodeName: string;
	/** The auth error string only; no tokens, keys or headers. */
	errorMessage: string;
}

/**
 * Seeded message for a failed run: a plain sentence the transcript can stand on
 * once the block is stripped, followed by the machine-readable context.
 */
export function buildExecutionErrorSeedMessage(context: ExecutionErrorContext): string {
	const i18n = useI18n();

	const lead = i18n.baseText('instanceAi.proactive.executionError.prompt', {
		interpolate: { nodeName: context.nodeName, workflowName: context.workflowName },
	});

	const block = buildContextBlock('execution-error', {
		workflow: `${context.workflowName} (id: ${context.workflowId})`,
		execution: `${context.executionId} (status: ${context.executionStatus})`,
		'failed node': `${context.nodeName} (${context.nodeType})`,
		message: context.errorMessage,
	});

	return `${lead}\n\n${block}`;
}

/** Seeded message for a credential that failed to authenticate. */
export function buildCredentialErrorSeedMessage(context: CredentialErrorContext): string {
	const i18n = useI18n();

	const lead = i18n.baseText('instanceAi.proactive.credentialError.prompt', {
		interpolate: { displayName: context.displayName, nodeName: context.nodeName },
	});

	const block = buildContextBlock('credential-error', {
		credential: `${context.displayName} (type: ${context.credentialType})`,
		node: context.nodeName,
		message: context.errorMessage,
	});

	return `${lead}\n\n${block}`;
}
