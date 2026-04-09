import type { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { KendraServiceException as __BaseException } from "./KendraServiceException";
import { ConflictingItem } from "./models_0";
/**
 * <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 * @public
 */
export declare class AccessDeniedException extends __BaseException {
    readonly name: "AccessDeniedException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
/**
 * <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>The resource you want to use already exists. Please check you have provided the
 *             correct resource and try again.</p>
 * @public
 */
export declare class ResourceAlreadyExistException extends __BaseException {
    readonly name: "ResourceAlreadyExistException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceAlreadyExistException, __BaseException>);
}
/**
 * <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 * @public
 */
export declare class ResourceNotFoundException extends __BaseException {
    readonly name: "ResourceNotFoundException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>);
}
/**
 * <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 * @public
 */
export declare class ThrottlingException extends __BaseException {
    readonly name: "ThrottlingException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ThrottlingException, __BaseException>);
}
/**
 * <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 * @public
 */
export declare class ValidationException extends __BaseException {
    readonly name: "ValidationException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ValidationException, __BaseException>);
}
/**
 * <p>A conflict occurred with the request. Please fix any inconsistences with your
 *             resources and try again.</p>
 * @public
 */
export declare class ConflictException extends __BaseException {
    readonly name: "ConflictException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
/**
 * <p>You have exceeded the set limits for your Amazon Kendra service. Please see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas</a> for
 *             more information, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> to inquire about
 *             an increase of limits.</p>
 * @public
 */
export declare class ServiceQuotaExceededException extends __BaseException {
    readonly name: "ServiceQuotaExceededException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceQuotaExceededException, __BaseException>);
}
/**
 * <p>An error message with a list of conflicting queries used across different sets
 *             of featured results. This occurred with the request for a new featured results set.
 *             Check that the queries you specified for featured results are unique per featured
 *             results set for each index.</p>
 * @public
 */
export declare class FeaturedResultsConflictException extends __BaseException {
    readonly name: "FeaturedResultsConflictException";
    readonly $fault: "client";
    /**
     * <p>An explanation for the conflicting queries.</p>
     * @public
     */
    Message?: string | undefined;
    /**
     * <p>A list of the conflicting queries, including the query text, the name for
     *             the featured results set, and the identifier of the featured results set.</p>
     * @public
     */
    ConflictingItems?: ConflictingItem[] | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<FeaturedResultsConflictException, __BaseException>);
}
/**
 * <p>The input to the request is not valid. Please provide the correct input and try
 *             again.</p>
 * @public
 */
export declare class InvalidRequestException extends __BaseException {
    readonly name: "InvalidRequestException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
}
/**
 * <p>The resource you want to use isn't available. Please check you have provided the
 *             correct resource and try again.</p>
 * @public
 */
export declare class ResourceUnavailableException extends __BaseException {
    readonly name: "ResourceUnavailableException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceUnavailableException, __BaseException>);
}
/**
 * <p>The resource you want to use is currently in use. Please check you have provided the
 *             correct resource and try again.</p>
 * @public
 */
export declare class ResourceInUseException extends __BaseException {
    readonly name: "ResourceInUseException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceInUseException, __BaseException>);
}
