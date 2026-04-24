// ---------------------------------------------------------------------------
// Registry of all binary checks
// ---------------------------------------------------------------------------

import type { BinaryCheck } from '../types';
import { agentHasDynamicPrompt } from './agent-has-dynamic-prompt';
import { agentHasLanguageModel } from './agent-has-language-model';
import { allNodesConnected } from './all-nodes-connected';
import { correctNodeOperations } from './correct-node-operations';
import { descriptiveNodeNames } from './descriptive-node-names';
import { expressionsReferenceExistingNodes } from './expressions-reference-existing-nodes';
import { fulfillsUserRequest } from './fulfills-user-request';
import { handlesMultipleItems } from './handles-multiple-items';
import { hasNodes } from './has-nodes';
import { hasStartNode } from './has-start-node';
import { hasTrigger } from './has-trigger';
import { memoryProperlyConnected } from './memory-properly-connected';
import { noDisabledNodes } from './no-disabled-nodes';
import { noEmptySetNodes } from './no-empty-set-nodes';
import { noHardcodedCredentials } from './no-hardcoded-credentials';
import { noInvalidFromAi } from './no-invalid-from-ai';
import { noUnnecessaryCodeNodes } from './no-unnecessary-code-nodes';
import { noUnreachableNodes } from './no-unreachable-nodes';
import { responseMatchesWorkflowChanges } from './response-matches-workflow-changes';
import { toolsHaveParameters } from './tools-have-parameters';
import { validDataFlow } from './valid-data-flow';
import { validFieldReferences } from './valid-field-references';
import { validNodeConfig } from './valid-node-config';
import { vectorStoreHasEmbeddings } from './vector-store-has-embeddings';

export const DETERMINISTIC_CHECKS: BinaryCheck[] = [
	hasNodes,
	hasTrigger,
	hasStartNode,
	allNodesConnected,
	noEmptySetNodes,
	noDisabledNodes,
	expressionsReferenceExistingNodes,
	validFieldReferences,
	agentHasDynamicPrompt,
	agentHasLanguageModel,
	memoryProperlyConnected,
	vectorStoreHasEmbeddings,
	noHardcodedCredentials,
	noUnnecessaryCodeNodes,
	noInvalidFromAi,
	toolsHaveParameters,
	noUnreachableNodes,
	validNodeConfig,
];

export const LLM_CHECKS: BinaryCheck[] = [
	fulfillsUserRequest,
	validDataFlow,
	correctNodeOperations,
	handlesMultipleItems,
	descriptiveNodeNames,
	responseMatchesWorkflowChanges,
];
