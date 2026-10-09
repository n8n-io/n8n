import type {
	LinkedInstancePushResult,
	LinkedInstanceSummary,
	LinkedInstanceTransferPreflight,
} from '@n8n/api-types';

export function linkedInstance(
	overrides: Partial<LinkedInstanceSummary> = {},
): LinkedInstanceSummary {
	return {
		id: 'link-1',
		name: 'Acme Cloud',
		baseUrl: 'https://acme.app.n8n.cloud',
		status: 'online',
		lastVerifiedAt: '2026-10-01T10:00:00.000Z',
		createdAt: '2026-10-01T09:00:00.000Z',
		defaultRemoteProject: { id: 'project-1', name: 'Automations' },
		...overrides,
	};
}

/** A fake token, made at run time, so no test holds a string that looks like a real secret. */
export function fakeToken(): string {
	return `tok-${crypto.randomUUID()}`;
}

export function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (reason: unknown) => void = () => {};
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve;
		reject = onReject;
	});
	return { promise, resolve, reject };
}

export function transferPreflight(
	overrides: Partial<LinkedInstanceTransferPreflight> = {},
): LinkedInstanceTransferPreflight {
	return {
		workflowName: 'Daily report',
		moves: { nodes: 4 },
		nodeTypeCheck: 'unknown',
		missingNodeTypes: [],
		credentials: [],
		targetProject: { id: 'project-1', name: 'Automations' },
		subWorkflowCalls: [],
		...overrides,
	};
}

export function pushResult(
	overrides: Partial<LinkedInstancePushResult> = {},
): LinkedInstancePushResult {
	return {
		remoteWorkflowId: 'remote-wf-1',
		remoteUrl: 'https://acme.app.n8n.cloud/workflow/remote-wf-1',
		targetProject: { id: 'project-1', name: 'Automations' },
		created: true,
		published: false,
		publishFailed: false,
		credentialsNeedingSetup: [],
		missingNodeTypes: [],
		localDeactivated: false,
		warnings: [],
		...overrides,
	};
}
