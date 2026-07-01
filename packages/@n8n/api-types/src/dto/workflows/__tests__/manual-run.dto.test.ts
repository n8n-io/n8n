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
	});
});
