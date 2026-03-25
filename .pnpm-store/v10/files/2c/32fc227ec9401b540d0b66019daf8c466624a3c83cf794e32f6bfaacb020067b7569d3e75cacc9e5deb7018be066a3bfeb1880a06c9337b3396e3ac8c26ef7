import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateActionRequest, CreateActionResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateActionCommand}.
 */
export interface CreateActionCommandInput extends CreateActionRequest {
}
/**
 * @public
 *
 * The output of {@link CreateActionCommand}.
 */
export interface CreateActionCommandOutput extends CreateActionResponse, __MetadataBearer {
}
declare const CreateActionCommand_base: {
    new (input: CreateActionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateActionCommandInput, CreateActionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateActionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateActionCommandInput, CreateActionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an <i>action</i>. An action is a lineage tracking entity that represents an action or activity. For example, a model deployment or an HPO job. Generally, an action involves at least one input or output artifact. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/lineage-tracking.html">Amazon SageMaker ML Lineage Tracking</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateActionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateActionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateActionRequest
 *   ActionName: "STRING_VALUE", // required
 *   Source: { // ActionSource
 *     SourceUri: "STRING_VALUE", // required
 *     SourceType: "STRING_VALUE",
 *     SourceId: "STRING_VALUE",
 *   },
 *   ActionType: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   Status: "Unknown" || "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 *   Properties: { // LineageEntityParameters
 *     "<keys>": "STRING_VALUE",
 *   },
 *   MetadataProperties: { // MetadataProperties
 *     CommitId: "STRING_VALUE",
 *     Repository: "STRING_VALUE",
 *     GeneratedBy: "STRING_VALUE",
 *     ProjectId: "STRING_VALUE",
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateActionCommand(input);
 * const response = await client.send(command);
 * // { // CreateActionResponse
 * //   ActionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateActionCommandInput - {@link CreateActionCommandInput}
 * @returns {@link CreateActionCommandOutput}
 * @see {@link CreateActionCommandInput} for command's `input` shape.
 * @see {@link CreateActionCommandOutput} for command's `response` shape.
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
export declare class CreateActionCommand extends CreateActionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateActionRequest;
            output: CreateActionResponse;
        };
        sdk: {
            input: CreateActionCommandInput;
            output: CreateActionCommandOutput;
        };
    };
}
