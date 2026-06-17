import type { BinaryCheck } from '../types';
import { correctNodeOperations } from './correct-node-operations';
import { descriptiveNodeNames } from './descriptive-node-names';
import { fulfillsUserRequest } from './fulfills-user-request';
import { handlesMultipleItems } from './handles-multiple-items';
import { responseMatchesWorkflowChanges } from './response-matches-workflow-changes';
import { validDataFlow } from './valid-data-flow';

export const LLM_CHECKS: BinaryCheck[] = [
	fulfillsUserRequest,
	correctNodeOperations,
	validDataFlow,
	handlesMultipleItems,
	descriptiveNodeNames,
	responseMatchesWorkflowChanges,
];
