import type { IDataObject, NodeParameterValueType } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import type { z } from 'zod';

type ResolveParameterValue = (value: NodeParameterValueType) => Promise<NodeParameterValueType>;

export class AgentExpressionContext {
	constructor(
		readonly variables: Readonly<IDataObject>,
		private readonly resolveParameterValue: ResolveParameterValue,
	) {}

	async resolveValue(
		value: NodeParameterValueType,
		fieldPath: string,
	): Promise<NodeParameterValueType> {
		try {
			return await this.resolveParameterValue(value);
		} catch {
			throw new UserError(`Could not resolve expression for "${fieldPath}"`);
		}
	}

	parseResolvedValue<T>(value: unknown, fieldPath: string, schema: z.ZodType<T>): T {
		const parsed = schema.safeParse(value);
		if (parsed.success) return parsed.data;

		const issuePath = parsed.error.issues[0]?.path;
		const resolvedFieldPath = issuePath?.reduce(
			(path, segment) => `${path}.${String(segment)}`,
			fieldPath,
		);
		throw new UserError(`Resolved value for "${resolvedFieldPath ?? fieldPath}" is invalid`);
	}

	async resolveText(value: string, fieldPath: string, schema?: z.ZodType<string>): Promise<string> {
		const resolved = await this.resolveValue(value, fieldPath);
		if (typeof resolved !== 'string') {
			throw new UserError(`Expression for "${fieldPath}" did not resolve to text`);
		}

		return schema ? this.parseResolvedValue(resolved, fieldPath, schema) : resolved;
	}
}

export function isAgentExpressionContext(value: unknown): value is AgentExpressionContext {
	return value instanceof AgentExpressionContext;
}
