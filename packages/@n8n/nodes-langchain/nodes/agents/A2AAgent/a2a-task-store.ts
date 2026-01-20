/**
 * In-memory task store for A2A Agent (MVP)
 *
 * WARNING: This store is NOT persistent. All data is lost on restart.
 * For production use, this should be replaced with a database-backed store.
 */

import type { A2ATaskState } from './a2a.types';

export interface StoredTask {
	taskId: string;
	sessionId?: string;
	status: {
		state: A2ATaskState;
		message?: string;
	};
	messages: Array<{
		role: 'user' | 'agent';
		parts: Array<{ type: 'text'; text: string }>;
	}>;
	artifacts: Array<{
		type: string;
		data: unknown;
	}>;
	createdAt: Date;
	updatedAt: Date;
	// Optional correlation with n8n execution
	executionId?: string;
}

/**
 * In-memory store for A2A tasks
 * Key: taskId (UUID)
 * Value: StoredTask
 */
const taskStore = new Map<string, StoredTask>();

/**
 * Store a new task
 */
export function storeTask(task: StoredTask): void {
	taskStore.set(task.taskId, task);
}

/**
 * Get a task by ID
 */
export function getTask(taskId: string): StoredTask | undefined {
	return taskStore.get(taskId);
}

/**
 * Update an existing task
 */
export function updateTask(taskId: string, updates: Partial<StoredTask>): boolean {
	const existing = taskStore.get(taskId);
	if (!existing) {
		return false;
	}

	taskStore.set(taskId, {
		...existing,
		...updates,
		updatedAt: new Date(),
	});
	return true;
}

/**
 * Delete a task
 */
export function deleteTask(taskId: string): boolean {
	return taskStore.delete(taskId);
}

/**
 * Get all tasks (for debugging)
 */
export function getAllTasks(): StoredTask[] {
	return Array.from(taskStore.values());
}

/**
 * Clear all tasks (for testing)
 */
export function clearAllTasks(): void {
	taskStore.clear();
}

/**
 * Get store size
 */
export function getTaskCount(): number {
	return taskStore.size;
}
