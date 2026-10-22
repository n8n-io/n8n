import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from '../constants';
import { TypeAvailabilityPolicyScope } from '../database/entities/type-availability-policy-scope.entity';
import type { TypeAvailabilityPolicyAttachmentRepository } from '../database/repositories/type-availability-policy-attachment.repository';
import type {
	ScopeFingerprint,
	TypeAvailabilityPolicyScopeRepository,
} from '../database/repositories/type-availability-policy-scope.repository';
import type { PolicyAttachment, PolicyRule } from '../policy-rule.types';
import {
	FINGERPRINT_POLL_INTERVAL_MS,
	TypeAvailabilityPolicySnapshot,
} from '../type-availability-policy-snapshot';

const KIND = NODE_TYPES_KIND;

function makeScope(overrides: Partial<TypeAvailabilityPolicyScope> = {}) {
	return Object.assign(new TypeAvailabilityPolicyScope(), {
		id: 'scope-1',
		kind: KIND,
		projectId: null,
		defaultAction: 'allow',
		version: 1,
		updatedBy: 'user-1',
		...overrides,
	});
}

function makeRule(id: string): PolicyRule {
	return { id, action: 'deny', selector: { kind: 'name', value: `n8n-nodes-base.${id}` } };
}

function makeAttachment(
	policyId: string,
	priority: number,
	isFloor: boolean,
	rules: PolicyRule[] = [makeRule(policyId)],
): PolicyAttachment {
	return { policyId, rules, priority, isFloor };
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const FINGERPRINT: ScopeFingerprint = { count: 1, versionSum: 1, newestCreatedAt: 1000 };

describe('TypeAvailabilityPolicySnapshot', () => {
	let scopeRepository: ReturnType<typeof mock<TypeAvailabilityPolicyScopeRepository>>;
	let attachmentRepository: ReturnType<typeof mock<TypeAvailabilityPolicyAttachmentRepository>>;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let logger: Logger;
	let snapshot: TypeAvailabilityPolicySnapshot;

	function scopedLogger() {
		return logger.scoped('policy');
	}

	function givenScopes(
		scopes: TypeAvailabilityPolicyScope[],
		attachments: Record<string, PolicyAttachment[]> = {},
	) {
		scopeRepository.findAllScopes.mockResolvedValue(scopes);
		attachmentRepository.listAttachmentsForScopes.mockResolvedValue(
			new Map(Object.entries(attachments)),
		);
	}

	beforeEach(() => {
		scopeRepository = mock<TypeAvailabilityPolicyScopeRepository>();
		attachmentRepository = mock<TypeAvailabilityPolicyAttachmentRepository>();
		publisher = mock<Publisher>();
		logger = mockLogger();

		scopeRepository.readFingerprint.mockResolvedValue(FINGERPRINT);
		publisher.publishCommand.mockResolvedValue(undefined);
		givenScopes([]);

		snapshot = new TypeAvailabilityPolicySnapshot(
			scopeRepository,
			attachmentRepository,
			publisher,
			logger,
		);
	});

	afterEach(() => {
		snapshot.stop();
		vi.useRealTimers();
	});

	it('returns null before any load, so callers read the database', () => {
		expect(snapshot.read(KIND, null)).toBeNull();
		expect(snapshot.read(KIND, 'project-1')).toBeNull();
		expect(snapshot.projectScopes(KIND)).toBeNull();
	});

	it('answers reads from memory once loaded, with no repository call', async () => {
		givenScopes([makeScope({ projectId: 'project-1' })]);
		await snapshot.reload();
		vi.clearAllMocks();

		snapshot.read(KIND, null);
		snapshot.read(KIND, 'project-1');
		snapshot.projectScopes(KIND);

		expect(scopeRepository.readFingerprint).not.toHaveBeenCalled();
		expect(scopeRepository.findAllScopes).not.toHaveBeenCalled();
		expect(attachmentRepository.listAttachmentsForScopes).not.toHaveBeenCalled();
	});

	it('reloads on a pubsub request', async () => {
		await snapshot.reload();
		givenScopes([makeScope({ defaultAction: 'deny' })]);

		await snapshot.handleReloadRequest();

		expect(snapshot.read(KIND, null)?.defaultAction).toBe('deny');
	});

	describe('reload', () => {
		it('returns a configured scope with its rules in evaluator order', async () => {
			const scope = makeScope({ id: 'scope-1', defaultAction: 'deny', version: 3 });
			const attachments = [
				makeAttachment('normal-late', 10, false),
				makeAttachment('floor-late', 20, true),
				makeAttachment('normal-early', -5, false),
				makeAttachment('floor-early', 0, true),
			];
			givenScopes([scope], { 'scope-1': attachments });

			await snapshot.reload();

			const policy = snapshot.read(KIND, null);
			expect(policy).toEqual({
				scopeId: 'scope-1',
				kind: KIND,
				projectId: null,
				defaultAction: 'deny',
				version: 3,
				rules: [
					makeRule('floor-early'),
					makeRule('floor-late'),
					makeRule('normal-early'),
					makeRule('normal-late'),
				],
				attachments,
			});
		});

		it('returns allow-all at version 0 for a project with no row', async () => {
			givenScopes([makeScope({ projectId: null, defaultAction: 'deny' })]);

			await snapshot.reload();

			expect(snapshot.read(KIND, 'project-9')).toEqual({
				scopeId: null,
				kind: KIND,
				projectId: 'project-9',
				defaultAction: 'allow',
				version: 0,
				rules: [],
				attachments: [],
			});
		});

		it('does not leak one kind into another', async () => {
			givenScopes([
				makeScope({ id: 'scope-n', kind: KIND, projectId: 'project-1', defaultAction: 'deny' }),
				makeScope({
					id: 'scope-c',
					kind: CREDENTIAL_TYPES_KIND,
					projectId: 'project-1',
					defaultAction: 'allow',
				}),
			]);

			await snapshot.reload();

			expect(snapshot.read(KIND, 'project-1')).toMatchObject({
				scopeId: 'scope-n',
				defaultAction: 'deny',
			});
			expect(snapshot.read(CREDENTIAL_TYPES_KIND, 'project-1')).toMatchObject({
				scopeId: 'scope-c',
				defaultAction: 'allow',
			});
			expect(snapshot.read('other-kind', 'project-1')).toMatchObject({
				scopeId: null,
				kind: 'other-kind',
			});
		});

		it('drops a scope that is gone after a later reload', async () => {
			givenScopes([makeScope({ defaultAction: 'deny' })]);
			await snapshot.reload();
			givenScopes([]);

			await snapshot.reload();

			expect(snapshot.read(KIND, null)).toMatchObject({ scopeId: null, defaultAction: 'allow' });
		});

		it('rejects and keeps the loaded data when a read fails', async () => {
			givenScopes([makeScope({ defaultAction: 'deny', version: 4 })]);
			await snapshot.reload();
			const before = snapshot.read(KIND, null);
			attachmentRepository.listAttachmentsForScopes.mockRejectedValueOnce(new Error('db down'));

			await expect(snapshot.reload()).rejects.toThrow('db down');

			expect(snapshot.read(KIND, null)).toBe(before);
			expect(snapshot.projectScopes(KIND)).not.toBeNull();
		});

		it('stays unloaded when the first load rejects', async () => {
			scopeRepository.findAllScopes.mockRejectedValueOnce(new Error('db down'));

			await expect(snapshot.reload()).rejects.toThrow('db down');

			expect(snapshot.read(KIND, null)).toBeNull();
			expect(snapshot.projectScopes(KIND)).toBeNull();
		});

		it('reads the fingerprint before the scopes', async () => {
			await snapshot.reload();

			expect(scopeRepository.readFingerprint.mock.invocationCallOrder[0]).toBeLessThan(
				scopeRepository.findAllScopes.mock.invocationCallOrder[0],
			);
		});
	});

	describe('projectScopes', () => {
		it('returns only the project scopes of the requested kind', async () => {
			givenScopes([
				makeScope({ id: 'instance-node', kind: KIND, projectId: null }),
				makeScope({ id: 'project-node-1', kind: KIND, projectId: 'project-1' }),
				makeScope({ id: 'project-node-2', kind: KIND, projectId: 'project-2' }),
				makeScope({ id: 'project-cred', kind: CREDENTIAL_TYPES_KIND, projectId: 'project-3' }),
				makeScope({ id: 'instance-cred', kind: CREDENTIAL_TYPES_KIND, projectId: null }),
			]);

			await snapshot.reload();

			const scopes = snapshot.projectScopes(KIND);
			expect(scopes?.map((scope) => scope.scopeId)).toEqual(['project-node-1', 'project-node-2']);
			expect(scopes?.map((scope) => scope.projectId)).toEqual(['project-1', 'project-2']);
			expect(snapshot.projectScopes(CREDENTIAL_TYPES_KIND)?.map((s) => s.scopeId)).toEqual([
				'project-cred',
			]);
		});
	});

	describe('load serialization', () => {
		it('starts exactly one more load for any number of reloads requested during a load', async () => {
			const first = deferred<TypeAvailabilityPolicyScope[]>();
			scopeRepository.findAllScopes
				.mockReturnValueOnce(first.promise)
				.mockResolvedValue([makeScope({ version: 2 })]);

			const running = snapshot.reload();
			await vi.waitFor(() => expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(1));
			const second = snapshot.reload();
			const third = snapshot.reload();
			await Promise.resolve();

			expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(1);

			first.resolve([makeScope({ version: 1 })]);
			await Promise.all([running, second, third]);

			expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(2);
		});

		it('applies the result of the later load last', async () => {
			const first = deferred<TypeAvailabilityPolicyScope[]>();
			scopeRepository.findAllScopes
				.mockReturnValueOnce(first.promise)
				.mockResolvedValue([makeScope({ version: 2 })]);

			const running = snapshot.reload();
			await vi.waitFor(() => expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(1));
			const queued = snapshot.reload();
			first.resolve([makeScope({ version: 1 })]);
			await running;

			await queued;

			expect(snapshot.read(KIND, null)?.version).toBe(2);
		});

		it('runs a queued load after a failed load', async () => {
			const first = deferred<TypeAvailabilityPolicyScope[]>();
			scopeRepository.findAllScopes
				.mockReturnValueOnce(first.promise)
				.mockResolvedValue([makeScope({ version: 2 })]);

			const running = snapshot.reload();
			const failure = expect(running).rejects.toThrow('db down');
			await vi.waitFor(() => expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(1));
			const queued = snapshot.reload();
			first.reject(new Error('db down'));
			await failure;

			await queued;

			expect(snapshot.read(KIND, null)?.version).toBe(2);
		});
	});

	describe('refreshAfterWrite', () => {
		it('reloads, then publishes the reload command', async () => {
			givenScopes([makeScope({ defaultAction: 'deny' })]);

			await snapshot.refreshAfterWrite();

			expect(snapshot.read(KIND, null)?.defaultAction).toBe('deny');
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-type-availability-policies',
			});
			expect(scopeRepository.findAllScopes.mock.invocationCallOrder[0]).toBeLessThan(
				publisher.publishCommand.mock.invocationCallOrder[0],
			);
		});

		it('resolves, logs and still publishes when the load fails', async () => {
			scopeRepository.findAllScopes.mockRejectedValue(new Error('db down'));

			await expect(snapshot.refreshAfterWrite()).resolves.toBeUndefined();

			expect(scopedLogger().error).toHaveBeenCalledWith(
				'Failed to load type availability policies',
				expect.objectContaining({ error: expect.any(Error) }),
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-type-availability-policies',
			});
		});

		it('resolves and logs a warning when publishing rejects', async () => {
			publisher.publishCommand.mockRejectedValue(new Error('redis down'));

			await expect(snapshot.refreshAfterWrite()).resolves.toBeUndefined();
			await vi.waitFor(() =>
				expect(scopedLogger().warn).toHaveBeenCalledWith(
					'Failed to tell other processes to reload type availability policies',
					expect.objectContaining({ error: expect.any(Error) }),
				),
			);
		});
	});

	describe('start and the fingerprint poll', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		async function tick(times = 1) {
			await vi.advanceTimersByTimeAsync(FINGERPRINT_POLL_INTERVAL_MS * times);
		}

		it('resolves when the first load fails', async () => {
			scopeRepository.findAllScopes.mockRejectedValueOnce(new Error('db down'));

			await expect(snapshot.start()).resolves.toBeUndefined();

			expect(snapshot.read(KIND, null)).toBeNull();
			expect(scopedLogger().error).toHaveBeenCalledWith(
				'Failed to load type availability policies',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		it('does not reload when the fingerprint is unchanged', async () => {
			await snapshot.start();

			await tick();

			expect(scopeRepository.readFingerprint).toHaveBeenCalledTimes(2);
			expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(1);
		});

		it.each([
			['scope count', { ...FINGERPRINT, count: 2 }],
			['version sum', { ...FINGERPRINT, versionSum: 2 }],
			// A deleted row replaced by a new one at the same version moves only this.
			['newest creation', { ...FINGERPRINT, newestCreatedAt: 2000 }],
		])('reloads when the %s changed', async (_name, changed) => {
			scopeRepository.readFingerprint.mockResolvedValueOnce(FINGERPRINT).mockResolvedValue(changed);
			await snapshot.start();

			await tick();

			expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(2);
			expect(scopedLogger().info).toHaveBeenCalledWith(
				'Type availability policies changed without a reload message',
			);
		});

		it('reloads on the next tick without a fingerprint check when the first load failed', async () => {
			scopeRepository.findAllScopes.mockRejectedValueOnce(new Error('db down'));
			await snapshot.start();
			expect(scopeRepository.readFingerprint).toHaveBeenCalledTimes(1);

			await tick();

			// One read per load only: the poll itself skips the check while nothing is loaded.
			expect(scopeRepository.findAllScopes).toHaveBeenCalledTimes(2);
			expect(scopeRepository.readFingerprint).toHaveBeenCalledTimes(2);
			expect(snapshot.read(KIND, null)).not.toBeNull();
		});

		it('does nothing on a tick while the previous poll is still waiting', async () => {
			await snapshot.start();
			const slow = deferred<ScopeFingerprint>();
			scopeRepository.readFingerprint.mockReturnValueOnce(slow.promise);

			await tick(3);

			// One load read plus one poll read: the later ticks returned early.
			expect(scopeRepository.readFingerprint).toHaveBeenCalledTimes(2);

			slow.resolve(FINGERPRINT);
			await tick();

			expect(scopeRepository.readFingerprint).toHaveBeenCalledTimes(3);
		});

		it('stops polling after stop', async () => {
			await snapshot.start();

			snapshot.stop();
			await tick(3);

			expect(scopeRepository.readFingerprint).toHaveBeenCalledTimes(1);
		});
	});

	describe('pubsub registration', () => {
		function handlersFor(eventName: string) {
			return Container.get(PubSubMetadata)
				.getHandlers()
				.filter(
					({ eventName: name, eventHandlerClass }) =>
						name === eventName && eventHandlerClass.name === 'TypeAvailabilityPolicySnapshot',
				);
		}

		it.each(['reload-type-availability-policies', 'pubsub-reconnected'])(
			'registers handleReloadRequest for %s',
			(eventName) => {
				const handlers = handlersFor(eventName);

				// No instance filter: workers enforce too, so they must reload.
				expect(handlers.map(({ methodName, filter }) => ({ methodName, filter }))).toEqual([
					{ methodName: 'handleReloadRequest', filter: undefined },
				]);
			},
		);
	});
});
