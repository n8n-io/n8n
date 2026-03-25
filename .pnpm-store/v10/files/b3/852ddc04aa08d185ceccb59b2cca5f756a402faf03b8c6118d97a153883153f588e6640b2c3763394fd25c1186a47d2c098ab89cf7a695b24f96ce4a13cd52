import { MistralCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import * as errors from "../models/errors/index.js";
import { MistralError } from "../models/errors/mistralerror.js";
import { ResponseValidationError } from "../models/errors/responsevalidationerror.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a conversation and append entries to it.
 *
 * @remarks
 * Create a new conversation, using a base model or an agent and append entries. Completion and tool executions are run and the response is appended to the conversation.Use the returned conversation_id to continue the conversation.
 */
export declare function betaConversationsStart(client: MistralCore, request: components.ConversationRequest, options?: RequestOptions): APIPromise<Result<components.ConversationResponse, errors.HTTPValidationError | MistralError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=betaConversationsStart.d.ts.map