import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SESv2ServiceException as __BaseException } from "./SESv2ServiceException";
/**
 * @public
 * @enum
 */
export declare const ContactLanguage: {
    readonly EN: "EN";
    readonly JA: "JA";
};
/**
 * @public
 */
export type ContactLanguage = (typeof ContactLanguage)[keyof typeof ContactLanguage];
/**
 * @public
 * @enum
 */
export declare const MailType: {
    readonly MARKETING: "MARKETING";
    readonly TRANSACTIONAL: "TRANSACTIONAL";
};
/**
 * @public
 */
export type MailType = (typeof MailType)[keyof typeof MailType];
/**
 * @public
 * @enum
 */
export declare const ReviewStatus: {
    readonly DENIED: "DENIED";
    readonly FAILED: "FAILED";
    readonly GRANTED: "GRANTED";
    readonly PENDING: "PENDING";
};
/**
 * @public
 */
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
/**
 * <p>An object that contains information about your account details review.</p>
 * @public
 */
export interface ReviewDetails {
    /**
     * <p>The status of the latest review of your account. The status can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>PENDING</code> – We have received your appeal and are in the
     *                     process of reviewing it.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>GRANTED</code> – Your appeal has been reviewed and your production
     *                     access has been granted.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DENIED</code> – Your appeal has been reviewed and your production
     *                     access has been denied.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – An internal error occurred and we didn't receive
     *                     your appeal. You can submit your appeal again.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: ReviewStatus | undefined;
    /**
     * <p>The associated support center case ID (if any).</p>
     * @public
     */
    CaseId?: string | undefined;
}
/**
 * <p>An object that contains information about your account details.</p>
 * @public
 */
export interface AccountDetails {
    /**
     * <p>The type of email your account is sending. The mail type can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>MARKETING</code> – Most of your sending traffic is to keep your
     *                     customers informed of your latest offering.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TRANSACTIONAL</code> – Most of your sending traffic is to
     *                     communicate during a transaction with a customer.</p>
     *             </li>
     *          </ul>
     * @public
     */
    MailType?: MailType | undefined;
    /**
     * <p>The URL of your website. This information helps us better understand the type of
     *             content that you plan to send.</p>
     * @public
     */
    WebsiteURL?: string | undefined;
    /**
     * <p>The language you would prefer for the case. The contact language can be one of
     *                 <code>ENGLISH</code> or <code>JAPANESE</code>.</p>
     * @public
     */
    ContactLanguage?: ContactLanguage | undefined;
    /**
     * <p>A description of the types of email that you plan to send.</p>
     *
     * @deprecated Use case description is optional and deprecated
     * @public
     */
    UseCaseDescription?: string | undefined;
    /**
     * <p>Additional email addresses where updates are sent about your account review
     *             process.</p>
     * @public
     */
    AdditionalContactEmailAddresses?: string[] | undefined;
    /**
     * <p>Information about the review of the latest details you submitted.</p>
     * @public
     */
    ReviewDetails?: ReviewDetails | undefined;
}
/**
 * <p>The message can't be sent because the account's ability to send email has been
 *             permanently restricted.</p>
 * @public
 */
export declare class AccountSuspendedException extends __BaseException {
    readonly name: "AccountSuspendedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccountSuspendedException, __BaseException>);
}
/**
 * <p>The resource specified in your request already exists.</p>
 * @public
 */
export declare class AlreadyExistsException extends __BaseException {
    readonly name: "AlreadyExistsException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AlreadyExistsException, __BaseException>);
}
/**
 * <p>Used to associate a configuration set with a MailManager archive.</p>
 * @public
 */
export interface ArchivingOptions {
    /**
     * <p>The Amazon Resource Name (ARN) of the MailManager archive where the Amazon SES API v2 will archive sent
     *         emails.</p>
     * @public
     */
    ArchiveArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const AttachmentContentDisposition: {
    readonly ATTACHMENT: "ATTACHMENT";
    readonly INLINE: "INLINE";
};
/**
 * @public
 */
export type AttachmentContentDisposition = (typeof AttachmentContentDisposition)[keyof typeof AttachmentContentDisposition];
/**
 * @public
 * @enum
 */
export declare const AttachmentContentTransferEncoding: {
    readonly BASE64: "BASE64";
    readonly QUOTED_PRINTABLE: "QUOTED_PRINTABLE";
    readonly SEVEN_BIT: "SEVEN_BIT";
};
/**
 * @public
 */
export type AttachmentContentTransferEncoding = (typeof AttachmentContentTransferEncoding)[keyof typeof AttachmentContentTransferEncoding];
/**
 * <p> Contains metadata and attachment raw content.</p>
 * @public
 */
export interface Attachment {
    /**
     * <p> The raw data of the attachment. It needs to be base64-encoded if you are accessing Amazon SES
     *             directly through the HTTPS interface. If you are accessing Amazon SES using an Amazon Web Services
     *             SDK, the SDK takes care of the base 64-encoding for you.</p>
     * @public
     */
    RawContent: Uint8Array | undefined;
    /**
     * <p> A standard descriptor indicating how the attachment should be rendered in the email.
     *             Supported values: <code>ATTACHMENT</code> or <code>INLINE</code>.</p>
     * @public
     */
    ContentDisposition?: AttachmentContentDisposition | undefined;
    /**
     * <p>The file name for the attachment as it will appear in the email.
     *             Amazon SES restricts certain file extensions. To ensure attachments are accepted,
     *             check the <a href="https://docs.aws.amazon.com/ses/latest/dg/mime-types.html">Unsupported attachment types</a>
     *             in the Amazon SES Developer Guide.</p>
     * @public
     */
    FileName: string | undefined;
    /**
     * <p> A brief description of the attachment content.</p>
     * @public
     */
    ContentDescription?: string | undefined;
    /**
     * <p> Unique identifier for the attachment, used for referencing attachments with INLINE disposition in HTML content.</p>
     * @public
     */
    ContentId?: string | undefined;
    /**
     * <p> Specifies how the attachment is encoded.
     *             Supported values: <code>BASE64</code>, <code>QUOTED_PRINTABLE</code>, <code>SEVEN_BIT</code>.</p>
     * @public
     */
    ContentTransferEncoding?: AttachmentContentTransferEncoding | undefined;
    /**
     * <p> The MIME type of the attachment.</p>
     *          <note>
     *             <p>Example: <code>application/pdf</code>, <code>image/jpeg</code>
     *             </p>
     *          </note>
     * @public
     */
    ContentType?: string | undefined;
}
/**
 * <p>The input you provided is invalid.</p>
 * @public
 */
export declare class BadRequestException extends __BaseException {
    readonly name: "BadRequestException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<BadRequestException, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const MetricDimensionName: {
    readonly CONFIGURATION_SET: "CONFIGURATION_SET";
    readonly EMAIL_IDENTITY: "EMAIL_IDENTITY";
    readonly ISP: "ISP";
};
/**
 * @public
 */
export type MetricDimensionName = (typeof MetricDimensionName)[keyof typeof MetricDimensionName];
/**
 * @public
 * @enum
 */
export declare const Metric: {
    readonly CLICK: "CLICK";
    readonly COMPLAINT: "COMPLAINT";
    readonly DELIVERY: "DELIVERY";
    readonly DELIVERY_CLICK: "DELIVERY_CLICK";
    readonly DELIVERY_COMPLAINT: "DELIVERY_COMPLAINT";
    readonly DELIVERY_OPEN: "DELIVERY_OPEN";
    readonly OPEN: "OPEN";
    readonly PERMANENT_BOUNCE: "PERMANENT_BOUNCE";
    readonly SEND: "SEND";
    readonly TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE";
};
/**
 * @public
 */
export type Metric = (typeof Metric)[keyof typeof Metric];
/**
 * @public
 * @enum
 */
export declare const MetricNamespace: {
    readonly VDM: "VDM";
};
/**
 * @public
 */
export type MetricNamespace = (typeof MetricNamespace)[keyof typeof MetricNamespace];
/**
 * <p>Represents a single metric data query to include in a batch.</p>
 * @public
 */
export interface BatchGetMetricDataQuery {
    /**
     * <p>The query identifier.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The query namespace - e.g. <code>VDM</code>
     *          </p>
     * @public
     */
    Namespace: MetricNamespace | undefined;
    /**
     * <p>The queried metric. This can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>SEND</code> – Emails sent eligible for tracking
     *                     in the VDM dashboard. This excludes emails sent to the mailbox simulator and emails
     *                     addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> – Complaints received for your
     *                     account. This excludes complaints from the mailbox simulator, those originating from
     *                     your account-level suppression list (if enabled), and those for emails addressed to more
     *                     than one recipient</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>PERMANENT_BOUNCE</code> – Permanent bounces - i.e. feedback received for
     *                     emails sent to non-existent mailboxes. Excludes bounces from the mailbox simulator, those
     *                     originating from your account-level suppression list (if enabled), and those for emails
     *                     addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TRANSIENT_BOUNCE</code> – Transient bounces - i.e. feedback received for
     *                     delivery failures excluding issues with non-existent mailboxes. Excludes bounces from the
     *                     mailbox simulator, and those for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>OPEN</code> – Unique open events for emails including open trackers.
     *                     Excludes opens for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>CLICK</code> – Unique click events for emails including wrapped links.
     *                     Excludes clicks for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY</code> – Successful deliveries for email sending attempts.
     *                     Excludes deliveries to the mailbox simulator and for emails addressed to more
     *                     than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_OPEN</code> – Successful deliveries for email sending attempts.
     *                     Excludes deliveries to the mailbox simulator, for emails addressed to more than one recipient,
     *                     and emails without open trackers.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_CLICK</code> – Successful deliveries for email sending attempts.
     *                     Excludes deliveries to the mailbox simulator, for emails addressed to more than one recipient,
     *                     and emails without click trackers.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_COMPLAINT</code> – Successful deliveries for email sending attempts.
     *                     Excludes deliveries to the mailbox simulator, for emails addressed to more than one recipient,
     *                     and emails addressed to recipients hosted by ISPs with which Amazon SES does not have a
     *                     feedback loop agreement.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Metric: Metric | undefined;
    /**
     * <p>An object that contains mapping between <code>MetricDimensionName</code>
     *             and <code>MetricDimensionValue</code> to filter metrics by.</p>
     * @public
     */
    Dimensions?: Partial<Record<MetricDimensionName, string>> | undefined;
    /**
     * <p>Represents the start date for the query interval.</p>
     * @public
     */
    StartDate: Date | undefined;
    /**
     * <p>Represents the end date for the query interval.</p>
     * @public
     */
    EndDate: Date | undefined;
}
/**
 * <p>Represents a request to retrieve a batch of metric data.</p>
 * @public
 */
export interface BatchGetMetricDataRequest {
    /**
     * <p>A list of queries for metrics to be retrieved.</p>
     * @public
     */
    Queries: BatchGetMetricDataQuery[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const QueryErrorCode: {
    readonly ACCESS_DENIED: "ACCESS_DENIED";
    readonly INTERNAL_FAILURE: "INTERNAL_FAILURE";
};
/**
 * @public
 */
export type QueryErrorCode = (typeof QueryErrorCode)[keyof typeof QueryErrorCode];
/**
 * <p>An error corresponding to the unsuccessful processing of a single metric data query.</p>
 * @public
 */
export interface MetricDataError {
    /**
     * <p>The query identifier.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The query error code. Can be one of:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>INTERNAL_FAILURE</code> – Amazon SES has failed to process one of the queries.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ACCESS_DENIED</code> – You have insufficient access to retrieve metrics
     *                     based on the given query.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Code?: QueryErrorCode | undefined;
    /**
     * <p>The error message associated with the current query error.</p>
     * @public
     */
    Message?: string | undefined;
}
/**
 * <p>The result of a single metric data query.</p>
 * @public
 */
export interface MetricDataResult {
    /**
     * <p>The query identifier.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>A list of timestamps for the metric data results.</p>
     * @public
     */
    Timestamps?: Date[] | undefined;
    /**
     * <p>A list of values (cumulative / sum) for the metric data results.</p>
     * @public
     */
    Values?: number[] | undefined;
}
/**
 * <p>Represents the result of processing your metric data batch request</p>
 * @public
 */
export interface BatchGetMetricDataResponse {
    /**
     * <p>A list of successfully retrieved <code>MetricDataResult</code>.</p>
     * @public
     */
    Results?: MetricDataResult[] | undefined;
    /**
     * <p>A list of <code>MetricDataError</code> encountered while processing your metric data batch request.</p>
     * @public
     */
    Errors?: MetricDataError[] | undefined;
}
/**
 * <p>The request couldn't be processed because an error occurred with the Amazon SES API v2.</p>
 * @public
 */
export declare class InternalServiceErrorException extends __BaseException {
    readonly name: "InternalServiceErrorException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServiceErrorException, __BaseException>);
}
/**
 * <p>The resource you attempted to access doesn't exist.</p>
 * @public
 */
export declare class NotFoundException extends __BaseException {
    readonly name: "NotFoundException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NotFoundException, __BaseException>);
}
/**
 * <p>Too many requests have been made to the operation.</p>
 * @public
 */
export declare class TooManyRequestsException extends __BaseException {
    readonly name: "TooManyRequestsException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const BehaviorOnMxFailure: {
    readonly REJECT_MESSAGE: "REJECT_MESSAGE";
    readonly USE_DEFAULT_VALUE: "USE_DEFAULT_VALUE";
};
/**
 * @public
 */
export type BehaviorOnMxFailure = (typeof BehaviorOnMxFailure)[keyof typeof BehaviorOnMxFailure];
/**
 * <p>An object that contains information about a blacklisting event that impacts one of the
 *             dedicated IP addresses that is associated with your account.</p>
 * @public
 */
export interface BlacklistEntry {
    /**
     * <p>The name of the blacklist that the IP address appears on.</p>
     * @public
     */
    RblName?: string | undefined;
    /**
     * <p>The time when the blacklisting event occurred.</p>
     * @public
     */
    ListingTime?: Date | undefined;
    /**
     * <p>Additional information about the blacklisting event, as provided by the blacklist
     *             maintainer.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * <p>An object that represents the content of the email, and optionally a character set
 *             specification.</p>
 * @public
 */
export interface Content {
    /**
     * <p>The content of the message itself.</p>
     * @public
     */
    Data: string | undefined;
    /**
     * <p>The character set for the content. Because of the constraints of the SMTP protocol,
     *             Amazon SES uses 7-bit ASCII by default. If the text includes characters outside of the ASCII
     *             range, you have to specify a character set. For example, you could specify
     *                 <code>UTF-8</code>, <code>ISO-8859-1</code>, or <code>Shift_JIS</code>.</p>
     * @public
     */
    Charset?: string | undefined;
}
/**
 * <p>Represents the body of the email message.</p>
 * @public
 */
export interface Body {
    /**
     * <p>An object that represents the version of the message that is displayed in email
     *             clients that don't support HTML, or clients where the recipient has disabled HTML
     *             rendering.</p>
     * @public
     */
    Text?: Content | undefined;
    /**
     * <p>An object that represents the version of the message that is displayed in email
     *             clients that support HTML. HTML messages can include formatted text, hyperlinks, images,
     *             and more. </p>
     * @public
     */
    Html?: Content | undefined;
}
/**
 * @public
 * @enum
 */
export declare const BounceType: {
    readonly PERMANENT: "PERMANENT";
    readonly TRANSIENT: "TRANSIENT";
    readonly UNDETERMINED: "UNDETERMINED";
};
/**
 * @public
 */
export type BounceType = (typeof BounceType)[keyof typeof BounceType];
/**
 * <p>Information about a <code>Bounce</code> event.</p>
 * @public
 */
export interface Bounce {
    /**
     * <p>The type of the bounce, as determined by SES.
     *             Can be one of <code>UNDETERMINED</code>, <code>TRANSIENT</code>, or <code>PERMANENT</code>
     *          </p>
     * @public
     */
    BounceType?: BounceType | undefined;
    /**
     * <p>The subtype of the bounce, as determined by SES.</p>
     * @public
     */
    BounceSubType?: string | undefined;
    /**
     * <p>The status code issued by the reporting Message Transfer Authority (MTA).
     *             This field only appears if a delivery status notification (DSN) was attached to the bounce
     *             and the <code>Diagnostic-Code</code> was provided in the DSN.
     *         </p>
     * @public
     */
    DiagnosticCode?: string | undefined;
}
/**
 * <p>Contains the name and value of a message header that you add to an email.</p>
 * @public
 */
export interface MessageHeader {
    /**
     * <p>The name of the message header. The message header name has to meet the following
     *             criteria:</p>
     *          <ul>
     *             <li>
     *                <p>Can contain any printable ASCII character (33 - 126) except for colon (:).</p>
     *             </li>
     *             <li>
     *                <p>Can contain no more than 126 characters.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The value of the message header. The message header value has to meet the following
     *             criteria:</p>
     *          <ul>
     *             <li>
     *                <p>Can contain any printable ASCII character.</p>
     *             </li>
     *             <li>
     *                <p>Can contain no more than 870 characters.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Value: string | undefined;
}
/**
 * <p>The content of the email, composed of a subject line, an HTML part, and a text-only
 *             part.</p>
 * @public
 */
export interface EmailTemplateContent {
    /**
     * <p>The subject line of the email.</p>
     * @public
     */
    Subject?: string | undefined;
    /**
     * <p>The email body that will be visible to recipients whose email clients do not display
     *             HTML.</p>
     * @public
     */
    Text?: string | undefined;
    /**
     * <p>The HTML body of the email.</p>
     * @public
     */
    Html?: string | undefined;
}
/**
 * <p>An object that defines the email template to use for an email message, and the values
 *             to use for any message variables in that template. An <i>email
 *                 template</i> is a type of message template that contains content that you
 *             want to reuse in email messages that you send. You can specifiy the email template by providing
 *             the name or ARN of an <i>email template</i>
 *             previously saved in your Amazon SES account or by providing the full template content.</p>
 * @public
 */
export interface Template {
    /**
     * <p>The name of the template. You will refer to this name when you send email using the
     *                 <code>SendEmail</code> or <code>SendBulkEmail</code> operations.
     *         </p>
     * @public
     */
    TemplateName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the template.</p>
     * @public
     */
    TemplateArn?: string | undefined;
    /**
     * <p>The content of the template.</p>
     *          <note>
     *             <p>Amazon SES supports only simple substitions when you send email using the
     *                 <code>SendEmail</code> or <code>SendBulkEmail</code> operations and
     *                 you provide the full template content in the request.</p>
     *          </note>
     * @public
     */
    TemplateContent?: EmailTemplateContent | undefined;
    /**
     * <p>An object that defines the values to use for message variables in the template. This
     *             object is a set of key-value pairs. Each key defines a message variable in the template.
     *             The corresponding value defines the value to use for that variable.</p>
     * @public
     */
    TemplateData?: string | undefined;
    /**
     * <p>The list of message headers that will be added to the email message.</p>
     * @public
     */
    Headers?: MessageHeader[] | undefined;
    /**
     * <p> The List of attachments to include in your email. All recipients will receive the same attachments.</p>
     * @public
     */
    Attachments?: Attachment[] | undefined;
}
/**
 * <p>An object that contains the body of the message. You can specify a template
 *             message.</p>
 * @public
 */
export interface BulkEmailContent {
    /**
     * <p>The template to use for the bulk email message.</p>
     * @public
     */
    Template?: Template | undefined;
}
/**
 * <p>An object that describes the recipients for an email.</p>
 *          <note>
 *             <p>Amazon SES does not support the SMTPUTF8 extension, as described in <a href="https://tools.ietf.org/html/rfc6531">RFC6531</a>. For this reason, the
 *                     <i>local part</i> of a destination email address (the part of the
 *                 email address that precedes the @ sign) may only contain <a href="https://en.wikipedia.org/wiki/Email_address#Local-part">7-bit ASCII
 *                     characters</a>. If the <i>domain part</i> of an address (the
 *                 part after the @ sign) contains non-ASCII characters, they must be encoded using
 *                 Punycode, as described in <a href="https://tools.ietf.org/html/rfc3492.html">RFC3492</a>.</p>
 *          </note>
 * @public
 */
export interface Destination {
    /**
     * <p>An array that contains the email addresses of the "To" recipients for the
     *             email.</p>
     * @public
     */
    ToAddresses?: string[] | undefined;
    /**
     * <p>An array that contains the email addresses of the "CC" (carbon copy) recipients for
     *             the email.</p>
     * @public
     */
    CcAddresses?: string[] | undefined;
    /**
     * <p>An array that contains the email addresses of the "BCC" (blind carbon copy) recipients
     *             for the email.</p>
     * @public
     */
    BccAddresses?: string[] | undefined;
}
/**
 * <p>An object which contains <code>ReplacementTemplateData</code> to be used for a
 *             specific <code>BulkEmailEntry</code>.</p>
 * @public
 */
export interface ReplacementTemplate {
    /**
     * <p>A list of replacement values to apply to the template. This parameter is a JSON
     *             object, typically consisting of key-value pairs in which the keys correspond to
     *             replacement tags in the email template.</p>
     * @public
     */
    ReplacementTemplateData?: string | undefined;
}
/**
 * <p>The <code>ReplaceEmailContent</code> object to be used for a specific
 *                 <code>BulkEmailEntry</code>. The <code>ReplacementTemplate</code> can be specified
 *             within this object.</p>
 * @public
 */
export interface ReplacementEmailContent {
    /**
     * <p>The <code>ReplacementTemplate</code> associated with
     *                 <code>ReplacementEmailContent</code>.</p>
     * @public
     */
    ReplacementTemplate?: ReplacementTemplate | undefined;
}
/**
 * <p>Contains the name and value of a tag that you apply to an email. You can use message
 *             tags when you publish email sending events.
 *             </p>
 * @public
 */
export interface MessageTag {
    /**
     * <p>The name of the message tag. The message tag name has to meet the following
     *             criteria:</p>
     *          <ul>
     *             <li>
     *                <p>It can only contain ASCII letters (a–z, A–Z), numbers (0–9),
     *                     underscores (_), or dashes (-).</p>
     *             </li>
     *             <li>
     *                <p>It can contain no more than 256 characters.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The value of the message tag. The message tag value has to meet the following
     *             criteria:</p>
     *          <ul>
     *             <li>
     *                <p>It can only contain ASCII letters (a–z, A–Z), numbers (0–9),
     *                     underscores (_), or dashes (-).</p>
     *             </li>
     *             <li>
     *                <p>It can contain no more than 256 characters.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Value: string | undefined;
}
/**
 * @public
 */
export interface BulkEmailEntry {
    /**
     * <p>Represents the destination of the message, consisting of To:, CC:, and BCC:
     *             fields.</p>
     *          <note>
     *             <p>Amazon SES does not support the SMTPUTF8 extension, as described in <a href="https://tools.ietf.org/html/rfc6531">RFC6531</a>. For this reason, the
     *                 local part of a destination email address (the part of the email address that
     *                 precedes the @ sign) may only contain <a href="https://en.wikipedia.org/wiki/Email_address#Local-part">7-bit ASCII
     *                     characters</a>. If the domain part of an address (the part after the @ sign)
     *                 contains non-ASCII characters, they must be encoded using Punycode, as described in
     *                     <a href="https://tools.ietf.org/html/rfc3492.html">RFC3492</a>.</p>
     *          </note>
     * @public
     */
    Destination: Destination | undefined;
    /**
     * <p>A list of tags, in the form of name/value pairs, to apply to an email that you send
     *             using the <code>SendBulkTemplatedEmail</code> operation. Tags correspond to
     *             characteristics of the email that you define, so that you can publish email sending
     *             events.</p>
     * @public
     */
    ReplacementTags?: MessageTag[] | undefined;
    /**
     * <p>The <code>ReplacementEmailContent</code> associated with a
     *             <code>BulkEmailEntry</code>.</p>
     * @public
     */
    ReplacementEmailContent?: ReplacementEmailContent | undefined;
    /**
     * <p>The list of message headers associated with the <code>BulkEmailEntry</code> data type.</p>
     *          <ul>
     *             <li>
     *                <p>Headers Not Present in <code>BulkEmailEntry</code>: If a header is specified in
     *                     <a href="https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Template.html">
     *                      <code>Template</code>
     *                   </a> but not in <code>BulkEmailEntry</code>, the header
     *                     from <code>Template</code> will be added to the outgoing email.</p>
     *             </li>
     *             <li>
     *                <p>Headers Present in <code>BulkEmailEntry</code>: If a header is specified in
     *                     <code>BulkEmailEntry</code>, it takes precedence over any header of the same name specified
     *                     in <a href="https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Template.html">
     *                      <code>Template</code>
     *                   </a>:</p>
     *                <ul>
     *                   <li>
     *                      <p>If the header is also defined within <code>Template</code>,
     *                             the value from <code>BulkEmailEntry</code> will replace the header's
     *                             value in the email.</p>
     *                   </li>
     *                   <li>
     *                      <p>If the header is not defined within <code>Template</code>,
     *                             it will simply be added to the email as specified in
     *                             <code>BulkEmailEntry</code>.</p>
     *                   </li>
     *                </ul>
     *             </li>
     *          </ul>
     * @public
     */
    ReplacementHeaders?: MessageHeader[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const BulkEmailStatus: {
    readonly ACCOUNT_DAILY_QUOTA_EXCEEDED: "ACCOUNT_DAILY_QUOTA_EXCEEDED";
    readonly ACCOUNT_SENDING_PAUSED: "ACCOUNT_SENDING_PAUSED";
    readonly ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED";
    readonly ACCOUNT_THROTTLED: "ACCOUNT_THROTTLED";
    readonly CONFIGURATION_SET_NOT_FOUND: "CONFIGURATION_SET_NOT_FOUND";
    readonly CONFIGURATION_SET_SENDING_PAUSED: "CONFIGURATION_SET_SENDING_PAUSED";
    readonly FAILED: "FAILED";
    readonly INVALID_PARAMETER: "INVALID_PARAMETER";
    readonly INVALID_SENDING_POOL_NAME: "INVALID_SENDING_POOL_NAME";
    readonly MAIL_FROM_DOMAIN_NOT_VERIFIED: "MAIL_FROM_DOMAIN_NOT_VERIFIED";
    readonly MESSAGE_REJECTED: "MESSAGE_REJECTED";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND";
    readonly TRANSIENT_FAILURE: "TRANSIENT_FAILURE";
};
/**
 * @public
 */
export type BulkEmailStatus = (typeof BulkEmailStatus)[keyof typeof BulkEmailStatus];
/**
 * <p>The result of the <code>SendBulkEmail</code> operation of each specified
 *                 <code>BulkEmailEntry</code>.</p>
 * @public
 */
export interface BulkEmailEntryResult {
    /**
     * <p>The status of a message sent using the <code>SendBulkTemplatedEmail</code>
     *             operation.</p>
     *          <p>Possible values for this parameter include:</p>
     *          <ul>
     *             <li>
     *                <p>SUCCESS: Amazon SES accepted the message, and will attempt to deliver it to
     *                     the recipients.</p>
     *             </li>
     *             <li>
     *                <p>MESSAGE_REJECTED: The message was rejected because it contained a
     *                     virus.</p>
     *             </li>
     *             <li>
     *                <p>MAIL_FROM_DOMAIN_NOT_VERIFIED: The sender's email address or domain was not
     *                     verified.</p>
     *             </li>
     *             <li>
     *                <p>CONFIGURATION_SET_DOES_NOT_EXIST: The configuration set you specified does not
     *                     exist.</p>
     *             </li>
     *             <li>
     *                <p>TEMPLATE_DOES_NOT_EXIST: The template you specified does not exist.</p>
     *             </li>
     *             <li>
     *                <p>ACCOUNT_SUSPENDED: Your account has been shut down because of issues related
     *                     to your email sending practices.</p>
     *             </li>
     *             <li>
     *                <p>ACCOUNT_THROTTLED: The number of emails you can send has been reduced because
     *                     your account has exceeded its allocated sending limit.</p>
     *             </li>
     *             <li>
     *                <p>ACCOUNT_DAILY_QUOTA_EXCEEDED: You have reached or exceeded the maximum number
     *                     of emails you can send from your account in a 24-hour period.</p>
     *             </li>
     *             <li>
     *                <p>INVALID_SENDING_POOL_NAME: The configuration set you specified refers to an IP
     *                     pool that does not exist.</p>
     *             </li>
     *             <li>
     *                <p>ACCOUNT_SENDING_PAUSED: Email sending for the Amazon SES account was disabled
     *                     using the <a href="https://docs.aws.amazon.com/ses/latest/APIReference/API_UpdateAccountSendingEnabled.html">UpdateAccountSendingEnabled</a> operation.</p>
     *             </li>
     *             <li>
     *                <p>CONFIGURATION_SET_SENDING_PAUSED: Email sending for this configuration set was
     *                     disabled using the <a href="https://docs.aws.amazon.com/ses/latest/APIReference/API_UpdateConfigurationSetSendingEnabled.html">UpdateConfigurationSetSendingEnabled</a> operation.</p>
     *             </li>
     *             <li>
     *                <p>INVALID_PARAMETER_VALUE: One or more of the parameters you specified when
     *                     calling this operation was invalid. See the error message for additional
     *                     information.</p>
     *             </li>
     *             <li>
     *                <p>TRANSIENT_FAILURE: Amazon SES was unable to process your request because of a
     *                     temporary issue.</p>
     *             </li>
     *             <li>
     *                <p>FAILED: Amazon SES was unable to process your request. See the error message
     *                     for additional information.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: BulkEmailStatus | undefined;
    /**
     * <p>A description of an error that prevented a message being sent using the
     *                 <code>SendBulkTemplatedEmail</code> operation.</p>
     * @public
     */
    Error?: string | undefined;
    /**
     * <p>The unique message identifier returned from the <code>SendBulkTemplatedEmail</code>
     *             operation.</p>
     * @public
     */
    MessageId?: string | undefined;
}
/**
 * <p>Represents a request to cancel an export job using the export job ID.</p>
 * @public
 */
export interface CancelExportJobRequest {
    /**
     * <p>The export job ID.</p>
     * @public
     */
    JobId: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CancelExportJobResponse {
}
/**
 * @public
 * @enum
 */
export declare const DimensionValueSource: {
    readonly EMAIL_HEADER: "EMAIL_HEADER";
    readonly LINK_TAG: "LINK_TAG";
    readonly MESSAGE_TAG: "MESSAGE_TAG";
};
/**
 * @public
 */
export type DimensionValueSource = (typeof DimensionValueSource)[keyof typeof DimensionValueSource];
/**
 * <p>An object that defines the dimension configuration to use when you send email events
 *             to Amazon CloudWatch.</p>
 * @public
 */
export interface CloudWatchDimensionConfiguration {
    /**
     * <p>The name of an Amazon CloudWatch dimension associated with an email sending metric. The name has to
     *             meet the following criteria:</p>
     *          <ul>
     *             <li>
     *                <p>It can only contain ASCII letters (a–z, A–Z), numbers (0–9),
     *                     underscores (_), or dashes (-).</p>
     *             </li>
     *             <li>
     *                <p>It can contain no more than 256 characters.</p>
     *             </li>
     *          </ul>
     * @public
     */
    DimensionName: string | undefined;
    /**
     * <p>The location where the Amazon SES API v2 finds the value of a dimension to publish to Amazon CloudWatch. To
     *             use the message tags that you specify using an <code>X-SES-MESSAGE-TAGS</code> header or
     *             a parameter to the <code>SendEmail</code> or <code>SendRawEmail</code> API, choose
     *                 <code>messageTag</code>. To use your own email headers, choose
     *                 <code>emailHeader</code>. To use link tags, choose <code>linkTags</code>.</p>
     * @public
     */
    DimensionValueSource: DimensionValueSource | undefined;
    /**
     * <p>The default value of the dimension that is published to Amazon CloudWatch if you don't provide the
     *             value of the dimension when you send an email. This value has to meet the following
     *             criteria:</p>
     *          <ul>
     *             <li>
     *                <p>Can only contain ASCII letters (a–z, A–Z), numbers (0–9),
     *                     underscores (_), or dashes (-), at signs (@), and periods (.).</p>
     *             </li>
     *             <li>
     *                <p>It can contain no more than 256 characters.</p>
     *             </li>
     *          </ul>
     * @public
     */
    DefaultDimensionValue: string | undefined;
}
/**
 * <p>An object that defines an Amazon CloudWatch destination for email events. You can use Amazon CloudWatch to
 *             monitor and gain insights on your email sending metrics.</p>
 * @public
 */
export interface CloudWatchDestination {
    /**
     * <p>An array of objects that define the dimensions to use when you send email events to
     *             Amazon CloudWatch.</p>
     * @public
     */
    DimensionConfigurations: CloudWatchDimensionConfiguration[] | undefined;
}
/**
 * <p>Information about a <code>Complaint</code> event.</p>
 * @public
 */
export interface Complaint {
    /**
     * <p>
     *             Can either be <code>null</code> or <code>OnAccountSuppressionList</code>.
     *             If the value is <code>OnAccountSuppressionList</code>, SES accepted the message,
     *             but didn't attempt to send it because it was on the account-level suppression list.
     *         </p>
     * @public
     */
    ComplaintSubType?: string | undefined;
    /**
     * <p>
     *             The value of the <code>Feedback-Type</code> field from the feedback report received from the ISP.
     *         </p>
     * @public
     */
    ComplaintFeedbackType?: string | undefined;
}
/**
 * <p>The resource is being modified by another operation or thread.</p>
 * @public
 */
export declare class ConcurrentModificationException extends __BaseException {
    readonly name: "ConcurrentModificationException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConcurrentModificationException, __BaseException>);
}
/**
 * <p>If there is already an ongoing account details update under review.</p>
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
 * @public
 * @enum
 */
export declare const SubscriptionStatus: {
    readonly OPT_IN: "OPT_IN";
    readonly OPT_OUT: "OPT_OUT";
};
/**
 * @public
 */
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
/**
 * <p>The contact's preference for being opted-in to or opted-out of a topic.</p>
 * @public
 */
export interface TopicPreference {
    /**
     * <p>The name of the topic.</p>
     * @public
     */
    TopicName: string | undefined;
    /**
     * <p>The contact's subscription status to a topic which is either <code>OPT_IN</code> or
     *                 <code>OPT_OUT</code>.</p>
     * @public
     */
    SubscriptionStatus: SubscriptionStatus | undefined;
}
/**
 * <p>A contact is the end-user who is receiving the email.</p>
 * @public
 */
export interface Contact {
    /**
     * <p>The contact's email address.</p>
     * @public
     */
    EmailAddress?: string | undefined;
    /**
     * <p>The contact's preference for being opted-in to or opted-out of a topic.</p>
     * @public
     */
    TopicPreferences?: TopicPreference[] | undefined;
    /**
     * <p>The default topic preferences applied to the contact.</p>
     * @public
     */
    TopicDefaultPreferences?: TopicPreference[] | undefined;
    /**
     * <p>A boolean value status noting if the contact is unsubscribed from all contact list
     *             topics.</p>
     * @public
     */
    UnsubscribeAll?: boolean | undefined;
    /**
     * <p>A timestamp noting the last time the contact's information was updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
}
/**
 * <p>A list that contains contacts that have subscribed to a particular topic or
 *             topics.</p>
 * @public
 */
export interface ContactList {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName?: string | undefined;
    /**
     * <p>A timestamp noting the last time the contact list was updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ContactListImportAction: {
    readonly DELETE: "DELETE";
    readonly PUT: "PUT";
};
/**
 * @public
 */
export type ContactListImportAction = (typeof ContactListImportAction)[keyof typeof ContactListImportAction];
/**
 * <p>An object that contains details about the action of a contact list.</p>
 * @public
 */
export interface ContactListDestination {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>>The type of action to perform on the addresses. The following are the possible
     *             values:</p>
     *          <ul>
     *             <li>
     *                <p>PUT: add the addresses to the contact list. If the record already exists, it
     *                     will override it with the new value.</p>
     *             </li>
     *             <li>
     *                <p>DELETE: remove the addresses from the contact list.</p>
     *             </li>
     *          </ul>
     * @public
     */
    ContactListImportAction: ContactListImportAction | undefined;
}
/**
 * @public
 * @enum
 */
export declare const TlsPolicy: {
    readonly OPTIONAL: "OPTIONAL";
    readonly REQUIRE: "REQUIRE";
};
/**
 * @public
 */
export type TlsPolicy = (typeof TlsPolicy)[keyof typeof TlsPolicy];
/**
 * <p>Used to associate a configuration set with a dedicated IP pool.</p>
 * @public
 */
export interface DeliveryOptions {
    /**
     * <p>Specifies whether messages that use the configuration set are required to use
     *             Transport Layer Security (TLS). If the value is <code>Require</code>, messages are only
     *             delivered if a TLS connection can be established. If the value is <code>Optional</code>,
     *             messages can be delivered in plain text if a TLS connection can't be established.</p>
     * @public
     */
    TlsPolicy?: TlsPolicy | undefined;
    /**
     * <p>The name of the dedicated IP pool to associate with the configuration set.</p>
     * @public
     */
    SendingPoolName?: string | undefined;
    /**
     * <p>The maximum amount of time, in seconds, that Amazon SES API v2 will attempt delivery of email.
     *             If specified, the value must greater than or equal to 300 seconds (5 minutes)
     *             and less than or equal to 50400 seconds (840 minutes).
     *         </p>
     * @public
     */
    MaxDeliverySeconds?: number | undefined;
}
/**
 * <p>Enable or disable collection of reputation metrics for emails that you send using this
 *             configuration set in the current Amazon Web Services Region. </p>
 * @public
 */
export interface ReputationOptions {
    /**
     * <p>If <code>true</code>, tracking of reputation metrics is enabled for the configuration
     *             set. If <code>false</code>, tracking of reputation metrics is disabled for the
     *             configuration set.</p>
     * @public
     */
    ReputationMetricsEnabled?: boolean | undefined;
    /**
     * <p>The date and time (in Unix time) when the reputation metrics were last given a fresh
     *             start. When your account is given a fresh start, your reputation metrics are calculated
     *             starting from the date of the fresh start.</p>
     * @public
     */
    LastFreshStart?: Date | undefined;
}
/**
 * <p>Used to enable or disable email sending for messages that use this configuration set
 *             in the current Amazon Web Services Region.</p>
 * @public
 */
export interface SendingOptions {
    /**
     * <p>If <code>true</code>, email sending is enabled for the configuration set. If
     *                 <code>false</code>, email sending is disabled for the configuration set.</p>
     * @public
     */
    SendingEnabled?: boolean | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SuppressionListReason: {
    readonly BOUNCE: "BOUNCE";
    readonly COMPLAINT: "COMPLAINT";
};
/**
 * @public
 */
export type SuppressionListReason = (typeof SuppressionListReason)[keyof typeof SuppressionListReason];
/**
 * <p>An object that contains information about the suppression list preferences for your
 *             account.</p>
 * @public
 */
export interface SuppressionOptions {
    /**
     * <p>A list that contains the reasons that email addresses are automatically added to the
     *             suppression list for your account. This list can contain any or all of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a
     *                     complaint.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>BOUNCE</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a hard
     *                     bounce.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SuppressedReasons?: SuppressionListReason[] | undefined;
}
/**
 * <p>An object that defines the tags that are associated with a resource.
 *                 A <i>tag</i> is a label that you optionally define and associate with
 *             a resource. Tags can help you categorize and manage resources in different ways, such as
 *             by purpose, owner, environment, or other criteria. A resource can have as many as 50
 *             tags.</p>
 *          <p>Each tag consists of a required <i>tag key</i> and an
 *                 associated <i>tag value</i>, both of which you define. A tag key is a
 *             general label that acts as a category for a more specific tag value. A tag value acts as
 *             a descriptor within a tag key. A tag key can contain as many as 128 characters. A tag
 *             value can contain as many as 256 characters. The characters can be Unicode letters,
 *             digits, white space, or one of the following symbols: _ . : / = + -. The following
 *             additional restrictions apply to tags:</p>
 *          <ul>
 *             <li>
 *                <p>Tag keys and values are case sensitive.</p>
 *             </li>
 *             <li>
 *                <p>For each associated resource, each tag key must be unique and it can have only
 *                     one value.</p>
 *             </li>
 *             <li>
 *                <p>The <code>aws:</code> prefix is reserved for use by Amazon Web Services; you can’t use it in
 *                     any tag keys or values that you define. In addition, you can't edit or remove
 *                     tag keys or values that use this prefix. Tags that use this prefix don’t count
 *                     against the limit of 50 tags per resource.</p>
 *             </li>
 *             <li>
 *                <p>You can associate tags with public or shared resources, but the tags are
 *                     available only for your Amazon Web Services account, not any other accounts that share the
 *                     resource. In addition, the tags are available only for resources that are
 *                     located in the specified Amazon Web Services Region for your Amazon Web Services account.</p>
 *             </li>
 *          </ul>
 * @public
 */
export interface Tag {
    /**
     * <p>One part of a key-value pair that defines a tag. The maximum length of a tag key is
     *             128 characters. The minimum length is 1 character.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The optional part of a key-value pair that defines a tag. The maximum length of a tag
     *             value is 256 characters. The minimum length is 0 characters. If you don't want a
     *             resource to have a specific tag value, don't specify a value for this parameter. If you
     *             don't specify a value, Amazon SES sets the value to an empty string.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const HttpsPolicy: {
    readonly OPTIONAL: "OPTIONAL";
    readonly REQUIRE: "REQUIRE";
    readonly REQUIRE_OPEN_ONLY: "REQUIRE_OPEN_ONLY";
};
/**
 * @public
 */
export type HttpsPolicy = (typeof HttpsPolicy)[keyof typeof HttpsPolicy];
/**
 * <p>An object that defines the tracking options for a configuration set. When you use the
 *             Amazon SES API v2 to send an email, it contains an invisible image that's used to track when
 *             recipients open your email. If your email contains links, those links are changed
 *             slightly in order to track when recipients click them.</p>
 *          <p>These images and links include references to a domain operated by Amazon Web Services. You can
 *             optionally configure the Amazon SES to use a domain that you operate for these images and
 *             links.</p>
 * @public
 */
export interface TrackingOptions {
    /**
     * <p>The domain to use for tracking open and click events.</p>
     * @public
     */
    CustomRedirectDomain: string | undefined;
    /**
     * <p>The https policy to use for tracking open and click events.</p>
     * @public
     */
    HttpsPolicy?: HttpsPolicy | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FeatureStatus: {
    readonly DISABLED: "DISABLED";
    readonly ENABLED: "ENABLED";
};
/**
 * @public
 */
export type FeatureStatus = (typeof FeatureStatus)[keyof typeof FeatureStatus];
/**
 * <p>An object containing additional settings for your VDM configuration as applicable to
 *             the Dashboard.</p>
 * @public
 */
export interface DashboardOptions {
    /**
     * <p>Specifies the status of your VDM engagement metrics collection. Can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Amazon SES enables engagement metrics for the
     *                     configuration set.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Amazon SES disables engagement metrics for the
     *                     configuration set.</p>
     *             </li>
     *          </ul>
     * @public
     */
    EngagementMetrics?: FeatureStatus | undefined;
}
/**
 * <p>An object containing additional settings for your VDM configuration as applicable to
 *             the Guardian.</p>
 * @public
 */
export interface GuardianOptions {
    /**
     * <p>Specifies the status of your VDM optimized shared delivery. Can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Amazon SES enables optimized shared delivery for the
     *                     configuration set.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Amazon SES disables optimized shared delivery for the
     *                     configuration set.</p>
     *             </li>
     *          </ul>
     * @public
     */
    OptimizedSharedDelivery?: FeatureStatus | undefined;
}
/**
 * <p>An object that defines the VDM settings that apply to emails that you send using the
 *             configuration set.</p>
 * @public
 */
export interface VdmOptions {
    /**
     * <p>Specifies additional settings for your VDM configuration as applicable to the
     *             Dashboard.</p>
     * @public
     */
    DashboardOptions?: DashboardOptions | undefined;
    /**
     * <p>Specifies additional settings for your VDM configuration as applicable to the
     *             Guardian.</p>
     * @public
     */
    GuardianOptions?: GuardianOptions | undefined;
}
/**
 * <p>A request to create a configuration set.</p>
 * @public
 */
export interface CreateConfigurationSetRequest {
    /**
     * <p>The name of the configuration set. The name can contain up to 64 alphanumeric
     *             characters, including letters, numbers, hyphens (-) and underscores (_) only.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>An object that defines the open and click tracking options for emails that you send
     *             using the configuration set.</p>
     * @public
     */
    TrackingOptions?: TrackingOptions | undefined;
    /**
     * <p>An object that defines the dedicated IP pool that is used to send emails that you send
     *             using the configuration set.</p>
     * @public
     */
    DeliveryOptions?: DeliveryOptions | undefined;
    /**
     * <p>An object that defines whether or not Amazon SES collects reputation metrics for the emails
     *             that you send that use the configuration set.</p>
     * @public
     */
    ReputationOptions?: ReputationOptions | undefined;
    /**
     * <p>An object that defines whether or not Amazon SES can send email that you send using the
     *             configuration set.</p>
     * @public
     */
    SendingOptions?: SendingOptions | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) to associate with the
     *             configuration set.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>An object that contains information about the suppression list preferences for your
     *             account.</p>
     * @public
     */
    SuppressionOptions?: SuppressionOptions | undefined;
    /**
     * <p>An object that defines the VDM options for emails that you send using the
     *             configuration set.</p>
     * @public
     */
    VdmOptions?: VdmOptions | undefined;
    /**
     * <p>An object that defines the MailManager archiving options for emails that you send
     *             using the configuration set.</p>
     * @public
     */
    ArchivingOptions?: ArchivingOptions | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateConfigurationSetResponse {
}
/**
 * <p>There are too many instances of the specified resource type.</p>
 * @public
 */
export declare class LimitExceededException extends __BaseException {
    readonly name: "LimitExceededException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<LimitExceededException, __BaseException>);
}
/**
 * <p>An object that defines an Amazon EventBridge destination for email events. You can use Amazon EventBridge to
 *             send notifications when certain email events occur.</p>
 * @public
 */
export interface EventBridgeDestination {
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon EventBridge bus to publish email events to. Only the default bus is supported. </p>
     * @public
     */
    EventBusArn: string | undefined;
}
/**
 * <p>An object that defines an Amazon Kinesis Data Firehose destination for email events. You can use Amazon Kinesis Data Firehose to
 *             stream data to other services, such as Amazon S3 and Amazon Redshift.</p>
 * @public
 */
export interface KinesisFirehoseDestination {
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that the Amazon SES API v2 uses to send email
     *             events to the Amazon Kinesis Data Firehose stream.</p>
     * @public
     */
    IamRoleArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon Kinesis Data Firehose stream that the Amazon SES API v2 sends email
     *             events to.</p>
     * @public
     */
    DeliveryStreamArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EventType: {
    readonly BOUNCE: "BOUNCE";
    readonly CLICK: "CLICK";
    readonly COMPLAINT: "COMPLAINT";
    readonly DELIVERY: "DELIVERY";
    readonly DELIVERY_DELAY: "DELIVERY_DELAY";
    readonly OPEN: "OPEN";
    readonly REJECT: "REJECT";
    readonly RENDERING_FAILURE: "RENDERING_FAILURE";
    readonly SEND: "SEND";
    readonly SUBSCRIPTION: "SUBSCRIPTION";
};
/**
 * @public
 */
export type EventType = (typeof EventType)[keyof typeof EventType];
/**
 * <p>An object that defines an Amazon Pinpoint project destination for email events. You can send
 *             email event data to a Amazon Pinpoint project to view metrics using the Transactional Messaging
 *             dashboards that are built in to Amazon Pinpoint. For more information, see <a href="https://docs.aws.amazon.com/pinpoint/latest/userguide/analytics-transactional-messages.html">Transactional
 *                 Messaging Charts</a> in the <i>Amazon Pinpoint User Guide</i>.</p>
 * @public
 */
export interface PinpointDestination {
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon Pinpoint project to send email events to.</p>
     * @public
     */
    ApplicationArn?: string | undefined;
}
/**
 * <p>An object that defines an Amazon SNS destination for email events. You can use Amazon SNS to
 *             send notifications when certain email events occur.</p>
 * @public
 */
export interface SnsDestination {
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon SNS topic to publish email events to. For
     *             more information about Amazon SNS topics, see the <a href="https://docs.aws.amazon.com/sns/latest/dg/CreateTopic.html">Amazon SNS Developer Guide</a>.</p>
     * @public
     */
    TopicArn: string | undefined;
}
/**
 * <p>An object that defines the event destination. Specifically, it defines which services
 *             receive events from emails sent using the configuration set that the event destination
 *             is associated with. Also defines the types of events that are sent to the event
 *             destination.</p>
 * @public
 */
export interface EventDestinationDefinition {
    /**
     * <p>If <code>true</code>, the event destination is enabled. When the event destination is
     *             enabled, the specified event types are sent to the destinations in this
     *                 <code>EventDestinationDefinition</code>.</p>
     *          <p>If <code>false</code>, the event destination is disabled. When the event destination
     *             is disabled, events aren't sent to the specified destinations.</p>
     * @public
     */
    Enabled?: boolean | undefined;
    /**
     * <p>An array that specifies which events the Amazon SES API v2 should send to the destinations in
     *             this <code>EventDestinationDefinition</code>.</p>
     * @public
     */
    MatchingEventTypes?: EventType[] | undefined;
    /**
     * <p>An object that defines an Amazon Kinesis Data Firehose destination for email events. You can use Amazon Kinesis Data Firehose to
     *             stream data to other services, such as Amazon S3 and Amazon Redshift.</p>
     * @public
     */
    KinesisFirehoseDestination?: KinesisFirehoseDestination | undefined;
    /**
     * <p>An object that defines an Amazon CloudWatch destination for email events. You can use Amazon CloudWatch to
     *             monitor and gain insights on your email sending metrics.</p>
     * @public
     */
    CloudWatchDestination?: CloudWatchDestination | undefined;
    /**
     * <p>An object that defines an Amazon SNS destination for email events. You can use Amazon SNS to
     *             send notifications when certain email events occur.</p>
     * @public
     */
    SnsDestination?: SnsDestination | undefined;
    /**
     * <p>An object that defines an Amazon EventBridge destination for email events. You can use Amazon EventBridge to
     *             send notifications when certain email events occur.</p>
     * @public
     */
    EventBridgeDestination?: EventBridgeDestination | undefined;
    /**
     * <p>An object that defines an Amazon Pinpoint project destination for email events. You can send
     *             email event data to a Amazon Pinpoint project to view metrics using the Transactional Messaging
     *             dashboards that are built in to Amazon Pinpoint. For more information, see <a href="https://docs.aws.amazon.com/pinpoint/latest/userguide/analytics-transactional-messages.html">Transactional
     *                 Messaging Charts</a> in the <i>Amazon Pinpoint User Guide</i>.</p>
     * @public
     */
    PinpointDestination?: PinpointDestination | undefined;
}
/**
 * <p>A request to add an event destination to a configuration set.</p>
 * @public
 */
export interface CreateConfigurationSetEventDestinationRequest {
    /**
     * <p>The name of the configuration set .</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>A name that identifies the event destination within the configuration set.</p>
     * @public
     */
    EventDestinationName: string | undefined;
    /**
     * <p>An object that defines the event destination.</p>
     * @public
     */
    EventDestination: EventDestinationDefinition | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateConfigurationSetEventDestinationResponse {
}
/**
 * @public
 */
export interface CreateContactRequest {
    /**
     * <p>The name of the contact list to which the contact should be added.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>The contact's email address.</p>
     * @public
     */
    EmailAddress: string | undefined;
    /**
     * <p>The contact's preferences for being opted-in to or opted-out of topics.</p>
     * @public
     */
    TopicPreferences?: TopicPreference[] | undefined;
    /**
     * <p>A boolean value status noting if the contact is unsubscribed from all contact list
     *             topics.</p>
     * @public
     */
    UnsubscribeAll?: boolean | undefined;
    /**
     * <p>The attribute data attached to a contact.</p>
     * @public
     */
    AttributesData?: string | undefined;
}
/**
 * @public
 */
export interface CreateContactResponse {
}
/**
 * <p>An interest group, theme, or label within a list. Lists can have multiple
 *             topics.</p>
 * @public
 */
export interface Topic {
    /**
     * <p>The name of the topic.</p>
     * @public
     */
    TopicName: string | undefined;
    /**
     * <p>The name of the topic the contact will see.</p>
     * @public
     */
    DisplayName: string | undefined;
    /**
     * <p>A description of what the topic is about, which the contact will see.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The default subscription status to be applied to a contact if the contact has not
     *             noted their preference for subscribing to a topic.</p>
     * @public
     */
    DefaultSubscriptionStatus: SubscriptionStatus | undefined;
}
/**
 * @public
 */
export interface CreateContactListRequest {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>An interest group, theme, or label within a list. A contact list can have multiple
     *             topics.</p>
     * @public
     */
    Topics?: Topic[] | undefined;
    /**
     * <p>A description of what the contact list is about.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The tags associated with a contact list.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateContactListResponse {
}
/**
 * <p>Represents a request to create a custom verification email template.</p>
 * @public
 */
export interface CreateCustomVerificationEmailTemplateRequest {
    /**
     * <p>The name of the custom verification email template.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>The email address that the custom verification email is sent from.</p>
     * @public
     */
    FromEmailAddress: string | undefined;
    /**
     * <p>The subject line of the custom verification email.</p>
     * @public
     */
    TemplateSubject: string | undefined;
    /**
     * <p>The content of the custom verification email. The total size of the email must be less
     *             than 10 MB. The message body may contain HTML, with some limitations. For more
     *             information, see <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom-faq">Custom verification email frequently asked questions</a> in the <i>Amazon SES
     *                 Developer Guide</i>.</p>
     * @public
     */
    TemplateContent: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is successfully verified.</p>
     * @public
     */
    SuccessRedirectionURL: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is not successfully verified.</p>
     * @public
     */
    FailureRedirectionURL: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface CreateCustomVerificationEmailTemplateResponse {
}
/**
 * @public
 * @enum
 */
export declare const ScalingMode: {
    readonly MANAGED: "MANAGED";
    readonly STANDARD: "STANDARD";
};
/**
 * @public
 */
export type ScalingMode = (typeof ScalingMode)[keyof typeof ScalingMode];
/**
 * <p>A request to create a new dedicated IP pool.</p>
 * @public
 */
export interface CreateDedicatedIpPoolRequest {
    /**
     * <p>The name of the dedicated IP pool.</p>
     * @public
     */
    PoolName: string | undefined;
    /**
     * <p>An object that defines the tags (keys and values) that you want to associate with the
     *             pool.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The type of scaling mode.</p>
     * @public
     */
    ScalingMode?: ScalingMode | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateDedicatedIpPoolResponse {
}
/**
 * <p>Represents the raw content of an email message.</p>
 * @public
 */
export interface RawMessage {
    /**
     * <p>The raw email message. The message has to meet the following criteria:</p>
     *          <ul>
     *             <li>
     *                <p>The message has to contain a header and a body, separated by one blank
     *                     line.</p>
     *             </li>
     *             <li>
     *                <p>All of the required header fields must be present in the message.</p>
     *             </li>
     *             <li>
     *                <p>Each part of a multipart MIME message must be formatted properly.</p>
     *             </li>
     *             <li>
     *                <p>Attachments must be in a file format that the Amazon SES supports.</p>
     *             </li>
     *             <li>
     *                <p>The raw data of the message needs to base64-encoded if you are accessing Amazon SES
     *                     directly through the HTTPS interface. If you are accessing Amazon SES using an Amazon Web Services
     *                     SDK, the SDK takes care of the base 64-encoding for you.</p>
     *             </li>
     *             <li>
     *                <p>If any of the MIME parts in your message contain content that is outside of
     *                     the 7-bit ASCII character range, you should encode that content to ensure that
     *                     recipients' email clients render the message properly.</p>
     *             </li>
     *             <li>
     *                <p>The length of any single line of text in the message can't exceed 1,000
     *                     characters. This restriction is defined in <a href="https://tools.ietf.org/html/rfc5321">RFC 5321</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Data: Uint8Array | undefined;
}
/**
 * <p>Represents the email message that you're sending. The <code>Message</code> object
 *             consists of a subject line and a message body.</p>
 * @public
 */
export interface Message {
    /**
     * <p>The subject line of the email. The subject line can only contain 7-bit ASCII
     *             characters. However, you can specify non-ASCII characters in the subject line by using
     *             encoded-word syntax, as described in <a href="https://tools.ietf.org/html/rfc2047">RFC 2047</a>.</p>
     * @public
     */
    Subject: Content | undefined;
    /**
     * <p>The body of the message. You can specify an HTML version of the message, a text-only
     *             version of the message, or both.</p>
     * @public
     */
    Body: Body | undefined;
    /**
     * <p>The list of message headers that will be added to the email message.</p>
     * @public
     */
    Headers?: MessageHeader[] | undefined;
    /**
     * <p> The List of attachments to include in your email. All recipients will receive the same attachments.</p>
     * @public
     */
    Attachments?: Attachment[] | undefined;
}
/**
 * <p>An object that defines the entire content of the email, including the message headers, body content,
 *             and attachments. For a simple email message, you specify the subject and provide both text
 *             and HTML versions of the message body. You can also add attachments to simple and templated
 *             messages. For a raw message, you provide a complete MIME-formatted message, which can
 *             include custom headers and attachments.</p>
 * @public
 */
export interface EmailContent {
    /**
     * <p>The simple email message. The message consists of a subject, message body and attachments list.</p>
     * @public
     */
    Simple?: Message | undefined;
    /**
     * <p>The raw email message. The message has to meet the following criteria:</p>
     *          <ul>
     *             <li>
     *                <p>The message has to contain a header and a body, separated by one blank
     *                     line.</p>
     *             </li>
     *             <li>
     *                <p>All of the required header fields must be present in the message.</p>
     *             </li>
     *             <li>
     *                <p>Each part of a multipart MIME message must be formatted properly.</p>
     *             </li>
     *             <li>
     *                <p>If you include attachments, they must be in a file format that the Amazon SES API v2
     *                     supports.
     *                     </p>
     *             </li>
     *             <li>
     *                <p>The raw data of the message needs to base64-encoded if you are accessing Amazon SES
     *                     directly through the HTTPS interface. If you are accessing Amazon SES using an Amazon Web Services
     *                     SDK, the SDK takes care of the base 64-encoding for you.</p>
     *             </li>
     *             <li>
     *                <p>If any of the MIME parts in your message contain content that is outside of
     *                     the 7-bit ASCII character range, you should encode that content to ensure that
     *                     recipients' email clients render the message properly.</p>
     *             </li>
     *             <li>
     *                <p>The length of any single line of text in the message can't exceed 1,000
     *                     characters. This restriction is defined in <a href="https://tools.ietf.org/html/rfc5321">RFC 5321</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Raw?: RawMessage | undefined;
    /**
     * <p>The template to use for the email message.</p>
     * @public
     */
    Template?: Template | undefined;
}
/**
 * <p>A request to perform a predictive inbox placement test. Predictive inbox placement tests can help you predict how your messages will
 *             be handled by various email providers around the world. When you perform a predictive inbox placement test, you
 *             provide a sample message that contains the content that you plan to send to your
 *             customers. We send that message to special email addresses spread across several major
 *             email providers around the world. The test takes about 24 hours to complete. When the
 *             test is complete, you can use the <code>GetDeliverabilityTestReport</code> operation to
 *             view the results of the test.</p>
 * @public
 */
export interface CreateDeliverabilityTestReportRequest {
    /**
     * <p>A unique name that helps you to identify the predictive inbox placement test when you retrieve the
     *             results.</p>
     * @public
     */
    ReportName?: string | undefined;
    /**
     * <p>The email address that the predictive inbox placement test email was sent from.</p>
     * @public
     */
    FromEmailAddress: string | undefined;
    /**
     * <p>The HTML body of the message that you sent when you performed the predictive inbox placement test.</p>
     * @public
     */
    Content: EmailContent | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) that you want to associate
     *             with the predictive inbox placement test.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DeliverabilityTestStatus: {
    readonly COMPLETED: "COMPLETED";
    readonly IN_PROGRESS: "IN_PROGRESS";
};
/**
 * @public
 */
export type DeliverabilityTestStatus = (typeof DeliverabilityTestStatus)[keyof typeof DeliverabilityTestStatus];
/**
 * <p>Information about the predictive inbox placement test that you created.</p>
 * @public
 */
export interface CreateDeliverabilityTestReportResponse {
    /**
     * <p>A unique string that identifies the predictive inbox placement test.</p>
     * @public
     */
    ReportId: string | undefined;
    /**
     * <p>The status of the predictive inbox placement test. If the status is <code>IN_PROGRESS</code>, then the predictive inbox placement test
     *             is currently running. Predictive inbox placement tests are usually complete within 24 hours of creating the
     *             test. If the status is <code>COMPLETE</code>, then the test is finished, and you can use
     *             the <code>GetDeliverabilityTestReport</code> to view the results of the test.</p>
     * @public
     */
    DeliverabilityTestStatus: DeliverabilityTestStatus | undefined;
}
/**
 * <p>The message can't be sent because the sending domain isn't verified.</p>
 * @public
 */
export declare class MailFromDomainNotVerifiedException extends __BaseException {
    readonly name: "MailFromDomainNotVerifiedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MailFromDomainNotVerifiedException, __BaseException>);
}
/**
 * <p>The message can't be sent because it contains invalid content.</p>
 * @public
 */
export declare class MessageRejected extends __BaseException {
    readonly name: "MessageRejected";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MessageRejected, __BaseException>);
}
/**
 * <p>The message can't be sent because the account's ability to send email is currently
 *             paused.</p>
 * @public
 */
export declare class SendingPausedException extends __BaseException {
    readonly name: "SendingPausedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<SendingPausedException, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const DkimSigningAttributesOrigin: {
    readonly AWS_SES: "AWS_SES";
    readonly AWS_SES_AF_SOUTH_1: "AWS_SES_AF_SOUTH_1";
    readonly AWS_SES_AP_NORTHEAST_1: "AWS_SES_AP_NORTHEAST_1";
    readonly AWS_SES_AP_NORTHEAST_2: "AWS_SES_AP_NORTHEAST_2";
    readonly AWS_SES_AP_NORTHEAST_3: "AWS_SES_AP_NORTHEAST_3";
    readonly AWS_SES_AP_SOUTHEAST_1: "AWS_SES_AP_SOUTHEAST_1";
    readonly AWS_SES_AP_SOUTHEAST_2: "AWS_SES_AP_SOUTHEAST_2";
    readonly AWS_SES_AP_SOUTHEAST_3: "AWS_SES_AP_SOUTHEAST_3";
    readonly AWS_SES_AP_SOUTH_1: "AWS_SES_AP_SOUTH_1";
    readonly AWS_SES_AP_SOUTH_2: "AWS_SES_AP_SOUTH_2";
    readonly AWS_SES_CA_CENTRAL_1: "AWS_SES_CA_CENTRAL_1";
    readonly AWS_SES_EU_CENTRAL_1: "AWS_SES_EU_CENTRAL_1";
    readonly AWS_SES_EU_CENTRAL_2: "AWS_SES_EU_CENTRAL_2";
    readonly AWS_SES_EU_NORTH_1: "AWS_SES_EU_NORTH_1";
    readonly AWS_SES_EU_SOUTH_1: "AWS_SES_EU_SOUTH_1";
    readonly AWS_SES_EU_WEST_1: "AWS_SES_EU_WEST_1";
    readonly AWS_SES_EU_WEST_2: "AWS_SES_EU_WEST_2";
    readonly AWS_SES_EU_WEST_3: "AWS_SES_EU_WEST_3";
    readonly AWS_SES_IL_CENTRAL_1: "AWS_SES_IL_CENTRAL_1";
    readonly AWS_SES_ME_CENTRAL_1: "AWS_SES_ME_CENTRAL_1";
    readonly AWS_SES_ME_SOUTH_1: "AWS_SES_ME_SOUTH_1";
    readonly AWS_SES_SA_EAST_1: "AWS_SES_SA_EAST_1";
    readonly AWS_SES_US_EAST_1: "AWS_SES_US_EAST_1";
    readonly AWS_SES_US_EAST_2: "AWS_SES_US_EAST_2";
    readonly AWS_SES_US_WEST_1: "AWS_SES_US_WEST_1";
    readonly AWS_SES_US_WEST_2: "AWS_SES_US_WEST_2";
    readonly EXTERNAL: "EXTERNAL";
};
/**
 * @public
 */
export type DkimSigningAttributesOrigin = (typeof DkimSigningAttributesOrigin)[keyof typeof DkimSigningAttributesOrigin];
/**
 * @public
 * @enum
 */
export declare const DkimSigningKeyLength: {
    readonly RSA_1024_BIT: "RSA_1024_BIT";
    readonly RSA_2048_BIT: "RSA_2048_BIT";
};
/**
 * @public
 */
export type DkimSigningKeyLength = (typeof DkimSigningKeyLength)[keyof typeof DkimSigningKeyLength];
/**
 * <p>An object that contains configuration for Bring Your Own DKIM (BYODKIM), or, for Easy
 *             DKIM</p>
 * @public
 */
export interface DkimSigningAttributes {
    /**
     * <p>[Bring Your Own DKIM] A string that's used to identify a public key in the DNS
     *             configuration for a domain.</p>
     * @public
     */
    DomainSigningSelector?: string | undefined;
    /**
     * <p>[Bring Your Own DKIM] A private key that's used to generate a DKIM signature.</p>
     *          <p>The private key must use 1024 or 2048-bit RSA encryption, and must be encoded using
     *             base64 encoding.</p>
     * @public
     */
    DomainSigningPrivateKey?: string | undefined;
    /**
     * <p>[Easy DKIM] The key length of the future DKIM key pair to be generated. This can be
     *             changed at most once per day.</p>
     * @public
     */
    NextSigningKeyLength?: DkimSigningKeyLength | undefined;
    /**
     * <p>The attribute to use for configuring DKIM for the identity depends on the
     *             operation:
     *         </p>
     *          <ol>
     *             <li>
     *                <p>For <code>PutEmailIdentityDkimSigningAttributes</code>:
     *                 </p>
     *                <ul>
     *                   <li>
     *                      <p>None of the values are allowed - use the
     *                             <a href="https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_PutEmailIdentityDkimSigningAttributes.html#SES-PutEmailIdentityDkimSigningAttributes-request-SigningAttributesOrigin">
     *                            <code>SigningAttributesOrigin</code>
     *                         </a>
     *                             parameter instead
     *                         </p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <p>For <code>CreateEmailIdentity</code> when replicating a parent identity's DKIM
     *                     configuration:
     *                 </p>
     *                <ul>
     *                   <li>
     *                      <p>Allowed values: All values except <code>AWS_SES</code> and
     *                             <code>EXTERNAL</code>
     *                      </p>
     *                   </li>
     *                </ul>
     *             </li>
     *          </ol>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>AWS_SES</code> – Configure DKIM for the identity by using Easy DKIM.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>EXTERNAL</code> – Configure DKIM for the identity by using Bring Your Own DKIM
     *                     (BYODKIM).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AF_SOUTH_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Africa (Cape Town) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_NORTH_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Europe (Stockholm) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTH_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Asia Pacific (Mumbai) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTH_2</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Asia Pacific (Hyderabad) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_WEST_3</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Europe (Paris) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_WEST_2</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Europe (London) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_SOUTH_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Europe (Milan) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_WEST_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Europe (Ireland) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_NORTHEAST_3</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Asia Pacific (Osaka) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_NORTHEAST_2</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Asia Pacific (Seoul) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_ME_CENTRAL_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Middle East (UAE) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_ME_SOUTH_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Middle East (Bahrain) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_NORTHEAST_1</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Asia Pacific (Tokyo) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_IL_CENTRAL_1</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Israel (Tel Aviv) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_SA_EAST_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in South America (São Paulo) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_CA_CENTRAL_1</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Canada (Central) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTHEAST_1</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Asia Pacific (Singapore) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTHEAST_2</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Asia Pacific (Sydney) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTHEAST_3</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Asia Pacific (Jakarta) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_CENTRAL_1</code> – Configure DKIM for the identity by replicating from a
     *                     parent identity in Europe (Frankfurt) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_CENTRAL_2</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in Europe (Zurich) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_EAST_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in US East (N. Virginia) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_EAST_2</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in US East (Ohio) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_WEST_1</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in US West (N. California) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_WEST_2</code> – Configure DKIM for the identity by replicating from a parent
     *                     identity in US West (Oregon) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *          </ul>
     * @public
     */
    DomainSigningAttributesOrigin?: DkimSigningAttributesOrigin | undefined;
}
/**
 * <p>A request to begin the verification process for an email identity (an email address or
 *             domain).</p>
 * @public
 */
export interface CreateEmailIdentityRequest {
    /**
     * <p>The email address or domain to verify.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) to associate with the email
     *             identity.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>If your request includes this object, Amazon SES configures the identity to use Bring Your
     *             Own DKIM (BYODKIM) for DKIM authentication purposes, or, configures the key length to be
     *             used for <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy
     *                 DKIM</a>.</p>
     *          <p>You can only specify this object if the email identity is a domain, as opposed to an
     *             address.</p>
     * @public
     */
    DkimSigningAttributes?: DkimSigningAttributes | undefined;
    /**
     * <p>The configuration set to use by default when sending from this identity. Note that any
     *             configuration set defined in the email sending request takes precedence. </p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DkimStatus: {
    readonly FAILED: "FAILED";
    readonly NOT_STARTED: "NOT_STARTED";
    readonly PENDING: "PENDING";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
/**
 * @public
 */
export type DkimStatus = (typeof DkimStatus)[keyof typeof DkimStatus];
/**
 * <p>An object that contains information about the DKIM authentication status for an email
 *             identity.</p>
 *          <p>Amazon SES determines the authentication status by searching for specific records in the
 *             DNS configuration for the domain. If you used <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy DKIM</a> to set up DKIM
 *             authentication, Amazon SES tries to find three unique CNAME records in the DNS configuration
 *             for your domain. If you provided a public key to perform DKIM authentication, Amazon SES
 *             tries to find a TXT record that uses the selector that you specified. The value of the
 *             TXT record must be a public key that's paired with the private key that you specified in
 *             the process of creating the identity</p>
 * @public
 */
export interface DkimAttributes {
    /**
     * <p>If the value is <code>true</code>, then the messages that you send from the identity
     *             are signed using DKIM. If the value is <code>false</code>, then the messages that you
     *             send from the identity aren't DKIM-signed.</p>
     * @public
     */
    SigningEnabled?: boolean | undefined;
    /**
     * <p>Describes whether or not Amazon SES has successfully located the DKIM records in the DNS
     *             records for the domain. The status can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>PENDING</code> – The verification process was initiated, but Amazon SES
     *                     hasn't yet detected the DKIM records in the DNS configuration for the
     *                     domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUCCESS</code> – The verification process completed
     *                     successfully.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The verification process failed. This typically
     *                     occurs when Amazon SES fails to find the DKIM records in the DNS configuration of the
     *                     domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TEMPORARY_FAILURE</code> – A temporary issue is preventing Amazon SES
     *                     from determining the DKIM authentication status of the domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>NOT_STARTED</code> – The DKIM verification process hasn't been
     *                     initiated for the domain.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: DkimStatus | undefined;
    /**
     * <p>If you used <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy DKIM</a> to configure DKIM authentication for the domain, then this object
     *             contains a set of unique strings that you use to create a set of CNAME records that you
     *             add to the DNS configuration for your domain. When Amazon SES detects these records in the
     *             DNS configuration for your domain, the DKIM authentication process is complete.</p>
     *          <p>If you configured DKIM authentication for the domain by providing your own
     *             public-private key pair, then this object contains the selector for the public
     *             key.</p>
     *          <p>Regardless of the DKIM authentication method you use, Amazon SES searches for the
     *             appropriate records in the DNS configuration of the domain for up to 72 hours.</p>
     * @public
     */
    Tokens?: string[] | undefined;
    /**
     * <p>A string that indicates how DKIM was configured for the identity. These are the
     *             possible values:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>AWS_SES</code> – Indicates that DKIM was configured for the
     *                     identity by using <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy DKIM</a>.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>EXTERNAL</code> – Indicates that DKIM was configured for the
     *                     identity by using Bring Your Own DKIM (BYODKIM).</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AF_SOUTH_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Africa (Cape Town) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_NORTH_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (Stockholm) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTH_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Mumbai) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTH_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Hyderabad) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_WEST_3</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (Paris) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_WEST_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (London) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_SOUTH_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (Milan) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_WEST_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (Ireland) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_NORTHEAST_3</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Osaka) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_NORTHEAST_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Seoul) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_ME_CENTRAL_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Middle East (UAE) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_ME_SOUTH_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Middle East (Bahrain) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_NORTHEAST_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Tokyo) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_IL_CENTRAL_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Israel (Tel Aviv) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_SA_EAST_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in South America (São Paulo) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_CA_CENTRAL_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Canada (Central) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTHEAST_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Singapore) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTHEAST_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Sydney) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_AP_SOUTHEAST_3</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Asia Pacific (Jakarta) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_CENTRAL_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (Frankfurt) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_EU_CENTRAL_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in Europe (Zurich) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_EAST_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in US East (N. Virginia) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_EAST_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in US East (Ohio) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_WEST_1</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in US West (N. California) region using Deterministic Easy-DKIM
     *                     (DEED).
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AWS_SES_US_WEST_2</code> – Indicates that DKIM was configured for the identity by
     *                     replicating signing attributes from a parent identity in US West (Oregon) region using Deterministic Easy-DKIM (DEED).
     *                 </p>
     *             </li>
     *          </ul>
     * @public
     */
    SigningAttributesOrigin?: DkimSigningAttributesOrigin | undefined;
    /**
     * <p>[Easy DKIM] The key length of the future DKIM key pair to be generated. This can be
     *             changed at most once per day.</p>
     * @public
     */
    NextSigningKeyLength?: DkimSigningKeyLength | undefined;
    /**
     * <p>[Easy DKIM] The key length of the DKIM key pair in use.</p>
     * @public
     */
    CurrentSigningKeyLength?: DkimSigningKeyLength | undefined;
    /**
     * <p>[Easy DKIM] The last time a key pair was generated for this identity.</p>
     * @public
     */
    LastKeyGenerationTimestamp?: Date | undefined;
}
/**
 * @public
 * @enum
 */
export declare const IdentityType: {
    readonly DOMAIN: "DOMAIN";
    readonly EMAIL_ADDRESS: "EMAIL_ADDRESS";
    readonly MANAGED_DOMAIN: "MANAGED_DOMAIN";
};
/**
 * @public
 */
export type IdentityType = (typeof IdentityType)[keyof typeof IdentityType];
/**
 * <p>If the email identity is a domain, this object contains information about the DKIM
 *             verification status for the domain.</p>
 *          <p>If the email identity is an email address, this object is empty. </p>
 * @public
 */
export interface CreateEmailIdentityResponse {
    /**
     * <p>The email identity type. Note: the <code>MANAGED_DOMAIN</code> identity type is not
     *             supported.</p>
     * @public
     */
    IdentityType?: IdentityType | undefined;
    /**
     * <p>Specifies whether or not the identity is verified. You can only send email from
     *             verified email addresses or domains. For more information about verifying identities,
     *             see the <a href="https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-email-manage-verify.html">Amazon Pinpoint User Guide</a>.</p>
     * @public
     */
    VerifiedForSendingStatus?: boolean | undefined;
    /**
     * <p>An object that contains information about the DKIM attributes for the identity.</p>
     * @public
     */
    DkimAttributes?: DkimAttributes | undefined;
}
/**
 * <p>Represents a request to create a sending authorization policy for an identity. Sending
 *             authorization is an Amazon SES feature that enables you to authorize other senders to use
 *             your identities. For information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization-identity-owner-tasks-management.html">Amazon SES Developer Guide</a>.</p>
 * @public
 */
export interface CreateEmailIdentityPolicyRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>The name of the policy.</p>
     *          <p>The policy name cannot exceed 64 characters and can only include alphanumeric
     *             characters, dashes, and underscores.</p>
     * @public
     */
    PolicyName: string | undefined;
    /**
     * <p>The text of the policy in JSON format. The policy cannot exceed 4 KB.</p>
     *          <p>For information about the syntax of sending authorization policies, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization-policies.html">Amazon SES Developer
     *                 Guide</a>.</p>
     * @public
     */
    Policy: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateEmailIdentityPolicyResponse {
}
/**
 * <p>Represents a request to create an email template. For more information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html">Amazon SES
 *                 Developer Guide</a>.</p>
 * @public
 */
export interface CreateEmailTemplateRequest {
    /**
     * <p>The name of the template.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>The content of the email template, composed of a subject line, an HTML part, and a
     *             text-only part.</p>
     * @public
     */
    TemplateContent: EmailTemplateContent | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface CreateEmailTemplateResponse {
}
/**
 * @public
 * @enum
 */
export declare const DeliveryEventType: {
    readonly COMPLAINT: "COMPLAINT";
    readonly DELIVERY: "DELIVERY";
    readonly PERMANENT_BOUNCE: "PERMANENT_BOUNCE";
    readonly SEND: "SEND";
    readonly TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE";
    readonly UNDETERMINED_BOUNCE: "UNDETERMINED_BOUNCE";
};
/**
 * @public
 */
export type DeliveryEventType = (typeof DeliveryEventType)[keyof typeof DeliveryEventType];
/**
 * @public
 * @enum
 */
export declare const EngagementEventType: {
    readonly CLICK: "CLICK";
    readonly OPEN: "OPEN";
};
/**
 * @public
 */
export type EngagementEventType = (typeof EngagementEventType)[keyof typeof EngagementEventType];
/**
 * <p>An object containing Message Insights filters.</p>
 *          <p>If you specify multiple filters, the filters are joined by AND.</p>
 *          <p>If you specify multiple values for a filter, the values are joined by OR. Filter values are case-sensitive.</p>
 *          <p>
 *             <code>FromEmailAddress</code>, <code>Destination</code>, and <code>Subject</code> filters support partial match.
 *             A partial match is performed by using the <code>*</code> wildcard character placed at the beginning (suffix match), the end (prefix match)
 *             or both ends of the string (contains match).
 *             In order to match the literal characters <code>*</code> or <code>\</code>, they must be escaped using the <code>\</code> character.
 *             If no wildcard character is present, an exact match is performed.
 *         </p>
 * @public
 */
export interface MessageInsightsFilters {
    /**
     * <p>The from address used to send the message.</p>
     * @public
     */
    FromEmailAddress?: string[] | undefined;
    /**
     * <p>The recipient's email address.</p>
     * @public
     */
    Destination?: string[] | undefined;
    /**
     * <p>The subject line of the message.</p>
     * @public
     */
    Subject?: string[] | undefined;
    /**
     * <p>The recipient's ISP (e.g., <code>Gmail</code>, <code>Yahoo</code>,
     *             etc.).</p>
     * @public
     */
    Isp?: string[] | undefined;
    /**
     * <p>
     *             The last delivery-related event for the email, where the ordering is as follows:
     *             <code>SEND</code> < <code>BOUNCE</code> < <code>DELIVERY</code> < <code>COMPLAINT</code>.
     *         </p>
     * @public
     */
    LastDeliveryEvent?: DeliveryEventType[] | undefined;
    /**
     * <p>
     *             The last engagement-related event for the email, where the ordering is as follows:
     *             <code>OPEN</code> < <code>CLICK</code>.
     *         </p>
     *          <p>
     *             Engagement events are only available if <a href="https://docs.aws.amazon.com/ses/latest/dg/vdm-settings.html">Engagement tracking</a>
     *             is enabled.
     *         </p>
     * @public
     */
    LastEngagementEvent?: EngagementEventType[] | undefined;
}
/**
 * <p>An object that contains filters applied when performing the Message Insights export.</p>
 * @public
 */
export interface MessageInsightsDataSource {
    /**
     * <p>Represents the start date for the export interval as a timestamp. The start date is inclusive.</p>
     * @public
     */
    StartDate: Date | undefined;
    /**
     * <p>Represents the end date for the export interval as a timestamp. The end date is inclusive.</p>
     * @public
     */
    EndDate: Date | undefined;
    /**
     * <p>Filters for results to be included in the export file.</p>
     * @public
     */
    Include?: MessageInsightsFilters | undefined;
    /**
     * <p>Filters for results to be excluded from the export file.</p>
     * @public
     */
    Exclude?: MessageInsightsFilters | undefined;
    /**
     * <p>The maximum number of results.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MetricAggregation: {
    readonly RATE: "RATE";
    readonly VOLUME: "VOLUME";
};
/**
 * @public
 */
export type MetricAggregation = (typeof MetricAggregation)[keyof typeof MetricAggregation];
/**
 * <p>An object that contains a mapping between a <code>Metric</code> and
 *             <code>MetricAggregation</code>.</p>
 * @public
 */
export interface ExportMetric {
    /**
     * <p>The metric to export, can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>SEND</code> - Emails sent eligible for tracking in the VDM
     *                     dashboard. This excludes emails sent to the mailbox simulator and emails
     *                     addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> - Complaints received for your account. This
     *                     excludes complaints from the mailbox simulator, those originating from your
     *                     account-level suppression list (if enabled), and those for emails addressed to
     *                     more than one recipient</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>PERMANENT_BOUNCE</code> - Permanent bounces - i.e., feedback
     *                     received for emails sent to non-existent mailboxes. Excludes bounces from the
     *                     mailbox simulator, those originating from your account-level suppression list
     *                     (if enabled), and those for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TRANSIENT_BOUNCE</code> - Transient bounces - i.e., feedback
     *                     received for delivery failures excluding issues with non-existent mailboxes.
     *                     Excludes bounces from the mailbox simulator, and those for emails addressed to
     *                     more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>OPEN</code> - Unique open events for emails including open
     *                     trackers. Excludes opens for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>CLICK</code> - Unique click events for emails including wrapped
     *                     links. Excludes clicks for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY</code> - Successful deliveries for email sending
     *                     attempts. Excludes deliveries to the mailbox simulator and for emails addressed
     *                     to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_OPEN</code> - Successful deliveries for email sending
     *                     attempts. Excludes deliveries to the mailbox simulator, for emails addressed to
     *                     more than one recipient, and emails without open trackers.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_CLICK</code> - Successful deliveries for email sending
     *                     attempts. Excludes deliveries to the mailbox simulator, for emails addressed to
     *                     more than one recipient, and emails without click trackers.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_COMPLAINT</code> - Successful deliveries for email
     *                     sending attempts. Excludes deliveries to the mailbox simulator, for emails
     *                     addressed to more than one recipient, and emails addressed to recipients hosted
     *                     by ISPs with which Amazon SES does not have a feedback loop agreement.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Name?: Metric | undefined;
    /**
     * <p>The aggregation to apply to a metric, can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>VOLUME</code> - The volume of events for this metric.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>RATE</code> - The rate for this metric relative to the
     *                     <code>SEND</code> metric volume.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Aggregation?: MetricAggregation | undefined;
}
/**
 * <p>An object that contains details about the data source for the metrics export.</p>
 * @public
 */
export interface MetricsDataSource {
    /**
     * <p>An object that contains a mapping between a <code>MetricDimensionName</code> and
     *             <code>MetricDimensionValue</code> to filter metrics by. Must contain a least 1
     *             dimension but no more than 3 unique ones.</p>
     * @public
     */
    Dimensions: Partial<Record<MetricDimensionName, string[]>> | undefined;
    /**
     * <p>The metrics namespace - e.g., <code>VDM</code>.</p>
     * @public
     */
    Namespace: MetricNamespace | undefined;
    /**
     * <p>A list of <code>ExportMetric</code> objects to export.</p>
     * @public
     */
    Metrics: ExportMetric[] | undefined;
    /**
     * <p>Represents the start date for the export interval as a timestamp.</p>
     * @public
     */
    StartDate: Date | undefined;
    /**
     * <p>Represents the end date for the export interval as a timestamp.</p>
     * @public
     */
    EndDate: Date | undefined;
}
/**
 * <p>An object that contains details about the data source of the export job. It can only
 *             contain one of <code>MetricsDataSource</code> or <code>MessageInsightsDataSource</code> object.</p>
 * @public
 */
export interface ExportDataSource {
    /**
     * <p>An object that contains details about the data source for the metrics export.</p>
     * @public
     */
    MetricsDataSource?: MetricsDataSource | undefined;
    /**
     * <p>An object that contains filters applied when performing the Message Insights export.</p>
     * @public
     */
    MessageInsightsDataSource?: MessageInsightsDataSource | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DataFormat: {
    readonly CSV: "CSV";
    readonly JSON: "JSON";
};
/**
 * @public
 */
export type DataFormat = (typeof DataFormat)[keyof typeof DataFormat];
/**
 * <p>An object that contains details about the destination of the export job.</p>
 * @public
 */
export interface ExportDestination {
    /**
     * <p>The data format of the final export job file, can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CSV</code> - A comma-separated values file.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>JSON</code> - A Json file.</p>
     *             </li>
     *          </ul>
     * @public
     */
    DataFormat: DataFormat | undefined;
    /**
     * <p>An Amazon S3 pre-signed URL that points to the generated export file.</p>
     * @public
     */
    S3Url?: string | undefined;
}
/**
 * <p>Represents a request to create an export job from a data source to a data
 *             destination.</p>
 * @public
 */
export interface CreateExportJobRequest {
    /**
     * <p>The data source for the export job.</p>
     * @public
     */
    ExportDataSource: ExportDataSource | undefined;
    /**
     * <p>The destination for the export job.</p>
     * @public
     */
    ExportDestination: ExportDestination | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateExportJobResponse {
    /**
     * <p>A string that represents the export job ID.</p>
     * @public
     */
    JobId?: string | undefined;
}
/**
 * <p>An object that contains details about the data source of the import job.</p>
 * @public
 */
export interface ImportDataSource {
    /**
     * <p>An Amazon S3 URL in the format
     *                 s3://<i><bucket_name></i>/<i><object></i>.</p>
     * @public
     */
    S3Url: string | undefined;
    /**
     * <p>The data format of the import job's data source.</p>
     * @public
     */
    DataFormat: DataFormat | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SuppressionListImportAction: {
    readonly DELETE: "DELETE";
    readonly PUT: "PUT";
};
/**
 * @public
 */
export type SuppressionListImportAction = (typeof SuppressionListImportAction)[keyof typeof SuppressionListImportAction];
/**
 * <p>An object that contains details about the action of suppression list.</p>
 * @public
 */
export interface SuppressionListDestination {
    /**
     * <p>The type of action to perform on the address. The following are possible values:</p>
     *          <ul>
     *             <li>
     *                <p>PUT: add the addresses to the suppression list. If the record already exists,
     *                     it will override it with the new value.</p>
     *             </li>
     *             <li>
     *                <p>DELETE: remove the addresses from the suppression list.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SuppressionListImportAction: SuppressionListImportAction | undefined;
}
/**
 * <p>An object that contains details about the resource destination the import job is going
 *             to target.</p>
 * @public
 */
export interface ImportDestination {
    /**
     * <p>An object that contains the action of the import job towards suppression list.</p>
     * @public
     */
    SuppressionListDestination?: SuppressionListDestination | undefined;
    /**
     * <p>An object that contains the action of the import job towards a contact list.</p>
     * @public
     */
    ContactListDestination?: ContactListDestination | undefined;
}
/**
 * <p>Represents a request to create an import job from a data source for a data
 *             destination.</p>
 * @public
 */
export interface CreateImportJobRequest {
    /**
     * <p>The destination for the import job.</p>
     * @public
     */
    ImportDestination: ImportDestination | undefined;
    /**
     * <p>The data source for the import job.</p>
     * @public
     */
    ImportDataSource: ImportDataSource | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateImportJobResponse {
    /**
     * <p>A string that represents the import job ID.</p>
     * @public
     */
    JobId?: string | undefined;
}
/**
 * <p>An object that contains route configuration. Includes secondary region name.</p>
 * @public
 */
export interface RouteDetails {
    /**
     * <p>The name of an AWS-Region to be a secondary region for the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    Region: string | undefined;
}
/**
 * <p>An object that contains configuration details of multi-region endpoint (global-endpoint).</p>
 * @public
 */
export interface Details {
    /**
     * <p>A list of route configuration details. Must contain exactly one route configuration.</p>
     * @public
     */
    RoutesDetails: RouteDetails[] | undefined;
}
/**
 * <p>Represents a request to create a multi-region endpoint (global-endpoint).</p>
 * @public
 */
export interface CreateMultiRegionEndpointRequest {
    /**
     * <p>The name of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>Contains details of a multi-region endpoint (global-endpoint) being created.</p>
     * @public
     */
    Details: Details | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) to associate with the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Status: {
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly READY: "READY";
};
/**
 * @public
 */
export type Status = (typeof Status)[keyof typeof Status];
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface CreateMultiRegionEndpointResponse {
    /**
     * <p>A status of the multi-region endpoint (global-endpoint) right after the create request.</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CREATING</code> – The resource is being provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>READY</code> – The resource is ready to use.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The resource failed to be provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELETING</code> – The resource is being deleted as requested.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: Status | undefined;
    /**
     * <p>The ID of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointId?: string | undefined;
}
/**
 * <p>Represents a request to create a tenant.</p>
 *          <p>
 *             <i>Tenants</i> are logical containers that group related SES resources together.
 *             Each tenant can have its own set of resources like email identities, configuration sets, and templates,
 *             along with reputation metrics and sending status. This helps isolate and manage email sending
 *             for different customers or business units within your Amazon SES API v2 account.</p>
 * @public
 */
export interface CreateTenantRequest {
    /**
     * <p>The name of the tenant to create. The name can contain up to 64 alphanumeric
     *             characters, including letters, numbers, hyphens (-) and underscores (_) only.</p>
     * @public
     */
    TenantName: string | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) to associate with the tenant</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SendingStatus: {
    readonly DISABLED: "DISABLED";
    readonly ENABLED: "ENABLED";
    readonly REINSTATED: "REINSTATED";
};
/**
 * @public
 */
export type SendingStatus = (typeof SendingStatus)[keyof typeof SendingStatus];
/**
 * <p>Information about a newly created tenant.</p>
 * @public
 */
export interface CreateTenantResponse {
    /**
     * <p>The name of the tenant.</p>
     * @public
     */
    TenantName?: string | undefined;
    /**
     * <p>A unique identifier for the tenant.</p>
     * @public
     */
    TenantId?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the tenant.</p>
     * @public
     */
    TenantArn?: string | undefined;
    /**
     * <p>The date and time when the tenant was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) associated with the tenant.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The status of email sending capability for the tenant.</p>
     * @public
     */
    SendingStatus?: SendingStatus | undefined;
}
/**
 * <p>Represents a request to associate a resource with a tenant.</p>
 *          <p>Resources can be email identities, configuration sets, or email templates.
 *             When you associate a resource with a tenant, you can use that resource when sending
 *             emails on behalf of that tenant.</p>
 * @public
 */
export interface CreateTenantResourceAssociationRequest {
    /**
     * <p>The name of the tenant to associate the resource with.</p>
     * @public
     */
    TenantName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the resource to associate with the tenant.</p>
     * @public
     */
    ResourceArn: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface CreateTenantResourceAssociationResponse {
}
/**
 * <p>Contains information about a custom verification email template.</p>
 * @public
 */
export interface CustomVerificationEmailTemplateMetadata {
    /**
     * <p>The name of the custom verification email template.</p>
     * @public
     */
    TemplateName?: string | undefined;
    /**
     * <p>The email address that the custom verification email is sent from.</p>
     * @public
     */
    FromEmailAddress?: string | undefined;
    /**
     * <p>The subject line of the custom verification email.</p>
     * @public
     */
    TemplateSubject?: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is successfully verified.</p>
     * @public
     */
    SuccessRedirectionURL?: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is not successfully verified.</p>
     * @public
     */
    FailureRedirectionURL?: string | undefined;
}
/**
 * <p>An object that contains inbox placement data for email sent from one of your email
 *             domains to a specific email provider.</p>
 * @public
 */
export interface DomainIspPlacement {
    /**
     * <p>The name of the email provider that the inbox placement data applies to.</p>
     * @public
     */
    IspName?: string | undefined;
    /**
     * <p>The total number of messages that were sent from the selected domain to the specified
     *             email provider that arrived in recipients' inboxes.</p>
     * @public
     */
    InboxRawCount?: number | undefined;
    /**
     * <p>The total number of messages that were sent from the selected domain to the specified
     *             email provider that arrived in recipients' spam or junk mail folders.</p>
     * @public
     */
    SpamRawCount?: number | undefined;
    /**
     * <p>The percentage of messages that were sent from the selected domain to the specified
     *             email provider that arrived in recipients' inboxes.</p>
     * @public
     */
    InboxPercentage?: number | undefined;
    /**
     * <p>The percentage of messages that were sent from the selected domain to the specified
     *             email provider that arrived in recipients' spam or junk mail folders.</p>
     * @public
     */
    SpamPercentage?: number | undefined;
}
/**
 * <p>An object that contains information about the amount of email that was delivered to
 *             recipients.</p>
 * @public
 */
export interface VolumeStatistics {
    /**
     * <p>The total number of emails that arrived in recipients' inboxes.</p>
     * @public
     */
    InboxRawCount?: number | undefined;
    /**
     * <p>The total number of emails that arrived in recipients' spam or junk mail
     *             folders.</p>
     * @public
     */
    SpamRawCount?: number | undefined;
    /**
     * <p>An estimate of the percentage of emails sent from the current domain that will arrive
     *             in recipients' inboxes.</p>
     * @public
     */
    ProjectedInbox?: number | undefined;
    /**
     * <p>An estimate of the percentage of emails sent from the current domain that will arrive
     *             in recipients' spam or junk mail folders.</p>
     * @public
     */
    ProjectedSpam?: number | undefined;
}
/**
 * <p>An object that contains information about the volume of email sent on each day of the
 *             analysis period.</p>
 * @public
 */
export interface DailyVolume {
    /**
     * <p>The date that the DailyVolume metrics apply to, in Unix time.</p>
     * @public
     */
    StartDate?: Date | undefined;
    /**
     * <p>An object that contains inbox placement metrics for a specific day in the analysis
     *             period.</p>
     * @public
     */
    VolumeStatistics?: VolumeStatistics | undefined;
    /**
     * <p>An object that contains inbox placement metrics for a specified day in the analysis
     *             period, broken out by the recipient's email provider.</p>
     * @public
     */
    DomainIspPlacements?: DomainIspPlacement[] | undefined;
}
/**
 * <p>An object containing additional settings for your VDM configuration as applicable to
 *             the Dashboard.</p>
 * @public
 */
export interface DashboardAttributes {
    /**
     * <p>Specifies the status of your VDM engagement metrics collection. Can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Amazon SES enables engagement metrics for your
     *                     account.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Amazon SES disables engagement metrics for your
     *                     account.</p>
     *             </li>
     *          </ul>
     * @public
     */
    EngagementMetrics?: FeatureStatus | undefined;
}
/**
 * @public
 * @enum
 */
export declare const WarmupStatus: {
    readonly DONE: "DONE";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly NOT_APPLICABLE: "NOT_APPLICABLE";
};
/**
 * @public
 */
export type WarmupStatus = (typeof WarmupStatus)[keyof typeof WarmupStatus];
/**
 * <p>Contains information about a dedicated IP address that is associated with your Amazon SES
 *             account.</p>
 *          <p>To learn more about requesting dedicated IP addresses, see <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/dedicated-ip-case.html">Requesting and Relinquishing
 *                 Dedicated IP Addresses</a> in the <i>Amazon SES Developer
 *             Guide</i>.</p>
 * @public
 */
export interface DedicatedIp {
    /**
     * <p>An IPv4 address.</p>
     * @public
     */
    Ip: string | undefined;
    /**
     * <p>The warm-up status of a dedicated IP address. The status can have one of the following
     *             values:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>IN_PROGRESS</code> – The IP address isn't ready to use because the
     *                     dedicated IP warm-up process is ongoing.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DONE</code> – The dedicated IP warm-up process is complete, and
     *                     the IP address is ready to use.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>NOT_APPLICABLE</code> – The warm-up status doesn't apply to this IP address.
     *                     This status is used for IP addresses in managed dedicated IP pools, where Amazon SES automatically
     *                     handles the warm-up process.</p>
     *             </li>
     *          </ul>
     * @public
     */
    WarmupStatus: WarmupStatus | undefined;
    /**
     * <p>Indicates the progress of your dedicated IP warm-up:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>0-100</code> – For standard dedicated IP addresses, this shows the warm-up completion percentage. A value of 100 means the IP address is fully warmed up and ready for use.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>-1</code> – Appears for IP addresses in managed dedicated pools where Amazon SES automatically handles the warm-up process, making the percentage not applicable.</p>
     *             </li>
     *          </ul>
     * @public
     */
    WarmupPercentage: number | undefined;
    /**
     * <p>The name of the dedicated IP pool that the IP address is associated with.</p>
     * @public
     */
    PoolName?: string | undefined;
}
/**
 * <p>Contains information about a dedicated IP pool.</p>
 * @public
 */
export interface DedicatedIpPool {
    /**
     * <p>The name of the dedicated IP pool.</p>
     * @public
     */
    PoolName: string | undefined;
    /**
     * <p>The type of the dedicated IP pool.</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>STANDARD</code> – A dedicated IP pool where you can
     *                     control which IPs are part of the pool.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>MANAGED</code> – A dedicated IP pool where the reputation and
     *                     number of IPs are automatically managed by Amazon SES.</p>
     *             </li>
     *          </ul>
     * @public
     */
    ScalingMode: ScalingMode | undefined;
}
/**
 * <p>A request to delete a configuration set.</p>
 * @public
 */
export interface DeleteConfigurationSetRequest {
    /**
     * <p>The name of the configuration set.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteConfigurationSetResponse {
}
/**
 * <p>A request to delete an event destination from a configuration set.</p>
 * @public
 */
export interface DeleteConfigurationSetEventDestinationRequest {
    /**
     * <p>The name of the configuration set that contains the event destination to
     *             delete.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>The name of the event destination to delete.</p>
     * @public
     */
    EventDestinationName: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteConfigurationSetEventDestinationResponse {
}
/**
 * @public
 */
export interface DeleteContactRequest {
    /**
     * <p>The name of the contact list from which the contact should be removed.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>The contact's email address.</p>
     * @public
     */
    EmailAddress: string | undefined;
}
/**
 * @public
 */
export interface DeleteContactResponse {
}
/**
 * @public
 */
export interface DeleteContactListRequest {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
}
/**
 * @public
 */
export interface DeleteContactListResponse {
}
/**
 * <p>Represents a request to delete an existing custom verification email template.</p>
 * @public
 */
export interface DeleteCustomVerificationEmailTemplateRequest {
    /**
     * <p>The name of the custom verification email template that you want to delete.</p>
     * @public
     */
    TemplateName: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface DeleteCustomVerificationEmailTemplateResponse {
}
/**
 * <p>A request to delete a dedicated IP pool.</p>
 * @public
 */
export interface DeleteDedicatedIpPoolRequest {
    /**
     * <p>The name of the dedicated IP pool that you want to delete.</p>
     * @public
     */
    PoolName: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteDedicatedIpPoolResponse {
}
/**
 * <p>A request to delete an existing email identity. When you delete an identity, you lose
 *             the ability to send email from that identity. You can restore your ability to send email
 *             by completing the verification process for the identity again.</p>
 * @public
 */
export interface DeleteEmailIdentityRequest {
    /**
     * <p>The identity (that is, the email address or domain) to delete.</p>
     * @public
     */
    EmailIdentity: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteEmailIdentityResponse {
}
/**
 * <p>Represents a request to delete a sending authorization policy for an identity. Sending
 *             authorization is an Amazon SES feature that enables you to authorize other senders to
 *             use your identities. For information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization-identity-owner-tasks-management.html">Amazon SES Developer Guide</a>.</p>
 * @public
 */
export interface DeleteEmailIdentityPolicyRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>The name of the policy.</p>
     *          <p>The policy name cannot exceed 64 characters and can only include alphanumeric
     *             characters, dashes, and underscores.</p>
     * @public
     */
    PolicyName: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteEmailIdentityPolicyResponse {
}
/**
 * <p>Represents a request to delete an email template. For more information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html">Amazon SES Developer
 *                 Guide</a>.</p>
 * @public
 */
export interface DeleteEmailTemplateRequest {
    /**
     * <p>The name of the template to be deleted.</p>
     * @public
     */
    TemplateName: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface DeleteEmailTemplateResponse {
}
/**
 * <p>Represents a request to delete a multi-region endpoint (global-endpoint).</p>
 * @public
 */
export interface DeleteMultiRegionEndpointRequest {
    /**
     * <p>The name of the multi-region endpoint (global-endpoint) to be deleted.</p>
     * @public
     */
    EndpointName: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteMultiRegionEndpointResponse {
    /**
     * <p>A status of the multi-region endpoint (global-endpoint) right after the delete request.</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CREATING</code> – The resource is being provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>READY</code> – The resource is ready to use.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The resource failed to be provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELETING</code> – The resource is being deleted as requested.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: Status | undefined;
}
/**
 * <p>A request to remove an email address from the suppression list for your
 *             account.</p>
 * @public
 */
export interface DeleteSuppressedDestinationRequest {
    /**
     * <p>The suppressed email destination to remove from the account suppression list.</p>
     * @public
     */
    EmailAddress: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface DeleteSuppressedDestinationResponse {
}
/**
 * <p>Represents a request to delete a tenant.</p>
 * @public
 */
export interface DeleteTenantRequest {
    /**
     * <p>The name of the tenant to delete.</p>
     * @public
     */
    TenantName: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface DeleteTenantResponse {
}
/**
 * <p>Represents a request to delete an association between a tenant and a resource.</p>
 * @public
 */
export interface DeleteTenantResourceAssociationRequest {
    /**
     * <p>The name of the tenant to remove the resource association from.</p>
     * @public
     */
    TenantName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the resource to remove from the tenant association.</p>
     * @public
     */
    ResourceArn: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface DeleteTenantResourceAssociationResponse {
}
/**
 * @public
 * @enum
 */
export declare const DeliverabilityDashboardAccountStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly DISABLED: "DISABLED";
    readonly PENDING_EXPIRATION: "PENDING_EXPIRATION";
};
/**
 * @public
 */
export type DeliverabilityDashboardAccountStatus = (typeof DeliverabilityDashboardAccountStatus)[keyof typeof DeliverabilityDashboardAccountStatus];
/**
 * <p>An object that contains metadata related to a predictive inbox placement test.</p>
 * @public
 */
export interface DeliverabilityTestReport {
    /**
     * <p>A unique string that identifies the predictive inbox placement test.</p>
     * @public
     */
    ReportId?: string | undefined;
    /**
     * <p>A name that helps you identify a predictive inbox placement test report.</p>
     * @public
     */
    ReportName?: string | undefined;
    /**
     * <p>The subject line for an email that you submitted in a predictive inbox placement test.</p>
     * @public
     */
    Subject?: string | undefined;
    /**
     * <p>The sender address that you specified for the predictive inbox placement test.</p>
     * @public
     */
    FromEmailAddress?: string | undefined;
    /**
     * <p>The date and time when the predictive inbox placement test was created.</p>
     * @public
     */
    CreateDate?: Date | undefined;
    /**
     * <p>The status of the predictive inbox placement test. If the status is <code>IN_PROGRESS</code>, then the predictive inbox placement test
     *             is currently running. Predictive inbox placement tests are usually complete within 24 hours of creating the
     *             test. If the status is <code>COMPLETE</code>, then the test is finished, and you can use
     *             the <code>GetDeliverabilityTestReport</code> to view the results of the test.</p>
     * @public
     */
    DeliverabilityTestStatus?: DeliverabilityTestStatus | undefined;
}
/**
 * <p>An object that contains the deliverability data for a specific campaign. This data is
 *             available for a campaign only if the campaign sent email by using a domain that the
 *             Deliverability dashboard is enabled for (<code>PutDeliverabilityDashboardOption</code>
 *             operation).</p>
 * @public
 */
export interface DomainDeliverabilityCampaign {
    /**
     * <p>The unique identifier for the campaign. The Deliverability dashboard automatically generates
     *             and assigns this identifier to a campaign.</p>
     * @public
     */
    CampaignId?: string | undefined;
    /**
     * <p>The URL of an image that contains a snapshot of the email message that was
     *             sent.</p>
     * @public
     */
    ImageUrl?: string | undefined;
    /**
     * <p>The subject line, or title, of the email message.</p>
     * @public
     */
    Subject?: string | undefined;
    /**
     * <p>The verified email address that the email message was sent from.</p>
     * @public
     */
    FromAddress?: string | undefined;
    /**
     * <p>The IP addresses that were used to send the email message.</p>
     * @public
     */
    SendingIps?: string[] | undefined;
    /**
     * <p>The first time when the email message was delivered to any
     *             recipient's inbox. This value can help you determine how long it took for a campaign to
     *             deliver an email message.</p>
     * @public
     */
    FirstSeenDateTime?: Date | undefined;
    /**
     * <p>The last time when the email message was delivered to any
     *             recipient's inbox. This value can help you determine how long it took for a campaign to
     *             deliver an email message.</p>
     * @public
     */
    LastSeenDateTime?: Date | undefined;
    /**
     * <p>The number of email messages that were delivered to recipients’ inboxes.</p>
     * @public
     */
    InboxCount?: number | undefined;
    /**
     * <p>The number of email messages that were delivered to recipients' spam or junk mail
     *             folders.</p>
     * @public
     */
    SpamCount?: number | undefined;
    /**
     * <p>The percentage of email messages that were opened by recipients. Due to technical
     *             limitations, this value only includes recipients who opened the message by using an
     *             email client that supports images.</p>
     * @public
     */
    ReadRate?: number | undefined;
    /**
     * <p>The percentage of email messages that were deleted by recipients, without being opened
     *             first. Due to technical limitations, this value only includes recipients who opened the
     *             message by using an email client that supports images.</p>
     * @public
     */
    DeleteRate?: number | undefined;
    /**
     * <p>The percentage of email messages that were opened and then deleted by recipients. Due
     *             to technical limitations, this value only includes recipients who opened the message by
     *             using an email client that supports images.</p>
     * @public
     */
    ReadDeleteRate?: number | undefined;
    /**
     * <p>The projected number of recipients that the email message was sent to.</p>
     * @public
     */
    ProjectedVolume?: number | undefined;
    /**
     * <p>The major email providers who handled the email message.</p>
     * @public
     */
    Esps?: string[] | undefined;
}
/**
 * <p>An object that contains information about the inbox placement data settings for a
 *             verified domain that’s associated with your Amazon Web Services account. This data is available only
 *             if you enabled the Deliverability dashboard for the domain.</p>
 * @public
 */
export interface InboxPlacementTrackingOption {
    /**
     * <p>Specifies whether inbox placement data is being tracked for the domain.</p>
     * @public
     */
    Global?: boolean | undefined;
    /**
     * <p>An array of strings, one for each major email provider that the inbox placement data
     *             applies to.</p>
     * @public
     */
    TrackedIsps?: string[] | undefined;
}
/**
 * <p>An object that contains information about the Deliverability dashboard subscription for a
 *             verified domain that you use to send email and currently has an active Deliverability dashboard
 *             subscription. If a Deliverability dashboard subscription is active for a domain, you gain access
 *             to reputation, inbox placement, and other metrics for the domain.</p>
 * @public
 */
export interface DomainDeliverabilityTrackingOption {
    /**
     * <p>A verified domain that’s associated with your Amazon Web Services account and currently has an
     *             active Deliverability dashboard subscription.</p>
     * @public
     */
    Domain?: string | undefined;
    /**
     * <p>The date when you enabled the Deliverability dashboard for the
     *             domain.</p>
     * @public
     */
    SubscriptionStartDate?: Date | undefined;
    /**
     * <p>An object that contains information about the inbox placement data settings for the
     *             domain.</p>
     * @public
     */
    InboxPlacementTrackingOption?: InboxPlacementTrackingOption | undefined;
}
/**
 * <p>
 *             Contains a <code>Bounce</code> object if the event type is <code>BOUNCE</code>.
 *             Contains a <code>Complaint</code> object if the event type is <code>COMPLAINT</code>.
 *         </p>
 * @public
 */
export interface EventDetails {
    /**
     * <p>Information about a <code>Bounce</code> event.</p>
     * @public
     */
    Bounce?: Bounce | undefined;
    /**
     * <p>Information about a <code>Complaint</code> event.</p>
     * @public
     */
    Complaint?: Complaint | undefined;
}
/**
 * <p>An object containing details about a specific event.</p>
 * @public
 */
export interface InsightsEvent {
    /**
     * <p>The timestamp of the event.</p>
     * @public
     */
    Timestamp?: Date | undefined;
    /**
     * <p>The type of event:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>SEND</code> - The send request was successful and SES will
     *                     attempt to deliver the message to the recipient’s mail server. (If account-level
     *                     or global suppression is being used, SES will still count it as a send,
     *                     but delivery is suppressed.)
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY</code> - SES successfully delivered the email to the
     *                     recipient's mail server. Excludes deliveries to the mailbox simulator,
     *                     and those from emails addressed to more than one recipient.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>BOUNCE</code> - Feedback received for delivery failures. Additional details about the bounce are provided in the <code>Details</code> object.
     *                     Excludes bounces from the mailbox simulator, and those from emails addressed to more than one recipient.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> - Complaint received for the email. Additional details about the complaint are provided in the <code>Details</code> object.
     *                     This excludes complaints from the mailbox simulator, those originating from
     *                     your account-level suppression list (if enabled), and those from emails addressed
     *                     to more than one recipient.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>OPEN</code> - Open event for emails including open trackers.
     *                     Excludes opens for emails addressed to more than one recipient.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>CLICK</code> - Click event for emails including wrapped links.
     *                     Excludes clicks for emails addressed to more than one recipient.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Type?: EventType | undefined;
    /**
     * <p>Details about bounce or complaint events.</p>
     * @public
     */
    Details?: EventDetails | undefined;
}
/**
 * <p>An email's insights contain metadata and delivery information about a specific email.</p>
 * @public
 */
export interface EmailInsights {
    /**
     * <p>The recipient of the email.</p>
     * @public
     */
    Destination?: string | undefined;
    /**
     * <p>The recipient's ISP (e.g., <code>Gmail</code>, <code>Yahoo</code>,
     *         etc.).</p>
     * @public
     */
    Isp?: string | undefined;
    /**
     * <p>A list of events associated with the sent email.</p>
     * @public
     */
    Events?: InsightsEvent[] | undefined;
}
/**
 * <p>Contains information about an email template.</p>
 * @public
 */
export interface EmailTemplateMetadata {
    /**
     * <p>The name of the template.</p>
     * @public
     */
    TemplateName?: string | undefined;
    /**
     * <p>The time and date the template was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
}
/**
 * <p>In the Amazon SES API v2, <i>events</i> include message sends, deliveries, opens,
 *             clicks, bounces, complaints and delivery delays. <i>Event destinations</i>
 *             are places that you can send information about these events to. For example, you can
 *             send event data to Amazon SNS to receive notifications when you receive bounces or
 *             complaints, or you can use Amazon Kinesis Data Firehose to stream data to Amazon S3 for long-term storage.</p>
 * @public
 */
export interface EventDestination {
    /**
     * <p>A name that identifies the event destination.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>If <code>true</code>, the event destination is enabled. When the event destination is
     *             enabled, the specified event types are sent to the destinations in this
     *                 <code>EventDestinationDefinition</code>.</p>
     *          <p>If <code>false</code>, the event destination is disabled. When the event destination
     *             is disabled, events aren't sent to the specified destinations.</p>
     * @public
     */
    Enabled?: boolean | undefined;
    /**
     * <p>The types of events that Amazon SES sends to the specified event destinations.</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>SEND</code> - The send request was successful and SES will
     *                     attempt to deliver the message to the recipient’s mail server. (If account-level
     *                     or global suppression is being used, SES will still count it as a send,
     *                     but delivery is suppressed.)</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REJECT</code> - SES accepted the email, but determined that it
     *                     contained a virus and didn’t attempt to deliver it to the recipient’s mail
     *                     server.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>BOUNCE</code> - (<i>Hard bounce</i>) The recipient's
     *                     mail server permanently rejected the email. (<i>Soft bounces</i>
     *                     are only included when SES fails to deliver the email after retrying for
     *                     a period of time.)</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> - The email was successfully delivered to the
     *                     recipient’s mail server, but the recipient marked it as spam.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY</code> - SES successfully delivered the email to the
     *                     recipient's mail server.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>OPEN</code> - The recipient received the message and opened it in their
     *                     email client.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>CLICK</code> - The recipient clicked one or more links in the
     *                     email.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>RENDERING_FAILURE</code> - The email wasn't sent because of a
     *                     template rendering issue. This event type can occur when template data is
     *                     missing, or when there is a mismatch between template parameters and data. (This
     *                     event type only occurs when you send email using the <a href="https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html">
     *                      <code>SendEmail</code>
     *                   </a> or <a href="https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendBulkEmail.html">
     *                      <code>SendBulkEmail</code>
     *                   </a> API operations.) </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELIVERY_DELAY</code> - The email couldn't be delivered to the
     *                     recipient’s mail server because a temporary issue occurred. Delivery delays can
     *                     occur, for example, when the recipient's inbox is full, or when the
     *                     receiving email server experiences a transient issue.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUBSCRIPTION</code> - The email was successfully delivered, but the
     *                     recipient updated their subscription preferences by clicking on an
     *                         <i>unsubscribe</i> link as part of your <a href="https://docs.aws.amazon.com/ses/latest/dg/sending-email-subscription-management.html">subscription
     *                         management</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    MatchingEventTypes: EventType[] | undefined;
    /**
     * <p>An object that defines an Amazon Kinesis Data Firehose destination for email events. You can use Amazon Kinesis Data Firehose to
     *             stream data to other services, such as Amazon S3 and Amazon Redshift.</p>
     * @public
     */
    KinesisFirehoseDestination?: KinesisFirehoseDestination | undefined;
    /**
     * <p>An object that defines an Amazon CloudWatch destination for email events. You can use Amazon CloudWatch to
     *             monitor and gain insights on your email sending metrics.</p>
     * @public
     */
    CloudWatchDestination?: CloudWatchDestination | undefined;
    /**
     * <p>An object that defines an Amazon SNS destination for email events. You can use Amazon SNS to
     *             send notifications when certain email events occur.</p>
     * @public
     */
    SnsDestination?: SnsDestination | undefined;
    /**
     * <p>An object that defines an Amazon EventBridge destination for email events. You can use Amazon EventBridge to
     *             send notifications when certain email events occur.</p>
     * @public
     */
    EventBridgeDestination?: EventBridgeDestination | undefined;
    /**
     * <p>An object that defines an Amazon Pinpoint project destination for email events. You can send
     *             email event data to a Amazon Pinpoint project to view metrics using the Transactional Messaging
     *             dashboards that are built in to Amazon Pinpoint. For more information, see <a href="https://docs.aws.amazon.com/pinpoint/latest/userguide/analytics-transactional-messages.html">Transactional
     *                 Messaging Charts</a> in the <i>Amazon Pinpoint User Guide</i>.</p>
     * @public
     */
    PinpointDestination?: PinpointDestination | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ExportSourceType: {
    readonly MESSAGE_INSIGHTS: "MESSAGE_INSIGHTS";
    readonly METRICS_DATA: "METRICS_DATA";
};
/**
 * @public
 */
export type ExportSourceType = (typeof ExportSourceType)[keyof typeof ExportSourceType];
/**
 * @public
 * @enum
 */
export declare const JobStatus: {
    readonly CANCELLED: "CANCELLED";
    readonly COMPLETED: "COMPLETED";
    readonly CREATED: "CREATED";
    readonly FAILED: "FAILED";
    readonly PROCESSING: "PROCESSING";
};
/**
 * @public
 */
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
/**
 * <p>A summary of the export job.</p>
 * @public
 */
export interface ExportJobSummary {
    /**
     * <p>The export job ID.</p>
     * @public
     */
    JobId?: string | undefined;
    /**
     * <p>The source type of the export job.</p>
     * @public
     */
    ExportSourceType?: ExportSourceType | undefined;
    /**
     * <p>The status of the export job.</p>
     * @public
     */
    JobStatus?: JobStatus | undefined;
    /**
     * <p>The timestamp of when the export job was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The timestamp of when the export job was completed.</p>
     * @public
     */
    CompletedTimestamp?: Date | undefined;
}
/**
 * <p>Statistics about the execution of an export job.</p>
 * @public
 */
export interface ExportStatistics {
    /**
     * <p>The number of records that were processed to generate the final export file.</p>
     * @public
     */
    ProcessedRecordsCount?: number | undefined;
    /**
     * <p>The number of records that were exported to the final export file.</p>
     *          <p>This value might not be available for all export source types</p>
     * @public
     */
    ExportedRecordsCount?: number | undefined;
}
/**
 * <p>An object that contains the failure details about a job.</p>
 * @public
 */
export interface FailureInfo {
    /**
     * <p>An Amazon S3 pre-signed URL that contains all the failed records and related information.</p>
     * @public
     */
    FailedRecordsS3Url?: string | undefined;
    /**
     * <p>A message about why the job failed.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * <p>A request to obtain information about the email-sending capabilities of your Amazon SES
 *             account.</p>
 * @public
 */
export interface GetAccountRequest {
}
/**
 * <p>An object that contains information about the per-day and per-second sending limits
 *             for your Amazon SES account in the current Amazon Web Services Region.</p>
 * @public
 */
export interface SendQuota {
    /**
     * <p>The maximum number of emails that you can send in the current Amazon Web Services Region over a
     *             24-hour period. A value of -1 signifies an unlimited quota. (This value is also referred
     *             to as your <i>sending quota</i>.)</p>
     * @public
     */
    Max24HourSend?: number | undefined;
    /**
     * <p>The maximum number of emails that you can send per second in the current Amazon Web Services Region.
     *             This value is also called your <i>maximum sending rate</i> or your
     *                 <i>maximum TPS (transactions per second) rate</i>.</p>
     * @public
     */
    MaxSendRate?: number | undefined;
    /**
     * <p>The number of emails sent from your Amazon SES account in the current Amazon Web Services Region over the
     *             past 24 hours.</p>
     * @public
     */
    SentLast24Hours?: number | undefined;
}
/**
 * <p>An object that contains information about the email address suppression preferences
 *             for your account in the current Amazon Web Services Region.</p>
 * @public
 */
export interface SuppressionAttributes {
    /**
     * <p>A list that contains the reasons that email addresses will be automatically added to
     *             the suppression list for your account. This list can contain any or all of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a
     *                     complaint.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>BOUNCE</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a hard
     *                     bounce.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SuppressedReasons?: SuppressionListReason[] | undefined;
}
/**
 * <p>An object containing additional settings for your VDM configuration as applicable to
 *             the Guardian.</p>
 * @public
 */
export interface GuardianAttributes {
    /**
     * <p>Specifies the status of your VDM optimized shared delivery. Can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Amazon SES enables optimized shared delivery for your
     *                     account.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Amazon SES disables optimized shared delivery for
     *                     your account.</p>
     *             </li>
     *          </ul>
     * @public
     */
    OptimizedSharedDelivery?: FeatureStatus | undefined;
}
/**
 * <p>The VDM attributes that apply to your Amazon SES account.</p>
 * @public
 */
export interface VdmAttributes {
    /**
     * <p>Specifies the status of your VDM configuration. Can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Amazon SES enables VDM for your account.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Amazon SES disables VDM for your account.</p>
     *             </li>
     *          </ul>
     * @public
     */
    VdmEnabled: FeatureStatus | undefined;
    /**
     * <p>Specifies additional settings for your VDM configuration as applicable to the
     *             Dashboard.</p>
     * @public
     */
    DashboardAttributes?: DashboardAttributes | undefined;
    /**
     * <p>Specifies additional settings for your VDM configuration as applicable to the
     *             Guardian.</p>
     * @public
     */
    GuardianAttributes?: GuardianAttributes | undefined;
}
/**
 * <p>A list of details about the email-sending capabilities of your Amazon SES account in the
 *             current Amazon Web Services Region.</p>
 * @public
 */
export interface GetAccountResponse {
    /**
     * <p>Indicates whether or not the automatic warm-up feature is enabled for dedicated IP
     *             addresses that are associated with your account.</p>
     * @public
     */
    DedicatedIpAutoWarmupEnabled?: boolean | undefined;
    /**
     * <p>The reputation status of your Amazon SES account. The status can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>HEALTHY</code> – There are no reputation-related issues that
     *                     currently impact your account.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>PROBATION</code> – We've identified potential issues with your
     *                     Amazon SES account. We're placing your account under review while you work on
     *                     correcting these issues.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SHUTDOWN</code> – Your account's ability to send email is
     *                     currently paused because of an issue with the email sent from your account. When
     *                     you correct the issue, you can contact us and request that your account's
     *                     ability to send email is resumed.</p>
     *             </li>
     *          </ul>
     * @public
     */
    EnforcementStatus?: string | undefined;
    /**
     * <p>Indicates whether or not your account has production access in the current Amazon Web Services
     *             Region.</p>
     *          <p>If the value is <code>false</code>, then your account is in the
     *                 <i>sandbox</i>. When your account is in the sandbox, you can only send
     *             email to verified identities.
     *             </p>
     *          <p>If the value is <code>true</code>, then your account has production access. When your
     *             account has production access, you can send email to any address. The sending quota and
     *             maximum sending rate for your account vary based on your specific use case.</p>
     * @public
     */
    ProductionAccessEnabled?: boolean | undefined;
    /**
     * <p>An object that contains information about the per-day and per-second sending limits
     *             for your Amazon SES account in the current Amazon Web Services Region.</p>
     * @public
     */
    SendQuota?: SendQuota | undefined;
    /**
     * <p>Indicates whether or not email sending is enabled for your Amazon SES account in the
     *             current Amazon Web Services Region.</p>
     * @public
     */
    SendingEnabled?: boolean | undefined;
    /**
     * <p>An object that contains information about the email address suppression preferences
     *             for your account in the current Amazon Web Services Region.</p>
     * @public
     */
    SuppressionAttributes?: SuppressionAttributes | undefined;
    /**
     * <p>An object that defines your account details.</p>
     * @public
     */
    Details?: AccountDetails | undefined;
    /**
     * <p>The VDM attributes that apply to your Amazon SES account.</p>
     * @public
     */
    VdmAttributes?: VdmAttributes | undefined;
}
/**
 * <p>A request to retrieve a list of the blacklists that your dedicated IP addresses appear
 *             on.</p>
 * @public
 */
export interface GetBlacklistReportsRequest {
    /**
     * <p>A list of IP addresses that you want to retrieve blacklist information about. You can
     *             only specify the dedicated IP addresses that you use to send email using Amazon SES or
     *             Amazon Pinpoint.</p>
     * @public
     */
    BlacklistItemNames: string[] | undefined;
}
/**
 * <p>An object that contains information about blacklist events.</p>
 * @public
 */
export interface GetBlacklistReportsResponse {
    /**
     * <p>An object that contains information about a blacklist that one of your dedicated IP
     *             addresses appears on.</p>
     * @public
     */
    BlacklistReport: Record<string, BlacklistEntry[]> | undefined;
}
/**
 * <p>A request to obtain information about a configuration set.</p>
 * @public
 */
export interface GetConfigurationSetRequest {
    /**
     * <p>The name of the configuration set.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
}
/**
 * <p>Information about a configuration set.</p>
 * @public
 */
export interface GetConfigurationSetResponse {
    /**
     * <p>The name of the configuration set.</p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
    /**
     * <p>An object that defines the open and click tracking options for emails that you send
     *             using the configuration set.</p>
     * @public
     */
    TrackingOptions?: TrackingOptions | undefined;
    /**
     * <p>An object that defines the dedicated IP pool that is used to send emails that you send
     *             using the configuration set.</p>
     * @public
     */
    DeliveryOptions?: DeliveryOptions | undefined;
    /**
     * <p>An object that defines whether or not Amazon SES collects reputation metrics for the emails
     *             that you send that use the configuration set.</p>
     * @public
     */
    ReputationOptions?: ReputationOptions | undefined;
    /**
     * <p>An object that defines whether or not Amazon SES can send email that you send using the
     *             configuration set.</p>
     * @public
     */
    SendingOptions?: SendingOptions | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) that are associated with
     *             the configuration set.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>An object that contains information about the suppression list preferences for your
     *             account.</p>
     * @public
     */
    SuppressionOptions?: SuppressionOptions | undefined;
    /**
     * <p>An object that contains information about the VDM preferences for your configuration
     *             set.</p>
     * @public
     */
    VdmOptions?: VdmOptions | undefined;
    /**
     * <p>An object that defines the MailManager archive where sent emails are archived that you send
     *             using the configuration set.</p>
     * @public
     */
    ArchivingOptions?: ArchivingOptions | undefined;
}
/**
 * <p>A request to obtain information about the event destinations for a configuration
 *             set.</p>
 * @public
 */
export interface GetConfigurationSetEventDestinationsRequest {
    /**
     * <p>The name of the configuration set that contains the event destination.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
}
/**
 * <p>Information about an event destination for a configuration set.</p>
 * @public
 */
export interface GetConfigurationSetEventDestinationsResponse {
    /**
     * <p>An array that includes all of the events destinations that have been configured for
     *             the configuration set.</p>
     * @public
     */
    EventDestinations?: EventDestination[] | undefined;
}
/**
 * @public
 */
export interface GetContactRequest {
    /**
     * <p>The name of the contact list to which the contact belongs.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>The contact's email address.</p>
     * @public
     */
    EmailAddress: string | undefined;
}
/**
 * @public
 */
export interface GetContactResponse {
    /**
     * <p>The name of the contact list to which the contact belongs.</p>
     * @public
     */
    ContactListName?: string | undefined;
    /**
     * <p>The contact's email address.</p>
     * @public
     */
    EmailAddress?: string | undefined;
    /**
     * <p>The contact's preference for being opted-in to or opted-out of a topic.></p>
     * @public
     */
    TopicPreferences?: TopicPreference[] | undefined;
    /**
     * <p>The default topic preferences applied to the contact.</p>
     * @public
     */
    TopicDefaultPreferences?: TopicPreference[] | undefined;
    /**
     * <p>A boolean value status noting if the contact is unsubscribed from all contact list
     *             topics.</p>
     * @public
     */
    UnsubscribeAll?: boolean | undefined;
    /**
     * <p>The attribute data attached to a contact.</p>
     * @public
     */
    AttributesData?: string | undefined;
    /**
     * <p>A timestamp noting when the contact was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>A timestamp noting the last time the contact's information was updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
}
/**
 * @public
 */
export interface GetContactListRequest {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
}
/**
 * @public
 */
export interface GetContactListResponse {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName?: string | undefined;
    /**
     * <p>An interest group, theme, or label within a list. A contact list can have multiple
     *             topics.</p>
     * @public
     */
    Topics?: Topic[] | undefined;
    /**
     * <p>A description of what the contact list is about.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A timestamp noting when the contact list was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>A timestamp noting the last time the contact list was updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
    /**
     * <p>The tags associated with a contact list.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>Represents a request to retrieve an existing custom verification email
 *             template.</p>
 * @public
 */
export interface GetCustomVerificationEmailTemplateRequest {
    /**
     * <p>The name of the custom verification email template that you want to retrieve.</p>
     * @public
     */
    TemplateName: string | undefined;
}
/**
 * <p>The following elements are returned by the service.</p>
 * @public
 */
export interface GetCustomVerificationEmailTemplateResponse {
    /**
     * <p>The name of the custom verification email template.</p>
     * @public
     */
    TemplateName?: string | undefined;
    /**
     * <p>The email address that the custom verification email is sent from.</p>
     * @public
     */
    FromEmailAddress?: string | undefined;
    /**
     * <p>The subject line of the custom verification email.</p>
     * @public
     */
    TemplateSubject?: string | undefined;
    /**
     * <p>The content of the custom verification email.</p>
     * @public
     */
    TemplateContent?: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is successfully verified.</p>
     * @public
     */
    SuccessRedirectionURL?: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is not successfully verified.</p>
     * @public
     */
    FailureRedirectionURL?: string | undefined;
}
/**
 * <p>A request to obtain more information about a dedicated IP address.</p>
 * @public
 */
export interface GetDedicatedIpRequest {
    /**
     * <p>The IP address that you want to obtain more information about. The value you specify
     *             has to be a dedicated IP address that's assocaited with your Amazon Web Services account.</p>
     * @public
     */
    Ip: string | undefined;
}
/**
 * <p>Information about a dedicated IP address.</p>
 * @public
 */
export interface GetDedicatedIpResponse {
    /**
     * <p>An object that contains information about a dedicated IP address.</p>
     * @public
     */
    DedicatedIp?: DedicatedIp | undefined;
}
/**
 * <p>A request to obtain more information about a dedicated IP pool.</p>
 * @public
 */
export interface GetDedicatedIpPoolRequest {
    /**
     * <p>The name of the dedicated IP pool to retrieve.</p>
     * @public
     */
    PoolName: string | undefined;
}
/**
 * <p>The following element is returned by the service.</p>
 * @public
 */
export interface GetDedicatedIpPoolResponse {
    /**
     * <p>An object that contains information about a dedicated IP pool.</p>
     * @public
     */
    DedicatedIpPool?: DedicatedIpPool | undefined;
}
/**
 * <p>A request to obtain more information about dedicated IP pools.</p>
 * @public
 */
export interface GetDedicatedIpsRequest {
    /**
     * <p>The name of the IP pool that the dedicated IP address is associated with.</p>
     * @public
     */
    PoolName?: string | undefined;
    /**
     * <p>A token returned from a previous call to <code>GetDedicatedIps</code> to indicate the
     *             position of the dedicated IP pool in the list of IP pools.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>GetDedicatedIpsRequest</code>.
     *             If the number of results is larger than the number you specified in this parameter, then
     *             the response includes a <code>NextToken</code> element, which you can use to obtain
     *             additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>Information about the dedicated IP addresses that are associated with your Amazon Web Services
 *             account.</p>
 * @public
 */
export interface GetDedicatedIpsResponse {
    /**
     * <p>A list of dedicated IP addresses that are associated with your Amazon Web Services account.</p>
     * @public
     */
    DedicatedIps?: DedicatedIp[] | undefined;
    /**
     * <p>A token that indicates that there are additional dedicated IP addresses to list. To
     *             view additional addresses, issue another request to <code>GetDedicatedIps</code>,
     *             passing this token in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Retrieve information about the status of the Deliverability dashboard for your Amazon Web Services account.
 *             When the Deliverability dashboard is enabled, you gain access to reputation, deliverability, and
 *             other metrics for your domains. You also gain the ability to perform predictive inbox placement tests.</p>
 *          <p>When you use the Deliverability dashboard, you pay a monthly subscription charge, in addition
 *             to any other fees that you accrue by using Amazon SES and other Amazon Web Services services. For more
 *             information about the features and cost of a Deliverability dashboard subscription, see <a href="http://aws.amazon.com/pinpoint/pricing/">Amazon Pinpoint Pricing</a>.</p>
 * @public
 */
export interface GetDeliverabilityDashboardOptionsRequest {
}
/**
 * <p>An object that shows the status of the Deliverability dashboard.</p>
 * @public
 */
export interface GetDeliverabilityDashboardOptionsResponse {
    /**
     * <p>Specifies whether the Deliverability dashboard is enabled. If this value is <code>true</code>,
     *             the dashboard is enabled.</p>
     * @public
     */
    DashboardEnabled: boolean | undefined;
    /**
     * <p>The date  when your current subscription to the Deliverability dashboard
     *             is scheduled to expire, if your subscription is scheduled to expire at the end of the
     *             current calendar month. This value is null if you have an active subscription that isn’t
     *             due to expire at the end of the month.</p>
     * @public
     */
    SubscriptionExpiryDate?: Date | undefined;
    /**
     * <p>The current status of your Deliverability dashboard subscription. If this value is
     *                 <code>PENDING_EXPIRATION</code>, your subscription is scheduled to expire at the end
     *             of the current calendar month.</p>
     * @public
     */
    AccountStatus?: DeliverabilityDashboardAccountStatus | undefined;
    /**
     * <p>An array of objects, one for each verified domain that you use to send email and
     *             currently has an active Deliverability dashboard subscription that isn’t scheduled to expire at
     *             the end of the current calendar month.</p>
     * @public
     */
    ActiveSubscribedDomains?: DomainDeliverabilityTrackingOption[] | undefined;
    /**
     * <p>An array of objects, one for each verified domain that you use to send email and
     *             currently has an active Deliverability dashboard subscription that's scheduled to expire at the
     *             end of the current calendar month.</p>
     * @public
     */
    PendingExpirationSubscribedDomains?: DomainDeliverabilityTrackingOption[] | undefined;
}
/**
 * <p>A request to retrieve the results of a predictive inbox placement test.</p>
 * @public
 */
export interface GetDeliverabilityTestReportRequest {
    /**
     * <p>A unique string that identifies the predictive inbox placement test.</p>
     * @public
     */
    ReportId: string | undefined;
}
/**
 * <p>An object that contains inbox placement data for an email provider.</p>
 * @public
 */
export interface PlacementStatistics {
    /**
     * <p>The percentage of emails that arrived in recipients' inboxes during the predictive inbox placement test.</p>
     * @public
     */
    InboxPercentage?: number | undefined;
    /**
     * <p>The percentage of emails that arrived in recipients' spam or junk mail folders during
     *             the predictive inbox placement test.</p>
     * @public
     */
    SpamPercentage?: number | undefined;
    /**
     * <p>The percentage of emails that didn't arrive in recipients' inboxes at all during the
     *             predictive inbox placement test.</p>
     * @public
     */
    MissingPercentage?: number | undefined;
    /**
     * <p>The percentage of emails that were authenticated by using Sender Policy Framework
     *             (SPF) during the predictive inbox placement test.</p>
     * @public
     */
    SpfPercentage?: number | undefined;
    /**
     * <p>The percentage of emails that were authenticated by using DomainKeys Identified Mail
     *             (DKIM) during the predictive inbox placement test.</p>
     * @public
     */
    DkimPercentage?: number | undefined;
}
/**
 * <p>An object that describes how email sent during the predictive inbox placement test was handled by a certain
 *             email provider.</p>
 * @public
 */
export interface IspPlacement {
    /**
     * <p>The name of the email provider that the inbox placement data applies to.</p>
     * @public
     */
    IspName?: string | undefined;
    /**
     * <p>An object that contains inbox placement metrics for a specific email provider.</p>
     * @public
     */
    PlacementStatistics?: PlacementStatistics | undefined;
}
/**
 * <p>The results of the predictive inbox placement test.</p>
 * @public
 */
export interface GetDeliverabilityTestReportResponse {
    /**
     * <p>An object that contains the results of the predictive inbox placement test.</p>
     * @public
     */
    DeliverabilityTestReport: DeliverabilityTestReport | undefined;
    /**
     * <p>An object that specifies how many test messages that were sent during the predictive inbox placement test were
     *             delivered to recipients' inboxes, how many were sent to recipients' spam folders, and
     *             how many weren't delivered.</p>
     * @public
     */
    OverallPlacement: PlacementStatistics | undefined;
    /**
     * <p>An object that describes how the test email was handled by several email providers,
     *             including Gmail, Hotmail, Yahoo, AOL, and others.</p>
     * @public
     */
    IspPlacements: IspPlacement[] | undefined;
    /**
     * <p>An object that contains the message that you sent when you performed this
     *             predictive inbox placement test.</p>
     * @public
     */
    Message?: string | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) that are associated with
     *             the predictive inbox placement test.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>Retrieve all the deliverability data for a specific campaign. This data is available
 *             for a campaign only if the campaign sent email by using a domain that the
 *             Deliverability dashboard is enabled for (<code>PutDeliverabilityDashboardOption</code>
 *             operation).</p>
 * @public
 */
export interface GetDomainDeliverabilityCampaignRequest {
    /**
     * <p>The unique identifier for the campaign. The Deliverability dashboard automatically generates
     *             and assigns this identifier to a campaign.</p>
     * @public
     */
    CampaignId: string | undefined;
}
/**
 * <p>An object that contains all the deliverability data for a specific campaign. This data
 *             is available for a campaign only if the campaign sent email by using a domain that the
 *             Deliverability dashboard is enabled for.</p>
 * @public
 */
export interface GetDomainDeliverabilityCampaignResponse {
    /**
     * <p>An object that contains the deliverability data for the campaign.</p>
     * @public
     */
    DomainDeliverabilityCampaign: DomainDeliverabilityCampaign | undefined;
}
/**
 * <p>A request to obtain deliverability metrics for a domain.</p>
 * @public
 */
export interface GetDomainStatisticsReportRequest {
    /**
     * <p>The domain that you want to obtain deliverability metrics for.</p>
     * @public
     */
    Domain: string | undefined;
    /**
     * <p>The first day (in Unix time) that you want to obtain domain deliverability metrics
     *             for.</p>
     * @public
     */
    StartDate: Date | undefined;
    /**
     * <p>The last day (in Unix time) that you want to obtain domain deliverability metrics for.
     *             The <code>EndDate</code> that you specify has to be less than or equal to 30 days after
     *             the <code>StartDate</code>.</p>
     * @public
     */
    EndDate: Date | undefined;
}
/**
 * <p>An object that contains information about email that was sent from the selected
 *             domain.</p>
 * @public
 */
export interface OverallVolume {
    /**
     * <p>An object that contains information about the numbers of messages that arrived in
     *             recipients' inboxes and junk mail folders.</p>
     * @public
     */
    VolumeStatistics?: VolumeStatistics | undefined;
    /**
     * <p>The percentage of emails that were sent from the domain that were read by their
     *             recipients.</p>
     * @public
     */
    ReadRatePercent?: number | undefined;
    /**
     * <p>An object that contains inbox and junk mail placement metrics for individual email
     *             providers.</p>
     * @public
     */
    DomainIspPlacements?: DomainIspPlacement[] | undefined;
}
/**
 * <p>An object that includes statistics that are related to the domain that you
 *             specified.</p>
 * @public
 */
export interface GetDomainStatisticsReportResponse {
    /**
     * <p>An object that contains deliverability metrics for the domain that you specified. The
     *             data in this object is a summary of all of the data that was collected from the
     *                 <code>StartDate</code> to the <code>EndDate</code>.</p>
     * @public
     */
    OverallVolume: OverallVolume | undefined;
    /**
     * <p>An object that contains deliverability metrics for the domain that you specified. This
     *             object contains data for each day, starting on the <code>StartDate</code> and ending on
     *             the <code>EndDate</code>.</p>
     * @public
     */
    DailyVolumes: DailyVolume[] | undefined;
}
/**
 * <p>A request to return details about an email identity.</p>
 * @public
 */
export interface GetEmailIdentityRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MailFromDomainStatus: {
    readonly FAILED: "FAILED";
    readonly PENDING: "PENDING";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
/**
 * @public
 */
export type MailFromDomainStatus = (typeof MailFromDomainStatus)[keyof typeof MailFromDomainStatus];
/**
 * <p>A list of attributes that are associated with a MAIL FROM domain.</p>
 * @public
 */
export interface MailFromAttributes {
    /**
     * <p>The name of a domain that an email identity uses as a custom MAIL FROM domain.</p>
     * @public
     */
    MailFromDomain: string | undefined;
    /**
     * <p>The status of the MAIL FROM domain. This status can have the following values:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>PENDING</code> – Amazon SES hasn't started searching for the MX record
     *                     yet.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUCCESS</code> – Amazon SES detected the required MX record for the
     *                     MAIL FROM domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – Amazon SES can't find the required MX record, or the
     *                     record no longer exists.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TEMPORARY_FAILURE</code> – A temporary issue occurred, which
     *                     prevented Amazon SES from determining the status of the MAIL FROM domain.</p>
     *             </li>
     *          </ul>
     * @public
     */
    MailFromDomainStatus: MailFromDomainStatus | undefined;
    /**
     * <p>The action to take if the required MX record can't be found when you send an email.
     *             When you set this value to <code>USE_DEFAULT_VALUE</code>, the mail is sent using
     *                 <i>amazonses.com</i> as the MAIL FROM domain. When you set this value
     *             to <code>REJECT_MESSAGE</code>, the Amazon SES API v2 returns a
     *                 <code>MailFromDomainNotVerified</code> error, and doesn't attempt to deliver the
     *             email.</p>
     *          <p>These behaviors are taken when the custom MAIL FROM domain configuration is in the
     *                 <code>Pending</code>, <code>Failed</code>, and <code>TemporaryFailure</code>
     *             states.</p>
     * @public
     */
    BehaviorOnMxFailure: BehaviorOnMxFailure | undefined;
}
/**
 * @public
 * @enum
 */
export declare const VerificationError: {
    readonly DNS_SERVER_ERROR: "DNS_SERVER_ERROR";
    readonly HOST_NOT_FOUND: "HOST_NOT_FOUND";
    readonly INVALID_VALUE: "INVALID_VALUE";
    readonly REPLICATION_ACCESS_DENIED: "REPLICATION_ACCESS_DENIED";
    readonly REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED: "REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED";
    readonly REPLICATION_PRIMARY_INVALID_REGION: "REPLICATION_PRIMARY_INVALID_REGION";
    readonly REPLICATION_PRIMARY_NOT_FOUND: "REPLICATION_PRIMARY_NOT_FOUND";
    readonly REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED: "REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED";
    readonly SERVICE_ERROR: "SERVICE_ERROR";
    readonly TYPE_NOT_FOUND: "TYPE_NOT_FOUND";
};
/**
 * @public
 */
export type VerificationError = (typeof VerificationError)[keyof typeof VerificationError];
/**
 * <p>An object that contains information about the start of authority (SOA) record
 *             associated with the identity.</p>
 * @public
 */
export interface SOARecord {
    /**
     * <p>Primary name server specified in the SOA record.</p>
     * @public
     */
    PrimaryNameServer?: string | undefined;
    /**
     * <p>Administrative contact email from the SOA record.</p>
     * @public
     */
    AdminEmail?: string | undefined;
    /**
     * <p>Serial number from the SOA record.</p>
     * @public
     */
    SerialNumber?: number | undefined;
}
/**
 * <p>An object that contains additional information about the verification status for the
 *             identity.</p>
 * @public
 */
export interface VerificationInfo {
    /**
     * <p>The last time a verification attempt was made for this identity.</p>
     * @public
     */
    LastCheckedTimestamp?: Date | undefined;
    /**
     * <p>The last time a successful verification was made for this identity.</p>
     * @public
     */
    LastSuccessTimestamp?: Date | undefined;
    /**
     * <p>Provides the reason for the failure describing why Amazon SES was not able to successfully
     *             verify the identity. Below are the possible values: </p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>INVALID_VALUE</code> – Amazon SES was able to find the record, but the
     *                     value contained within the record was invalid. Ensure you have published the
     *                     correct values for the record.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TYPE_NOT_FOUND</code> – The queried hostname exists but does not
     *                     have the requested type of DNS record. Ensure that you have published the
     *                     correct type of DNS record.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>HOST_NOT_FOUND</code> – The queried hostname does not exist or was
     *                     not reachable at the time of the request. Ensure that you have published the
     *                     required DNS record(s). </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SERVICE_ERROR</code> – A temporary issue is preventing Amazon SES from
     *                     determining the verification status of the domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DNS_SERVER_ERROR</code> – The DNS server encountered an issue and
     *                     was unable to complete the request.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REPLICATION_ACCESS_DENIED</code> – The verification failed because the user does not
     *                     have the required permissions to replicate the DKIM key from the primary region. Ensure you have the
     *                     necessary permissions in both primary and replica regions.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REPLICATION_PRIMARY_NOT_FOUND</code> – The verification failed because no corresponding
     *                     identity was found in the specified primary region. Ensure the identity exists in the primary region
     *                     before attempting replication.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED</code> – The verification failed because the
     *                     identity in the primary region is configured with Bring Your Own DKIM (BYODKIM). DKIM key
     *                     replication is only supported for identities using Easy DKIM.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED</code> – The verification failed because
     *                     the specified primary identity is a replica of another identity, and multi-level replication is not
     *                     supported; the primary identity must be a non-replica identity.
     *                 </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REPLICATION_PRIMARY_INVALID_REGION</code> – The verification failed due to an invalid
     *                     primary region specified. Ensure you provide a valid Amazon Web Services region where Amazon SES is available and different
     *                     from the replica region.
     *                 </p>
     *             </li>
     *          </ul>
     * @public
     */
    ErrorType?: VerificationError | undefined;
    /**
     * <p>An object that contains information about the start of authority (SOA) record
     *             associated with the identity.</p>
     * @public
     */
    SOARecord?: SOARecord | undefined;
}
/**
 * @public
 * @enum
 */
export declare const VerificationStatus: {
    readonly FAILED: "FAILED";
    readonly NOT_STARTED: "NOT_STARTED";
    readonly PENDING: "PENDING";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
/**
 * @public
 */
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
/**
 * <p>Details about an email identity.</p>
 * @public
 */
export interface GetEmailIdentityResponse {
    /**
     * <p>The email identity type. Note: the <code>MANAGED_DOMAIN</code> identity type is not
     *             supported.</p>
     * @public
     */
    IdentityType?: IdentityType | undefined;
    /**
     * <p>The feedback forwarding configuration for the identity.</p>
     *          <p>If the value is <code>true</code>, you receive email notifications when bounce or
     *             complaint events occur. These notifications are sent to the address that you specified
     *             in the <code>Return-Path</code> header of the original email.</p>
     *          <p>You're required to have a method of tracking bounces and complaints. If you haven't
     *             set up another mechanism for receiving bounce or complaint notifications (for example,
     *             by setting up an event destination), you receive an email notification when these events
     *             occur (even if this setting is disabled).</p>
     * @public
     */
    FeedbackForwardingStatus?: boolean | undefined;
    /**
     * <p>Specifies whether or not the identity is verified. You can only send email from
     *             verified email addresses or domains. For more information about verifying identities,
     *             see the <a href="https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-email-manage-verify.html">Amazon Pinpoint User Guide</a>.</p>
     * @public
     */
    VerifiedForSendingStatus?: boolean | undefined;
    /**
     * <p>An object that contains information about the DKIM attributes for the identity.</p>
     * @public
     */
    DkimAttributes?: DkimAttributes | undefined;
    /**
     * <p>An object that contains information about the Mail-From attributes for the email
     *             identity.</p>
     * @public
     */
    MailFromAttributes?: MailFromAttributes | undefined;
    /**
     * <p>A map of policy names to policies.</p>
     * @public
     */
    Policies?: Record<string, string> | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) that are associated with
     *             the email identity.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The configuration set used by default when sending from this identity.</p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
    /**
     * <p>The verification status of the identity. The status can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>PENDING</code> – The verification process was initiated, but Amazon SES
     *                     hasn't yet been able to verify the identity.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUCCESS</code> – The verification process completed
     *                     successfully.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The verification process failed.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TEMPORARY_FAILURE</code> – A temporary issue is preventing Amazon SES
     *                     from determining the verification status of the identity.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>NOT_STARTED</code> – The verification process hasn't been
     *                     initiated for the identity.</p>
     *             </li>
     *          </ul>
     * @public
     */
    VerificationStatus?: VerificationStatus | undefined;
    /**
     * <p>An object that contains additional information about the verification status for the
     *             identity.</p>
     * @public
     */
    VerificationInfo?: VerificationInfo | undefined;
}
/**
 * <p>A request to return the policies of an email identity.</p>
 * @public
 */
export interface GetEmailIdentityPoliciesRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
}
/**
 * <p>Identity policies associated with email identity.</p>
 * @public
 */
export interface GetEmailIdentityPoliciesResponse {
    /**
     * <p>A map of policy names to policies.</p>
     * @public
     */
    Policies?: Record<string, string> | undefined;
}
/**
 * <p>Represents a request to display the template object (which includes the subject line,
 *             HTML part and text part) for the template you specify.</p>
 * @public
 */
export interface GetEmailTemplateRequest {
    /**
     * <p>The name of the template.</p>
     * @public
     */
    TemplateName: string | undefined;
}
/**
 * <p>The following element is returned by the service.</p>
 * @public
 */
export interface GetEmailTemplateResponse {
    /**
     * <p>The name of the template.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>The content of the email template, composed of a subject line, an HTML part, and a
     *             text-only part.</p>
     * @public
     */
    TemplateContent: EmailTemplateContent | undefined;
}
/**
 * <p>Represents a request to retrieve information about an export job using the export job
 *             ID.</p>
 * @public
 */
export interface GetExportJobRequest {
    /**
     * <p>The export job ID.</p>
     * @public
     */
    JobId: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface GetExportJobResponse {
    /**
     * <p>The export job ID.</p>
     * @public
     */
    JobId?: string | undefined;
    /**
     * <p>The type of source of the export job.</p>
     * @public
     */
    ExportSourceType?: ExportSourceType | undefined;
    /**
     * <p>The status of the export job.</p>
     * @public
     */
    JobStatus?: JobStatus | undefined;
    /**
     * <p>The destination of the export job.</p>
     * @public
     */
    ExportDestination?: ExportDestination | undefined;
    /**
     * <p>The data source of the export job.</p>
     * @public
     */
    ExportDataSource?: ExportDataSource | undefined;
    /**
     * <p>The timestamp of when the export job was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The timestamp of when the export job was completed.</p>
     * @public
     */
    CompletedTimestamp?: Date | undefined;
    /**
     * <p>The failure details about an export job.</p>
     * @public
     */
    FailureInfo?: FailureInfo | undefined;
    /**
     * <p>The statistics about the export job.</p>
     * @public
     */
    Statistics?: ExportStatistics | undefined;
}
/**
 * <p>Represents a request for information about an import job using the import job
 *             ID.</p>
 * @public
 */
export interface GetImportJobRequest {
    /**
     * <p>The ID of the import job.</p>
     * @public
     */
    JobId: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface GetImportJobResponse {
    /**
     * <p>A string that represents the import job ID.</p>
     * @public
     */
    JobId?: string | undefined;
    /**
     * <p>The destination of the import job.</p>
     * @public
     */
    ImportDestination?: ImportDestination | undefined;
    /**
     * <p>The data source of the import job.</p>
     * @public
     */
    ImportDataSource?: ImportDataSource | undefined;
    /**
     * <p>The failure details about an import job.</p>
     * @public
     */
    FailureInfo?: FailureInfo | undefined;
    /**
     * <p>The status of the import job.</p>
     * @public
     */
    JobStatus?: JobStatus | undefined;
    /**
     * <p>The time stamp of when the import job was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The time stamp of when the import job was completed.</p>
     * @public
     */
    CompletedTimestamp?: Date | undefined;
    /**
     * <p>The current number of records processed.</p>
     * @public
     */
    ProcessedRecordsCount?: number | undefined;
    /**
     * <p>The number of records that failed processing because of invalid input or other
     *             reasons.</p>
     * @public
     */
    FailedRecordsCount?: number | undefined;
}
/**
 * <p>A request to return information about a message.</p>
 * @public
 */
export interface GetMessageInsightsRequest {
    /**
     * <p>
     *             A <code>MessageId</code> is a unique identifier for a message, and is
     *             returned when sending emails through Amazon SES.
     *         </p>
     * @public
     */
    MessageId: string | undefined;
}
/**
 * <p>Information about a message.</p>
 * @public
 */
export interface GetMessageInsightsResponse {
    /**
     * <p>A unique identifier for the message.</p>
     * @public
     */
    MessageId?: string | undefined;
    /**
     * <p>The from address used to send the message.</p>
     * @public
     */
    FromEmailAddress?: string | undefined;
    /**
     * <p>The subject line of the message.</p>
     * @public
     */
    Subject?: string | undefined;
    /**
     * <p>
     *             A list of tags, in the form of name/value pairs, that were applied to the email you sent, along with Amazon SES
     *             <a href="https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html">Auto-Tags</a>.
     *         </p>
     * @public
     */
    EmailTags?: MessageTag[] | undefined;
    /**
     * <p>A set of insights associated with the message.</p>
     * @public
     */
    Insights?: EmailInsights[] | undefined;
}
/**
 * <p>Represents a request to display the multi-region endpoint (global-endpoint).</p>
 * @public
 */
export interface GetMultiRegionEndpointRequest {
    /**
     * <p>The name of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointName: string | undefined;
}
/**
 * <p>An object which contains an AWS-Region and routing status.</p>
 * @public
 */
export interface Route {
    /**
     * <p>The name of an AWS-Region.</p>
     * @public
     */
    Region: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface GetMultiRegionEndpointResponse {
    /**
     * <p>The name of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The ID of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointId?: string | undefined;
    /**
     * <p>Contains routes information for the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    Routes?: Route[] | undefined;
    /**
     * <p>The status of the multi-region endpoint (global-endpoint).</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CREATING</code> – The resource is being provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>READY</code> – The resource is ready to use.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The resource failed to be provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELETING</code> – The resource is being deleted as requested.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: Status | undefined;
    /**
     * <p>The time stamp of when the multi-region endpoint (global-endpoint) was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The time stamp of when the multi-region endpoint (global-endpoint) was last updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReputationEntityType: {
    readonly RESOURCE: "RESOURCE";
};
/**
 * @public
 */
export type ReputationEntityType = (typeof ReputationEntityType)[keyof typeof ReputationEntityType];
/**
 * <p>Represents a request to retrieve information about a specific reputation entity.</p>
 * @public
 */
export interface GetReputationEntityRequest {
    /**
     * <p>The unique identifier for the reputation entity. For resource-type entities,
     *             this is the Amazon Resource Name (ARN) of the resource.</p>
     * @public
     */
    ReputationEntityReference: string | undefined;
    /**
     * <p>The type of reputation entity. Currently, only <code>RESOURCE</code> type entities are supported.</p>
     * @public
     */
    ReputationEntityType: ReputationEntityType | undefined;
}
/**
 * <p>An object that contains status information for a reputation entity, including
 *             the current status, cause description, and timestamp.</p>
 * @public
 */
export interface StatusRecord {
    /**
     * <p>The current sending status. This can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Sending is allowed.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Sending is prevented.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REINSTATED</code> – Sending is allowed even with active reputation findings.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: SendingStatus | undefined;
    /**
     * <p>A description of the reason for the current status, or null if no specific
     *             cause is available.</p>
     * @public
     */
    Cause?: string | undefined;
    /**
     * <p>The timestamp when this status was last updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RecommendationImpact: {
    readonly HIGH: "HIGH";
    readonly LOW: "LOW";
};
/**
 * @public
 */
export type RecommendationImpact = (typeof RecommendationImpact)[keyof typeof RecommendationImpact];
/**
 * <p>An object that contains information about a reputation entity, including its
 *             reference, type, policy, status records, and reputation impact.</p>
 * @public
 */
export interface ReputationEntity {
    /**
     * <p>The unique identifier for the reputation entity. For resource-type entities,
     *             this is the Amazon Resource Name (ARN) of the resource.</p>
     * @public
     */
    ReputationEntityReference?: string | undefined;
    /**
     * <p>The type of reputation entity. Currently, only <code>RESOURCE</code> type entities are supported.</p>
     * @public
     */
    ReputationEntityType?: ReputationEntityType | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the reputation management policy applied to
     *             this entity. This is an Amazon Web Services Amazon SES-managed policy.</p>
     * @public
     */
    ReputationManagementPolicy?: string | undefined;
    /**
     * <p>The customer-managed status record for this reputation entity, including the
     *             current status, cause description, and last updated timestamp.</p>
     * @public
     */
    CustomerManagedStatus?: StatusRecord | undefined;
    /**
     * <p>The Amazon Web Services Amazon SES-managed status record for this reputation entity, including the
     *             current status, cause description, and last updated timestamp.</p>
     * @public
     */
    AwsSesManagedStatus?: StatusRecord | undefined;
    /**
     * <p>The aggregate sending status that determines whether the entity is allowed to
     *             send emails. This status is derived from both the customer-managed and Amazon Web Services Amazon SES-managed
     *             statuses. If either the customer-managed status or the Amazon Web Services Amazon SES-managed status is
     *             <code>DISABLED</code>, the aggregate status will be <code>DISABLED</code> and the entity
     *             will not be allowed to send emails. When the customer-managed status is set to
     *             <code>REINSTATED</code>, the entity can continue sending even if there are active
     *             reputation findings, provided the Amazon Web Services Amazon SES-managed status also permits sending.
     *             The entity can only send emails when both statuses permit sending.</p>
     * @public
     */
    SendingStatusAggregate?: SendingStatus | undefined;
    /**
     * <p>The reputation impact level for this entity, representing the highest impact
     *             reputation finding currently active. Reputation findings can be retrieved using
     *             the <code>ListRecommendations</code> operation.</p>
     * @public
     */
    ReputationImpact?: RecommendationImpact | undefined;
}
/**
 * <p>Information about the requested reputation entity.</p>
 * @public
 */
export interface GetReputationEntityResponse {
    /**
     * <p>The reputation entity information, including status records, policy configuration,
     *             and reputation impact.</p>
     * @public
     */
    ReputationEntity?: ReputationEntity | undefined;
}
/**
 * <p>A request to retrieve information about an email address that's on the suppression
 *             list for your account.</p>
 * @public
 */
export interface GetSuppressedDestinationRequest {
    /**
     * <p>The email address that's on the account suppression list.</p>
     * @public
     */
    EmailAddress: string | undefined;
}
/**
 * <p>An object that contains additional attributes that are related an email address that
 *             is on the suppression list for your account.</p>
 * @public
 */
export interface SuppressedDestinationAttributes {
    /**
     * <p>The unique identifier of the email message that caused the email address to be added
     *             to the suppression list for your account.</p>
     * @public
     */
    MessageId?: string | undefined;
    /**
     * <p>A unique identifier that's generated when an email address is added to the suppression
     *             list for your account.</p>
     * @public
     */
    FeedbackId?: string | undefined;
}
/**
 * <p>An object that contains information about an email address that is on the suppression
 *             list for your account.</p>
 * @public
 */
export interface SuppressedDestination {
    /**
     * <p>The email address that is on the suppression list for your account.</p>
     * @public
     */
    EmailAddress: string | undefined;
    /**
     * <p>The reason that the address was added to the suppression list for your account.</p>
     * @public
     */
    Reason: SuppressionListReason | undefined;
    /**
     * <p>The date and time when the suppressed destination was last updated, shown in Unix time
     *             format.</p>
     * @public
     */
    LastUpdateTime: Date | undefined;
    /**
     * <p>An optional value that can contain additional information about the reasons that the
     *             address was added to the suppression list for your account.</p>
     * @public
     */
    Attributes?: SuppressedDestinationAttributes | undefined;
}
/**
 * <p>Information about the suppressed email address.</p>
 * @public
 */
export interface GetSuppressedDestinationResponse {
    /**
     * <p>An object containing information about the suppressed email address.</p>
     * @public
     */
    SuppressedDestination: SuppressedDestination | undefined;
}
/**
 * <p>Represents a request to get information about a specific tenant.</p>
 * @public
 */
export interface GetTenantRequest {
    /**
     * <p>The name of the tenant to retrieve information about.</p>
     * @public
     */
    TenantName: string | undefined;
}
/**
 * <p>A structure that contains details about a tenant.</p>
 * @public
 */
export interface Tenant {
    /**
     * <p>The name of the tenant.</p>
     * @public
     */
    TenantName?: string | undefined;
    /**
     * <p>A unique identifier for the tenant.</p>
     * @public
     */
    TenantId?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the tenant.</p>
     * @public
     */
    TenantArn?: string | undefined;
    /**
     * <p>The date and time when the tenant was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>An array of objects that define the tags (keys and values) associated with the tenant.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The status of sending capability for the tenant.</p>
     * @public
     */
    SendingStatus?: SendingStatus | undefined;
}
/**
 * <p>Information about a specific tenant.</p>
 * @public
 */
export interface GetTenantResponse {
    /**
     * <p>A structure that contains details about the tenant.</p>
     * @public
     */
    Tenant?: Tenant | undefined;
}
/**
 * <p>Information about an email identity.</p>
 * @public
 */
export interface IdentityInfo {
    /**
     * <p>The email identity type. Note: the <code>MANAGED_DOMAIN</code> type is not supported
     *             for email identity types.</p>
     * @public
     */
    IdentityType?: IdentityType | undefined;
    /**
     * <p>The address or domain of the identity.</p>
     * @public
     */
    IdentityName?: string | undefined;
    /**
     * <p>Indicates whether or not you can send email from the identity.</p>
     *          <p>An <i>identity</i> is an email address or domain that you send email
     *             from. Before you can send email from an identity, you have to demostrate that you own
     *             the identity, and that you authorize Amazon SES to send email from that identity.</p>
     * @public
     */
    SendingEnabled?: boolean | undefined;
    /**
     * <p>The verification status of the identity. The status can be one of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>PENDING</code> – The verification process was initiated, but Amazon SES
     *                     hasn't yet been able to verify the identity.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUCCESS</code> – The verification process completed
     *                     successfully.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The verification process failed.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TEMPORARY_FAILURE</code> – A temporary issue is preventing Amazon SES
     *                     from determining the verification status of the identity.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>NOT_STARTED</code> – The verification process hasn't been
     *                     initiated for the identity.</p>
     *             </li>
     *          </ul>
     * @public
     */
    VerificationStatus?: VerificationStatus | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ImportDestinationType: {
    readonly CONTACT_LIST: "CONTACT_LIST";
    readonly SUPPRESSION_LIST: "SUPPRESSION_LIST";
};
/**
 * @public
 */
export type ImportDestinationType = (typeof ImportDestinationType)[keyof typeof ImportDestinationType];
/**
 * <p>A summary of the import job.</p>
 * @public
 */
export interface ImportJobSummary {
    /**
     * <p>A string that represents a job ID.</p>
     * @public
     */
    JobId?: string | undefined;
    /**
     * <p>An object that contains details about the resource destination the import job is going
     *             to target.</p>
     * @public
     */
    ImportDestination?: ImportDestination | undefined;
    /**
     * <p>The status of a job.</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CREATED</code> – Job has just been created.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>PROCESSING</code> – Job is processing.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ERROR</code> – An error occurred during processing.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>COMPLETED</code> – Job has completed processing successfully.</p>
     *             </li>
     *          </ul>
     * @public
     */
    JobStatus?: JobStatus | undefined;
    /**
     * <p>The date and time when the import job was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The current number of records processed.</p>
     * @public
     */
    ProcessedRecordsCount?: number | undefined;
    /**
     * <p>The number of records that failed processing because of invalid input or other
     *             reasons.</p>
     * @public
     */
    FailedRecordsCount?: number | undefined;
}
/**
 * <p>The specified request includes an invalid or expired token.</p>
 * @public
 */
export declare class InvalidNextTokenException extends __BaseException {
    readonly name: "InvalidNextTokenException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidNextTokenException, __BaseException>);
}
/**
 * <p>A request to obtain a list of configuration sets for your Amazon SES account in the current
 *             Amazon Web Services Region.</p>
 * @public
 */
export interface ListConfigurationSetsRequest {
    /**
     * <p>A token returned from a previous call to <code>ListConfigurationSets</code> to
     *             indicate the position in the list of configuration sets.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListConfigurationSets</code>.
     *             If the number of results is larger than the number you specified in this parameter, then
     *             the response includes a <code>NextToken</code> element, which you can use to obtain
     *             additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A list of configuration sets in your Amazon SES account in the current Amazon Web Services Region.</p>
 * @public
 */
export interface ListConfigurationSetsResponse {
    /**
     * <p>An array that contains all of the configuration sets in your Amazon SES account in the
     *             current Amazon Web Services Region.</p>
     * @public
     */
    ConfigurationSets?: string[] | undefined;
    /**
     * <p>A token that indicates that there are additional configuration sets to list. To view
     *             additional configuration sets, issue another request to
     *                 <code>ListConfigurationSets</code>, and pass this token in the
     *                 <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListContactListsRequest {
    /**
     * <p>Maximum number of contact lists to return at once. Use this parameter to paginate
     *             results. If additional contact lists exist beyond the specified limit, the
     *                 <code>NextToken</code> element is sent in the response. Use the
     *                 <code>NextToken</code> value in subsequent requests to retrieve additional
     *             lists.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>A string token indicating that there might be additional contact lists available to be
     *             listed. Use the token provided in the Response to use in the subsequent call to
     *             ListContactLists with the same parameters to retrieve the next page of contact
     *             lists.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListContactListsResponse {
    /**
     * <p>The available contact lists.</p>
     * @public
     */
    ContactLists?: ContactList[] | undefined;
    /**
     * <p>A string token indicating that there might be additional contact lists available to be
     *             listed. Copy this token to a subsequent call to <code>ListContactLists</code> with the
     *             same parameters to retrieve the next page of contact lists.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Used for filtering by a specific topic preference.</p>
 * @public
 */
export interface TopicFilter {
    /**
     * <p>The name of a topic on which you wish to apply the filter.</p>
     * @public
     */
    TopicName?: string | undefined;
    /**
     * <p>Notes that the default subscription status should be applied to a contact because the
     *             contact has not noted their preference for subscribing to a topic.</p>
     * @public
     */
    UseDefaultIfPreferenceUnavailable?: boolean | undefined;
}
/**
 * <p>A filter that can be applied to a list of contacts.</p>
 * @public
 */
export interface ListContactsFilter {
    /**
     * <p>The status by which you are filtering: <code>OPT_IN</code> or
     *             <code>OPT_OUT</code>.</p>
     * @public
     */
    FilteredStatus?: SubscriptionStatus | undefined;
    /**
     * <p>Used for filtering by a specific topic preference.</p>
     * @public
     */
    TopicFilter?: TopicFilter | undefined;
}
/**
 * @public
 */
export interface ListContactsRequest {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>A filter that can be applied to a list of contacts.</p>
     * @public
     */
    Filter?: ListContactsFilter | undefined;
    /**
     * <p>The number of contacts that may be returned at once, which is dependent on if there
     *             are more or less contacts than the value of the PageSize. Use this parameter to paginate
     *             results. If additional contacts exist beyond the specified limit, the
     *                 <code>NextToken</code> element is sent in the response. Use the
     *                 <code>NextToken</code> value in subsequent requests to retrieve additional
     *             contacts.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>A string token indicating that there might be additional contacts available to be
     *             listed. Use the token provided in the Response to use in the subsequent call to
     *             ListContacts with the same parameters to retrieve the next page of contacts.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListContactsResponse {
    /**
     * <p>The contacts present in a specific contact list.</p>
     * @public
     */
    Contacts?: Contact[] | undefined;
    /**
     * <p>A string token indicating that there might be additional contacts available to be
     *             listed. Copy this token to a subsequent call to <code>ListContacts</code> with the same
     *             parameters to retrieve the next page of contacts.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a request to list the existing custom verification email templates for your
 *             account.</p>
 * @public
 */
export interface ListCustomVerificationEmailTemplatesRequest {
    /**
     * <p>A token returned from a previous call to
     *                 <code>ListCustomVerificationEmailTemplates</code> to indicate the position in the
     *             list of custom verification email templates.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to
     *                 <code>ListCustomVerificationEmailTemplates</code>. If the number of results is
     *             larger than the number you specified in this parameter, then the response includes a
     *                 <code>NextToken</code> element, which you can use to obtain additional
     *             results.</p>
     *          <p>The value you specify has to be at least 1, and can be no more than 50.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>The following elements are returned by the service.</p>
 * @public
 */
export interface ListCustomVerificationEmailTemplatesResponse {
    /**
     * <p>A list of the custom verification email templates that exist in your account.</p>
     * @public
     */
    CustomVerificationEmailTemplates?: CustomVerificationEmailTemplateMetadata[] | undefined;
    /**
     * <p>A token indicating that there are additional custom verification email templates
     *             available to be listed. Pass this token to a subsequent call to
     *                 <code>ListCustomVerificationEmailTemplates</code> to retrieve the next 50 custom
     *             verification email templates.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A request to obtain a list of dedicated IP pools.</p>
 * @public
 */
export interface ListDedicatedIpPoolsRequest {
    /**
     * <p>A token returned from a previous call to <code>ListDedicatedIpPools</code> to indicate
     *             the position in the list of dedicated IP pools.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListDedicatedIpPools</code>.
     *             If the number of results is larger than the number you specified in this parameter, then
     *             the response includes a <code>NextToken</code> element, which you can use to obtain
     *             additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A list of dedicated IP pools.</p>
 * @public
 */
export interface ListDedicatedIpPoolsResponse {
    /**
     * <p>A list of all of the dedicated IP pools that are associated with your Amazon Web Services account in
     *             the current Region.</p>
     * @public
     */
    DedicatedIpPools?: string[] | undefined;
    /**
     * <p>A token that indicates that there are additional IP pools to list. To view additional
     *             IP pools, issue another request to <code>ListDedicatedIpPools</code>, passing this token
     *             in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A request to list all of the predictive inbox placement tests that you've performed.</p>
 * @public
 */
export interface ListDeliverabilityTestReportsRequest {
    /**
     * <p>A token returned from a previous call to <code>ListDeliverabilityTestReports</code> to
     *             indicate the position in the list of predictive inbox placement tests.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to
     *                 <code>ListDeliverabilityTestReports</code>. If the number of results is larger than
     *             the number you specified in this parameter, then the response includes a
     *                 <code>NextToken</code> element, which you can use to obtain additional
     *             results.</p>
     *          <p>The value you specify has to be at least 0, and can be no more than 1000.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A list of the predictive inbox placement test reports that are available for your account, regardless of
 *             whether or not those tests are complete.</p>
 * @public
 */
export interface ListDeliverabilityTestReportsResponse {
    /**
     * <p>An object that contains a lists of predictive inbox placement tests that you've performed.</p>
     * @public
     */
    DeliverabilityTestReports: DeliverabilityTestReport[] | undefined;
    /**
     * <p>A token that indicates that there are additional predictive inbox placement tests to list. To view additional
     *             predictive inbox placement tests, issue another request to <code>ListDeliverabilityTestReports</code>, and pass
     *             this token in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Retrieve deliverability data for all the campaigns that used a specific domain to send
 *             email during a specified time range. This data is available for a domain only if you
 *             enabled the Deliverability dashboard.</p>
 * @public
 */
export interface ListDomainDeliverabilityCampaignsRequest {
    /**
     * <p>The first day that you want to obtain deliverability data
     *             for.</p>
     * @public
     */
    StartDate: Date | undefined;
    /**
     * <p>The last day that you want to obtain deliverability data for.
     *             This value has to be less than or equal to 30 days after the value of the
     *                 <code>StartDate</code> parameter.</p>
     * @public
     */
    EndDate: Date | undefined;
    /**
     * <p>The domain to obtain deliverability data for.</p>
     * @public
     */
    SubscribedDomain: string | undefined;
    /**
     * <p>A token that’s returned from a previous call to the
     *                 <code>ListDomainDeliverabilityCampaigns</code> operation. This token indicates the
     *             position of a campaign in the list of campaigns.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to include in response to a single call to the
     *                 <code>ListDomainDeliverabilityCampaigns</code> operation. If the number of results
     *             is larger than the number that you specify in this parameter, the response includes a
     *                 <code>NextToken</code> element, which you can use to obtain additional
     *             results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>An array of objects that provide deliverability data for all the campaigns that used a
 *             specific domain to send email during a specified time range. This data is available for
 *             a domain only if you enabled the Deliverability dashboard for the domain.</p>
 * @public
 */
export interface ListDomainDeliverabilityCampaignsResponse {
    /**
     * <p>An array of responses, one for each campaign that used the domain to send email during
     *             the specified time range.</p>
     * @public
     */
    DomainDeliverabilityCampaigns: DomainDeliverabilityCampaign[] | undefined;
    /**
     * <p>A token that’s returned from a previous call to the
     *                 <code>ListDomainDeliverabilityCampaigns</code> operation. This token indicates the
     *             position of the campaign in the list of campaigns.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A request to list all of the email identities associated with your Amazon Web Services account. This
 *             list includes identities that you've already verified, identities that are unverified,
 *             and identities that were verified in the past, but are no longer verified.</p>
 * @public
 */
export interface ListEmailIdentitiesRequest {
    /**
     * <p>A token returned from a previous call to <code>ListEmailIdentities</code> to indicate
     *             the position in the list of identities.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListEmailIdentities</code>. If
     *             the number of results is larger than the number you specified in this parameter, then
     *             the response includes a <code>NextToken</code> element, which you can use to obtain
     *             additional results.</p>
     *          <p>The value you specify has to be at least 0, and can be no more than 1000.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A list of all of the identities that you've attempted to verify, regardless of whether
 *             or not those identities were successfully verified.</p>
 * @public
 */
export interface ListEmailIdentitiesResponse {
    /**
     * <p>An array that includes all of the email identities associated with your Amazon Web Services
     *             account.</p>
     * @public
     */
    EmailIdentities?: IdentityInfo[] | undefined;
    /**
     * <p>A token that indicates that there are additional configuration sets to list. To view
     *             additional configuration sets, issue another request to
     *             <code>ListEmailIdentities</code>, and pass this token in the <code>NextToken</code>
     *             parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a request to list the email templates present in your Amazon SES account in the
 *             current Amazon Web Services Region. For more information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html">Amazon SES Developer
 *                 Guide</a>.</p>
 * @public
 */
export interface ListEmailTemplatesRequest {
    /**
     * <p>A token returned from a previous call to <code>ListEmailTemplates</code> to indicate
     *             the position in the list of email templates.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListEmailTemplates</code>. If the number of
     *             results is larger than the number you specified in this parameter, then the response
     *             includes a <code>NextToken</code> element, which you can use to obtain additional results.</p>
     *          <p>The value you specify has to be at least 1, and can be no more than 100.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>The following elements are returned by the service.</p>
 * @public
 */
export interface ListEmailTemplatesResponse {
    /**
     * <p>An array the contains the name and creation time stamp for each template in your Amazon SES
     *             account.</p>
     * @public
     */
    TemplatesMetadata?: EmailTemplateMetadata[] | undefined;
    /**
     * <p>A token indicating that there are additional email templates available to be listed.
     *             Pass this token to a subsequent <code>ListEmailTemplates</code> call to retrieve the
     *             next 10 email templates.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a request to list all export jobs with filters.</p>
 * @public
 */
export interface ListExportJobsRequest {
    /**
     * <p>The pagination token returned from a previous call to <code>ListExportJobs</code> to
     *             indicate the position in the list of export jobs.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Maximum number of export jobs to return at once. Use this parameter to paginate
     *             results. If additional export jobs exist beyond the specified limit, the
     *             <code>NextToken</code> element is sent in the response. Use the
     *             <code>NextToken</code> value in subsequent calls to <code>ListExportJobs</code> to
     *             retrieve additional export jobs.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>A value used to list export jobs that have a certain
     *             <code>ExportSourceType</code>.</p>
     * @public
     */
    ExportSourceType?: ExportSourceType | undefined;
    /**
     * <p>A value used to list export jobs that have a certain <code>JobStatus</code>.</p>
     * @public
     */
    JobStatus?: JobStatus | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface ListExportJobsResponse {
    /**
     * <p>A list of the export job summaries.</p>
     * @public
     */
    ExportJobs?: ExportJobSummary[] | undefined;
    /**
     * <p>A string token indicating that there might be additional export jobs available to be
     *             listed. Use this token to a subsequent call to <code>ListExportJobs</code> with the same
     *             parameters to retrieve the next page of export jobs.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a request to list all of the import jobs for a data destination within the
 *             specified maximum number of import jobs.</p>
 * @public
 */
export interface ListImportJobsRequest {
    /**
     * <p>The destination of the import job, which can be used to list import jobs that have a
     *             certain <code>ImportDestinationType</code>.</p>
     * @public
     */
    ImportDestinationType?: ImportDestinationType | undefined;
    /**
     * <p>A string token indicating that there might be additional import jobs available to be
     *             listed. Copy this token to a subsequent call to <code>ListImportJobs</code> with the
     *             same parameters to retrieve the next page of import jobs.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Maximum number of import jobs to return at once. Use this parameter to paginate
     *             results. If additional import jobs exist beyond the specified limit, the
     *                 <code>NextToken</code> element is sent in the response. Use the
     *                 <code>NextToken</code> value in subsequent requests to retrieve additional
     *             addresses.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface ListImportJobsResponse {
    /**
     * <p>A list of the import job summaries.</p>
     * @public
     */
    ImportJobs?: ImportJobSummary[] | undefined;
    /**
     * <p>A string token indicating that there might be additional import jobs available to be
     *             listed. Copy this token to a subsequent call to <code>ListImportJobs</code> with the
     *             same parameters to retrieve the next page of import jobs.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>An object used to specify a list or topic to which an email belongs, which will be
 *             used when a contact chooses to unsubscribe.</p>
 * @public
 */
export interface ListManagementOptions {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>The name of the topic.</p>
     * @public
     */
    TopicName?: string | undefined;
}
/**
 * <p>Represents a request to list all the multi-region endpoints (global-endpoints)
 *             whose primary region is the AWS-Region where operation is executed.
 *         </p>
 * @public
 */
export interface ListMultiRegionEndpointsRequest {
    /**
     * <p>A token returned from a previous call to <code>ListMultiRegionEndpoints</code> to indicate
     *             the position in the list of multi-region endpoints (global-endpoints).</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListMultiRegionEndpoints</code>.
     *             If the number of results is larger than the number you specified in this parameter,
     *             the response includes a <code>NextToken</code> element
     *             that you can use to retrieve the next page of results.
     *         </p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>An object that contains multi-region endpoint (global-endpoint) properties.</p>
 * @public
 */
export interface MultiRegionEndpoint {
    /**
     * <p>The name of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The status of the multi-region endpoint (global-endpoint).</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CREATING</code> – The resource is being provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>READY</code> – The resource is ready to use.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The resource failed to be provisioned.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DELETING</code> – The resource is being deleted as requested.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status?: Status | undefined;
    /**
     * <p>The ID of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointId?: string | undefined;
    /**
     * <p>Primary and secondary regions between which multi-region endpoint splits sending traffic.</p>
     * @public
     */
    Regions?: string[] | undefined;
    /**
     * <p>The time stamp of when the multi-region endpoint (global-endpoint) was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The time stamp of when the multi-region endpoint (global-endpoint) was last updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
}
/**
 * <p>The following elements are returned by the service.</p>
 * @public
 */
export interface ListMultiRegionEndpointsResponse {
    /**
     * <p>An array that contains key multi-region endpoint (global-endpoint) properties.</p>
     * @public
     */
    MultiRegionEndpoints?: MultiRegionEndpoint[] | undefined;
    /**
     * <p>A token indicating that there are additional multi-region endpoints (global-endpoints) available to be listed.
     *             Pass this token to a subsequent <code>ListMultiRegionEndpoints</code> call to retrieve the
     *             next page.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListRecommendationsFilterKey: {
    readonly IMPACT: "IMPACT";
    readonly RESOURCE_ARN: "RESOURCE_ARN";
    readonly STATUS: "STATUS";
    readonly TYPE: "TYPE";
};
/**
 * @public
 */
export type ListRecommendationsFilterKey = (typeof ListRecommendationsFilterKey)[keyof typeof ListRecommendationsFilterKey];
/**
 * <p>Represents a request to list the existing recommendations for your account.</p>
 * @public
 */
export interface ListRecommendationsRequest {
    /**
     * <p>Filters applied when retrieving recommendations. Can eiter be an individual filter, or
     *               combinations of <code>STATUS</code> and <code>IMPACT</code> or
     *               <code>STATUS</code> and <code>TYPE</code>
     *          </p>
     * @public
     */
    Filter?: Partial<Record<ListRecommendationsFilterKey, string>> | undefined;
    /**
     * <p>A token returned from a previous call to <code>ListRecommendations</code> to
     *             indicate the position in the list of recommendations.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to
     *             <code>ListRecommendations</code>. If the number of results is larger than
     *             the number you specified in this parameter, then the response includes a
     *             <code>NextToken</code> element, which you can use to obtain additional
     *             results.</p>
     *          <p>The value you specify has to be at least 1, and can be no more than 100.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RecommendationStatus: {
    readonly FIXED: "FIXED";
    readonly OPEN: "OPEN";
};
/**
 * @public
 */
export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
/**
 * @public
 * @enum
 */
export declare const RecommendationType: {
    readonly BIMI: "BIMI";
    readonly BOUNCE: "BOUNCE";
    readonly COMPLAINT: "COMPLAINT";
    readonly DKIM: "DKIM";
    readonly DMARC: "DMARC";
    readonly FEEDBACK_3P: "FEEDBACK_3P";
    readonly IP_LISTING: "IP_LISTING";
    readonly SPF: "SPF";
};
/**
 * @public
 */
export type RecommendationType = (typeof RecommendationType)[keyof typeof RecommendationType];
/**
 * <p>A recommendation generated for your account.</p>
 * @public
 */
export interface Recommendation {
    /**
     * <p>The resource affected by the recommendation,
     *             with values like <code>arn:aws:ses:us-east-1:123456789012:identity/example.com</code>.</p>
     * @public
     */
    ResourceArn?: string | undefined;
    /**
     * <p>The recommendation type, with values like <code>DKIM</code>,
     *             <code>SPF</code>, <code>DMARC</code>, <code>BIMI</code>, or <code>COMPLAINT</code>.</p>
     * @public
     */
    Type?: RecommendationType | undefined;
    /**
     * <p>The recommendation description / disambiguator - e.g. <code>DKIM1</code> and <code>DKIM2</code>
     *               are different recommendations about your DKIM setup.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The recommendation status, with values like
     *             <code>OPEN</code> or <code>FIXED</code>.</p>
     * @public
     */
    Status?: RecommendationStatus | undefined;
    /**
     * <p>The first time this issue was encountered and the recommendation was generated.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
    /**
     * <p>The last time the recommendation was updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: Date | undefined;
    /**
     * <p>The recommendation impact, with values like
     *             <code>HIGH</code> or <code>LOW</code>.</p>
     * @public
     */
    Impact?: RecommendationImpact | undefined;
}
/**
 * <p>Contains the response to your request to retrieve the list of recommendations for your account.</p>
 * @public
 */
export interface ListRecommendationsResponse {
    /**
     * <p>The recommendations applicable to your account.</p>
     * @public
     */
    Recommendations?: Recommendation[] | undefined;
    /**
     * <p>A string token indicating that there might be additional recommendations available to be
     *             listed. Use the token provided in the <code>ListRecommendationsResponse</code> to use in the
     *             subsequent call to <code>ListRecommendations</code> with the same parameters to retrieve the
     *             next page of recommendations.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReputationEntityFilterKey: {
    readonly ENTITY_REFERENCE_PREFIX: "ENTITY_REFERENCE_PREFIX";
    readonly ENTITY_TYPE: "ENTITY_TYPE";
    readonly REPUTATION_IMPACT: "REPUTATION_IMPACT";
    readonly STATUS: "SENDING_STATUS";
};
/**
 * @public
 */
export type ReputationEntityFilterKey = (typeof ReputationEntityFilterKey)[keyof typeof ReputationEntityFilterKey];
/**
 * <p>Represents a request to list reputation entities with optional filtering.</p>
 * @public
 */
export interface ListReputationEntitiesRequest {
    /**
     * <p>An object that contains filters to apply when listing reputation entities.
     *             You can filter by entity type, reputation impact, sending status, or entity
     *             reference prefix.</p>
     * @public
     */
    Filter?: Partial<Record<ReputationEntityFilterKey, string>> | undefined;
    /**
     * <p>A token returned from a previous call to <code>ListReputationEntities</code> to indicate
     *             the position in the list of reputation entities.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListReputationEntities</code>.
     *             If the number of results is larger than the number you specified in this parameter,
     *             then the response includes a <code>NextToken</code> element, which you can use to obtain
     *             additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A list of reputation entities in your account.</p>
 * @public
 */
export interface ListReputationEntitiesResponse {
    /**
     * <p>An array that contains information about the reputation entities in your account.</p>
     * @public
     */
    ReputationEntities?: ReputationEntity[] | undefined;
    /**
     * <p>A token that indicates that there are additional reputation entities to list.
     *             To view additional reputation entities, issue another request to <code>ListReputationEntities</code>,
     *             and pass this token in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a request to list tenants associated with a specific resource.</p>
 * @public
 */
export interface ListResourceTenantsRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource to list associated tenants for.</p>
     * @public
     */
    ResourceArn: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListResourceTenants</code>.
     *             If the number of results is larger than the number you specified in this parameter,
     *             then the response includes a <code>NextToken</code> element, which you can use to obtain additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>A token returned from a previous call to <code>ListResourceTenants</code> to indicate the position in the list of resource tenants.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A structure that contains information about a tenant associated with a resource.</p>
 * @public
 */
export interface ResourceTenantMetadata {
    /**
     * <p>The name of the tenant associated with the resource.</p>
     * @public
     */
    TenantName?: string | undefined;
    /**
     * <p>A unique identifier for the tenant associated with the resource.</p>
     * @public
     */
    TenantId?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the resource.</p>
     * @public
     */
    ResourceArn?: string | undefined;
    /**
     * <p>The date and time when the resource was associated with the tenant.</p>
     * @public
     */
    AssociatedTimestamp?: Date | undefined;
}
/**
 * <p>Information about tenants associated with a specific resource.</p>
 * @public
 */
export interface ListResourceTenantsResponse {
    /**
     * <p>An array that contains information about each tenant associated with the resource.</p>
     * @public
     */
    ResourceTenants?: ResourceTenantMetadata[] | undefined;
    /**
     * <p>A token that indicates that there are additional tenants to list. To view additional tenants,
     *             issue another request to <code>ListResourceTenants</code>, and pass this token in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @internal
 */
export declare const AccountDetailsFilterSensitiveLog: (obj: AccountDetails) => any;
/**
 * @internal
 */
export declare const DkimSigningAttributesFilterSensitiveLog: (obj: DkimSigningAttributes) => any;
/**
 * @internal
 */
export declare const CreateEmailIdentityRequestFilterSensitiveLog: (obj: CreateEmailIdentityRequest) => any;
/**
 * @internal
 */
export declare const MessageInsightsFiltersFilterSensitiveLog: (obj: MessageInsightsFilters) => any;
/**
 * @internal
 */
export declare const MessageInsightsDataSourceFilterSensitiveLog: (obj: MessageInsightsDataSource) => any;
/**
 * @internal
 */
export declare const ExportDataSourceFilterSensitiveLog: (obj: ExportDataSource) => any;
/**
 * @internal
 */
export declare const CreateExportJobRequestFilterSensitiveLog: (obj: CreateExportJobRequest) => any;
/**
 * @internal
 */
export declare const EmailInsightsFilterSensitiveLog: (obj: EmailInsights) => any;
/**
 * @internal
 */
export declare const GetAccountResponseFilterSensitiveLog: (obj: GetAccountResponse) => any;
/**
 * @internal
 */
export declare const GetExportJobResponseFilterSensitiveLog: (obj: GetExportJobResponse) => any;
/**
 * @internal
 */
export declare const GetMessageInsightsResponseFilterSensitiveLog: (obj: GetMessageInsightsResponse) => any;
