import { z } from 'zod';

import type { AttributeDefinition } from './types';

function makeAttributeSchema(attributeDefinition: AttributeDefinition, required: boolean = true) {
	let schema: z.ZodTypeAny;

	if (attributeDefinition.type === 'string') {
		schema = z.string();
	} else if (attributeDefinition.type === 'number') {
		schema = z.number();
	} else if (attributeDefinition.type === 'boolean') {
		schema = z.boolean();
	} else if (attributeDefinition.type === 'date') {
		schema = z.string().date();
	} else {
		schema = z.unknown();
	}

	if (!required) {
		schema = schema.optional();
	}

	return schema.describe(attributeDefinition.description);
}

export function makeZodSchemaFromAttributes(attributes: AttributeDefinition[]) {
	const schemaEntries = attributes.map((attr) => [
		attr.name,
		makeAttributeSchema(attr, attr.required),
	]);

	return z.object(Object.fromEntries(schemaEntries));
}
