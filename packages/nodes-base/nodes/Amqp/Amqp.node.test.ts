import { mock } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	ICredentialTestFunctions,
	ICredentialsDecrypted,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Amqp } from './Amqp.node';

// Mock the entire rhea module
const mockSender = {
	close: jest.fn(),
	send: jest.fn().mockReturnValue({ id: 'test-message-id' }),
};

const mockConnection = {
	close: jest.fn(),
	open_sender: jest.fn().mockReturnValue(mockSender),
	options: { reconnect: true },
};

const mockContainer = {
	connect: jest.fn().mockReturnValue(mockConnection),
	on: jest.fn(),
	once: jest.fn(),
};

jest.mock('rhea', () => ({
	create_container: jest.fn(() => mockContainer),
}));

describe('AMQP Node', () => {
	const credentials = mock<ICredentialDataDecryptedObject>({
		hostname: 'localhost',
		port: 5672,
		username: 'testuser',
		password: 'testpass',
		transportType: 'tcp',
	});

	const executeFunctions = mock<IExecuteFunctions>({
		getNode: jest.fn().mockReturnValue({ name: 'AMQP Test Node' }),
		continueOnFail: jest.fn().mockReturnValue(false),
	});

	beforeEach(() => {
		jest.clearAllMocks();

		executeFunctions.getCredentials.calledWith('amqp').mockResolvedValue(credentials);
		executeFunctions.getInputData.mockReturnValue([{ json: { testing: true } }]);
		executeFunctions.getNodeParameter.calledWith('sink', 0).mockReturnValue('test/queue');
		executeFunctions.getNodeParameter.calledWith('headerParametersJson', 0).mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({});

		// Setup container event mocking
		mockContainer.once.mockImplementation((event: string, callback: any) => {
			if (event === 'sendable') {
				// Call the callback immediately to simulate successful connection
				callback({ sender: mockSender });
			}
		});

		// Mock successful credential validation by making the connection open immediately
		mockContainer.on.mockImplementation((event: string, callback: any) => {
			if (event === 'connection_open') {
				setImmediate(() => callback({}));
			}
		});
	});

	it('should throw error when sink is empty', async () => {
		executeFunctions.getNodeParameter.calledWith('sink', 0).mockReturnValue('');

		await expect(new Amqp().execute.call(executeFunctions)).rejects.toThrow(
			new NodeOperationError(executeFunctions.getNode(), 'Queue or Topic required!'),
		);
	});

	it('should send message successfully', async () => {
		const result = await new Amqp().execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { id: 'test-message-id' }, pairedItems: { item: 0 } }]]);
		expect(executeFunctions.getCredentials).toHaveBeenCalledWith('amqp');
		expect(mockContainer.connect).toHaveBeenCalled();
		expect(mockConnection.open_sender).toHaveBeenCalledWith('test/queue');
		expect(mockSender.send).toHaveBeenCalledWith({
			application_properties: {},
			body: '{"testing":true}',
		});
		expect(mockSender.close).toHaveBeenCalled();
		expect(mockConnection.close).toHaveBeenCalled();
	});

	it('should send message with custom headers', async () => {
		executeFunctions.getNodeParameter
			.calledWith('headerParametersJson', 0)
			.mockReturnValue('{"custom":"header","priority":1}');

		await new Amqp().execute.call(executeFunctions);

		expect(mockSender.send).toHaveBeenCalledWith({
			application_properties: { custom: 'header', priority: 1 },
			body: '{"testing":true}',
		});
	});

	it('should send only specific property when configured', async () => {
		executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({
			sendOnlyProperty: 'testing',
		});
		executeFunctions.getInputData.mockReturnValue([{ json: { testing: 'specific-value' } }]);

		await new Amqp().execute.call(executeFunctions);

		expect(mockSender.send).toHaveBeenCalledWith({
			application_properties: {},
			body: '"specific-value"',
		});
	});

	it('should send data as object when configured', async () => {
		executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({
			dataAsObject: true,
		});

		await new Amqp().execute.call(executeFunctions);

		expect(mockSender.send).toHaveBeenCalledWith({
			application_properties: {},
			body: { testing: true },
		});
	});

	it('should handle multiple input items', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: { item: 1 } }, { json: { item: 2 } }]);

		const result = await new Amqp().execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{ json: { id: 'test-message-id' }, pairedItems: { item: 0 } },
				{ json: { id: 'test-message-id' }, pairedItems: { item: 1 } },
			],
		]);
		expect(mockSender.send).toHaveBeenCalledTimes(2);
		expect(mockSender.send).toHaveBeenNthCalledWith(1, {
			application_properties: {},
			body: '{"item":1}',
		});
		expect(mockSender.send).toHaveBeenNthCalledWith(2, {
			application_properties: {},
			body: '{"item":2}',
		});
	});

	it('should continue on fail when configured', async () => {
		executeFunctions.continueOnFail.mockReturnValue(true);
		executeFunctions.getNodeParameter.calledWith('sink', 0).mockReturnValue('');

		const result = await new Amqp().execute.call(executeFunctions);

		expect(result).toEqual([
			[{ json: { error: 'Queue or Topic required!' }, pairedItems: { item: 0 } }],
		]);
	});

	describe('credential test', () => {
		it('should return success for valid credentials', async () => {
			const amqp = new Amqp();
			const testFunctions = mock<ICredentialTestFunctions>();

			// Mock successful connection
			mockContainer.on.mockImplementation((event: string, callback: any) => {
				if (event === 'connection_open') {
					setImmediate(() => callback({}));
				}
			});

			const result = await amqp.methods.credentialTest.amqpConnectionTest.call(testFunctions, {
				data: credentials,
				id: 'test',
				name: 'test',
				type: 'amqp',
			} as ICredentialsDecrypted);

			expect(result).toEqual({
				status: 'OK',
				message: 'Connection successful!',
			});
		});

		it('should return error for invalid credentials', async () => {
			const amqp = new Amqp();
			const testFunctions = mock<ICredentialTestFunctions>();

			// Mock failed connection
			mockContainer.on.mockImplementation((event: string, callback: any) => {
				if (event === 'disconnected') {
					setImmediate(() => callback({ error: new Error('Authentication failed') }));
				}
			});

			const result = await amqp.methods.credentialTest.amqpConnectionTest.call(testFunctions, {
				data: credentials,
				id: 'test',
				name: 'test',
				type: 'amqp',
			} as ICredentialsDecrypted);

			expect(result).toEqual({
				status: 'Error',
				message: 'Authentication failed',
			});
		});
	});
});
