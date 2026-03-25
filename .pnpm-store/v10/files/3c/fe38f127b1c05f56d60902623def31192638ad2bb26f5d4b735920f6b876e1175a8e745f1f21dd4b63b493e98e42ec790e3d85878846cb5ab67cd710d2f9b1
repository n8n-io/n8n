import { createPaginator } from "@smithy/core";
import { BedrockRuntimeClient } from "../BedrockRuntimeClient";
import { ListAsyncInvokesCommand, } from "../commands/ListAsyncInvokesCommand";
export const paginateListAsyncInvokes = createPaginator(BedrockRuntimeClient, ListAsyncInvokesCommand, "nextToken", "nextToken", "maxResults");
