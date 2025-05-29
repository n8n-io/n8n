/**
 * General API Routes
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

/**
 * GET /api/v1/me
 * Get current user info
 */
app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  
  return c.json({
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
});

/**
 * GET /api/v1/node-types
 * Get available node types (simplified)
 */
app.get('/node-types', authMiddleware, async (c) => {
  // In a real implementation, this would load from the nodes packages
  const nodeTypes = [
    {
      name: 'n8n-nodes-base.httpRequest',
      displayName: 'HTTP Request',
      description: 'Makes an HTTP request',
      group: ['transform'],
      version: 1,
      defaults: {
        name: 'HTTP Request',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'URL',
          name: 'url',
          type: 'string',
          default: '',
          required: true,
        },
        {
          displayName: 'Method',
          name: 'method',
          type: 'options',
          options: [
            { name: 'GET', value: 'GET' },
            { name: 'POST', value: 'POST' },
            { name: 'PUT', value: 'PUT' },
            { name: 'DELETE', value: 'DELETE' },
          ],
          default: 'GET',
        },
      ],
    },
    {
      name: 'n8n-nodes-base.set',
      displayName: 'Set',
      description: 'Sets values',
      group: ['transform'],
      version: 1,
      defaults: {
        name: 'Set',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Values to Set',
          name: 'values',
          type: 'fixedCollection',
          default: {},
        },
      ],
    },
    {
      name: 'n8n-nodes-base.webhook',
      displayName: 'Webhook',
      description: 'Receives webhook calls',
      group: ['trigger'],
      version: 1,
      defaults: {
        name: 'Webhook',
      },
      inputs: [],
      outputs: ['main'],
      webhooks: [
        {
          name: 'default',
          httpMethod: 'POST',
          responseMode: 'onReceived',
          path: 'webhook',
        },
      ],
      properties: [
        {
          displayName: 'HTTP Method',
          name: 'httpMethod',
          type: 'options',
          options: [
            { name: 'GET', value: 'GET' },
            { name: 'POST', value: 'POST' },
          ],
          default: 'POST',
        },
        {
          displayName: 'Path',
          name: 'path',
          type: 'string',
          default: 'webhook',
        },
      ],
    },
  ];

  return c.json({
    data: nodeTypes,
  });
});

/**
 * GET /api/v1/settings
 * Get application settings
 */
app.get('/settings', authMiddleware, async (c) => {
  return c.json({
    data: {
      deployment: {
        type: 'cloudflare-workers',
      },
      userManagement: {
        enabled: true,
      },
      features: {
        webhooks: true,
        workflows: true,
        executions: true,
      },
      limits: {
        maxWorkflows: 100,
        maxExecutionsPerWorkflow: 1000,
      },
    },
  });
});

export { app as apiRoutes };