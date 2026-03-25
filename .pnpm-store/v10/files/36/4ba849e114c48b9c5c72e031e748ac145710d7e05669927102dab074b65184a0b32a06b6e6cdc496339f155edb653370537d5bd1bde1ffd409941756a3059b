import { MistralCore } from "../core.js";
import { EventStream } from "../lib/event-streams.js";
import { RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import * as errors from "../models/errors/index.js";
import { MistralError } from "../models/errors/mistralerror.js";
import { ResponseValidationError } from "../models/errors/responsevalidationerror.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import * as operations from "../models/operations/index.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Restart a conversation starting from a given entry.
 *
 * @remarks
 * Given a conversation_id and an id, recreate a conversation from this point and run completion. A new conversation is returned with the new entries returned.
 */
export declare function betaConversationsRestartStream(client: MistralCore, request: operations.AgentsApiV1ConversationsRestartStreamRequest, options?: RequestOptions): APIPromise<Result<EventStream<components.ConversationEvents>, errors.HTTPValidationError | MistralError | ResponseValidationError | ConnectionError | RequestAbortedError | RequestTimeoutError | InvalidRequestError | UnexpectedClientError | SDKValidationError>>;
//# sourceMappingURL=betaConversationsRestartStream.d.ts.map