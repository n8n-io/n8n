import type { ApiKeyScope } from '@n8n/permissions';
import { z } from 'zod';

export const scopesSchema = z
	.array(
		z
			.string()
			.regex(
				/^[a-zA-Z]+:[a-zA-Z]+$/,
				"Each scope must follow the format '{resource}:{scope}' with only letters (e.g., 'workflow:create')",
			),
	)
	.min(1)
	.transform((scopes) => {
		return scopes as ApiKeyScope[];
	});
