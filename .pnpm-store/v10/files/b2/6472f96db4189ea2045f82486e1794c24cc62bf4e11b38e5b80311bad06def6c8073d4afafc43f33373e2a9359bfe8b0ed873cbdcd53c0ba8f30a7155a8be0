/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CloudAdapter } from '../cloudAdapter'
import { Storage } from '../storage'
import { TranscriptLogger } from '../transcript'
import { AdaptiveCardsOptions } from './adaptiveCards'
import { InputFileDownloader } from './inputFileDownloader'
import { TurnState } from './turnState'
import { HeaderPropagationDefinition } from '../headerPropagation'
import { AuthorizationOptions } from './auth/types'
import { Connections } from '../auth/connections'

/**
 * Configuration options for creating and initializing an Agent Application.
 * This interface defines all the configurable aspects of an agent's behavior,
 * including adapter settings, storage, authorization, and various feature flags.
 *
 * @typeParam TState - The type of turn state that extends TurnState, allowing for
 * custom state management specific to your agent's needs.
 */
export interface AgentApplicationOptions<TState extends TurnState> {
  /**
   * The adapter used for handling bot interactions with various messaging platforms.
   * This adapter manages the communication layer between your agent and the Bot Framework.
   * If not provided, a default CloudAdapter will be created automatically.
   *
   * @default undefined (auto-created)
   */
  adapter?: CloudAdapter;

  /**
   * The unique application ID of the agent as registered in the Bot Framework.
   * This ID is used to identify your bot in the Azure Bot Service and should match
   * the App ID from your bot registration in the Azure portal.
   *
   * @example "12345678-1234-1234-1234-123456789012"
   */
  agentAppId?: string;

  /**
   * The storage mechanism for persisting conversation and user state across turns.
   * This can be any implementation of the Storage interface, such as memory storage
   * for development or blob storage for production scenarios.
   *
   * @default undefined (no persistence)
   */
  storage?: Storage;

  /**
   * Whether to start a typing indicator timer when the bot begins processing a message.
   * When enabled, users will see a typing indicator while the agent is thinking or processing,
   * providing better user experience feedback. The typing indicator will automatically stop
   * when the agent sends a response.
   *
   * @default false
   */
  startTypingTimer: boolean;

  /**
   * Whether to enable support for long-running message processing operations.
   * When enabled, the agent can handle operations that take longer than the typical
   * HTTP timeout period without the connection being terminated. This is useful for
   * complex AI operations, file processing, or external API calls that may take time.
   *
   * @default false
   */
  longRunningMessages: boolean;

  /**
   * A factory function that creates a new instance of the turn state for each conversation turn.
   * This function is called at the beginning of each turn to initialize the state object
   * that will be used throughout the turn's processing lifecycle.
   *
   * @returns A new instance of TState for the current turn
   * @example () => new MyCustomTurnState()
   */
  turnStateFactory: () => TState;

  /**
   * An array of file downloaders for handling different types of input files from users.
   * Each downloader can handle specific file types or sources (e.g., SharePoint, OneDrive,
   * direct uploads). The agent will use these downloaders to process file attachments
   * sent by users during conversations.
   *
   * @default undefined (no file downloading capability)
   */
  fileDownloaders?: InputFileDownloader<TState>[];

  /**
   * Handlers for managing user authentication and authorization within the agent.
   * This includes OAuth flows, token management, and permission validation.
   * Use this to implement secure access to protected resources or user-specific data.
   *
   * @default undefined (no authorization required)
   */
  authorization?: AuthorizationOptions;

  /**
   * Configuration options for handling Adaptive Card actions and interactions.
   * This controls how the agent processes card submissions, button clicks, and other
   * interactive elements within Adaptive Cards sent to users.
   *
   * @default undefined (default Adaptive Card handling)
   */
  adaptiveCardsOptions?: AdaptiveCardsOptions;

  /**
   * Whether to automatically remove mentions of the bot's name from incoming messages.
   * When enabled, if a user mentions the bot by name (e.g., "@BotName hello"), the mention
   * will be stripped from the message text before processing, leaving just "hello".
   * This helps create cleaner input for natural language processing.
   *
   * @default true
   */
  removeRecipientMention?: boolean;

  /**
   * Whether to automatically normalize mentions in incoming messages.
   * When enabled, user mentions and other entity mentions in messages will be
   * standardized to a consistent format, making them easier to process and understand.
   * This includes formatting mentions and channel references consistently.
   *
   * @default true
   */
  normalizeMentions?: boolean

  /**
   * Optional. The transcript logger to use for logging conversations. If not provided, no logging will occur.
   */
  transcriptLogger?: TranscriptLogger

  /**
   * Optional. A function to handle header propagation for incoming requests.
   * This allows the agent to manage headers from incoming requests and propagate
   * them to outgoing requests as needed.
   *
   * @default undefined
   */
  headerPropagation?: HeaderPropagationDefinition

  /**
   * Optional. Configuration for managing multiple authentication connections within the agent.
   * This allows the agent to handle authentication across different services or
   * identity providers.
   */
  connections?: Connections
}
