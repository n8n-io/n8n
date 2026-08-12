import type { AgentJsonConfig } from '@n8n/api-types';
import type { ToolDescriptor } from '@n8n/agents';
import { createHash } from 'node:crypto';

function sortObjectKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortObjectKeys);
	if (typeof value !== 'object' || value === null) return value;

	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entry]) => [key, sortObjectKeys(entry)]),
	);
}

export function createHarnessRuntimeIdentity(options: {
	config: AgentJsonConfig;
	instructions: string;
	sandboxProvider: string;
	baseUrl?: string;
	toolDescriptors: Record<string, ToolDescriptor>;
	toolCodeByName: Record<string, string>;
}): string {
	const { config } = options;
	const customTools = (config.tools ?? [])
		.filter((tool) => tool.type === 'custom')
		.map((tool) => {
			const descriptor = options.toolDescriptors[tool.id];
			return {
				id: tool.id,
				descriptor,
				code: descriptor ? options.toolCodeByName[descriptor.name] : undefined,
			};
		});

	const projection = {
		version: 1,
		engine: config.engine,
		model: config.model,
		credential: config.credential,
		baseUrl: options.baseUrl,
		sandboxProvider: options.sandboxProvider,
		instructions: options.instructions,
		tools: config.tools ?? [],
		customTools,
		execution: {
			reasoning: config.config?.reasoning,
			webSearchEnabled: config.config?.webSearch?.enabled === true,
		},
	};

	return createHash('sha256')
		.update(JSON.stringify(sortObjectKeys(projection)))
		.digest('hex');
}
