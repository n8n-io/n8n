import { createAggregatedClient } from "@smithy/smithy-client";
import { BedrockAgentRuntimeClient } from "./BedrockAgentRuntimeClient";
import { CreateInvocationCommand, } from "./commands/CreateInvocationCommand";
import { CreateSessionCommand, } from "./commands/CreateSessionCommand";
import { DeleteAgentMemoryCommand, } from "./commands/DeleteAgentMemoryCommand";
import { DeleteSessionCommand, } from "./commands/DeleteSessionCommand";
import { EndSessionCommand } from "./commands/EndSessionCommand";
import { GenerateQueryCommand, } from "./commands/GenerateQueryCommand";
import { GetAgentMemoryCommand, } from "./commands/GetAgentMemoryCommand";
import { GetExecutionFlowSnapshotCommand, } from "./commands/GetExecutionFlowSnapshotCommand";
import { GetFlowExecutionCommand, } from "./commands/GetFlowExecutionCommand";
import { GetInvocationStepCommand, } from "./commands/GetInvocationStepCommand";
import { GetSessionCommand } from "./commands/GetSessionCommand";
import { InvokeAgentCommand } from "./commands/InvokeAgentCommand";
import { InvokeFlowCommand } from "./commands/InvokeFlowCommand";
import { InvokeInlineAgentCommand, } from "./commands/InvokeInlineAgentCommand";
import { ListFlowExecutionEventsCommand, } from "./commands/ListFlowExecutionEventsCommand";
import { ListFlowExecutionsCommand, } from "./commands/ListFlowExecutionsCommand";
import { ListInvocationsCommand, } from "./commands/ListInvocationsCommand";
import { ListInvocationStepsCommand, } from "./commands/ListInvocationStepsCommand";
import { ListSessionsCommand, } from "./commands/ListSessionsCommand";
import { ListTagsForResourceCommand, } from "./commands/ListTagsForResourceCommand";
import { OptimizePromptCommand, } from "./commands/OptimizePromptCommand";
import { PutInvocationStepCommand, } from "./commands/PutInvocationStepCommand";
import { RerankCommand } from "./commands/RerankCommand";
import { RetrieveAndGenerateCommand, } from "./commands/RetrieveAndGenerateCommand";
import { RetrieveAndGenerateStreamCommand, } from "./commands/RetrieveAndGenerateStreamCommand";
import { RetrieveCommand } from "./commands/RetrieveCommand";
import { StartFlowExecutionCommand, } from "./commands/StartFlowExecutionCommand";
import { StopFlowExecutionCommand, } from "./commands/StopFlowExecutionCommand";
import { TagResourceCommand } from "./commands/TagResourceCommand";
import { UntagResourceCommand, } from "./commands/UntagResourceCommand";
import { UpdateSessionCommand, } from "./commands/UpdateSessionCommand";
import { paginateGetAgentMemory } from "./pagination/GetAgentMemoryPaginator";
import { paginateListFlowExecutionEvents } from "./pagination/ListFlowExecutionEventsPaginator";
import { paginateListFlowExecutions } from "./pagination/ListFlowExecutionsPaginator";
import { paginateListInvocations } from "./pagination/ListInvocationsPaginator";
import { paginateListInvocationSteps } from "./pagination/ListInvocationStepsPaginator";
import { paginateListSessions } from "./pagination/ListSessionsPaginator";
import { paginateRerank } from "./pagination/RerankPaginator";
import { paginateRetrieve } from "./pagination/RetrievePaginator";
const commands = {
    CreateInvocationCommand,
    CreateSessionCommand,
    DeleteAgentMemoryCommand,
    DeleteSessionCommand,
    EndSessionCommand,
    GenerateQueryCommand,
    GetAgentMemoryCommand,
    GetExecutionFlowSnapshotCommand,
    GetFlowExecutionCommand,
    GetInvocationStepCommand,
    GetSessionCommand,
    InvokeAgentCommand,
    InvokeFlowCommand,
    InvokeInlineAgentCommand,
    ListFlowExecutionEventsCommand,
    ListFlowExecutionsCommand,
    ListInvocationsCommand,
    ListInvocationStepsCommand,
    ListSessionsCommand,
    ListTagsForResourceCommand,
    OptimizePromptCommand,
    PutInvocationStepCommand,
    RerankCommand,
    RetrieveCommand,
    RetrieveAndGenerateCommand,
    RetrieveAndGenerateStreamCommand,
    StartFlowExecutionCommand,
    StopFlowExecutionCommand,
    TagResourceCommand,
    UntagResourceCommand,
    UpdateSessionCommand,
};
const paginators = {
    paginateGetAgentMemory,
    paginateListFlowExecutionEvents,
    paginateListFlowExecutions,
    paginateListInvocations,
    paginateListInvocationSteps,
    paginateListSessions,
    paginateRerank,
    paginateRetrieve,
};
export class BedrockAgentRuntime extends BedrockAgentRuntimeClient {
}
createAggregatedClient(commands, BedrockAgentRuntime, { paginators });
