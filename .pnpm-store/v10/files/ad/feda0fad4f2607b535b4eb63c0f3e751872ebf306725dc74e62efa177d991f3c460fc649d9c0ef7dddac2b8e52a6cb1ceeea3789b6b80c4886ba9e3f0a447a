import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { RetrieveCommand } from "../commands/RetrieveCommand";
export const paginateRetrieve = createPaginator(BedrockAgentRuntimeClient, RetrieveCommand, "nextToken", "nextToken", "");
