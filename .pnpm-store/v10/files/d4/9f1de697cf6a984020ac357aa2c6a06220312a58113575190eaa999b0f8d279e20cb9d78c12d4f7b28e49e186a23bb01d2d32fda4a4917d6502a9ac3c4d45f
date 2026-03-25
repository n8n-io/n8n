"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureResponseController = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const cloudAdapter_1 = require("../cloudAdapter");
const turnContext_1 = require("../turnContext");
const uuid_1 = require("uuid");
const activityWireCompat_1 = require("../activityWireCompat");
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:agent-client');
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
const configureResponseController = (app, adapter, agent, conversationState) => {
    app.post('/api/agentresponse/v3/conversations/:conversationId/activities/:activityId', handleResponse(adapter, agent, conversationState));
};
exports.configureResponseController = configureResponseController;
const handleResponse = (adapter, handler, conversationState) => async (req, res) => {
    var _a, _b;
    const incoming = (0, activityWireCompat_1.normalizeIncomingActivity)(req.body);
    const activity = agents_activity_1.Activity.fromObject(incoming);
    logger.debug('received response: ', activity);
    const connection = adapter.connectionManager.getDefaultConnection();
    const appId = (_b = (_a = connection === null || connection === void 0 ? void 0 : connection.connectionSettings) === null || _a === void 0 ? void 0 : _a.clientId) !== null && _b !== void 0 ? _b : '';
    const myTurnContext = new turnContext_1.TurnContext(adapter, activity, cloudAdapter_1.CloudAdapter.createIdentity(appId));
    const conversationDataAccessor = conversationState.createProperty(req.params.conversationId);
    const conversationRefState = await conversationDataAccessor.get(myTurnContext, undefined, { channelId: activity.channelId, conversationId: req.params.conversationId });
    const conversationRef = JSON.stringify(conversationRefState.conversationReference);
    console.log('conversationRef', conversationRef);
    const callback = async (turnContext) => {
        activity.applyConversationReference(conversationRefState.conversationReference);
        turnContext.activity.id = req.params.activityId;
        let response;
        if (activity.type === agents_activity_1.ActivityTypes.EndOfConversation) {
            await conversationDataAccessor.delete(turnContext, { channelId: activity.channelId, conversationId: activity.conversation.id });
            applyActivityToTurnContext(turnContext, activity);
            await handler.run(turnContext);
            response = (0, uuid_1.v4)().replace(/-/g, '');
        }
        else {
            response = await turnContext.sendActivity(activity);
        }
        res.status(200).send(response);
    };
    await adapter.continueConversation(myTurnContext.identity, conversationRefState.conversationReference, callback);
};
const applyActivityToTurnContext = (turnContext, activity) => {
    turnContext.activity.channelData = activity.channelData;
    turnContext.activity.code = activity.code;
    turnContext.activity.entities = activity.entities;
    turnContext.activity.locale = activity.locale;
    turnContext.activity.localTimestamp = activity.localTimestamp;
    turnContext.activity.name = activity.name;
    turnContext.activity.relatesTo = activity.relatesTo;
    turnContext.activity.replyToId = activity.replyToId;
    turnContext.activity.timestamp = activity.timestamp;
    turnContext.activity.text = activity.text;
    turnContext.activity.type = activity.type;
    turnContext.activity.value = activity.value;
};
//# sourceMappingURL=agentResponseHandler.js.map