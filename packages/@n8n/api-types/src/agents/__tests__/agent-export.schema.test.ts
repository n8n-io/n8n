import { AgentExportSchema } from '../agent-export.schema';

const exportedTask = {
	name: 'Daily summary',
	objective: 'Summarize yesterday.',
	cronExpression: '0 9 * * *',
	enabled: true,
};

describe('AgentExportSchema', () => {
	it('reads the task definitions out of an exported config', () => {
		const result = AgentExportSchema.safeParse({
			name: 'Agent',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'cred-1',
			instructions: 'Help users',
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			taskDefinitions: [exportedTask],
		});

		expect(result.success).toBe(true);
		expect(result.data?.taskDefinitions).toEqual([exportedTask]);
	});

	it('accepts an export without task definitions', () => {
		const result = AgentExportSchema.safeParse({ name: 'Agent', instructions: 'Help users' });

		expect(result.success).toBe(true);
		expect(result.data?.taskDefinitions).toBeUndefined();
	});

	it('rejects a task definition missing its body', () => {
		const result = AgentExportSchema.safeParse({ taskDefinitions: [{ name: 'Daily summary' }] });

		expect(result.success).toBe(false);
	});

	it('rejects a task definition carrying an id, which is per-agent', () => {
		const result = AgentExportSchema.safeParse({
			taskDefinitions: [{ ...exportedTask, id: 'task-1' }],
		});

		expect(result.success).toBe(false);
	});
});
