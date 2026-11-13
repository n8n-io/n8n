import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { Bitly } from '../Bitly.node';

describe('Bitly load options', () => {
	const context = mockDeep<ILoadOptionsFunctions>();

	beforeEach(() => {
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
	});

	it('should request the groups', async () => {
		context.helpers.request.mockResolvedValue({ groups: [{ name: 'Main', guid: 'Ba1bc23dE4F' }] });

		const options = await new Bitly().methods.loadOptions.getGroups.call(context);

		expect(options).toEqual([{ name: 'Main', value: 'Ba1bc23dE4F' }]);
		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({ value: 'https://api-ssl.bitly.com/v4/groups' }),
			}),
		);
	});

	it('should request the tags of the selected group', async () => {
		context.getCurrentNodeParameter.mockReturnValue('Ba1bc23dE4F');
		context.helpers.request.mockResolvedValue({ tags: ['News'] });

		const options = await new Bitly().methods.loadOptions.getTags.call(context);

		expect(options).toEqual([{ name: 'News', value: 'News' }]);
		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api-ssl.bitly.com/v4/groups/Ba1bc23dE4F/tags',
				}),
			}),
		);
	});
});
