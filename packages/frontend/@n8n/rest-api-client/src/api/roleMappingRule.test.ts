import type { RoleMappingRuleResponse } from './roleMappingRule';
import { listRoleMappingRules } from './roleMappingRule';
import type { IRestApiContext } from '../types';
import * as utils from '../utils';

vi.mock('../utils');

const context = {} as IRestApiContext;

const makeRule = (id: string): RoleMappingRuleResponse => ({
	id,
	expression: `expr-${id}`,
	role: 'global:member',
	type: 'project',
	order: Number(id),
	projectIds: [],
	createdAt: '',
	updatedAt: '',
});

describe('listRoleMappingRules', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns every rule when they all fit in a single page', async () => {
		const items = [makeRule('0'), makeRule('1')];
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce({ count: 2, items });

		const result = await listRoleMappingRules(context);

		expect(result).toEqual(items);
		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/role-mapping-rule', {
			skip: 0,
			take: 250,
		});
	});

	it('walks every page until the full count is collected', async () => {
		const firstPage = Array.from({ length: 250 }, (_, i) => makeRule(String(i)));
		const secondPage = Array.from({ length: 10 }, (_, i) => makeRule(String(250 + i)));

		vi.mocked(utils.makeRestApiRequest)
			.mockResolvedValueOnce({ count: 260, items: firstPage })
			.mockResolvedValueOnce({ count: 260, items: secondPage });

		const result = await listRoleMappingRules(context);

		expect(result).toHaveLength(260);
		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(2);
		expect(utils.makeRestApiRequest).toHaveBeenNthCalledWith(
			2,
			context,
			'GET',
			'/role-mapping-rule',
			{
				skip: 250,
				take: 250,
			},
		);
	});

	it('stops when a page comes back empty even if the count disagrees', async () => {
		vi.mocked(utils.makeRestApiRequest)
			.mockResolvedValueOnce({ count: 999, items: [makeRule('0')] })
			.mockResolvedValueOnce({ count: 999, items: [] });

		const result = await listRoleMappingRules(context);

		expect(result).toHaveLength(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(2);
	});

	it('passes through a bare array response', async () => {
		const items = [makeRule('0')];
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce(items);

		const result = await listRoleMappingRules(context);

		expect(result).toEqual(items);
		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
	});
});
