import { isRecord } from '@n8n/utils/is-record';
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

function typeSummary(schema: Record<string, unknown>): string {
	if ('const' in schema) return JSON.stringify(schema.const);
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
			const variants = (
				Array.isArray(schemaRecord.anyOf) ? schemaRecord.anyOf.filter(isRecord) : [schemaRecord]
			).map((variant) => ({
				required: new Set(Array.isArray(variant.required) ? variant.required : []),
				properties: isRecord(variant.properties) ? variant.properties : {},
			}));
			const propertyNames = new Set(variants.flatMap((variant) => Object.keys(variant.properties)));
			catalog.push({
				domain,
				key,
				name: entry.name,
				description: entry.description,
				deprecated: schemaRecord.deprecated === true,
				properties: [...propertyNames].map((propertyName) => {
					const propertyVariants = variants
						.map((variant) => variant.properties[propertyName])
						.filter(isRecord);
					const description = propertyVariants.find(
						(property) => typeof property.description === 'string',
					)?.description;
					return {
						name: propertyName,
						type: [...new Set(propertyVariants.map(typeSummary))].join(' | '),
						optional: variants.some((variant) => !variant.required.has(propertyName)),
						...(typeof description === 'string' ? { description } : {}),
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
