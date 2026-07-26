import type { INodeTypeDescription } from 'n8n-workflow';

/**
 * Minimal node type builder for the node-catalog tests. Mirrors the shape
 * the search engine and parser expect; tests override only the fields they
 * care about. Kept local to avoid pulling LangChain-heavy test utilities
 * from `@n8n/ai-workflow-builder`.
 */
export const createNodeType = (
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription => ({
	displayName: overrides.displayName ?? 'Test Node',
	name: overrides.name ?? 'test.node',
	group: overrides.group ?? ['transform'],
	version: overrides.version ?? 1,
	description: overrides.description ?? 'Test node description',
	defaults: overrides.defaults ?? { name: 'Test Node' },
	inputs: overrides.inputs ?? ['main'],
	outputs: overrides.outputs ?? ['main'],
	properties: overrides.properties ?? [],
	...overrides,
});
