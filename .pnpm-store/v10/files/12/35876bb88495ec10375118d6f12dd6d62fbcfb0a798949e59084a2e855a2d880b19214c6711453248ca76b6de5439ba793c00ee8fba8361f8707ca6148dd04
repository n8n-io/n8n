import type { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { BedrockAgentRuntimeServiceException as __BaseException } from "./BedrockAgentRuntimeServiceException";
/**
 * <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
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
 * <p>An internal server error occurred. Retry your request.</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    /**
     * <p>The reason for the exception. If the reason is <code>BEDROCK_MODEL_INVOCATION_SERVICE_UNAVAILABLE</code>, the model invocation service is unavailable. Retry your request.</p>
     * @public
     */
    reason?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again.</p>
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
 * <p>The number of requests exceeds the limit. Resubmit your request later.</p>
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
 * <p>Input validation failed. Check your request parameters and retry the request.</p>
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
 * <p>There was an issue with a dependency due to a server issue. Retry your request.</p>
 * @public
 */
export declare class BadGatewayException extends __BaseException {
    readonly name: "BadGatewayException";
    readonly $fault: "server";
    /**
     * <p>The name of the dependency that caused the issue, such as Amazon Bedrock, Lambda, or STS.</p>
     * @public
     */
    resourceName?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<BadGatewayException, __BaseException>);
}
/**
 * <p>There was a conflict performing an operation. Resolve the conflict and retry your request.</p>
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
 * <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
 * @public
 */
export declare class DependencyFailedException extends __BaseException {
    readonly name: "DependencyFailedException";
    readonly $fault: "client";
    /**
     * <p>The name of the dependency that caused the issue, such as Amazon Bedrock, Lambda, or STS.</p>
     * @public
     */
    resourceName?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<DependencyFailedException, __BaseException>);
}
/**
 * <p>The number of requests exceeds the service quota. Resubmit your request later.</p>
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
 * <p> The model specified in the request is not ready to serve inference requests. The AWS SDK will automatically retry the operation up to 5 times. For information about configuring automatic retries, see <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html">Retry behavior</a> in the <i>AWS SDKs and Tools</i> reference guide. </p>
 * @public
 */
export declare class ModelNotReadyException extends __BaseException {
    readonly name: "ModelNotReadyException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ModelNotReadyException, __BaseException>);
}
