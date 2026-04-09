import type { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { BedrockRuntimeServiceException as __BaseException } from "./BedrockRuntimeServiceException";
/**
 * <p>The request is denied because you do not have sufficient permissions to perform the requested action. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-access-denied">AccessDeniedException</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export declare class AccessDeniedException extends __BaseException {
    readonly name: "AccessDeniedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
/**
 * <p>An internal server error occurred. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-internal-failure">InternalFailure</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>Your request was denied due to exceeding the account quotas for <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-throttling-exception">ThrottlingException</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export declare class ThrottlingException extends __BaseException {
    readonly name: "ThrottlingException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ThrottlingException, __BaseException>);
}
/**
 * <p>The input fails to satisfy the constraints specified by <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-validation-error">ValidationError</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export declare class ValidationException extends __BaseException {
    readonly name: "ValidationException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ValidationException, __BaseException>);
}
/**
 * <p>Error occurred because of a conflict while performing an operation.</p>
 * @public
 */
export declare class ConflictException extends __BaseException {
    readonly name: "ConflictException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
/**
 * <p>The specified resource ARN was not found. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-resource-not-found">ResourceNotFound</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export declare class ResourceNotFoundException extends __BaseException {
    readonly name: "ResourceNotFoundException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>);
}
/**
 * <p>Your request exceeds the service quota for your account. You can view your quotas at <a href="https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html">Viewing service quotas</a>. You can resubmit your request later.</p>
 * @public
 */
export declare class ServiceQuotaExceededException extends __BaseException {
    readonly name: "ServiceQuotaExceededException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceQuotaExceededException, __BaseException>);
}
/**
 * <p>The service isn't currently available. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-service-unavailable">ServiceUnavailable</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export declare class ServiceUnavailableException extends __BaseException {
    readonly name: "ServiceUnavailableException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceUnavailableException, __BaseException>);
}
/**
 * <p>The request failed due to an error while processing the model.</p>
 * @public
 */
export declare class ModelErrorException extends __BaseException {
    readonly name: "ModelErrorException";
    readonly $fault: "client";
    /**
     * <p>The original status code.</p>
     * @public
     */
    originalStatusCode?: number | undefined;
    /**
     * <p>The resource name.</p>
     * @public
     */
    resourceName?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ModelErrorException, __BaseException>);
}
/**
 * <p>The model specified in the request is not ready to serve inference requests. The AWS SDK will automatically retry the operation up to 5 times. For information about configuring automatic retries, see <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html">Retry behavior</a> in the <i>AWS SDKs and Tools</i> reference guide.</p>
 * @public
 */
export declare class ModelNotReadyException extends __BaseException {
    readonly name: "ModelNotReadyException";
    readonly $fault: "client";
    $retryable: {};
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ModelNotReadyException, __BaseException>);
}
/**
 * <p>The request took too long to process. Processing time exceeded the model timeout length.</p>
 * @public
 */
export declare class ModelTimeoutException extends __BaseException {
    readonly name: "ModelTimeoutException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ModelTimeoutException, __BaseException>);
}
/**
 * <p>An error occurred while streaming the response. Retry your request.</p>
 * @public
 */
export declare class ModelStreamErrorException extends __BaseException {
    readonly name: "ModelStreamErrorException";
    readonly $fault: "client";
    /**
     * <p>The original status code.</p>
     * @public
     */
    originalStatusCode?: number | undefined;
    /**
     * <p>The original message.</p>
     * @public
     */
    originalMessage?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ModelStreamErrorException, __BaseException>);
}
