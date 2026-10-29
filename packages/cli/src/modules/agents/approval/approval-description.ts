import type { BuiltTool } from '@n8n/agents';
import { isZodSchema, zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { z } from 'zod';

const DESCRIPTION_FIELD = '__approvalDescription';
const descriptionSchema = z.string().trim().min(1).max(500);

/** Add approval context to the model input. Keep it out of tool arguments. */
export function withApprovalDescription(
	tool: BuiltTool,
	requiresDescription: (input: unknown) => boolean = () => true,
): BuiltTool {
	const originalSchema = tool.inputSchema;
	const schema = zodToJsonSchema(originalSchema ?? z.object({}));
	if (!schema || Object.hasOwn(schema.properties ?? {}, DESCRIPTION_FIELD)) {
		throw new UnexpectedError(`Cannot add an approval description to tool "${tool.name}"`);
	}
	return {
		...tool,
		inputSchema: {
			...schema,
			properties: {
				...schema.properties,
				[DESCRIPTION_FIELD]: {
					type: 'string',
					minLength: 1,
					maxLength: 500,
					description:
						'Required before requesting approval. Explain this approval request in one or two short sentences. State the action, its target, and its effect. Use the language of the user. Do not include JSON, credentials, or secrets.',
				},
			},
			// The handler requires the description. Old checkpoint inputs can still resume.
		},
		onCancellation: tool.onCancellation
			? async (input, ctx) => {
					const argumentsInput = isRecord(input)
						? Object.fromEntries(Object.entries(input).filter(([key]) => key !== DESCRIPTION_FIELD))
						: input;
					await tool.onCancellation?.(argumentsInput, ctx);
				}
			: undefined,
		handler: async (input, ctx) => {
			if (!isRecord(input))
				throw new UserError('An approval request must include a short description.');
			const { [DESCRIPTION_FIELD]: description, ...argumentsInput } = input;
			// Saved requests from before this field existed can still resume.
			const legacyResume = 'suspendPayload' in ctx && ctx.suspendPayload !== undefined;
			const parsedDescription = descriptionSchema.safeParse(description);
			if (
				!parsedDescription.success &&
				!(description === undefined && (legacyResume || !requiresDescription(argumentsInput)))
			) {
				throw new UserError(
					'Include __approvalDescription with one or two short sentences about the action, its target, and its effect. Use at most 500 characters.',
				);
			}
			const approvalDescription = parsedDescription.success ? parsedDescription.data : undefined;
			const toolInput = isZodSchema(originalSchema)
				? await originalSchema.parseAsync(argumentsInput)
				: argumentsInput;
			return await tool.handler?.(toolInput, { ...ctx, approvalDescription });
		},
	};
}
