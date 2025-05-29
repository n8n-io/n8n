/**
 * Workflow Routes
 * 
 * API endpoints for workflow management, adapted from the original Express routes.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { DatabaseService } from '../services/database';
import { StorageService } from '../services/storage';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const app = new Hono();

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  nodes: z.array(z.any()),
  connections: z.any(),
  settings: z.any().optional(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nodes: z.array(z.any()).optional(),
  connections: z.any().optional(),
  settings: z.any().optional(),
  active: z.boolean().optional(),
});

// Apply authentication to all routes
app.use('*', authMiddleware);

/**
 * GET /workflows
 * List user's workflows
 */
app.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search');

  try {
    let workflows = await db.findWorkflowsByUserId(user.id, limit, offset);

    // Simple search filter (in production, this would be done in the database)
    if (search) {
      workflows = workflows.filter(w => 
        w.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return c.json({
      data: workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        nodeCount: workflow.nodes?.length || 0,
      })),
      total: workflows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return c.json({ error: 'Failed to fetch workflows' }, 500);
  }
});

/**
 * POST /workflows
 * Create a new workflow
 */
app.post('/', validateRequest(createWorkflowSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const storage = c.get('storage') as StorageService;
  
  const workflowData = await c.req.json();

  try {
    const workflow = await db.createWorkflow({
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings,
      userId: user.id,
    });

    // Create backup
    await storage.storeWorkflowBackup(workflow.id, {
      ...workflow,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings,
    });

    return c.json({
      data: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings,
        active: workflow.active,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating workflow:', error);
    return c.json({ error: 'Failed to create workflow' }, 500);
  }
});

/**
 * GET /workflows/:id
 * Get a specific workflow
 */
app.get('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const workflowId = c.req.param('id');

  try {
    const workflow = await db.findWorkflowById(workflowId);

    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // Check ownership (in production, also check shared workflows)
    if (workflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({
      data: workflow,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return c.json({ error: 'Failed to fetch workflow' }, 500);
  }
});

/**
 * PUT /workflows/:id
 * Update a workflow
 */
app.put('/:id', validateRequest(updateWorkflowSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const storage = c.get('storage') as StorageService;
  const workflowId = c.req.param('id');
  
  const updates = await c.req.json();

  try {
    // Check if workflow exists and user has access
    const existingWorkflow = await db.findWorkflowById(workflowId);
    if (!existingWorkflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    if (existingWorkflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Create backup before updating
    await storage.storeWorkflowBackup(workflowId, existingWorkflow);

    // Update workflow
    const updatedWorkflow = await db.updateWorkflow(workflowId, updates);

    return c.json({
      data: {
        ...updatedWorkflow,
        nodes: updates.nodes || existingWorkflow.nodes,
        connections: updates.connections || existingWorkflow.connections,
        settings: updates.settings || existingWorkflow.settings,
      },
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return c.json({ error: 'Failed to update workflow' }, 500);
  }
});

/**
 * DELETE /workflows/:id
 * Delete a workflow
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const storage = c.get('storage') as StorageService;
  const workflowId = c.req.param('id');

  try {
    // Check if workflow exists and user has access
    const workflow = await db.findWorkflowById(workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    if (workflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Create final backup
    await storage.storeWorkflowBackup(workflowId, workflow);

    // Delete workflow
    await db.deleteWorkflow(workflowId);

    return c.json({
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return c.json({ error: 'Failed to delete workflow' }, 500);
  }
});

/**
 * POST /workflows/:id/activate
 * Activate a workflow
 */
app.post('/:id/activate', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const workflowId = c.req.param('id');

  try {
    const workflow = await db.findWorkflowById(workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    if (workflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Validate workflow before activation
    const validationResult = await validateWorkflowForActivation(workflow);
    if (!validationResult.valid) {
      return c.json({ 
        error: 'Workflow validation failed',
        details: validationResult.errors 
      }, 400);
    }

    // Update workflow status
    await db.updateWorkflow(workflowId, { active: true });

    // TODO: Register triggers, webhooks, etc.

    return c.json({
      message: 'Workflow activated successfully',
      data: { id: workflowId, active: true },
    });
  } catch (error) {
    console.error('Error activating workflow:', error);
    return c.json({ error: 'Failed to activate workflow' }, 500);
  }
});

/**
 * POST /workflows/:id/deactivate
 * Deactivate a workflow
 */
app.post('/:id/deactivate', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const workflowId = c.req.param('id');

  try {
    const workflow = await db.findWorkflowById(workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    if (workflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Update workflow status
    await db.updateWorkflow(workflowId, { active: false });

    // TODO: Unregister triggers, webhooks, etc.

    return c.json({
      message: 'Workflow deactivated successfully',
      data: { id: workflowId, active: false },
    });
  } catch (error) {
    console.error('Error deactivating workflow:', error);
    return c.json({ error: 'Failed to deactivate workflow' }, 500);
  }
});

/**
 * POST /workflows/:id/execute
 * Execute a workflow manually
 */
app.post('/:id/execute', async (c) => {
  const user = c.get('user');
  const db = c.get('db') as DatabaseService;
  const workflowId = c.req.param('id');
  const { data: triggerData } = await c.req.json();

  try {
    const workflow = await db.findWorkflowById(workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    if (workflow.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Create execution record
    const execution = await db.createExecution({
      workflowId,
      mode: 'manual',
      status: 'running',
      data: { triggerData },
      startedAt: new Date(),
    });

    // Get Workflow Executor Durable Object
    const executorId = c.env.WORKFLOW_EXECUTOR.idFromName(workflowId);
    const executor = c.env.WORKFLOW_EXECUTOR.get(executorId);

    // Start execution
    const response = await executor.fetch('http://localhost/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionId: execution.id,
        workflowId,
        workflowData: workflow,
        triggerData,
        mode: 'manual',
      }),
    });

    const result = await response.json();

    return c.json({
      data: {
        executionId: execution.id,
        workflowId,
        status: 'started',
        ...result,
      },
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return c.json({ error: 'Failed to execute workflow' }, 500);
  }
});

/**
 * Validate workflow for activation
 */
async function validateWorkflowForActivation(workflow: any): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check if workflow has nodes
  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }

  // Check for trigger nodes
  const triggerNodes = workflow.nodes.filter((node: any) => 
    node.type.includes('trigger') || node.type.includes('webhook')
  );

  if (triggerNodes.length === 0) {
    errors.push('Workflow must have at least one trigger node');
  }

  // Validate node connections
  const nodeIds = new Set(workflow.nodes.map((node: any) => node.id));
  const connections = workflow.connections || {};

  for (const [sourceNodeId, sourceConnections] of Object.entries(connections)) {
    if (!nodeIds.has(sourceNodeId)) {
      errors.push(`Connection references non-existent source node: ${sourceNodeId}`);
    }

    for (const [outputIndex, outputs] of Object.entries(sourceConnections as any)) {
      for (const output of outputs as any[]) {
        if (!nodeIds.has(output.node)) {
          errors.push(`Connection references non-existent target node: ${output.node}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export { app as workflowRoutes };