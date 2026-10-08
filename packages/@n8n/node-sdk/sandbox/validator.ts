// The SDK validator in a guest: the guest builds put this module in place of
// `src/validator.ts`, so ajv stays in the host. Each call is one `schema.validate` host call, so
// a caller validates a whole page, not each item of it. The value crosses as JSON text, so give
// only JSON values: `undefined` in a list becomes `null`, and a function or a BigInt can throw.
import { validate as witValidate } from 'n8n:node-contract/schema@2.12.0';

import type { validate as hostValidate } from '../src/validator';

/** `validate` of the host, through the `schema` import. */
export const validate: typeof hostValidate = (value, schema, options = {}) =>
	value === undefined
		? []
		: witValidate(
				JSON.stringify(value),
				JSON.stringify(schema),
				options.path ?? 'input',
				options.allowExpressions ?? false,
			);
