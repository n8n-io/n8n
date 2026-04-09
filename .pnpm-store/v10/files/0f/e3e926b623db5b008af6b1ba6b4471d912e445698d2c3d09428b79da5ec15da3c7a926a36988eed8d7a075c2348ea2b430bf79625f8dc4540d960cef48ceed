import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { AddAssociationRequest, AddAssociationResponse } from "../models/models_0";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link AddAssociationCommand}.
 */
export interface AddAssociationCommandInput extends AddAssociationRequest {
}
/**
 * @public
 *
 * The output of {@link AddAssociationCommand}.
 */
export interface AddAssociationCommandOutput extends AddAssociationResponse, __MetadataBearer {
}
declare const AddAssociationCommand_base: {
    new (input: AddAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<AddAssociationCommandInput, AddAssociationCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: AddAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<AddAssociationCommandInput, AddAssociationCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an <i>association</i> between the source and the destination. A source can be associated with multiple destinations, and a destination can be associated with multiple sources. An association is a lineage tracking entity. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/lineage-tracking.html">Amazon SageMaker ML Lineage Tracking</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, AddAssociationCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, AddAssociationCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // AddAssociationRequest
 *   SourceArn: "STRING_VALUE", // required
 *   DestinationArn: "STRING_VALUE", // required
 *   AssociationType: "ContributedTo" || "AssociatedWith" || "DerivedFrom" || "Produced" || "SameAs",
 * };
 * const command = new AddAssociationCommand(input);
 * const response = await client.send(command);
 * // { // AddAssociationResponse
 * //   SourceArn: "STRING_VALUE",
 * //   DestinationArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param AddAssociationCommandInput - {@link AddAssociationCommandInput}
 * @returns {@link AddAssociationCommandOutput}
 * @see {@link AddAssociationCommandInput} for command's `input` shape.
 * @see {@link AddAssociationCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class AddAssociationCommand extends AddAssociationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: AddAssociationRequest;
            output: AddAssociationResponse;
        };
        sdk: {
            input: AddAssociationCommandInput;
            output: AddAssociationCommandOutput;
        };
    };
}
