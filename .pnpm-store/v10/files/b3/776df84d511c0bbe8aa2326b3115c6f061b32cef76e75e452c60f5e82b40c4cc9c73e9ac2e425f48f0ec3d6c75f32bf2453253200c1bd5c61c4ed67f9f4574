import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeWorkteamRequest, DescribeWorkteamResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeWorkteamCommand}.
 */
export interface DescribeWorkteamCommandInput extends DescribeWorkteamRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeWorkteamCommand}.
 */
export interface DescribeWorkteamCommandOutput extends DescribeWorkteamResponse, __MetadataBearer {
}
declare const DescribeWorkteamCommand_base: {
    new (input: DescribeWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeWorkteamCommandInput, DescribeWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeWorkteamCommandInput, DescribeWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about a specific work team. You can see information such as the creation date, the last updated date, membership information, and the work team's Amazon Resource Name (ARN).</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeWorkteamCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeWorkteamCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeWorkteamRequest
 *   WorkteamName: "STRING_VALUE", // required
 * };
 * const command = new DescribeWorkteamCommand(input);
 * const response = await client.send(command);
 * // { // DescribeWorkteamResponse
 * //   Workteam: { // Workteam
 * //     WorkteamName: "STRING_VALUE", // required
 * //     MemberDefinitions: [ // MemberDefinitions // required
 * //       { // MemberDefinition
 * //         CognitoMemberDefinition: { // CognitoMemberDefinition
 * //           UserPool: "STRING_VALUE", // required
 * //           UserGroup: "STRING_VALUE", // required
 * //           ClientId: "STRING_VALUE", // required
 * //         },
 * //         OidcMemberDefinition: { // OidcMemberDefinition
 * //           Groups: [ // Groups
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //       },
 * //     ],
 * //     WorkteamArn: "STRING_VALUE", // required
 * //     WorkforceArn: "STRING_VALUE",
 * //     ProductListingIds: [ // ProductListings
 * //       "STRING_VALUE",
 * //     ],
 * //     Description: "STRING_VALUE", // required
 * //     SubDomain: "STRING_VALUE",
 * //     CreateDate: new Date("TIMESTAMP"),
 * //     LastUpdatedDate: new Date("TIMESTAMP"),
 * //     NotificationConfiguration: { // NotificationConfiguration
 * //       NotificationTopicArn: "STRING_VALUE",
 * //     },
 * //     WorkerAccessConfiguration: { // WorkerAccessConfiguration
 * //       S3Presign: { // S3Presign
 * //         IamPolicyConstraints: { // IamPolicyConstraints
 * //           SourceIp: "Enabled" || "Disabled",
 * //           VpcSourceIp: "Enabled" || "Disabled",
 * //         },
 * //       },
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeWorkteamCommandInput - {@link DescribeWorkteamCommandInput}
 * @returns {@link DescribeWorkteamCommandOutput}
 * @see {@link DescribeWorkteamCommandInput} for command's `input` shape.
 * @see {@link DescribeWorkteamCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeWorkteamCommand extends DescribeWorkteamCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeWorkteamRequest;
            output: DescribeWorkteamResponse;
        };
        sdk: {
            input: DescribeWorkteamCommandInput;
            output: DescribeWorkteamCommandOutput;
        };
    };
}
