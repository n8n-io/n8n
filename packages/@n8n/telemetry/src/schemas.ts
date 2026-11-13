import { z } from 'zod/v4';

export const assistantSurfaceSchema = z
	.enum(['aia', 'mcp'])
	.describe('Assistant surface that acted. The settings area cannot fire this event');

export const publicApiClientSchema = z
	.enum(['editor_ui', 'other'])
	.describe(
		'Set when public_api is true. editor_ui when the n8n editor called the route, other for any other client.',
	);
