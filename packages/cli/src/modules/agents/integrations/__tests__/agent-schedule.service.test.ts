/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT, type AgentIntegration } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { AgentsService } from '../../agents.service';
import type { Agent } from '../../entities/agent.entity';
import { AgentScheduleService } from '../agent-schedule.service';

function makePublishedAgent(
	integrations: AgentIntegration[] = [],
	overrides: Partial<Agent> = {},
): Agent {
	return {
		id: 'agent-1',
		projectId: 'project-1',
		name: 'Scheduled Agent',
		integrations,
		publishedVersion: {
			publishedById: 'user-1',
			schema: null,
		},
		...overrides,
	} as unknown as Agent;
}

async function* emptyStream() {}

describe('AgentScheduleService', () => {
	let service: AgentScheduleService;
	let agentRepository: {
		save: jest.Mock;
		findPublished: jest.Mock;
		findOne: jest.Mock;
	};
	let projectRelationRepository: { findUserIdsByProjectId: jest.Mock };
	let agentsService: jest.Mocked<AgentsService>;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers().setSystemTime(new Date('2026-05-04T13:00:00Z'));

		agentRepository = {
			save: jest.fn(async (agent: Agent) => agent),
			findPublished: jest.fn(),
			findOne: jest.fn(),
		};
		projectRelationRepository = {
			findUserIdsByProjectId: jest.fn(),
		};
		agentsService = mock<AgentsService>();
		agentsService.executeForSchedulePublished.mockReturnValue(emptyStream() as never);

		service = new AgentScheduleService(
			mockLogger(),
			mock<GlobalConfig>({
				generic: { timezone: 'Europe/Berlin' },
			}),
			agentRepository as never,
			agentsService,
			projectRelationRepository as never,
		);
	});

	afterEach(() => {
		service.stopAll();
		jest.useRealTimers();
	});

	it('saveConfig upserts the schedule integration alongside credential-backed integrations', async () => {
		const agent = makePublishedAgent([
			{ type: 'slack', credentialId: 'cred-1', credentialName: 'Slack cred 1' },
		]);

		const result = await service.saveConfig(agent, '* * * * *');

		expect(agentRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				integrations: [
					{ type: 'slack', credentialId: 'cred-1', credentialName: 'Slack cred 1' },
					{
						type: 'schedule',
						active: false,
						cronExpression: '* * * * *',
						wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
					},
				],
			}),
		);
		expect(result).toEqual({
			active: false,
			cronExpression: '* * * * *',
			wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
		});
	});

	it('rejects invalid cron expressions on save and activation', async () => {
		await expect(service.saveConfig(makePublishedAgent(), 'not-a-cron')).rejects.toBeInstanceOf(
			BadRequestError,
		);
		await expect(
			service.activate(
				makePublishedAgent([
					{
						type: 'schedule',
						active: false,
						cronExpression: 'not-a-cron',
						wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
					},
				]),
			),
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it('activate rejects unpublished agents', async () => {
		const agent = makePublishedAgent(
			[
				{
					type: 'schedule',
					active: false,
					cronExpression: '* * * * *',
					wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
				},
			],
			{ publishedVersion: null },
		);

		await expect(service.activate(agent)).rejects.toBeInstanceOf(ConflictError);
	});

	it('activate registers a cron job and deactivate removes it', async () => {
		const agent = makePublishedAgent([
			{
				type: 'schedule',
				active: false,
				cronExpression: '* * * * *',
				wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
			},
		]);
		agentRepository.findOne.mockResolvedValue({
			...agent,
			integrations: [
				{
					type: 'schedule',
					active: true,
					cronExpression: '* * * * *',
					wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
				},
			],
		});
		projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['user-1']);

		const activeConfig = await service.activate(agent);

		expect(activeConfig.active).toBe(true);
		expect(agentsService.executeForSchedulePublished).not.toHaveBeenCalled();

		await jest.advanceTimersByTimeAsync(60 * 1000);

		expect(agentsService.executeForSchedulePublished).toHaveBeenCalledTimes(1);

		const inactiveConfig = await service.deactivate(agent);

		expect(inactiveConfig.active).toBe(false);

		await jest.advanceTimersByTimeAsync(60 * 1000);

		expect(agentsService.executeForSchedulePublished).toHaveBeenCalledTimes(1);
	});

	it('saveConfig refreshes an already active schedule job', async () => {
		const agent = makePublishedAgent([
			{
				type: 'schedule',
				active: true,
				cronExpression: '* * * * *',
				wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
			},
		]);

		await service.registerOrRefresh(agent);
		await service.saveConfig(agent, '*/5 * * * *');

		expect(agentRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				integrations: [
					expect.objectContaining({
						type: 'schedule',
						active: true,
						cronExpression: '*/5 * * * *',
					}),
				],
			}),
		);
	});

	it('runScheduled appends the timestamp and uses a fresh thread/resource id', async () => {
		const agent = makePublishedAgent([
			{
				type: 'schedule',
				active: true,
				cronExpression: '* * * * *',
				wakeUpPrompt: 'Wake up and check the queue.',
			},
		]);
		agentRepository.findOne.mockResolvedValue(agent);
		projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['user-1']);

		await (service as unknown as { runScheduled: (agentId: string) => Promise<void> }).runScheduled(
			'agent-1',
		);

		expect(agentsService.executeForSchedulePublished).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId: 'agent-1',
				projectId: 'project-1',
				message: expect.stringContaining('Wake up and check the queue.'),
				memory: {
					threadId: expect.stringMatching(/^schedule-agent-1-/),
					resourceId: expect.stringMatching(/^user-1/),
				},
			}),
		);

		const config = agentsService.executeForSchedulePublished.mock.calls[0][0];
		expect(config.message).toContain('Current date and time:');
		expect(config.message).toContain('(timezone: Europe/Berlin)');
	});

	it('reconnectAll restores only active published schedules', async () => {
		const activeAgent = makePublishedAgent([
			{
				type: 'schedule',
				active: true,
				cronExpression: '* * * * *',
				wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
			},
		]);
		const inactiveAgent = makePublishedAgent(
			[
				{
					type: 'schedule',
					active: false,
					cronExpression: '*/5 * * * *',
					wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
				},
			],
			{ id: 'agent-2' },
		);
		agentRepository.findPublished.mockResolvedValue([activeAgent, inactiveAgent]);
		agentRepository.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
			if (where.id === activeAgent.id) return activeAgent;
			if (where.id === inactiveAgent.id) return inactiveAgent;
			return null;
		});
		projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['user-1']);

		await service.reconnectAll();

		await jest.advanceTimersByTimeAsync(60 * 1000);

		expect(agentsService.executeForSchedulePublished).toHaveBeenCalledTimes(1);
	});
});
