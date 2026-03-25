import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeHubContentRequest, DescribeHubContentResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeHubContentCommand}.
 */
export interface DescribeHubContentCommandInput extends DescribeHubContentRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeHubContentCommand}.
 */
export interface DescribeHubContentCommandOutput extends DescribeHubContentResponse, __MetadataBearer {
}
declare const DescribeHubContentCommand_base: {
    new (input: DescribeHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeHubContentCommandInput, DescribeHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeHubContentCommandInput, DescribeHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describe the content of a hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeHubContentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeHubContentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeHubContentRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference", // required
 *   HubContentName: "STRING_VALUE", // required
 *   HubContentVersion: "STRING_VALUE",
 * };
 * const command = new DescribeHubContentCommand(input);
 * const response = await client.send(command);
 * // { // DescribeHubContentResponse
 * //   HubContentName: "STRING_VALUE", // required
 * //   HubContentArn: "STRING_VALUE", // required
 * //   HubContentVersion: "STRING_VALUE", // required
 * //   HubContentType: "Model" || "Notebook" || "ModelReference", // required
 * //   DocumentSchemaVersion: "STRING_VALUE", // required
 * //   HubName: "STRING_VALUE", // required
 * //   HubArn: "STRING_VALUE", // required
 * //   HubContentDisplayName: "STRING_VALUE",
 * //   HubContentDescription: "STRING_VALUE",
 * //   HubContentMarkdown: "STRING_VALUE",
 * //   HubContentDocument: "STRING_VALUE", // required
 * //   SageMakerPublicHubContentArn: "STRING_VALUE",
 * //   ReferenceMinVersion: "STRING_VALUE",
 * //   SupportStatus: "Supported" || "Deprecated" || "Restricted",
 * //   HubContentSearchKeywords: [ // HubContentSearchKeywordList
 * //     "STRING_VALUE",
 * //   ],
 * //   HubContentDependencies: [ // HubContentDependencyList
 * //     { // HubContentDependency
 * //       DependencyOriginPath: "STRING_VALUE",
 * //       DependencyCopyPath: "STRING_VALUE",
 * //     },
 * //   ],
 * //   HubContentStatus: "Available" || "Importing" || "Deleting" || "ImportFailed" || "DeleteFailed", // required
 * //   FailureReason: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * // };
 *
 * ```
 *
 * @param DescribeHubContentCommandInput - {@link DescribeHubContentCommandInput}
 * @returns {@link DescribeHubContentCommandOutput}
 * @see {@link DescribeHubContentCommandInput} for command's `input` shape.
 * @see {@link DescribeHubContentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceNotFound} (client fault)
 *  <p>Resource being access is not found.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeHubContentCommand extends DescribeHubContentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeHubContentRequest;
            output: DescribeHubContentResponse;
        };
        sdk: {
            input: DescribeHubContentCommandInput;
            output: DescribeHubContentCommandOutput;
        };
    };
}
