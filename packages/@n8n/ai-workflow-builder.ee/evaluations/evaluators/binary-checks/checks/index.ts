import type { BinaryCheck } from '../types.js';
import { allNodesConnected } from './all-nodes-connected.js';
import { expressionsReferenceExistingNodes } from './expressions-reference-existing-nodes.js';
import { hasStartNode } from './has-start-node.js';
import { noCodeImports } from './no-code-imports.js';
import { noEmptySetNodes } from './no-empty-set-nodes.js';
import { noUnnecessaryCodeNodes } from './no-unnecessary-code-nodes.js';
import { noUnreachableNodes } from './no-unreachable-nodes.js';
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
} from './validation-checks.js';

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
