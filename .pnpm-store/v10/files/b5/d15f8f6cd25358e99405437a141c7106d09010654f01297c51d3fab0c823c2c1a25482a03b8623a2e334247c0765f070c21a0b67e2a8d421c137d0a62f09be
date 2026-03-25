import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { STSServiceException as __BaseException } from "./STSServiceException";
/**
 * <p>The web identity token that was passed is expired or is not valid. Get a new identity
 *             token from the identity provider and then retry the request.</p>
 * @public
 */
export declare class ExpiredTokenException extends __BaseException {
    readonly name: "ExpiredTokenException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ExpiredTokenException, __BaseException>);
}
/**
 * <p>The request was rejected because the policy document was malformed. The error message
 *             describes the specific error.</p>
 * @public
 */
export declare class MalformedPolicyDocumentException extends __BaseException {
    readonly name: "MalformedPolicyDocumentException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MalformedPolicyDocumentException, __BaseException>);
}
/**
 * <p>The request was rejected because the total packed size of the session policies and
 *             session tags combined was too large. An Amazon Web Services conversion compresses the session policy
 *             document, session policy ARNs, and session tags into a packed binary format that has a
 *             separate limit. The error message indicates by percentage how close the policies and
 *             tags are to the upper size limit. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html">Passing Session Tags in STS</a> in
 *             the <i>IAM User Guide</i>.</p>
 *          <p>You could receive this error even though you meet other defined session policy and
 *             session tag limits. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html#reference_iam-limits-entity-length">IAM and STS Entity Character Limits</a> in the <i>IAM User
 *                 Guide</i>.</p>
 * @public
 */
export declare class PackedPolicyTooLargeException extends __BaseException {
    readonly name: "PackedPolicyTooLargeException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<PackedPolicyTooLargeException, __BaseException>);
}
/**
 * <p>STS is not activated in the requested region for the account that is being asked to
 *             generate credentials. The account administrator must use the IAM console to activate
 *             STS in that region. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html#sts-regions-activate-deactivate">Activating and
 *                 Deactivating STS in an Amazon Web Services Region</a> in the <i>IAM User
 *                 Guide</i>.</p>
 * @public
 */
export declare class RegionDisabledException extends __BaseException {
    readonly name: "RegionDisabledException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<RegionDisabledException, __BaseException>);
}
/**
 * <p>The identity provider (IdP) reported that authentication failed. This might be because
 *             the claim is invalid.</p>
 *          <p>If this error is returned for the <code>AssumeRoleWithWebIdentity</code> operation, it
 *             can also mean that the claim has expired or has been explicitly revoked. </p>
 * @public
 */
export declare class IDPRejectedClaimException extends __BaseException {
    readonly name: "IDPRejectedClaimException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<IDPRejectedClaimException, __BaseException>);
}
/**
 * <p>The web identity token that was passed could not be validated by Amazon Web Services. Get a new
 *             identity token from the identity provider and then retry the request.</p>
 * @public
 */
export declare class InvalidIdentityTokenException extends __BaseException {
    readonly name: "InvalidIdentityTokenException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidIdentityTokenException, __BaseException>);
}
/**
 * <p>The request could not be fulfilled because the identity provider (IDP) that was asked
 *             to verify the incoming identity token could not be reached. This is often a transient
 *             error caused by network conditions. Retry the request a limited number of times so that
 *             you don't exceed the request rate. If the error persists, the identity provider might be
 *             down or not responding.</p>
 * @public
 */
export declare class IDPCommunicationErrorException extends __BaseException {
    readonly name: "IDPCommunicationErrorException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<IDPCommunicationErrorException, __BaseException>);
}
