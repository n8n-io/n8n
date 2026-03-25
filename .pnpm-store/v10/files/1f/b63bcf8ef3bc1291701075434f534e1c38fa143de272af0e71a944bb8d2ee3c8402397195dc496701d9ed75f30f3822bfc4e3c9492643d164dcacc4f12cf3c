import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreatePartnerAppPresignedUrlRequest, CreatePartnerAppPresignedUrlResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreatePartnerAppPresignedUrlCommand}.
 */
export interface CreatePartnerAppPresignedUrlCommandInput extends CreatePartnerAppPresignedUrlRequest {
}
/**
 * @public
 *
 * The output of {@link CreatePartnerAppPresignedUrlCommand}.
 */
export interface CreatePartnerAppPresignedUrlCommandOutput extends CreatePartnerAppPresignedUrlResponse, __MetadataBearer {
}
declare const CreatePartnerAppPresignedUrlCommand_base: {
    new (input: CreatePartnerAppPresignedUrlCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePartnerAppPresignedUrlCommandInput, CreatePartnerAppPresignedUrlCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreatePartnerAppPresignedUrlCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePartnerAppPresignedUrlCommandInput, CreatePartnerAppPresignedUrlCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a presigned URL to access an Amazon SageMaker Partner AI App.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreatePartnerAppPresignedUrlCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreatePartnerAppPresignedUrlCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreatePartnerAppPresignedUrlRequest
 *   Arn: "STRING_VALUE", // required
 *   ExpiresInSeconds: Number("int"),
 *   SessionExpirationDurationInSeconds: Number("int"),
 * };
 * const command = new CreatePartnerAppPresignedUrlCommand(input);
 * const response = await client.send(command);
 * // { // CreatePartnerAppPresignedUrlResponse
 * //   Url: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreatePartnerAppPresignedUrlCommandInput - {@link CreatePartnerAppPresignedUrlCommandInput}
 * @returns {@link CreatePartnerAppPresignedUrlCommandOutput}
 * @see {@link CreatePartnerAppPresignedUrlCommandInput} for command's `input` shape.
 * @see {@link CreatePartnerAppPresignedUrlCommandOutput} for command's `response` shape.
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
export declare class CreatePartnerAppPresignedUrlCommand extends CreatePartnerAppPresignedUrlCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreatePartnerAppPresignedUrlRequest;
            output: CreatePartnerAppPresignedUrlResponse;
        };
        sdk: {
            input: CreatePartnerAppPresignedUrlCommandInput;
            output: CreatePartnerAppPresignedUrlCommandOutput;
        };
    };
}
