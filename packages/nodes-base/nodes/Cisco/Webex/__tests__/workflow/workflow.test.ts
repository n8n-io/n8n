import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Cisco Webex > Workflows', () => {
	const credentials = {
		ciscoWebexOAuth2Api: { oauthTokenData: { access_token: 'test-access-token' } },
	};

	beforeAll(() => {
		nock('https://webexapis.com')
			.post('/v1/messages')
			.reply(200, {
				id: 'Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			})
			.delete(
				'/v1/messages/Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			)
			.reply(200, {})
			.get(
				'/v1/messages/Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			)
			.reply(200, {
				id: 'Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			})
			.get(
				'/v1/messages/Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			)
			.reply(200, {
				id: 'Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
				roomId: 'Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0',
			})
			.put(
				'/v1/messages/Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			)
			.reply(200, {
				id: 'Y2lzY29zcGFyazovL3VzL01FU1NBR0UvOTJkYjNiZTAtNDNiZC0xMWU2LThhZTktZGQ1YjNkZmM1NjVk',
			})
			.post('/v1/meetings')
			.reply(200, { id: '870f51ff287b41be84648412901e0402' })
			.delete('/v1/meetings/870f51ff287b41be84648412901e0402')
			.reply(200, {})
			.get('/v1/meetings/870f51ff287b41be84648412901e0402')
			.reply(200, { id: '870f51ff287b41be84648412901e0402' })
			.get('/v1/meetings')
			.query({ max: '1' })
			.reply(200, { items: [{ id: '870f51ff287b41be84648412901e0402' }] })
			.get('/v1/meetings/870f51ff287b41be84648412901e0402')
			.reply(200, {
				id: '870f51ff287b41be84648412901e0402',
				title: 'Standup',
				password: 'secret',
				start: '2024-05-01T09:00:00Z',
				end: '2024-05-01T09:15:00Z',
			})
			.put('/v1/meetings/870f51ff287b41be84648412901e0402')
			.reply(200, { id: '870f51ff287b41be84648412901e0402' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
