import { BINARY_MODE_SEPARATE } from 'n8n-workflow';
import type { IWorkflowSettings } from 'n8n-workflow';

export const DEFAULT_NODETYPE_VERSION = 1;
export const DEFAULT_NEW_WORKFLOW_NAME = 'My workflow';
export const DEFAULT_SETTINGS = {
	executionOrder: 'v1',
	binaryMode: BINARY_MODE_SEPARATE,
} satisfies IWorkflowSettings;
export const MIN_WORKFLOW_NAME_LENGTH = 1;
export const MAX_WORKFLOW_NAME_LENGTH = 128;
export const DUPLICATE_POSTFFIX = ' copy';
export const NODE_OUTPUT_DEFAULT_KEY = '_NODE_OUTPUT_DEFAULT_KEY_';
export const DEFAULT_WORKFLOW_PAGE_SIZE = 50;

export const enum AutoSaveState {
	Idle = 'idle',
	Scheduled = 'scheduled',
	InProgress = 'in-progress',
}
