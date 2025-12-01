/**
 * Type definitions for trigger-service
 */

import type { ITaskData } from 'n8n-workflow';

/**
 * Trigger information for manual workflow execution
 * TODO(CLEANUP): This interface should be cleaned up and moved to a shared location
 */
export interface TriggerToStartFrom {
	name: string;
	data?: ITaskData;
}
