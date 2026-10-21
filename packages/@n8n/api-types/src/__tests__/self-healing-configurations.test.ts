import {
	SaveSelfHealingConfigurationDto,
	UpdateSelfHealingConfigurationDto,
} from '../self-healing-configurations';

const input = {
	scope: 'all',
	workflowIds: [],
	reviewerIds: ['c56a4180-65aa-42ec-a945-5fd21dec0538'],
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
	'requires a reviewer when saving a configuration',
	(dto) => {
		expect(dto.safeParse({ ...input, reviewerIds: [] }).success).toBe(false);
	},
);
