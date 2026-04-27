/**
 * FE-local copy of the agents toolsets registry. Mirrors what the backend
 * authors in `@n8n/agents/src/toolsets/`. Kept duplicated rather than shared
 * because `@n8n/agents` is a server-only SDK (pulls undici via MCP/AI SDK)
 * and depending on it from the editor-ui pulls those into the browser bundle.
 *
 * Drift discipline: when adding a new app or changing per-op curation here,
 * mirror the change in `packages/@n8n/agents/src/toolsets/registry/`. Code
 * review is the safety net.
 */
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Types — structurally identical to the backend's @n8n/agents/toolsets/types.
// ---------------------------------------------------------------------------

export type AppOperationStatus = 'available' | 'caution' | 'missing-scope';

export interface OperationCuration {
	requiredScopes?: string[];
	destructive?: boolean;
}

export interface AppDefinition {
	kind: string;
	label: string;
	icon: string;
	nodeType: string;
	nodeTypeVersion: number;
	credentialType: string;
	disabled?: boolean;
	operations?: Record<string, OperationCuration>;
	scopes: {
		fullAccessScope?: string;
	};
}

export interface OperationEntry {
	name: string;
	resource: string;
	operation: string;
	displayName: string;
	description: string;
	properties: INodeProperties[];
	required: string[];
	requiredScopes: string[];
	destructive: boolean;
	status?: AppOperationStatus;
	statusReason?: string;
}

// ---------------------------------------------------------------------------
// Gmail registry entry. Mirrors the backend definition.
// ---------------------------------------------------------------------------

const READ = 'https://www.googleapis.com/auth/gmail.readonly';
const COMPOSE = 'https://www.googleapis.com/auth/gmail.compose';
const MODIFY = 'https://www.googleapis.com/auth/gmail.modify';
const LABELS = 'https://www.googleapis.com/auth/gmail.labels';
const FULL = 'https://mail.google.com/';

const GMAIL_APP: AppDefinition = {
	kind: 'gmail',
	label: 'Gmail',
	icon: 'mail',
	nodeType: 'n8n-nodes-base.gmail',
	nodeTypeVersion: 2.2,
	credentialType: 'gmailOAuth2',

	operations: {
		'message:send': { requiredScopes: [COMPOSE], destructive: true },
		'message:reply': { requiredScopes: [COMPOSE], destructive: true },
		'message:get': { requiredScopes: [READ] },
		'message:getAll': { requiredScopes: [READ] },
		'message:delete': { requiredScopes: [FULL], destructive: true },
		'message:markAsRead': { requiredScopes: [MODIFY], destructive: true },
		'message:markAsUnread': { requiredScopes: [MODIFY], destructive: true },
		'message:addLabels': { requiredScopes: [MODIFY], destructive: true },
		'message:removeLabels': { requiredScopes: [MODIFY], destructive: true },
		'message:sendAndWait': { requiredScopes: [COMPOSE], destructive: true },

		'thread:get': { requiredScopes: [READ] },
		'thread:getAll': { requiredScopes: [READ] },
		'thread:reply': { requiredScopes: [COMPOSE], destructive: true },
		'thread:delete': { requiredScopes: [FULL], destructive: true },
		'thread:trash': { requiredScopes: [MODIFY], destructive: true },
		'thread:untrash': { requiredScopes: [MODIFY], destructive: true },
		'thread:addLabels': { requiredScopes: [MODIFY], destructive: true },
		'thread:removeLabels': { requiredScopes: [MODIFY], destructive: true },

		'label:create': { requiredScopes: [LABELS], destructive: true },
		'label:get': { requiredScopes: [LABELS] },
		'label:getAll': { requiredScopes: [LABELS] },
		'label:delete': { requiredScopes: [LABELS], destructive: true },

		'draft:create': { requiredScopes: [COMPOSE], destructive: true },
		'draft:get': { requiredScopes: [READ] },
		'draft:getAll': { requiredScopes: [READ] },
		'draft:delete': { requiredScopes: [COMPOSE], destructive: true },
	},

	scopes: { fullAccessScope: FULL },
};

export const APP_REGISTRY: readonly AppDefinition[] = [GMAIL_APP];

export function findAppDefinition(kind: string): AppDefinition | undefined {
	return APP_REGISTRY.find((a) => a.kind === kind);
}

// ---------------------------------------------------------------------------
// Operation walker — mirrors backend `buildOperationsFromDescription`.
// ---------------------------------------------------------------------------

const EMPTY_CURATION: OperationCuration = {};

export function buildOperationsFromDescription(
	description: INodeTypeDescription | null | undefined,
	appDef: AppDefinition,
	grantedScopes?: string[],
): OperationEntry[] {
	if (!description) return [];
	const properties = description.properties ?? [];
	const operationProps = properties.filter((p) => p.name === 'operation');
	const entries: OperationEntry[] = [];
	const seen = new Set<string>();

	for (const opProp of operationProps) {
		const resources = (opProp.displayOptions?.show?.resource ?? []) as string[];
		if (resources.length === 0) continue;

		for (const resource of resources) {
			for (const opt of opProp.options ?? []) {
				if (!('value' in opt) || typeof opt.value !== 'string') continue;
				const operation = opt.value;
				const name = `${resource}:${operation}`;
				if (seen.has(name)) continue;
				seen.add(name);

				const fields = filterFieldsForOperation(properties, resource, operation);
				const curation = appDef.operations?.[name] ?? EMPTY_CURATION;
				const requiredScopes = curation.requiredScopes ?? [];
				const destructive = curation.destructive ?? false;

				const entry: OperationEntry = {
					name,
					resource,
					operation,
					displayName: 'name' in opt ? String(opt.name) : operation,
					description:
						('description' in opt && typeof opt.description === 'string' ? opt.description : '') ||
						`${resource} ${operation}`,
					properties: fields,
					required: fields.filter((f) => f.required).map((f) => f.name),
					requiredScopes,
					destructive,
				};

				if (grantedScopes !== undefined) {
					const classification = classify(requiredScopes, destructive, grantedScopes, appDef);
					entry.status = classification.status;
					if (classification.reason) entry.statusReason = classification.reason;
				}

				entries.push(entry);
			}
		}
	}

	return entries;
}

function filterFieldsForOperation(
	properties: INodeProperties[],
	resource: string,
	operation: string,
): INodeProperties[] {
	return properties.filter((p) => {
		if (p.name === 'resource' || p.name === 'operation') return false;
		const show = p.displayOptions?.show;
		if (!show) return false;
		const matchesResource =
			!show.resource || (Array.isArray(show.resource) && show.resource.includes(resource));
		const matchesOperation =
			!show.operation || (Array.isArray(show.operation) && show.operation.includes(operation));
		return matchesResource && matchesOperation;
	});
}

function classify(
	requiredScopes: string[],
	destructive: boolean,
	grantedScopes: string[],
	appDef: AppDefinition,
): { status: AppOperationStatus; reason: string } {
	const granted = new Set(grantedScopes);
	const missing = requiredScopes.filter(
		(s) => !isScopeSatisfied(s, granted, appDef.scopes.fullAccessScope),
	);

	if (missing.length > 0) {
		return {
			status: 'missing-scope',
			reason: `Credential is missing scope: ${missing.join(', ')}`,
		};
	}
	if (destructive) {
		return {
			status: 'caution',
			reason: 'Modifies state — agent can perform without explicit per-call confirmation.',
		};
	}
	return { status: 'available', reason: '' };
}

function isScopeSatisfied(
	required: string,
	granted: Set<string>,
	fullAccessScope?: string,
): boolean {
	if (granted.has(required)) return true;
	if (!fullAccessScope) return false;
	if (!granted.has(fullAccessScope)) return false;
	return true;
}
