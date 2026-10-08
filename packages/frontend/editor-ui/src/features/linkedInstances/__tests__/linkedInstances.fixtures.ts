import type { LinkedInstanceSummary } from '@n8n/api-types';

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
