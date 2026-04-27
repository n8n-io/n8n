import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import type { AppDefinition, OperationEntry } from './types';

export function buildOperationsFromDescription(
	description: INodeTypeDescription | null | undefined,
	_appDef: AppDefinition,
): OperationEntry[] {
	if (!description) return [];
	const properties = description.properties ?? [];
	const operationProps = properties.filter((p) => p.name === 'operation');
	const entries: OperationEntry[] = [];
	const seen = new Set<string>();

	// Walk follows the n8n convention: a top-level `resource` selector + a
	// per-resource `operation` selector. Operation groups without a
	// `displayOptions.show.resource` are skipped (resource-less nodes are not
	// yet supported by the registry).
	//
	// When an operation group declares multiple resources (an option that
	// applies to several resources at once), emit one entry per resource so
	// the agent can target each. `seen` dedupes in the rare case the same
	// `resource:operation` pair appears in two operation groups.
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

				entries.push({
					name,
					resource,
					operation,
					displayName: 'name' in opt ? String(opt.name) : operation,
					description:
						('description' in opt && typeof opt.description === 'string' ? opt.description : '') ||
						`${resource} ${operation}`,
					properties: fields,
					required: fields.filter((f) => f.required).map((f) => f.name),
				});
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
