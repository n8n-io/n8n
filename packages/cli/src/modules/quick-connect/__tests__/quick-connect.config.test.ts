import { Container } from '@n8n/di';

import { QuickConnectConfig } from '../quick-connect.config';

describe('QuickConnectConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_QUICK_CONNECT_OPTIONS;
	});

	it('returns an empty options array per default', () => {
		const { options } = Container.get(QuickConnectConfig);

		expect(options).toEqual([]);
	});

	it('returns configured options given valid format', () => {
		const testConfig = [
			{
				packageName: '@n8n/superagent',
				credentialType: 'agentApi',
				text: 'Superagent for everyone',
				quickConnectType: 'oauth',
			},
		];
		process.env.N8N_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

		const { options } = Container.get(QuickConnectConfig);

		expect(options).toEqual(testConfig);
	});

	it('parses valid config with backendFlowConfig', () => {
		const testConfig = [
			{
				packageName: '@n8n/superagent',
				credentialType: 'agentApi',
				text: 'Superagent for everyone',
				quickConnectType: 'firecrawl',
				consentText: 'Allow access to your account?',
				backendFlowConfig: {
					secret: 'my-secret-key',
				},
			},
		];
		process.env.N8N_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

		const { options } = Container.get(QuickConnectConfig);

		expect(options).toEqual(testConfig);
		expect(options[0].backendFlowConfig?.secret).toBe('my-secret-key');
		expect(options[0].consentText).toBe('Allow access to your account?');
	});

	it('handles empty JSON array', () => {
		process.env.N8N_QUICK_CONNECT_OPTIONS = '[]';

		const { options } = Container.get(QuickConnectConfig);

		expect(options).toEqual([]);
	});

	it('handles multiple options', () => {
		const testConfig = [
			{
				packageName: '@n8n/superagent',
				credentialType: 'agentApi',
				text: 'Superagent for everyone',
				quickConnectType: 'oauth',
			},
			{
				packageName: '@n8n/another-service',
				credentialType: 'anotherApi',
				text: 'Another service integration',
				quickConnectType: 'firecrawl',
				consentText: 'Send data to external service?',
				backendFlowConfig: {
					secret: 'another-secret',
				},
			},
		];
		process.env.N8N_QUICK_CONNECT_OPTIONS = JSON.stringify(testConfig);

		const { options } = Container.get(QuickConnectConfig);

		expect(options).toHaveLength(2);
		expect(options).toEqual(testConfig);
	});

	it.each([
		['invalid JSON string', 'no-json'],
		[
			'missing packageName',
			JSON.stringify([
				{
					credentialType: 'agentApi',
					text: 'Superagent for everyone',
					quickConnectType: 'oauth',
				},
			]),
		],
		[
			'missing credentialType',
			JSON.stringify([
				{
					packageName: '@n8n/superagent',
					text: 'Superagent for everyone',
					quickConnectType: 'oauth',
				},
			]),
		],
		[
			'missing text',
			JSON.stringify([
				{
					packageName: '@n8n/superagent',
					credentialType: 'agentApi',
					quickConnectType: 'oauth',
				},
			]),
		],
		[
			'missing quickConnectType',
			JSON.stringify([
				{
					packageName: '@n8n/superagent',
					credentialType: 'agentApi',
					text: 'Superagent for everyone',
				},
			]),
		],
		[
			'backendFlowConfig missing required secret',
			JSON.stringify([
				{
					packageName: '@n8n/superagent',
					credentialType: 'agentApi',
					text: 'Superagent for everyone',
					quickConnectType: 'backend',
					consentText: 'Allow access?',
					backendFlowConfig: {},
				},
			]),
		],
		[
			'backendFlowConfig missing consent text',
			JSON.stringify([
				{
					packageName: '@n8n/superagent',
					credentialType: 'agentApi',
					text: 'Superagent for everyone',
					quickConnectType: 'backend',
					backendFlowConfig: {
						secret: 'test',
					},
				},
			]),
		],
	])('uses default if configuration is invalid: %s', (_description, config) => {
		process.env.N8N_QUICK_CONNECT_OPTIONS = config;

		const { options } = Container.get(QuickConnectConfig);

		expect(options).toEqual([]);
	});
});
