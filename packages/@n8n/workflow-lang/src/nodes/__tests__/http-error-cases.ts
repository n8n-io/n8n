/**
 * Equivalence cases of a failed request in the Google Sheets, Microsoft Outlook and Google
 * Calendar library nodes: the message of the error is the message of v1 (the NodeApiError of
 * n8n-workflow for the HTTP status, and the answer of Microsoft Graph for an Outlook 400).
 *
 * Status 401 has no case: with an OAuth2 credential, v1 asks for a new token first, and the
 * recorder has no token service. The runtime renews the token in the credential layer.
 */
import type { EquivalenceCase } from './equivalence.ts';

const oauth = (type: string) => ({
	type,
	data: { oauthTokenData: { access_token: 'fake-token', token_type: 'Bearer' } },
});
const meta = { body: { sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }] } };
const graph = { error: { code: 'ErrorInvalidRequest', message: 'The request is not valid.' } };

const MESSAGES: Array<[number, string]> = [
	[400, 'Bad request - please check your parameters'],
	[403, 'Forbidden - perhaps check your credentials?'],
	[404, 'The resource you are requesting could not be found'],
	[429, 'The service is receiving too many requests from you'],
	[500, 'The service was not able to process your request'],
];

const sheets = {
	type: 'n8n-nodes-base.googleSheets',
	typeVersion: 4.7,
	parameters: {
		resource: 'sheet',
		operation: 'clear',
		documentId: { __rl: true, mode: 'id', value: 'doc1' },
		sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
	},
	credential: oauth('googleSheetsOAuth2Api'),
};
const outlook = {
	type: 'n8n-nodes-base.microsoftOutlook',
	typeVersion: 2,
	parameters: {
		resource: 'message',
		operation: 'delete',
		messageId: { __rl: true, mode: 'id', value: 'm1' },
	},
	credential: oauth('microsoftOutlookOAuth2Api'),
};
const calendar = {
	type: 'n8n-nodes-base.googleCalendar',
	typeVersion: 1.3,
	parameters: {
		resource: 'event',
		operation: 'delete',
		calendar: { __rl: true, mode: 'id', value: 'mia@acme.test' },
		eventId: 'ev_1',
		options: {},
	},
	credential: oauth('googleCalendarOAuth2Api'),
};

export const HTTP_ERROR_CASES: EquivalenceCase[] = [
	...MESSAGES.flatMap(([status, message]): EquivalenceCase[] => [
		{
			...sheets,
			name: `googleSheets failed request ${status}`,
			responses: [meta, { status, body: graph }],
			expectedError: message,
		},
		{
			...sheets,
			name: `googleSheets failed sheet lookup ${status}`,
			responses: [{ status, body: {} }],
			expectedError: message,
		},
		{
			...calendar,
			name: `googleCalendar failed request ${status}`,
			responses: [{ status, body: graph }],
			expectedError: message,
		},
		{
			...outlook,
			name: `microsoftOutlook failed request ${status}`,
			responses: [{ status, body: status === 400 ? 'plain text' : graph }],
			expectedError: status === 400 ? 'Request failed with status code 400' : message,
		},
	]),
	{
		...outlook,
		name: 'microsoftOutlook failed request 400 with the message of Microsoft Graph',
		responses: [{ status: 400, body: graph }],
		expectedError: 'The request is not valid.',
	},
	{
		...outlook,
		name: 'microsoftOutlook failed send 403',
		parameters: { toRecipients: 'ada@example.com', subject: 'Hi' },
		responses: [{ status: 403, body: graph }],
		expectedError: 'Forbidden - perhaps check your credentials?',
	},
];
