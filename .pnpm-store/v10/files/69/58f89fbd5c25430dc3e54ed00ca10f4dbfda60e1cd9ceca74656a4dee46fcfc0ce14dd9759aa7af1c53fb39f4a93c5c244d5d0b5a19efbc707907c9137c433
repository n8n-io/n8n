import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { ListFlowExecutionEventsCommand, } from "../commands/ListFlowExecutionEventsCommand";
export const paginateListFlowExecutionEvents = createPaginator(BedrockAgentRuntimeClient, ListFlowExecutionEventsCommand, "nextToken", "nextToken", "maxResults");
