import {
	cloudBrowserTaskInputSchema,
	createStartCloudBrowserTaskTool,
	type CloudBrowserTaskInput,
} from '../start-cloud-browser-task.tool';

describe('start-cloud-browser-task tool', () => {
	const task: CloudBrowserTaskInput = {
		title: 'Find the price',
		goal: 'Find the price of the Pro plan on example.com',
		startUrl: 'https://example.com/pricing',
	};

	it('passes the input to the host and returns its answer', async () => {
		const start = vi.fn(async () => ({ status: 'started' as const, taskId: 'task-1' }));
		const tool = createStartCloudBrowserTaskTool(start);

		const result = await tool.handler!(task, {} as never);

		expect(start).toHaveBeenCalledWith(task);
		expect(result).toEqual({ status: 'started', taskId: 'task-1' });
	});

	describe('input', () => {
		it('trims the title and the goal', () => {
			expect(
				cloudBrowserTaskInputSchema.parse({ title: '  Find the price ', goal: ' Find it ' }),
			).toEqual({ title: 'Find the price', goal: 'Find it' });
		});

		it.each([
			['an empty title', { ...task, title: '  ' }],
			['a title longer than 60 characters', { ...task, title: 'x'.repeat(61) }],
			['an empty goal', { ...task, goal: '' }],
			['a start URL that is not a URL', { ...task, startUrl: 'example.com' }],
			['a start URL that is not a website', { ...task, startUrl: 'ftp://example.com' }],
		])('rejects %s', (_, input) => {
			expect(cloudBrowserTaskInputSchema.safeParse(input).success).toBe(false);
		});

		it('accepts credentials to create, each with a type and a name', () => {
			const parsed = cloudBrowserTaskInputSchema.parse({
				...task,
				credentialsToCreate: [{ type: 'httpBasicAuth', name: 'The Internet test login' }],
			});

			expect(parsed.credentialsToCreate).toEqual([
				{ type: 'httpBasicAuth', name: 'The Internet test login' },
			]);
		});

		it('rejects a credential without a name', () => {
			expect(
				cloudBrowserTaskInputSchema.safeParse({
					...task,
					credentialsToCreate: [{ type: 'httpBasicAuth' }],
				}).success,
			).toBe(false);
		});
	});
});
