import { z } from 'zod';

import type { JsonSchemaObject } from '../types';

export const parseDefault = (_jsonSchema: JsonSchemaObject) => {
	return z.any();
};
