import { type ImapSimple } from '@n8n/imap';
import { mock, mockDeep } from 'jest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import type { INode, ITriggerFunctions, IDataObject } from 'n8n-workflow';

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

		it('should skip emails with missing HEADER part in simple format', async () => {
			const messageWithoutHeader = {
				attributes: { uuid: 1, uid: 900, struct: {} },
				parts: [{ which: 'TEXT', body: 'txt' }],
			};

			const localConnection = mock<ImapSimple>({
				search: jest.fn().mockResolvedValue([messageWithoutHeader]),
			});

			triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
			triggerFunctions.getNodeParameter.calledWith('format').mockReturnValue('simple');
			triggerFunctions.getNodeParameter.calledWith('downloadAttachments').mockReturnValue(false);
			triggerFunctions.getWorkflowStaticData.mockReturnValue({});

			const onEmailBatch = jest.fn();
			await getNewEmails.call(triggerFunctions, {
				imapConnection: localConnection,
				searchCriteria: [],
				postProcessAction: 'nothing',
				getText,
				getAttachment,
				onEmailBatch,
			});

			expect(onEmailBatch).toHaveBeenCalledWith([]);
			expect(triggerFunctions.logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('HEADER part missing'),
			);
		});

		it('should only mark processed emails as read, not filtered-out ones', async () => {
			const staticData: IDataObject = { lastMessageUid: 873 };
			const messages = [
				{
					attributes: { uuid: 1, uid: 870, struct: {} },
					parts: [
						{ which: 'TEXT', body: 'txt' },
						{ which: 'HEADER', body: { from: ['a@b.com'] } },
					],
				},
				{
					attributes: { uuid: 2, uid: 873, struct: {} },
					parts: [
						{ which: 'TEXT', body: 'txt' },
						{ which: 'HEADER', body: { from: ['b@b.com'] } },
					],
				},
				{
					attributes: { uuid: 3, uid: 875, struct: {} },
					parts: [
						{ which: 'TEXT', body: 'txt' },
						{ which: 'HEADER', body: { from: ['c@b.com'] } },
					],
				},
			];

			const localConnection = mock<ImapSimple>({
				search: jest.fn().mockResolvedValue(messages),
			});

			triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
			triggerFunctions.getNodeParameter.calledWith('format').mockReturnValue('simple');
			triggerFunctions.getNodeParameter.calledWith('downloadAttachments').mockReturnValue(false);
			triggerFunctions.getWorkflowStaticData.mockReturnValue(staticData);

			const onEmailBatch = jest.fn();
			await getNewEmails.call(triggerFunctions, {
				imapConnection: localConnection,
				searchCriteria: [],
				postProcessAction: 'read',
				getText,
				getAttachment,
				onEmailBatch,
			});

			expect(localConnection.addFlags).toHaveBeenCalledWith([875], '\\SEEN');
			expect(onEmailBatch).toHaveBeenCalledWith([
				expect.objectContaining({
					json: expect.objectContaining({
						attributes: { uid: 875 },
					}),
				}),
			]);
		});

		it('should not call addFlags when all messages are filtered out', async () => {
			const staticData: IDataObject = { lastMessageUid: 873 };
			const messages = [
				{
					attributes: { uuid: 1, uid: 873, struct: {} },
					parts: [
						{ which: 'TEXT', body: 'txt' },
						{ which: 'HEADER', body: { from: ['a@b.com'] } },
					],
				},
			];

			const localConnection = mock<ImapSimple>({
				search: jest.fn().mockResolvedValue(messages),
			});

			triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
			triggerFunctions.getNodeParameter.calledWith('format').mockReturnValue('simple');
			triggerFunctions.getNodeParameter.calledWith('downloadAttachments').mockReturnValue(false);
			triggerFunctions.getWorkflowStaticData.mockReturnValue(staticData);

			const onEmailBatch = jest.fn();
			await getNewEmails.call(triggerFunctions, {
				imapConnection: localConnection,
				searchCriteria: [],
				postProcessAction: 'read',
				getText,
				getAttachment,
				onEmailBatch,
			});

			expect(localConnection.addFlags).not.toHaveBeenCalled();
			expect(onEmailBatch).toHaveBeenCalledWith([]);
		});

		it('should update lastMessageUid between batch iterations to prevent duplicates', async () => {
			const staticData: IDataObject = {};
			const batch1 = Array.from({ length: 20 }, (_, i) => ({
				attributes: { uuid: i + 1, uid: i + 1, struct: {} },
				parts: [
					{ which: 'TEXT', body: 'txt' },
					{ which: 'HEADER', body: { from: [`user${i}@test.com`] } },
				],
			}));
			const batch2 = [
				{
					attributes: { uuid: 20, uid: 20, struct: {} },
					parts: [
						{ which: 'TEXT', body: 'txt' },
						{ which: 'HEADER', body: { from: ['user20@test.com'] } },
					],
				},
				{
					attributes: { uuid: 21, uid: 21, struct: {} },
					parts: [
						{ which: 'TEXT', body: 'txt' },
						{ which: 'HEADER', body: { from: ['user21@test.com'] } },
					],
				},
			];

			const localConnection = mock<ImapSimple>({
				search: jest.fn().mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2),
			});

			triggerFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
			triggerFunctions.getNodeParameter.calledWith('format').mockReturnValue('simple');
			triggerFunctions.getNodeParameter.calledWith('downloadAttachments').mockReturnValue(false);
			triggerFunctions.getWorkflowStaticData.mockReturnValue(staticData);

			const allBatchedUids: number[][] = [];
			const onEmailBatch = jest.fn().mockImplementation((data) => {
				allBatchedUids.push(
					data.map((item: { json: { attributes: { uid: number } } }) => item.json.attributes.uid),
				);
			});

			await getNewEmails.call(triggerFunctions, {
				imapConnection: localConnection,
				searchCriteria: [],
				postProcessAction: 'nothing',
				getText,
				getAttachment,
				onEmailBatch,
			});

			expect(onEmailBatch).toHaveBeenCalledTimes(2);

			const allEmittedUids = allBatchedUids.flat();
			const uniqueUids = new Set(allEmittedUids);
			expect(allEmittedUids.length).toBe(uniqueUids.size);

			expect(allBatchedUids[0]).toHaveLength(20);
			expect(allBatchedUids[1]).toEqual([21]);
			expect(staticData.lastMessageUid).toBe(21);
		});
	});
});
