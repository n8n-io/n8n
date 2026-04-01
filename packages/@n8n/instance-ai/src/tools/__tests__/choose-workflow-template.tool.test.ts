import { createChooseWorkflowTemplateTool } from '../templates/choose-workflow-template.tool';

const input = {
	templates: [
		{
			templateId: 101,
			name: 'Slack alert triage',
			description: 'Route incoming Slack alerts into a review workflow.',
		},
	],
	totalResults: 4,
	introMessage: 'I found a few close matches. Pick one to use now or adapt with me.',
};

describe('choose-workflow-template tool', () => {
	it('suspends with template-choice UI on first call', async () => {
		const suspend = jest.fn();
		const tool = createChooseWorkflowTemplateTool();

		await tool.execute!(input, { agent: { suspend, resumeData: undefined } } as never);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'template-choice',
				templates: input.templates,
				totalResults: 4,
				introMessage: input.introMessage,
			}),
			undefined,
		);
	});

	it('asks what to change before returning adapt_with_agent', async () => {
		const suspend = jest.fn();
		const orchestrationContext = { templateAdaptationRequiresPlanReview: false };
		const tool = createChooseWorkflowTemplateTool(orchestrationContext as never);

		await tool.execute!(input, {
			agent: {
				suspend,
				resumeData: {
					approved: true,
					templateChoice: {
						action: 'adapt_with_agent',
						templateId: 101,
						templateName: 'Slack alert triage',
					},
				},
			},
		} as never);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'questions',
				selectedTemplateChoice: {
					action: 'adapt_with_agent',
					templateId: 101,
					templateName: 'Slack alert triage',
				},
				questions: [
					{
						id: 'template_changes',
						question: 'What would you like to change?',
						type: 'text',
					},
				],
			}),
			undefined,
		);
		expect(orchestrationContext.templateAdaptationRequiresPlanReview).toBe(true);
	});

	it('returns the selected template immediately for use_now', async () => {
		const tool = createChooseWorkflowTemplateTool();

		const result = await tool.execute!(input, {
			agent: {
				resumeData: {
					approved: true,
					templateChoice: {
						action: 'use_now',
						templateId: 101,
						templateName: 'Slack alert triage',
					},
				},
			},
		} as never);

		expect(result).toEqual({
			selected: true,
			action: 'use_now',
			templateId: 101,
			templateName: 'Slack alert triage',
		});
	});

	it('returns requested changes after the follow-up answer', async () => {
		const tool = createChooseWorkflowTemplateTool();

		const result = await tool.execute!(input, {
			agent: {
				resumeData: {
					approved: true,
					templateChoice: {
						action: 'adapt_with_agent',
						templateId: 101,
						templateName: 'Slack alert triage',
					},
					answers: [
						{
							questionId: 'template_changes',
							selectedOptions: [],
							customText: 'Nothing',
						},
					],
				},
			},
		} as never);

		expect(result).toEqual({
			selected: true,
			action: 'adapt_with_agent',
			templateId: 101,
			templateName: 'Slack alert triage',
			requestedChanges: 'Nothing',
			answers: [
				{
					questionId: 'template_changes',
					selectedOptions: [],
					customText: 'Nothing',
				},
			],
		});
	});

	it('returns selected:false when denied', async () => {
		const tool = createChooseWorkflowTemplateTool();

		const result = await tool.execute!(input, {
			agent: {
				resumeData: {
					approved: false,
				},
			},
		} as never);

		expect(result).toEqual({ selected: false });
	});
});
