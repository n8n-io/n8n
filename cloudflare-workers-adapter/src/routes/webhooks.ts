/**
 * Webhook Routes
 */

import { Hono } from 'hono';
import { DatabaseService } from '../services/database';

const app = new Hono();

/**
 * Handle webhook requests
 * POST/GET/PUT/DELETE /webhook/:path
 */
app.all('/:path{.*}', async (c) => {
  const db = c.get('db') as DatabaseService;
  const webhookPath = c.req.param('path');
  const method = c.req.method;

  try {
    // Find webhook configuration
    const webhook = await db.query(
      'SELECT * FROM webhooks WHERE webhook_path = ? AND method = ?',
      [webhookPath, method]
    );

    if (!webhook.results || webhook.results.length === 0) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    const webhookConfig = webhook.results[0] as any;
    
    // Get workflow
    const workflow = await db.findWorkflowById(webhookConfig.workflow_id);
    if (!workflow || !workflow.active) {
      return c.json({ error: 'Workflow not active' }, 404);
    }

    // Prepare webhook data
    const webhookData = {
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
      body: method !== 'GET' ? await c.req.text() : undefined,
      method,
      url: c.req.url,
    };

    // Create execution
    const execution = await db.createExecution({
      workflowId: workflow.id,
      mode: 'webhook',
      status: 'running',
      data: { webhookData },
      startedAt: new Date(),
    });

    // Execute workflow via Durable Object
    const executorId = c.env.WORKFLOW_EXECUTOR.idFromName(workflow.id);
    const executor = c.env.WORKFLOW_EXECUTOR.get(executorId);

    const response = await executor.fetch('http://localhost/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionId: execution.id,
        workflowId: workflow.id,
        workflowData: workflow,
        triggerData: webhookData,
        mode: 'webhook',
      }),
    });

    // For webhooks, we typically return immediately
    return c.json({
      message: 'Webhook received',
      executionId: execution.id,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export { app as webhookRoutes };