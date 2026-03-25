import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { ListSessionsCommand, } from "../commands/ListSessionsCommand";
export const paginateListSessions = createPaginator(BedrockAgentRuntimeClient, ListSessionsCommand, "nextToken", "nextToken", "maxResults");
