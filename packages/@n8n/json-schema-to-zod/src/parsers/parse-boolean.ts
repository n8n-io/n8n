import { z } from 'zod';

import type { JsonSchemaObject } from '../types';

export const parseBoolean = (_jsonSchema: JsonSchemaObject & { type: 'boolean' }) => {
	return z.boolean();
};
