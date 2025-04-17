import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import { EmailSendV2, versionDescription } from '../../v2/EmailSendV2.node';
import * as utils from '../../v2/utils';

const transporter = { sendMail: jest.fn() };

jest.mock('../../v2/utils', () => {
	const originalModule = jest.requireActual('../../v2/utils');
	return {
		...originalModule,
		configureTransport: jest.fn(() => transporter),
	};
});

describe('Test EmailSendV2, email => sendAndWait', () => {
	let emailSendV2: EmailSendV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		emailSendV2 = new EmailSendV2(versionDescription);
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		//node
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);

		//operation
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('from@mail.com');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('to@mail.com');
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.putExecutionToWait.mockImplementation();
		mockExecuteFunctions.getInputData.mockReturnValue(items);

		//getSendAndWaitConfig
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('http://localhost/waiting-webhook');
		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('nodeID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');

		// configureWaitTillDate
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); //options.limitWaitTime.values

		const result = await emailSendV2.execute.call(mockExecuteFunctions);

		expect(result).toEqual([items]);
		expect(utils.configureTransport).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(transporter.sendMail).toHaveBeenCalledWith({
			from: 'from@mail.com',
			html: expect.stringContaining('href="http://localhost/waiting-webhook/nodeID?approved=true"'),
			subject: 'my subject',
			to: 'to@mail.com',
		});
	});
});
