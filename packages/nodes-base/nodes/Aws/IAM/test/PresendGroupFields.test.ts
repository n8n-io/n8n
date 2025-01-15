import { presendGroupFields } from '../GenericFunctions';

describe('presendGroupFields', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				name: 'TestNode',
			})),
		};
	});

	it('should append Path to the URL for CreateGroup operation', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce({
			Path: '/new-path',
		});
		mockContext.getNodeParameter.mockReturnValueOnce('some-group');
		const requestOptions = {
			url: 'https://example.com?Action=CreateGroup',
			headers: {},
			body: {},
		};

		const options = await presendGroupFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=CreateGroup&GroupName=some-group&Path=/new-path',
		);
	});

	it('should append GroupName for GetGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'GroupName') return { mode: 'value', value: 'some-group' };
		});
		const requestOptions = {
			url: 'https://example.com?Action=GetGroup',
			headers: {},
			body: {},
		};

		const options = await presendGroupFields.call(mockContext, requestOptions);

		expect(options.url).toBe('https://example.com?Action=GetGroup&GroupName=some-group');
	});

	it('should append GroupName for DeleteGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'GroupName') return { mode: 'value', value: 'some-group' };
			return undefined;
		});
		const requestOptions = {
			url: 'https://example.com?Action=DeleteGroup',
			headers: {},
			body: {},
		};

		const options = await presendGroupFields.call(mockContext, requestOptions);

		expect(options.url).toBe('https://example.com?Action=DeleteGroup&GroupName=some-group');
	});

	it('should append NewGroupName and NewPath for UpdateGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'GroupName') return { mode: 'value', value: 'some-group' };
			if (name === 'additionalFields') {
				return {
					NewGroupName: 'new-group',
					NewPath: '/new-path',
				};
			}
			return undefined;
		});
		const requestOptions = {
			url: 'https://example.com?Action=UpdateGroup',
			headers: {},
			body: {},
		};

		const options = await presendGroupFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=UpdateGroup&GroupName=some-group&NewGroupName=new-group&NewPath=/new-path',
		);
	});

	it('should handle missing additionalFields', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'additionalFields') {
				return {};
			}
			if (name === 'GroupName') {
				return 'some-group';
			}
		});

		const requestOptions = {
			url: 'https://example.com?Action=CreateGroup',
			headers: {},
			body: {},
		};

		const options = await presendGroupFields.call(mockContext, requestOptions);

		expect(options.url).toBe('https://example.com?Action=CreateGroup&GroupName=some-group');
	});
});
