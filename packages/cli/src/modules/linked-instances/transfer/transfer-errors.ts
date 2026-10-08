import type { LinkedInstanceRemoteProject, LinkedInstanceSummary } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import { isClientError } from '@/modules/n8n-packages/capabilities/package-tool-error';
import {
	EXPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME as EXPORT_TOOL,
	IMPORT_WORKFLOW_PACKAGE_CAPABILITY_NAME as IMPORT_TOOL,
} from '@/services/capabilities/capability-scopes';

import {
	RemoteInstanceError,
	type RemoteInstanceErrorReason,
} from '../remote/remote-instance.errors';
import { RESPONSE_OVER_LIMIT_MESSAGE } from '../remote/remote-instance.transports';

/** `push` moves a workflow to the linked instance, `pull` brings one back. */
export type TransferDirection = 'push' | 'pull';

/** The audit reason of a failed move: the reason of a remote failure, a refusal, or a bug. */
export type TransferFailureReason = RemoteInstanceErrorReason | 'refused' | 'internal';

/** What a message names: the linked instance and where on it the workflow goes. */
export type TransferErrorContext = {
	direction: TransferDirection;
	/** The name that the user gave the linked instance. */
	name: string;
	/** For example "Ops on Cloud". */
	place: string;
};

/** en-GB messages for the user. They hold no token and no workflow content. */
export const TRANSFER_MESSAGES = {
	workflowNotFound: 'We could not find this workflow, or you do not have permission to see it.',
	archived: 'This workflow is archived. Restore it, then move it.',
	cannotTurnOff:
		'You do not have permission to turn off this workflow here. Move it without turning it off, or ask its owner.',
	cannotCreateInProject:
		'You do not have permission to create workflows in this project. Choose another project.',
	archivedLocalCopy: (workflowName: string) =>
		`The workflow "${workflowName}" in this project came from the same workflow before, but it is archived. Restore it, then try again.`,
	unreachable: (name: string) => `Can't reach ${name}. Check that it's running, then try again.`,
	unauthorised: (name: string) =>
		`${name} refused the access token. Change the token in Settings > Linked instances.`,
	mcpDisabled: (name: string) =>
		`MCP access is turned off in ${name}. Turn it on in ${name} (Settings > Instance-level MCP), then try again.`,
	timeout: (name: string) => `${name} did not answer in time. Try again.`,
	pushTimeout: (name: string) =>
		`${name} did not answer in time, so the workflow can still arrive there. Move it again: a repeated move updates the same copy.`,
	pullTooLarge: (name: string) =>
		`The workflow in ${name} is too large to bring here. A linked instance can send at most 5 MiB.`,
	importFailed: (name: string, text: string) => `${name} could not take the workflow: ${text}`,
	exportFailed: (name: string, text: string) => `${name} could not send the workflow: ${text}`,
	turnOnMcpAccess: (place: string) =>
		`Turn on MCP access for this workflow in ${place}, then try again.`,
	restoreRemoteCopy: (place: string) =>
		`This workflow is archived in ${place}. Restore it there, then try again.`,
	cannotReceive: (name: string) =>
		`${name} cannot receive workflows yet. Check that it runs a recent n8n version and that the access token can change workflows.`,
	builderOff: (name: string) =>
		`${name} cannot receive workflows while its MCP workflow builder is off. Ask an admin of ${name} to set N8N_MCP_BUILDER_ENABLED to true.`,
	cannotSend: (name: string) =>
		`${name} cannot send workflows yet. Check that it runs a recent n8n version and that the access token can read workflows.`,
} as const;

const withoutFullStop = (text: string) => text.replace(/\.$/, '');

/** en-GB warnings of a move that worked in part. */
export const TRANSFER_WARNINGS = {
	personalProjectFallback: (name: string, projectName: string) =>
		`You cannot create workflows in ${projectName} on ${name}, so the workflow went to your personal project there. Choose another project for new automations in Settings > Linked instances.`,
	publishFailed: (name: string, reason: string) =>
		`The workflow is in ${name}, but ${name} could not publish it: ${withoutFullStop(reason)}. Publish it in ${name}.`,
	cannotPublish: (name: string) =>
		`The workflow is in ${name}, but this access token cannot publish workflows there. Publish it in ${name}.`,
	missingNodeTypes: (name: string) =>
		`The workflow is in ${name}, but it uses node types that ${name} does not have, so it is not published. Install them, then publish it in ${name}.`,
	keptLocalLive: (name: string) =>
		`The workflow stays turned on here, because it is not live in ${name}.`,
	turnOffFailed: (reason: string) =>
		`The workflow is still turned on here: ${withoutFullStop(reason)}. Turn it off in the editor.`,
} as const;

/** A refusal of the linked instance that has a message of its own. */
export type RemoteRefusal = 'project-refused' | 'not-in-mcp' | 'archived';

// Remote tool errors have no machine-readable reason, so these phrases of the n8n tools identify them.
const REFUSAL_PHRASES: readonly (readonly [RemoteRefusal, string])[] = [
	['project-refused', 'permission to create workflows in it'],
	['not-in-mcp', 'is not available in MCP'],
	['archived', 'is archived and cannot be accessed'],
];

/** Finds the refusal in the error text of an n8n package tool, or `undefined` for another error. */
export function classifyRemoteRefusal(text: string): RemoteRefusal | undefined {
	return REFUSAL_PHRASES.find(([, phrase]) => text.includes(phrase))?.[0];
}

/** True when the linked instance refused the target project, so the personal project can take the workflow. */
export function isProjectRefusal(error: unknown): boolean {
	return (
		error instanceof RemoteInstanceError &&
		error.reason === 'tool-error' &&
		classifyRemoteRefusal(error.message) === 'project-refused'
	);
}

/** "Ops on Cloud", or "Cloud" for the personal project of the token's user. */
export function describePlace(name: string, project: LinkedInstanceRemoteProject | null): string {
	return project ? `${project.name} on ${name}` : name;
}

/** The context of the messages for a move with this link. */
export function transferContext(
	link: Pick<LinkedInstanceSummary, 'name' | 'defaultRemoteProject'>,
	direction: TransferDirection,
): TransferErrorContext {
	return { direction, name: link.name, place: describePlace(link.name, link.defaultRemoteProject) };
}

function toolErrorMessage(error: RemoteInstanceError, context: TransferErrorContext): string {
	const { direction, name, place } = context;
	const where = direction === 'push' ? place : name;
	const refusal = classifyRemoteRefusal(error.message);
	if (refusal === 'not-in-mcp') return TRANSFER_MESSAGES.turnOnMcpAccess(where);
	if (refusal === 'archived') return TRANSFER_MESSAGES.restoreRemoteCopy(where);
	return direction === 'push'
		? TRANSFER_MESSAGES.importFailed(name, error.message)
		: TRANSFER_MESSAGES.exportFailed(name, error.message);
}

type ReasonMessage = (error: RemoteInstanceError, context: TransferErrorContext) => string;

const REASON_MESSAGES: Record<RemoteInstanceErrorReason, ReasonMessage> = {
	unreachable: (error, { direction, name }) =>
		direction === 'pull' && error.message === RESPONSE_OVER_LIMIT_MESSAGE
			? TRANSFER_MESSAGES.pullTooLarge(name)
			: TRANSFER_MESSAGES.unreachable(name),
	'mcp-disabled': (_, { name }) => TRANSFER_MESSAGES.mcpDisabled(name),
	unauthorised: (_, { name }) => TRANSFER_MESSAGES.unauthorised(name),
	'tool-error': toolErrorMessage,
	timeout: (_, { direction, name }) =>
		direction === 'push' ? TRANSFER_MESSAGES.pushTimeout(name) : TRANSFER_MESSAGES.timeout(name),
};

/** The en-GB message for a failed request to the linked instance. */
export function remoteFailureMessage(
	error: RemoteInstanceError,
	context: TransferErrorContext,
): string {
	return REASON_MESSAGES[error.reason](error, context);
}

/** A remote failure becomes a 400 with an en-GB message. Other errors stay as they are. */
export function toTransferHttpError(error: unknown, context: TransferErrorContext): unknown {
	if (!(error instanceof RemoteInstanceError)) return error;
	return new BadRequestError(remoteFailureMessage(error, context));
}

export function transferFailureReason(error: unknown): TransferFailureReason {
	if (error instanceof RemoteInstanceError) return error.reason;
	return isClientError(error) ? 'refused' : 'internal';
}

/**
 * Why the linked instance cannot take part in a move, or `undefined` when it offers the tool.
 * A push needs the import tool, and a pull needs the export tool.
 */
export function missingToolMessage(
	toolNames: ReadonlySet<string>,
	direction: TransferDirection,
	name: string,
): string | undefined {
	if (direction === 'pull') {
		return toolNames.has(EXPORT_TOOL) ? undefined : TRANSFER_MESSAGES.cannotSend(name);
	}
	if (toolNames.has(IMPORT_TOOL)) return undefined;
	// An instance offers the import only while its MCP workflow builder is on.
	return toolNames.has(EXPORT_TOOL)
		? TRANSFER_MESSAGES.builderOff(name)
		: TRANSFER_MESSAGES.cannotReceive(name);
}
