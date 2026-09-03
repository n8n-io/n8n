/**
 * Setup panel v2: the agent announces a workflow's outstanding setup as durable
 * `setup-items` snapshots instead of suspending on a setup card. Items carry
 * identity and requirements only — done-ness is derived client-side — and every
 * snapshot replaces the previous one for its workflowId (see
 * `docs/streaming-protocol.md`).
 */
import {
	GENERIC_AUTH_CREDENTIAL_TYPES,
	type InstanceAiCredentialSetupHint,
	type InstanceAiSetupItem,
} from '@n8n/api-types';

import type { SetupRequest } from './setup-workflow.schema';
import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import type { InstanceAiContext, SetupItemsEmitter } from '../../types';

/**
 * Package-side flag accessor: the host wires an emitter only while the setup
 * panel is enabled. Every setup-panel gate calls this and nothing else.
 */
export function isSetupPanelEnabled(
	context: InstanceAiContext,
): context is InstanceAiContext & { setupItemsEmitter: SetupItemsEmitter } {
	return context.setupItemsEmitter !== undefined;
}

/** Stable fingerprint independent of item order, so a reorder is not a change. */
function fingerprint(items: InstanceAiSetupItem[]): string {
	return JSON.stringify([...items].sort((a, b) => a.id.localeCompare(b.id)));
}

export function createSetupItemsEmitter(options: {
	eventBus: Pick<InstanceAiEventBus, 'publish'>;
	threadId: string;
	runId: string;
	agentId: string;
}): SetupItemsEmitter {
	const { eventBus, threadId, runId, agentId } = options;
	const lastSnapshots = new Map<string, { fingerprint: string; items: InstanceAiSetupItem[] }>();

	const emit = (workflowId: string, items: InstanceAiSetupItem[]): boolean => {
		const next = fingerprint(items);
		if (lastSnapshots.get(workflowId)?.fingerprint === next) return false;
		eventBus.publish(threadId, {
			type: 'setup-items',
			runId,
			agentId,
			payload: { workflowId, items },
		});
		// Cache only what was published, so a failed publish is retried by the
		// next identical snapshot instead of being treated as already sent.
		lastSnapshots.set(workflowId, { fingerprint: next, items });
		return true;
	};

	return {
		emit,
		merge(workflowId, items) {
			const byId = new Map<string, InstanceAiSetupItem>();
			for (const item of lastSnapshots.get(workflowId)?.items ?? []) byId.set(item.id, item);
			for (const item of items) {
				const existing = byId.get(item.id);
				byId.set(item.id, existing ? mergeSetupItem(existing, item) : item);
			}
			return emit(workflowId, [...byId.values()]);
		},
	};
}

/**
 * Field-level merge for one id: incoming fields win, fields the incoming item
 * does not carry (e.g. `nodeBindings` from a build snapshot) survive.
 */
function mergeSetupItem(
	existing: InstanceAiSetupItem,
	incoming: InstanceAiSetupItem,
): InstanceAiSetupItem {
	if (existing.kind === 'credential' && incoming.kind === 'credential') {
		return { ...existing, ...incoming };
	}
	if (existing.kind === 'parameters' && incoming.kind === 'parameters') {
		return { ...existing, ...incoming };
	}
	return incoming;
}

export function credentialSetupItemId(
	workflowId: string,
	credentialType: string,
	nodeName?: string,
): string {
	// Generic auth types identify no service, so nodes cannot share a row (or a
	// done state): one item per node, keyed like the frontend derivation.
	return GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType) && nodeName !== undefined
		? `${workflowId}:credential:${credentialType}:${nodeName}`
		: `${workflowId}:credential:${credentialType}`;
}

export function parametersSetupItemId(workflowId: string, nodeName: string): string {
	return `${workflowId}:parameters:${nodeName}`;
}

/**
 * Items for a `credentials(action="setup")` announcement. There is no node
 * context yet, so credential rows carry no bindings; the next build snapshot
 * fans them out.
 */
export function buildSetupItemsFromCredentialRequests(
	workflowId: string,
	requests: ReadonlyArray<{
		credentialType: string;
		reason?: string;
		setupHint?: InstanceAiCredentialSetupHint;
	}>,
): InstanceAiSetupItem[] {
	const byType = new Map<string, InstanceAiSetupItem>();
	for (const request of requests) {
		const id = credentialSetupItemId(workflowId, request.credentialType);
		if (byType.has(id)) continue;
		byType.set(id, {
			id,
			kind: 'credential',
			credentialType: request.credentialType,
			...(request.reason ? { reason: request.reason } : {}),
			...(request.setupHint ? { setupHint: request.setupHint } : {}),
		});
	}
	return [...byType.values()];
}

/**
 * Whether the request's slot is filled by a stored credential. A Gateway
 * credits slot (`id: null`) is deliberately excluded: the client cannot derive
 * it as done, so listing it would show a permanently open row.
 */
function isBoundToStoredCredential(request: SetupRequest): boolean {
	if (!request.credentialType) return false;
	const bound = request.node.credentials?.[request.credentialType];
	return typeof bound?.id === 'string' && bound.id.length > 0;
}

/**
 * Items for a saved workflow from its setup analysis (`analyzeWorkflow` with
 * `includeSettled`): every credential slot that is open or already bound to a
 * stored credential — service-keyed, fanned out to the nodes that use it — plus
 * one parameters item per node with unresolved parameters.
 */
export function buildSetupItemsFromSetupRequests(
	workflowId: string,
	requests: readonly SetupRequest[],
): InstanceAiSetupItem[] {
	const credentialItems = new Map<string, Extract<InstanceAiSetupItem, { kind: 'credential' }>>();
	const parameterItems = new Map<string, Extract<InstanceAiSetupItem, { kind: 'parameters' }>>();

	for (const request of requests) {
		const nodeName = request.node.name;
		const { credentialType } = request;
		if (
			credentialType !== undefined &&
			(request.credentialNeedsAction === true || isBoundToStoredCredential(request))
		) {
			const id = credentialSetupItemId(workflowId, credentialType, nodeName);
			const existing = credentialItems.get(id);
			if (existing) {
				if (!existing.nodeBindings?.some((binding) => binding.nodeName === nodeName)) {
					existing.nodeBindings = [...(existing.nodeBindings ?? []), { nodeName }];
				}
				if (!existing.setupHint && request.setupHint) existing.setupHint = request.setupHint;
			} else {
				credentialItems.set(id, {
					id,
					kind: 'credential',
					credentialType,
					nodeBindings: [{ nodeName }],
					...(request.setupHint ? { setupHint: request.setupHint } : {}),
				});
			}
		}

		const parameterNames = Object.keys(request.parameterIssues ?? {});
		if (parameterNames.length > 0) {
			const id = parametersSetupItemId(workflowId, nodeName);
			if (!parameterItems.has(id)) {
				parameterItems.set(id, { id, kind: 'parameters', nodeName, parameterNames });
			}
		}
	}

	return [...credentialItems.values(), ...parameterItems.values()];
}
