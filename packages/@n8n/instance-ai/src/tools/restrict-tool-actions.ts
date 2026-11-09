import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';

export function restrictToolActions<T extends z.ZodDiscriminatedUnionOption<'action'>>(
	actions: readonly T[],
	allowedActions?: readonly string[],
) {
	const [first, ...rest] = actions.filter(
		(schema) =>
			!allowedActions ||
			allowedActions.some((action) => schema.shape.action.safeParse(action).success),
	);

	if (!first) throw new Error('Tool requires at least one allowed action');

	return sanitizeInputSchema(z.discriminatedUnion('action', [first, ...rest]));
}
