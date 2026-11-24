import { decideImportConflictAction } from '../import-conflict-policy';

describe('decideImportConflictAction', () => {
	it.each([
		{ policy: 'fail', exists: true, action: 'create', blocked: true },
		{ policy: 'fail', exists: false, action: 'create', blocked: false },
		{ policy: 'skip', exists: true, action: 'skip', blocked: false },
		{ policy: 'skip', exists: false, action: 'create', blocked: false },
		{ policy: 'new-version', exists: true, action: 'update', blocked: false },
		{ policy: 'new-version', exists: false, action: 'create', blocked: false },
	] as const)(
		'$policy (exists: $exists) plans $action with blocked=$blocked',
		({ policy, exists, action, blocked }) => {
			expect(decideImportConflictAction(policy, exists)).toEqual({ action, blocked });
		},
	);
});
