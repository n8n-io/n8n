import type { IRestApiContext } from '../../types';
import * as utils from '../../utils';
import { generateScimToken, getScimConfig, setScimEnabled } from '../scim';

vi.mock('../../utils');

const context = {} as IRestApiContext;

describe('SCIM API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the config', async () => {
		await getScimConfig(context);

		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/scim/config');
	});

	it.each([true, false])('sends enabled %s', async (enabled) => {
		await setScimEnabled(context, enabled);

		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'PATCH', '/scim/config', {
			enabled,
		});
	});

	it('generates the token', async () => {
		await generateScimToken(context);

		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', '/scim/token');
	});
});
