import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { ListFlowExecutionsCommand, } from "../commands/ListFlowExecutionsCommand";
export const paginateListFlowExecutions = createPaginator(BedrockAgentRuntimeClient, ListFlowExecutionsCommand, "nextToken", "nextToken", "maxResults");
