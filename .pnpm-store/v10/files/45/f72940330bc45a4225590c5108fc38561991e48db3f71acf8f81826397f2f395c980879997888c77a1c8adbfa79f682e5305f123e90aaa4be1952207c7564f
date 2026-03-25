import { createPaginator } from "@smithy/core";
import { BedrockAgentRuntimeClient } from "../BedrockAgentRuntimeClient";
import { GetAgentMemoryCommand, } from "../commands/GetAgentMemoryCommand";
export const paginateGetAgentMemory = createPaginator(BedrockAgentRuntimeClient, GetAgentMemoryCommand, "nextToken", "nextToken", "maxItems");
