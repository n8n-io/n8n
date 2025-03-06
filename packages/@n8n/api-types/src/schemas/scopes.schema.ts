import { getAllApiKeyScopes } from '@n8n/permissions';
import type { ApiKeyScope } from '@n8n/permissions';
import { z } from 'zod';

const allApiKeyScopes = getAllApiKeyScopes();

export const scopesSchema = z
	.array(z.string())
	.refine((scopes: string[]): scopes is ApiKeyScope[] =>
		scopes.every((scope) => allApiKeyScopes.includes(scope as ApiKeyScope)),
	);
