import { createGetBestPracticesTool } from '../best-practices/get-best-practices.tool';

interface BestPracticesOutput {
	technique: string;
	documentation?: string;
	availableTechniques?: Array<{
		technique: string;
		description: string;
		hasDocumentation: boolean;
	}>;
	message: string;
}

describe('get-best-practices tool', () => {
	const tool = createGetBestPracticesTool();

	it('should list all techniques when technique is "list"', async () => {
		const result = (await tool.execute!({ technique: 'list' }, {} as never)) as BestPracticesOutput;

		expect(result.technique).toBe('list');
		expect(result.availableTechniques).toBeDefined();
		expect(result.availableTechniques!.length).toBeGreaterThan(10);

		const scheduling = result.availableTechniques!.find((t) => t.technique === 'scheduling');
		expect(scheduling).toBeDefined();
		expect(scheduling!.hasDocumentation).toBe(true);
		expect(scheduling!.description).toBeTruthy();

		const dataAnalysis = result.availableTechniques!.find((t) => t.technique === 'data_analysis');
		expect(dataAnalysis).toBeDefined();
		expect(dataAnalysis!.hasDocumentation).toBe(false);
	});

	it('should return documentation for known technique with guide', async () => {
		const result = (await tool.execute!(
			{ technique: 'chatbot' },
			{} as never,
		)) as BestPracticesOutput;

		expect(result.technique).toBe('chatbot');
		expect(result.documentation).toBeDefined();
		expect(result.documentation).toContain('Best Practices: Chatbot');
		expect(result.message).toContain('retrieved successfully');
	});

	it('should return helpful message for valid technique without guide', async () => {
		const result = (await tool.execute!(
			{ technique: 'data_analysis' },
			{} as never,
		)) as BestPracticesOutput;

		expect(result.technique).toBe('data_analysis');
		expect(result.documentation).toBeUndefined();
		expect(result.message).toContain('does not have detailed documentation yet');
	});

	it('should return helpful message for unknown technique', async () => {
		const result = (await tool.execute!(
			{ technique: 'nonexistent_technique' },
			{} as never,
		)) as BestPracticesOutput;

		expect(result.technique).toBe('nonexistent_technique');
		expect(result.documentation).toBeUndefined();
		expect(result.message).toContain('Unknown technique');
		expect(result.message).toContain('"list"');
	});

	it('should return documentation for scheduling technique', async () => {
		const result = (await tool.execute!(
			{ technique: 'scheduling' },
			{} as never,
		)) as BestPracticesOutput;

		expect(result.documentation).toContain('Schedule Trigger');
		expect(result.documentation).toContain('Cron');
	});

	it('should return documentation for triage technique', async () => {
		const result = (await tool.execute!(
			{ technique: 'triage' },
			{} as never,
		)) as BestPracticesOutput;

		expect(result.documentation).toContain('Triage');
		expect(result.documentation).toContain('Switch');
	});
});
