import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import type { INode, IUser } from 'n8n-workflow';

import { generateChatUserAuthToken, verifyChatUserAuthToken } from '../auth-token';

const SECRET = 'test-hmac-secret';

const node = (overrides: Partial<INode> = {}) =>
	({
		id: 'node-1',
		name: 'When chat message received',
		type: '@n8n/n8n-nodes-langchain.chatTrigger',
		typeVersion: 1.4,
		webhookId: 'webhook-1',
		position: [0, 0],
		parameters: {},
		...overrides,
	}) as INode;

const visitor: IUser = {
	id: 'user-1',
	email: 'visitor@example.com',
	firstName: 'Vi',
	lastName: 'Sitor',
};

describe('chat user auth token', () => {
	beforeEach(() => {
		vi.mocked(Container.get).mockReturnValue({ hmacSignatureSecret: SECRET } as never);
	});

	it('round-trips the visitor', () => {
		const token = generateChatUserAuthToken(node(), visitor);

		expect(verifyChatUserAuthToken(token, node())).toEqual(visitor);
	});

	it('rejects a token signed with another secret', () => {
		const token = jwt.sign(
			{ ...visitor, sub: visitor.id, nid: 'node-1', wid: 'webhook-1' },
			'other-secret',
			{ algorithm: 'HS256' },
		);

		expect(verifyChatUserAuthToken(token, node())).toBeNull();
	});

	it('rejects garbage', () => {
		expect(verifyChatUserAuthToken('not-a-token', node())).toBeNull();
	});

	it('rejects an expired token', () => {
		const token = jwt.sign(
			{ ...visitor, sub: visitor.id, nid: 'node-1', wid: 'webhook-1' },
			SECRET,
			{ algorithm: 'HS256', expiresIn: -1 },
		);

		expect(verifyChatUserAuthToken(token, node())).toBeNull();
	});

	// The `nid`/`wid` claims are what stop a token minted for one chat from being
	// replayed against another chat on the same instance.
	it('rejects a token minted for a different node', () => {
		const token = generateChatUserAuthToken(node(), visitor);

		expect(verifyChatUserAuthToken(token, node({ id: 'node-2' }))).toBeNull();
	});

	it('rejects a token minted for a different webhook', () => {
		const token = generateChatUserAuthToken(node(), visitor);

		expect(verifyChatUserAuthToken(token, node({ webhookId: 'webhook-2' }))).toBeNull();
	});

	it('rejects a token missing the expected claims', () => {
		const token = jwt.sign({ sub: visitor.id }, SECRET, { algorithm: 'HS256' });

		expect(verifyChatUserAuthToken(token, node())).toBeNull();
	});
});
