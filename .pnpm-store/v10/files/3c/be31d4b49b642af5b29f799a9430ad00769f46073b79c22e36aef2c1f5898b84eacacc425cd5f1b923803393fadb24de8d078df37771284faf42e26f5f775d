import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreatePartnerAppRequest, CreatePartnerAppResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreatePartnerAppCommand}.
 */
export interface CreatePartnerAppCommandInput extends CreatePartnerAppRequest {
}
/**
 * @public
 *
 * The output of {@link CreatePartnerAppCommand}.
 */
export interface CreatePartnerAppCommandOutput extends CreatePartnerAppResponse, __MetadataBearer {
}
declare const CreatePartnerAppCommand_base: {
    new (input: CreatePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePartnerAppCommandInput, CreatePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreatePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePartnerAppCommandInput, CreatePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an Amazon SageMaker Partner AI App.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreatePartnerAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreatePartnerAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreatePartnerAppRequest
 *   Name: "STRING_VALUE", // required
 *   Type: "lakera-guard" || "comet" || "deepchecks-llm-evaluation" || "fiddler", // required
 *   ExecutionRoleArn: "STRING_VALUE", // required
 *   KmsKeyId: "STRING_VALUE",
 *   MaintenanceConfig: { // PartnerAppMaintenanceConfig
 *     MaintenanceWindowStart: "STRING_VALUE",
 *   },
 *   Tier: "STRING_VALUE", // required
 *   ApplicationConfig: { // PartnerAppConfig
 *     AdminUsers: [ // PartnerAppAdminUserList
 *       "STRING_VALUE",
 *     ],
 *     Arguments: { // PartnerAppArguments
 *       "<keys>": "STRING_VALUE",
 *     },
 *     AssignedGroupPatterns: [ // AssignedGroupPatternsList
 *       "STRING_VALUE",
 *     ],
 *     RoleGroupAssignments: [ // RoleGroupAssignmentsList
 *       { // RoleGroupAssignment
 *         RoleName: "STRING_VALUE", // required
 *         GroupPatterns: [ // GroupPatternsList // required
 *           "STRING_VALUE",
 *         ],
 *       },
 *     ],
 *   },
 *   AuthType: "IAM", // required
 *   EnableIamSessionBasedIdentity: true || false,
 *   EnableAutoMinorVersionUpgrade: true || false,
 *   ClientToken: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreatePartnerAppCommand(input);
 * const response = await client.send(command);
 * // { // CreatePartnerAppResponse
 * //   Arn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreatePartnerAppCommandInput - {@link CreatePartnerAppCommandInput}
 * @returns {@link CreatePartnerAppCommandOutput}
 * @see {@link CreatePartnerAppCommandInput} for command's `input` shape.
 * @see {@link CreatePartnerAppCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class CreatePartnerAppCommand extends CreatePartnerAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreatePartnerAppRequest;
            output: CreatePartnerAppResponse;
        };
        sdk: {
            input: CreatePartnerAppCommandInput;
            output: CreatePartnerAppCommandOutput;
        };
    };
}
