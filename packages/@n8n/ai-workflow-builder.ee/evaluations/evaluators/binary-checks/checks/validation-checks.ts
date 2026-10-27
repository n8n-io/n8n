/**
 * Binary checks that wrap existing validation functions.
 *
 * Each check calls a validator from @/validation/checks, optionally filters
 * the violations, and returns a binary pass/fail result.
 */

import {
	validateAgentPrompt,
	validateConnections,
	validateCredentials,
	validateFromAi,
	validateNodes,
	validateParameters,
	validateTools,
	validateTrigger,
} from '@/validation/checks';

import { createValidationCheck } from './create-validation-check';

export const hasNodes = createValidationCheck({
	name: 'has_nodes',
	validate: validateNodes,
	filter: (v) => v.name === 'workflow-has-no-nodes',
	failComment: 'Workflow has no nodes',
});

export const hasTrigger = createValidationCheck({
	name: 'has_trigger',
	validate: validateTrigger,
	filter: (v) => v.name === 'workflow-has-no-trigger',
	failComment: 'Workflow has no trigger node',
});

export const agentHasDynamicPrompt = createValidationCheck({
	name: 'agent_has_dynamic_prompt',
	validate: (workflow) => validateAgentPrompt(workflow),
	filter: (v) => v.name === 'agent-static-prompt',
});

export const agentHasLanguageModel = createValidationCheck({
	name: 'agent_has_language_model',
	validate: validateConnections,
	filter: (v) =>
		v.name === 'node-missing-required-input' &&
		v.metadata?.missingType === 'ai_languageModel' &&
		(v.metadata?.nodeType?.includes('langchain.agent') ?? false),
	failComment: 'Agent node missing required language model connection',
});

export const memoryProperlyConnected = createValidationCheck({
	name: 'memory_properly_connected',
	validate: validateConnections,
	filter: (v) => v.name === 'sub-node-not-connected' && v.metadata?.outputType === 'ai_memory',
	failComment: 'Memory node not properly connected to parent node',
});

export const vectorStoreHasEmbeddings = createValidationCheck({
	name: 'vector_store_has_embeddings',
	validate: validateConnections,
	filter: (v) =>
		v.name === 'node-missing-required-input' &&
		v.metadata?.missingType === 'ai_embedding' &&
		(v.metadata?.nodeType?.includes('vectorStore') ?? false),
	failComment: 'Vector store node missing required embeddings connection',
});

export const noHardcodedCredentials = createValidationCheck({
	name: 'no_hardcoded_credentials',
	validate: (workflow) => validateCredentials(workflow),
});

export const validRequiredParameters = createValidationCheck({
	name: 'valid_required_parameters',
	validate: validateParameters,
	filter: (v) => v.name === 'node-missing-required-parameter',
});

export const validOptionsValues = createValidationCheck({
	name: 'valid_options_values',
	validate: validateParameters,
	filter: (v) => v.name === 'node-invalid-options-value',
});

export const noInvalidFromAi = createValidationCheck({
	name: 'no_invalid_from_ai',
	validate: validateFromAi,
});

export const toolsHaveParameters = createValidationCheck({
	name: 'tools_have_parameters',
	validate: validateTools,
});
