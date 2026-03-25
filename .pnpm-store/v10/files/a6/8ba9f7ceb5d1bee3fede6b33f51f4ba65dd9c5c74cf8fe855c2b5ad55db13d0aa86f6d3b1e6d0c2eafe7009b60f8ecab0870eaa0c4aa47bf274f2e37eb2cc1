import { Tool } from "@langchain/core/tools";
import { Client } from "discord.js";

//#region src/tools/discord.d.ts

/**
 * Base tool parameters for the Discord tools
 */
interface DiscordToolParams {
  botToken?: string;
  client?: Client;
}
/**
 * Tool parameters for the DiscordGetMessagesTool
 */
interface DiscordGetMessagesToolParams extends DiscordToolParams {
  messageLimit?: number;
}
/**
 * Tool parameters for the DiscordSendMessageTool
 */
interface DiscordSendMessageToolParams extends DiscordToolParams {
  channelId?: string;
}
/**
 * Tool parameters for the DiscordChannelSearch
 */
interface DiscordChannelSearchParams extends DiscordToolParams {
  channelId?: string;
}
/**
 * A tool for retrieving messages from a discord channel using a bot.
 * It extends the base Tool class and implements the _call method to
 * perform the retrieve operation. Requires an bot token which can be set
 * in the environment variables, and a limit on how many messages to retrieve.
 * The _call method takes the discord channel ID as the input argument.
 * The bot must have read permissions to the given channel. It returns the
 * message content, author, and time the message was created for each message.
 */
declare class DiscordGetMessagesTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected botToken: string;
  protected messageLimit: number;
  protected client: Client;
  constructor(fields?: DiscordGetMessagesToolParams);
  /** @ignore */
  _call(input: string): Promise<string>;
}
/**
 * A tool for retrieving all servers a bot is a member of. It extends the
 * base `Tool` class and implements the `_call` method to perform the retrieve
 * operation. Requires a bot token which can be set in the environment
 * variables.
 */
declare class DiscordGetGuildsTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected botToken: string;
  protected client: Client;
  constructor(fields?: DiscordToolParams);
  /** @ignore */
  _call(_input: string): Promise<string>;
}
/**
 * A tool for retrieving text channels within a server/guild a bot is a member
 * of. It extends the base `Tool` class and implements the `_call` method to
 * perform the retrieve operation. Requires a bot token which can be set in
 * the environment variables. The `_call` method takes a server/guild ID
 * to get its text channels.
 */
declare class DiscordGetTextChannelsTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected botToken: string;
  protected client: Client;
  constructor(fields?: DiscordToolParams);
  /** @ignore */
  _call(input: string): Promise<string>;
}
/**
 * A tool for sending messages to a discord channel using a bot.
 * It extends the base Tool class and implements the _call method to
 * perform the retrieve operation. Requires a bot token and channelId which can be set
 * in the environment variables. The _call method takes the message to be
 * sent as the input argument.
 */
declare class DiscordSendMessagesTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected botToken: string;
  protected channelId: string;
  protected client: Client;
  constructor(fields?: DiscordSendMessageToolParams);
  /** @ignore */
  _call(message: string): Promise<string>;
}
/**
 * A tool for searching for messages within a discord channel using a bot.
 * It extends the base Tool class and implements the _call method to
 * perform the retrieve operation. Requires an bot token which can be set
 * in the environment variables, and the discord channel ID of the channel.
 * The _call method takes the search term as the input argument.
 * The bot must have read permissions to the given channel. It returns the
 * message content, author, and time the message was created for each message.
 */
declare class DiscordChannelSearchTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected botToken: string;
  protected channelId: string;
  protected client: Client;
  constructor(fields?: DiscordChannelSearchParams);
  /** @ignore */
  _call(searchTerm: string): Promise<string>;
}
//#endregion
export { DiscordChannelSearchTool, DiscordGetGuildsTool, DiscordGetMessagesTool, DiscordGetTextChannelsTool, DiscordSendMessagesTool };
//# sourceMappingURL=discord.d.ts.map