/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT, type AgentIntegration } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

import { AgentsCredentialProvider } from '../../adapters/agents-credential-provider';
import type { AgentsService } from '../../agents.service';
import type { Agent } from '../../entities/agent.entity';
import { AgentScheduleService } from '../agent-schedule.service';

jest.mock('cron', () => {
	const jobs: Array<{
		cronTime: string;
		onTick: () => void;
		timeZone?: string;
		start: jest.Mock;
		stop: jest.Mock;
	}> = [];
	const validateCronExpression = jest.fn();

	class CronJob {
		cronTime: string;
		onTick: () => void;
		timeZone?: string;
		start = jest.fn();
		stop = jest.fn();

		constructor(
			cronTime: string,
			onTick: () => void,
			_onComplete?: unknown,
			_start?: boolean,
			timeZone?: string,
		) {
			this.cronTime = cronTime;
			this.onTick = onTick;
			this.timeZone = timeZone;
			jobs.push(this);
		}
	}

	return { CronJob, validateCronExpression, __jobs: jobs };
});

const cronModule: {
	validateCronExpression: jest.Mock;
	__jobs: Array<{
		cronTime: string;
		onTick: () => void;
		timeZone?: string;
		start: jest.Mock;
		stop: jest.Mock;
	}>;
} = jest.requireMock('cron');

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
		cronModule.__jobs.length = 0;
		cronModule.validateCronExpression.mockReset();
		cronModule.validateCronExpression.mockReturnValue({ valid: true });
		jest.useFakeTimers().setSystemTime(new Date('2026-04-24T13:00:00Z'));

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
			projectRelationRepository as never,
			mock(),
			agentsService,
		);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('saveConfig upserts the schedule integration alongside credential-backed integrations', async () => {
		const agent = makePublishedAgent([{ type: 'slack', credentialId: 'cred-1' }]);

		const result = await service.saveConfig(agent, '* * * * *');

		expect(agentRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				integrations: [
					{ type: 'slack', credentialId: 'cred-1' },
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
		cronModule.validateCronExpression.mockReturnValue({
			valid: false,
			error: new Error('bad cron'),
		});

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

		const activeConfig = await service.activate(agent);

		expect(activeConfig.active).toBe(true);
		expect(cronModule.__jobs).toHaveLength(1);
		expect(cronModule.__jobs[0].start).toHaveBeenCalled();

		const inactiveConfig = await service.deactivate(agent);

		expect(inactiveConfig.active).toBe(false);
		expect(cronModule.__jobs[0].stop).toHaveBeenCalled();
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

		expect(cronModule.__jobs).toHaveLength(2);
		expect(cronModule.__jobs[0].stop).toHaveBeenCalled();
		expect(cronModule.__jobs[1].cronTime).toBe('*/5 * * * *');
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
			'agent-1',
			expect.stringContaining('Wake up and check the queue.'),
			expect.stringMatching(/^schedule-agent-1-/),
			'user-1',
			'project-1',
			expect.any(AgentsCredentialProvider),
			expect.stringMatching(/^schedule-agent-1-/),
		);

		const call = agentsService.executeForSchedulePublished.mock.calls[0];
		expect(call[1]).toContain('Current date and time:');
		expect(call[1]).toContain('(timezone: Europe/Berlin)');
		expect(call[2]).toBe(call[6]);
	});

	it('reconnectAll restores only active published schedules', async () => {
		agentRepository.findPublished.mockResolvedValue([
			makePublishedAgent([
				{
					type: 'schedule',
					active: true,
					cronExpression: '* * * * *',
					wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
				},
			]),
			makePublishedAgent(
				[
					{
						type: 'schedule',
						active: false,
						cronExpression: '*/5 * * * *',
						wakeUpPrompt: DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
					},
				],
				{ id: 'agent-2' },
			),
		]);

		await service.reconnectAll();

		expect(cronModule.__jobs).toHaveLength(1);
		expect(cronModule.__jobs[0].cronTime).toBe('* * * * *');
	});
});
