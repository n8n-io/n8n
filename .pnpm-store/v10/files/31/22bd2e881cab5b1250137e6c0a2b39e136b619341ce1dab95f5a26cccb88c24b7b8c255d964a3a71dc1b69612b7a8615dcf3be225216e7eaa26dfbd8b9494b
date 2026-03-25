import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateHubRequest, CreateHubResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateHubCommand}.
 */
export interface CreateHubCommandInput extends CreateHubRequest {
}
/**
 * @public
 *
 * The output of {@link CreateHubCommand}.
 */
export interface CreateHubCommandOutput extends CreateHubResponse, __MetadataBearer {
}
declare const CreateHubCommand_base: {
    new (input: CreateHubCommandInput): import("@smithy/smithy-client").CommandImpl<CreateHubCommandInput, CreateHubCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateHubCommandInput): import("@smithy/smithy-client").CommandImpl<CreateHubCommandInput, CreateHubCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create a hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateHubCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateHubCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateHubRequest
 *   HubName: "STRING_VALUE", // required
 *   HubDescription: "STRING_VALUE", // required
 *   HubDisplayName: "STRING_VALUE",
 *   HubSearchKeywords: [ // HubSearchKeywordList
 *     "STRING_VALUE",
 *   ],
 *   S3StorageConfig: { // HubS3StorageConfig
 *     S3OutputPath: "STRING_VALUE",
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateHubCommand(input);
 * const response = await client.send(command);
 * // { // CreateHubResponse
 * //   HubArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateHubCommandInput - {@link CreateHubCommandInput}
 * @returns {@link CreateHubCommandOutput}
 * @see {@link CreateHubCommandInput} for command's `input` shape.
 * @see {@link CreateHubCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class CreateHubCommand extends CreateHubCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateHubRequest;
            output: CreateHubResponse;
        };
        sdk: {
            input: CreateHubCommandInput;
            output: CreateHubCommandOutput;
        };
    };
}
