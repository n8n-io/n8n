/** @example [{ body: { question: "How do I reset my password?", userId: "user_42" } }] */
onWebhook({ method: 'POST', path: '/support' }, async ({ body, respond }) => {
	/** @example [{ output: "Based on our knowledge base, you can resolve this by going to Settings > Account > Reset Password. If the issue persists, please contact support@company.com." }] */
	const answer = await new Agent({
		prompt: 'Answer the support question',
		model: new OpenAiModel({ model: 'gpt-4o' }),
		tools: [
			new HttpRequestTool({ name: 'Knowledge Base', url: 'https://api.kb.com/search' }),
			new CodeTool({ jsCode: 'return lookupTicket(query)' }),
		],
		memory: new BufferWindowMemory({ contextWindowLength: 10 }),
	}).chat();
	respond({ status: 200, body: { answer: 'response sent' } });
});
