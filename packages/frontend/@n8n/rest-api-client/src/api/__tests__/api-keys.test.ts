import type { IRestApiContext } from '../../types';
import * as utils from '../../utils';
import { getApiKeys } from '../api-keys';

vi.mock('../../utils');

const context = {} as IRestApiContext;

describe('getApiKeys', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards take/skip/ownership/label/sortBy to makeRestApiRequest', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce({ count: 0, items: [] });

		await getApiKeys(context, {
			take: 10,
			skip: 5,
			ownership: 'mine',
			label: 'ci',
			sortBy: 'createdAt',
		});

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/api-keys', {
			take: 10,
			skip: 5,
			ownership: 'mine',
			label: 'ci',
			sortBy: 'createdAt',
		});
	});

	it('serializes a non-empty ownerIds array as a comma-joined string', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce({ count: 0, items: [] });

		await getApiKeys(context, { take: 10, ownerIds: ['a', 'b'] });

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/api-keys', {
			take: 10,
			ownerIds: 'a,b',
		});
	});

	it('omits ownerIds when given an empty array', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce({ count: 0, items: [] });

		await getApiKeys(context, { take: 10, ownerIds: [] });

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/api-keys', {
			take: 10,
		});
	});

	it('omits ownerIds when it is absent', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce({ count: 0, items: [] });

		await getApiKeys(context, { take: 10 });

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/api-keys', {
			take: 10,
		});
	});

	it('calls makeRestApiRequest with an empty payload when no options are given', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce({ count: 0, items: [] });

		await getApiKeys(context);

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/api-keys', {});
	});
});
