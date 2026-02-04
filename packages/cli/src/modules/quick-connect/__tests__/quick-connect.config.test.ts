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

	it.each([
		'no-json',
		JSON.stringify([
			{
				credentialType: 'agentApi',
				text: 'Superagent for everyone',
				quickConnectType: 'oauth',
			},
		]),
	])('uses default if configuration is invalid: %s', (config) => {
		process.env.N8N_QUICK_CONNECT_OPTIONS = config;

		const { options } = Container.get(QuickConnectConfig);

		expect(options).toEqual([]);
	});
});
