const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const discord_js = require_rolldown_runtime.__toESM(require("discord.js"));

//#region src/tools/discord.ts
var discord_exports = {};
require_rolldown_runtime.__export(discord_exports, {
	DiscordChannelSearchTool: () => DiscordChannelSearchTool,
	DiscordGetGuildsTool: () => DiscordGetGuildsTool,
	DiscordGetMessagesTool: () => DiscordGetMessagesTool,
	DiscordGetTextChannelsTool: () => DiscordGetTextChannelsTool,
	DiscordSendMessagesTool: () => DiscordSendMessagesTool
});
/**
* A tool for retrieving messages from a discord channel using a bot.
* It extends the base Tool class and implements the _call method to
* perform the retrieve operation. Requires an bot token which can be set
* in the environment variables, and a limit on how many messages to retrieve.
* The _call method takes the discord channel ID as the input argument.
* The bot must have read permissions to the given channel. It returns the
* message content, author, and time the message was created for each message.
*/
var DiscordGetMessagesTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DiscordGetMessagesTool";
	}
	name = "discord-get-messages";
	description = `A discord tool. useful for reading messages from a discord channel. 
  Input should be the discord channel ID. The bot should have read 
  permissions for the channel.`;
	botToken;
	messageLimit;
	client;
	constructor(fields) {
		super();
		const { botToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_BOT_TOKEN"), messageLimit = 10, client } = fields ?? {};
		if (!botToken) throw new Error("Environment variable DISCORD_BOT_TOKEN missing, but is required for DiscordGetMessagesTool.");
		this.client = client ?? new discord_js.Client({ intents: [discord_js.GatewayIntentBits.Guilds, discord_js.GatewayIntentBits.GuildMessages] });
		this.botToken = botToken;
		this.messageLimit = messageLimit;
	}
	/** @ignore */
	async _call(input) {
		try {
			await this.client.login(this.botToken);
			const channel = await this.client.channels.fetch(input);
			if (!channel) return "Channel not found.";
			const messages = await channel.messages.fetch({ limit: this.messageLimit });
			await this.client.destroy();
			const results = messages.map((message) => ({
				author: message.author.tag,
				content: message.content,
				timestamp: message.createdAt
			})) ?? [];
			return JSON.stringify(results);
		} catch {
			await this.client.destroy();
			return "Error getting messages.";
		}
	}
};
/**
* A tool for retrieving all servers a bot is a member of. It extends the
* base `Tool` class and implements the `_call` method to perform the retrieve
* operation. Requires a bot token which can be set in the environment
* variables.
*/
var DiscordGetGuildsTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DiscordGetGuildsTool";
	}
	name = "discord-get-guilds";
	description = `A discord tool. Useful for getting a list of all servers/guilds the bot is a member of. No input required.`;
	botToken;
	client;
	constructor(fields) {
		super();
		const { botToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_BOT_TOKEN"), client } = fields ?? {};
		if (!botToken) throw new Error("Environment variable DISCORD_BOT_TOKEN missing, but is required for DiscordGetGuildsTool.");
		this.client = client ?? new discord_js.Client({ intents: [discord_js.GatewayIntentBits.Guilds] });
		this.botToken = botToken;
	}
	/** @ignore */
	async _call(_input) {
		try {
			await this.client.login(this.botToken);
			const guilds = await this.client.guilds.fetch();
			await this.client.destroy();
			const results = guilds.map((guild) => ({
				id: guild.id,
				name: guild.name,
				createdAt: guild.createdAt
			})) ?? [];
			return JSON.stringify(results);
		} catch {
			await this.client.destroy();
			return "Error getting guilds.";
		}
	}
};
/**
* A tool for retrieving text channels within a server/guild a bot is a member
* of. It extends the base `Tool` class and implements the `_call` method to
* perform the retrieve operation. Requires a bot token which can be set in
* the environment variables. The `_call` method takes a server/guild ID
* to get its text channels.
*/
var DiscordGetTextChannelsTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DiscordGetTextChannelsTool";
	}
	name = "discord-get-text-channels";
	description = `A discord tool. Useful for getting a list of all text channels in a server/guild. Input should be a discord server/guild ID.`;
	botToken;
	client;
	constructor(fields) {
		super();
		const { botToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_BOT_TOKEN"), client } = fields ?? {};
		if (!botToken) throw new Error("Environment variable DISCORD_BOT_TOKEN missing, but is required for DiscordGetTextChannelsTool.");
		this.client = client ?? new discord_js.Client({ intents: [discord_js.GatewayIntentBits.Guilds] });
		this.botToken = botToken;
	}
	/** @ignore */
	async _call(input) {
		try {
			await this.client.login(this.botToken);
			const guild = await this.client.guilds.fetch(input);
			const channels = await guild.channels.fetch();
			await this.client.destroy();
			const results = channels.filter((channel) => channel?.type === discord_js.ChannelType.GuildText).map((channel) => ({
				id: channel?.id,
				name: channel?.name,
				createdAt: channel?.createdAt
			})) ?? [];
			return JSON.stringify(results);
		} catch {
			await this.client.destroy();
			return "Error getting text channels.";
		}
	}
};
/**
* A tool for sending messages to a discord channel using a bot.
* It extends the base Tool class and implements the _call method to
* perform the retrieve operation. Requires a bot token and channelId which can be set
* in the environment variables. The _call method takes the message to be
* sent as the input argument.
*/
var DiscordSendMessagesTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DiscordSendMessagesTool";
	}
	name = "discord-send-messages";
	description = `A discord tool useful for sending messages to a discod channel.
  Input should be the discord channel message, since we will already have the channel ID.`;
	botToken;
	channelId;
	client;
	constructor(fields) {
		super();
		const { botToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_BOT_TOKEN"), channelId = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_CHANNEL_ID"), client } = fields ?? {};
		if (!botToken) throw new Error("Environment variable DISCORD_BOT_TOKEN missing, but is required for DiscordSendMessagesTool.");
		if (!channelId) throw new Error("Environment variable DISCORD_CHANNEL_ID missing, but is required for DiscordSendMessagesTool.");
		this.client = client ?? new discord_js.Client({ intents: [discord_js.GatewayIntentBits.Guilds, discord_js.GatewayIntentBits.GuildMessages] });
		this.botToken = botToken;
		this.channelId = channelId;
	}
	/** @ignore */
	async _call(message) {
		try {
			await this.client.login(this.botToken);
			const channel = await this.client.channels.fetch(this.channelId);
			if (!channel) throw new Error("Channel not found");
			if (!(channel.constructor === discord_js.TextChannel)) throw new Error("Channel is not text channel, cannot send message");
			await channel.send(message);
			await this.client.destroy();
			return "Message sent successfully.";
		} catch {
			await this.client.destroy();
			return "Error sending message.";
		}
	}
};
/**
* A tool for searching for messages within a discord channel using a bot.
* It extends the base Tool class and implements the _call method to
* perform the retrieve operation. Requires an bot token which can be set
* in the environment variables, and the discord channel ID of the channel.
* The _call method takes the search term as the input argument.
* The bot must have read permissions to the given channel. It returns the
* message content, author, and time the message was created for each message.
*/
var DiscordChannelSearchTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DiscordChannelSearchTool";
	}
	name = "discord_channel_search_tool";
	description = `A discord toolkit. Useful for searching for messages 
  within a discord channel. Input should be the search term. The bot 
  should have read permissions for the channel.`;
	botToken;
	channelId;
	client;
	constructor(fields) {
		super();
		const { botToken = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_BOT_TOKEN"), channelId = (0, __langchain_core_utils_env.getEnvironmentVariable)("DISCORD_CHANNEL_ID"), client } = fields ?? {};
		if (!botToken) throw new Error("Environment variable DISCORD_BOT_TOKEN missing, but is required for DiscordChannelSearchTool.");
		if (!channelId) throw new Error("Environment variable DISCORD_CHANNEL_ID missing, but is required for DiscordChannelSearchTool.");
		this.client = client ?? new discord_js.Client({ intents: [discord_js.GatewayIntentBits.Guilds, discord_js.GatewayIntentBits.GuildMessages] });
		this.botToken = botToken;
		this.channelId = channelId;
	}
	/** @ignore */
	async _call(searchTerm) {
		try {
			await this.client.login(this.botToken);
			const channel = await this.client.channels.fetch(this.channelId);
			if (!channel) return "Channel not found";
			const messages = await channel.messages.fetch();
			await this.client.destroy();
			const filtered = messages.filter((message) => message.content.toLowerCase().includes(searchTerm.toLowerCase()));
			const results = filtered.map((message) => ({
				author: message.author.tag,
				content: message.content,
				timestamp: message.createdAt
			})) ?? [];
			return JSON.stringify(results);
		} catch {
			await this.client.destroy();
			return "Error searching through channel.";
		}
	}
};

//#endregion
exports.DiscordChannelSearchTool = DiscordChannelSearchTool;
exports.DiscordGetGuildsTool = DiscordGetGuildsTool;
exports.DiscordGetMessagesTool = DiscordGetMessagesTool;
exports.DiscordGetTextChannelsTool = DiscordGetTextChannelsTool;
exports.DiscordSendMessagesTool = DiscordSendMessagesTool;
Object.defineProperty(exports, 'discord_exports', {
  enumerable: true,
  get: function () {
    return discord_exports;
  }
});
//# sourceMappingURL=discord.cjs.map