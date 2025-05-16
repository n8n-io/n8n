import { type ImapSimple } from '@n8n/imap';
import { mock } from 'jest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import { type IDataObject, type ITriggerFunctions } from 'n8n-workflow';

import { getNewEmails } from '../../v2/utils';

describe('Test IMap V2 utils', () => {
	afterEach(() => jest.resetAllMocks());

	describe('getNewEmails', () => {
		const triggerFunctions = mock<ITriggerFunctions>({
			helpers: { returnJsonArray },
		});

		const message = {
			attributes: {
				uuid: 1,
				uid: 873,
				struct: {},
			},
			parts: [
				{ which: '', body: 'Body content' },
				{ which: 'HEADER', body: 'h' },
				{ which: 'TEXT', body: 'txt' },
			],
		};

		const imapConnection = mock<ImapSimple>({
			search: jest.fn().mockReturnValue(Promise.resolve([message])),
		});
		const getText = jest.fn().mockReturnValue('text');
		const getAttachment = jest.fn().mockReturnValue(['attachment']);

		it('should return new emails', async () => {
			const expectedResults = [
				{
					format: 'resolved',
					expected: {
						json: {
							attachments: undefined,
							headers: { '': 'Body content' },
							headerLines: undefined,
							html: false,
							attributes: {
								uid: 873,
							},
						},
						binary: undefined,
					},
				},
				{
					format: 'simple',
					expected: {
						json: {
							textHtml: 'text',
							textPlain: 'text',
							metadata: {
								'0': 'h',
							},
							attributes: {
								uid: 873,
							},
						},
					},
				},
				{
					format: 'raw',
					expected: {
						json: { raw: 'txt' },
					},
				},
			];

			expectedResults.forEach(async (expectedResult) => {
				// use new staticData for each iteration
				const staticData: IDataObject = {};

				triggerFunctions.getNodeParameter
					.calledWith('format')
					.mockReturnValue(expectedResult.format);
				triggerFunctions.getNodeParameter
					.calledWith('dataPropertyAttachmentsPrefixName')
					.mockReturnValue('resolved');

				const result = getNewEmails.call(
					triggerFunctions,
					imapConnection,
					[],
					staticData,
					'',
					getText,
					getAttachment,
				);

				await expect(result).resolves.toEqual([expectedResult.expected]);
			});
		});
	});
});
