import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateWorkteamRequest, UpdateWorkteamResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateWorkteamCommand}.
 */
export interface UpdateWorkteamCommandInput extends UpdateWorkteamRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateWorkteamCommand}.
 */
export interface UpdateWorkteamCommandOutput extends UpdateWorkteamResponse, __MetadataBearer {
}
declare const UpdateWorkteamCommand_base: {
    new (input: UpdateWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateWorkteamCommandInput, UpdateWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateWorkteamCommandInput, UpdateWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an existing work team with new member definitions or description.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateWorkteamCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateWorkteamCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateWorkteamRequest
 *   WorkteamName: "STRING_VALUE", // required
 *   MemberDefinitions: [ // MemberDefinitions
 *     { // MemberDefinition
 *       CognitoMemberDefinition: { // CognitoMemberDefinition
 *         UserPool: "STRING_VALUE", // required
 *         UserGroup: "STRING_VALUE", // required
 *         ClientId: "STRING_VALUE", // required
 *       },
 *       OidcMemberDefinition: { // OidcMemberDefinition
 *         Groups: [ // Groups
 *           "STRING_VALUE",
 *         ],
 *       },
 *     },
 *   ],
 *   Description: "STRING_VALUE",
 *   NotificationConfiguration: { // NotificationConfiguration
 *     NotificationTopicArn: "STRING_VALUE",
 *   },
 *   WorkerAccessConfiguration: { // WorkerAccessConfiguration
 *     S3Presign: { // S3Presign
 *       IamPolicyConstraints: { // IamPolicyConstraints
 *         SourceIp: "Enabled" || "Disabled",
 *         VpcSourceIp: "Enabled" || "Disabled",
 *       },
 *     },
 *   },
 * };
 * const command = new UpdateWorkteamCommand(input);
 * const response = await client.send(command);
 * // { // UpdateWorkteamResponse
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
 * @param UpdateWorkteamCommandInput - {@link UpdateWorkteamCommandInput}
 * @returns {@link UpdateWorkteamCommandOutput}
 * @see {@link UpdateWorkteamCommandInput} for command's `input` shape.
 * @see {@link UpdateWorkteamCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class UpdateWorkteamCommand extends UpdateWorkteamCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateWorkteamRequest;
            output: UpdateWorkteamResponse;
        };
        sdk: {
            input: UpdateWorkteamCommandInput;
            output: UpdateWorkteamCommandOutput;
        };
    };
}
