import { ALL_SCOPES, type Scope } from '@n8n/permissions';
import fc from 'fast-check';

import { canApprove, canRead, canSend, type ThreadAccessFacts } from '../thread-access';

const READ_SCOPES: Scope[] = ['instanceAi:message', 'project:read'];

const userId = fc.string({ minLength: 1, maxLength: 12 });
const scopeList = fc.subarray([...ALL_SCOPES]);
const thread = fc.record<ThreadAccessFacts>({
	ownerId: fc.option(userId, { nil: null }),
	accessScope: fc.constantFrom('user', 'project'),
});

/** A user, and a thread that this user does not own. */
const strangerAndThread = fc
	.tuple(userId, thread)
	.filter(([id, facts]) => facts.ownerId !== id)
	.map(([id, facts]) => ({ user: { id }, thread: facts }));

describe('thread access properties', () => {
	it('a user who does not own the thread never sends', () => {
		fc.assert(
			fc.property(strangerAndThread, ({ user, thread: facts }) => {
				expect(canSend(user, facts)).toBe(false);
			}),
		);
	});

	it('a non-member never reads another user thread', () => {
		const withoutReadScopes = scopeList.filter(
			(scopes) => !READ_SCOPES.every((scope) => scopes.includes(scope)),
		);
		fc.assert(
			fc.property(strangerAndThread, withoutReadScopes, ({ user, thread: facts }, scopes) => {
				expect(canRead(user, facts, scopes)).toBe(false);
			}),
		);
	});

	it('nobody but the owner reads a private thread, whatever the scopes', () => {
		fc.assert(
			fc.property(strangerAndThread, scopeList, ({ user, thread: facts }, scopes) => {
				expect(canRead(user, { ...facts, accessScope: 'user' }, scopes)).toBe(false);
			}),
		);
	});

	it('approving needs every required scope and the right to read', () => {
		fc.assert(
			fc.property(
				strangerAndThread,
				scopeList,
				scopeList,
				({ user, thread: facts }, required, held) => {
					const approves = canApprove(user, facts, required, held);
					const holdsAll = required.length > 0 && required.every((scope) => held.includes(scope));
					expect(approves).toBe(holdsAll && canRead(user, facts, held));
				},
			),
		);
	});

	it('the owner reads, sends and approves whatever the scopes', () => {
		const scopes = fc.constantFrom<ThreadAccessFacts['accessScope']>('user', 'project');
		fc.assert(
			fc.property(userId, scopes, scopeList, (id, scope, held) => {
				const owned: ThreadAccessFacts = { ownerId: id, accessScope: scope };
				expect(canRead({ id }, owned, held)).toBe(true);
				expect(canSend({ id }, owned)).toBe(true);
				expect(canApprove({ id }, owned, ['workflow:update'], held)).toBe(true);
			}),
		);
	});
});
