import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { createMcpServer, createMcpTransport } from './mcp/server.js';
import { BrowserTool } from './tools/index.js';

const PORT = parseInt(process.env.PORT ?? '8766', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

// Initialize browser tool once at startup
const browserTool = new BrowserTool();

const tools = {
	browser: browserTool,
};

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
	'*',
	cors({
		origin: '*',
		credentials: true,
	}),
);

// Health check endpoint
app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		tools: Object.keys(tools),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
	});
});

// MCP Streamable HTTP endpoint - stateless mode
// Each request gets a fresh server and transport instance
app.all('/mcp', async (c) => {
	const mcpServer = createMcpServer(tools);
	const transport = createMcpTransport();
	await mcpServer.connect(transport);
	return await transport.handleRequest(c);
});

// Initialize browser and start server
async function main() {
	console.log('Initializing browser...');
	await browserTool.initialize();

	console.log(`Starting server on ${HOST}:${PORT}`);
	console.log('Available tools:', Object.keys(tools));

	const server = serve({
		fetch: app.fetch,
		port: PORT,
		hostname: HOST,
	});

	// Graceful shutdown
	const gracefulShutdown = async () => {
		console.log('Shutting down gracefully...');

		try {
			await browserTool.close();
			server.close();
			console.log('Server closed');
			process.exit(0);
		} catch (error) {
			console.error('Error during shutdown:', error);
			process.exit(1);
		}
	};

	process.on('SIGTERM', gracefulShutdown);
	process.on('SIGINT', gracefulShutdown);
}

main().catch((error) => {
	console.error('Failed to start server:', error);
	process.exit(1);
});
