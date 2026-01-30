/**
 * Prompt Version Registry
 *
 * Central registry for prompt versions, allowing A/B testing of prompt variations
 * independent of model selection.
 */

import type { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ModelId } from '../../../llm-config';
import type { NodeWithDiscriminators } from '../../../utils/node-type-parser';

// Import prompt builders from versioned files
import { buildOneShotGeneratorPrompt, buildRawSystemPrompt } from './v1-sonnet.prompt';
import { buildOpusOneShotGeneratorPrompt, buildOpusRawSystemPrompt } from './v2-opus.prompt';

export type PromptVersionId = 'v1-sonnet' | 'v2-opus';

export interface PromptBuilderConfig {
	nodeIds: {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	};
	sdkSourceCode: string;
	currentWorkflow?: WorkflowJSON;
}

export interface PromptVersionDefinition {
	id: PromptVersionId;
	name: string;
	description: string;
	recommendedModels: ModelId[];
	buildPrompt: (
		nodeIds: PromptBuilderConfig['nodeIds'],
		sdkSourceCode: string,
		currentWorkflow?: WorkflowJSON,
	) => ChatPromptTemplate;
	buildRawPrompt?: (nodeIds: PromptBuilderConfig['nodeIds'], sdkSourceCode: string) => string;
}

export const PROMPT_VERSIONS: Record<PromptVersionId, PromptVersionDefinition> = {
	'v1-sonnet': {
		id: 'v1-sonnet',
		name: 'Sonnet Optimized (v1)',
		description: 'Condensed prompt optimized for Sonnet 4.5 - no SDK reference',
		recommendedModels: ['claude-sonnet-4.5', 'claude-haiku-4.5'],
		buildPrompt: buildOneShotGeneratorPrompt,
		buildRawPrompt: buildRawSystemPrompt,
	},
	'v2-opus': {
		id: 'v2-opus',
		name: 'Opus Full SDK (v2)',
		description: 'Comprehensive prompt with full SDK reference for Opus 4.5',
		recommendedModels: ['claude-opus-4.5'],
		buildPrompt: buildOpusOneShotGeneratorPrompt,
		buildRawPrompt: buildOpusRawSystemPrompt,
	},
};

export const DEFAULT_PROMPT_VERSION: PromptVersionId = 'v1-sonnet';
export const AVAILABLE_PROMPT_VERSIONS = Object.keys(PROMPT_VERSIONS) as PromptVersionId[];

// Re-export prompt builders for backward compatibility
export { buildOneShotGeneratorPrompt, buildRawSystemPrompt } from './v1-sonnet.prompt';
export {
	buildOpusOneShotGeneratorPrompt,
	buildOpusRawSystemPrompt,
} from './v2-opus.prompt';
