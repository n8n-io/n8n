import { z } from 'zod';

import { Z } from '../../zod-class';

const aiGatewayMcpServerIconShape = {
	src: z.string(),
	mimeType: z.string().optional(),
	theme: z.enum(['light', 'dark']).optional(),
};

const aiGatewayMcpServerToolShape = {
	name: z.string(),
	title: z.string().optional(),
	readOnlyHint: z.boolean().optional(),
};

const aiGatewayMcpServerShape = {
	// Also the path segment in `/v1/gateway/mcp/<slug>`.
	slug: z.string(),
	name: z.string(),
	title: z.string(),
	description: z.string(),
	tagline: z.string(),
	version: z.string(),
	updatedAt: z.string(),
	websiteUrl: z.string().optional(),
	icons: z.array(z.object(aiGatewayMcpServerIconShape)),
	tags: z.array(z.string()).optional(),
	tools: z.array(z.object(aiGatewayMcpServerToolShape)),
};

export type AiGatewayMcpServer = z.infer<z.ZodObject<typeof aiGatewayMcpServerShape>>;

/** Response of `GET /v1/gateway/mcp-servers`: the gateway-hosted MCP servers. */
export class AiGatewayMcpServersResponse extends Z.class({
	servers: z.array(z.object(aiGatewayMcpServerShape)),
}) {}
