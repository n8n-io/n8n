import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ComputerTool, BashTool, EditTool } from './tools';
import { createMcpServer, createMcpTransport } from './mcp/server';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Initialize tools once at startup
const tools = {
	computer: new ComputerTool(),
	bash: new BashTool(),
	str_replace_editor: new EditTool(),
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
	return transport.handleRequest(c);
});

// Start server
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
