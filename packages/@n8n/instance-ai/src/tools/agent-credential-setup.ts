import {
	MANAGED_CREDENTIAL_TOKEN,
	shouldAutoResolveCredential,
	type InstanceAiCredentialSetupHint,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type {
	AgentCredentialDefaults,
	AgentCredentialRequestEvent,
	InstanceAiContext,
} from '../types';
import {
	startBrowserCredentialSetup,
	type CredentialToolContext,
	type CredentialsResumeData,
} from './credential-card';
import {
	buildSetupOutcomeMessage,
	isSelectionVerified,
	verifySelectedCredential,
	type SelectedCredentialOutcome,
} from './credential-verification';
import { resolveAgentBuilderTarget } from './orchestration/agent-target-binding';

export interface AgentCredentialRequest {
	credentialType: string;
	reason?: string;
	suggestedName?: string;
	preferNew?: boolean;
	setupHint?: InstanceAiCredentialSetupHint;
	allowManaged?: boolean;
}

interface CredentialCandidate {
	id: string;
	name: string;
}

interface CredentialChoice extends CredentialCandidate {
	credentialType: string;
	managed: boolean;
}

const MANAGED_CREDENTIAL_NAME = 'Managed by n8n';

/** n8n supplies a managed credential only for Episodic Memory embeddings. */
const MANAGED_CREDENTIAL_TYPES = new Set(['openAiApi']);

const NO_DEFAULTS: AgentCredentialDefaults = {
	channelCredentialIds: [],
	managedCredentialAvailable: false,
};

/**
 * Sets up credentials for the selected Agent. A credential is chosen without a
 * card when the choice is clear; the user picks the rest on one card. The
 * result maps each credential type to `{ id, name }`, the shape of
 * `node.credentials` in an Agent config.
 */
export async function setupAgentCredentials(
	context: InstanceAiContext,
	requests: AgentCredentialRequest[],
	ctx: CredentialToolContext,
) {
	const target = await resolveAgentBuilderTarget(context);
	if (!target) {
		return {
			error: 'no_agent_target',
			message: 'No Agent is selected. Call agent_builder_select_agent first, then retry.',
		};
	}

	const delegate = context.builderDelegate;
	const track = (credentialType: string, outcome: AgentCredentialRequestEvent['outcome']) =>
		delegate?.trackCredentialRequest?.(
			target.agentId,
			{ threadId: context.threadId, runId: context.runId },
			{ credentialType, outcome },
		);

	const defaults = (await delegate?.getCredentialDefaults?.(target.agentId)) ?? NO_DEFAULTS;
	const candidates = await listCandidates(context, requests, target.projectId);
	const candidatesFor = (request: AgentCredentialRequest) =>
		candidates.get(request.credentialType) ?? [];

	const choices = new Map<string, CredentialChoice>();
	for (const request of requests) {
		const choice = chooseWithoutCard(request, candidatesFor(request), defaults);
		if (choice) choices.set(request.credentialType, choice);
	}

	const pending = requests.filter((request) => !choices.has(request.credentialType));
	if (pending.length > 0) {
		const { resumeData } = ctx;
		if (!resumeData) {
			for (const request of pending) track(request.credentialType, 'requested');
			return await ctx.suspend({
				requestId: nanoid(),
				message: describeCard(pending),
				severity: 'info',
				credentialRequests: pending.map((request) => ({
					credentialType: request.credentialType,
					reason: request.reason ?? `Required for ${request.credentialType}`,
					existingCredentials: candidatesFor(request),
					...(request.suggestedName ? { suggestedName: request.suggestedName } : {}),
					...(request.preferNew ? { preferNew: true } : {}),
					...(request.setupHint ? { setupHint: request.setupHint } : {}),
				})),
				credentialFlow: { stage: 'generic' },
				projectId: target.projectId,
			});
		}

		if (resumeData.autoSetup) {
			return await startBrowserCredentialSetup(context, resumeData.autoSetup);
		}

		for (const request of pending) {
			const choice = chooseFromResume(request, candidatesFor(request), resumeData);
			track(request.credentialType, choice ? 'provided' : 'skipped');
			if (choice) choices.set(request.credentialType, choice);
		}
	}

	return await reportChoices(context, requests, choices);
}

async function listCandidates(
	context: InstanceAiContext,
	requests: AgentCredentialRequest[],
	projectId: string,
): Promise<Map<string, CredentialCandidate[]>> {
	const types = [...new Set(requests.map((request) => request.credentialType))];
	const entries = await Promise.all(
		types.map(async (type) => {
			const credentials = await context.credentialService.list({ type, projectId });
			return [type, credentials.map(({ id, name }) => ({ id, name }))] as const;
		}),
	);
	return new Map(entries);
}

/**
 * Picks a credential when the choice is clear, in this order: the n8n managed
 * credential, the Agent's chat channel credential, then the only credential of
 * the type. A sole credential of a generic auth type does not identify a
 * service, so it always needs the user's pick. `preferNew` always needs the
 * user's pick.
 */
function chooseWithoutCard(
	request: AgentCredentialRequest,
	candidates: CredentialCandidate[],
	defaults: AgentCredentialDefaults,
): CredentialChoice | undefined {
	const { credentialType } = request;
	if (request.preferNew) return undefined;

	if (
		request.allowManaged &&
		defaults.managedCredentialAvailable &&
		MANAGED_CREDENTIAL_TYPES.has(credentialType)
	) {
		return {
			credentialType,
			id: MANAGED_CREDENTIAL_TOKEN,
			name: MANAGED_CREDENTIAL_NAME,
			managed: true,
		};
	}

	const channelCredential = candidates.find((candidate) =>
		defaults.channelCredentialIds.includes(candidate.id),
	);
	if (channelCredential) return { credentialType, ...channelCredential, managed: false };

	if (shouldAutoResolveCredential(credentialType, candidates.length)) {
		return { credentialType, ...candidates[0], managed: false };
	}

	return undefined;
}

function chooseFromResume(
	request: AgentCredentialRequest,
	candidates: CredentialCandidate[],
	resumeData: CredentialsResumeData,
): CredentialChoice | undefined {
	const id = resumeData.approved ? resumeData.credentials?.[request.credentialType] : undefined;
	if (!id) return undefined;

	const name = candidates.find((candidate) => candidate.id === id)?.name ?? id;
	return { credentialType: request.credentialType, id, name, managed: false };
}

function describeCard(requests: AgentCredentialRequest[]): string {
	const typeNames = requests.map((request) => request.credentialType).join(', ');
	return requests.length === 1
		? `Select or create a ${typeNames} credential`
		: `Select or create credentials: ${typeNames}`;
}

async function reportChoices(
	context: InstanceAiContext,
	requests: AgentCredentialRequest[],
	choices: Map<string, CredentialChoice>,
) {
	const chosen = [...choices.values()];
	const selections = await Promise.all(
		chosen.map(
			async (choice): Promise<SelectedCredentialOutcome> =>
				choice.managed
					? {
							credentialType: choice.credentialType,
							credentialId: choice.id,
							connection: 'managed',
						}
					: await verifySelectedCredential(context, choice.credentialType, choice.id),
		),
	);
	const skipped = requests
		.map((request) => request.credentialType)
		.filter((credentialType) => !choices.has(credentialType));

	const message = [
		selections.length > 0 ? buildSetupOutcomeMessage(selections) : undefined,
		skipped.length > 0
			? `No credential was chosen for ${skipped.join(', ')}. Leave the features that need them out or disabled.`
			: undefined,
	]
		.filter((part) => part !== undefined)
		.join(' ');

	return {
		success: true,
		credentials: Object.fromEntries(
			chosen.map((choice) => [choice.credentialType, { id: choice.id, name: choice.name }]),
		),
		verified: skipped.length === 0 && selections.every(isSelectionVerified),
		selections,
		...(skipped.length > 0 ? { skipped } : {}),
		message,
	};
}
