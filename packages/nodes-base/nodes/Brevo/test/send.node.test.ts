import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Brevo, email => send (recipients field spelling)', () => {
	const credentials = {
		sendInBlueApi: { apiKey: 'test-api-key' },
	};

	beforeEach(() => {
		nock('https://api.brevo.com')
			.post('/v3/smtp/email', (body) => {
				// Both v1 (legacy "receipients") and v2 ("recipients") must resolve to
				// the same outgoing "to" address - proves the rename didn't break delivery.
				return (
					Array.isArray(body.to) &&
					body.to.length === 1 &&
					body.to[0].email === 'recipient@example.com'
				);
			})
			.reply(201, {
				messageId: '<202601010000.1234567890@smtp-relay.mailin.fr>',
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['send.v1.workflow.json', 'send.v2.workflow.json'],
		credentials,
	});
});
