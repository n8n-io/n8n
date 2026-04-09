import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../BedrockRuntimeClient";
import type { ApplyGuardrailRequest, ApplyGuardrailResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ApplyGuardrailCommand}.
 */
export interface ApplyGuardrailCommandInput extends ApplyGuardrailRequest {
}
/**
 * @public
 *
 * The output of {@link ApplyGuardrailCommand}.
 */
export interface ApplyGuardrailCommandOutput extends ApplyGuardrailResponse, __MetadataBearer {
}
declare const ApplyGuardrailCommand_base: {
    new (input: ApplyGuardrailCommandInput): import("@smithy/smithy-client").CommandImpl<ApplyGuardrailCommandInput, ApplyGuardrailCommandOutput, BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ApplyGuardrailCommandInput): import("@smithy/smithy-client").CommandImpl<ApplyGuardrailCommandInput, ApplyGuardrailCommandOutput, BedrockRuntimeClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>The action to apply a guardrail.</p> <p>For troubleshooting some of the common errors you might encounter when using the <code>ApplyGuardrail</code> API, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html">Troubleshooting Amazon Bedrock API Error Codes</a> in the Amazon Bedrock User Guide</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { BedrockRuntimeClient, ApplyGuardrailCommand } from "@aws-sdk/client-bedrock-runtime"; // ES Modules import
 * // const { BedrockRuntimeClient, ApplyGuardrailCommand } = require("@aws-sdk/client-bedrock-runtime"); // CommonJS import
 * // import type { BedrockRuntimeClientConfig } from "@aws-sdk/client-bedrock-runtime";
 * const config = {}; // type is BedrockRuntimeClientConfig
 * const client = new BedrockRuntimeClient(config);
 * const input = { // ApplyGuardrailRequest
 *   guardrailIdentifier: "STRING_VALUE", // required
 *   guardrailVersion: "STRING_VALUE", // required
 *   source: "INPUT" || "OUTPUT", // required
 *   content: [ // GuardrailContentBlockList // required
 *     { // GuardrailContentBlock Union: only one key present
 *       text: { // GuardrailTextBlock
 *         text: "STRING_VALUE", // required
 *         qualifiers: [ // GuardrailContentQualifierList
 *           "grounding_source" || "query" || "guard_content",
 *         ],
 *       },
 *       image: { // GuardrailImageBlock
 *         format: "png" || "jpeg", // required
 *         source: { // GuardrailImageSource Union: only one key present
 *           bytes: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *         },
 *       },
 *     },
 *   ],
 *   outputScope: "INTERVENTIONS" || "FULL",
 * };
 * const command = new ApplyGuardrailCommand(input);
 * const response = await client.send(command);
 * // { // ApplyGuardrailResponse
 * //   usage: { // GuardrailUsage
 * //     topicPolicyUnits: Number("int"), // required
 * //     contentPolicyUnits: Number("int"), // required
 * //     wordPolicyUnits: Number("int"), // required
 * //     sensitiveInformationPolicyUnits: Number("int"), // required
 * //     sensitiveInformationPolicyFreeUnits: Number("int"), // required
 * //     contextualGroundingPolicyUnits: Number("int"), // required
 * //     contentPolicyImageUnits: Number("int"),
 * //     automatedReasoningPolicyUnits: Number("int"),
 * //     automatedReasoningPolicies: Number("int"),
 * //   },
 * //   action: "NONE" || "GUARDRAIL_INTERVENED", // required
 * //   actionReason: "STRING_VALUE",
 * //   outputs: [ // GuardrailOutputContentList // required
 * //     { // GuardrailOutputContent
 * //       text: "STRING_VALUE",
 * //     },
 * //   ],
 * //   assessments: [ // GuardrailAssessmentList // required
 * //     { // GuardrailAssessment
 * //       topicPolicy: { // GuardrailTopicPolicyAssessment
 * //         topics: [ // GuardrailTopicList // required
 * //           { // GuardrailTopic
 * //             name: "STRING_VALUE", // required
 * //             type: "DENY", // required
 * //             action: "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //       },
 * //       contentPolicy: { // GuardrailContentPolicyAssessment
 * //         filters: [ // GuardrailContentFilterList // required
 * //           { // GuardrailContentFilter
 * //             type: "INSULTS" || "HATE" || "SEXUAL" || "VIOLENCE" || "MISCONDUCT" || "PROMPT_ATTACK", // required
 * //             confidence: "NONE" || "LOW" || "MEDIUM" || "HIGH", // required
 * //             filterStrength: "NONE" || "LOW" || "MEDIUM" || "HIGH",
 * //             action: "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //       },
 * //       wordPolicy: { // GuardrailWordPolicyAssessment
 * //         customWords: [ // GuardrailCustomWordList // required
 * //           { // GuardrailCustomWord
 * //             match: "STRING_VALUE", // required
 * //             action: "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //         managedWordLists: [ // GuardrailManagedWordList // required
 * //           { // GuardrailManagedWord
 * //             match: "STRING_VALUE", // required
 * //             type: "PROFANITY", // required
 * //             action: "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //       },
 * //       sensitiveInformationPolicy: { // GuardrailSensitiveInformationPolicyAssessment
 * //         piiEntities: [ // GuardrailPiiEntityFilterList // required
 * //           { // GuardrailPiiEntityFilter
 * //             match: "STRING_VALUE", // required
 * //             type: "ADDRESS" || "AGE" || "AWS_ACCESS_KEY" || "AWS_SECRET_KEY" || "CA_HEALTH_NUMBER" || "CA_SOCIAL_INSURANCE_NUMBER" || "CREDIT_DEBIT_CARD_CVV" || "CREDIT_DEBIT_CARD_EXPIRY" || "CREDIT_DEBIT_CARD_NUMBER" || "DRIVER_ID" || "EMAIL" || "INTERNATIONAL_BANK_ACCOUNT_NUMBER" || "IP_ADDRESS" || "LICENSE_PLATE" || "MAC_ADDRESS" || "NAME" || "PASSWORD" || "PHONE" || "PIN" || "SWIFT_CODE" || "UK_NATIONAL_HEALTH_SERVICE_NUMBER" || "UK_NATIONAL_INSURANCE_NUMBER" || "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER" || "URL" || "USERNAME" || "US_BANK_ACCOUNT_NUMBER" || "US_BANK_ROUTING_NUMBER" || "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER" || "US_PASSPORT_NUMBER" || "US_SOCIAL_SECURITY_NUMBER" || "VEHICLE_IDENTIFICATION_NUMBER", // required
 * //             action: "ANONYMIZED" || "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //         regexes: [ // GuardrailRegexFilterList // required
 * //           { // GuardrailRegexFilter
 * //             name: "STRING_VALUE",
 * //             match: "STRING_VALUE",
 * //             regex: "STRING_VALUE",
 * //             action: "ANONYMIZED" || "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //       },
 * //       contextualGroundingPolicy: { // GuardrailContextualGroundingPolicyAssessment
 * //         filters: [ // GuardrailContextualGroundingFilters
 * //           { // GuardrailContextualGroundingFilter
 * //             type: "GROUNDING" || "RELEVANCE", // required
 * //             threshold: Number("double"), // required
 * //             score: Number("double"), // required
 * //             action: "BLOCKED" || "NONE", // required
 * //             detected: true || false,
 * //           },
 * //         ],
 * //       },
 * //       automatedReasoningPolicy: { // GuardrailAutomatedReasoningPolicyAssessment
 * //         findings: [ // GuardrailAutomatedReasoningFindingList
 * //           { // GuardrailAutomatedReasoningFinding Union: only one key present
 * //             valid: { // GuardrailAutomatedReasoningValidFinding
 * //               translation: { // GuardrailAutomatedReasoningTranslation
 * //                 premises: [ // GuardrailAutomatedReasoningStatementList
 * //                   { // GuardrailAutomatedReasoningStatement
 * //                     logic: "STRING_VALUE",
 * //                     naturalLanguage: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 claims: [
 * //                   {
 * //                     logic: "STRING_VALUE",
 * //                     naturalLanguage: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 untranslatedPremises: [ // GuardrailAutomatedReasoningInputTextReferenceList
 * //                   { // GuardrailAutomatedReasoningInputTextReference
 * //                     text: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 untranslatedClaims: [
 * //                   {
 * //                     text: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 confidence: Number("double"),
 * //               },
 * //               claimsTrueScenario: { // GuardrailAutomatedReasoningScenario
 * //                 statements: [
 * //                   {
 * //                     logic: "STRING_VALUE",
 * //                     naturalLanguage: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //               },
 * //               supportingRules: [ // GuardrailAutomatedReasoningRuleList
 * //                 { // GuardrailAutomatedReasoningRule
 * //                   identifier: "STRING_VALUE",
 * //                   policyVersionArn: "STRING_VALUE",
 * //                 },
 * //               ],
 * //               logicWarning: { // GuardrailAutomatedReasoningLogicWarning
 * //                 type: "ALWAYS_FALSE" || "ALWAYS_TRUE",
 * //                 premises: [
 * //                   {
 * //                     logic: "STRING_VALUE",
 * //                     naturalLanguage: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 claims: [
 * //                   {
 * //                     logic: "STRING_VALUE",
 * //                     naturalLanguage: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //               },
 * //             },
 * //             invalid: { // GuardrailAutomatedReasoningInvalidFinding
 * //               translation: {
 * //                 premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                 claims: "<GuardrailAutomatedReasoningStatementList>",
 * //                 untranslatedPremises: [
 * //                   {
 * //                     text: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 untranslatedClaims: [
 * //                   {
 * //                     text: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 confidence: Number("double"),
 * //               },
 * //               contradictingRules: [
 * //                 {
 * //                   identifier: "STRING_VALUE",
 * //                   policyVersionArn: "STRING_VALUE",
 * //                 },
 * //               ],
 * //               logicWarning: {
 * //                 type: "ALWAYS_FALSE" || "ALWAYS_TRUE",
 * //                 premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                 claims: "<GuardrailAutomatedReasoningStatementList>",
 * //               },
 * //             },
 * //             satisfiable: { // GuardrailAutomatedReasoningSatisfiableFinding
 * //               translation: {
 * //                 premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                 claims: "<GuardrailAutomatedReasoningStatementList>",
 * //                 untranslatedPremises: [
 * //                   {
 * //                     text: "STRING_VALUE",
 * //                   },
 * //                 ],
 * //                 untranslatedClaims: "<GuardrailAutomatedReasoningInputTextReferenceList>",
 * //                 confidence: Number("double"),
 * //               },
 * //               claimsTrueScenario: {
 * //                 statements: "<GuardrailAutomatedReasoningStatementList>",
 * //               },
 * //               claimsFalseScenario: {
 * //                 statements: "<GuardrailAutomatedReasoningStatementList>",
 * //               },
 * //               logicWarning: {
 * //                 type: "ALWAYS_FALSE" || "ALWAYS_TRUE",
 * //                 premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                 claims: "<GuardrailAutomatedReasoningStatementList>",
 * //               },
 * //             },
 * //             impossible: { // GuardrailAutomatedReasoningImpossibleFinding
 * //               translation: {
 * //                 premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                 claims: "<GuardrailAutomatedReasoningStatementList>",
 * //                 untranslatedPremises: "<GuardrailAutomatedReasoningInputTextReferenceList>",
 * //                 untranslatedClaims: "<GuardrailAutomatedReasoningInputTextReferenceList>",
 * //                 confidence: Number("double"),
 * //               },
 * //               contradictingRules: [
 * //                 {
 * //                   identifier: "STRING_VALUE",
 * //                   policyVersionArn: "STRING_VALUE",
 * //                 },
 * //               ],
 * //               logicWarning: {
 * //                 type: "ALWAYS_FALSE" || "ALWAYS_TRUE",
 * //                 premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                 claims: "<GuardrailAutomatedReasoningStatementList>",
 * //               },
 * //             },
 * //             translationAmbiguous: { // GuardrailAutomatedReasoningTranslationAmbiguousFinding
 * //               options: [ // GuardrailAutomatedReasoningTranslationOptionList
 * //                 { // GuardrailAutomatedReasoningTranslationOption
 * //                   translations: [ // GuardrailAutomatedReasoningTranslationList
 * //                     {
 * //                       premises: "<GuardrailAutomatedReasoningStatementList>",
 * //                       claims: "<GuardrailAutomatedReasoningStatementList>",
 * //                       untranslatedPremises: "<GuardrailAutomatedReasoningInputTextReferenceList>",
 * //                       untranslatedClaims: "<GuardrailAutomatedReasoningInputTextReferenceList>",
 * //                       confidence: Number("double"),
 * //                     },
 * //                   ],
 * //                 },
 * //               ],
 * //               differenceScenarios: [ // GuardrailAutomatedReasoningDifferenceScenarioList
 * //                 {
 * //                   statements: "<GuardrailAutomatedReasoningStatementList>",
 * //                 },
 * //               ],
 * //             },
 * //             tooComplex: {},
 * //             noTranslations: {},
 * //           },
 * //         ],
 * //       },
 * //       invocationMetrics: { // GuardrailInvocationMetrics
 * //         guardrailProcessingLatency: Number("long"),
 * //         usage: {
 * //           topicPolicyUnits: Number("int"), // required
 * //           contentPolicyUnits: Number("int"), // required
 * //           wordPolicyUnits: Number("int"), // required
 * //           sensitiveInformationPolicyUnits: Number("int"), // required
 * //           sensitiveInformationPolicyFreeUnits: Number("int"), // required
 * //           contextualGroundingPolicyUnits: Number("int"), // required
 * //           contentPolicyImageUnits: Number("int"),
 * //           automatedReasoningPolicyUnits: Number("int"),
 * //           automatedReasoningPolicies: Number("int"),
 * //         },
 * //         guardrailCoverage: { // GuardrailCoverage
 * //           textCharacters: { // GuardrailTextCharactersCoverage
 * //             guarded: Number("int"),
 * //             total: Number("int"),
 * //           },
 * //           images: { // GuardrailImageCoverage
 * //             guarded: Number("int"),
 * //             total: Number("int"),
 * //           },
 * //         },
 * //       },
 * //       appliedGuardrailDetails: { // AppliedGuardrailDetails
 * //         guardrailId: "STRING_VALUE",
 * //         guardrailVersion: "STRING_VALUE",
 * //         guardrailArn: "STRING_VALUE",
 * //         guardrailOrigin: [ // GuardrailOriginList
 * //           "REQUEST" || "ACCOUNT_ENFORCED" || "ORGANIZATION_ENFORCED",
 * //         ],
 * //         guardrailOwnership: "SELF" || "CROSS_ACCOUNT",
 * //       },
 * //     },
 * //   ],
 * //   guardrailCoverage: {
 * //     textCharacters: {
 * //       guarded: Number("int"),
 * //       total: Number("int"),
 * //     },
 * //     images: {
 * //       guarded: Number("int"),
 * //       total: Number("int"),
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param ApplyGuardrailCommandInput - {@link ApplyGuardrailCommandInput}
 * @returns {@link ApplyGuardrailCommandOutput}
 * @see {@link ApplyGuardrailCommandInput} for command's `input` shape.
 * @see {@link ApplyGuardrailCommandOutput} for command's `response` shape.
 * @see {@link BedrockRuntimeClientResolvedConfig | config} for BedrockRuntimeClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request is denied because you do not have sufficient permissions to perform the requested action. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-access-denied">AccessDeniedException</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An internal server error occurred. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-internal-failure">InternalFailure</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The specified resource ARN was not found. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-resource-not-found">ResourceNotFound</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ServiceQuotaExceededException} (client fault)
 *  <p>Your request exceeds the service quota for your account. You can view your quotas at <a href="https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html">Viewing service quotas</a>. You can resubmit your request later.</p>
 *
 * @throws {@link ServiceUnavailableException} (server fault)
 *  <p>The service isn't currently available. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-service-unavailable">ServiceUnavailable</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>Your request was denied due to exceeding the account quotas for <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-throttling-exception">ThrottlingException</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints specified by <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-validation-error">ValidationError</a> in the Amazon Bedrock User Guide</p>
 *
 * @throws {@link BedrockRuntimeServiceException}
 * <p>Base exception class for all service exceptions from BedrockRuntime service.</p>
 *
 *
 * @public
 */
export declare class ApplyGuardrailCommand extends ApplyGuardrailCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ApplyGuardrailRequest;
            output: ApplyGuardrailResponse;
        };
        sdk: {
            input: ApplyGuardrailCommandInput;
            output: ApplyGuardrailCommandOutput;
        };
    };
}
