import type { Logger } from '@n8n/backend-common';
import type { ActivityLogConfig } from '@n8n/config';
import type {
	ActivityEventRepository,
	IWorkflowDb,
	Project,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
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

	const relayWith = (enabled: boolean) => {
		const relay = new ActivityEventRelay(
			eventService,
			activityEventRepository,
			sharedWorkflowRepository,
			sharedCredentialsRepository,
			mock<ActivityLogConfig>({ enabled }),
			logger,
		);
		relay.init();
		return relay;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		eventService = new EventService();
		// Every event whose resource still exists resolves its project through one of these.
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
			mock<Project>({ id: 'project1' }),
		);
		sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(
			mock<Project>({ id: 'project1' }),
		);
	});

	describe('the write flag', () => {
		it('registers no listeners at all when disabled, so no event costs anything', async () => {
			const onSpy = vi.spyOn(eventService, 'on');

			relayWith(false);

			expect(onSpy).not.toHaveBeenCalled();

			eventService.emit('workflow-deleted', {
				user,
				workflowId: 'workflow1',
				workflowName: 'Lead enrichment',
				projectId: 'project1',
				publicApi: false,
			});
			await flushPromises();

			expect(activityEventRepository.record).not.toHaveBeenCalled();
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
						workflow: workflowWith([]),
						publicApi: false,
					}),
				{ category: 'workflow', action: 'published', resourceName: 'Lead enrichment' },
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
					}),
				{ category: 'credential', action: 'updated', resourceName: 'Team Slack' },
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
				{ category: 'credential', action: 'deleted', resourceName: 'Team Slack' },
			],
		];

		it.each(cases)('records %s', async (_name, emit, expected) => {
			relayWith(true);

			emit(eventService);
			await flushPromises();

			expect(activityEventRepository.record).toHaveBeenCalledTimes(1);
			expect(activityEventRepository.record).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'user1', projectId: 'project1', ...expected }),
			);
		});

		it('falls back to a lookup when a created credential carries no project', async () => {
			relayWith(true);

			eventService.emit('credentials-created', {
				user,
				credentialType: 'slackApi',
				credentialId: 'credential1',
				credentialName: 'Team Slack',
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
			relayWith(true);

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
			relayWith(true);

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

		it('reports no delta when there is no before state to compare against', async () => {
			relayWith(true);

			savedWith({ source: 'api', previousWorkflow: undefined });
			await flushPromises();

			expect(recordedData()).toEqual({ source: 'api', nodeCount: 1 });
		});

		it('does not call a second node of an existing type a change of type', async () => {
			relayWith(true);

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
			relayWith(true);

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
			relayWith(true);

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
			relayWith(true);
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
			relayWith(true);
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
			relayWith(true);

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
			relayWith(true);
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
			relayWith(true);
			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(undefined);

			eventService.emit('credentials-updated', {
				user,
				credentialType: 'slackApi',
				credentialId: 'credential1',
				credentialName: 'Instance chat model',
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
			relayWith(true);
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
