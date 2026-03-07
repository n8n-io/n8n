onSchedule({ every: '21h' }, async () => {
	const searchInput = "What's the latest news in artificial intelligence?";

	const result = await http.post(
		'https://api.perplexity.ai/chat/completions',
		{
			model: 'llama-3.1-sonar-small-128k-online',
			messages: [
				{ role: 'system', content: 'You are a social media assistant summarizing tech news...' },
				{ role: 'user', content: searchInput },
			],
			temperature: 0.3,
		},
		{ auth: { type: 'bearer', credential: 'Perplexity API' } },
	);

	await http.post(
		'https://api.twitter.com/2/tweets',
		{ text: result.choices[0].message.content },
		{ auth: { type: 'oauth2', credential: 'Twitter OAuth2' } },
	);
});
