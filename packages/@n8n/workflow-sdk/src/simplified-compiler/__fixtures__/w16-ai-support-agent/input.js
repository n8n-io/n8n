onWebhook({ method: 'POST', path: '/support' }, async ({ body, respond }) => {
	const answer = await ai.chat('gpt-4o', 'Answer the support question', {
		tools: [
			{ type: 'httpRequest', name: 'Knowledge Base', url: 'https://api.kb.com/search' },
			{ type: 'code', name: 'Ticket Lookup', code: 'return lookupTicket(query)' },
		],
		memory: { type: 'bufferWindow', contextLength: 10 },
	});
	respond({ status: 200, body: { answer: 'response sent' } });
});
