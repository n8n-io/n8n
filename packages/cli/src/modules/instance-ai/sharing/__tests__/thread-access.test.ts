import type { Scope } from '@n8n/permissions';

import {
	canApprove,
	canRead,
	canReadSharedThreads,
	canSend,
	canShare,
	isThreadOwner,
	type ThreadAccessFacts,
} from '../thread-access';

const owner = { id: 'owner-1' };
const teammate = { id: 'teammate-1' };

const privateThread: ThreadAccessFacts = { ownerId: owner.id, accessScope: 'user' };
const sharedThread: ThreadAccessFacts = { ownerId: owner.id, accessScope: 'project' };
/** A project thread without an owner, such as a chat integration thread. */
const integrationThread: ThreadAccessFacts = { ownerId: null, accessScope: 'project' };

const READER: Scope[] = ['instanceAi:message', 'project:read'];
const EDITOR: Scope[] = [...READER, 'workflow:update', 'workflow:publish'];

describe('isThreadOwner', () => {
	it('is true only for the user stored as owner', () => {
		expect(isThreadOwner(owner, privateThread)).toBe(true);
		expect(isThreadOwner(owner, sharedThread)).toBe(true);
		expect(isThreadOwner(teammate, sharedThread)).toBe(false);
	});

	it('is false for a thread without an owner, also for an empty user id', () => {
		expect(isThreadOwner({ id: '' }, integrationThread)).toBe(false);
		expect(isThreadOwner(owner, integrationThread)).toBe(false);
	});
});

describe('canReadSharedThreads', () => {
	it('needs both the Assistant scope and project read', () => {
		expect(canReadSharedThreads(READER)).toBe(true);
		expect(canReadSharedThreads(['project:read'])).toBe(false);
		expect(canReadSharedThreads(['instanceAi:message'])).toBe(false);
		expect(canReadSharedThreads([])).toBe(false);
	});
});

describe('canRead', () => {
	it('lets the owner read a private or shared thread without project scopes', () => {
		expect(canRead(owner, privateThread, [])).toBe(true);
		expect(canRead(owner, sharedThread, [])).toBe(true);
	});

	it('lets a member with the read scopes read a shared thread', () => {
		expect(canRead(teammate, sharedThread, READER)).toBe(true);
	});

	it('does not let a member read a private thread of another user', () => {
		expect(canRead(teammate, privateThread, EDITOR)).toBe(false);
	});

	it('does not treat a project thread without an owner as shared', () => {
		expect(canRead(teammate, integrationThread, EDITOR)).toBe(false);
	});

	it.each<[string, Scope[]]>([
		['no scopes', []],
		['only project read', ['project:read']],
		['only the Assistant scope', ['instanceAi:message']],
		['a chat user role', ['agent:execute', 'workflow:execute-chat', 'instanceAi:message']],
	])('does not let a member with %s read a shared thread', (_label, scopes) => {
		expect(canRead(teammate, sharedThread, scopes)).toBe(false);
	});
});

describe('canSend', () => {
	it('lets only the owner send, also after a share', () => {
		expect(canSend(owner, privateThread)).toBe(true);
		expect(canSend(owner, sharedThread)).toBe(true);
		expect(canSend(teammate, sharedThread)).toBe(false);
		expect(canSend(teammate, integrationThread)).toBe(false);
	});
});

describe('canShare', () => {
	it('lets the owner share into a project where the owner can read shared threads', () => {
		expect(canShare(owner, privateThread, READER)).toBe(true);
		expect(canShare(owner, sharedThread, READER)).toBe(true);
	});

	it('refuses the owner without the read scopes in the project', () => {
		expect(canShare(owner, privateThread, ['instanceAi:message'])).toBe(false);
	});

	it('refuses a user who does not own the thread', () => {
		expect(canShare(teammate, sharedThread, EDITOR)).toBe(false);
	});
});

describe('canApprove', () => {
	const UPDATE: Scope[] = ['workflow:update'];
	const UPDATE_AND_PUBLISH: Scope[] = ['workflow:update', 'workflow:publish'];

	it('lets the owner answer every card without project scopes', () => {
		expect(canApprove(owner, sharedThread, UPDATE_AND_PUBLISH, [])).toBe(true);
		expect(canApprove(owner, privateThread, [], [])).toBe(true);
	});

	it('lets an editor answer a card that needs the scopes the editor holds', () => {
		expect(canApprove(teammate, sharedThread, UPDATE, EDITOR)).toBe(true);
		expect(canApprove(teammate, sharedThread, UPDATE_AND_PUBLISH, EDITOR)).toBe(true);
	});

	it('refuses a member who holds only some of the required scopes', () => {
		const updateOnly: Scope[] = [...READER, 'workflow:update'];
		expect(canApprove(teammate, sharedThread, UPDATE_AND_PUBLISH, updateOnly)).toBe(false);
	});

	it('refuses a viewer', () => {
		expect(canApprove(teammate, sharedThread, UPDATE, READER)).toBe(false);
	});

	it('refuses a member who has the action scopes but cannot read the thread', () => {
		expect(canApprove(teammate, sharedThread, UPDATE, ['workflow:update'])).toBe(false);
	});

	it('refuses a member on a private thread of another user', () => {
		expect(canApprove(teammate, privateThread, UPDATE, EDITOR)).toBe(false);
	});

	it('lets no reader answer a card that names no scopes', () => {
		expect(canApprove(teammate, sharedThread, [], EDITOR)).toBe(false);
	});
});
