import { CreateAgentSkillDto } from '../../agents/dto';
import { CreateSkillDto } from '../../agents/skills.schema';
import { ConnectSkillSourceDto, DiscoverSkillSourceDto } from '../skill-sources.schema';

const skill = {
	name: 'writing',
	description: 'Write clearly.',
	instructions: 'Use short sentences.',
};
const target = { url: 'https://github.com/acme/skills', scope: 'instance' };
const attribution = {
	navigation_source: 'agent_picker_discover',
	flow_id: 'b23b6134-b7a7-4912-a635-6d38cbbe0ae8',
	add_entry_point: 'discover_detail',
	catalog_skill_id: 'n8n-workflows',
};

describe.each([
	['Settings create', CreateSkillDto, { scope: 'instance', skill }],
	['Agent create', CreateAgentSkillDto, skill],
	['Discover source', DiscoverSkillSourceDto, target],
	['Connect source', ConnectSkillSourceDto, { ...target, skillKeys: ['writing'] }],
] as const)('%s telemetry', (_name, schema, payload) => {
	it('accepts bounded attribution and removes unknown fields', () => {
		expect(
			schema.parse({ ...payload, telemetry: { ...attribution, private_text: 'ignored' } })
				.telemetry,
		).toEqual(attribution);
	});
	it.each([
		undefined,
		{ ...attribution, navigation_source: 'unknown' },
		{ ...attribution, flow_id: 'invalid' },
	])('does not reject the operation for missing or invalid metadata', (telemetry) => {
		expect(schema.parse({ ...payload, telemetry }).telemetry).toBeUndefined();
	});
});
