import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateFeatureGroupRequest, UpdateFeatureGroupResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateFeatureGroupCommand}.
 */
export interface UpdateFeatureGroupCommandInput extends UpdateFeatureGroupRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateFeatureGroupCommand}.
 */
export interface UpdateFeatureGroupCommandOutput extends UpdateFeatureGroupResponse, __MetadataBearer {
}
declare const UpdateFeatureGroupCommand_base: {
    new (input: UpdateFeatureGroupCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateFeatureGroupCommandInput, UpdateFeatureGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateFeatureGroupCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateFeatureGroupCommandInput, UpdateFeatureGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the feature group by either adding features or updating the online store configuration. Use one of the following request parameters at a time while using the <code>UpdateFeatureGroup</code> API.</p> <p>You can add features for your feature group using the <code>FeatureAdditions</code> request parameter. Features cannot be removed from a feature group.</p> <p>You can update the online store configuration by using the <code>OnlineStoreConfig</code> request parameter. If a <code>TtlDuration</code> is specified, the default <code>TtlDuration</code> applies for all records added to the feature group <i>after the feature group is updated</i>. If a record level <code>TtlDuration</code> exists from using the <code>PutRecord</code> API, the record level <code>TtlDuration</code> applies to that record instead of the default <code>TtlDuration</code>. To remove the default <code>TtlDuration</code> from an existing feature group, use the <code>UpdateFeatureGroup</code> API and set the <code>TtlDuration</code> <code>Unit</code> and <code>Value</code> to <code>null</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateFeatureGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateFeatureGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateFeatureGroupRequest
 *   FeatureGroupName: "STRING_VALUE", // required
 *   FeatureAdditions: [ // FeatureAdditions
 *     { // FeatureDefinition
 *       FeatureName: "STRING_VALUE", // required
 *       FeatureType: "Integral" || "Fractional" || "String", // required
 *       CollectionType: "List" || "Set" || "Vector",
 *       CollectionConfig: { // CollectionConfig Union: only one key present
 *         VectorConfig: { // VectorConfig
 *           Dimension: Number("int"), // required
 *         },
 *       },
 *     },
 *   ],
 *   OnlineStoreConfig: { // OnlineStoreConfigUpdate
 *     TtlDuration: { // TtlDuration
 *       Unit: "Seconds" || "Minutes" || "Hours" || "Days" || "Weeks",
 *       Value: Number("int"),
 *     },
 *   },
 *   ThroughputConfig: { // ThroughputConfigUpdate
 *     ThroughputMode: "OnDemand" || "Provisioned",
 *     ProvisionedReadCapacityUnits: Number("int"),
 *     ProvisionedWriteCapacityUnits: Number("int"),
 *   },
 * };
 * const command = new UpdateFeatureGroupCommand(input);
 * const response = await client.send(command);
 * // { // UpdateFeatureGroupResponse
 * //   FeatureGroupArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateFeatureGroupCommandInput - {@link UpdateFeatureGroupCommandInput}
 * @returns {@link UpdateFeatureGroupCommandOutput}
 * @see {@link UpdateFeatureGroupCommandInput} for command's `input` shape.
 * @see {@link UpdateFeatureGroupCommandOutput} for command's `response` shape.
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
export declare class UpdateFeatureGroupCommand extends UpdateFeatureGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateFeatureGroupRequest;
            output: UpdateFeatureGroupResponse;
        };
        sdk: {
            input: UpdateFeatureGroupCommandInput;
            output: UpdateFeatureGroupCommandOutput;
        };
    };
}
