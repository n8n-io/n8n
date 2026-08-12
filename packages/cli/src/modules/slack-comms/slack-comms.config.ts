import { Config, Env } from '@n8n/config';
import { z } from 'zod';

@Config
export class SlackCommsConfig {
	@Env('N8N_COMMS_MODE', z.enum(['direct', 'brokered']))
	mode: 'direct' | 'brokered' = 'direct';

	@Env('N8N_COMMS_SLACK_BOT_TOKEN')
	botToken: string = '';

	@Env('N8N_COMMS_SLACK_APP_TOKEN')
	appToken: string = '';

	@Env('N8N_COMMS_SLACK_SIGNING_SECRET')
	signingSecret: string = '';

	@Env('N8N_COMMS_ERROR_CHANNEL_ID')
	errorChannelId: string = '';

	@Env('N8N_COMMS_STREAM_MODE', z.enum(['native', 'fallback']))
	streamMode: 'native' | 'fallback' = 'native';
}
