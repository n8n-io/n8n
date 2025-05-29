/**
 * Workflow Executor Durable Object
 * 
 * This Durable Object handles workflow execution in a stateful manner,
 * replacing the original queue-based execution system.
 */

import { DurableObject } from 'cloudflare:workers';

interface WorkflowExecutionState {
  id: string;
  workflowId: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  currentNodeIndex: number;
  executionData: any;
  startTime: number;
  lastActivity: number;
}

export class WorkflowExecutor extends DurableObject {
  private executions: Map<string, WorkflowExecutionState> = new Map();
  private timers: Map<string, number> = new Map();

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    
    // Restore state from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<Map<string, WorkflowExecutionState>>('executions');
      if (stored) {
        this.executions = stored;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/execute':
          return await this.handleExecuteWorkflow(request);
        case '/status':
          return await this.handleGetStatus(request);
        case '/pause':
          return await this.handlePauseExecution(request);
        case '/resume':
          return await this.handleResumeExecution(request);
        case '/cancel':
          return await this.handleCancelExecution(request);
        case '/cleanup':
          return await this.handleCleanup(request);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('WorkflowExecutor error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Start workflow execution
   */
  private async handleExecuteWorkflow(request: Request): Promise<Response> {
    const { executionId, workflowId, workflowData, triggerData, mode } = await request.json();

    const execution: WorkflowExecutionState = {
      id: executionId,
      workflowId,
      status: 'running',
      currentNodeIndex: 0,
      executionData: {
        workflow: workflowData,
        trigger: triggerData,
        mode,
        nodes: {},
        startTime: Date.now(),
      },
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    this.executions.set(executionId, execution);
    await this.persistState();

    // Start execution in background
    this.executeWorkflowAsync(executionId);

    return new Response(JSON.stringify({ 
      executionId, 
      status: 'started',
      message: 'Workflow execution started' 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get execution status
   */
  private async handleGetStatus(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const executionId = url.searchParams.get('executionId');

    if (!executionId) {
      return new Response(JSON.stringify({ error: 'executionId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const execution = this.executions.get(executionId);
    if (!execution) {
      return new Response(JSON.stringify({ error: 'Execution not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      currentNodeIndex: execution.currentNodeIndex,
      startTime: execution.startTime,
      lastActivity: execution.lastActivity,
      duration: Date.now() - execution.startTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Pause execution
   */
  private async handlePauseExecution(request: Request): Promise<Response> {
    const { executionId } = await request.json();
    const execution = this.executions.get(executionId);

    if (!execution) {
      return new Response(JSON.stringify({ error: 'Execution not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    execution.status = 'paused';
    execution.lastActivity = Date.now();
    await this.persistState();

    // Clear any running timer
    const timerId = this.timers.get(executionId);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(executionId);
    }

    return new Response(JSON.stringify({ 
      executionId, 
      status: 'paused',
      message: 'Execution paused' 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Resume execution
   */
  private async handleResumeExecution(request: Request): Promise<Response> {
    const { executionId } = await request.json();
    const execution = this.executions.get(executionId);

    if (!execution) {
      return new Response(JSON.stringify({ error: 'Execution not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (execution.status !== 'paused') {
      return new Response(JSON.stringify({ error: 'Execution is not paused' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    execution.status = 'running';
    execution.lastActivity = Date.now();
    await this.persistState();

    // Resume execution
    this.executeWorkflowAsync(executionId);

    return new Response(JSON.stringify({ 
      executionId, 
      status: 'running',
      message: 'Execution resumed' 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Cancel execution
   */
  private async handleCancelExecution(request: Request): Promise<Response> {
    const { executionId } = await request.json();
    const execution = this.executions.get(executionId);

    if (!execution) {
      return new Response(JSON.stringify({ error: 'Execution not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    execution.status = 'error';
    execution.executionData.error = 'Execution cancelled by user';
    execution.lastActivity = Date.now();
    
    // Clear timer
    const timerId = this.timers.get(executionId);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(executionId);
    }

    await this.persistState();

    return new Response(JSON.stringify({ 
      executionId, 
      status: 'cancelled',
      message: 'Execution cancelled' 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Clean up old executions
   */
  private async handleCleanup(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const maxAge = parseInt(url.searchParams.get('maxAge') || '3600000'); // 1 hour default

    const now = Date.now();
    let cleanedCount = 0;

    for (const [executionId, execution] of this.executions.entries()) {
      if (now - execution.lastActivity > maxAge) {
        this.executions.delete(executionId);
        
        // Clear any associated timer
        const timerId = this.timers.get(executionId);
        if (timerId) {
          clearTimeout(timerId);
          this.timers.delete(executionId);
        }
        
        cleanedCount++;
      }
    }

    await this.persistState();

    return new Response(JSON.stringify({ 
      cleanedCount,
      remainingExecutions: this.executions.size,
      message: `Cleaned up ${cleanedCount} old executions` 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Execute workflow asynchronously
   */
  private async executeWorkflowAsync(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return;
    }

    try {
      const workflow = execution.executionData.workflow;
      const nodes = workflow.nodes || [];

      // Simple sequential execution (in real implementation, this would be more complex)
      for (let i = execution.currentNodeIndex; i < nodes.length; i++) {
        if (execution.status !== 'running') {
          break; // Execution was paused or cancelled
        }

        const node = nodes[i];
        execution.currentNodeIndex = i;
        execution.lastActivity = Date.now();

        // Simulate node execution
        const nodeResult = await this.executeNode(node, execution.executionData);
        execution.executionData.nodes[node.id] = nodeResult;

        await this.persistState();

        // Add small delay to prevent CPU timeout
        await new Promise(resolve => setTimeout(resolve, 10));

        // Check for CPU time limits and yield if necessary
        if (Date.now() - execution.lastActivity > 25000) { // 25 seconds
          // Schedule continuation
          const timerId = setTimeout(() => {
            this.executeWorkflowAsync(executionId);
          }, 100);
          this.timers.set(executionId, timerId);
          return;
        }
      }

      // Execution completed
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.lastActivity = Date.now();
        await this.persistState();

        // Notify completion (could send to webhook or queue)
        await this.notifyExecutionComplete(execution);
      }

    } catch (error) {
      execution.status = 'error';
      execution.executionData.error = error.message;
      execution.lastActivity = Date.now();
      await this.persistState();

      // Notify error
      await this.notifyExecutionError(execution, error);
    }
  }

  /**
   * Execute a single node (simplified implementation)
   */
  private async executeNode(node: any, executionData: any): Promise<any> {
    // This is a simplified node execution
    // In the real implementation, this would load the actual node type
    // and execute its functionality
    
    const nodeType = node.type;
    const nodeParameters = node.parameters || {};

    // Simulate different node types
    switch (nodeType) {
      case 'n8n-nodes-base.httpRequest':
        return await this.executeHttpRequest(nodeParameters);
      case 'n8n-nodes-base.set':
        return this.executeSetNode(nodeParameters);
      case 'n8n-nodes-base.if':
        return this.executeIfNode(nodeParameters, executionData);
      default:
        return {
          success: true,
          data: { message: `Executed ${nodeType}` },
          executionTime: Date.now(),
        };
    }
  }

  /**
   * Execute HTTP Request node
   */
  private async executeHttpRequest(parameters: any): Promise<any> {
    try {
      const response = await fetch(parameters.url, {
        method: parameters.method || 'GET',
        headers: parameters.headers || {},
        body: parameters.body ? JSON.stringify(parameters.body) : undefined,
      });

      const data = await response.json();
      
      return {
        success: true,
        data,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        executionTime: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now(),
      };
    }
  }

  /**
   * Execute Set node
   */
  private executeSetNode(parameters: any): any {
    return {
      success: true,
      data: parameters.values || {},
      executionTime: Date.now(),
    };
  }

  /**
   * Execute If node
   */
  private executeIfNode(parameters: any, executionData: any): any {
    // Simplified condition evaluation
    const condition = parameters.condition || true;
    
    return {
      success: true,
      data: { conditionResult: condition },
      executionTime: Date.now(),
    };
  }

  /**
   * Notify execution completion
   */
  private async notifyExecutionComplete(execution: WorkflowExecutionState): Promise<void> {
    // In a real implementation, this would:
    // 1. Update the database
    // 2. Send webhooks
    // 3. Notify via WebSocket
    // 4. Update metrics
    
    console.log(`Execution ${execution.id} completed successfully`);
  }

  /**
   * Notify execution error
   */
  private async notifyExecutionError(execution: WorkflowExecutionState, error: Error): Promise<void> {
    console.error(`Execution ${execution.id} failed:`, error);
  }

  /**
   * Persist state to Durable Object storage
   */
  private async persistState(): Promise<void> {
    await this.ctx.storage.put('executions', this.executions);
  }
}