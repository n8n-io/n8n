import * as z from "zod/v3";
import { ApiEndpoint } from "./apiendpoint.js";
import { BatchRequest, BatchRequest$Outbound } from "./batchrequest.js";
export type BatchJobIn = {
    /**
     * The list of input files to be used for batch inference, these files should be `jsonl` files, containing the input data corresponding to the bory request for the batch inference in a "body" field. An example of such file is the following: ```json {"custom_id": "0", "body": {"max_tokens": 100, "messages": [{"role": "user", "content": "What is the best French cheese?"}]}} {"custom_id": "1", "body": {"max_tokens": 100, "messages": [{"role": "user", "content": "What is the best French wine?"}]}} ```
     */
    inputFiles?: Array<string> | null | undefined;
    requests?: Array<BatchRequest> | null | undefined;
    endpoint: ApiEndpoint;
    /**
     * The model to be used for batch inference.
     */
    model?: string | null | undefined;
    /**
     * In case you want to use a specific agent from the **deprecated** agents api for batch inference, you can specify the agent ID here.
     */
    agentId?: string | null | undefined;
    /**
     * The metadata of your choice to be associated with the batch inference job.
     */
    metadata?: {
        [k: string]: string;
    } | null | undefined;
    /**
     * The timeout in hours for the batch inference job.
     */
    timeoutHours?: number | undefined;
};
/** @internal */
export type BatchJobIn$Outbound = {
    input_files?: Array<string> | null | undefined;
    requests?: Array<BatchRequest$Outbound> | null | undefined;
    endpoint: string;
    model?: string | null | undefined;
    agent_id?: string | null | undefined;
    metadata?: {
        [k: string]: string;
    } | null | undefined;
    timeout_hours: number;
};
/** @internal */
export declare const BatchJobIn$outboundSchema: z.ZodType<BatchJobIn$Outbound, z.ZodTypeDef, BatchJobIn>;
export declare function batchJobInToJSON(batchJobIn: BatchJobIn): string;
//# sourceMappingURL=batchjobin.d.ts.map