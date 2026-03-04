onWebhook({ method: 'POST', path: '/ai-pipeline' }, async ({ body, respond }) => {
	const inputData = body.data;
	const priority = body.priority || 'balanced';

	const complexity = inputData.length < 500 ? 1 : inputData.length < 2000 ? 2 : 3;
	let provider, model;

	if (priority === 'cost') {
		provider = 'groq';
		model = complexity <= 2 ? 'llama-3.1-8b-instant' : 'llama-3.1-70b-versatile';
	} else if (priority === 'performance') {
		provider = 'openai';
		model = 'gpt-4o';
	} else {
		provider = 'anthropic';
		model = 'claude-3-5-sonnet';
	}

	const startTime = Date.now();
	const prompt = 'Analyze and enrich this data';

	const aiResponse = await ai.chat(model, prompt);

	const processingTime = Date.now() - startTime;

	respond({
		status: 200,
		headers: { 'Content-Type': 'application/json' },
		body: {
			enriched_data: aiResponse,
			metrics: { provider: provider, model: model, processing_time_ms: processingTime },
		},
	});
});
