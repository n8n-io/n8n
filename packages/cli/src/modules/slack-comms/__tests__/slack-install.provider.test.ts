import type { SlackCommsConfig } from '../slack-comms.config';
import { SlackInstallProvider } from '../slack-install.provider';

function config(over: Partial<SlackCommsConfig> = {}): SlackCommsConfig {
	return {
		mode: 'direct',
		botToken: 'xoxb-token',
		appToken: 'xapp-token',
		signingSecret: 'sec',
		errorChannelId: 'C_OPS',
		streamMode: 'native',
		...over,
	} as SlackCommsConfig;
}

describe('SlackInstallProvider', () => {
	it('returns null when no bot token is configured', () => {
		expect(new SlackInstallProvider(config({ botToken: '' })).getInstall()).toBeNull();
	});

	it('exposes the configured token and error channel', () => {
		const install = new SlackInstallProvider(config()).getInstall();
		expect(install).toEqual(
			expect.objectContaining({ botToken: 'xoxb-token', errorChannelId: 'C_OPS' }),
		);
	});

	it('treats a blank error channel as unset rather than empty string', () => {
		expect(
			new SlackInstallProvider(config({ errorChannelId: '' })).getInstall()?.errorChannelId,
		).toBeNull();
	});

	it('caches the bot user id once resolved', () => {
		const provider = new SlackInstallProvider(config());
		provider.setBotUserId('B1');
		expect(provider.getInstall()?.botUserId).toBe('B1');
	});
});
