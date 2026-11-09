import type { IRestApiContext } from '../../types';
import * as utils from '../../utils';
import { initSSO } from '../sso';

vi.mock('../../utils');

const context = {} as IRestApiContext;

describe('initSSO', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('encodes the destination as a query parameter', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce('https://idp.example.com/saml');

		await initSSO(context, '/workflow/abc?tab=1&x=2');

		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/sso/saml/initsso?redirect=%2Fworkflow%2Fabc%3Ftab%3D1%26x%3D2',
		);
	});

	it('omits the query when there is no destination', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce('https://idp.example.com/saml');

		await initSSO(context);

		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/sso/saml/initsso');
	});
});
