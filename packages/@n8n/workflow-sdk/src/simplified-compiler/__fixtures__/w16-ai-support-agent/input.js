/** @example [{ body: { question: "How do I reset my password?", userId: "user_42" } }] */
onWebhook({ method: 'POST', path: '/support' }, async ({ body, respond }) => {
	/** @example [{ output: "Based on our knowledge base, you can resolve this by going to Settings > Account > Reset Password. If the issue persists, please contact support@company.com." }] */
	const answer = await ai.chat('gpt-4o', 'Answer the support question', {
		tools: [
			{ type: 'httpRequest', name: 'Knowledge Base', url: 'https://api.kb.com/search' },
			{ type: 'code', name: 'Ticket Lookup', code: 'return lookupTicket(query)' },
		],
		memory: { type: 'bufferWindow', contextLength: 10 },
	});
	respond({ status: 200, body: { answer: 'response sent' } });
});
