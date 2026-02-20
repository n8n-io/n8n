import type { BinaryCheck } from '../types';
import { agentHasDynamicPrompt } from './agent-has-dynamic-prompt';
import { agentHasLanguageModel } from './agent-has-language-model';
import { allNodesConnected } from './all-nodes-connected';
import { hasNodes } from './has-nodes';
import { hasStartNode } from './has-start-node';
import { hasTrigger } from './has-trigger';
import { memoryProperlyConnected } from './memory-properly-connected';
import { noEmptySetNodes } from './no-empty-set-nodes';
import { noHardcodedCredentials } from './no-hardcoded-credentials';
import { noUnnecessaryCodeNodes } from './no-unnecessary-code-nodes';
import { noUnreachableNodes } from './no-unreachable-nodes';
import { vectorStoreHasEmbeddings } from './vector-store-has-embeddings';

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
];
