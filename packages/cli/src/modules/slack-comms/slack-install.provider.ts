import { Service } from '@n8n/di';

import { SlackCommsConfig } from './slack-comms.config';

export interface SlackInstall {
	botToken: string;
	botUserId: string;
	errorChannelId: string | null;
}

@Service()
export class SlackInstallProvider {
	private botUserId = '';

	constructor(private readonly config: SlackCommsConfig) {}

	setBotUserId(id: string): void {
		this.botUserId = id;
	}

	getInstall(): SlackInstall | null {
		if (!this.config.botToken) return null;
		return {
			botToken: this.config.botToken,
			botUserId: this.botUserId,
			errorChannelId: this.config.errorChannelId || null,
		};
	}
}
