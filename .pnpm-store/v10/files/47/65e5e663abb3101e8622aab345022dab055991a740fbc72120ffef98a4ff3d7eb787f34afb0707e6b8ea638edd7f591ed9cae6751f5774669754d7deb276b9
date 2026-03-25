import { AuthConfiguration } from '../auth';
import { Activity, ConversationReference } from '@microsoft/agents-activity';
import { ConversationState } from '../state';
import { TurnContext } from '../turnContext';
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
export declare class AgentClient {
    /** Configuration settings for the agent client */
    agentClientConfig: AgentClientConfig;
    /**
     * Creates a new instance of the AgentClient class.
     *
     * @param agentConfigKey The name of the agent, used to locate configuration in environment variables
     * @throws Error if required configuration is missing
     */
    constructor(agentConfigKey: string);
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
    postActivity(activity: Activity, authConfig: AuthConfiguration, conversationState: ConversationState, context: TurnContext): Promise<string>;
    /**
     * Loads agent configuration from environment variables based on the agent name.
     *
     * @param agentName The name of the agent to load configuration for
     * @returns The agent client configuration
     * @throws Error if any required configuration is missing
     * @private
     */
    private loadAgentClientConfig;
}
