import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import {
	agentRunSecurityContext,
	forAgentRun,
	isAgentRun,
	onBehalfOfParent,
} from '../agent-run-security';

const role = mock<User['role']>();
const account = mock<User>({ id: 'parent-account', kind: 'service', role });
const subAgent = mock<User>({ id: 'sub-agent-account', kind: 'service', role });

describe('agent run security context', () => {
	it('makes the agent account the subject', () => {
		const security = agentRunSecurityContext(account);

		expect(security).toEqual({
			subject: { id: 'parent-account', type: 'service', role },
			authMethod: 'agent-run',
		});
		expect(isAgentRun(security)).toBe(true);
	});

	it('names the run as the sub-identity of the account', () => {
		const security = forAgentRun(agentRunSecurityContext(account), 'run-1');

		expect(security.subject.id).toBe('parent-account');
		expect(security.subIdentityId).toBe('run-1');
		expect(security.actor).toBeUndefined();
	});

	it('keeps the parent as the subject and makes the sub-agent the actor', () => {
		const security = onBehalfOfParent(agentRunSecurityContext(account), subAgent);

		expect(security.subject.id).toBe('parent-account');
		expect(security.actor?.id).toBe('sub-agent-account');
	});

	it('does not treat another context as an agent run', () => {
		expect(isAgentRun(undefined)).toBe(false);
		expect(
			isAgentRun({
				subject: { id: 'user-1', type: 'person', role },
				authMethod: 'session-cookie',
			}),
		).toBe(false);
	});
});
