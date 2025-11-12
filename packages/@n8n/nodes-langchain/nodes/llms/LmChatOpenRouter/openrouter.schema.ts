// NOTE: lacks the information of displayNames needed to generate the form
import { z } from 'zod';

/**
 * Zod Schema for the OpenRouter Chat Completion Request
 */
export const openrouterChatCompletionRequestSchema = z.object({
	/** Allows to force the model to produce specific output format. */
	response_format: z
		.object({
			type: z.enum(['json_object', 'text']),
		})
		.optional(),

	/** Up to 4 sequences where the API will stop generating further tokens. */
	stop: z
		.union([
			z.string(),
			z
				.array(z.string())
				.max(4), // Assuming the "up to 4" applies to the array length, though the JSON schema doesn't strictly define this, it's a common LLM API constraint.
		])
		.optional(),

	/** If true, partial message deltas will be sent, like in ChatGPT. */
	stream: z.boolean().optional(),

	/** The maximum number of tokens to generate. */
	max_tokens: z.number().int().min(1).optional(),

	/** What sampling temperature to use, between 0 and 2. */
	temperature: z.number().min(0).max(2).optional(),

	/** If specified, the model will make a deterministic generation. */
	seed: z.number().int().optional(),

	/** An alternative to sampling with temperature, called nucleus sampling. */
	top_p: z.number().gt(0).max(1).optional(), // 'exclusiveMinimum': 0 maps to z.gt(0)

	/** The number of highest probability vocabulary tokens to keep for top-k filtering. */
	top_k: z.number().min(1).optional(),

	/** Penalize new tokens based on their existing frequency in the text. */
	frequency_penalty: z.number().min(-2).max(2).optional(),

	/** Penalize new tokens based on whether they appear in the text so far. */
	presence_penalty: z.number().min(-2).max(2).optional(),

	/** Similar to frequency/presence penalty, but applied to all tokens. */
	repetition_penalty: z.number().gt(0).max(2).optional(), // 'exclusiveMinimum': 0 maps to z.gt(0)

	/** Modify the likelihood of specified tokens appearing in the completion. */
	logit_bias: z
		.record(
			z
				.string()
				.regex(/^[0-9]+$/), // Key must match the pattern for token IDs (digits)
			z.number(), // Value is the bias
		)
		.optional(),

	/** An integer that specifies how many logprobs to include in the output. */
	top_logprobs: z.number().int().optional(),

	/** Minimum probability to keep for filtering. */
	min_p: z.number().min(0).max(1).optional(),

	/** Top-A sampling parameter. */
	top_a: z.number().min(0).max(1).optional(),

	/** OpenRouter-only parameter for Prompt Transforms. */
	transforms: z.array(z.string()).optional(),

	/** List of models to route to. */
	models: z.array(z.string()).optional(),

	/** Routing strategy. */
	route: z.enum(['fallback']).optional(),

	/** A stable identifier for your end-users. Used to help detect and prevent abuse. */
	user: z.string().optional(),
});

// Optionally, define the TypeScript type from the schema
export type OpenrouterChatCompletionRequest = z.infer<typeof openrouterChatCompletionRequestSchema>;
