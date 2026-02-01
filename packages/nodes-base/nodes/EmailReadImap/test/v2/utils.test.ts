import { type ImapSimple } from '@n8n/imap';
import { mock, mockDeep } from 'jest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import type { INode, ITriggerFunctions } from 'n8n-workflow';

import { getNewEmails } from '../../v2/utils';

describe('Test IMap V2 utils', () => {
	afterEach(() => jest.resetAllMocks());

	describe('getNewEmails', () => {
		const triggerFunctions = mockDeep<ITriggerFunctions>({
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
				triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
				triggerFunctions.getNodeParameter
					.calledWith('format')
					.mockReturnValue(expectedResult.format);
				triggerFunctions.getNodeParameter
					.calledWith('dataPropertyAttachmentsPrefixName')
					.mockReturnValue('resolved');
				triggerFunctions.getWorkflowStaticData.mockReturnValue({});

				const onEmailBatch = jest.fn();
				await getNewEmails.call(triggerFunctions, {
					imapConnection,
					searchCriteria: [],
					postProcessAction: '',
					getText,
					getAttachment,
					onEmailBatch,
				});

				expect(onEmailBatch).toHaveBeenCalledTimes(1);
				expect(onEmailBatch).toHaveBeenCalledWith([expectedResult.expected]);
			});
		});
	});
});
