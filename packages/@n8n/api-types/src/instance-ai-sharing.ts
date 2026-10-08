import type { Scope } from '@n8n/permissions';

import type { InstanceAiConfirmRequest } from './dto/instance-ai/instance-ai-confirm-request.dto';

/**
 * Rules for teammates who answer a card in a shared Assistant thread. The answer runs as the
 * thread owner, so a teammate answers only the cards listed here, and only with the access to
 * do the same action on the same resource. Every other card is for the owner only.
 */

/** The resource that a card changes. A `project` target is the thread's own project. */
export interface SharedCardTarget {
	type: 'workflow' | 'credential' | 'dataTable' | 'project';
	id: string;
}

/** A teammate answers a card with every scope in `scopes`, in the thread's project and on `target`. */
export interface SharedCardRule {
	scopes: Scope[];
	target: SharedCardTarget;
}

/** The card that waits for an answer: the tool call and the payload that the card shows. */
export interface SharedCard {
	toolName: string;
	input: unknown;
	suspendPayload: unknown;
}

type Fields = Record<string, unknown>;

interface CardFacts {
	input: Fields;
	payload: Fields;
	answer: InstanceAiConfirmRequest;
	/** The project of the thread. */
	projectId: string;
}

type ToolRule = (facts: CardFacts) => SharedCardRule | undefined;

type ActionScopes = Readonly<Record<string, Scope>>;

function isFields(value: unknown): value is Fields {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scopeOf(scopes: ActionScopes, action: unknown): Scope | undefined {
	return typeof action === 'string' && Object.hasOwn(scopes, action) ? scopes[action] : undefined;
}

function ruleOn(
	type: SharedCardTarget['type'],
	id: unknown,
	scopes: Scope[],
): SharedCardRule | undefined {
	return typeof id === 'string' && id.length > 0 ? { scopes, target: { type, id } } : undefined;
}

/** The fields of a yes-or-no card. A card with more fields asks the owner for more. */
const APPROVAL_CARD_FIELDS: ReadonlySet<string> = new Set([
	'requestId',
	'message',
	'severity',
	'resourceName',
	'approvalDetails',
]);

const isApprovalCard = (payload: Fields) =>
	Object.keys(payload).every((field) => APPROVAL_CARD_FIELDS.has(field));

/** A capability card keeps the options that it offered. Its answer is a capability decision. */
const isCapabilityCard = (payload: Fields) => isFields(payload.offered);

/**
 * A teammate approves or declines, with the answer kind of the card. Text goes to the
 * Assistant like a message, so only the owner sends it.
 */
function decidesCard(payload: Fields, answer: InstanceAiConfirmRequest): boolean {
	if (answer.kind === 'capabilityDecision') return isCapabilityCard(payload);
	if (answer.kind === 'approval') return isApprovalCard(payload) && !answer.userInput?.trim();
	return false;
}

/**
 * Keeping a proposed automation changes the workflow. Turning it on publishes it, and keeping
 * an archived workflow restores it, which needs the delete scope. A card that does not say
 * that the workflow is not archived counts as archived.
 */
const automationRule: ToolRule = ({ input, payload, answer }) => {
	if (answer.kind !== 'capabilityDecision') return undefined;
	const scopes: Scope[] = ['workflow:update'];
	if (answer.approved && answer.values?.activate === true) scopes.push('workflow:publish');
	const proposal = isFields(payload.automationProposal) ? payload.automationProposal : {};
	if (answer.approved && proposal.archived !== false) scopes.push('workflow:delete');
	return ruleOn('workflow', input.workflowId, scopes);
};

/**
 * Publishing is not listed: it also publishes the sub-workflows that the workflow calls when
 * the answer arrives, which can be workflows that the teammate cannot see.
 */
const WORKFLOW_ACTION_SCOPES: ActionScopes = {
	delete: 'workflow:delete',
	unarchive: 'workflow:delete',
	unpublish: 'workflow:unpublish',
	'restore-version': 'workflow:update',
	'update-version': 'workflow:update',
};

const RUN_ACTION_SCOPES: ActionScopes = {
	run: 'workflow:execute',
	'run-step': 'workflow:execute',
};

const CREDENTIAL_ACTION_SCOPES: ActionScopes = { delete: 'credential:delete' };

const DATA_TABLE_ACTION_SCOPES: ActionScopes = {
	delete: 'dataTable:delete',
	'add-column': 'dataTable:update',
	'delete-column': 'dataTable:update',
	'rename-column': 'dataTable:update',
	'insert-rows': 'dataTable:writeRow',
	'update-rows': 'dataTable:writeRow',
	'delete-rows': 'dataTable:writeRow',
};

const FOLDER_ACTION_SCOPES: ActionScopes = {
	'create-folder': 'folder:create',
	'delete-folder': 'folder:delete',
};

/** A tool action on the resource that `idField` of the input names. */
const actionOn =
	(scopes: ActionScopes, type: SharedCardTarget['type'], idField: string): ToolRule =>
	({ input }) => {
		const scope = scopeOf(scopes, input.action);
		return scope ? ruleOn(type, input[idField], [scope]) : undefined;
	};

/** The Assistant creates data tables in the thread's project. */
const dataTablesRule: ToolRule = (facts) =>
	facts.input.action === 'create'
		? ruleOn('project', facts.projectId, ['dataTable:create'])
		: actionOn(DATA_TABLE_ACTION_SCOPES, 'dataTable', 'dataTableId')(facts);

/** Folder actions name their project. A teammate answers them only for the thread's project. */
const foldersRule: ToolRule = ({ input, projectId }) => {
	const scope = scopeOf(FOLDER_ACTION_SCOPES, input.action);
	return scope && input.projectId === projectId ? ruleOn('project', projectId, [scope]) : undefined;
};

/** The cards that a teammate can answer, by tool name. */
const TOOL_RULES: Readonly<Record<string, ToolRule>> = {
	propose_automation: automationRule,
	workflows: actionOn(WORKFLOW_ACTION_SCOPES, 'workflow', 'workflowId'),
	executions: actionOn(RUN_ACTION_SCOPES, 'workflow', 'workflowId'),
	credentials: actionOn(CREDENTIAL_ACTION_SCOPES, 'credential', 'credentialId'),
	'data-tables': dataTablesRule,
	workspace: foldersRule,
};

/**
 * What a teammate needs to give `answer` to `card` in a shared thread of project `projectId`.
 * Undefined when only the thread owner can give that answer.
 */
export function sharedCardRule(
	card: SharedCard,
	answer: InstanceAiConfirmRequest,
	projectId: string,
): SharedCardRule | undefined {
	const { toolName, input, suspendPayload: payload } = card;
	if (!Object.hasOwn(TOOL_RULES, toolName) || !isFields(input) || !isFields(payload)) {
		return undefined;
	}
	if (!decidesCard(payload, answer)) return undefined;
	return TOOL_RULES[toolName]({ input, payload, answer, projectId });
}
