import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { ListInvocationsCommand, } from "../commands/ListInvocationsCommand";
export const paginateListInvocations = createPaginator(BedrockAgentRuntimeClient, ListInvocationsCommand, "nextToken", "nextToken", "maxResults");
