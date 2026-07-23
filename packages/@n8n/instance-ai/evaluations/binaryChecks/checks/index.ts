// ---------------------------------------------------------------------------
// Registry of all binary checks, grouped by WHAT-side rubric dimension.
// Each check declares its own `dimension` field; the per-dimension arrays
// here are the second backstop and the canonical iteration order.
// ---------------------------------------------------------------------------

import type { BinaryCheck } from '../types';
import { agentHasDynamicPrompt } from './agent-has-dynamic-prompt';
import { agentHasLanguageModel } from './agent-has-language-model';
import { allNodesConnected } from './all-nodes-connected';
import { codeNodeNoHttpRequests } from './code-node-no-http-requests';
import { correctNodeOperations } from './correct-node-operations';
import { descriptiveNodeNames } from './descriptive-node-names';
import { errorRoutesConsistent } from './error-routes-consistent';
import { expressionsReferenceExistingNodes } from './expressions-reference-existing-nodes';
import { fulfillsUserRequest } from './fulfills-user-request';
import { googleSheetsRlcDefaultMode } from './google-sheets-rlc-default-mode';
import { handlesMultipleItems } from './handles-multiple-items';
import { hasNodes } from './has-nodes';
import { hasStartNode } from './has-start-node';
import { hasTrigger } from './has-trigger';
import { httpGenericAuthTypeMatchesPrompt } from './http-generic-auth-type-matches-prompt';
import { inboundTriggerAuthDefaults } from './inbound-trigger-auth-defaults';
import { itemFlowIndependentSourceExecuteOnce } from './item-flow-independent-source-execute-once';
import { itemFlowPairedItemReferences } from './item-flow-paired-item-references';
import { memoryProperlyConnected } from './memory-properly-connected';
import { memorySessionKeyExpression } from './memory-session-key-expression';
import { noDisabledNodes } from './no-disabled-nodes';
import { noEmptySetNodes } from './no-empty-set-nodes';
import { noExcessiveBuildFailures } from './no-excessive-build-failures';
import { noHardcodedCredentials } from './no-hardcoded-credentials';
import { noInvalidFromAi } from './no-invalid-from-ai';
import { noUnnecessaryCodeNodes } from './no-unnecessary-code-nodes';
import { noUnreachableNodes } from './no-unreachable-nodes';
import { responseDescribesChangesAccurately } from './response-describes-changes-accurately';
import { switchFallbackOutputEnabled } from './switch-fallback-output-enabled';
import { toolsHaveParameters } from './tools-have-parameters';
import { validDataFlow } from './valid-data-flow';
import { validFieldReferences } from './valid-field-references';
import { validNodeConfig } from './valid-node-config';
import { vectorStoreHasEmbeddings } from './vector-store-has-embeddings';

export const STRUCTURE_CHECKS: BinaryCheck[] = [
	hasNodes,
	hasTrigger,
	hasStartNode,
	noDisabledNodes,
];

export const CONNECTION_TOPOLOGY_CHECKS: BinaryCheck[] = [
	allNodesConnected,
	noUnreachableNodes,
	switchFallbackOutputEnabled,
	handlesMultipleItems,
	errorRoutesConsistent,
];

export const PARAMETER_CORRECTNESS_CHECKS: BinaryCheck[] = [
	expressionsReferenceExistingNodes,
	itemFlowPairedItemReferences,
	itemFlowIndependentSourceExecuteOnce,
	validFieldReferences,
	validNodeConfig,
	noEmptySetNodes,
	noInvalidFromAi,
	httpGenericAuthTypeMatchesPrompt,
	correctNodeOperations,
	validDataFlow,
	googleSheetsRlcDefaultMode,
];

export const INTENT_MATCH_CHECKS: BinaryCheck[] = [fulfillsUserRequest];

export const COMMUNICATION_CHECKS: BinaryCheck[] = [responseDescribesChangesAccurately];

export const AI_NODES_CHECKS: BinaryCheck[] = [
	agentHasDynamicPrompt,
	agentHasLanguageModel,
	memoryProperlyConnected,
	memorySessionKeyExpression,
	vectorStoreHasEmbeddings,
	toolsHaveParameters,
];

export const NODES_CRAFTSMANSHIP_CHECKS: BinaryCheck[] = [
	noUnnecessaryCodeNodes,
	codeNodeNoHttpRequests,
	descriptiveNodeNames,
];

export const EFFICIENCY_CHECKS: BinaryCheck[] = [noExcessiveBuildFailures];

export const SECURITY_CHECKS: BinaryCheck[] = [noHardcodedCredentials, inboundTriggerAuthDefaults];

export const ALL_CHECKS: BinaryCheck[] = [
	...STRUCTURE_CHECKS,
	...CONNECTION_TOPOLOGY_CHECKS,
	...PARAMETER_CORRECTNESS_CHECKS,
	...INTENT_MATCH_CHECKS,
	...COMMUNICATION_CHECKS,
	...AI_NODES_CHECKS,
	...NODES_CRAFTSMANSHIP_CHECKS,
	...EFFICIENCY_CHECKS,
	...SECURITY_CHECKS,
];

export const DETERMINISTIC_CHECKS: BinaryCheck[] = ALL_CHECKS.filter(
	(c) => c.kind === 'deterministic',
);
export const LLM_CHECKS: BinaryCheck[] = ALL_CHECKS.filter((c) => c.kind === 'llm');
