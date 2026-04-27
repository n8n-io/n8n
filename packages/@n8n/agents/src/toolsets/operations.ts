import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import type { AppDefinition, AppOperationStatus, OperationCuration, OperationEntry } from './types';

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

	// Walk follows the n8n convention: a top-level `resource` selector + a
	// per-resource `operation` selector. Operation groups without a
	// `displayOptions.show.resource` are skipped; operations declaring
	// multiple resources are emitted under the first one only. This covers
	// every node that ships through this registry today.
	// TODO: generalize — handle resource-less and multi-resource nodes when
	// they appear in the catalog.
	for (const opProp of operationProps) {
		const resources = (opProp.displayOptions?.show?.resource ?? []) as string[];
		if (resources.length === 0) continue;
		const resource = resources[0];

		for (const opt of opProp.options ?? []) {
			if (!('value' in opt) || typeof opt.value !== 'string') continue;
			const operation = opt.value;
			const fields = filterFieldsForOperation(properties, resource, operation);
			const name = `${resource}:${operation}`;
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
	// Wildcard: granted fullAccessScope satisfies any required scope. The
	// semantic check ("does this wildcard actually cover that scope?") is the
	// responsibility of whoever authored the AppDefinition.
	return true;
}
