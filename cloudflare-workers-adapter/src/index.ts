/**
 * TLS-n8n Cloudflare Workers Entry Point
 * 
 * This is the main entry point for the Cloudflare Workers adaptation of n8n.
 * It replaces the Express.js server with Hono.js and adapts to Workers environment.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { authRoutes } from './routes/auth';
import { workflowRoutes } from './routes/workflows';
import { executionRoutes } from './routes/executions';
import { webhookRoutes } from './routes/webhooks';
import { staticRoutes } from './routes/static';
import { apiRoutes } from './routes/api';
// import { wsHandler } from './websocket/handler';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { DatabaseService } from './services/database';
import { StorageService } from './services/storage';

// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  WORKFLOW_EXECUTOR: DurableObjectNamespace;
  WEBSOCKET_HANDLER: DurableObjectNamespace;
  
  // Environment variables
  NODE_ENV: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  N8N_HOST: string;
  N8N_PORT: string;
  N8N_PROTOCOL: string;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['https://your-frontend.pages.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Initialize services middleware
app.use('*', async (c, next) => {
  // Initialize database service
  c.set('db', new DatabaseService(c.env.DB));
  
  // Initialize storage service
  c.set('storage', new StorageService(c.env.R2));
  
  await next();
});

// Health check endpoint
app.get('/healthz', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.NODE_ENV 
  });
});

// API routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/workflows', workflowRoutes);
app.route('/api/v1/executions', executionRoutes);
app.route('/webhook', webhookRoutes);
app.route('/api/v1', apiRoutes);

// Static file serving (for frontend)
app.route('/', staticRoutes);

// WebSocket upgrade handler
app.get('/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  // Get Durable Object for WebSocket handling
  const id = c.env.WEBSOCKET_HANDLER.idFromName('main');
  const wsHandler = c.env.WEBSOCKET_HANDLER.get(id);
  
  await wsHandler.fetch('http://localhost/ws', {
    headers: { 'Upgrade': 'websocket' },
    // @ts-ignore
    webSocket: server,
  });

  return new Response(null, {
    status: 101,
    // @ts-ignore
    webSocket: client,
  });
});

// Error handling
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

export default app;

// Export Durable Object classes
export { WorkflowExecutor } from './durable-objects/workflow-executor';
export { WebSocketHandler } from './durable-objects/websocket-handler';