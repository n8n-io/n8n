import { AgentJsonConfigSchema } from '../agent-json-config.schema';

const minimalConfig = {
	name: 'test-agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help the user.',
};

describe('AgentJsonConfigSchema — tools', () => {
	describe('custom tool id field', () => {
		it('accepts a valid alphanumeric id', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my_tool' }],
			});
			expect(result.success).toBe(true);
		});

		it('accepts an id with underscores', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my_tool_v2' }],
			});
			expect(result.success).toBe(true);
		});

		it('rejects an id with hyphens', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my-tool' }],
			});
			expect(result.success).toBe(false);
		});

		it('rejects an id with spaces', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my tool' }],
			});
			expect(result.success).toBe(false);
		});

		it('rejects an id with special characters', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'tool!' }],
			});
			expect(result.success).toBe(false);
		});

		it('rejects an empty id', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: '' }],
			});
			expect(result.success).toBe(false);
		});
	});

	describe('custom tool id uniqueness refine', () => {
		it('accepts multiple custom tools with distinct ids', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [
					{ type: 'custom', id: 'tool_a' },
					{ type: 'custom', id: 'tool_b' },
				],
			});
			expect(result.success).toBe(true);
		});

		it('rejects multiple custom tools with the same id', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [
					{ type: 'custom', id: 'duplicate' },
					{ type: 'custom', id: 'duplicate' },
				],
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.errors[0].message).toBe('Duplicate custom tool id: "duplicate"');
			}
		});

		it('does not apply the uniqueness check to non-custom tool types', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [
					{ type: 'custom', id: 'unique_custom' },
					{ type: 'workflow', workflow: 'My Workflow' },
					{ type: 'workflow', workflow: 'My Workflow' },
				],
			});
			expect(result.success).toBe(true);
		});

		it('accepts an empty tools array', () => {
			const result = AgentJsonConfigSchema.safeParse({ ...minimalConfig, tools: [] });
			expect(result.success).toBe(true);
		});
	});
});
