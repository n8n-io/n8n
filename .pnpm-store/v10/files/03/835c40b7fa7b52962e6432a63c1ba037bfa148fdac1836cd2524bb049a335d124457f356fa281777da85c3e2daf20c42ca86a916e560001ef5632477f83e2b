import { Activity, ActivityTypes, ConversationReference } from '@microsoft/agents-activity'
import { ActivityHandler } from '../activityHandler'
import { CloudAdapter } from '../cloudAdapter'
import { Request, Response, Application } from 'express'
import { TurnContext } from '../turnContext'
import { v4 } from 'uuid'
import { normalizeIncomingActivity } from '../activityWireCompat'
import { debug } from '@microsoft/agents-activity/logger'
import { ConversationState } from '../state'

const logger = debug('agents:agent-client')

interface ConversationReferenceState {
  conversationReference: ConversationReference
}

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
export const configureResponseController = (app: Application, adapter: CloudAdapter, agent: ActivityHandler, conversationState: ConversationState) => {
  app.post('/api/agentresponse/v3/conversations/:conversationId/activities/:activityId', handleResponse(adapter, agent, conversationState))
}

const handleResponse = (adapter: CloudAdapter, handler: ActivityHandler, conversationState: ConversationState) => async (req: Request, res: Response) => {
  const incoming = normalizeIncomingActivity(req.body!)
  const activity = Activity.fromObject(incoming)

  logger.debug('received response: ', activity)

  const connection = adapter.connectionManager.getDefaultConnection()
  const appId = connection?.connectionSettings?.clientId ?? ''

  const myTurnContext = new TurnContext(adapter, activity, CloudAdapter.createIdentity(appId))
  const conversationDataAccessor = conversationState.createProperty<ConversationReferenceState>(req.params!.conversationId)
  const conversationRefState = await conversationDataAccessor.get(myTurnContext, undefined, { channelId: activity.channelId!, conversationId: req.params!.conversationId })

  const conversationRef = JSON.stringify(conversationRefState.conversationReference)
  console.log('conversationRef', conversationRef)
  const callback = async (turnContext: TurnContext) => {
    activity.applyConversationReference(conversationRefState.conversationReference)
    turnContext.activity.id = req.params!.activityId

    let response
    if (activity.type === ActivityTypes.EndOfConversation) {
      await conversationDataAccessor.delete(turnContext, { channelId: activity.channelId!, conversationId: activity.conversation!.id })

      applyActivityToTurnContext(turnContext, activity)
      await handler.run(turnContext)

      response = v4().replace(/-/g, '')
    } else {
      response = await turnContext.sendActivity(activity)
    }
    res.status(200).send(response)
  }

  await adapter.continueConversation(myTurnContext.identity, conversationRefState.conversationReference, callback)
}

const applyActivityToTurnContext = (turnContext : TurnContext, activity : Activity) => {
  turnContext.activity.channelData = activity.channelData
  turnContext.activity.code = activity.code
  turnContext.activity.entities = activity.entities
  turnContext.activity.locale = activity.locale
  turnContext.activity.localTimestamp = activity.localTimestamp
  turnContext.activity.name = activity.name
  turnContext.activity.relatesTo = activity.relatesTo
  turnContext.activity.replyToId = activity.replyToId
  turnContext.activity.timestamp = activity.timestamp
  turnContext.activity.text = activity.text
  turnContext.activity.type = activity.type
  turnContext.activity.value = activity.value
}
