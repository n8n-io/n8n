import { describe, expect, it } from 'vitest';

import { threadTargetsSubject, type InstanceAiEmbedSubject } from '../instanceAiEmbed.types';

const agentSubject: InstanceAiEmbedSubject = { type: 'agent', id: 'agent-1', projectId: 'p1' };
const appSubject: InstanceAiEmbedSubject = { type: 'app', id: 'app-1', projectId: 'p1' };

describe('threadTargetsSubject', () => {
	it('matches the thread bound target', () => {
		const metadata = { instanceAiAgentBuilderTarget: { agentId: 'agent-1', projectId: 'p1' } };
		expect(threadTargetsSubject(metadata, agentSubject)).toBe(true);
	});

	it('matches the thread pending target', () => {
		const metadata = { instanceAiPendingAgentTarget: { agentId: 'agent-1', projectId: 'p1' } };
		expect(threadTargetsSubject(metadata, agentSubject)).toBe(true);
	});

	it('matches any entry of the target registry', () => {
		const metadata = {
			instanceAiAgentBuilderTargets: {
				billing: { agentId: 'agent-2', projectId: 'p1', ref: 'billing' },
				support: { agentId: 'agent-1', projectId: 'p1', ref: 'support' },
			},
		};
		expect(threadTargetsSubject(metadata, agentSubject)).toBe(true);
	});

	it('does not match a different agent', () => {
		const metadata = { instanceAiAgentBuilderTarget: { agentId: 'agent-2', projectId: 'p1' } };
		expect(threadTargetsSubject(metadata, agentSubject)).toBe(false);
	});

	it('does not match undefined or malformed metadata', () => {
		expect(threadTargetsSubject(undefined, agentSubject)).toBe(false);
		expect(
			threadTargetsSubject({ instanceAiAgentBuilderTargets: 'not-a-record' }, agentSubject),
		).toBe(false);
	});

	it('matches an app in the thread target list', () => {
		const metadata = {
			instanceAiAppTargets: [
				{ appId: 'app-2', projectId: 'p1' },
				{ appId: 'app-1', projectId: 'p1' },
			],
		};
		expect(threadTargetsSubject(metadata, appSubject)).toBe(true);
	});

	it('matches a pending app target', () => {
		const metadata = { instanceAiPendingAppTarget: { appId: 'app-1', projectId: 'p1' } };
		expect(threadTargetsSubject(metadata, appSubject)).toBe(true);
	});

	it('does not match a different app or malformed app targets', () => {
		expect(
			threadTargetsSubject(
				{ instanceAiAppTargets: [{ appId: 'app-2', projectId: 'p1' }] },
				appSubject,
			),
		).toBe(false);
		expect(threadTargetsSubject({ instanceAiAppTargets: 'not-an-array' }, appSubject)).toBe(false);
	});

	it('always returns false for a workflow subject', () => {
		const metadata = { instanceAiAgentBuilderTarget: { agentId: 'agent-1', projectId: 'p1' } };
		expect(
			threadTargetsSubject(metadata, { type: 'workflow', id: 'agent-1', projectId: 'p1' }),
		).toBe(false);
	});
});
