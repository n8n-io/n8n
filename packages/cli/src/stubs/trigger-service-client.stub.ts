/**
 * Stub interface for TriggerService API client
 *
 * This will be replaced with actual HTTP/RPC calls to the trigger-service
 * once the service is properly set up as a separate process.
 */

import { Service } from '@n8n/di';
import type { WorkflowActivateMode, WorkflowId } from 'n8n-workflow';

export interface ITriggerServiceClient {
	// Workflow activation/deactivation
	activateWorkflow(
		workflowId: WorkflowId,
		mode: WorkflowActivateMode,
	): Promise<{ webhooks: boolean; triggersAndPollers: boolean }>;
	deactivateWorkflow(workflowId: WorkflowId): Promise<void>;

	// Active workflows query
	getAllActiveWorkflowIds(): Promise<WorkflowId[]>;
	getActiveWorkflowsInMemory(): Promise<WorkflowId[]>;
	isWorkflowActive(workflowId: WorkflowId): Promise<boolean>;

	// Activation errors
	getActivationError(workflowId: WorkflowId): Promise<string | null>;
	getAllActivationErrors(): Promise<Record<WorkflowId, string>>;
	clearActivationError(workflowId: WorkflowId): Promise<void>;
	clearAllActivationErrors(): Promise<void>;

	// Initialization
	init(): Promise<void>;
	removeAll(): Promise<void>;
}

/**
 * Temporary stub implementation that throws errors
 * This ensures we know when we're calling trigger service functionality
 * that hasn't been implemented yet
 */
@Service()
export class TriggerServiceClient implements ITriggerServiceClient {
	async activateWorkflow(
		_workflowId: WorkflowId,
		_mode: WorkflowActivateMode,
	): Promise<{ webhooks: boolean; triggersAndPollers: boolean }> {
		throw new Error('TriggerService API not yet implemented: activateWorkflow');
	}

	async deactivateWorkflow(_workflowId: WorkflowId): Promise<void> {
		throw new Error('TriggerService API not yet implemented: deactivateWorkflow');
	}

	async getAllActiveWorkflowIds(): Promise<WorkflowId[]> {
		throw new Error('TriggerService API not yet implemented: getAllActiveWorkflowIds');
	}

	async getActiveWorkflowsInMemory(): Promise<WorkflowId[]> {
		throw new Error('TriggerService API not yet implemented: getActiveWorkflowsInMemory');
	}

	async isWorkflowActive(_workflowId: WorkflowId): Promise<boolean> {
		throw new Error('TriggerService API not yet implemented: isWorkflowActive');
	}

	async getActivationError(_workflowId: WorkflowId): Promise<string | null> {
		throw new Error('TriggerService API not yet implemented: getActivationError');
	}

	async getAllActivationErrors(): Promise<Record<WorkflowId, string>> {
		throw new Error('TriggerService API not yet implemented: getAllActivationErrors');
	}

	async clearActivationError(_workflowId: WorkflowId): Promise<void> {
		throw new Error('TriggerService API not yet implemented: clearActivationError');
	}

	async clearAllActivationErrors(): Promise<void> {
		throw new Error('TriggerService API not yet implemented: clearAllActivationErrors');
	}

	async init(): Promise<void> {
		throw new Error('TriggerService API not yet implemented: init');
	}

	async removeAll(): Promise<void> {
		throw new Error('TriggerService API not yet implemented: removeAll');
	}
}
