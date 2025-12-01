/**
 * Internal API Client stub for trigger-service
 * This will make HTTP calls back to the main n8n internal API
 * to fetch workflow data, update status, etc.
 */

import { Service } from '@n8n/di';
import { Workflow } from 'n8n-workflow';

/**
 * Stub for WorkflowRepository that will call internal API
 */
@Service()
export class WorkflowRepository {
	async findById(_id: string): Promise<any> {
		throw new Error('WorkflowRepository.findById should call internal API - not yet implemented');
	}

	async findOne(_options: unknown): Promise<any> {
		throw new Error('WorkflowRepository.findOne should call internal API - not yet implemented');
	}

	async getAllActiveIds(): Promise<string[]> {
		throw new Error(
			'WorkflowRepository.getAllActiveIds should call internal API - not yet implemented',
		);
	}

	async getActiveIds(): Promise<string[]> {
		throw new Error(
			'WorkflowRepository.getActiveIds should call internal API - not yet implemented',
		);
	}

	async update(_id: string, _data: any): Promise<void> {
		throw new Error('WorkflowRepository.update should call internal API - not yet implemented');
	}

	async updateWorkflowTriggerCount(_id: string, _count: number): Promise<void> {
		throw new Error(
			'WorkflowRepository.updateWorkflowTriggerCount should call internal API - not yet implemented',
		);
	}
}

/**
 * Service to fetch static data for workflows
 */
@Service()
export class WorkflowStaticDataService {
	async getStaticDataById(_workflowId: string): Promise<any> {
		throw new Error('WorkflowStaticDataService should call internal API - not yet implemented');
	}

	async saveStaticData(_workflow: Workflow): Promise<void> {
		throw new Error(
			'WorkflowStaticDataService.saveStaticData should call internal API - not yet implemented',
		);
	}
}

/**
 * Service to get workflow ownership info
 */
@Service()
export class OwnershipService {
	async getWorkflowOwner(_workflowId: string): Promise<any> {
		throw new Error('OwnershipService should call internal API - not yet implemented');
	}

	async getWorkflowProjectCached(_workflowId: string): Promise<any> {
		throw new Error(
			'OwnershipService.getWorkflowProjectCached should call internal API - not yet implemented',
		);
	}
}

/**
 * Service to update workflow statistics
 */
@Service()
export class WorkflowStatisticsService {
	async updateWorkflowStatistics(_workflowId: string, _data: any): Promise<void> {
		throw new Error('WorkflowStatisticsService should call internal API - not yet implemented');
	}

	emit(_event: string, _data?: any): void {
		// no-op
	}
}

/**
 * Service to format workflow data
 */
@Service()
export class WorkflowFormatter {
	format(_workflow: any): any {
		// For now, just return as-is
		return _workflow;
	}
}

/**
 * Service to find workflows
 */
@Service()
export class WorkflowFinderService {
	async findById(_workflowId: string): Promise<any> {
		throw new Error('WorkflowFinderService should call internal API - not yet implemented');
	}

	async findWorkflowForUser(_workflowId: string, _user: any, _permissions: string[]): Promise<any> {
		throw new Error(
			'WorkflowFinderService.findWorkflowForUser should call internal API - not yet implemented',
		);
	}
}

/**
 * Format workflow for logging
 */
export function formatWorkflow(workflow: any): string {
	if (!workflow) return 'unknown';
	return `"${workflow.name}" (ID ${workflow.id})`;
}

/**
 * External hooks service for plugin/extension points
 */
@Service()
export class ExternalHooks {
	async run(_hookName: string, _hookParameters?: any[]): Promise<void> {
		// External hooks should call internal API to notify
		// For now, no-op stub
	}
}
