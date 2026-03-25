import { AuthConfiguration, MsalTokenProvider } from '../auth'
import { Activity, ConversationReference, RoleTypes } from '@microsoft/agents-activity'
import { v4 } from 'uuid'
import { debug } from '@microsoft/agents-activity/logger'
import { ConversationState } from '../state'
import { TurnContext } from '../turnContext'

const logger = debug('agents:agent-client')

/**
 * Configuration settings required to connect to an agent endpoint.
 */
export interface AgentClientConfig {
  /**
   * The URL endpoint where activities will be sent to the agent
   */
  endPoint: string;
  /**
   * The client ID of the target agent
   */
  clientId: string;
  /**
   * The service URL used for communication with the agent
   */
  serviceUrl: string;
}

/**
 * Data structure to store conversation state for agent interactions
 */
export interface ConversationData {
  /**
   * Flag indicating whether a name was requested from the agent
   */
  nameRequested: boolean;
  /**
   * Reference to the conversation for maintaining context across interactions
   */
  conversationReference: ConversationReference;
}

/**
 * Client for communicating with other agents through HTTP requests.
 * Manages configuration, authentication, and activity exchange with target agents.
 */
export class AgentClient {
  /** Configuration settings for the agent client */
  agentClientConfig: AgentClientConfig

  /**
   * Creates a new instance of the AgentClient class.
   *
   * @param agentConfigKey The name of the agent, used to locate configuration in environment variables
   * @throws Error if required configuration is missing
   */
  public constructor (agentConfigKey: string) {
    this.agentClientConfig = this.loadAgentClientConfig(agentConfigKey)
  }

  /**
   * Sends an activity to another agent and handles the conversation state.
   *
   * @param activity The activity to send to the target agent
   * @param authConfig Authentication configuration used to obtain access tokens
   * @param conversationState State manager to store conversation data
   * @param context The current turn context
   * @returns A promise that resolves to the HTTP status text of the agent response
   * @throws Error if the request to the agent endpoint fails
   */
  public async postActivity (activity: Activity, authConfig: AuthConfiguration, conversationState: ConversationState, context: TurnContext): Promise<string> {
    const activityCopy = activity.clone()
    activityCopy.serviceUrl = this.agentClientConfig.serviceUrl
    activityCopy.recipient = { ...activityCopy.recipient, role: RoleTypes.Skill }
    activityCopy.relatesTo = {
      serviceUrl: activity.serviceUrl,
      activityId: activityCopy.id,
      channelId: activityCopy.channelId!,
      locale: activityCopy.locale,
      conversation: {
        id: activity.conversation!.id,
        ...activityCopy.conversation
      }
    }
    activityCopy.conversation!.id = v4()

    const conversationDataAccessor = conversationState.createProperty<ConversationData>(activityCopy.conversation!.id)
    const convRef = await conversationDataAccessor.set(context,
      { conversationReference: activity.getConversationReference(), nameRequested: false },
      { channelId: activityCopy.channelId!, conversationId: activityCopy.conversation!.id }
    )

    const stateChanges = JSON.stringify(convRef)
    logger.debug('stateChanges: ', stateChanges)

    const authProvider = new MsalTokenProvider(authConfig)
    const token = await authProvider.getAccessToken(this.agentClientConfig.clientId)

    logger.debug('agent request: ', activityCopy)

    let authHeader = '' // Allow anonymous auth.

    if (token.trim().length > 0) {
      authHeader = `Bearer ${token}`
    }

    await conversationState.saveChanges(context, false, { channelId: activityCopy.channelId!, conversationId: activityCopy.conversation!.id })
    const response = await fetch(this.agentClientConfig.endPoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'x-ms-conversation-id': activityCopy.conversation!.id
      },
      body: JSON.stringify(activityCopy)
    })
    if (!response.ok) {
      await conversationDataAccessor.delete(context, { channelId: activityCopy.channelId!, conversationId: activityCopy.conversation!.id })
      throw new Error(`Failed to post activity to agent: ${response.statusText}`)
    }
    return response.statusText
  }

  /**
   * Loads agent configuration from environment variables based on the agent name.
   *
   * @param agentName The name of the agent to load configuration for
   * @returns The agent client configuration
   * @throws Error if any required configuration is missing
   * @private
   */
  private loadAgentClientConfig (agentName: string): AgentClientConfig {
    if (agentName) {
      if (process.env[`${agentName}_endpoint`] !== undefined &&
        process.env[`${agentName}_clientId`] !== undefined &&
        process.env[`${agentName}_serviceUrl`] !== undefined) {
        return {
          endPoint: process.env[`${agentName}_endpoint`]!,
          clientId: process.env[`${agentName}_clientId`]!,
          serviceUrl: process.env[`${agentName}_serviceUrl`]!
        }
      } else {
        throw new Error(`Missing agent client config for agent ${agentName}`)
      }
    } else {
      throw new Error('Agent name is required')
    }
  }
}
