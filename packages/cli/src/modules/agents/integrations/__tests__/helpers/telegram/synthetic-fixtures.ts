import type {
	TelegramChatFixture,
	TelegramMessageFixture,
	TelegramReplayFixtures,
	TelegramUpdateFixture,
	TelegramUserFixture,
} from './replay-test-context';

const DEFAULT_DATE = 1_719_000_000;

export const telegramBot = (overrides: Partial<TelegramUserFixture> = {}): TelegramUserFixture => ({
	id: 777000,
	is_bot: true,
	first_name: 'n8n Agent',
	username: 'n8n_agent_bot',
	...overrides,
});

export const telegramUser = (
	overrides: Partial<TelegramUserFixture> = {},
): TelegramUserFixture => ({
	id: 123456,
	is_bot: false,
	first_name: 'Alice',
	username: 'alice_dev',
	...overrides,
});

export const telegramPrivateChat = (
	overrides: Partial<TelegramChatFixture> = {},
): TelegramChatFixture => ({
	id: 123456,
	type: 'private',
	first_name: 'Alice',
	username: 'alice_dev',
	...overrides,
});

export const telegramGroupChat = (
	overrides: Partial<TelegramChatFixture> = {},
): TelegramChatFixture => ({
	id: -1001234567890,
	type: 'supergroup',
	title: 'Agent Test Group',
	...overrides,
});

export const telegramMessage = (
	overrides: Partial<TelegramMessageFixture> = {},
): TelegramMessageFixture => ({
	message_id: 11,
	from: telegramUser(),
	chat: telegramPrivateChat(),
	date: DEFAULT_DATE,
	text: 'hello agent',
	...overrides,
});

export const telegramMessageUpdate = (
	overrides: Omit<Partial<TelegramUpdateFixture>, 'message'> & {
		message?: Partial<TelegramMessageFixture>;
	} = {},
): TelegramUpdateFixture => ({
	update_id: overrides.update_id ?? 10001,
	message: telegramMessage(overrides.message),
});

export const telegramCallbackQueryUpdate = (options: {
	data: string;
	message?: Partial<TelegramMessageFixture>;
	from?: Partial<TelegramUserFixture>;
	updateId?: number;
	callbackId?: string;
}): TelegramUpdateFixture => ({
	update_id: options.updateId ?? 10004,
	callback_query: {
		id: options.callbackId ?? 'callback-1',
		from: telegramUser(options.from),
		message: telegramMessage({
			message_id: 1000,
			from: telegramBot(),
			text: 'Approval required',
			...options.message,
		}),
		chat_instance: 'chat-instance-1',
		data: options.data,
	},
});

export const telegramReplayFixtures = (
	overrides: Partial<TelegramReplayFixtures> = {},
): TelegramReplayFixtures => {
	const bot = overrides.bot ?? telegramBot();
	const user = overrides.user ?? telegramUser();
	const chat = overrides.chat ?? telegramPrivateChat();
	const mention =
		overrides.mention ??
		telegramMessageUpdate({
			message: { from: user, chat },
		});
	const mentionMessage = mention.message ?? telegramMessage({ from: user, chat });

	return {
		bot,
		user,
		chat,
		mention,
		followUp:
			overrides.followUp ??
			telegramMessageUpdate({
				update_id: mention.update_id + 1,
				message: {
					...mentionMessage,
					message_id: mentionMessage.message_id + 1,
					text: 'follow up',
				},
			}),
		selfMessage:
			overrides.selfMessage ??
			telegramMessageUpdate({
				update_id: mention.update_id + 2,
				message: {
					...mentionMessage,
					message_id: mentionMessage.message_id + 2,
					from: bot,
					text: 'bot echo',
				},
			}),
		callbackBase:
			overrides.callbackBase ??
			telegramCallbackQueryUpdate({
				data: 'placeholder',
				message: { from: bot, chat },
				from: user,
			}),
	};
};
