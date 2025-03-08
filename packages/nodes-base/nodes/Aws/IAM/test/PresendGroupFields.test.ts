/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { presendGroupFields } from '../GenericFunctions';

describe('presendGroupFields', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
		};
	});

	it('should append Path to the URL for CreateGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'additionalFields') {
				return { Path: '/new-path/' };
			}
			if (name === 'NewName') {
				return 'someGroup';
			}
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=CreateGroup',
			headers: {},
			body: {},
		};

		const options = await presendGroupFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=CreateGroup&GroupName=someGroup&Path=/new-path/',
		);
	});

	it('should append NewGroupName and NewPath for UpdateGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'GroupName') return { mode: 'value', value: 'some-group' };
			if (name === 'NewGroupName') return 'newGroup';
			if (name === 'additionalFields') {
				return {
					NewPath: '/new-path/',
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
			'https://example.com?Action=UpdateGroup&GroupName=some-group&NewGroupName=newGroup&NewPath=/new-path/',
		);
	});

	it('should validate and reject an invalid group name for CreateGroup', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'NewName') {
				return 'Invalid Group Name!';
			}
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=CreateGroup',
			headers: {},
			body: {},
		};

		await expect(presendGroupFields.call(mockContext, requestOptions)).rejects.toThrow(
			'Invalid group name provided',
		);
	});

	it('should validate and reject an invalid path for UpdateGroup', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'GroupName') return { mode: 'value', value: 'some-group' };
			if (name === 'additionalFields') {
				return { NewPath: 'invalid-path' };
			}
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=UpdateGroup',
			headers: {},
			body: {},
		};

		await expect(presendGroupFields.call(mockContext, requestOptions)).rejects.toThrow(
			'Invalid path',
		);
	});
});
