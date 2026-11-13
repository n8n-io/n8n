import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const category = { id: 12, name: 'Announcements' };
const group = { id: 41, name: 'moderators' };
const post = { id: 305, raw: 'Hello everyone' };
const user = { id: 77, username: 'nathan' };
const members = { success: 'OK', usernames: ['nathan'] };

describe('Discourse > Workflows', () => {
	const credentials = {
		discourseApi: {
			url: 'https://forum.example.com',
			apiKey: 'fake-api-key',
			username: 'system',
		},
	};

	beforeAll(() => {
		const api = nock('https://forum.example.com')
			.matchHeader('api-key', 'fake-api-key')
			.matchHeader('api-username', 'system');
		api
			.post('/categories.json', { name: 'Announcements', color: '0000FF', text_color: 'FFFFFF' })
			.reply(200, { category });
		api.get('/categories.json').reply(200, { category_list: { categories: [category] } });
		api
			.put('/categories/12.json', { name: 'News' })
			.reply(200, { category: { id: 12, name: 'News' } });
		api.post('/admin/groups.json', { group: { name: 'moderators' } }).reply(200, {
			basic_group: group,
		});
		api.get('/groups/moderators').reply(200, { group });
		api.get('/groups.json').reply(200, { groups: [group] });
		api.put('/groups/41.json', { group: { name: 'staff-team' } }).reply(200, { success: 'OK' });
		api
			.post('/posts.json', { title: 'Welcome to the forum', raw: 'Hello everyone' })
			.reply(200, post);
		api.get('/posts/305').reply(200, post);
		api.get('/posts.json').reply(200, { latest_posts: [{ id: 306 }, { id: 305 }] });
		api
			.get('/posts.json')
			.query({ before: '305' })
			.reply(200, { latest_posts: [{ id: 305 }] });
		api
			.put('/posts/305.json', { raw: 'Hello again' })
			.reply(200, { post: { id: 305, raw: 'Hello again' } });
		api
			.post('/users.json', {
				name: 'Nathan',
				password: 'fake-password',
				email: 'nathan@example.com',
				username: 'nathan',
			})
			.reply(200, { success: true, user_id: 77 });
		api.get('/users/nathan').reply(200, { user });
		api.get('/u/by-external/sso-77.json').reply(200, { user });
		api.get('/admin/users/list/active.json').reply(200, [user]);
		api.put('/groups/41/members.json', { usernames: 'nathan' }).reply(200, members);
		api.delete('/groups/41/members.json', { usernames: 'nathan' }).reply(200, members);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
