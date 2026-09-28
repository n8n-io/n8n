import type { InstanceAiContext } from '../../../types';
import {
	completedSetupSubjects,
	describeSkippedSetup,
	forgetSkippedSetup,
	getSkippedSetupSubjects,
	partitionSkippedSetupRequests,
	rememberSkippedSetup,
	resolveReopenTargets,
	setupSkipSubject,
} from '../setup-skip-state';
import type { SetupRequest } from '../setup-workflow.schema';

const WF = 'wf-1';

function makeRequest(overrides: Partial<SetupRequest> & { name: string }): SetupRequest {
	const { name, ...rest } = overrides;
	return {
		node: { name, type: 'n8n-nodes-base.slack' },
		needsAction: true,
		isTrigger: false,
		...rest,
	} as SetupRequest;
}

/** A card asking for the credential itself. */
function credentialRequest(name: string, credentialType: string): SetupRequest {
	return makeRequest({ name, credentialType, credentialNeedsAction: true });
}

/** A card whose credential is connected and which only needs a parameter filled in. */
function parameterRequest(name: string, credentialType?: string): SetupRequest {
	return makeRequest({
		name,
		...(credentialType ? { credentialType } : {}),
		parameterIssues: {
			documentId: ['Placeholder "SPREADSHEET_ID" — please provide the real value'],
		},
	});
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
	it('keys a credential card off the credential type so sibling nodes stay quiet too', () => {
		expect(setupSkipSubject(credentialRequest('Post to Slack', 'slackApi'), WF)).toBe(
			'cred:slackApi',
		);
	});

	it('keys a parameter-only card off the node, even when the node has a credential type', () => {
		// The user declined to fill in one field, not to use Google Sheets.
		expect(setupSkipSubject(parameterRequest('Log to Sheet', 'googleSheetsOAuth2Api'), WF)).toBe(
			'node:wf-1:Log to Sheet',
		);
	});

	it('scopes a node-keyed skip to its workflow', () => {
		const request = parameterRequest('HTTP Request');

		expect(setupSkipSubject(request, 'wf-1')).not.toBe(setupSkipSubject(request, 'wf-2'));
	});
});

describe('skip bookkeeping', () => {
	it('round-trips a skip through the grant store', async () => {
		const context = createContext();
		const slack = credentialRequest('Post to Slack', 'slackApi');

		await rememberSkippedSetup(context, [slack], WF);
		expect(getSkippedSetupSubjects(context).has('cred:slackApi')).toBe(true);

		await forgetSkippedSetup(context, ['cred:slackApi']);
		expect(getSkippedSetupSubjects(context).has('cred:slackApi')).toBe(false);
	});

	it('ignores unrelated grant keys', () => {
		const context = createContext(['executions:run:wf-1', 'fetch-url:example.com']);

		expect(getSkippedSetupSubjects(context).size).toBe(0);
	});

	it('suppresses every node sharing a skipped credential type', () => {
		const requests = [
			credentialRequest('Post to Slack', 'slackApi'),
			credentialRequest('Alert on Slack', 'slackApi'),
			credentialRequest('Log to Sheet', 'googleSheetsOAuth2Api'),
		];

		const { pending, skippedByUser } = partitionSkippedSetupRequests(
			requests,
			WF,
			new Set(['cred:slackApi']),
		);

		expect(pending.map((r) => r.node.name)).toEqual(['Log to Sheet']);
		expect(skippedByUser.map((r) => r.node.name)).toEqual(['Post to Slack', 'Alert on Slack']);
	});

	it('does not let a skipped parameter card silence a node needing that credential', async () => {
		const context = createContext();
		// Sheets is connected; the user passed on filling in the document id.
		await rememberSkippedSetup(
			context,
			[parameterRequest('Log to Sheet', 'googleSheetsOAuth2Api')],
			WF,
		);

		const { pending } = partitionSkippedSetupRequests(
			[credentialRequest('Read another Sheet', 'googleSheetsOAuth2Api')],
			WF,
			getSkippedSetupSubjects(context),
		);

		expect(pending.map((r) => r.node.name)).toEqual(['Read another Sheet']);
	});

	it('does not let a skip leak into another workflow in the same thread', async () => {
		const context = createContext();
		await rememberSkippedSetup(context, [parameterRequest('HTTP Request')], 'wf-1');

		const { pending } = partitionSkippedSetupRequests(
			[parameterRequest('HTTP Request')],
			'wf-2',
			getSkippedSetupSubjects(context),
		);

		expect(pending.map((r) => r.node.name)).toEqual(['HTTP Request']);
	});

	it('is a no-op in contexts without grant persistence', async () => {
		const context = {} as InstanceAiContext;

		await expect(
			rememberSkippedSetup(context, [credentialRequest('Post to Slack', 'slackApi')], WF),
		).resolves.toBeUndefined();
		expect(getSkippedSetupSubjects(context).size).toBe(0);
	});
});

describe('completedSetupSubjects', () => {
	it('clears the credential skip even though configuring it re-keys the card', async () => {
		const context = createContext();
		await rememberSkippedSetup(context, [credentialRequest('Post to Slack', 'slackApi')], WF);

		// Post-apply the credential resolves, so the same card re-analyses as a parameter card —
		// the subject it was recorded under is no longer the one it computes. Keying off what was
		// applied instead of off the re-analysed state is what makes this land.
		await forgetSkippedSetup(
			context,
			completedSetupSubjects([{ nodeName: 'Post to Slack', credentialType: 'slackApi' }], WF),
		);

		expect(getSkippedSetupSubjects(context).size).toBe(0);
	});

	it('keeps a type-wide skip when only a parameter was completed', async () => {
		// "Alert on Slack" has a working credential and only needed a channel; that says nothing
		// about the Slack credential "Post to Slack" is still waiting on.
		const context = createContext(['workflows:setup-skip:cred:slackApi']);

		await forgetSkippedSetup(context, completedSetupSubjects([{ nodeName: 'Alert on Slack' }], WF));

		expect(getSkippedSetupSubjects(context).has('cred:slackApi')).toBe(true);
	});

	it('clears the completed node own record', async () => {
		const context = createContext(['workflows:setup-skip:node:wf-1:Log to Sheet']);

		await forgetSkippedSetup(context, completedSetupSubjects([{ nodeName: 'Log to Sheet' }], WF));

		expect(getSkippedSetupSubjects(context).size).toBe(0);
	});
});

describe('resolveReopenTargets', () => {
	const requests = [
		credentialRequest('Post to Slack', 'slackApi'),
		parameterRequest('Log to Sheet', 'googleSheetsOAuth2Api'),
	];

	it('matches a credential type case-insensitively', () => {
		const { subjects, unmatched } = resolveReopenTargets(requests, WF, ['SlackApi']);

		expect(subjects).toContain('cred:slackApi');
		expect(unmatched).toEqual([]);
	});

	it('matches a node name', () => {
		const { subjects, unmatched } = resolveReopenTargets(requests, WF, ['Log to Sheet']);

		expect(subjects).toContain('node:wf-1:Log to Sheet');
		expect(unmatched).toEqual([]);
	});

	it('drops the type-wide record when the user names a credential type', () => {
		// Also covers a card re-keyed since the skip — a credential attached outside the panel
		// would otherwise leave the original `cred:` record hiding it.
		const { subjects } = resolveReopenTargets(requests, WF, ['slackApi']);

		expect(subjects).toContain('cred:slackApi');
	});

	it('touches only the named node when the user names a node', () => {
		// Reopening one node must not drag another node's declined credential back into the card.
		const { subjects } = resolveReopenTargets(requests, WF, ['Log to Sheet']);

		expect(subjects).toEqual(['node:wf-1:Log to Sheet']);
	});

	it('reports what it could not match instead of silently leaving the card closed', () => {
		const { subjects, unmatched } = resolveReopenTargets(requests, WF, ['Notion']);

		expect(subjects).toEqual([]);
		expect(unmatched).toEqual(['Notion']);
	});
});

describe('describeSkippedSetup', () => {
	it('names the value the caller passes back to reopen each card', () => {
		expect(
			describeSkippedSetup([
				credentialRequest('Post to Slack', 'slackApi'),
				parameterRequest('Log to Sheet', 'googleSheetsOAuth2Api'),
			]),
		).toEqual([
			{ nodeName: 'Post to Slack', credentialType: 'slackApi', reopenWith: 'slackApi' },
			{
				nodeName: 'Log to Sheet',
				credentialType: 'googleSheetsOAuth2Api',
				// Not the credential type: reopening this asks for the parameter on this node.
				reopenWith: 'Log to Sheet',
			},
		]);
	});
});
