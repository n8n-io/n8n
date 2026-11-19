import type { AgentJsonConfig } from '@n8n/api-types';

import {
	applyFormValues,
	buildModelMenuItems,
	decodeModelChoice,
	encodeModelChoice,
} from './team.utils';

const labels = {
	defaultModel: 'Default model',
	defaultModelDescription: 'The server picks',
	gatewayCredits: 'Gateway credits',
};

describe('applyFormValues', () => {
	it('writes the form into the config and keeps the other keys and the skill version pins', () => {
		const base = {
			name: 'Old',
			model: 'openai/gpt-4o',
			credential: 'cred-1',
			instructions: 'Old instructions',
			tools: [],
			skills: [{ type: 'skill', id: 's1', version: 3 }],
		} as unknown as AgentJsonConfig;

		const config = applyFormValues(base, {
			name: 'Dev',
			description: 'Developer',
			instructions: 'Write code',
			model: null,
			skillIds: ['s1', 's2'],
		});

		expect(config).toEqual({
			name: 'Dev',
			description: 'Developer',
			instructions: 'Write code',
			model: 'openai/gpt-4o',
			credential: 'cred-1',
			tools: [],
			skills: [
				{ type: 'skill', id: 's1', version: 3 },
				{ type: 'skill', id: 's2' },
			],
		});
	});
});

describe('model choice', () => {
	it('gives back the choice that was encoded, and null for another menu item', () => {
		const choice = { credential: 'cred-1', model: 'openai/gpt-4o' };

		expect(decodeModelChoice(encodeModelChoice(choice))).toEqual(choice);
		expect(decodeModelChoice('default')).toBeNull();
	});
});

describe('buildModelMenuItems', () => {
	it('lists the models of each credential and checks the current one', () => {
		const items = buildModelMenuItems({
			catalog: {
				openai: {
					id: 'openai',
					name: 'OpenAI',
					models: { 'gpt-4o': { id: 'gpt-4o', name: 'GPT-4o' } },
				},
			} as unknown as Parameters<typeof buildModelMenuItems>[0]['catalog'],
			credentials: [{ id: 'cred-1', name: 'My OpenAI', type: 'openAiApi' }],
			current: { credential: 'cred-1', model: 'openai/gpt-4o' },
			includeDefault: true,
			labels,
		});

		expect(items.map((item) => item.label)).toEqual(['Default model', 'My OpenAI']);
		expect(items[0].checked).toBe(false);
		expect(items[1].children).toEqual([
			{
				id: encodeModelChoice({ credential: 'cred-1', model: 'openai/gpt-4o' }),
				label: 'GPT-4o',
				checked: true,
			},
		]);
	});
});
