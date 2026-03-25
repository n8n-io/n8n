import { ActivityHandler } from '../activityHandler';
import { CloudAdapter } from '../cloudAdapter';
import { Application } from 'express';
import { ConversationState } from '../state';
/**
 * To enable Agent to Agent communication, configures the agent response controller endpoint for handling incoming activities from external services.
 *
 * @remarks
 * This function sets up a POST endpoint that receives activities (messages, events, etc.) from external
 * services and processes them through the bot framework's activity handling pipeline. It's typically used
 * when the agent needs to receive and respond to activities from channels or services that send activities
 * to a specific webhook endpoint.
 *
 * The endpoint expects activities to be sent to:
 * `POST /api/agentresponse/v3/conversations/{conversationId}/activities/{activityId}`
 *
 * The function handles:
 * - Normalizing incoming activity data from the request body
 * - Retrieving conversation references from conversation state
 * - Continuing conversations using the stored conversation reference
 * - Processing EndOfConversation activities by cleaning up conversation state
 * - Sending activities through the turn context and returning responses
 *
 * @param app - The Express application instance to configure the route on
 * @param adapter - The CloudAdapter instance used for processing bot framework activities and managing conversations
 * @param agent - The ActivityHandler instance that contains the bot's logic for processing different types of activities
 * @param conversationState - The ConversationState instance used for managing conversation-specific state and conversation references
 *
 * @example
 * ```typescript
 * const app = express();
 * const adapter = new CloudAdapter();
 * const agent = new MyActivityHandler();
 * const conversationState = new ConversationState(memoryStorage);
 *
 * configureResponseController(app, adapter, agent, conversationState);
 * ```
 */
export declare const configureResponseController: (app: Application, adapter: CloudAdapter, agent: ActivityHandler, conversationState: ConversationState) => void;
