import type { BinaryCheck } from '../types';
import { allNodesConnected } from './all-nodes-connected';
import { expressionsReferenceExistingNodes } from './expressions-reference-existing-nodes';
import { hasStartNode } from './has-start-node';
import { noCodeImports } from './no-code-imports';
import { noEmptySetNodes } from './no-empty-set-nodes';
import { noUnnecessaryCodeNodes } from './no-unnecessary-code-nodes';
import { noUnreachableNodes } from './no-unreachable-nodes';
import {
	agentHasDynamicPrompt,
	agentHasLanguageModel,
	hasNodes,
	hasTrigger,
	memoryProperlyConnected,
	noHardcodedCredentials,
	noInvalidFromAi,
	toolsHaveParameters,
	validOptionsValues,
	validRequiredParameters,
	vectorStoreHasEmbeddings,
} from './validation-checks';

export const DETERMINISTIC_CHECKS: BinaryCheck[] = [
	hasNodes,
	allNodesConnected,
	noUnreachableNodes,
	hasTrigger,
	noEmptySetNodes,
	agentHasDynamicPrompt,
	agentHasLanguageModel,
	memoryProperlyConnected,
	vectorStoreHasEmbeddings,
	hasStartNode,
	noHardcodedCredentials,
	noUnnecessaryCodeNodes,
	noCodeImports,
	expressionsReferenceExistingNodes,
	validRequiredParameters,
	validOptionsValues,
	noInvalidFromAi,
	toolsHaveParameters,
];
