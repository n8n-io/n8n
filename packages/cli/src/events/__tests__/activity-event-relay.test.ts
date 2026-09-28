import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type {
	ActivityEventRepository,
	WorkflowHistory,
	IWorkflowDb,
	Project,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
import type { PostHogClient } from '@/posthog';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

const user = {
	id: 'user1',
	email: 'jane@n8n.io',
	firstName: 'Jane',
	lastName: 'Smith',
	role: { slug: 'global:owner' },
};

const node = (type: string, name = type): INode =>
	mock<INode>({ name, type, typeVersion: 1, position: [0, 0], parameters: {} });

const workflowWith = (nodes: INode[], name = 'Lead enrichment') =>
	mock<IWorkflowDb>({ id: 'workflow1', name, nodes });

describe('ActivityEventRelay', () => {
	const activityEventRepository = mock<ActivityEventRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const scopedLogger = mock<Logger>();
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	let eventService: EventService;
	let postHogClient: MockProxy<PostHogClient>;

	const relayWith = ({
		rolloutFlag = false,
		diagnostics = true,
		flagOverride,
	}: {
		rolloutFlag?: boolean;
		diagnostics?: boolean;
		flagOverride?: boolean | { value: boolean };
	} = {}) => {
		const overrideValue = typeof flagOverride === 'object' ? flagOverride.value : flagOverride;
		postHogClient.getFeatureFlagForInstance.mockResolvedValue(overrideValue ?? rolloutFlag);

		const relay = new ActivityEventRelay(
			eventService,
			activityEventRepository,
			sharedWorkflowRepository,
			sharedCredentialsRepository,
			mock<GlobalConfig>({
				diagnostics: { enabled: diagnostics },
				featureFlags: {
					override:
						flagOverride === undefined ? {} : { '114_instance_activity_context': flagOverride },
				},
			}),
			postHogClient,
			logger,
		);
		relay.init();
		return relay;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		postHogClient = mock<PostHogClient>();
		eventService = new EventService();
		// Every event whose resource still exists resolves its project through one of these.
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
			mock<Project>({ id: 'project1' }),
		);
		sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(
			mock<Project>({ id: 'project1' }),
		);
	});

	describe('the write gate', () => {
		const emitDeletion = async (actingUser = user) => {
			eventService.emit('workflow-deleted', {
				user: actingUser,
				workflowId: 'workflow1',
				workflowName: 'Lead enrichment',
				projectId: 'project1',
				publicApi: false,
			});
			await flushPromises();
		};

		it('records when the instance rollout is on', async () => {
			relayWith({ rolloutFlag: true });

			await emitDeletion();

			expect(activityEventRepository.record).toHaveBeenCalled();
		});

		it('records when the override is on and the rollout is off', async () => {
			relayWith({ rolloutFlag: false, flagOverride: true });

			await emitDeletion();

			expect(activityEventRepository.record).toHaveBeenCalled();
		});

		it('records nothing when neither control is on', async () => {
			relayWith({ rolloutFlag: false });

			await emitDeletion();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
		});

		it('checks the instance once for a burst of events', async () => {
			relayWith({ rolloutFlag: true });

			eventService.emit('workflow-created', {
				user,
				workflow: workflowWith([]),
				publicApi: false,
				projectId: 'project1',
				projectType: 'personal',
			});
			eventService.emit('workflow-saved', {
				user,
				workflow: workflowWith([]),
				publicApi: false,
			});
			await emitDeletion();

			expect(postHogClient.getFeatureFlagForInstance).toHaveBeenCalledTimes(1);
			expect(activityEventRepository.record).toHaveBeenCalledTimes(3);
		});

		it('uses one instance answer for two users', async () => {
			relayWith({ rolloutFlag: true });
			const secondUser = { ...user, id: 'user2', email: 'john@n8n.io' };

			eventService.emit('workflow-deleted', {
				user,
				workflowId: 'workflow1',
				workflowName: 'Lead enrichment',
				projectId: 'project1',
				publicApi: false,
			});
			await emitDeletion(secondUser);

			expect(postHogClient.getFeatureFlagForInstance).toHaveBeenCalledTimes(1);
			expect(activityEventRepository.record).toHaveBeenCalledTimes(2);
		});

		it('records nothing when the instance flag cannot be read', async () => {
			relayWith({ rolloutFlag: true });
			postHogClient.getFeatureFlagForInstance.mockRejectedValue(new Error('PostHog failed'));

			await emitDeletion();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
		});

		it('lets an explicit override disable recording while the rollout is on', async () => {
			relayWith({ rolloutFlag: true, flagOverride: false });

			await emitDeletion();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
		});

		it('registers listeners when an explicit flag override is the only control set', async () => {
			const onSpy = vi.spyOn(eventService, 'on');

			relayWith({ diagnostics: false, flagOverride: true });

			expect(onSpy).toHaveBeenCalled();
		});

		it('registers no listeners without an override when diagnostics are off', async () => {
			const onSpy = vi.spyOn(eventService, 'on');

			relayWith({ diagnostics: false });

			expect(onSpy).not.toHaveBeenCalled();

			await emitDeletion();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
		});

		it('registers no listeners when the flag is overridden off', async () => {
			const onSpy = vi.spyOn(eventService, 'on');

			relayWith({ diagnostics: false, flagOverride: false });

			expect(onSpy).not.toHaveBeenCalled();
		});

		it('registers listeners for an override that holds its value in an object', async () => {
			const onSpy = vi.spyOn(eventService, 'on');

			relayWith({ diagnostics: false, flagOverride: { value: true } });

			expect(onSpy).toHaveBeenCalled();
		});
	});

	describe('the events it records', () => {
		type Case = [
			name: string,
			emit: (service: EventService) => void,
			expected: Record<string, unknown>,
		];

		const cases: Case[] = [
			[
				'workflow-created',
				(s) =>
					s.emit('workflow-created', {
						user,
						workflow: workflowWith([node('n8n-nodes-base.slack')]),
						publicApi: false,
						projectId: 'project1',
						projectType: 'team',
						source: 'n8n-ai',
					}),
				{
					category: 'workflow',
					action: 'created',
					resourceId: 'workflow1',
					resourceName: 'Lead enrichment',
					data: { source: 'n8n-ai', nodeCount: 1 },
				},
			],
			[
				'workflow-saved',
				(s) =>
					s.emit('workflow-saved', {
						user,
						workflow: workflowWith([node('n8n-nodes-base.slack')]),
						publicApi: false,
						source: 'ui',
					}),
				{ category: 'workflow', action: 'saved', resourceId: 'workflow1' },
			],
			[
				'workflow-activated',
				(s) =>
					s.emit('workflow-activated', {
						user,
						workflowId: 'workflow1',
						workflow: mock<IWorkflowDb>({
							id: 'workflow1',
							name: 'Lead enrichment',
							nodes: [],
							activeVersion: mock<WorkflowHistory>({ name: 'Adds retry on the HTTP node' }),
						}),
						publicApi: false,
					}),
				{
					category: 'workflow',
					action: 'published',
					resourceName: 'Lead enrichment',
					data: { versionName: 'Adds retry on the HTTP node' },
				},
			],
			[
				'workflow-deactivated',
				(s) =>
					s.emit('workflow-deactivated', {
						user,
						workflowId: 'workflow1',
						workflow: workflowWith([]),
						publicApi: false,
						deactivatedVersionId: 'version1',
					}),
				{ category: 'workflow', action: 'unpublished', resourceName: 'Lead enrichment' },
			],
			[
				'workflow-archived',
				(s) => s.emit('workflow-archived', { user, workflowId: 'workflow1', publicApi: false }),
				// Neither event carries a name, and the workflow still exists, so a reader resolves one.
				{ category: 'workflow', action: 'archived' },
			],
			[
				'workflow-unarchived',
				(s) => s.emit('workflow-unarchived', { user, workflowId: 'workflow1', publicApi: false }),
				{ category: 'workflow', action: 'unarchived' },
			],
			[
				'workflow-deleted',
				(s) =>
					s.emit('workflow-deleted', {
						user,
						workflowId: 'workflow1',
						workflowName: 'Lead enrichment',
						projectId: 'project1',
						publicApi: false,
					}),
				{ category: 'workflow', action: 'deleted', resourceName: 'Lead enrichment' },
			],
			[
				'workflow-version-updated',
				(s) =>
					s.emit('workflow-version-updated', {
						user,
						workflowId: 'workflow1',
						workflowName: 'Lead enrichment',
						versionId: 'version1',
						versionName: 'Adds retries',
					}),
				{
					category: 'workflow',
					action: 'version-updated',
					data: { versionId: 'version1', versionName: 'Adds retries' },
				},
			],
			[
				'credentials-created',
				(s) =>
					s.emit('credentials-created', {
						user,
						credentialType: 'slackApi',
						credentialId: 'credential1',
						credentialName: 'Team Slack',
						credentialDescriptionLength: 0,
						publicApi: false,
						projectId: 'project1',
					}),
				{
					category: 'credential',
					action: 'created',
					resourceType: 'credential',
					resourceId: 'credential1',
					resourceName: 'Team Slack',
					data: { credentialType: 'slackApi' },
				},
			],
			[
				'credentials-updated',
				(s) =>
					s.emit('credentials-updated', {
						user,
						credentialType: 'slackApi',
						credentialId: 'credential1',
						credentialName: 'Team Slack',
						credentialDescriptionLength: 0,
					}),
				{
					category: 'credential',
					action: 'updated',
					resourceName: 'Team Slack',
					data: { credentialType: 'slackApi' },
				},
			],
			[
				'credentials-deleted',
				(s) =>
					s.emit('credentials-deleted', {
						user,
						credentialType: 'slackApi',
						credentialId: 'credential1',
						credentialName: 'Team Slack',
						projectId: 'project1',
					}),
				{
					category: 'credential',
					action: 'deleted',
					resourceName: 'Team Slack',
					data: { credentialType: 'slackApi' },
				},
			],
		];

		it.each(cases)('records %s', async (_name, emit, expected) => {
			relayWith({ flagOverride: true });

			emit(eventService);
			await flushPromises();

			expect(activityEventRepository.record).toHaveBeenCalledTimes(1);
			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'user1', projectId: 'project1', ...expected }),
			);
		});

		it('clips a version name rather than letting it spend the whole budget', async () => {
			relayWith({ flagOverride: true });

			eventService.emit('workflow-activated', {
				user,
				workflowId: 'workflow1',
				workflow: mock<IWorkflowDb>({
					id: 'workflow1',
					name: 'Lead enrichment',
					nodes: [],
					activeVersion: mock<WorkflowHistory>({ name: 'v'.repeat(2_000) }),
				}),
				publicApi: false,
			});
			await flushPromises();

			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({ data: { versionName: 'v'.repeat(64) } }),
			);
		});

		it.each([
			{ label: 'null', name: null },
			{ label: 'empty', name: '' },
			{ label: 'long', name: 'v'.repeat(2_000) },
		])('formats $label version names the same when publishing and updating', async ({ name }) => {
			relayWith({ flagOverride: true });

			eventService.emit('workflow-activated', {
				user,
				workflowId: 'workflow1',
				workflow: mock<IWorkflowDb>({
					id: 'workflow1',
					name: 'Lead enrichment',
					activeVersion: mock<WorkflowHistory>({ name }),
				}),
				publicApi: false,
			});
			eventService.emit('workflow-version-updated', {
				user,
				workflowId: 'workflow1',
				workflowName: 'Lead enrichment',
				versionId: 'version1',
				versionName: name,
			});
			await flushPromises();

			expect(activityEventRepository.record).toHaveBeenCalledTimes(2);
			const [[published], [updated]] = activityEventRepository.record.mock.calls;
			expect(updated.data).toEqual({ versionId: 'version1', ...published.data });
		});

		it('records no version name when unpublishing, which clears the relation first', async () => {
			relayWith({ flagOverride: true });

			eventService.emit('workflow-deactivated', {
				user,
				workflowId: 'workflow1',
				workflow: mock<IWorkflowDb>({
					id: 'workflow1',
					name: 'Lead enrichment',
					activeVersion: null,
				}),
				publicApi: false,
				deactivatedVersionId: 'version1',
			});
			await flushPromises();

			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'unpublished', data: {} }),
			);
		});

		it('falls back to a lookup when a created credential carries no project', async () => {
			relayWith({ flagOverride: true });

			eventService.emit('credentials-created', {
				user,
				credentialType: 'slackApi',
				credentialId: 'credential1',
				credentialName: 'Team Slack',
				credentialDescriptionLength: 0,
				publicApi: true,
				projectId: undefined,
			});
			await flushPromises();

			expect(sharedCredentialsRepository.findCredentialOwningProject).toHaveBeenCalledWith(
				'credential1',
			);
			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'project1' }),
			);
		});

		it('takes a deletion at its word rather than looking up what is already gone', async () => {
			relayWith({ flagOverride: true });

			eventService.emit('workflow-deleted', {
				user,
				workflowId: 'workflow1',
				workflowName: 'Lead enrichment',
				projectId: 'project9',
				publicApi: false,
			});
			await flushPromises();

			expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'project9' }),
			);
		});
	});

	describe('the detail on a save', () => {
		const savedWith = (event: Partial<RelayEventMap['workflow-saved']>) => {
			eventService.emit('workflow-saved', {
				user,
				workflow: workflowWith([node('n8n-nodes-base.slack')]),
				publicApi: false,
				...event,
			});
		};

		const recordedData = () =>
			activityEventRepository.record.mock.calls[0][0].data as Record<string, unknown>;

		it('records who made the change and which node types moved', async () => {
			relayWith({ flagOverride: true });

			savedWith({
				workflow: workflowWith([node('n8n-nodes-base.slack'), node('n8n-nodes-base.httpRequest')]),
				previousWorkflow: workflowWith([node('n8n-nodes-base.slack'), node('n8n-nodes-base.set')]),
				source: 'ui',
				aiBuilderAssisted: true,
				settingsChanged: { timezone: { from: 'UTC', to: 'CET' } },
			});
			await flushPromises();

			expect(recordedData()).toEqual({
				source: 'ui',
				aiBuilderAssisted: true,
				nodeCount: 2,
				nodesAdded: ['httpRequest'],
				nodesRemoved: ['set'],
				settingsChanged: ['timezone'],
			});
		});

		it('keeps an explicit false apart from a save that never mentioned the builder', async () => {
			relayWith({ flagOverride: true });

			savedWith({ source: 'ui', aiBuilderAssisted: false });
			await flushPromises();

			expect(recordedData()).toEqual({ source: 'ui', aiBuilderAssisted: false, nodeCount: 1 });
		});

		it('reports no delta when there is no before state to compare against', async () => {
			relayWith({ flagOverride: true });

			savedWith({ source: 'api', previousWorkflow: undefined });
			await flushPromises();

			expect(recordedData()).toEqual({ source: 'api', nodeCount: 1 });
		});

		it('does not call a second node of an existing type a change of type', async () => {
			relayWith({ flagOverride: true });

			savedWith({
				workflow: workflowWith([
					node('n8n-nodes-base.slack', 'a'),
					node('n8n-nodes-base.slack', 'b'),
				]),
				previousWorkflow: workflowWith([node('n8n-nodes-base.slack', 'a')]),
				source: 'ui',
			});
			await flushPromises();

			expect(recordedData()).toEqual({ source: 'ui', nodeCount: 2 });
		});

		/**
		 * The repository replaces an over-budget payload wholesale with a truncation marker, which
		 * would take `source` with it — and provenance is the field this entry exists to carry.
		 */
		it('clips an unbounded version name so the pointer survives the budget', async () => {
			relayWith({ flagOverride: true });

			eventService.emit('workflow-version-updated', {
				user,
				workflowId: 'workflow1',
				workflowName: 'Lead enrichment',
				versionId: 'version1',
				versionName: 'x'.repeat(2_000),
			});
			await flushPromises();

			const { data } = activityEventRepository.record.mock.calls[0][0];
			expect(JSON.stringify(data).length).toBeLessThanOrEqual(512);
			expect(data).toEqual({ versionId: 'version1', versionName: 'x'.repeat(64) });
		});

		it('sheds detail to fit the budget rather than losing provenance to truncation', async () => {
			relayWith({ flagOverride: true });

			const many = (count: number, prefix: string) =>
				Array.from({ length: count }, (_, i) =>
					node(`@n8n/n8n-nodes-langchain.${prefix}${'x'.repeat(40)}${i}`),
				);

			savedWith({
				workflow: workflowWith(many(30, 'added')),
				previousWorkflow: workflowWith(many(30, 'removed')),
				source: 'n8n-ai',
				settingsChanged: { timezone: { from: 'UTC', to: 'CET' } },
			});
			await flushPromises();

			const data = recordedData();
			expect(JSON.stringify(data).length).toBeLessThanOrEqual(512);
			expect(data).toEqual({
				source: 'n8n-ai',
				nodeCount: 30,
				nodesAddedTotal: 30,
				nodesRemovedTotal: 30,
			});
		});
	});

	describe('when something goes wrong', () => {
		it('drops the entry rather than writing a row no read could ever return', async () => {
			relayWith({ flagOverride: true });
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			eventService.emit('workflow-archived', { user, workflowId: 'workflow1', publicApi: false });
			await flushPromises();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
			expect(scopedLogger.warn).toHaveBeenCalledWith(
				'Dropped an activity entry with no project to attribute it to',
				expect.objectContaining({ action: 'archived', resourceId: 'workflow1' }),
			);
		});

		it('reports a failed lookup once, naming the event, rather than blaming a missing project', async () => {
			relayWith({ flagOverride: true });
			sharedWorkflowRepository.getWorkflowOwningProject.mockRejectedValue(new Error('db is gone'));

			eventService.emit('workflow-archived', { user, workflowId: 'workflow1', publicApi: false });
			await flushPromises();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
			expect(scopedLogger.warn).toHaveBeenCalledExactlyOnceWith(
				'Failed to record activity for an event',
				expect.objectContaining({ event: 'workflow-archived' }),
			);
		});

		/**
		 * Shaping runs before the write, and a listener has no caller to catch for it — an escape
		 * here would be an unhandled rejection rather than a lost row.
		 */
		it('swallows a malformed payload while the entry is still being shaped', async () => {
			relayWith({ flagOverride: true });

			eventService.emit('workflow-saved', {
				user,
				workflow: workflowWith([{ name: 'Broken' } as unknown as INode]),
				previousWorkflow: workflowWith([]),
				publicApi: false,
				source: 'ui',
			});
			await flushPromises();

			// The untyped node is recorded as unknown rather than taking the whole entry down.
			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ source: 'ui', nodesAdded: ['unknown'] }),
				}),
			);
		});

		it('lets nothing escape a listener, whatever stage it fails at', async () => {
			relayWith({ flagOverride: true });
			// Throwing from the lookup itself, which sits outside the handler's own try/catch.
			sharedWorkflowRepository.getWorkflowOwningProject.mockImplementation(() => {
				throw new Error('synchronous boom');
			});

			expect(() =>
				eventService.emit('workflow-archived', { user, workflowId: 'workflow1', publicApi: false }),
			).not.toThrow();
			await flushPromises();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
		});

		/**
		 * An instance-scoped credential is stored with no `shared_credentials` row, so it has no
		 * project and never will. Warning about it every time would be noise no operator can act on.
		 */
		it('drops an unattributable credential quietly, unlike an unattributable workflow', async () => {
			relayWith({ flagOverride: true });
			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(undefined);

			eventService.emit('credentials-updated', {
				user,
				credentialType: 'slackApi',
				credentialId: 'credential1',
				credentialName: 'Instance chat model',
				credentialDescriptionLength: 0,
			});
			await flushPromises();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
			expect(scopedLogger.warn).not.toHaveBeenCalled();
			expect(scopedLogger.debug).toHaveBeenCalledWith(
				'Dropped an activity entry with no project to attribute it to',
				expect.objectContaining({ category: 'credential' }),
			);
		});

		it('swallows a failed write, because a full disk must not lose a workflow save', async () => {
			relayWith({ flagOverride: true });
			activityEventRepository.record.mockRejectedValue(new Error('disk is full'));

			eventService.emit('workflow-archived', { user, workflowId: 'workflow1', publicApi: false });
			await flushPromises();

			expect(scopedLogger.warn).toHaveBeenCalledWith(
				'Failed to record an activity entry',
				expect.objectContaining({ action: 'archived' }),
			);
		});
	});
});
