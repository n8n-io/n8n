import type { InstanceAiContext } from '../../../types';
import {
	forgetSkippedSetup,
	getSkippedSetupSubjects,
	partitionSkippedSetupRequests,
	rememberSkippedSetup,
	setupSkipSubject,
} from '../setup-skip-state';
import type { SetupRequest } from '../setup-workflow.schema';

function makeRequest(overrides: Partial<SetupRequest> & { name: string }): SetupRequest {
	const { name, ...rest } = overrides;
	return {
		node: { name, type: 'n8n-nodes-base.slack' },
		needsAction: true,
		isTrigger: false,
		...rest,
	} as SetupRequest;
}

/** Mirrors the service wiring: one mutable set, read and written through the context. */
function createContext(granted: string[] = []) {
	const sessionApprovedToolKeys = new Set(granted);
	return {
		sessionApprovedToolKeys,
		grantSessionToolApproval: async (key: string) => {
			await Promise.resolve();
			sessionApprovedToolKeys.add(key);
		},
		revokeSessionToolApproval: async (key: string) => {
			await Promise.resolve();
			sessionApprovedToolKeys.delete(key);
		},
	} as unknown as InstanceAiContext;
}

describe('setupSkipSubject', () => {
	it('keys off the credential type so sibling nodes stay quiet too', () => {
		expect(
			setupSkipSubject(makeRequest({ name: 'Post to Slack', credentialType: 'slackApi' })),
		).toBe('slackApi');
	});

	it('falls back to the node name when there is no credential to generalise', () => {
		expect(setupSkipSubject(makeRequest({ name: 'Wait for Form' }))).toBe('Wait for Form');
	});
});

describe('skip bookkeeping', () => {
	it('round-trips a skip through the grant store', async () => {
		const context = createContext();
		const slack = makeRequest({ name: 'Post to Slack', credentialType: 'slackApi' });

		await rememberSkippedSetup(context, [slack]);
		expect(getSkippedSetupSubjects(context).has('slackApi')).toBe(true);

		await forgetSkippedSetup(context, ['slackApi']);
		expect(getSkippedSetupSubjects(context).has('slackApi')).toBe(false);
	});

	it('ignores unrelated grant keys', () => {
		const context = createContext(['executions:run:wf-1', 'fetch-url:example.com']);

		expect(getSkippedSetupSubjects(context).size).toBe(0);
	});

	it('suppresses every node sharing a skipped credential type', () => {
		const requests = [
			makeRequest({ name: 'Post to Slack', credentialType: 'slackApi' }),
			makeRequest({ name: 'Alert on Slack', credentialType: 'slackApi' }),
			makeRequest({ name: 'Log to Sheet', credentialType: 'googleSheetsOAuth2Api' }),
		];

		const { pending, skippedByUser } = partitionSkippedSetupRequests(
			requests,
			new Set(['slackApi']),
		);

		expect(pending.map((r) => r.node.name)).toEqual(['Log to Sheet']);
		expect(skippedByUser.map((r) => r.node.name)).toEqual(['Post to Slack', 'Alert on Slack']);
	});

	it('is a no-op in contexts without grant persistence', async () => {
		const context = {} as InstanceAiContext;

		await expect(
			rememberSkippedSetup(context, [makeRequest({ name: 'Post to Slack' })]),
		).resolves.toBeUndefined();
		expect(getSkippedSetupSubjects(context).size).toBe(0);
	});
});
