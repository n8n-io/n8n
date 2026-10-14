import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

export function getReplacedActions(context: InstanceAiContext, toolName: string): Set<string> {
	return new Set(
		(context.replacedToolActions ?? [])
			.filter((replaced) => replaced.toolName === toolName)
			.map((replaced) => replaced.action),
	);
}

/** Removes the action schemas that `context.replacedToolActions` hides for this tool. */
export function withoutReplacedActions<T extends z.AnyZodObject>(
	context: InstanceAiContext,
	toolName: string,
	actionSchemas: readonly T[],
): T[] {
	const replaced = getReplacedActions(context, toolName);
	return actionSchemas.filter((schema) => {
		const action: unknown = schema.shape.action;
		return !(action instanceof z.ZodLiteral && replaced.has(String(action.value)));
	});
}

/** The action union of a tool, minus the actions that `context.replacedToolActions` hides. */
export function buildActionInputSchema<T extends z.ZodDiscriminatedUnionOption<'action'>>(
	context: InstanceAiContext,
	toolName: string,
	actionSchemas: readonly T[],
) {
	const actions = withoutReplacedActions(context, toolName, actionSchemas);
	if (actions.length === 0) {
		throw new UnexpectedError(`Tool "${toolName}" has no actions left after replacements`);
	}
	return sanitizeInputSchema(z.discriminatedUnion('action', actions as unknown as [T, T, ...T[]]));
}

/** Tells the model where a hidden action went, because prompts and skills still name it. */
export function describeReplacedActions(
	context: InstanceAiContext,
	toolName: string,
): string | undefined {
	const replaced = (context.replacedToolActions ?? []).filter(
		(entry) => entry.toolName === toolName,
	);
	if (replaced.length === 0) return undefined;

	return replaced
		.map(
			(entry) =>
				`For "${entry.action}", call the \`${entry.replacementToolName}\` tool instead. This tool no longer has that action.`,
		)
		.join(' ');
}
