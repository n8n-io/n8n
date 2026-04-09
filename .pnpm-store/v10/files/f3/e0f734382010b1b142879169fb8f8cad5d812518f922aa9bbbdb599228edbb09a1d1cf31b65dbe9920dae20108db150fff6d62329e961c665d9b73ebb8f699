import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListAppImageConfigsRequest, ListAppImageConfigsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListAppImageConfigsCommand}.
 */
export interface ListAppImageConfigsCommandInput extends ListAppImageConfigsRequest {
}
/**
 * @public
 *
 * The output of {@link ListAppImageConfigsCommand}.
 */
export interface ListAppImageConfigsCommandOutput extends ListAppImageConfigsResponse, __MetadataBearer {
}
declare const ListAppImageConfigsCommand_base: {
    new (input: ListAppImageConfigsCommandInput): import("@smithy/smithy-client").CommandImpl<ListAppImageConfigsCommandInput, ListAppImageConfigsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListAppImageConfigsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListAppImageConfigsCommandInput, ListAppImageConfigsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the AppImageConfigs in your account and their properties. The list can be filtered by creation time or modified time, and whether the AppImageConfig name contains a specified string.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListAppImageConfigsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListAppImageConfigsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListAppImageConfigsRequest
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 *   NameContains: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   ModifiedTimeBefore: new Date("TIMESTAMP"),
 *   ModifiedTimeAfter: new Date("TIMESTAMP"),
 *   SortBy: "CreationTime" || "LastModifiedTime" || "Name",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListAppImageConfigsCommand(input);
 * const response = await client.send(command);
 * // { // ListAppImageConfigsResponse
 * //   NextToken: "STRING_VALUE",
 * //   AppImageConfigs: [ // AppImageConfigList
 * //     { // AppImageConfigDetails
 * //       AppImageConfigArn: "STRING_VALUE",
 * //       AppImageConfigName: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       KernelGatewayImageConfig: { // KernelGatewayImageConfig
 * //         KernelSpecs: [ // KernelSpecs // required
 * //           { // KernelSpec
 * //             Name: "STRING_VALUE", // required
 * //             DisplayName: "STRING_VALUE",
 * //           },
 * //         ],
 * //         FileSystemConfig: { // FileSystemConfig
 * //           MountPath: "STRING_VALUE",
 * //           DefaultUid: Number("int"),
 * //           DefaultGid: Number("int"),
 * //         },
 * //       },
 * //       JupyterLabAppImageConfig: { // JupyterLabAppImageConfig
 * //         FileSystemConfig: {
 * //           MountPath: "STRING_VALUE",
 * //           DefaultUid: Number("int"),
 * //           DefaultGid: Number("int"),
 * //         },
 * //         ContainerConfig: { // ContainerConfig
 * //           ContainerArguments: [ // CustomImageContainerArguments
 * //             "STRING_VALUE",
 * //           ],
 * //           ContainerEntrypoint: [ // CustomImageContainerEntrypoint
 * //             "STRING_VALUE",
 * //           ],
 * //           ContainerEnvironmentVariables: { // CustomImageContainerEnvironmentVariables
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //         },
 * //       },
 * //       CodeEditorAppImageConfig: { // CodeEditorAppImageConfig
 * //         FileSystemConfig: {
 * //           MountPath: "STRING_VALUE",
 * //           DefaultUid: Number("int"),
 * //           DefaultGid: Number("int"),
 * //         },
 * //         ContainerConfig: {
 * //           ContainerArguments: [
 * //             "STRING_VALUE",
 * //           ],
 * //           ContainerEntrypoint: [
 * //             "STRING_VALUE",
 * //           ],
 * //           ContainerEnvironmentVariables: {
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //         },
 * //       },
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ListAppImageConfigsCommandInput - {@link ListAppImageConfigsCommandInput}
 * @returns {@link ListAppImageConfigsCommandOutput}
 * @see {@link ListAppImageConfigsCommandInput} for command's `input` shape.
 * @see {@link ListAppImageConfigsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListAppImageConfigsCommand extends ListAppImageConfigsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListAppImageConfigsRequest;
            output: ListAppImageConfigsResponse;
        };
        sdk: {
            input: ListAppImageConfigsCommandInput;
            output: ListAppImageConfigsCommandOutput;
        };
    };
}
