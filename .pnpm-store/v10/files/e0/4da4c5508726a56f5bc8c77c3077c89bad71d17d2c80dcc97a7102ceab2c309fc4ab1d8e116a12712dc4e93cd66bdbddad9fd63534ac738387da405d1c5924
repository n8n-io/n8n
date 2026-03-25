import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListSpacesRequest, ListSpacesResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListSpacesCommand}.
 */
export interface ListSpacesCommandInput extends ListSpacesRequest {
}
/**
 * @public
 *
 * The output of {@link ListSpacesCommand}.
 */
export interface ListSpacesCommandOutput extends ListSpacesResponse, __MetadataBearer {
}
declare const ListSpacesCommand_base: {
    new (input: ListSpacesCommandInput): import("@smithy/smithy-client").CommandImpl<ListSpacesCommandInput, ListSpacesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListSpacesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListSpacesCommandInput, ListSpacesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists spaces.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListSpacesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListSpacesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListSpacesRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   SortOrder: "Ascending" || "Descending",
 *   SortBy: "CreationTime" || "LastModifiedTime",
 *   DomainIdEquals: "STRING_VALUE",
 *   SpaceNameContains: "STRING_VALUE",
 * };
 * const command = new ListSpacesCommand(input);
 * const response = await client.send(command);
 * // { // ListSpacesResponse
 * //   Spaces: [ // SpaceList
 * //     { // SpaceDetails
 * //       DomainId: "STRING_VALUE",
 * //       SpaceName: "STRING_VALUE",
 * //       Status: "Deleting" || "Failed" || "InService" || "Pending" || "Updating" || "Update_Failed" || "Delete_Failed",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       SpaceSettingsSummary: { // SpaceSettingsSummary
 * //         AppType: "JupyterServer" || "KernelGateway" || "DetailedProfiler" || "TensorBoard" || "CodeEditor" || "JupyterLab" || "RStudioServerPro" || "RSessionGateway" || "Canvas",
 * //         SpaceStorageSettings: { // SpaceStorageSettings
 * //           EbsStorageSettings: { // EbsStorageSettings
 * //             EbsVolumeSizeInGb: Number("int"), // required
 * //           },
 * //         },
 * //       },
 * //       SpaceSharingSettingsSummary: { // SpaceSharingSettingsSummary
 * //         SharingType: "Private" || "Shared",
 * //       },
 * //       OwnershipSettingsSummary: { // OwnershipSettingsSummary
 * //         OwnerUserProfileName: "STRING_VALUE",
 * //       },
 * //       SpaceDisplayName: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListSpacesCommandInput - {@link ListSpacesCommandInput}
 * @returns {@link ListSpacesCommandOutput}
 * @see {@link ListSpacesCommandInput} for command's `input` shape.
 * @see {@link ListSpacesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListSpacesCommand extends ListSpacesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListSpacesRequest;
            output: ListSpacesResponse;
        };
        sdk: {
            input: ListSpacesCommandInput;
            output: ListSpacesCommandOutput;
        };
    };
}
