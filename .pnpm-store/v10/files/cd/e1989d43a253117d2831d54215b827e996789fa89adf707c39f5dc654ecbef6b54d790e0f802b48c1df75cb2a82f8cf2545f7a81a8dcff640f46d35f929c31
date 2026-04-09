import { AgentCollaboration, OrchestrationType } from "./enums";
import {
  CustomOrchestration,
  GuardrailConfigurationWithArn,
  InlineBedrockModelConfigurations,
  InlineSessionState,
  PromptCreationConfigurations,
  PromptOverrideConfiguration,
  StreamingConfigurations,
  AgentActionGroup,
  Collaborator,
  CollaboratorConfiguration,
  KnowledgeBase,
} from "./models_0";
export interface InvokeInlineAgentRequest {
  customerEncryptionKeyArn?: string | undefined;
  foundationModel: string | undefined;
  instruction: string | undefined;
  idleSessionTTLInSeconds?: number | undefined;
  actionGroups?: AgentActionGroup[] | undefined;
  knowledgeBases?: KnowledgeBase[] | undefined;
  guardrailConfiguration?: GuardrailConfigurationWithArn | undefined;
  promptOverrideConfiguration?: PromptOverrideConfiguration | undefined;
  agentCollaboration?: AgentCollaboration | undefined;
  collaboratorConfigurations?: CollaboratorConfiguration[] | undefined;
  agentName?: string | undefined;
  sessionId: string | undefined;
  endSession?: boolean | undefined;
  enableTrace?: boolean | undefined;
  inputText?: string | undefined;
  streamingConfigurations?: StreamingConfigurations | undefined;
  promptCreationConfigurations?: PromptCreationConfigurations | undefined;
  inlineSessionState?: InlineSessionState | undefined;
  collaborators?: Collaborator[] | undefined;
  bedrockModelConfigurations?: InlineBedrockModelConfigurations | undefined;
  orchestrationType?: OrchestrationType | undefined;
  customOrchestration?: CustomOrchestration | undefined;
}
