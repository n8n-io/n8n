import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { AwsSns } from '../AwsSns.node';
import { awsApiRequestSOAP } from '../GenericFunctions';

vi.mock('../GenericFunctions', () => ({
	awsApiRequestSOAP: vi.fn(),
}));

describe('AwsSns Node', () => {
	let awsSns: AwsSns;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	const awsApiRequestSOAPMock = awsApiRequestSOAP as Mock;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'AWS SNS',
		type: 'n8n-nodes-base.awsSns',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		awsSns = new AwsSns();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			helpers: {
				returnJsonArray: vi.fn((data: IDataObject | IDataObject[]) =>
					Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }],
				),
			},
		});

		vi.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		awsApiRequestSOAPMock.mockResolvedValue({
			PublishResponse: { PublishResult: { MessageId: 'msg-123' } },
		});
	});

	const getUrl = () => awsApiRequestSOAPMock.mock.calls[0][2] as string;

	describe('publish operation', () => {
		it('should publish to a topic using TopicArn when target is topic', async () => {
			const topicArn = 'arn:aws:sns:us-east-1:123456789012:MyTopic';
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'publish',
					target: 'topic',
					topic: topicArn,
					subject: 'Hello',
					message: 'World',
				};
				return params[paramName];
			});

			const result = await awsSns.execute.call(mockExecuteFunctions);

			const url = getUrl();
			expect(url).toContain('Action=Publish');
			expect(url).toContain('TopicArn=' + topicArn);
			expect(url).toContain('Subject=Hello');
			expect(url).toContain('Message=World');
			expect(url).not.toContain('PhoneNumber');
			expect(result).toEqual([[{ json: { MessageId: 'msg-123' } }]]);
		});

		it('should publish to a phone number using PhoneNumber when target is phone', async () => {
			const number = '+123456789';
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					operation: 'publish',
					target: 'phone',
					number,
					subject: 'Hello',
					message: 'World',
				};
				return params[paramName];
			});

			const result = await awsSns.execute.call(mockExecuteFunctions);

			const url = getUrl();
			expect(url).toContain('Action=Publish');
			expect(url).toContain('PhoneNumber=' + number);
			expect(url).not.toContain('TopicArn');
			expect(result).toEqual([[{ json: { MessageId: 'msg-123' } }]]);
		});
	});
});
