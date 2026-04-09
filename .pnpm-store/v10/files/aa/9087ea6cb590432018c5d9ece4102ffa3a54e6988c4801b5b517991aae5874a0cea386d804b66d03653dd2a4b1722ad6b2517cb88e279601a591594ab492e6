import { AgentCollaboration, OrchestrationType } from "./enums";
import { type CustomOrchestration, type GuardrailConfigurationWithArn, type InlineBedrockModelConfigurations, type InlineSessionState, type PromptCreationConfigurations, type PromptOverrideConfiguration, type StreamingConfigurations, AgentActionGroup, Collaborator, CollaboratorConfiguration, KnowledgeBase } from "./models_0";
/**
 * @public
 */
export interface InvokeInlineAgentRequest {
    /**
     * <p> The Amazon Resource Name (ARN) of the Amazon Web Services KMS key to use to encrypt your inline agent. </p>
     * @public
     */
    customerEncryptionKeyArn?: string | undefined;
    /**
     * <p> The <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns">model identifier (ID)</a> of the model to use for orchestration by the inline agent. For example, <code>meta.llama3-1-70b-instruct-v1:0</code>. </p>
     * @public
     */
    foundationModel: string | undefined;
    /**
     * <p> The instructions that tell the inline agent what it should do and how it should interact with users. </p>
     * @public
     */
    instruction: string | undefined;
    /**
     * <p> The number of seconds for which the inline agent should maintain session information. After this time expires, the subsequent <code>InvokeInlineAgent</code> request begins a new session. </p> <p>A user interaction remains active for the amount of time specified. If no conversation occurs during this time, the session expires and the data provided before the timeout is deleted.</p>
     * @public
     */
    idleSessionTTLInSeconds?: number | undefined;
    /**
     * <p> A list of action groups with each action group defining the action the inline agent needs to carry out. </p>
     * @public
     */
    actionGroups?: AgentActionGroup[] | undefined;
    /**
     * <p> Contains information of the knowledge bases to associate with. </p>
     * @public
     */
    knowledgeBases?: KnowledgeBase[] | undefined;
    /**
     * <p> The <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html">guardrails</a> to assign to the inline agent. </p>
     * @public
     */
    guardrailConfiguration?: GuardrailConfigurationWithArn | undefined;
    /**
     * <p> Configurations for advanced prompts used to override the default prompts to enhance the accuracy of the inline agent. </p>
     * @public
     */
    promptOverrideConfiguration?: PromptOverrideConfiguration | undefined;
    /**
     * <p> Defines how the inline collaborator agent handles information across multiple collaborator agents to coordinate a final response. The inline collaborator agent can also be the supervisor. </p>
     * @public
     */
    agentCollaboration?: AgentCollaboration | undefined;
    /**
     * <p> Settings for an inline agent collaborator called with <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeInlineAgent.html">InvokeInlineAgent</a>. </p>
     * @public
     */
    collaboratorConfigurations?: CollaboratorConfiguration[] | undefined;
    /**
     * <p>The name for the agent.</p>
     * @public
     */
    agentName?: string | undefined;
    /**
     * <p> The unique identifier of the session. Use the same value across requests to continue the same conversation. </p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p> Specifies whether to end the session with the inline agent or not. </p>
     * @public
     */
    endSession?: boolean | undefined;
    /**
     * <p> Specifies whether to turn on the trace or not to track the agent's reasoning process. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html">Using trace</a>. </p>
     * @public
     */
    enableTrace?: boolean | undefined;
    /**
     * <p> The prompt text to send to the agent. </p> <note> <p>If you include <code>returnControlInvocationResults</code> in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    inputText?: string | undefined;
    /**
     * <p> Specifies the configurations for streaming. </p> <note> <p>To use agent streaming, you need permissions to perform the <code>bedrock:InvokeModelWithResponseStream</code> action.</p> </note>
     * @public
     */
    streamingConfigurations?: StreamingConfigurations | undefined;
    /**
     * <p>Specifies parameters that control how the service populates the agent prompt for an <code>InvokeInlineAgent</code> request. You can control which aspects of previous invocations in the same agent session the service uses to populate the agent prompt. This gives you more granular control over the contextual history that is used to process the current request.</p>
     * @public
     */
    promptCreationConfigurations?: PromptCreationConfigurations | undefined;
    /**
     * <p> Parameters that specify the various attributes of a sessions. You can include attributes for the session or prompt or, if you configured an action group to return control, results from invocation of the action group. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>. </p> <note> <p>If you include <code>returnControlInvocationResults</code> in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    inlineSessionState?: InlineSessionState | undefined;
    /**
     * <p> List of collaborator inline agents. </p>
     * @public
     */
    collaborators?: Collaborator[] | undefined;
    /**
     * <p>Model settings for the request.</p>
     * @public
     */
    bedrockModelConfigurations?: InlineBedrockModelConfigurations | undefined;
    /**
     * <p>Specifies the type of orchestration strategy for the agent. This is set to DEFAULT orchestration type, by default. </p>
     * @public
     */
    orchestrationType?: OrchestrationType | undefined;
    /**
     * <p>Contains details of the custom orchestration configured for the agent. </p>
     * @public
     */
    customOrchestration?: CustomOrchestration | undefined;
}
