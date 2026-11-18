import { isSelfHealingAgentTriggerMissing } from '../self-healing-agents';
import {
	SaveSelfHealingConfigurationDto,
	UpdateSelfHealingConfigurationDto,
} from '../self-healing-configurations';

const input = {
	scope: 'all',
	workflowIds: [],
	reviewerIds: ['c56a4180-65aa-42ec-a945-5fd21dec0538'],
	includeAllProjectMembers: false,
	includeSubWorkflows: false,
	agentScope: 'none',
	agentIds: [],
	agentGoals: ['quality'],
	agentScheduleIntervalHours: null,
	agentTraceThreshold: null,
	agentPublicationMode: 'approval',
};

it.each([undefined, false, true])('omits enabled=%s from configuration edits', (enabled) => {
	expect(UpdateSelfHealingConfigurationDto.parse({ ...input, enabled })).toEqual(input);
});

it('defaults new configurations to paused and preserves explicit enablement', () => {
	expect(SaveSelfHealingConfigurationDto.parse(input)).toEqual({ ...input, enabled: false });
	expect(SaveSelfHealingConfigurationDto.parse({ ...input, enabled: true })).toEqual({
		...input,
		enabled: true,
	});
});

it.each([SaveSelfHealingConfigurationDto, UpdateSelfHealingConfigurationDto])(
	'defaults omitted selections to individual reviewers only',
	(dto) => {
		expect(
			dto.parse({ scope: 'all', reviewerIds: ['c56a4180-65aa-42ec-a945-5fd21dec0538'] }),
		).toMatchObject({
			workflowIds: [],
			includeAllProjectMembers: false,
			includeSubWorkflows: false,
		});
		expect(dto.parse({ scope: 'all', includeAllProjectMembers: true })).toMatchObject({
			reviewerIds: [],
			includeAllProjectMembers: true,
		});
	},
);

it.each([SaveSelfHealingConfigurationDto, UpdateSelfHealingConfigurationDto])(
	'rejects invalid reviewer selections',
	(dto) => {
		expect(dto.safeParse({ ...input, reviewerIds: ['not-a-user'] }).success).toBe(false);
		expect(dto.safeParse({ ...input, includeAllProjectMembers: 'yes' }).success).toBe(false);
	},
);

it.each([SaveSelfHealingConfigurationDto, UpdateSelfHealingConfigurationDto])(
	'accepts only a boolean sub-workflow inclusion',
	(dto) => {
		expect(dto.parse({ ...input, includeSubWorkflows: true })).toMatchObject({
			includeSubWorkflows: true,
		});
		expect(dto.safeParse({ ...input, includeSubWorkflows: 'yes' }).success).toBe(false);
	},
);

it('defaults omitted agent fields to no agent coverage', () => {
	expect(UpdateSelfHealingConfigurationDto.parse({ scope: 'all' })).toMatchObject({
		agentScope: 'none',
		agentIds: [],
		agentGoals: ['quality'],
		agentScheduleIntervalHours: null,
		agentTraceThreshold: null,
		agentPublicationMode: 'approval',
	});
});

it.each([
	['agentScheduleIntervalHours', 0],
	['agentScheduleIntervalHours', 721],
	['agentScheduleIntervalHours', 1.5],
	['agentTraceThreshold', 0],
	['agentTraceThreshold', 10_001],
])('rejects %s=%s', (field, value) => {
	expect(UpdateSelfHealingConfigurationDto.safeParse({ ...input, [field]: value }).success).toBe(
		false,
	);
});

it.each([
	['agentScheduleIntervalHours', 1],
	['agentScheduleIntervalHours', 720],
	['agentTraceThreshold', 1],
	['agentTraceThreshold', 10_000],
])('accepts %s=%s', (field, value) => {
	expect(UpdateSelfHealingConfigurationDto.parse({ ...input, [field]: value })).toMatchObject({
		[field]: value,
	});
});

it.each([
	[['cost'], ['quality', 'cost']],
	[
		['latency', 'cost', 'quality'],
		['quality', 'cost', 'latency'],
	],
	[[], ['quality']],
])('normalizes the goals %j to %j', (agentGoals, expected) => {
	expect(UpdateSelfHealingConfigurationDto.parse({ ...input, agentGoals }).agentGoals).toEqual(
		expected,
	);
});

it.each([[['cost', 'cost']], [['speed']], ['quality']])('rejects the goals %j', (agentGoals) => {
	expect(UpdateSelfHealingConfigurationDto.safeParse({ ...input, agentGoals }).success).toBe(false);
});

it.each([
	['none', null, null, false],
	['all', null, null, true],
	['selected', null, null, true],
	['all', 24, null, false],
	['selected', null, 50, false],
	['all', 24, 50, false],
] as const)(
	'reports a missing trigger for agentScope=%s, hours=%s, sessions=%s as %s',
	(agentScope, agentScheduleIntervalHours, agentTraceThreshold, expected) => {
		expect(
			isSelfHealingAgentTriggerMissing({
				agentScope,
				agentScheduleIntervalHours,
				agentTraceThreshold,
			}),
		).toBe(expected);
	},
);
