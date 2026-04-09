import { DocumentType as __DocumentType } from "@smithy/types";
import { AsyncInvokeStatus, AudioFormat, CachePointType, CacheTTL, ConversationRole, DocumentFormat, GuardrailAction, GuardrailAutomatedReasoningLogicWarningType, GuardrailContentFilterConfidence, GuardrailContentFilterStrength, GuardrailContentFilterType, GuardrailContentPolicyAction, GuardrailContentQualifier, GuardrailContentSource, GuardrailContextualGroundingFilterType, GuardrailContextualGroundingPolicyAction, GuardrailConverseContentQualifier, GuardrailConverseImageFormat, GuardrailImageFormat, GuardrailManagedWordType, GuardrailOrigin, GuardrailOutputScope, GuardrailOwnership, GuardrailPiiEntityType, GuardrailSensitiveInformationPolicyAction, GuardrailStreamProcessingMode, GuardrailTopicPolicyAction, GuardrailTopicType, GuardrailTrace, GuardrailWordPolicyAction, ImageFormat, OutputFormatType, PerformanceConfigLatency, ServiceTierType, SortAsyncInvocationBy, SortOrder, StopReason, ToolResultStatus, ToolUseType, Trace, VideoFormat } from "./enums";
import { InternalServerException, ModelStreamErrorException, ModelTimeoutException, ServiceUnavailableException, ThrottlingException, ValidationException } from "./errors";
/**
 * @public
 */
export interface GetAsyncInvokeRequest {
    /**
     * <p>The invocation's ARN.</p>
     * @public
     */
    invocationArn: string | undefined;
}
/**
 * <p>Asynchronous invocation output data settings.</p>
 * @public
 */
export interface AsyncInvokeS3OutputDataConfig {
    /**
     * <p>An object URI starting with <code>s3://</code>.</p>
     * @public
     */
    s3Uri: string | undefined;
    /**
     * <p>A KMS encryption key ID.</p>
     * @public
     */
    kmsKeyId?: string | undefined;
    /**
     * <p>If the bucket belongs to another AWS account, specify that account's ID.</p>
     * @public
     */
    bucketOwner?: string | undefined;
}
/**
 * <p>Asynchronous invocation output data settings.</p>
 * @public
 */
export type AsyncInvokeOutputDataConfig = AsyncInvokeOutputDataConfig.S3OutputDataConfigMember | AsyncInvokeOutputDataConfig.$UnknownMember;
/**
 * @public
 */
export declare namespace AsyncInvokeOutputDataConfig {
    /**
     * <p>A storage location for the output data in an S3 bucket</p>
     * @public
     */
    interface S3OutputDataConfigMember {
        s3OutputDataConfig: AsyncInvokeS3OutputDataConfig;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        s3OutputDataConfig?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        s3OutputDataConfig: (value: AsyncInvokeS3OutputDataConfig) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface GetAsyncInvokeResponse {
    /**
     * <p>The invocation's ARN.</p>
     * @public
     */
    invocationArn: string | undefined;
    /**
     * <p>The invocation's model ARN.</p>
     * @public
     */
    modelArn: string | undefined;
    /**
     * <p>The invocation's idempotency token.</p>
     * @public
     */
    clientRequestToken?: string | undefined;
    /**
     * <p>The invocation's status.</p>
     * @public
     */
    status: AsyncInvokeStatus | undefined;
    /**
     * <p>An error message.</p>
     * @public
     */
    failureMessage?: string | undefined;
    /**
     * <p>When the invocation request was submitted.</p>
     * @public
     */
    submitTime: Date | undefined;
    /**
     * <p>The invocation's last modified time.</p>
     * @public
     */
    lastModifiedTime?: Date | undefined;
    /**
     * <p>When the invocation ended.</p>
     * @public
     */
    endTime?: Date | undefined;
    /**
     * <p>Output data settings.</p>
     * @public
     */
    outputDataConfig: AsyncInvokeOutputDataConfig | undefined;
}
/**
 * @public
 */
export interface ListAsyncInvokesRequest {
    /**
     * <p>Include invocations submitted after this time.</p>
     * @public
     */
    submitTimeAfter?: Date | undefined;
    /**
     * <p>Include invocations submitted before this time.</p>
     * @public
     */
    submitTimeBefore?: Date | undefined;
    /**
     * <p>Filter invocations by status.</p>
     * @public
     */
    statusEquals?: AsyncInvokeStatus | undefined;
    /**
     * <p>The maximum number of invocations to return in one page of results.</p>
     * @public
     */
    maxResults?: number | undefined;
    /**
     * <p>Specify the pagination token from a previous request to retrieve the next page of results.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>How to sort the response.</p>
     * @public
     */
    sortBy?: SortAsyncInvocationBy | undefined;
    /**
     * <p>The sorting order for the response.</p>
     * @public
     */
    sortOrder?: SortOrder | undefined;
}
/**
 * <p>A summary of an asynchronous invocation.</p>
 * @public
 */
export interface AsyncInvokeSummary {
    /**
     * <p>The invocation's ARN.</p>
     * @public
     */
    invocationArn: string | undefined;
    /**
     * <p>The invoked model's ARN.</p>
     * @public
     */
    modelArn: string | undefined;
    /**
     * <p>The invocation's idempotency token.</p>
     * @public
     */
    clientRequestToken?: string | undefined;
    /**
     * <p>The invocation's status.</p>
     * @public
     */
    status?: AsyncInvokeStatus | undefined;
    /**
     * <p>An error message.</p>
     * @public
     */
    failureMessage?: string | undefined;
    /**
     * <p>When the invocation was submitted.</p>
     * @public
     */
    submitTime: Date | undefined;
    /**
     * <p>When the invocation was last modified.</p>
     * @public
     */
    lastModifiedTime?: Date | undefined;
    /**
     * <p>When the invocation ended.</p>
     * @public
     */
    endTime?: Date | undefined;
    /**
     * <p>The invocation's output data settings.</p>
     * @public
     */
    outputDataConfig: AsyncInvokeOutputDataConfig | undefined;
}
/**
 * @public
 */
export interface ListAsyncInvokesResponse {
    /**
     * <p>Specify the pagination token from a previous request to retrieve the next page of results.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>A list of invocation summaries.</p>
     * @public
     */
    asyncInvokeSummaries?: AsyncInvokeSummary[] | undefined;
}
/**
 * <p>A tag.</p>
 * @public
 */
export interface Tag {
    /**
     * <p>The tag's key.</p>
     * @public
     */
    key: string | undefined;
    /**
     * <p>The tag's value.</p>
     * @public
     */
    value: string | undefined;
}
/**
 * @public
 */
export interface StartAsyncInvokeRequest {
    /**
     * <p>Specify idempotency token to ensure that requests are not duplicated.</p>
     * @public
     */
    clientRequestToken?: string | undefined;
    /**
     * <p>The model to invoke.</p>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>Input to send to the model.</p>
     * @public
     */
    modelInput: __DocumentType | undefined;
    /**
     * <p>Where to store the output.</p>
     * @public
     */
    outputDataConfig: AsyncInvokeOutputDataConfig | undefined;
    /**
     * <p>Tags to apply to the invocation.</p>
     * @public
     */
    tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface StartAsyncInvokeResponse {
    /**
     * <p>The ARN of the invocation.</p>
     * @public
     */
    invocationArn: string | undefined;
}
/**
 * <p>The image source (image bytes) of the guardrail image source. Object used in independent api.</p>
 * @public
 */
export type GuardrailImageSource = GuardrailImageSource.BytesMember | GuardrailImageSource.$UnknownMember;
/**
 * @public
 */
export declare namespace GuardrailImageSource {
    /**
     * <p>The bytes details of the guardrail image source. Object used in independent api.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Contain an image which user wants guarded. This block is accepted by the guardrails independent API.</p>
 * @public
 */
export interface GuardrailImageBlock {
    /**
     * <p>The format details for the file type of the image blocked by the guardrail.</p>
     * @public
     */
    format: GuardrailImageFormat | undefined;
    /**
     * <p>The image source (image bytes) details of the image blocked by the guardrail.</p>
     * @public
     */
    source: GuardrailImageSource | undefined;
}
/**
 * <p>The text block to be evaluated by the guardrail.</p>
 * @public
 */
export interface GuardrailTextBlock {
    /**
     * <p>The input text details to be evaluated by the guardrail.</p>
     * @public
     */
    text: string | undefined;
    /**
     * <p>The qualifiers describing the text block.</p>
     * @public
     */
    qualifiers?: GuardrailContentQualifier[] | undefined;
}
/**
 * <p>The content block to be evaluated by the guardrail.</p>
 * @public
 */
export type GuardrailContentBlock = GuardrailContentBlock.ImageMember | GuardrailContentBlock.TextMember | GuardrailContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace GuardrailContentBlock {
    /**
     * <p>Text within content block to be evaluated by the guardrail.</p>
     * @public
     */
    interface TextMember {
        text: GuardrailTextBlock;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>Image within guardrail content block to be evaluated by the guardrail.</p>
     * @public
     */
    interface ImageMember {
        text?: never;
        image: GuardrailImageBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        image?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: GuardrailTextBlock) => T;
        image: (value: GuardrailImageBlock) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface ApplyGuardrailRequest {
    /**
     * <p>The guardrail identifier used in the request to apply the guardrail.</p>
     * @public
     */
    guardrailIdentifier: string | undefined;
    /**
     * <p>The guardrail version used in the request to apply the guardrail.</p>
     * @public
     */
    guardrailVersion: string | undefined;
    /**
     * <p>The source of data used in the request to apply the guardrail.</p>
     * @public
     */
    source: GuardrailContentSource | undefined;
    /**
     * <p>The content details used in the request to apply the guardrail.</p>
     * @public
     */
    content: GuardrailContentBlock[] | undefined;
    /**
     * <p>Specifies the scope of the output that you get in the response. Set to <code>FULL</code> to return the entire output, including any detected and non-detected entries in the response for enhanced debugging.</p> <p>Note that the full output scope doesn't apply to word filters or regex in sensitive information filters. It does apply to all other filtering policies, including sensitive information with filters that can detect personally identifiable information (PII).</p>
     * @public
     */
    outputScope?: GuardrailOutputScope | undefined;
}
/**
 * <p>Details about the specific guardrail that was applied during this assessment, including its identifier, version, ARN, origin, and ownership information.</p>
 * @public
 */
export interface AppliedGuardrailDetails {
    /**
     * <p>The unique ID of the guardrail that was applied.</p>
     * @public
     */
    guardrailId?: string | undefined;
    /**
     * <p>The version of the guardrail that was applied.</p>
     * @public
     */
    guardrailVersion?: string | undefined;
    /**
     * <p>The ARN of the guardrail that was applied.</p>
     * @public
     */
    guardrailArn?: string | undefined;
    /**
     * <p>The origin of how the guardrail was applied. This can be either requested at the API level or enforced at the account or organization level as a default guardrail.</p>
     * @public
     */
    guardrailOrigin?: GuardrailOrigin[] | undefined;
    /**
     * <p>The ownership type of the guardrail, indicating whether it is owned by the requesting account or is a cross-account guardrail shared from another AWS account.</p>
     * @public
     */
    guardrailOwnership?: GuardrailOwnership | undefined;
}
/**
 * <p>References a specific automated reasoning policy rule that was applied during evaluation.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningRule {
    /**
     * <p>The unique identifier of the automated reasoning rule.</p>
     * @public
     */
    identifier?: string | undefined;
    /**
     * <p>The ARN of the automated reasoning policy version that contains this rule.</p>
     * @public
     */
    policyVersionArn?: string | undefined;
}
/**
 * <p>A logical statement that includes both formal logic representation and natural language explanation.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningStatement {
    /**
     * <p>The formal logical representation of the statement.</p>
     * @public
     */
    logic?: string | undefined;
    /**
     * <p>The natural language explanation of the logical statement.</p>
     * @public
     */
    naturalLanguage?: string | undefined;
}
/**
 * <p>Identifies logical issues in the translated statements that exist independent of any policy rules, such as statements that are always true or always false.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningLogicWarning {
    /**
     * <p>The category of the detected logical issue, such as statements that are always true or always false.</p>
     * @public
     */
    type?: GuardrailAutomatedReasoningLogicWarningType | undefined;
    /**
     * <p>The logical statements that serve as premises under which the claims are validated.</p>
     * @public
     */
    premises?: GuardrailAutomatedReasoningStatement[] | undefined;
    /**
     * <p>The logical statements that are validated while assuming the policy and premises.</p>
     * @public
     */
    claims?: GuardrailAutomatedReasoningStatement[] | undefined;
}
/**
 * <p>References a portion of the original input text that corresponds to logical elements.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningInputTextReference {
    /**
     * <p>The specific text from the original input that this reference points to.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * <p>Contains the logical translation of natural language input into formal logical statements, including premises, claims, and confidence scores.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningTranslation {
    /**
     * <p>The logical statements that serve as the foundation or assumptions for the claims.</p>
     * @public
     */
    premises?: GuardrailAutomatedReasoningStatement[] | undefined;
    /**
     * <p>The logical statements that are being validated against the premises and policy rules.</p>
     * @public
     */
    claims?: GuardrailAutomatedReasoningStatement[] | undefined;
    /**
     * <p>References to portions of the original input text that correspond to the premises but could not be fully translated.</p>
     * @public
     */
    untranslatedPremises?: GuardrailAutomatedReasoningInputTextReference[] | undefined;
    /**
     * <p>References to portions of the original input text that correspond to the claims but could not be fully translated.</p>
     * @public
     */
    untranslatedClaims?: GuardrailAutomatedReasoningInputTextReference[] | undefined;
    /**
     * <p>A confidence score between 0 and 1 indicating how certain the system is about the logical translation.</p>
     * @public
     */
    confidence?: number | undefined;
}
/**
 * <p>Indicates that no valid claims can be made due to logical contradictions in the premises or rules.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningImpossibleFinding {
    /**
     * <p>The logical translation of the input that this finding evaluates.</p>
     * @public
     */
    translation?: GuardrailAutomatedReasoningTranslation | undefined;
    /**
     * <p>The automated reasoning policy rules that contradict the claims and/or premises in the input.</p>
     * @public
     */
    contradictingRules?: GuardrailAutomatedReasoningRule[] | undefined;
    /**
     * <p>Indication of a logic issue with the translation without needing to consider the automated reasoning policy rules.</p>
     * @public
     */
    logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
/**
 * <p>Indicates that the claims are logically false and contradictory to the established rules or premises.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningInvalidFinding {
    /**
     * <p>The logical translation of the input that this finding invalidates.</p>
     * @public
     */
    translation?: GuardrailAutomatedReasoningTranslation | undefined;
    /**
     * <p>The automated reasoning policy rules that contradict the claims in the input.</p>
     * @public
     */
    contradictingRules?: GuardrailAutomatedReasoningRule[] | undefined;
    /**
     * <p>Indication of a logic issue with the translation without needing to consider the automated reasoning policy rules.</p>
     * @public
     */
    logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
/**
 * <p>Indicates that no relevant logical information could be extracted from the input for validation.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningNoTranslationsFinding {
}
/**
 * <p>Represents a logical scenario where claims can be evaluated as true or false, containing specific logical assignments.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningScenario {
    /**
     * <p>List of logical assignments and statements that define this scenario.</p>
     * @public
     */
    statements?: GuardrailAutomatedReasoningStatement[] | undefined;
}
/**
 * <p>Indicates that the claims could be either true or false depending on additional assumptions not provided in the input.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningSatisfiableFinding {
    /**
     * <p>The logical translation of the input that this finding evaluates.</p>
     * @public
     */
    translation?: GuardrailAutomatedReasoningTranslation | undefined;
    /**
     * <p>An example scenario demonstrating how the claims could be logically true.</p>
     * @public
     */
    claimsTrueScenario?: GuardrailAutomatedReasoningScenario | undefined;
    /**
     * <p>An example scenario demonstrating how the claims could be logically false.</p>
     * @public
     */
    claimsFalseScenario?: GuardrailAutomatedReasoningScenario | undefined;
    /**
     * <p>Indication of a logic issue with the translation without needing to consider the automated reasoning policy rules.</p>
     * @public
     */
    logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
/**
 * <p>Indicates that the input exceeds the processing capacity due to the volume or complexity of the logical information.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningTooComplexFinding {
}
/**
 * <p>Represents one possible logical interpretation of ambiguous input content.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningTranslationOption {
    /**
     * <p>Example translations that provide this possible interpretation of the input.</p>
     * @public
     */
    translations?: GuardrailAutomatedReasoningTranslation[] | undefined;
}
/**
 * <p>Indicates that the input has multiple valid logical interpretations, requiring additional context or clarification.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningTranslationAmbiguousFinding {
    /**
     * <p>Different logical interpretations that were detected during translation of the input.</p>
     * @public
     */
    options?: GuardrailAutomatedReasoningTranslationOption[] | undefined;
    /**
     * <p>Scenarios showing how the different translation options differ in meaning.</p>
     * @public
     */
    differenceScenarios?: GuardrailAutomatedReasoningScenario[] | undefined;
}
/**
 * <p>Indicates that the claims are definitively true and logically implied by the premises, with no possible alternative interpretations.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningValidFinding {
    /**
     * <p>The logical translation of the input that this finding validates.</p>
     * @public
     */
    translation?: GuardrailAutomatedReasoningTranslation | undefined;
    /**
     * <p>An example scenario demonstrating how the claims are logically true.</p>
     * @public
     */
    claimsTrueScenario?: GuardrailAutomatedReasoningScenario | undefined;
    /**
     * <p>The automated reasoning policy rules that support why this result is considered valid.</p>
     * @public
     */
    supportingRules?: GuardrailAutomatedReasoningRule[] | undefined;
    /**
     * <p>Indication of a logic issue with the translation without needing to consider the automated reasoning policy rules.</p>
     * @public
     */
    logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
/**
 * <p>Represents a logical validation result from automated reasoning policy evaluation. The finding indicates whether claims in the input are logically valid, invalid, satisfiable, impossible, or have other logical issues.</p>
 * @public
 */
export type GuardrailAutomatedReasoningFinding = GuardrailAutomatedReasoningFinding.ImpossibleMember | GuardrailAutomatedReasoningFinding.InvalidMember | GuardrailAutomatedReasoningFinding.NoTranslationsMember | GuardrailAutomatedReasoningFinding.SatisfiableMember | GuardrailAutomatedReasoningFinding.TooComplexMember | GuardrailAutomatedReasoningFinding.TranslationAmbiguousMember | GuardrailAutomatedReasoningFinding.ValidMember | GuardrailAutomatedReasoningFinding.$UnknownMember;
/**
 * @public
 */
export declare namespace GuardrailAutomatedReasoningFinding {
    /**
     * <p>Contains the result when the automated reasoning evaluation determines that the claims in the input are logically valid and definitively true based on the provided premises and policy rules.</p>
     * @public
     */
    interface ValidMember {
        valid: GuardrailAutomatedReasoningValidFinding;
        invalid?: never;
        satisfiable?: never;
        impossible?: never;
        translationAmbiguous?: never;
        tooComplex?: never;
        noTranslations?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the result when the automated reasoning evaluation determines that the claims in the input are logically invalid and contradict the established premises or policy rules.</p>
     * @public
     */
    interface InvalidMember {
        valid?: never;
        invalid: GuardrailAutomatedReasoningInvalidFinding;
        satisfiable?: never;
        impossible?: never;
        translationAmbiguous?: never;
        tooComplex?: never;
        noTranslations?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the result when the automated reasoning evaluation determines that the claims in the input could be either true or false depending on additional assumptions not provided in the input context.</p>
     * @public
     */
    interface SatisfiableMember {
        valid?: never;
        invalid?: never;
        satisfiable: GuardrailAutomatedReasoningSatisfiableFinding;
        impossible?: never;
        translationAmbiguous?: never;
        tooComplex?: never;
        noTranslations?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the result when the automated reasoning evaluation determines that no valid logical conclusions can be drawn due to contradictions in the premises or policy rules themselves.</p>
     * @public
     */
    interface ImpossibleMember {
        valid?: never;
        invalid?: never;
        satisfiable?: never;
        impossible: GuardrailAutomatedReasoningImpossibleFinding;
        translationAmbiguous?: never;
        tooComplex?: never;
        noTranslations?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the result when the automated reasoning evaluation detects that the input has multiple valid logical interpretations, requiring additional context or clarification to proceed with validation.</p>
     * @public
     */
    interface TranslationAmbiguousMember {
        valid?: never;
        invalid?: never;
        satisfiable?: never;
        impossible?: never;
        translationAmbiguous: GuardrailAutomatedReasoningTranslationAmbiguousFinding;
        tooComplex?: never;
        noTranslations?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the result when the automated reasoning evaluation cannot process the input due to its complexity or volume exceeding the system's processing capacity for logical analysis.</p>
     * @public
     */
    interface TooComplexMember {
        valid?: never;
        invalid?: never;
        satisfiable?: never;
        impossible?: never;
        translationAmbiguous?: never;
        tooComplex: GuardrailAutomatedReasoningTooComplexFinding;
        noTranslations?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the result when the automated reasoning evaluation cannot extract any relevant logical information from the input that can be validated against the policy rules.</p>
     * @public
     */
    interface NoTranslationsMember {
        valid?: never;
        invalid?: never;
        satisfiable?: never;
        impossible?: never;
        translationAmbiguous?: never;
        tooComplex?: never;
        noTranslations: GuardrailAutomatedReasoningNoTranslationsFinding;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        valid?: never;
        invalid?: never;
        satisfiable?: never;
        impossible?: never;
        translationAmbiguous?: never;
        tooComplex?: never;
        noTranslations?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        valid: (value: GuardrailAutomatedReasoningValidFinding) => T;
        invalid: (value: GuardrailAutomatedReasoningInvalidFinding) => T;
        satisfiable: (value: GuardrailAutomatedReasoningSatisfiableFinding) => T;
        impossible: (value: GuardrailAutomatedReasoningImpossibleFinding) => T;
        translationAmbiguous: (value: GuardrailAutomatedReasoningTranslationAmbiguousFinding) => T;
        tooComplex: (value: GuardrailAutomatedReasoningTooComplexFinding) => T;
        noTranslations: (value: GuardrailAutomatedReasoningNoTranslationsFinding) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Contains the results of automated reasoning policy evaluation, including logical findings about the validity of claims made in the input content.</p>
 * @public
 */
export interface GuardrailAutomatedReasoningPolicyAssessment {
    /**
     * <p>List of logical validation results produced by evaluating the input content against automated reasoning policies.</p>
     * @public
     */
    findings?: GuardrailAutomatedReasoningFinding[] | undefined;
}
/**
 * <p>The content filter for a guardrail.</p>
 * @public
 */
export interface GuardrailContentFilter {
    /**
     * <p>The guardrail type.</p>
     * @public
     */
    type: GuardrailContentFilterType | undefined;
    /**
     * <p>The guardrail confidence.</p>
     * @public
     */
    confidence: GuardrailContentFilterConfidence | undefined;
    /**
     * <p>The filter strength setting for the guardrail content filter.</p>
     * @public
     */
    filterStrength?: GuardrailContentFilterStrength | undefined;
    /**
     * <p>The guardrail action.</p>
     * @public
     */
    action: GuardrailContentPolicyAction | undefined;
    /**
     * <p>Indicates whether content that breaches the guardrail configuration is detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>An assessment of a content policy for a guardrail.</p>
 * @public
 */
export interface GuardrailContentPolicyAssessment {
    /**
     * <p>The content policy filters.</p>
     * @public
     */
    filters: GuardrailContentFilter[] | undefined;
}
/**
 * <p>The details for the guardrails contextual grounding filter.</p>
 * @public
 */
export interface GuardrailContextualGroundingFilter {
    /**
     * <p>The contextual grounding filter type.</p>
     * @public
     */
    type: GuardrailContextualGroundingFilterType | undefined;
    /**
     * <p>The threshold used by contextual grounding filter to determine whether the content is grounded or not.</p>
     * @public
     */
    threshold: number | undefined;
    /**
     * <p>The score generated by contextual grounding filter.</p>
     * @public
     */
    score: number | undefined;
    /**
     * <p>The action performed by the guardrails contextual grounding filter.</p>
     * @public
     */
    action: GuardrailContextualGroundingPolicyAction | undefined;
    /**
     * <p>Indicates whether content that fails the contextual grounding evaluation (grounding or relevance score less than the corresponding threshold) was detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>The policy assessment details for the guardrails contextual grounding filter.</p>
 * @public
 */
export interface GuardrailContextualGroundingPolicyAssessment {
    /**
     * <p>The filter details for the guardrails contextual grounding filter.</p>
     * @public
     */
    filters?: GuardrailContextualGroundingFilter[] | undefined;
}
/**
 * <p>The details of the guardrail image coverage.</p>
 * @public
 */
export interface GuardrailImageCoverage {
    /**
     * <p>The count (integer) of images guardrails guarded.</p>
     * @public
     */
    guarded?: number | undefined;
    /**
     * <p>Represents the total number of images (integer) that were in the request (guarded and unguarded).</p>
     * @public
     */
    total?: number | undefined;
}
/**
 * <p>The guardrail coverage for the text characters.</p>
 * @public
 */
export interface GuardrailTextCharactersCoverage {
    /**
     * <p>The text characters that were guarded by the guardrail coverage.</p>
     * @public
     */
    guarded?: number | undefined;
    /**
     * <p>The total text characters by the guardrail coverage.</p>
     * @public
     */
    total?: number | undefined;
}
/**
 * <p>The action of the guardrail coverage details.</p>
 * @public
 */
export interface GuardrailCoverage {
    /**
     * <p>The text characters of the guardrail coverage details.</p>
     * @public
     */
    textCharacters?: GuardrailTextCharactersCoverage | undefined;
    /**
     * <p>The guardrail coverage for images (the number of images that guardrails guarded).</p>
     * @public
     */
    images?: GuardrailImageCoverage | undefined;
}
/**
 * <p>The details on the use of the guardrail.</p>
 * @public
 */
export interface GuardrailUsage {
    /**
     * <p>The topic policy units processed by the guardrail.</p>
     * @public
     */
    topicPolicyUnits: number | undefined;
    /**
     * <p>The content policy units processed by the guardrail.</p>
     * @public
     */
    contentPolicyUnits: number | undefined;
    /**
     * <p>The word policy units processed by the guardrail.</p>
     * @public
     */
    wordPolicyUnits: number | undefined;
    /**
     * <p>The sensitive information policy units processed by the guardrail.</p>
     * @public
     */
    sensitiveInformationPolicyUnits: number | undefined;
    /**
     * <p>The sensitive information policy free units processed by the guardrail.</p>
     * @public
     */
    sensitiveInformationPolicyFreeUnits: number | undefined;
    /**
     * <p>The contextual grounding policy units processed by the guardrail.</p>
     * @public
     */
    contextualGroundingPolicyUnits: number | undefined;
    /**
     * <p>The content policy image units processed by the guardrail.</p>
     * @public
     */
    contentPolicyImageUnits?: number | undefined;
    /**
     * <p>The number of text units processed by the automated reasoning policy.</p>
     * @public
     */
    automatedReasoningPolicyUnits?: number | undefined;
    /**
     * <p>The number of automated reasoning policies that were processed during the guardrail evaluation.</p>
     * @public
     */
    automatedReasoningPolicies?: number | undefined;
}
/**
 * <p>The invocation metrics for the guardrail.</p>
 * @public
 */
export interface GuardrailInvocationMetrics {
    /**
     * <p>The processing latency details for the guardrail invocation metrics.</p>
     * @public
     */
    guardrailProcessingLatency?: number | undefined;
    /**
     * <p>The usage details for the guardrail invocation metrics.</p>
     * @public
     */
    usage?: GuardrailUsage | undefined;
    /**
     * <p>The coverage details for the guardrail invocation metrics.</p>
     * @public
     */
    guardrailCoverage?: GuardrailCoverage | undefined;
}
/**
 * <p>A Personally Identifiable Information (PII) entity configured in a guardrail.</p>
 * @public
 */
export interface GuardrailPiiEntityFilter {
    /**
     * <p>The PII entity filter match.</p>
     * @public
     */
    match: string | undefined;
    /**
     * <p>The PII entity filter type.</p>
     * @public
     */
    type: GuardrailPiiEntityType | undefined;
    /**
     * <p>The PII entity filter action.</p>
     * @public
     */
    action: GuardrailSensitiveInformationPolicyAction | undefined;
    /**
     * <p>Indicates whether personally identifiable information (PII) that breaches the guardrail configuration is detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>A Regex filter configured in a guardrail.</p>
 * @public
 */
export interface GuardrailRegexFilter {
    /**
     * <p>The regex filter name.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The regesx filter match.</p>
     * @public
     */
    match?: string | undefined;
    /**
     * <p>The regex query.</p>
     * @public
     */
    regex?: string | undefined;
    /**
     * <p>The region filter action.</p>
     * @public
     */
    action: GuardrailSensitiveInformationPolicyAction | undefined;
    /**
     * <p>Indicates whether custom regex entities that breach the guardrail configuration are detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>The assessment for a Personally Identifiable Information (PII) policy. </p>
 * @public
 */
export interface GuardrailSensitiveInformationPolicyAssessment {
    /**
     * <p>The PII entities in the assessment.</p>
     * @public
     */
    piiEntities: GuardrailPiiEntityFilter[] | undefined;
    /**
     * <p>The regex queries in the assessment.</p>
     * @public
     */
    regexes: GuardrailRegexFilter[] | undefined;
}
/**
 * <p>Information about a topic guardrail.</p>
 * @public
 */
export interface GuardrailTopic {
    /**
     * <p>The name for the guardrail.</p>
     * @public
     */
    name: string | undefined;
    /**
     * <p>The type behavior that the guardrail should perform when the model detects the topic.</p>
     * @public
     */
    type: GuardrailTopicType | undefined;
    /**
     * <p>The action the guardrail should take when it intervenes on a topic.</p>
     * @public
     */
    action: GuardrailTopicPolicyAction | undefined;
    /**
     * <p>Indicates whether topic content that breaches the guardrail configuration is detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>A behavior assessment of a topic policy.</p>
 * @public
 */
export interface GuardrailTopicPolicyAssessment {
    /**
     * <p>The topics in the assessment.</p>
     * @public
     */
    topics: GuardrailTopic[] | undefined;
}
/**
 * <p>A custom word configured in a guardrail.</p>
 * @public
 */
export interface GuardrailCustomWord {
    /**
     * <p>The match for the custom word.</p>
     * @public
     */
    match: string | undefined;
    /**
     * <p>The action for the custom word.</p>
     * @public
     */
    action: GuardrailWordPolicyAction | undefined;
    /**
     * <p>Indicates whether custom word content that breaches the guardrail configuration is detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>A managed word configured in a guardrail.</p>
 * @public
 */
export interface GuardrailManagedWord {
    /**
     * <p>The match for the managed word.</p>
     * @public
     */
    match: string | undefined;
    /**
     * <p>The type for the managed word.</p>
     * @public
     */
    type: GuardrailManagedWordType | undefined;
    /**
     * <p>The action for the managed word.</p>
     * @public
     */
    action: GuardrailWordPolicyAction | undefined;
    /**
     * <p>Indicates whether managed word content that breaches the guardrail configuration is detected.</p>
     * @public
     */
    detected?: boolean | undefined;
}
/**
 * <p>The word policy assessment.</p>
 * @public
 */
export interface GuardrailWordPolicyAssessment {
    /**
     * <p>Custom words in the assessment.</p>
     * @public
     */
    customWords: GuardrailCustomWord[] | undefined;
    /**
     * <p>Managed word lists in the assessment.</p>
     * @public
     */
    managedWordLists: GuardrailManagedWord[] | undefined;
}
/**
 * <p>A behavior assessment of the guardrail policies used in a call to the Converse API. </p>
 * @public
 */
export interface GuardrailAssessment {
    /**
     * <p>The topic policy.</p>
     * @public
     */
    topicPolicy?: GuardrailTopicPolicyAssessment | undefined;
    /**
     * <p>The content policy.</p>
     * @public
     */
    contentPolicy?: GuardrailContentPolicyAssessment | undefined;
    /**
     * <p>The word policy.</p>
     * @public
     */
    wordPolicy?: GuardrailWordPolicyAssessment | undefined;
    /**
     * <p>The sensitive information policy.</p>
     * @public
     */
    sensitiveInformationPolicy?: GuardrailSensitiveInformationPolicyAssessment | undefined;
    /**
     * <p>The contextual grounding policy used for the guardrail assessment.</p>
     * @public
     */
    contextualGroundingPolicy?: GuardrailContextualGroundingPolicyAssessment | undefined;
    /**
     * <p>The automated reasoning policy assessment results, including logical validation findings for the input content.</p>
     * @public
     */
    automatedReasoningPolicy?: GuardrailAutomatedReasoningPolicyAssessment | undefined;
    /**
     * <p>The invocation metrics for the guardrail assessment.</p>
     * @public
     */
    invocationMetrics?: GuardrailInvocationMetrics | undefined;
    /**
     * <p>Details about the specific guardrail that was applied during this assessment, including its identifier, version, ARN, origin, and ownership information.</p>
     * @public
     */
    appliedGuardrailDetails?: AppliedGuardrailDetails | undefined;
}
/**
 * <p>The output content produced by the guardrail.</p>
 * @public
 */
export interface GuardrailOutputContent {
    /**
     * <p>The specific text for the output content produced by the guardrail.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * @public
 */
export interface ApplyGuardrailResponse {
    /**
     * <p>The usage details in the response from the guardrail.</p>
     * @public
     */
    usage: GuardrailUsage | undefined;
    /**
     * <p>The action taken in the response from the guardrail.</p>
     * @public
     */
    action: GuardrailAction | undefined;
    /**
     * <p>The reason for the action taken when harmful content is detected.</p>
     * @public
     */
    actionReason?: string | undefined;
    /**
     * <p>The output details in the response from the guardrail.</p>
     * @public
     */
    outputs: GuardrailOutputContent[] | undefined;
    /**
     * <p>The assessment details in the response from the guardrail.</p>
     * @public
     */
    assessments: GuardrailAssessment[] | undefined;
    /**
     * <p>The guardrail coverage details in the apply guardrail response.</p>
     * @public
     */
    guardrailCoverage?: GuardrailCoverage | undefined;
}
/**
 * <p>Configuration information for a guardrail that you use with the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> operation.</p>
 * @public
 */
export interface GuardrailConfiguration {
    /**
     * <p>The identifier for the guardrail.</p>
     * @public
     */
    guardrailIdentifier?: string | undefined;
    /**
     * <p>The version of the guardrail.</p>
     * @public
     */
    guardrailVersion?: string | undefined;
    /**
     * <p>The trace behavior for the guardrail.</p>
     * @public
     */
    trace?: GuardrailTrace | undefined;
}
/**
 * <p>Base inference parameters to pass to a model in a call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> or <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>.</p> <p>If you need to pass additional parameters that the model supports, use the <code>additionalModelRequestFields</code> request field in the call to <code>Converse</code> or <code>ConverseStream</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Model parameters</a>.</p>
 * @public
 */
export interface InferenceConfiguration {
    /**
     * <p>The maximum number of tokens to allow in the generated response. The default value is the maximum allowed value for the model that you are using. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>. </p>
     * @public
     */
    maxTokens?: number | undefined;
    /**
     * <p>The likelihood of the model selecting higher-probability options while generating a response. A lower value makes the model more likely to choose higher-probability options, while a higher value makes the model more likely to choose lower-probability options.</p> <p>The default value is the default value for the model that you are using. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>. </p>
     * @public
     */
    temperature?: number | undefined;
    /**
     * <p>The percentage of most-likely candidates that the model considers for the next token. For example, if you choose a value of 0.8 for <code>topP</code>, the model selects from the top 80% of the probability distribution of tokens that could be next in the sequence.</p> <p>The default value is the default value for the model that you are using. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>. </p>
     * @public
     */
    topP?: number | undefined;
    /**
     * <p>A list of stop sequences. A stop sequence is a sequence of characters that causes the model to stop generating the response. </p>
     * @public
     */
    stopSequences?: string[] | undefined;
}
/**
 * <p>A block containing error information when content processing fails.</p>
 * @public
 */
export interface ErrorBlock {
    /**
     * <p>A human-readable error message describing what went wrong during content processing.</p>
     * @public
     */
    message?: string | undefined;
}
/**
 * <p>A storage location in an Amazon S3 bucket.</p>
 * @public
 */
export interface S3Location {
    /**
     * <p>An object URI starting with <code>s3://</code>.</p>
     * @public
     */
    uri: string | undefined;
    /**
     * <p>If the bucket belongs to another AWS account, specify that account's ID.</p>
     * @public
     */
    bucketOwner?: string | undefined;
}
/**
 * <p>The source of audio data, which can be provided either as raw bytes or a reference to an S3 location.</p>
 * @public
 */
export type AudioSource = AudioSource.BytesMember | AudioSource.S3LocationMember | AudioSource.$UnknownMember;
/**
 * @public
 */
export declare namespace AudioSource {
    /**
     * <p>Audio data encoded in base64.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        s3Location?: never;
        $unknown?: never;
    }
    /**
     * <p>A reference to audio data stored in an Amazon S3 bucket. To see which models support S3 uploads, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html">Supported models and features for Converse</a>.</p>
     * @public
     */
    interface S3LocationMember {
        bytes?: never;
        s3Location: S3Location;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        s3Location?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        s3Location: (value: S3Location) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>An audio content block that contains audio data in various supported formats.</p>
 * @public
 */
export interface AudioBlock {
    /**
     * <p>The format of the audio data, such as MP3, WAV, FLAC, or other supported audio formats.</p>
     * @public
     */
    format: AudioFormat | undefined;
    /**
     * <p>The source of the audio data, which can be provided as raw bytes or an S3 location.</p>
     * @public
     */
    source: AudioSource | undefined;
    /**
     * <p>Error information if the audio block could not be processed or contains invalid data.</p>
     * @public
     */
    error?: ErrorBlock | undefined;
}
/**
 * <p>Defines a section of content to be cached for reuse in subsequent API calls.</p>
 * @public
 */
export interface CachePointBlock {
    /**
     * <p>Specifies the type of cache point within the CachePointBlock.</p>
     * @public
     */
    type: CachePointType | undefined;
    /**
     * <p>Optional TTL duration for cache entries. When specified, enables extended TTL caching with the specified duration. When omitted, uses <code>type</code> value for caching behavior.</p>
     * @public
     */
    ttl?: CacheTTL | undefined;
}
/**
 * <p>Specifies a character-level location within a document, providing precise positioning information for cited content using start and end character indices.</p>
 * @public
 */
export interface DocumentCharLocation {
    /**
     * <p>The index of the document within the array of documents provided in the request.</p>
     * @public
     */
    documentIndex?: number | undefined;
    /**
     * <p>The starting character position of the cited content within the document.</p>
     * @public
     */
    start?: number | undefined;
    /**
     * <p>The ending character position of the cited content within the document.</p>
     * @public
     */
    end?: number | undefined;
}
/**
 * <p>Specifies a chunk-level location within a document, providing positioning information for cited content using logical document segments or chunks.</p>
 * @public
 */
export interface DocumentChunkLocation {
    /**
     * <p>The index of the document within the array of documents provided in the request.</p>
     * @public
     */
    documentIndex?: number | undefined;
    /**
     * <p>The starting chunk identifier or index of the cited content within the document.</p>
     * @public
     */
    start?: number | undefined;
    /**
     * <p>The ending chunk identifier or index of the cited content within the document.</p>
     * @public
     */
    end?: number | undefined;
}
/**
 * <p>Specifies a page-level location within a document, providing positioning information for cited content using page numbers.</p>
 * @public
 */
export interface DocumentPageLocation {
    /**
     * <p>The index of the document within the array of documents provided in the request.</p>
     * @public
     */
    documentIndex?: number | undefined;
    /**
     * <p>The starting page number of the cited content within the document.</p>
     * @public
     */
    start?: number | undefined;
    /**
     * <p>The ending page number of the cited content within the document.</p>
     * @public
     */
    end?: number | undefined;
}
/**
 * <p>Specifies a search result location within the content array, providing positioning information for cited content using search result index and block positions.</p>
 * @public
 */
export interface SearchResultLocation {
    /**
     * <p>The index of the search result content block where the cited content is found.</p>
     * @public
     */
    searchResultIndex?: number | undefined;
    /**
     * <p>The starting position in the content array where the cited content begins.</p>
     * @public
     */
    start?: number | undefined;
    /**
     * <p>The ending position in the content array where the cited content ends.</p>
     * @public
     */
    end?: number | undefined;
}
/**
 * <p>Provides the URL and domain information for the website that was cited when performing a web search.</p>
 * @public
 */
export interface WebLocation {
    /**
     * <p>The URL that was cited when performing a web search.</p>
     * @public
     */
    url?: string | undefined;
    /**
     * <p>The domain that was cited when performing a web search.</p>
     * @public
     */
    domain?: string | undefined;
}
/**
 * <p>Specifies the precise location within a source document where cited content can be found. This can include character-level positions, page numbers, or document chunks depending on the document type and indexing method.</p>
 * @public
 */
export type CitationLocation = CitationLocation.DocumentCharMember | CitationLocation.DocumentChunkMember | CitationLocation.DocumentPageMember | CitationLocation.SearchResultLocationMember | CitationLocation.WebMember | CitationLocation.$UnknownMember;
/**
 * @public
 */
export declare namespace CitationLocation {
    /**
     * <p>The web URL that was cited for this reference.</p>
     * @public
     */
    interface WebMember {
        web: WebLocation;
        documentChar?: never;
        documentPage?: never;
        documentChunk?: never;
        searchResultLocation?: never;
        $unknown?: never;
    }
    /**
     * <p>The character-level location within the document where the cited content is found.</p>
     * @public
     */
    interface DocumentCharMember {
        web?: never;
        documentChar: DocumentCharLocation;
        documentPage?: never;
        documentChunk?: never;
        searchResultLocation?: never;
        $unknown?: never;
    }
    /**
     * <p>The page-level location within the document where the cited content is found.</p>
     * @public
     */
    interface DocumentPageMember {
        web?: never;
        documentChar?: never;
        documentPage: DocumentPageLocation;
        documentChunk?: never;
        searchResultLocation?: never;
        $unknown?: never;
    }
    /**
     * <p>The chunk-level location within the document where the cited content is found, typically used for documents that have been segmented into logical chunks.</p>
     * @public
     */
    interface DocumentChunkMember {
        web?: never;
        documentChar?: never;
        documentPage?: never;
        documentChunk: DocumentChunkLocation;
        searchResultLocation?: never;
        $unknown?: never;
    }
    /**
     * <p>The search result location where the cited content is found, including the search result index and block positions within the content array.</p>
     * @public
     */
    interface SearchResultLocationMember {
        web?: never;
        documentChar?: never;
        documentPage?: never;
        documentChunk?: never;
        searchResultLocation: SearchResultLocation;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        web?: never;
        documentChar?: never;
        documentPage?: never;
        documentChunk?: never;
        searchResultLocation?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        web: (value: WebLocation) => T;
        documentChar: (value: DocumentCharLocation) => T;
        documentPage: (value: DocumentPageLocation) => T;
        documentChunk: (value: DocumentChunkLocation) => T;
        searchResultLocation: (value: SearchResultLocation) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Contains the actual text content from a source document that is being cited or referenced in the model's response.</p>
 * @public
 */
export type CitationSourceContent = CitationSourceContent.TextMember | CitationSourceContent.$UnknownMember;
/**
 * @public
 */
export declare namespace CitationSourceContent {
    /**
     * <p>The text content from the source document that is being cited.</p>
     * @public
     */
    interface TextMember {
        text: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Contains information about a citation that references a specific source document. Citations provide traceability between the model's generated response and the source documents that informed that response.</p>
 * @public
 */
export interface Citation {
    /**
     * <p>The title or identifier of the source document being cited.</p>
     * @public
     */
    title?: string | undefined;
    /**
     * <p>The source from the original search result that provided the cited content.</p>
     * @public
     */
    source?: string | undefined;
    /**
     * <p>The specific content from the source document that was referenced or cited in the generated response.</p>
     * @public
     */
    sourceContent?: CitationSourceContent[] | undefined;
    /**
     * <p>The precise location within the source document where the cited content can be found, including character positions, page numbers, or chunk identifiers.</p>
     * @public
     */
    location?: CitationLocation | undefined;
}
/**
 * <p>Contains the generated text content that corresponds to or is supported by a citation from a source document.</p>
 * @public
 */
export type CitationGeneratedContent = CitationGeneratedContent.TextMember | CitationGeneratedContent.$UnknownMember;
/**
 * @public
 */
export declare namespace CitationGeneratedContent {
    /**
     * <p>The text content that was generated by the model and is supported by the associated citation.</p>
     * @public
     */
    interface TextMember {
        text: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A content block that contains both generated text and associated citation information. This block type is returned when document citations are enabled, providing traceability between the generated content and the source documents that informed the response.</p>
 * @public
 */
export interface CitationsContentBlock {
    /**
     * <p>The generated content that is supported by the associated citations.</p>
     * @public
     */
    content?: CitationGeneratedContent[] | undefined;
    /**
     * <p>An array of citations that reference the source documents used to generate the associated content.</p>
     * @public
     */
    citations?: Citation[] | undefined;
}
/**
 * <p>Configuration settings for enabling and controlling document citations in Converse API responses. When enabled, the model can include citation information that links generated content back to specific source documents.</p>
 * @public
 */
export interface CitationsConfig {
    /**
     * <p>Specifies whether citations from the selected document should be used in the model's response. When set to true, the model can generate citations that reference the source documents used to inform the response.</p>
     * @public
     */
    enabled: boolean | undefined;
}
/**
 * <p>Contains the actual content of a document that can be processed by the model and potentially cited in the response.</p>
 * @public
 */
export type DocumentContentBlock = DocumentContentBlock.TextMember | DocumentContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace DocumentContentBlock {
    /**
     * <p>The text content of the document.</p>
     * @public
     */
    interface TextMember {
        text: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Contains the content of a document.</p>
 * @public
 */
export type DocumentSource = DocumentSource.BytesMember | DocumentSource.ContentMember | DocumentSource.S3LocationMember | DocumentSource.TextMember | DocumentSource.$UnknownMember;
/**
 * @public
 */
export declare namespace DocumentSource {
    /**
     * <p>The raw bytes for the document. If you use an Amazon Web Services SDK, you don't need to encode the bytes in base64.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        s3Location?: never;
        text?: never;
        content?: never;
        $unknown?: never;
    }
    /**
     * <p>The location of a document object in an Amazon S3 bucket. To see which models support S3 uploads, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html">Supported models and features for Converse</a>.</p>
     * @public
     */
    interface S3LocationMember {
        bytes?: never;
        s3Location: S3Location;
        text?: never;
        content?: never;
        $unknown?: never;
    }
    /**
     * <p>The text content of the document source.</p>
     * @public
     */
    interface TextMember {
        bytes?: never;
        s3Location?: never;
        text: string;
        content?: never;
        $unknown?: never;
    }
    /**
     * <p>The structured content of the document source, which may include various content blocks such as text, images, or other document elements.</p>
     * @public
     */
    interface ContentMember {
        bytes?: never;
        s3Location?: never;
        text?: never;
        content: DocumentContentBlock[];
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        s3Location?: never;
        text?: never;
        content?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        s3Location: (value: S3Location) => T;
        text: (value: string) => T;
        content: (value: DocumentContentBlock[]) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A document to include in a message.</p>
 * @public
 */
export interface DocumentBlock {
    /**
     * <p>The format of a document, or its extension.</p>
     * @public
     */
    format?: DocumentFormat | undefined;
    /**
     * <p>A name for the document. The name can only contain the following characters:</p> <ul> <li> <p>Alphanumeric characters</p> </li> <li> <p>Whitespace characters (no more than one in a row)</p> </li> <li> <p>Hyphens</p> </li> <li> <p>Parentheses</p> </li> <li> <p>Square brackets</p> </li> </ul> <note> <p>This field is vulnerable to prompt injections, because the model might inadvertently interpret it as instructions. Therefore, we recommend that you specify a neutral name.</p> </note>
     * @public
     */
    name: string | undefined;
    /**
     * <p>Contains the content of the document.</p>
     * @public
     */
    source: DocumentSource | undefined;
    /**
     * <p>Contextual information about how the document should be processed or interpreted by the model when generating citations.</p>
     * @public
     */
    context?: string | undefined;
    /**
     * <p>Configuration settings that control how citations should be generated for this specific document.</p>
     * @public
     */
    citations?: CitationsConfig | undefined;
}
/**
 * <p>The image source (image bytes) of the guardrail converse image source.</p>
 * @public
 */
export type GuardrailConverseImageSource = GuardrailConverseImageSource.BytesMember | GuardrailConverseImageSource.$UnknownMember;
/**
 * @public
 */
export declare namespace GuardrailConverseImageSource {
    /**
     * <p>The raw image bytes for the image.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>An image block that contains images that you want to assess with a guardrail.</p>
 * @public
 */
export interface GuardrailConverseImageBlock {
    /**
     * <p>The format details for the image type of the guardrail converse image block.</p>
     * @public
     */
    format: GuardrailConverseImageFormat | undefined;
    /**
     * <p>The image source (image bytes) of the guardrail converse image block.</p>
     * @public
     */
    source: GuardrailConverseImageSource | undefined;
}
/**
 * <p>A text block that contains text that you want to assess with a guardrail. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_GuardrailConverseContentBlock.html">GuardrailConverseContentBlock</a>.</p>
 * @public
 */
export interface GuardrailConverseTextBlock {
    /**
     * <p>The text that you want to guard.</p>
     * @public
     */
    text: string | undefined;
    /**
     * <p>The qualifier details for the guardrails contextual grounding filter.</p>
     * @public
     */
    qualifiers?: GuardrailConverseContentQualifier[] | undefined;
}
/**
 * <p/> <p>A content block for selective guarding with the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> or <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a> API operations. </p>
 * @public
 */
export type GuardrailConverseContentBlock = GuardrailConverseContentBlock.ImageMember | GuardrailConverseContentBlock.TextMember | GuardrailConverseContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace GuardrailConverseContentBlock {
    /**
     * <p>The text to guard.</p>
     * @public
     */
    interface TextMember {
        text: GuardrailConverseTextBlock;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>Image within converse content block to be evaluated by the guardrail.</p>
     * @public
     */
    interface ImageMember {
        text?: never;
        image: GuardrailConverseImageBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        image?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: GuardrailConverseTextBlock) => T;
        image: (value: GuardrailConverseImageBlock) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The source for an image.</p>
 * @public
 */
export type ImageSource = ImageSource.BytesMember | ImageSource.S3LocationMember | ImageSource.$UnknownMember;
/**
 * @public
 */
export declare namespace ImageSource {
    /**
     * <p>The raw image bytes for the image. If you use an AWS SDK, you don't need to encode the image bytes in base64.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        s3Location?: never;
        $unknown?: never;
    }
    /**
     * <p>The location of an image object in an Amazon S3 bucket. To see which models support S3 uploads, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html">Supported models and features for Converse</a>.</p>
     * @public
     */
    interface S3LocationMember {
        bytes?: never;
        s3Location: S3Location;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        s3Location?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        s3Location: (value: S3Location) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Image content for a message.</p>
 * @public
 */
export interface ImageBlock {
    /**
     * <p>The format of the image.</p>
     * @public
     */
    format: ImageFormat | undefined;
    /**
     * <p>The source for the image.</p>
     * @public
     */
    source: ImageSource | undefined;
    /**
     * <p>Error information if the image block could not be processed or contains invalid data.</p>
     * @public
     */
    error?: ErrorBlock | undefined;
}
/**
 * <p>Contains the reasoning that the model used to return the output.</p>
 * @public
 */
export interface ReasoningTextBlock {
    /**
     * <p>The reasoning that the model used to return the output.</p>
     * @public
     */
    text: string | undefined;
    /**
     * <p>A token that verifies that the reasoning text was generated by the model. If you pass a reasoning block back to the API in a multi-turn conversation, include the text and its signature unmodified.</p>
     * @public
     */
    signature?: string | undefined;
}
/**
 * <p>Contains content regarding the reasoning that is carried out by the model with respect to the content in the content block. Reasoning refers to a Chain of Thought (CoT) that the model generates to enhance the accuracy of its final response.</p>
 * @public
 */
export type ReasoningContentBlock = ReasoningContentBlock.ReasoningTextMember | ReasoningContentBlock.RedactedContentMember | ReasoningContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace ReasoningContentBlock {
    /**
     * <p>The reasoning that the model used to return the output.</p>
     * @public
     */
    interface ReasoningTextMember {
        reasoningText: ReasoningTextBlock;
        redactedContent?: never;
        $unknown?: never;
    }
    /**
     * <p>The content in the reasoning that was encrypted by the model provider for safety reasons. The encryption doesn't affect the quality of responses.</p>
     * @public
     */
    interface RedactedContentMember {
        reasoningText?: never;
        redactedContent: Uint8Array;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        reasoningText?: never;
        redactedContent?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        reasoningText: (value: ReasoningTextBlock) => T;
        redactedContent: (value: Uint8Array) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A block within a search result that contains the content.</p>
 * @public
 */
export interface SearchResultContentBlock {
    /**
     * <p>The actual text content</p>
     * @public
     */
    text: string | undefined;
}
/**
 * <p>A search result block that enables natural citations with proper source attribution for retrieved content.</p> <note> <p>This field is only supported by Anthropic Claude Opus 4.1, Opus 4, Sonnet 4.5, Sonnet 4, Sonnet 3.7, and 3.5 Haiku models.</p> </note>
 * @public
 */
export interface SearchResultBlock {
    /**
     * <p>The source URL or identifier for the content.</p>
     * @public
     */
    source: string | undefined;
    /**
     * <p>A descriptive title for the search result.</p>
     * @public
     */
    title: string | undefined;
    /**
     * <p>An array of search result content block.</p>
     * @public
     */
    content: SearchResultContentBlock[] | undefined;
    /**
     * <p>Configuration setting for citations</p>
     * @public
     */
    citations?: CitationsConfig | undefined;
}
/**
 * <p>A video source. You can upload a smaller video as a base64-encoded string as long as the encoded file is less than 25MB. You can also transfer videos up to 1GB in size from an S3 bucket.</p>
 * @public
 */
export type VideoSource = VideoSource.BytesMember | VideoSource.S3LocationMember | VideoSource.$UnknownMember;
/**
 * @public
 */
export declare namespace VideoSource {
    /**
     * <p>Video content encoded in base64.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        s3Location?: never;
        $unknown?: never;
    }
    /**
     * <p>The location of a video object in an Amazon S3 bucket. To see which models support S3 uploads, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html">Supported models and features for Converse</a>.</p>
     * @public
     */
    interface S3LocationMember {
        bytes?: never;
        s3Location: S3Location;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        s3Location?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        s3Location: (value: S3Location) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A video block.</p>
 * @public
 */
export interface VideoBlock {
    /**
     * <p>The block's format.</p>
     * @public
     */
    format: VideoFormat | undefined;
    /**
     * <p>The block's source.</p>
     * @public
     */
    source: VideoSource | undefined;
}
/**
 * <p>The tool result content block. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export type ToolResultContentBlock = ToolResultContentBlock.DocumentMember | ToolResultContentBlock.ImageMember | ToolResultContentBlock.JsonMember | ToolResultContentBlock.SearchResultMember | ToolResultContentBlock.TextMember | ToolResultContentBlock.VideoMember | ToolResultContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace ToolResultContentBlock {
    /**
     * <p>A tool result that is JSON format data. </p>
     * @public
     */
    interface JsonMember {
        json: __DocumentType;
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A tool result that is text. </p>
     * @public
     */
    interface TextMember {
        json?: never;
        text: string;
        image?: never;
        document?: never;
        video?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A tool result that is an image. </p> <note> <p>This field is only supported by Amazon Nova and Anthropic Claude 3 and 4 models.</p> </note>
     * @public
     */
    interface ImageMember {
        json?: never;
        text?: never;
        image: ImageBlock;
        document?: never;
        video?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A tool result that is a document.</p>
     * @public
     */
    interface DocumentMember {
        json?: never;
        text?: never;
        image?: never;
        document: DocumentBlock;
        video?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A tool result that is video.</p>
     * @public
     */
    interface VideoMember {
        json?: never;
        text?: never;
        image?: never;
        document?: never;
        video: VideoBlock;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A tool result that is a search result.</p>
     * @public
     */
    interface SearchResultMember {
        json?: never;
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        searchResult: SearchResultBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        json?: never;
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        searchResult?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        json: (value: __DocumentType) => T;
        text: (value: string) => T;
        image: (value: ImageBlock) => T;
        document: (value: DocumentBlock) => T;
        video: (value: VideoBlock) => T;
        searchResult: (value: SearchResultBlock) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A tool result block that contains the results for a tool request that the model previously made. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface ToolResultBlock {
    /**
     * <p>The ID of the tool request that this is the result for. </p>
     * @public
     */
    toolUseId: string | undefined;
    /**
     * <p>The content for tool result content block.</p>
     * @public
     */
    content: ToolResultContentBlock[] | undefined;
    /**
     * <p>The status for the tool result content block.</p> <note> <p>This field is only supported by Amazon Nova and Anthropic Claude 3 and 4 models.</p> </note>
     * @public
     */
    status?: ToolResultStatus | undefined;
    /**
     * <p>The type for the tool result content block.</p>
     * @public
     */
    type?: string | undefined;
}
/**
 * <p>A tool use content block. Contains information about a tool that the model is requesting be run., The model uses the result from the tool to generate a response. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface ToolUseBlock {
    /**
     * <p>The ID for the tool request.</p>
     * @public
     */
    toolUseId: string | undefined;
    /**
     * <p>The name of the tool that the model wants to use.</p>
     * @public
     */
    name: string | undefined;
    /**
     * <p>The input to pass to the tool. </p>
     * @public
     */
    input: __DocumentType | undefined;
    /**
     * <p>The type for the tool request.</p>
     * @public
     */
    type?: ToolUseType | undefined;
}
/**
 * <p>A block of content for a message that you pass to, or receive from, a model with the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> or <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a> API operations.</p>
 * @public
 */
export type ContentBlock = ContentBlock.AudioMember | ContentBlock.CachePointMember | ContentBlock.CitationsContentMember | ContentBlock.DocumentMember | ContentBlock.GuardContentMember | ContentBlock.ImageMember | ContentBlock.ReasoningContentMember | ContentBlock.SearchResultMember | ContentBlock.TextMember | ContentBlock.ToolResultMember | ContentBlock.ToolUseMember | ContentBlock.VideoMember | ContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace ContentBlock {
    /**
     * <p>Text to include in the message.</p>
     * @public
     */
    interface TextMember {
        text: string;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>Image to include in the message. </p> <note> <p>This field is only supported by Anthropic Claude 3 models.</p> </note>
     * @public
     */
    interface ImageMember {
        text?: never;
        image: ImageBlock;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A document to include in the message.</p>
     * @public
     */
    interface DocumentMember {
        text?: never;
        image?: never;
        document: DocumentBlock;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>Video to include in the message. </p>
     * @public
     */
    interface VideoMember {
        text?: never;
        image?: never;
        document?: never;
        video: VideoBlock;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>An audio content block containing audio data in the conversation.</p>
     * @public
     */
    interface AudioMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio: AudioBlock;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>Information about a tool use request from a model.</p>
     * @public
     */
    interface ToolUseMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse: ToolUseBlock;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>The result for a tool request that a model makes.</p>
     * @public
     */
    interface ToolResultMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult: ToolResultBlock;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the content to assess with the guardrail. If you don't specify <code>guardContent</code> in a call to the Converse API, the guardrail (if passed in the Converse API) assesses the entire message.</p> <p>For more information, see <i>Use a guardrail with the Converse API</i> in the <i>Amazon Bedrock User Guide</i>.</p>
     * @public
     */
    interface GuardContentMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent: GuardrailConverseContentBlock;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>CachePoint to include in the message.</p>
     * @public
     */
    interface CachePointMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint: CachePointBlock;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains content regarding the reasoning that is carried out by the model. Reasoning refers to a Chain of Thought (CoT) that the model generates to enhance the accuracy of its final response.</p>
     * @public
     */
    interface ReasoningContentMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent: ReasoningContentBlock;
        citationsContent?: never;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>A content block that contains both generated text and associated citation information, providing traceability between the response and source documents.</p>
     * @public
     */
    interface CitationsContentMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent: CitationsContentBlock;
        searchResult?: never;
        $unknown?: never;
    }
    /**
     * <p>Search result to include in the message.</p>
     * @public
     */
    interface SearchResultMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult: SearchResultBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        image?: never;
        document?: never;
        video?: never;
        audio?: never;
        toolUse?: never;
        toolResult?: never;
        guardContent?: never;
        cachePoint?: never;
        reasoningContent?: never;
        citationsContent?: never;
        searchResult?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        image: (value: ImageBlock) => T;
        document: (value: DocumentBlock) => T;
        video: (value: VideoBlock) => T;
        audio: (value: AudioBlock) => T;
        toolUse: (value: ToolUseBlock) => T;
        toolResult: (value: ToolResultBlock) => T;
        guardContent: (value: GuardrailConverseContentBlock) => T;
        cachePoint: (value: CachePointBlock) => T;
        reasoningContent: (value: ReasoningContentBlock) => T;
        citationsContent: (value: CitationsContentBlock) => T;
        searchResult: (value: SearchResultBlock) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A message input, or returned from, a call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> or <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a>.</p>
 * @public
 */
export interface Message {
    /**
     * <p>The role that the message plays in the message.</p>
     * @public
     */
    role: ConversationRole | undefined;
    /**
     * <p>The message content. Note the following restrictions:</p> <ul> <li> <p>You can include up to 20 images. Each image's size, height, and width must be no more than 3.75 MB, 8000 px, and 8000 px, respectively.</p> </li> <li> <p>You can include up to five documents. Each document's size must be no more than 4.5 MB.</p> </li> <li> <p>If you include a <code>ContentBlock</code> with a <code>document</code> field in the array, you must also include a <code>ContentBlock</code> with a <code>text</code> field.</p> </li> <li> <p>You can only include images and documents if the <code>role</code> is <code>user</code>.</p> </li> </ul>
     * @public
     */
    content: ContentBlock[] | undefined;
}
/**
 * <p> JSON schema structured output format options. </p>
 * @public
 */
export interface JsonSchemaDefinition {
    /**
     * <p> The JSON schema to constrain the model's output. For more information, see <a href="https://json-schema.org/understanding-json-schema/reference">JSON Schema Reference</a>. </p>
     * @public
     */
    schema: string | undefined;
    /**
     * <p> The name of the JSON schema. </p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p> A description of the JSON schema. </p>
     * @public
     */
    description?: string | undefined;
}
/**
 * <p> The structure that the model's output must adhere to. </p>
 * @public
 */
export type OutputFormatStructure = OutputFormatStructure.JsonSchemaMember | OutputFormatStructure.$UnknownMember;
/**
 * @public
 */
export declare namespace OutputFormatStructure {
    /**
     * <p> A JSON schema structure that the model's output must adhere to. </p>
     * @public
     */
    interface JsonSchemaMember {
        jsonSchema: JsonSchemaDefinition;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        jsonSchema?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        jsonSchema: (value: JsonSchemaDefinition) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p> Structured output parameters to control the model's response. </p>
 * @public
 */
export interface OutputFormat {
    /**
     * <p> The type of structured output format. </p>
     * @public
     */
    type: OutputFormatType | undefined;
    /**
     * <p> The structure that the model's output must adhere to. </p>
     * @public
     */
    structure: OutputFormatStructure | undefined;
}
/**
 * <p>Output configuration for a model response in a call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> or <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a>.</p>
 * @public
 */
export interface OutputConfig {
    /**
     * <p>Structured output parameters to control the model's text response. </p>
     * @public
     */
    textFormat?: OutputFormat | undefined;
}
/**
 * <p>Performance settings for a model.</p>
 * @public
 */
export interface PerformanceConfiguration {
    /**
     * <p>To use a latency-optimized version of the model, set to <code>optimized</code>.</p>
     * @public
     */
    latency?: PerformanceConfigLatency | undefined;
}
/**
 * <p>Contains a map of variables in a prompt from Prompt management to an object containing the values to fill in for them when running model invocation. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-how.html">How Prompt management works</a>.</p>
 * @public
 */
export type PromptVariableValues = PromptVariableValues.TextMember | PromptVariableValues.$UnknownMember;
/**
 * @public
 */
export declare namespace PromptVariableValues {
    /**
     * <p>The text value that the variable maps to.</p>
     * @public
     */
    interface TextMember {
        text: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Specifies the processing tier configuration used for serving the request.</p>
 * @public
 */
export interface ServiceTier {
    /**
     * <p>Specifies the processing tier type used for serving the request.</p>
     * @public
     */
    type: ServiceTierType | undefined;
}
/**
 * <p>Contains configurations for instructions to provide the model for how to handle input. To learn more, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html">Using the Converse API</a>.</p>
 * @public
 */
export type SystemContentBlock = SystemContentBlock.CachePointMember | SystemContentBlock.GuardContentMember | SystemContentBlock.TextMember | SystemContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace SystemContentBlock {
    /**
     * <p>A system prompt for the model. </p>
     * @public
     */
    interface TextMember {
        text: string;
        guardContent?: never;
        cachePoint?: never;
        $unknown?: never;
    }
    /**
     * <p>A content block to assess with the guardrail. Use with the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a> or <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a> API operations. </p> <p>For more information, see <i>Use a guardrail with the Converse API</i> in the <i>Amazon Bedrock User Guide</i>.</p>
     * @public
     */
    interface GuardContentMember {
        text?: never;
        guardContent: GuardrailConverseContentBlock;
        cachePoint?: never;
        $unknown?: never;
    }
    /**
     * <p>CachePoint to include in the system prompt.</p>
     * @public
     */
    interface CachePointMember {
        text?: never;
        guardContent?: never;
        cachePoint: CachePointBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        guardContent?: never;
        cachePoint?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        guardContent: (value: GuardrailConverseContentBlock) => T;
        cachePoint: (value: CachePointBlock) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The model must request at least one tool (no text is generated). For example, <code>\{"any" : \{\}\}</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface AnyToolChoice {
}
/**
 * <p>The Model automatically decides if a tool should be called or whether to generate text instead. For example, <code>\{"auto" : \{\}\}</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide</p>
 * @public
 */
export interface AutoToolChoice {
}
/**
 * <p>The model must request a specific tool. For example, <code>\{"tool" : \{"name" : "Your tool name"\}\}</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide</p> <note> <p>This field is only supported by Anthropic Claude 3 models.</p> </note>
 * @public
 */
export interface SpecificToolChoice {
    /**
     * <p>The name of the tool that the model must request. </p>
     * @public
     */
    name: string | undefined;
}
/**
 * <p>Determines which tools the model should request in a call to <code>Converse</code> or <code>ConverseStream</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export type ToolChoice = ToolChoice.AnyMember | ToolChoice.AutoMember | ToolChoice.ToolMember | ToolChoice.$UnknownMember;
/**
 * @public
 */
export declare namespace ToolChoice {
    /**
     * <p>(Default). The Model automatically decides if a tool should be called or whether to generate text instead. </p>
     * @public
     */
    interface AutoMember {
        auto: AutoToolChoice;
        any?: never;
        tool?: never;
        $unknown?: never;
    }
    /**
     * <p>The model must request at least one tool (no text is generated).</p>
     * @public
     */
    interface AnyMember {
        auto?: never;
        any: AnyToolChoice;
        tool?: never;
        $unknown?: never;
    }
    /**
     * <p>The Model must request the specified tool. Only supported by Anthropic Claude 3 and Amazon Nova models. </p>
     * @public
     */
    interface ToolMember {
        auto?: never;
        any?: never;
        tool: SpecificToolChoice;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        auto?: never;
        any?: never;
        tool?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        auto: (value: AutoToolChoice) => T;
        any: (value: AnyToolChoice) => T;
        tool: (value: SpecificToolChoice) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Specifies a system-defined tool for the model to use. <i>System-defined tools</i> are tools that are created and provided by the model provider.</p>
 * @public
 */
export interface SystemTool {
    /**
     * <p>The name of the system-defined tool that you want to call. </p>
     * @public
     */
    name: string | undefined;
}
/**
 * <p>The schema for the tool. The top level schema type must be <code>object</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export type ToolInputSchema = ToolInputSchema.JsonMember | ToolInputSchema.$UnknownMember;
/**
 * @public
 */
export declare namespace ToolInputSchema {
    /**
     * <p>The JSON schema for the tool. For more information, see <a href="https://json-schema.org/understanding-json-schema/reference">JSON Schema Reference</a>.</p>
     * @public
     */
    interface JsonMember {
        json: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        json?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        json: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The specification for the tool. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface ToolSpecification {
    /**
     * <p>The name for the tool.</p>
     * @public
     */
    name: string | undefined;
    /**
     * <p>The description for the tool.</p>
     * @public
     */
    description?: string | undefined;
    /**
     * <p>The input schema for the tool in JSON format.</p>
     * @public
     */
    inputSchema: ToolInputSchema | undefined;
    /**
     * <p>Flag to enable structured output enforcement on a tool usage response.</p>
     * @public
     */
    strict?: boolean | undefined;
}
/**
 * <p>Information about a tool that you can use with the Converse API. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export type Tool = Tool.CachePointMember | Tool.SystemToolMember | Tool.ToolSpecMember | Tool.$UnknownMember;
/**
 * @public
 */
export declare namespace Tool {
    /**
     * <p>The specfication for the tool. </p>
     * @public
     */
    interface ToolSpecMember {
        toolSpec: ToolSpecification;
        systemTool?: never;
        cachePoint?: never;
        $unknown?: never;
    }
    /**
     * <p>Specifies the system-defined tool that you want use.</p>
     * @public
     */
    interface SystemToolMember {
        toolSpec?: never;
        systemTool: SystemTool;
        cachePoint?: never;
        $unknown?: never;
    }
    /**
     * <p>CachePoint to include in the tool configuration.</p>
     * @public
     */
    interface CachePointMember {
        toolSpec?: never;
        systemTool?: never;
        cachePoint: CachePointBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        toolSpec?: never;
        systemTool?: never;
        cachePoint?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        toolSpec: (value: ToolSpecification) => T;
        systemTool: (value: SystemTool) => T;
        cachePoint: (value: CachePointBlock) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Configuration information for the tools that you pass to a model. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Tool use (function calling)</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface ToolConfiguration {
    /**
     * <p>An array of tools that you want to pass to a model. </p>
     * @public
     */
    tools: Tool[] | undefined;
    /**
     * <p>If supported by model, forces the model to request a tool. </p>
     * @public
     */
    toolChoice?: ToolChoice | undefined;
}
/**
 * @public
 */
export interface ConverseRequest {
    /**
     * <p>Specifies the model or throughput with which to run inference, or the prompt resource to use in inference. The value depends on the resource that you use:</p> <ul> <li> <p>If you use a base model, specify the model ID or its ARN. For a list of model IDs for base models, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns">Amazon Bedrock base model IDs (on-demand throughput)</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use an inference profile, specify the inference profile ID or its ARN. For a list of inference profile IDs, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html">Supported Regions and models for cross-region inference</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a provisioned model, specify the ARN of the Provisioned Throughput. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-use.html">Run inference using a Provisioned Throughput</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a custom model, first purchase Provisioned Throughput for it. Then specify the ARN of the resulting provisioned model. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-use.html">Use a custom model in Amazon Bedrock</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>To include a prompt that was defined in <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management.html">Prompt management</a>, specify the ARN of the prompt version to use.</p> </li> </ul> <p>The Converse API doesn't support <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html">imported models</a>.</p>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>The messages that you want to send to the model.</p>
     * @public
     */
    messages?: Message[] | undefined;
    /**
     * <p>A prompt that provides instructions or context to the model about the task it should perform, or the persona it should adopt during the conversation.</p>
     * @public
     */
    system?: SystemContentBlock[] | undefined;
    /**
     * <p>Inference parameters to pass to the model. <code>Converse</code> and <code>ConverseStream</code> support a base set of inference parameters. If you need to pass additional parameters that the model supports, use the <code>additionalModelRequestFields</code> request field.</p>
     * @public
     */
    inferenceConfig?: InferenceConfiguration | undefined;
    /**
     * <p>Configuration information for the tools that the model can use when generating a response. </p> <p>For information about models that support tool use, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html#conversation-inference-supported-models-features">Supported models and model features</a>.</p>
     * @public
     */
    toolConfig?: ToolConfiguration | undefined;
    /**
     * <p>Configuration information for a guardrail that you want to use in the request. If you include <code>guardContent</code> blocks in the <code>content</code> field in the <code>messages</code> field, the guardrail operates only on those messages. If you include no <code>guardContent</code> blocks, the guardrail operates on all messages in the request body and in any included prompt resource.</p>
     * @public
     */
    guardrailConfig?: GuardrailConfiguration | undefined;
    /**
     * <p>Additional inference parameters that the model supports, beyond the base set of inference parameters that <code>Converse</code> and <code>ConverseStream</code> support in the <code>inferenceConfig</code> field. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Model parameters</a>.</p>
     * @public
     */
    additionalModelRequestFields?: __DocumentType | undefined;
    /**
     * <p>Contains a map of variables in a prompt from Prompt management to objects containing the values to fill in for them when running model invocation. This field is ignored if you don't specify a prompt resource in the <code>modelId</code> field.</p>
     * @public
     */
    promptVariables?: Record<string, PromptVariableValues> | undefined;
    /**
     * <p>Additional model parameters field paths to return in the response. <code>Converse</code> and <code>ConverseStream</code> return the requested fields as a JSON Pointer object in the <code>additionalModelResponseFields</code> field. The following is example JSON for <code>additionalModelResponseFieldPaths</code>.</p> <p> <code>[ "/stop_sequence" ]</code> </p> <p>For information about the JSON Pointer syntax, see the <a href="https://datatracker.ietf.org/doc/html/rfc6901">Internet Engineering Task Force (IETF)</a> documentation.</p> <p> <code>Converse</code> and <code>ConverseStream</code> reject an empty JSON Pointer or incorrectly structured JSON Pointer with a <code>400</code> error code. if the JSON Pointer is valid, but the requested field is not in the model response, it is ignored by <code>Converse</code>.</p>
     * @public
     */
    additionalModelResponseFieldPaths?: string[] | undefined;
    /**
     * <p>Key-value pairs that you can use to filter invocation logs.</p>
     * @public
     */
    requestMetadata?: Record<string, string> | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
    /**
     * <p>Specifies the processing tier configuration used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTier | undefined;
    /**
     * <p>Output configuration for a model response.</p>
     * @public
     */
    outputConfig?: OutputConfig | undefined;
}
/**
 * <p>Metrics for a call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a>.</p>
 * @public
 */
export interface ConverseMetrics {
    /**
     * <p>The latency of the call to <code>Converse</code>, in milliseconds. </p>
     * @public
     */
    latencyMs: number | undefined;
}
/**
 * <p>The output from a call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a>.</p>
 * @public
 */
export type ConverseOutput = ConverseOutput.MessageMember | ConverseOutput.$UnknownMember;
/**
 * @public
 */
export declare namespace ConverseOutput {
    /**
     * <p>The message that the model generates.</p>
     * @public
     */
    interface MessageMember {
        message: Message;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        message?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        message: (value: Message) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A Top level guardrail trace object. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseTrace.html">ConverseTrace</a>.</p>
 * @public
 */
export interface GuardrailTraceAssessment {
    /**
     * <p>The output from the model.</p>
     * @public
     */
    modelOutput?: string[] | undefined;
    /**
     * <p>The input assessment.</p>
     * @public
     */
    inputAssessment?: Record<string, GuardrailAssessment> | undefined;
    /**
     * <p>the output assessments.</p>
     * @public
     */
    outputAssessments?: Record<string, GuardrailAssessment[]> | undefined;
    /**
     * <p>Provides the reason for the action taken when harmful content is detected.</p>
     * @public
     */
    actionReason?: string | undefined;
}
/**
 * <p>A prompt router trace.</p>
 * @public
 */
export interface PromptRouterTrace {
    /**
     * <p>The ID of the invoked model.</p>
     * @public
     */
    invokedModelId?: string | undefined;
}
/**
 * <p>The trace object in a response from <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse</a>.</p>
 * @public
 */
export interface ConverseTrace {
    /**
     * <p>The guardrail trace object. </p>
     * @public
     */
    guardrail?: GuardrailTraceAssessment | undefined;
    /**
     * <p>The request's prompt router.</p>
     * @public
     */
    promptRouter?: PromptRouterTrace | undefined;
}
/**
 * <p>Cache creation metrics for a specific TTL duration</p>
 * @public
 */
export interface CacheDetail {
    /**
     * <p>TTL duration for these cached tokens</p>
     * @public
     */
    ttl: CacheTTL | undefined;
    /**
     * <p>Number of tokens written to cache with this TTL (cache creation tokens)</p>
     * @public
     */
    inputTokens: number | undefined;
}
/**
 * <p>The tokens used in a message API inference call. </p>
 * @public
 */
export interface TokenUsage {
    /**
     * <p>The number of tokens sent in the request to the model.</p>
     * @public
     */
    inputTokens: number | undefined;
    /**
     * <p>The number of tokens that the model generated for the request.</p>
     * @public
     */
    outputTokens: number | undefined;
    /**
     * <p>The total of input tokens and tokens generated by the model.</p>
     * @public
     */
    totalTokens: number | undefined;
    /**
     * <p>The number of input tokens read from the cache for the request.</p>
     * @public
     */
    cacheReadInputTokens?: number | undefined;
    /**
     * <p>The number of input tokens written to the cache for the request.</p>
     * @public
     */
    cacheWriteInputTokens?: number | undefined;
    /**
     * <p>Detailed breakdown of cache writes by TTL. Empty if no cache creation occurred. Sorted by TTL duration (1h before 5m).</p>
     * @public
     */
    cacheDetails?: CacheDetail[] | undefined;
}
/**
 * @public
 */
export interface ConverseResponse {
    /**
     * <p>The result from the call to <code>Converse</code>.</p>
     * @public
     */
    output: ConverseOutput | undefined;
    /**
     * <p>The reason why the model stopped generating output.</p>
     * @public
     */
    stopReason: StopReason | undefined;
    /**
     * <p>The total number of tokens used in the call to <code>Converse</code>. The total includes the tokens input to the model and the tokens generated by the model.</p>
     * @public
     */
    usage: TokenUsage | undefined;
    /**
     * <p>Metrics for the call to <code>Converse</code>.</p>
     * @public
     */
    metrics: ConverseMetrics | undefined;
    /**
     * <p>Additional fields in the response that are unique to the model. </p>
     * @public
     */
    additionalModelResponseFields?: __DocumentType | undefined;
    /**
     * <p>A trace object that contains information about the Guardrail behavior.</p>
     * @public
     */
    trace?: ConverseTrace | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
    /**
     * <p>Specifies the processing tier configuration used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTier | undefined;
}
/**
 * <p>Configuration information for a guardrail that you use with the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a> action. </p>
 * @public
 */
export interface GuardrailStreamConfiguration {
    /**
     * <p>The identifier for the guardrail.</p>
     * @public
     */
    guardrailIdentifier?: string | undefined;
    /**
     * <p>The version of the guardrail.</p>
     * @public
     */
    guardrailVersion?: string | undefined;
    /**
     * <p>The trace behavior for the guardrail.</p>
     * @public
     */
    trace?: GuardrailTrace | undefined;
    /**
     * <p>The processing mode. </p> <p>The processing mode. For more information, see <i>Configure streaming response behavior</i> in the <i>Amazon Bedrock User Guide</i>. </p>
     * @public
     */
    streamProcessingMode?: GuardrailStreamProcessingMode | undefined;
}
/**
 * @public
 */
export interface ConverseStreamRequest {
    /**
     * <p>Specifies the model or throughput with which to run inference, or the prompt resource to use in inference. The value depends on the resource that you use:</p> <ul> <li> <p>If you use a base model, specify the model ID or its ARN. For a list of model IDs for base models, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns">Amazon Bedrock base model IDs (on-demand throughput)</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use an inference profile, specify the inference profile ID or its ARN. For a list of inference profile IDs, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html">Supported Regions and models for cross-region inference</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a provisioned model, specify the ARN of the Provisioned Throughput. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-use.html">Run inference using a Provisioned Throughput</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a custom model, first purchase Provisioned Throughput for it. Then specify the ARN of the resulting provisioned model. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-use.html">Use a custom model in Amazon Bedrock</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>To include a prompt that was defined in <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management.html">Prompt management</a>, specify the ARN of the prompt version to use.</p> </li> </ul> <p>The Converse API doesn't support <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html">imported models</a>.</p>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>The messages that you want to send to the model.</p>
     * @public
     */
    messages?: Message[] | undefined;
    /**
     * <p>A prompt that provides instructions or context to the model about the task it should perform, or the persona it should adopt during the conversation.</p>
     * @public
     */
    system?: SystemContentBlock[] | undefined;
    /**
     * <p>Inference parameters to pass to the model. <code>Converse</code> and <code>ConverseStream</code> support a base set of inference parameters. If you need to pass additional parameters that the model supports, use the <code>additionalModelRequestFields</code> request field.</p>
     * @public
     */
    inferenceConfig?: InferenceConfiguration | undefined;
    /**
     * <p>Configuration information for the tools that the model can use when generating a response.</p> <p>For information about models that support streaming tool use, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html#conversation-inference-supported-models-features">Supported models and model features</a>.</p>
     * @public
     */
    toolConfig?: ToolConfiguration | undefined;
    /**
     * <p>Configuration information for a guardrail that you want to use in the request. If you include <code>guardContent</code> blocks in the <code>content</code> field in the <code>messages</code> field, the guardrail operates only on those messages. If you include no <code>guardContent</code> blocks, the guardrail operates on all messages in the request body and in any included prompt resource.</p>
     * @public
     */
    guardrailConfig?: GuardrailStreamConfiguration | undefined;
    /**
     * <p>Additional inference parameters that the model supports, beyond the base set of inference parameters that <code>Converse</code> and <code>ConverseStream</code> support in the <code>inferenceConfig</code> field. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Model parameters</a>.</p>
     * @public
     */
    additionalModelRequestFields?: __DocumentType | undefined;
    /**
     * <p>Contains a map of variables in a prompt from Prompt management to objects containing the values to fill in for them when running model invocation. This field is ignored if you don't specify a prompt resource in the <code>modelId</code> field.</p>
     * @public
     */
    promptVariables?: Record<string, PromptVariableValues> | undefined;
    /**
     * <p>Additional model parameters field paths to return in the response. <code>Converse</code> and <code>ConverseStream</code> return the requested fields as a JSON Pointer object in the <code>additionalModelResponseFields</code> field. The following is example JSON for <code>additionalModelResponseFieldPaths</code>.</p> <p> <code>[ "/stop_sequence" ]</code> </p> <p>For information about the JSON Pointer syntax, see the <a href="https://datatracker.ietf.org/doc/html/rfc6901">Internet Engineering Task Force (IETF)</a> documentation.</p> <p> <code>Converse</code> and <code>ConverseStream</code> reject an empty JSON Pointer or incorrectly structured JSON Pointer with a <code>400</code> error code. if the JSON Pointer is valid, but the requested field is not in the model response, it is ignored by <code>Converse</code>.</p>
     * @public
     */
    additionalModelResponseFieldPaths?: string[] | undefined;
    /**
     * <p>Key-value pairs that you can use to filter invocation logs.</p>
     * @public
     */
    requestMetadata?: Record<string, string> | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
    /**
     * <p>Specifies the processing tier configuration used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTier | undefined;
    /**
     * <p>Output configuration for a model response.</p>
     * @public
     */
    outputConfig?: OutputConfig | undefined;
}
/**
 * <p>Contains incremental updates to the source content text during streaming responses, allowing clients to build up the cited content progressively.</p>
 * @public
 */
export interface CitationSourceContentDelta {
    /**
     * <p>An incremental update to the text content from the source document that is being cited.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * <p>Contains incremental updates to citation information during streaming responses. This allows clients to build up citation data progressively as the response is generated.</p>
 * @public
 */
export interface CitationsDelta {
    /**
     * <p>The title or identifier of the source document being cited.</p>
     * @public
     */
    title?: string | undefined;
    /**
     * <p>The source from the original search result that provided the cited content.</p>
     * @public
     */
    source?: string | undefined;
    /**
     * <p>The specific content from the source document that was referenced or cited in the generated response.</p>
     * @public
     */
    sourceContent?: CitationSourceContentDelta[] | undefined;
    /**
     * <p>Specifies the precise location within a source document where cited content can be found. This can include character-level positions, page numbers, or document chunks depending on the document type and indexing method.</p>
     * @public
     */
    location?: CitationLocation | undefined;
}
/**
 * <p>A streaming delta event that contains incremental image data during streaming responses.</p>
 * @public
 */
export interface ImageBlockDelta {
    /**
     * <p>The incremental image source data for this delta event.</p>
     * @public
     */
    source?: ImageSource | undefined;
    /**
     * <p>Error information if this image delta could not be processed.</p>
     * @public
     */
    error?: ErrorBlock | undefined;
}
/**
 * <p>Contains content regarding the reasoning that is carried out by the model with respect to the content in the content block. Reasoning refers to a Chain of Thought (CoT) that the model generates to enhance the accuracy of its final response.</p>
 * @public
 */
export type ReasoningContentBlockDelta = ReasoningContentBlockDelta.RedactedContentMember | ReasoningContentBlockDelta.SignatureMember | ReasoningContentBlockDelta.TextMember | ReasoningContentBlockDelta.$UnknownMember;
/**
 * @public
 */
export declare namespace ReasoningContentBlockDelta {
    /**
     * <p>The reasoning that the model used to return the output.</p>
     * @public
     */
    interface TextMember {
        text: string;
        redactedContent?: never;
        signature?: never;
        $unknown?: never;
    }
    /**
     * <p>The content in the reasoning that was encrypted by the model provider for safety reasons. The encryption doesn't affect the quality of responses.</p>
     * @public
     */
    interface RedactedContentMember {
        text?: never;
        redactedContent: Uint8Array;
        signature?: never;
        $unknown?: never;
    }
    /**
     * <p>A token that verifies that the reasoning text was generated by the model. If you pass a reasoning block back to the API in a multi-turn conversation, include the text and its signature unmodified.</p>
     * @public
     */
    interface SignatureMember {
        text?: never;
        redactedContent?: never;
        signature: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        redactedContent?: never;
        signature?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        redactedContent: (value: Uint8Array) => T;
        signature: (value: string) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Contains incremental updates to tool results information during streaming responses. This allows clients to build up tool results data progressively as the response is generated.</p>
 * @public
 */
export type ToolResultBlockDelta = ToolResultBlockDelta.JsonMember | ToolResultBlockDelta.TextMember | ToolResultBlockDelta.$UnknownMember;
/**
 * @public
 */
export declare namespace ToolResultBlockDelta {
    /**
     * <p>The reasoning the model used to return the output.</p>
     * @public
     */
    interface TextMember {
        text: string;
        json?: never;
        $unknown?: never;
    }
    /**
     * <p>The JSON schema for the tool result content block. see <a href="https://json-schema.org/understanding-json-schema/reference">JSON Schema Reference</a>.</p>
     * @public
     */
    interface JsonMember {
        text?: never;
        json: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        json?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        json: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The delta for a tool use block.</p>
 * @public
 */
export interface ToolUseBlockDelta {
    /**
     * <p>The input for a requested tool.</p>
     * @public
     */
    input: string | undefined;
}
/**
 * <p>A block of content in a streaming response.</p>
 * @public
 */
export type ContentBlockDelta = ContentBlockDelta.CitationMember | ContentBlockDelta.ImageMember | ContentBlockDelta.ReasoningContentMember | ContentBlockDelta.TextMember | ContentBlockDelta.ToolResultMember | ContentBlockDelta.ToolUseMember | ContentBlockDelta.$UnknownMember;
/**
 * @public
 */
export declare namespace ContentBlockDelta {
    /**
     * <p>The content text.</p>
     * @public
     */
    interface TextMember {
        text: string;
        toolUse?: never;
        toolResult?: never;
        reasoningContent?: never;
        citation?: never;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>Information about a tool that the model is requesting to use.</p>
     * @public
     */
    interface ToolUseMember {
        text?: never;
        toolUse: ToolUseBlockDelta;
        toolResult?: never;
        reasoningContent?: never;
        citation?: never;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>An incremental update that contains the results from a tool call.</p>
     * @public
     */
    interface ToolResultMember {
        text?: never;
        toolUse?: never;
        toolResult: ToolResultBlockDelta[];
        reasoningContent?: never;
        citation?: never;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains content regarding the reasoning that is carried out by the model. Reasoning refers to a Chain of Thought (CoT) that the model generates to enhance the accuracy of its final response.</p>
     * @public
     */
    interface ReasoningContentMember {
        text?: never;
        toolUse?: never;
        toolResult?: never;
        reasoningContent: ReasoningContentBlockDelta;
        citation?: never;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>Incremental citation information that is streamed as part of the response generation process.</p>
     * @public
     */
    interface CitationMember {
        text?: never;
        toolUse?: never;
        toolResult?: never;
        reasoningContent?: never;
        citation: CitationsDelta;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>A streaming delta event containing incremental image data.</p>
     * @public
     */
    interface ImageMember {
        text?: never;
        toolUse?: never;
        toolResult?: never;
        reasoningContent?: never;
        citation?: never;
        image: ImageBlockDelta;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        toolUse?: never;
        toolResult?: never;
        reasoningContent?: never;
        citation?: never;
        image?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        text: (value: string) => T;
        toolUse: (value: ToolUseBlockDelta) => T;
        toolResult: (value: ToolResultBlockDelta[]) => T;
        reasoningContent: (value: ReasoningContentBlockDelta) => T;
        citation: (value: CitationsDelta) => T;
        image: (value: ImageBlockDelta) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The content block delta event.</p>
 * @public
 */
export interface ContentBlockDeltaEvent {
    /**
     * <p>The delta for a content block delta event.</p>
     * @public
     */
    delta: ContentBlockDelta | undefined;
    /**
     * <p>The block index for a content block delta event. </p>
     * @public
     */
    contentBlockIndex: number | undefined;
}
/**
 * <p>The initial event in a streaming image block that indicates the start of image content.</p>
 * @public
 */
export interface ImageBlockStart {
    /**
     * <p>The format of the image data that will be streamed in subsequent delta events.</p>
     * @public
     */
    format: ImageFormat | undefined;
}
/**
 * <p>The start of a tool result block. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface ToolResultBlockStart {
    /**
     * <p>The ID of the tool that was used to generate this tool result block.</p>
     * @public
     */
    toolUseId: string | undefined;
    /**
     * <p>The type for the tool that was used to generate this tool result block.</p>
     * @public
     */
    type?: string | undefined;
    /**
     * <p>The status of the tool result block.</p>
     * @public
     */
    status?: ToolResultStatus | undefined;
}
/**
 * <p>The start of a tool use block. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Call a tool with the Converse API</a> in the Amazon Bedrock User Guide.</p>
 * @public
 */
export interface ToolUseBlockStart {
    /**
     * <p>The ID for the tool request.</p>
     * @public
     */
    toolUseId: string | undefined;
    /**
     * <p>The name of the tool that the model is requesting to use.</p>
     * @public
     */
    name: string | undefined;
    /**
     * <p>The type for the tool request.</p>
     * @public
     */
    type?: ToolUseType | undefined;
}
/**
 * <p>Content block start information.</p>
 * @public
 */
export type ContentBlockStart = ContentBlockStart.ImageMember | ContentBlockStart.ToolResultMember | ContentBlockStart.ToolUseMember | ContentBlockStart.$UnknownMember;
/**
 * @public
 */
export declare namespace ContentBlockStart {
    /**
     * <p>Information about a tool that the model is requesting to use.</p>
     * @public
     */
    interface ToolUseMember {
        toolUse: ToolUseBlockStart;
        toolResult?: never;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>The </p>
     * @public
     */
    interface ToolResultMember {
        toolUse?: never;
        toolResult: ToolResultBlockStart;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>The initial event indicating the start of a streaming image block.</p>
     * @public
     */
    interface ImageMember {
        toolUse?: never;
        toolResult?: never;
        image: ImageBlockStart;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        toolUse?: never;
        toolResult?: never;
        image?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        toolUse: (value: ToolUseBlockStart) => T;
        toolResult: (value: ToolResultBlockStart) => T;
        image: (value: ImageBlockStart) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Content block start event.</p>
 * @public
 */
export interface ContentBlockStartEvent {
    /**
     * <p>Start information about a content block start event. </p>
     * @public
     */
    start: ContentBlockStart | undefined;
    /**
     * <p>The index for a content block start event.</p>
     * @public
     */
    contentBlockIndex: number | undefined;
}
/**
 * <p>A content block stop event.</p>
 * @public
 */
export interface ContentBlockStopEvent {
    /**
     * <p>The index for a content block.</p>
     * @public
     */
    contentBlockIndex: number | undefined;
}
/**
 * <p>The start of a message.</p>
 * @public
 */
export interface MessageStartEvent {
    /**
     * <p>The role for the message.</p>
     * @public
     */
    role: ConversationRole | undefined;
}
/**
 * <p>The stop event for a message.</p>
 * @public
 */
export interface MessageStopEvent {
    /**
     * <p>The reason why the model stopped generating output.</p>
     * @public
     */
    stopReason: StopReason | undefined;
    /**
     * <p>The additional model response fields.</p>
     * @public
     */
    additionalModelResponseFields?: __DocumentType | undefined;
}
/**
 * <p>Metrics for the stream.</p>
 * @public
 */
export interface ConverseStreamMetrics {
    /**
     * <p>The latency for the streaming request, in milliseconds.</p>
     * @public
     */
    latencyMs: number | undefined;
}
/**
 * <p>The trace object in a response from <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a>.</p>
 * @public
 */
export interface ConverseStreamTrace {
    /**
     * <p>The guardrail trace object. </p>
     * @public
     */
    guardrail?: GuardrailTraceAssessment | undefined;
    /**
     * <p>The request's prompt router.</p>
     * @public
     */
    promptRouter?: PromptRouterTrace | undefined;
}
/**
 * <p>A conversation stream metadata event.</p>
 * @public
 */
export interface ConverseStreamMetadataEvent {
    /**
     * <p>Usage information for the conversation stream event.</p>
     * @public
     */
    usage: TokenUsage | undefined;
    /**
     * <p>The metrics for the conversation stream metadata event.</p>
     * @public
     */
    metrics: ConverseStreamMetrics | undefined;
    /**
     * <p>The trace object in the response from <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html">ConverseStream</a> that contains information about the guardrail behavior.</p>
     * @public
     */
    trace?: ConverseStreamTrace | undefined;
    /**
     * <p>Model performance configuration metadata for the conversation stream event.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
    /**
     * <p>Specifies the processing tier configuration used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTier | undefined;
}
/**
 * <p>The messages output stream</p>
 * @public
 */
export type ConverseStreamOutput = ConverseStreamOutput.ContentBlockDeltaMember | ConverseStreamOutput.ContentBlockStartMember | ConverseStreamOutput.ContentBlockStopMember | ConverseStreamOutput.InternalServerExceptionMember | ConverseStreamOutput.MessageStartMember | ConverseStreamOutput.MessageStopMember | ConverseStreamOutput.MetadataMember | ConverseStreamOutput.ModelStreamErrorExceptionMember | ConverseStreamOutput.ServiceUnavailableExceptionMember | ConverseStreamOutput.ThrottlingExceptionMember | ConverseStreamOutput.ValidationExceptionMember | ConverseStreamOutput.$UnknownMember;
/**
 * @public
 */
export declare namespace ConverseStreamOutput {
    /**
     * <p>Message start information.</p>
     * @public
     */
    interface MessageStartMember {
        messageStart: MessageStartEvent;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Start information for a content block.</p>
     * @public
     */
    interface ContentBlockStartMember {
        messageStart?: never;
        contentBlockStart: ContentBlockStartEvent;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The messages output content block delta.</p>
     * @public
     */
    interface ContentBlockDeltaMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta: ContentBlockDeltaEvent;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Stop information for a content block.</p>
     * @public
     */
    interface ContentBlockStopMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop: ContentBlockStopEvent;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Message stop information.</p>
     * @public
     */
    interface MessageStopMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop: MessageStopEvent;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Metadata for the converse output stream.</p>
     * @public
     */
    interface MetadataMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata: ConverseStreamMetadataEvent;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException: InternalServerException;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>A streaming error occurred. Retry your request.</p>
     * @public
     */
    interface ModelStreamErrorExceptionMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException: ModelStreamErrorException;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The input fails to satisfy the constraints specified by <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-validation-error">ValidationError</a> in the Amazon Bedrock User Guide.</p>
     * @public
     */
    interface ValidationExceptionMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException: ValidationException;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Your request was denied due to exceeding the account quotas for <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-throttling-exception">ThrottlingException</a> in the Amazon Bedrock User Guide.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException: ThrottlingException;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The service isn't currently available. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-service-unavailable">ServiceUnavailable</a> in the Amazon Bedrock User Guide</p>
     * @public
     */
    interface ServiceUnavailableExceptionMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException: ServiceUnavailableException;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        messageStart?: never;
        contentBlockStart?: never;
        contentBlockDelta?: never;
        contentBlockStop?: never;
        messageStop?: never;
        metadata?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        serviceUnavailableException?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        messageStart: (value: MessageStartEvent) => T;
        contentBlockStart: (value: ContentBlockStartEvent) => T;
        contentBlockDelta: (value: ContentBlockDeltaEvent) => T;
        contentBlockStop: (value: ContentBlockStopEvent) => T;
        messageStop: (value: MessageStopEvent) => T;
        metadata: (value: ConverseStreamMetadataEvent) => T;
        internalServerException: (value: InternalServerException) => T;
        modelStreamErrorException: (value: ModelStreamErrorException) => T;
        validationException: (value: ValidationException) => T;
        throttlingException: (value: ThrottlingException) => T;
        serviceUnavailableException: (value: ServiceUnavailableException) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface ConverseStreamResponse {
    /**
     * <p>The output stream that the model generated.</p>
     * @public
     */
    stream?: AsyncIterable<ConverseStreamOutput> | undefined;
}
/**
 * @public
 */
export interface InvokeModelRequest {
    /**
     * <p>The prompt and inference parameters in the format specified in the <code>contentType</code> in the header. You must provide the body in JSON format. To see the format and content of the request and response bodies for different models, refer to <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters</a>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-methods-run.html">Run inference</a> in the Bedrock User Guide.</p>
     * @public
     */
    body?: Uint8Array | undefined;
    /**
     * <p>The MIME type of the input data in the request. You must specify <code>application/json</code>.</p>
     * @public
     */
    contentType?: string | undefined;
    /**
     * <p>The desired MIME type of the inference body in the response. The default value is <code>application/json</code>.</p>
     * @public
     */
    accept?: string | undefined;
    /**
     * <p>The unique identifier of the model to invoke to run inference.</p> <p>The <code>modelId</code> to provide depends on the type of model or throughput that you use:</p> <ul> <li> <p>If you use a base model, specify the model ID or its ARN. For a list of model IDs for base models, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns">Amazon Bedrock base model IDs (on-demand throughput)</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use an inference profile, specify the inference profile ID or its ARN. For a list of inference profile IDs, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html">Supported Regions and models for cross-region inference</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a provisioned model, specify the ARN of the Provisioned Throughput. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-use.html">Run inference using a Provisioned Throughput</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a custom model, specify the ARN of the custom model deployment (for on-demand inference) or the ARN of your provisioned model (for Provisioned Throughput). For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-use.html">Use a custom model in Amazon Bedrock</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use an <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html">imported model</a>, specify the ARN of the imported model. You can get the model ARN from a successful call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_CreateModelImportJob.html">CreateModelImportJob</a> or from the Imported models page in the Amazon Bedrock console.</p> </li> </ul>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>Specifies whether to enable or disable the Bedrock trace. If enabled, you can see the full Bedrock trace.</p>
     * @public
     */
    trace?: Trace | undefined;
    /**
     * <p>The unique identifier of the guardrail that you want to use. If you don't provide a value, no guardrail is applied to the invocation.</p> <p>An error will be thrown in the following situations.</p> <ul> <li> <p>You don't provide a guardrail identifier but you specify the <code>amazon-bedrock-guardrailConfig</code> field in the request body.</p> </li> <li> <p>You enable the guardrail but the <code>contentType</code> isn't <code>application/json</code>.</p> </li> <li> <p>You provide a guardrail identifier, but <code>guardrailVersion</code> isn't specified.</p> </li> </ul>
     * @public
     */
    guardrailIdentifier?: string | undefined;
    /**
     * <p>The version number for the guardrail. The value can also be <code>DRAFT</code>.</p>
     * @public
     */
    guardrailVersion?: string | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfigLatency?: PerformanceConfigLatency | undefined;
    /**
     * <p>Specifies the processing tier type used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTierType | undefined;
}
/**
 * @public
 */
export interface InvokeModelResponse {
    /**
     * <p>Inference response from the model in the format specified in the <code>contentType</code> header. To see the format and content of the request and response bodies for different models, refer to <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters</a>.</p>
     * @public
     */
    body: Uint8Array | undefined;
    /**
     * <p>The MIME type of the inference result.</p>
     * @public
     */
    contentType: string | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfigLatency?: PerformanceConfigLatency | undefined;
    /**
     * <p>Specifies the processing tier type used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTierType | undefined;
}
/**
 * <p>Payload content for the bidirectional input. The input is an audio stream.</p>
 * @public
 */
export interface BidirectionalInputPayloadPart {
    /**
     * <p>The audio content for the bidirectional input.</p>
     * @public
     */
    bytes?: Uint8Array | undefined;
}
/**
 * <p>Payload content, the speech chunk, for the bidirectional input of the invocation step.</p>
 * @public
 */
export type InvokeModelWithBidirectionalStreamInput = InvokeModelWithBidirectionalStreamInput.ChunkMember | InvokeModelWithBidirectionalStreamInput.$UnknownMember;
/**
 * @public
 */
export declare namespace InvokeModelWithBidirectionalStreamInput {
    /**
     * <p>The audio chunk that is used as input for the invocation step.</p>
     * @public
     */
    interface ChunkMember {
        chunk: BidirectionalInputPayloadPart;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        chunk?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        chunk: (value: BidirectionalInputPayloadPart) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface InvokeModelWithBidirectionalStreamRequest {
    /**
     * <p>The model ID or ARN of the model ID to use. Currently, only <code>amazon.nova-sonic-v1:0</code> is supported.</p>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>The prompt and inference parameters in the format specified in the <code>BidirectionalInputPayloadPart</code> in the header. You must provide the body in JSON format. To see the format and content of the request and response bodies for different models, refer to <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters</a>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-methods-run.html">Run inference</a> in the Bedrock User Guide.</p>
     * @public
     */
    body: AsyncIterable<InvokeModelWithBidirectionalStreamInput> | undefined;
}
/**
 * <p>Output from the bidirectional stream. The output is speech and a text transcription.</p>
 * @public
 */
export interface BidirectionalOutputPayloadPart {
    /**
     * <p>The speech output of the bidirectional stream.</p>
     * @public
     */
    bytes?: Uint8Array | undefined;
}
/**
 * <p>Output from the bidirectional stream that was used for model invocation.</p>
 * @public
 */
export type InvokeModelWithBidirectionalStreamOutput = InvokeModelWithBidirectionalStreamOutput.ChunkMember | InvokeModelWithBidirectionalStreamOutput.InternalServerExceptionMember | InvokeModelWithBidirectionalStreamOutput.ModelStreamErrorExceptionMember | InvokeModelWithBidirectionalStreamOutput.ModelTimeoutExceptionMember | InvokeModelWithBidirectionalStreamOutput.ServiceUnavailableExceptionMember | InvokeModelWithBidirectionalStreamOutput.ThrottlingExceptionMember | InvokeModelWithBidirectionalStreamOutput.ValidationExceptionMember | InvokeModelWithBidirectionalStreamOutput.$UnknownMember;
/**
 * @public
 */
export declare namespace InvokeModelWithBidirectionalStreamOutput {
    /**
     * <p>The speech chunk that was provided as output from the invocation step.</p>
     * @public
     */
    interface ChunkMember {
        chunk: BidirectionalOutputPayloadPart;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request encountered an unknown internal error.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        chunk?: never;
        internalServerException: InternalServerException;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request encountered an error with the model stream.</p>
     * @public
     */
    interface ModelStreamErrorExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException: ModelStreamErrorException;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The input fails to satisfy the constraints specified by an Amazon Web Services service.</p>
     * @public
     */
    interface ValidationExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException: ValidationException;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request was denied due to request throttling.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException: ThrottlingException;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The connection was closed because a request was not received within the timeout period.</p>
     * @public
     */
    interface ModelTimeoutExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException: ModelTimeoutException;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request has failed due to a temporary failure of the server.</p>
     * @public
     */
    interface ServiceUnavailableExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException: ServiceUnavailableException;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        chunk: (value: BidirectionalOutputPayloadPart) => T;
        internalServerException: (value: InternalServerException) => T;
        modelStreamErrorException: (value: ModelStreamErrorException) => T;
        validationException: (value: ValidationException) => T;
        throttlingException: (value: ThrottlingException) => T;
        modelTimeoutException: (value: ModelTimeoutException) => T;
        serviceUnavailableException: (value: ServiceUnavailableException) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface InvokeModelWithBidirectionalStreamResponse {
    /**
     * <p>Streaming response from the model in the format specified by the <code>BidirectionalOutputPayloadPart</code> header.</p>
     * @public
     */
    body: AsyncIterable<InvokeModelWithBidirectionalStreamOutput> | undefined;
}
/**
 * @public
 */
export interface InvokeModelWithResponseStreamRequest {
    /**
     * <p>The prompt and inference parameters in the format specified in the <code>contentType</code> in the header. You must provide the body in JSON format. To see the format and content of the request and response bodies for different models, refer to <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters</a>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/api-methods-run.html">Run inference</a> in the Bedrock User Guide.</p>
     * @public
     */
    body?: Uint8Array | undefined;
    /**
     * <p>The MIME type of the input data in the request. You must specify <code>application/json</code>.</p>
     * @public
     */
    contentType?: string | undefined;
    /**
     * <p>The desired MIME type of the inference body in the response. The default value is <code>application/json</code>.</p>
     * @public
     */
    accept?: string | undefined;
    /**
     * <p>The unique identifier of the model to invoke to run inference.</p> <p>The <code>modelId</code> to provide depends on the type of model or throughput that you use:</p> <ul> <li> <p>If you use a base model, specify the model ID or its ARN. For a list of model IDs for base models, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns">Amazon Bedrock base model IDs (on-demand throughput)</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use an inference profile, specify the inference profile ID or its ARN. For a list of inference profile IDs, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html">Supported Regions and models for cross-region inference</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a provisioned model, specify the ARN of the Provisioned Throughput. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-use.html">Run inference using a Provisioned Throughput</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use a custom model, specify the ARN of the custom model deployment (for on-demand inference) or the ARN of your provisioned model (for Provisioned Throughput). For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-use.html">Use a custom model in Amazon Bedrock</a> in the Amazon Bedrock User Guide.</p> </li> <li> <p>If you use an <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-import-model.html">imported model</a>, specify the ARN of the imported model. You can get the model ARN from a successful call to <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_CreateModelImportJob.html">CreateModelImportJob</a> or from the Imported models page in the Amazon Bedrock console.</p> </li> </ul>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>Specifies whether to enable or disable the Bedrock trace. If enabled, you can see the full Bedrock trace.</p>
     * @public
     */
    trace?: Trace | undefined;
    /**
     * <p>The unique identifier of the guardrail that you want to use. If you don't provide a value, no guardrail is applied to the invocation.</p> <p>An error is thrown in the following situations.</p> <ul> <li> <p>You don't provide a guardrail identifier but you specify the <code>amazon-bedrock-guardrailConfig</code> field in the request body.</p> </li> <li> <p>You enable the guardrail but the <code>contentType</code> isn't <code>application/json</code>.</p> </li> <li> <p>You provide a guardrail identifier, but <code>guardrailVersion</code> isn't specified.</p> </li> </ul>
     * @public
     */
    guardrailIdentifier?: string | undefined;
    /**
     * <p>The version number for the guardrail. The value can also be <code>DRAFT</code>.</p>
     * @public
     */
    guardrailVersion?: string | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfigLatency?: PerformanceConfigLatency | undefined;
    /**
     * <p>Specifies the processing tier type used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTierType | undefined;
}
/**
 * <p>Payload content included in the response.</p>
 * @public
 */
export interface PayloadPart {
    /**
     * <p>Base64-encoded bytes of payload data.</p>
     * @public
     */
    bytes?: Uint8Array | undefined;
}
/**
 * <p>Definition of content in the response stream.</p>
 * @public
 */
export type ResponseStream = ResponseStream.ChunkMember | ResponseStream.InternalServerExceptionMember | ResponseStream.ModelStreamErrorExceptionMember | ResponseStream.ModelTimeoutExceptionMember | ResponseStream.ServiceUnavailableExceptionMember | ResponseStream.ThrottlingExceptionMember | ResponseStream.ValidationExceptionMember | ResponseStream.$UnknownMember;
/**
 * @public
 */
export declare namespace ResponseStream {
    /**
     * <p>Content included in the response.</p>
     * @public
     */
    interface ChunkMember {
        chunk: PayloadPart;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        chunk?: never;
        internalServerException: InternalServerException;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>An error occurred while streaming the response. Retry your request.</p>
     * @public
     */
    interface ModelStreamErrorExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException: ModelStreamErrorException;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Input validation failed. Check your request parameters and retry the request.</p>
     * @public
     */
    interface ValidationExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException: ValidationException;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>Your request was throttled because of service-wide limitations. Resubmit your request later or in a different region. You can also purchase <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html">Provisioned Throughput</a> to increase the rate or number of tokens you can process.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException: ThrottlingException;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request took too long to process. Processing time exceeded the model timeout length.</p>
     * @public
     */
    interface ModelTimeoutExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException: ModelTimeoutException;
        serviceUnavailableException?: never;
        $unknown?: never;
    }
    /**
     * <p>The service isn't available. Try again later.</p>
     * @public
     */
    interface ServiceUnavailableExceptionMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException: ServiceUnavailableException;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        chunk?: never;
        internalServerException?: never;
        modelStreamErrorException?: never;
        validationException?: never;
        throttlingException?: never;
        modelTimeoutException?: never;
        serviceUnavailableException?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        chunk: (value: PayloadPart) => T;
        internalServerException: (value: InternalServerException) => T;
        modelStreamErrorException: (value: ModelStreamErrorException) => T;
        validationException: (value: ValidationException) => T;
        throttlingException: (value: ThrottlingException) => T;
        modelTimeoutException: (value: ModelTimeoutException) => T;
        serviceUnavailableException: (value: ServiceUnavailableException) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface InvokeModelWithResponseStreamResponse {
    /**
     * <p>Inference response from the model in the format specified by the <code>contentType</code> header. To see the format and content of this field for different models, refer to <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters</a>.</p>
     * @public
     */
    body: AsyncIterable<ResponseStream> | undefined;
    /**
     * <p>The MIME type of the inference result.</p>
     * @public
     */
    contentType: string | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    performanceConfigLatency?: PerformanceConfigLatency | undefined;
    /**
     * <p>Specifies the processing tier type used for serving the request.</p>
     * @public
     */
    serviceTier?: ServiceTierType | undefined;
}
/**
 * <p>The inputs from a <code>Converse</code> API request for token counting.</p> <p>This structure mirrors the input format for the <code>Converse</code> operation, allowing you to count tokens for conversation-based inference requests.</p>
 * @public
 */
export interface ConverseTokensRequest {
    /**
     * <p>An array of messages to count tokens for.</p>
     * @public
     */
    messages?: Message[] | undefined;
    /**
     * <p>The system content blocks to count tokens for. System content provides instructions or context to the model about how it should behave or respond. The token count will include any system content provided.</p>
     * @public
     */
    system?: SystemContentBlock[] | undefined;
    /**
     * <p>The toolConfig of Converse input request to count tokens for. Configuration information for the tools that the model can use when generating a response.</p>
     * @public
     */
    toolConfig?: ToolConfiguration | undefined;
    /**
     * <p>The additionalModelRequestFields of Converse input request to count tokens for. Use this field when you want to pass additional parameters that the model supports.</p>
     * @public
     */
    additionalModelRequestFields?: __DocumentType | undefined;
}
/**
 * <p>The body of an <code>InvokeModel</code> API request for token counting. This structure mirrors the input format for the <code>InvokeModel</code> operation, allowing you to count tokens for raw text inference requests.</p>
 * @public
 */
export interface InvokeModelTokensRequest {
    /**
     * <p>The request body to count tokens for, formatted according to the model's expected input format. To learn about the input format for different models, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Model inference parameters and responses</a>.</p>
     * @public
     */
    body: Uint8Array | undefined;
}
/**
 * <p>The input value for token counting. The value should be either an <code>InvokeModel</code> or <code>Converse</code> request body. </p>
 * @public
 */
export type CountTokensInput = CountTokensInput.ConverseMember | CountTokensInput.InvokeModelMember | CountTokensInput.$UnknownMember;
/**
 * @public
 */
export declare namespace CountTokensInput {
    /**
     * <p>An <code>InvokeModel</code> request for which to count tokens. Use this field when you want to count tokens for a raw text input that would be sent to the <code>InvokeModel</code> operation.</p>
     * @public
     */
    interface InvokeModelMember {
        invokeModel: InvokeModelTokensRequest;
        converse?: never;
        $unknown?: never;
    }
    /**
     * <p>A <code>Converse</code> request for which to count tokens. Use this field when you want to count tokens for a conversation-based input that would be sent to the <code>Converse</code> operation.</p>
     * @public
     */
    interface ConverseMember {
        invokeModel?: never;
        converse: ConverseTokensRequest;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        invokeModel?: never;
        converse?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        invokeModel: (value: InvokeModelTokensRequest) => T;
        converse: (value: ConverseTokensRequest) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * @public
 */
export interface CountTokensRequest {
    /**
     * <p>The unique identifier or ARN of the foundation model to use for token counting. Each model processes tokens differently, so the token count is specific to the model you specify.</p>
     * @public
     */
    modelId: string | undefined;
    /**
     * <p>The input for which to count tokens. The structure of this parameter depends on whether you're counting tokens for an <code>InvokeModel</code> or <code>Converse</code> request:</p> <ul> <li> <p>For <code>InvokeModel</code> requests, provide the request body in the <code>invokeModel</code> field</p> </li> <li> <p>For <code>Converse</code> requests, provide the messages and system content in the <code>converse</code> field</p> </li> </ul> <p>The input format must be compatible with the model specified in the <code>modelId</code> parameter.</p>
     * @public
     */
    input: CountTokensInput | undefined;
}
/**
 * @public
 */
export interface CountTokensResponse {
    /**
     * <p>The number of tokens in the provided input according to the specified model's tokenization rules. This count represents the number of input tokens that would be processed if the same input were sent to the model in an inference request. Use this value to estimate costs and ensure your inputs stay within model token limits.</p>
     * @public
     */
    inputTokens: number | undefined;
}
