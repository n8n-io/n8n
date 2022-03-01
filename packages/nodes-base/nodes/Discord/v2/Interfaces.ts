export interface DiscordWebhook {
	content?: string;
	username?: string;
	avatar_url?: string;
	tts?: boolean;
	//* Not going to implement this yet as I don't know how I would do that with the node systems binary input.
	file?: any;
	embeds?: any[];
	allowed_mentions?: {
		parse: Array<'roles' | 'users' | 'everyone'>;
		roles: string[];
		users: string[];
		replied_user: boolean;
	};
}
