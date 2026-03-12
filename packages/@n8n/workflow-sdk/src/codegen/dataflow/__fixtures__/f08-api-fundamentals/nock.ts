import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const base = nock('https://test.example.com');

	const menu = base.get('/webhook/tutorial/api/menu').reply(200, { item: 'Pizza', price: 12 });
	const order = base
		.get('/webhook/tutorial/api/order')
		.query({ extra_cheese: 'true' })
		.reply(200, { order: 'Pizza with extra cheese' });
	const review = base
		.post('/webhook/tutorial/api/review')
		.reply(200, {
			status: 'review_received',
			your_comment: 'The pizza was amazing!',
			your_rating: 5,
		});
	const secret = base
		.get('/webhook/tutorial/api/secret-dish')
		.reply(200, { dish: "The Chef's Special Truffle Pasta" });
	const slow = base
		.get('/webhook/tutorial/api/slow-service')
		.reply(200, { status: 'Finally, your food is here!' });

	return [menu, order, review, secret, slow];
}
