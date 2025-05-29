/**
 * Static File Routes
 * Serves the frontend application
 */

import { Hono } from 'hono';

const app = new Hono();

/**
 * Serve frontend application
 * In production, this would serve from R2 or be handled by Cloudflare Pages
 */
app.get('/*', async (c) => {
  const path = c.req.path;
  
  // For now, return a simple HTML page
  // In production, you would serve the actual Vue.js frontend
  if (path === '/' || path.startsWith('/workflows') || path.startsWith('/executions')) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TLS-n8n - Cloudflare Workers</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 800px; margin: 0 auto; }
          .status { padding: 20px; background: #e8f5e8; border-radius: 8px; margin: 20px 0; }
          .api-info { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 TLS-n8n on Cloudflare Workers</h1>
          
          <div class="status">
            <h2>✅ Status: Running</h2>
            <p>Your n8n instance is successfully running on Cloudflare Workers!</p>
          </div>

          <div class="api-info">
            <h2>📡 API Endpoints</h2>
            <ul>
              <li><strong>Authentication:</strong> <code>POST /api/v1/auth/login</code></li>
              <li><strong>Workflows:</strong> <code>GET /api/v1/workflows</code></li>
              <li><strong>Executions:</strong> <code>GET /api/v1/executions</code></li>
              <li><strong>Webhooks:</strong> <code>POST /webhook/your-path</code></li>
              <li><strong>Health Check:</strong> <code>GET /healthz</code></li>
            </ul>
          </div>

          <div class="api-info">
            <h2>🔧 Next Steps</h2>
            <ol>
              <li>Set up your database: <code>wrangler d1 execute n8n-db --local --file=./schema.sql</code></li>
              <li>Create your first user via the API</li>
              <li>Deploy the Vue.js frontend to Cloudflare Pages</li>
              <li>Configure your custom domain</li>
            </ol>
          </div>

          <div class="api-info">
            <h2>📚 Documentation</h2>
            <p>This is an experimental adaptation of n8n for Cloudflare Workers. Features include:</p>
            <ul>
              <li>✅ User authentication with JWT</li>
              <li>✅ Workflow management</li>
              <li>✅ Execution tracking</li>
              <li>✅ Webhook handling</li>
              <li>✅ File storage with R2</li>
              <li>✅ Durable Objects for stateful execution</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  // Handle API documentation
  if (path === '/docs' || path === '/api-docs') {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TLS-n8n API Documentation</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Courier New', monospace; margin: 40px; background: #1a1a1a; color: #00ff00; }
          .container { max-width: 1000px; margin: 0 auto; }
          .endpoint { margin: 20px 0; padding: 15px; border: 1px solid #333; border-radius: 5px; }
          .method { display: inline-block; padding: 4px 8px; border-radius: 3px; font-weight: bold; }
          .get { background: #28a745; color: white; }
          .post { background: #007bff; color: white; }
          .put { background: #ffc107; color: black; }
          .delete { background: #dc3545; color: white; }
          pre { background: #2a2a2a; padding: 15px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔌 TLS-n8n API Documentation</h1>
          
          <div class="endpoint">
            <h3><span class="method post">POST</span> /api/v1/auth/login</h3>
            <p>Authenticate user and get JWT token</p>
            <pre>{
  "email": "user@example.com",
  "password": "password123"
}</pre>
          </div>

          <div class="endpoint">
            <h3><span class="method post">POST</span> /api/v1/auth/register</h3>
            <p>Register new user</p>
            <pre>{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}</pre>
          </div>

          <div class="endpoint">
            <h3><span class="method get">GET</span> /api/v1/workflows</h3>
            <p>List user workflows</p>
            <p><strong>Headers:</strong> Authorization: Bearer &lt;token&gt;</p>
          </div>

          <div class="endpoint">
            <h3><span class="method post">POST</span> /api/v1/workflows</h3>
            <p>Create new workflow</p>
            <pre>{
  "name": "My Workflow",
  "nodes": [...],
  "connections": {...}
}</pre>
          </div>

          <div class="endpoint">
            <h3><span class="method post">POST</span> /api/v1/workflows/:id/execute</h3>
            <p>Execute workflow manually</p>
            <pre>{
  "data": {
    "input": "test data"
  }
}</pre>
          </div>

          <div class="endpoint">
            <h3><span class="method post">POST</span> /webhook/:path</h3>
            <p>Trigger workflow via webhook</p>
            <p>Any data sent to this endpoint will trigger the associated workflow</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  return c.text('Not Found', 404);
});

export { app as staticRoutes };