import {
	SaveSelfHealingConfigurationDto,
	UpdateSelfHealingConfigurationDto,
} from '../self-healing-configurations';

const input = {
	scope: 'all',
	workflowIds: [],
	reviewerIds: ['c56a4180-65aa-42ec-a945-5fd21dec0538'],
	includeAllProjectMembers: false,
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
		).toMatchObject({ workflowIds: [], includeAllProjectMembers: false });
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
