import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { ListInvocationStepsCommand, } from "../commands/ListInvocationStepsCommand";
export const paginateListInvocationSteps = createPaginator(BedrockAgentRuntimeClient, ListInvocationStepsCommand, "nextToken", "nextToken", "maxResults");
