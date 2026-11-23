import { resolveNodeAnnotations, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { EmailSend } from '../EmailSend.node';

describe('EmailSend, annotations', () => {
	const emailSend = new EmailSend();

	it.each([
		{ typeVersion: 1, parameters: {} },
		{ typeVersion: 2, parameters: {} },
		{ typeVersion: 2, parameters: { operation: 'send' } },
		{ typeVersion: 2, parameters: { operation: SEND_AND_WAIT_OPERATION } },
		{ typeVersion: 2.1, parameters: {} },
		{ typeVersion: 2.1, parameters: { operation: 'send' } },
		{ typeVersion: 2.1, parameters: { operation: SEND_AND_WAIT_OPERATION } },
	])('should resolve version $typeVersion with $parameters', ({ typeVersion, parameters }) => {
		const { description } = emailSend.getNodeType(typeVersion);

		expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual({
			effect: 'write',
			destructive: false,
			idempotent: false,
		});
	});
});
