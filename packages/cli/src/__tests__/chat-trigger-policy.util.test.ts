import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import {
	applyPublicChatTriggerPolicy,
	isPublicChatTriggerDisabled,
} from '@/utils/chat-trigger-policy.util';

const createChatTriggerDescription = (): INodeTypeDescription =>
	({
		name: 'chatTrigger',
		displayName: 'Chat Trigger',
		properties: [
			{
				displayName: 'Make Chat Publicly Available',
				name: 'public',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'hostedChat',
				options: [],
				displayOptions: {
					show: {
						public: [true],
					},
				},
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				default: 'none',
				options: [],
				displayOptions: {
					show: {
						public: [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [],
				displayOptions: {
					show: {
						public: [false],
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Make Available in n8n Chat Hub',
				name: 'availableInChat',
				type: 'boolean',
				default: false,
			},
		] as INodeProperties[],
	}) as INodeTypeDescription;

describe('chat-trigger-policy.util', () => {
	const originalEnv = process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER;

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER;
		} else {
			process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = originalEnv;
		}
	});

	it.each([
		[undefined, false],
		['false', false],
		['1', false],
		['TRUE', false],
		['true', true],
	])('enables the policy only when env is exactly "true" (%s)', (value, expected) => {
		if (value === undefined) {
			delete process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER;
		} else {
			process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = value;
		}

		expect(isPublicChatTriggerDisabled()).toBe(expected);
	});

	it('hides public-chat fields and preserves Chat Hub when enabled', () => {
		process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = 'true';

		const result = applyPublicChatTriggerPolicy(createChatTriggerDescription());

		const publicProperty = result.properties.find((property) => property.name === 'public');
		const modeProperty = result.properties.find((property) => property.name === 'mode');
		const optionsProperty = result.properties.find((property) => property.name === 'options');
		const chatHubProperty = result.properties.find(
			(property) => property.name === 'availableInChat',
		);

		expect(publicProperty?.displayOptions).toEqual({
			show: {
				'@version': [999],
			},
		});
		expect(modeProperty?.displayOptions).toEqual({
			show: {
				'@version': [999],
			},
		});
		expect(optionsProperty?.displayOptions).toEqual({
			show: {
				'@version': [1],
			},
		});
		expect(chatHubProperty).toEqual(
			expect.objectContaining({
				name: 'availableInChat',
			}),
		);
	});

	it('leaves chat trigger descriptions untouched when disabled', () => {
		process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = 'false';

		const node = createChatTriggerDescription();
		const result = applyPublicChatTriggerPolicy(node);

		expect(result).toBe(node);
	});

	it('does not touch non-chat nodes', () => {
		process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = 'true';

		const node = {
			name: 'httpRequest',
			properties: [
				{
					displayName: 'Public',
					name: 'public',
					type: 'boolean',
					default: false,
				},
			] as INodeProperties[],
		} as INodeTypeDescription;

		const result = applyPublicChatTriggerPolicy(node);

		expect(result).toBe(node);
	});
});
