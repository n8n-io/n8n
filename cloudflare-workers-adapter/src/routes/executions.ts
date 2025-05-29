/**
 * Execution Routes
 */

import { Hono } from 'hono';
import { DatabaseService } from '../services/database';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

app.use('*', authMiddleware);

/**
 * GET /executions
 * List executions
 */
app.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  
  const workflowId = c.req.query('workflowId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    let executions;
    
    if (workflowId) {
      // Verify user has access to the workflow
      const workflow = await db.findWorkflowById(workflowId);
      if (!workflow || workflow.userId !== user.id) {
        return c.json({ error: 'Access denied' }, 403);
      }
      
      executions = await db.findExecutionsByWorkflowId(workflowId, limit, offset);
    } else {
      // Get all executions for user's workflows
      const userWorkflows = await db.findWorkflowsByUserId(user.id);
      const workflowIds = userWorkflows.map(w => w.id);
      
      // This would need a more complex query in production
      executions = [];
      for (const wId of workflowIds.slice(0, 10)) { // Limit for demo
        const wExecutions = await db.findExecutionsByWorkflowId(wId, 10, 0);
        executions.push(...wExecutions);
      }
      
      executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      executions = executions.slice(offset, offset + limit);
    }

    return c.json({
      data: executions.map(execution => ({
        id: execution.id,
        workflowId: execution.workflowId,
        mode: execution.mode,
        status: execution.status,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        error: execution.error,
      })),
      total: executions.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return c.json({ error: 'Failed to fetch executions' }, 500);
  }
});

/**
 * GET /executions/:id
 * Get execution details
 */
app.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const executionId = c.req.param('id');

  try {
    const execution = await db.findExecutionById(executionId);
    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    // Verify user has access to the workflow
    const workflow = await db.findWorkflowById(execution.workflowId);
    if (!workflow || workflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({ data: execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return c.json({ error: 'Failed to fetch execution' }, 500);
  }
});

export { app as executionRoutes };