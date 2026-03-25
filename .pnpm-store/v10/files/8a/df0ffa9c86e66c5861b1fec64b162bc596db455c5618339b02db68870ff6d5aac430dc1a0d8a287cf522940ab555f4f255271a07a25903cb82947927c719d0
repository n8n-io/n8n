import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteArtifactRequest, DeleteArtifactResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteArtifactCommand}.
 */
export interface DeleteArtifactCommandInput extends DeleteArtifactRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteArtifactCommand}.
 */
export interface DeleteArtifactCommandOutput extends DeleteArtifactResponse, __MetadataBearer {
}
declare const DeleteArtifactCommand_base: {
    new (input: DeleteArtifactCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteArtifactCommandInput, DeleteArtifactCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [DeleteArtifactCommandInput]): import("@smithy/smithy-client").CommandImpl<DeleteArtifactCommandInput, DeleteArtifactCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an artifact. Either <code>ArtifactArn</code> or <code>Source</code> must be specified.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteArtifactCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteArtifactCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteArtifactRequest
 *   ArtifactArn: "STRING_VALUE",
 *   Source: { // ArtifactSource
 *     SourceUri: "STRING_VALUE", // required
 *     SourceTypes: [ // ArtifactSourceTypes
 *       { // ArtifactSourceType
 *         SourceIdType: "MD5Hash" || "S3ETag" || "S3Version" || "Custom", // required
 *         Value: "STRING_VALUE", // required
 *       },
 *     ],
 *   },
 * };
 * const command = new DeleteArtifactCommand(input);
 * const response = await client.send(command);
 * // { // DeleteArtifactResponse
 * //   ArtifactArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeleteArtifactCommandInput - {@link DeleteArtifactCommandInput}
 * @returns {@link DeleteArtifactCommandOutput}
 * @see {@link DeleteArtifactCommandInput} for command's `input` shape.
 * @see {@link DeleteArtifactCommandOutput} for command's `response` shape.
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
export declare class DeleteArtifactCommand extends DeleteArtifactCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteArtifactRequest;
            output: DeleteArtifactResponse;
        };
        sdk: {
            input: DeleteArtifactCommandInput;
            output: DeleteArtifactCommandOutput;
        };
    };
}
