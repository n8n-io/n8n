import { z } from 'zod/v4';

export const assistantSurfaceSchema = z
	.enum(['aia', 'mcp'])
	.describe('Assistant surface that acted. The settings area cannot fire this event');

export const publicApiClientSchema = z
	.enum(['editor_ui', 'n8n_node', 'other'])
	.describe('Set when public_api is true. other is the default catch-all value.');
