import type { BinaryCheck } from '../types.js';
import { correctNodeOperations } from './correct-node-operations.js';
import { descriptiveNodeNames } from './descriptive-node-names.js';
import { fulfillsUserRequest } from './fulfills-user-request.js';
import { handlesMultipleItems } from './handles-multiple-items.js';
import { responseMatchesWorkflowChanges } from './response-matches-workflow-changes.js';
import { validDataFlow } from './valid-data-flow.js';

export const LLM_CHECKS: BinaryCheck[] = [
	fulfillsUserRequest,
	correctNodeOperations,
	validDataFlow,
	handlesMultipleItems,
	descriptiveNodeNames,
	responseMatchesWorkflowChanges,
];
