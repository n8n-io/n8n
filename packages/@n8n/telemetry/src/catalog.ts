import { z } from 'zod/v4';

import type { TelemetryEventRegistry } from './define';

export type TelemetryCatalogProperty = {
	name: string;
	type: string;
	optional: boolean;
	description?: string;
};

export type TelemetryCatalogEntry = {
	domain: string;
	key: string;
	name: string;
	description: string;
	deprecated: boolean;
	properties: TelemetryCatalogProperty[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function typeSummary(schema: Record<string, unknown>): string {
	if (Array.isArray(schema.enum)) {
		return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
	}
	if (Array.isArray(schema.anyOf)) {
		return schema.anyOf.filter(isRecord).map(typeSummary).join(' | ');
	}
	if (typeof schema.type === 'string') return schema.type;
	if (Array.isArray(schema.type)) return schema.type.join(' | ');
	return 'unknown';
}

export function buildCatalog(registry: TelemetryEventRegistry): TelemetryCatalogEntry[] {
	const catalog: TelemetryCatalogEntry[] = [];
	for (const [domain, events] of Object.entries(registry)) {
		for (const [key, entry] of Object.entries(events)) {
			const schema: unknown = z.toJSONSchema(entry.properties);
			const schemaRecord = isRecord(schema) ? schema : {};
			const required = new Set(Array.isArray(schemaRecord.required) ? schemaRecord.required : []);
			const schemaProperties = isRecord(schemaRecord.properties)
				? Object.entries(schemaRecord.properties)
				: [];
			catalog.push({
				domain,
				key,
				name: entry.name,
				description: entry.description,
				deprecated: schemaRecord.deprecated === true,
				properties: schemaProperties.map(([propertyName, property]) => {
					const propertyRecord = isRecord(property) ? property : {};
					return {
						name: propertyName,
						type: typeSummary(propertyRecord),
						optional: !required.has(propertyName),
						...(typeof propertyRecord.description === 'string'
							? { description: propertyRecord.description }
							: {}),
					};
				}),
			});
		}
	}
	return catalog;
}

export function formatCatalog(catalog: TelemetryCatalogEntry[]): string {
	const lines: string[] = [];
	let currentDomain = '';
	for (const entry of catalog) {
		if (entry.domain !== currentDomain) {
			if (currentDomain) lines.push('');
			currentDomain = entry.domain;
			lines.push(entry.domain);
		}
		lines.push(`  ${entry.name}${entry.deprecated ? ' (deprecated)' : ''} — ${entry.description}`);
		for (const property of entry.properties) {
			const propertyDescription = property.description ? ` — ${property.description}` : '';
			lines.push(
				`    ${property.name}${property.optional ? '?' : ''}: ${property.type}${propertyDescription}`,
			);
		}
	}
	return lines.join('\n');
}
