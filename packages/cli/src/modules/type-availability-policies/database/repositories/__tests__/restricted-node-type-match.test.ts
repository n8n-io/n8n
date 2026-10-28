import { keyProjectOutcomes, restrictedNodeTypeMatch } from '../restricted-node-type-match';

const IN_USE = ['a', 'b', 'c', 'd'];

describe('keyProjectOutcomes', () => {
	it('keys a project that denies half the node types in use by what it denies', () => {
		const keys = keyProjectOutcomes({
			shared: [],
			byProjects: [{ projectIds: ['p1', 'p2'], nodeTypes: ['a', 'b'] }],
			nodeTypesInUse: IN_USE,
		});

		expect(keys).toEqual({
			exceptProjectIds: ['p1', 'p2'],
			deniedKeys: ['p1 a', 'p1 b', 'p2 a', 'p2 b'],
			allowlistProjectIds: [],
			allowedKeys: [],
		});
	});

	it('keys a project that denies more than half by what it allows', () => {
		const keys = keyProjectOutcomes({
			shared: [],
			byProjects: [{ projectIds: ['p1'], nodeTypes: ['a', 'b', 'c'] }],
			nodeTypesInUse: IN_USE,
		});

		expect(keys).toEqual({
			exceptProjectIds: ['p1'],
			deniedKeys: [],
			allowlistProjectIds: ['p1'],
			allowedKeys: ['p1 d'],
		});
	});

	it('only exempts a project that denies nothing from the shared outcome', () => {
		const keys = keyProjectOutcomes({
			shared: ['a'],
			byProjects: [{ projectIds: ['opts-in'], nodeTypes: [] }],
			nodeTypesInUse: IN_USE,
		});

		expect(keys).toEqual({
			exceptProjectIds: ['opts-in'],
			deniedKeys: [],
			allowlistProjectIds: [],
			allowedKeys: [],
		});
	});
});

describe('restrictedNodeTypeMatch', () => {
	const restricted = {
		shared: ['a'],
		byProjects: [{ projectIds: ['p1'], nodeTypes: ['b'] }],
		nodeTypesInUse: IN_USE,
	};

	it('binds each list as one parameter, whatever its length', () => {
		const { condition, parameters } = restrictedNodeTypeMatch(restricted, true);
		const manyProjects = restrictedNodeTypeMatch(
			{
				...restricted,
				byProjects: [
					{ projectIds: Array.from({ length: 100_000 }, (_, i) => `p${i}`), nodeTypes: ['b'] },
				],
			},
			true,
		);

		expect(manyProjects.condition).toBe(condition);
		expect(parameters).toEqual({
			restrictedShared: ['a'],
			restrictedExceptProjectIds: ['p1'],
			restrictedDeniedKeys: ['p1 b'],
			restrictedAllowlistProjectIds: [],
			restrictedAllowedKeys: [],
		});
	});

	it('binds JSON arrays on sqlite', () => {
		const { parameters } = restrictedNodeTypeMatch(restricted, false);

		expect(parameters.restrictedShared).toBe('["a"]');
	});
});
