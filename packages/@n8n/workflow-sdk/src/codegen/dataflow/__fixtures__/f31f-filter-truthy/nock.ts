import nock from 'nock';

const users = [
	{
		id: 1,
		name: 'Leanne Graham',
		username: 'Bret',
		email: 'Sincere@april.biz',
		website: 'hildegard.org',
		phone: '1-770-736-8031',
	},
	{
		id: 3,
		name: 'Clementine Bauch',
		username: 'Samantha',
		email: 'Nathan@yesenia.net',
		website: 'ramiro.info',
		phone: '',
	},
	{
		id: 6,
		name: 'Mrs. Dennis Schulist',
		username: 'Antonette',
		email: 'Sherwood@rosamond.biz',
		phone: null,
	},
];

export function setupNock(): nock.Scope[] {
	const getUsers = nock('https://jsonplaceholder.typicode.com').get('/users').reply(200, users);
	const notifyUser = nock('https://jsonplaceholder.typicode.com')
		.post('/posts')
		.times(1)
		.reply(200, { notified: true });
	return [getUsers, notifyUser];
}
