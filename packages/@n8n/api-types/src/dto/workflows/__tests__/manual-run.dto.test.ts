import { ManualRunDto } from '../manual-run.dto';

describe('ManualRunDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'full run from a known trigger',
				request: { triggerToStartFrom: { name: 'Trigger' } },
			},
			{
				name: 'full run from an unknown trigger, to a destination',
				request: { destinationNode: { nodeName: 'Set', mode: 'inclusive' } },
			},
			{
				name: 'partial run with run data and a destination',
				request: {
					destinationNode: { nodeName: 'Set', mode: 'exclusive' },
					runData: {},
					dirtyNodeNames: ['Set'],
				},
			},
			{
				name: 'partial run without dirty node names',
				request: {
					destinationNode: { nodeName: 'Set', mode: 'exclusive' },
					runData: {},
				},
			},
			{
				name: 'known trigger with agent request and chat session',
				request: {
					triggerToStartFrom: { name: 'Chat Trigger' },
					chatSessionId: 'session-1',
					agentRequest: { query: 'hi', tool: { name: 'x' } },
				},
			},
		])('should validate $name', ({ request }) => {
			const result = ManualRunDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('should strip keys from other cases when a trigger is specified', () => {
			const result = ManualRunDto.safeParse({
				triggerToStartFrom: { name: 'Trigger' },
				runData: { Trigger: [] },
				dirtyNodeNames: ['Set'],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty('runData');
				expect(result.data).not.toHaveProperty('dirtyNodeNames');
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'empty payload', request: {} },
			{
				name: 'only an agent request',
				request: { agentRequest: { query: 'hi', tool: { name: 'x' } } },
			},
			{ name: 'run data without a destination node', request: { runData: {} } },
		])('should reject $name', ({ request }) => {
			const result = ManualRunDto.safeParse(request);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.errors[0].message).toBe(
					'To run the workflow manually, specify either a trigger to start from or a destination node.',
				);
			}
		});

		test.each([
			{ name: 'a non-object body', request: null },
			{
				name: 'a malformed destination node',
				request: { destinationNode: { nodeName: 'Set' } },
			},
			{
				name: 'a malformed trigger',
				request: { triggerToStartFrom: { data: {} } },
			},
			{
				name: 'an array as run data',
				request: { destinationNode: { nodeName: 'Set', mode: 'inclusive' }, runData: [] },
			},
			{
				name: 'an array as agent request',
				request: { triggerToStartFrom: { name: 'Trigger' }, agentRequest: [] },
			},
		])('should reject $name with a case-specific error', ({ request }) => {
			const result = ManualRunDto.safeParse(request);
			expect(result.success).toBe(false);
		});
	});
});
