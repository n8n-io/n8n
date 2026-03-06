import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /chat/completions (Perplexity AI — bearer auth)
	const perplexity = nock('https://api.perplexity.ai')
		.post('/chat/completions')
		.reply(200, {
			choices: [
				{
					message: {
						content: 'AI researchers announced a breakthrough in protein folding prediction...',
					},
				},
			],
		});

	// POST /2/tweets (Twitter — oauth2)
	const twitter = nock('https://api.twitter.com')
		.post('/2/tweets')
		.reply(200, {
			data: {
				id: '1234567890',
				text: 'AI researchers announced a breakthrough...',
			},
		});

	return [perplexity, twitter];
}
