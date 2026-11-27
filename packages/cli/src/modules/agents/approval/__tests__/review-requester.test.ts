import type { JSONObject } from '@n8n/agents';
import { Person } from '@n8n/db';

import {
	encodeReviewRequester,
	readReviewRequester,
	reviewRequesterForUser,
} from '../review-requester';

describe('review requester', () => {
	it('uses the account name and omits it when only an email is available', () => {
		const user = Object.assign(new Person(), {
			id: 'user-1',
			firstName: 'Alex',
			lastName: 'Example',
			email: 'alex@example.com',
		});
		expect(reviewRequesterForUser(user, 'preview')).toEqual({
			id: 'user-1',
			name: 'Alex Example',
			source: 'preview',
		});
		user.firstName = '';
		user.lastName = '';
		expect(reviewRequesterForUser(user, 'n8n_chat')).toEqual({ id: 'user-1', source: 'n8n_chat' });
	});

	it('keeps the requester when another sender supplies a resume context', () => {
		const requester = { id: 'U1', name: 'Alex Example', source: 'slack' };
		const checkpoint = encodeReviewRequester(requester);
		requester.id = 'U2';
		const persistence = {
			threadId: 'thread',
			resourceId: 'resource',
			hostMetadata: { ...checkpoint, n8nIntegrationMessageContext: { interactingUserId: 'U3' } },
		};
		expect(readReviewRequester(persistence)).toEqual({
			id: 'U1',
			name: 'Alex Example',
			source: 'slack',
		});
	});

	it.each<JSONObject>([
		encodeReviewRequester(undefined),
		{ n8nAgentReviewRequester: { id: 'U1' } },
		{ n8nAgentReviewRequester: { id: '', source: 'slack' } },
	])('omits unavailable requester metadata: %j', (hostMetadata) => {
		expect(
			readReviewRequester({ threadId: 'thread', resourceId: 'resource', hostMetadata }),
		).toBeUndefined();
	});
});
