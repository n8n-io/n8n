import { CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING } from '../../constants.ee';
import { parseRemovedPersonalSpaceScopes } from '../parse-removed-personal-space-scopes.ee';

describe('parseRemovedPersonalSpaceScopes', () => {
	it('returns the stored removable scopes', () => {
		expect(parseRemovedPersonalSpaceScopes(JSON.stringify(['credential:create']))).toEqual([
			'credential:create',
		]);
	});

	it('returns every removable scope when all are stored', () => {
		const all = CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING.scopes;
		expect(parseRemovedPersonalSpaceScopes(JSON.stringify(all))).toEqual(all);
	});

	it('drops a stored scope that is not removable', () => {
		expect(
			parseRemovedPersonalSpaceScopes(JSON.stringify(['workflow:create', 'agent:create'])),
		).toEqual(['agent:create']);
	});

	it.each([undefined, null, '', 'not json', '{"a":1}', '"credential:create"'])(
		'returns an empty list for %j',
		(value) => {
			expect(parseRemovedPersonalSpaceScopes(value)).toEqual([]);
		},
	);
});
