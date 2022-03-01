import { descriptions } from './../../SyncroMSP/v1/actions/customer/index';
export interface DiscordWebhook {
	content?: string;
	username?: string;
	avatar_url?: string;
	tts?: boolean;
	file?: any;
	embeds?: any[];
	allowed_mentions?: {
		parse: Array<'roles' | 'users' | 'everyone'>;
		roles: string[];
		users: string[];
		replied_user: boolean;
	};
	flags?: number;
	attachments?: DiscordAttachment[];
	components?: any[];
	payload_json?: any;
}

export interface DiscordAttachment {
	id?: string;
	filename?: string;
	size?: number;
	description?: string;
	content_type?: string;
	url?: string;
	proxy_url?: string;
	height?: number;
	width?: number;
	ephemeral?: boolean;
}
