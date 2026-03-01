import { z } from 'zod';

import type { JsonSchemaObject, Serializable } from '../types';

export const parseConst = (jsonSchema: JsonSchemaObject & { const: Serializable }) => {
	return z.literal(jsonSchema.const as z.Primitive);
};
