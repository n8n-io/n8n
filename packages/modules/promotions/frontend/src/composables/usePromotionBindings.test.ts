import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { promotionBindingKey, usePromotionBindings } from './usePromotionBindings';
import {
	applied,
	blocked,
	consumers,
	credential,
	savedCredential,
	variable,
} from '../__tests__/bindings.fixtures';
import type { CreatedPromotionBinding, MissingPromotionBinding } from '../promotions.types';

const statuses = (session: ReturnType<typeof usePromotionBindings>) =>
	Object.fromEntries(session.rows.value.map(({ key, status }) => [key, status]));

it('resolves shared credentials once and keeps variable scopes separate', async () => {
	const projectVariable: Extract<MissingPromotionBinding, { kind: 'variable' }> = {
		...variable,
		scope: { kind: 'project', project: consumers[0].project },
	};
	const session = usePromotionBindings();
	session.start(blocked({ missingBindings: [credential, variable, projectVariable] }));
	const create = vi.fn().mockResolvedValue(savedCredential);
	await session.createBinding(promotionBindingKey(credential), create);
	expect(create.mock.calls[0][0]).toBe(credential);
	await session.createBinding(promotionBindingKey(projectVariable), async () => ({
		kind: 'variable',
		id: 'var-1',
		name: variable.name,
		scope: projectVariable.scope,
	}));
	expect(statuses(session)).toEqual({
		[promotionBindingKey(credential)]: 'resolved',
		[promotionBindingKey(variable)]: 'missing',
		[promotionBindingKey(projectVariable)]: 'resolved',
	});
});

it.each([
	['cancelled', null],
	['wrong source ID', { ...savedCredential, sourceId: 'other' }],
	['wrong saved ID', { ...savedCredential, id: 'other' }],
	['wrong owner', { ...savedCredential, projectId: 'team-a' }],
	['wrong type', { ...savedCredential, credentialType: 'other' }],
] as const)('keeps a credential unresolved when creation returns %s', async (_label, result) => {
	const session = usePromotionBindings();
	session.start(blocked());
	await session.createBinding(promotionBindingKey(credential), async () => result);
	expect(statuses(session)[promotionBindingKey(credential)]).toBe('missing');
});

it('keeps global variables unresolved after a project variable is saved', async () => {
	const session = usePromotionBindings();
	session.start(blocked({ missingBindings: [variable] }));
	await session.createBinding(promotionBindingKey(variable), async () => ({
		kind: 'variable',
		name: variable.name,
		id: 'var-id',
		scope: { kind: 'project', project: consumers[0].project },
	}));
	expect(session.error.value).toEqual({ kind: 'creationMismatch' });
	expect(statuses(session)[promotionBindingKey(variable)]).toBe('missing');
});

it('guards creation while the editor is open and recovers after failure', async () => {
	const pending = createDeferredPromise<CreatedPromotionBinding | null>();
	const session = usePromotionBindings();
	session.start(blocked());
	const create = vi.fn().mockReturnValue(pending.promise);
	const first = session.createBinding(promotionBindingKey(credential), create);
	await session.createBinding(promotionBindingKey(credential), create);
	expect(create).toHaveBeenCalledTimes(1);
	expect(session.isBusy.value).toBe(true);
	pending.reject(new Error('Save failed'));
	await first;
	expect(session.error.value).toBeNull();
	expect(session.isBusy.value).toBe(false);
	expect(statuses(session)[promotionBindingKey(credential)]).toBe('missing');
});

it('keeps created bindings resolved when a later check of the same commit comes in', async () => {
	const session = usePromotionBindings();
	session.start(blocked({ missingBindings: [credential, variable] }));
	await session.createBinding(promotionBindingKey(credential), async () => savedCredential);
	const next = blocked({ missingBindings: [variable], warnings: applied.warnings });
	session.reconcile(next);
	expect(session.check.value).toBe(next.check);
	expect(statuses(session)).toEqual({
		[promotionBindingKey(credential)]: 'resolved',
		[promotionBindingKey(variable)]: 'missing',
	});
});

it('ignores an editor result from a closed session', async () => {
	const pending = createDeferredPromise<CreatedPromotionBinding | null>();
	const session = usePromotionBindings();
	session.start(blocked());
	const creating = session.createBinding(
		promotionBindingKey(credential),
		async () => await pending.promise,
	);
	session.end();
	session.start(blocked());
	pending.resolve(savedCredential);
	await creating;
	expect(statuses(session)[promotionBindingKey(credential)]).toBe('missing');
});
