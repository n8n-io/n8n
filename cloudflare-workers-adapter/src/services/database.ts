/**
 * Database Service - D1 Adapter
 * 
 * This service provides a database abstraction layer for Cloudflare D1,
 * replacing the original TypeORM implementation.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import * as schema from '../schema/database';

export class DatabaseService {
  private db: ReturnType<typeof drizzle>;

  constructor(private d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  // User operations
  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }) {
    const [user] = await this.db
      .insert(schema.users)
      .values({
        id: crypto.randomUUID(),
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return user;
  }

  async findUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    
    return user;
  }

  async findUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    
    return user;
  }

  // Workflow operations
  async createWorkflow(workflowData: {
    name: string;
    nodes: any[];
    connections: any;
    settings?: any;
    userId: string;
  }) {
    const [workflow] = await this.db
      .insert(schema.workflows)
      .values({
        id: crypto.randomUUID(),
        name: workflowData.name,
        nodes: JSON.stringify(workflowData.nodes),
        connections: JSON.stringify(workflowData.connections),
        settings: JSON.stringify(workflowData.settings || {}),
        userId: workflowData.userId,
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return workflow;
  }

  async findWorkflowById(id: string) {
    const [workflow] = await this.db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.id, id))
      .limit(1);
    
    if (workflow) {
      return {
        ...workflow,
        nodes: JSON.parse(workflow.nodes),
        connections: JSON.parse(workflow.connections),
        settings: JSON.parse(workflow.settings),
      };
    }
    
    return null;
  }

  async findWorkflowsByUserId(userId: string, limit = 50, offset = 0) {
    const workflows = await this.db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.userId, userId))
      .orderBy(desc(schema.workflows.updatedAt))
      .limit(limit)
      .offset(offset);
    
    return workflows.map(workflow => ({
      ...workflow,
      nodes: JSON.parse(workflow.nodes),
      connections: JSON.parse(workflow.connections),
      settings: JSON.parse(workflow.settings),
    }));
  }

  async updateWorkflow(id: string, updates: Partial<{
    name: string;
    nodes: any[];
    connections: any;
    settings: any;
    active: boolean;
  }>) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.nodes) updateData.nodes = JSON.stringify(updates.nodes);
    if (updates.connections) updateData.connections = JSON.stringify(updates.connections);
    if (updates.settings) updateData.settings = JSON.stringify(updates.settings);
    if (typeof updates.active === 'boolean') updateData.active = updates.active;

    const [workflow] = await this.db
      .update(schema.workflows)
      .set(updateData)
      .where(eq(schema.workflows.id, id))
      .returning();
    
    return workflow;
  }

  async deleteWorkflow(id: string) {
    await this.db
      .delete(schema.workflows)
      .where(eq(schema.workflows.id, id));
  }

  // Execution operations
  async createExecution(executionData: {
    workflowId: string;
    mode: string;
    status: string;
    data?: any;
    startedAt: Date;
  }) {
    const [execution] = await this.db
      .insert(schema.executions)
      .values({
        id: crypto.randomUUID(),
        workflowId: executionData.workflowId,
        mode: executionData.mode,
        status: executionData.status,
        data: JSON.stringify(executionData.data || {}),
        startedAt: executionData.startedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return execution;
  }

  async findExecutionById(id: string) {
    const [execution] = await this.db
      .select()
      .from(schema.executions)
      .where(eq(schema.executions.id, id))
      .limit(1);
    
    if (execution) {
      return {
        ...execution,
        data: JSON.parse(execution.data),
      };
    }
    
    return null;
  }

  async findExecutionsByWorkflowId(workflowId: string, limit = 50, offset = 0) {
    const executions = await this.db
      .select()
      .from(schema.executions)
      .where(eq(schema.executions.workflowId, workflowId))
      .orderBy(desc(schema.executions.startedAt))
      .limit(limit)
      .offset(offset);
    
    return executions.map(execution => ({
      ...execution,
      data: JSON.parse(execution.data),
    }));
  }

  async updateExecution(id: string, updates: Partial<{
    status: string;
    data: any;
    finishedAt: Date;
    error?: string;
  }>) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.status) updateData.status = updates.status;
    if (updates.data) updateData.data = JSON.stringify(updates.data);
    if (updates.finishedAt) updateData.finishedAt = updates.finishedAt;
    if (updates.error) updateData.error = updates.error;

    const [execution] = await this.db
      .update(schema.executions)
      .set(updateData)
      .where(eq(schema.executions.id, id))
      .returning();
    
    return execution;
  }

  // Credentials operations
  async createCredential(credentialData: {
    name: string;
    type: string;
    data: any;
    userId: string;
  }) {
    const [credential] = await this.db
      .insert(schema.credentials)
      .values({
        id: crypto.randomUUID(),
        name: credentialData.name,
        type: credentialData.type,
        data: JSON.stringify(credentialData.data),
        userId: credentialData.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return credential;
  }

  async findCredentialsByUserId(userId: string) {
    const credentials = await this.db
      .select()
      .from(schema.credentials)
      .where(eq(schema.credentials.userId, userId));
    
    return credentials.map(credential => ({
      ...credential,
      data: JSON.parse(credential.data),
    }));
  }

  // Transaction support (limited in D1)
  async transaction<T>(callback: (tx: typeof this.db) => Promise<T>): Promise<T> {
    // D1 doesn't support full transactions yet, so we'll use batch operations
    // This is a simplified implementation
    return await callback(this.db);
  }

  // Raw query support
  async query(sql: string, params: any[] = []) {
    return await this.d1.prepare(sql).bind(...params).all();
  }
}