import { mock, mockDeep } from 'jest-mock-extended';
import * as sendAndWaitUtils from 'n8n-nodes-base/dist/utils/sendAndWait/utils';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { ChatNodeMessageType, FREE_TEXT_CHAT_RESPONSE_TYPE } from 'n8n-workflow';

import { getChatMessage } from '../util';

describe('util', () => {
	describe('getChatMessage', () => {
		const ctx = mockDeep<IExecuteFunctions>();

		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return a string for v1.0', () => {
			ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.0 }));
			ctx.getNodeParameter.mockReturnValue('test');

			const message = getChatMessage(ctx);

			expect(message).toBe('test');
		});

		it('should return a string for v1.1 with free text response type', () => {
			ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			ctx.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'responseType':
						return FREE_TEXT_CHAT_RESPONSE_TYPE;
					case 'message':
						return 'test';
					default:
						return undefined;
				}
			});

			const message = getChatMessage(ctx);

			expect(message).toBe('test');
		});

		it('should return ChatNodeMessageWithButtons for v1.1 with approval response type', () => {
			jest.spyOn(sendAndWaitUtils, 'getSendAndWaitConfig').mockReturnValue({
				title: '',
				message: '',
				options: [
					{ label: 'Disapprove', url: 'https://no.com', style: 'secondary' },
					{ label: 'Approve', url: 'https://yes.com', style: 'primary' },
				],
			});
			ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			ctx.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'responseType':
						return 'approval';
					case 'message':
						return 'test';
					case 'blockUserInput':
						return true;
					default:
						return undefined;
				}
			});

			const message = getChatMessage(ctx);

			expect(message).toEqual({
				type: ChatNodeMessageType.WITH_BUTTONS,
				text: 'test',
				blockUserInput: true,
				buttons: [
					{ text: 'Approve', link: 'https://yes.com', type: 'primary' },
					{ text: 'Disapprove', link: 'https://no.com', type: 'secondary' },
				],
			});
		});
	});
});
