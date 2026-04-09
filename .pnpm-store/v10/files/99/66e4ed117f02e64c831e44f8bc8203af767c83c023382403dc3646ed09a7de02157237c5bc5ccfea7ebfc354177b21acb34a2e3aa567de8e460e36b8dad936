import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateFeatureGroupRequest, CreateFeatureGroupResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateFeatureGroupCommand}.
 */
export interface CreateFeatureGroupCommandInput extends CreateFeatureGroupRequest {
}
/**
 * @public
 *
 * The output of {@link CreateFeatureGroupCommand}.
 */
export interface CreateFeatureGroupCommandOutput extends CreateFeatureGroupResponse, __MetadataBearer {
}
declare const CreateFeatureGroupCommand_base: {
    new (input: CreateFeatureGroupCommandInput): import("@smithy/smithy-client").CommandImpl<CreateFeatureGroupCommandInput, CreateFeatureGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateFeatureGroupCommandInput): import("@smithy/smithy-client").CommandImpl<CreateFeatureGroupCommandInput, CreateFeatureGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create a new <code>FeatureGroup</code>. A <code>FeatureGroup</code> is a group of <code>Features</code> defined in the <code>FeatureStore</code> to describe a <code>Record</code>. </p> <p>The <code>FeatureGroup</code> defines the schema and features contained in the <code>FeatureGroup</code>. A <code>FeatureGroup</code> definition is composed of a list of <code>Features</code>, a <code>RecordIdentifierFeatureName</code>, an <code>EventTimeFeatureName</code> and configurations for its <code>OnlineStore</code> and <code>OfflineStore</code>. Check <a href="https://docs.aws.amazon.com/general/latest/gr/aws_service_limits.html">Amazon Web Services service quotas</a> to see the <code>FeatureGroup</code>s quota for your Amazon Web Services account.</p> <p>Note that it can take approximately 10-15 minutes to provision an <code>OnlineStore</code> <code>FeatureGroup</code> with the <code>InMemory</code> <code>StorageType</code>.</p> <important> <p>You must include at least one of <code>OnlineStoreConfig</code> and <code>OfflineStoreConfig</code> to create a <code>FeatureGroup</code>.</p> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateFeatureGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateFeatureGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateFeatureGroupRequest
 *   FeatureGroupName: "STRING_VALUE", // required
 *   RecordIdentifierFeatureName: "STRING_VALUE", // required
 *   EventTimeFeatureName: "STRING_VALUE", // required
 *   FeatureDefinitions: [ // FeatureDefinitions // required
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
 *   OnlineStoreConfig: { // OnlineStoreConfig
 *     SecurityConfig: { // OnlineStoreSecurityConfig
 *       KmsKeyId: "STRING_VALUE",
 *     },
 *     EnableOnlineStore: true || false,
 *     TtlDuration: { // TtlDuration
 *       Unit: "Seconds" || "Minutes" || "Hours" || "Days" || "Weeks",
 *       Value: Number("int"),
 *     },
 *     StorageType: "Standard" || "InMemory",
 *   },
 *   OfflineStoreConfig: { // OfflineStoreConfig
 *     S3StorageConfig: { // S3StorageConfig
 *       S3Uri: "STRING_VALUE", // required
 *       KmsKeyId: "STRING_VALUE",
 *       ResolvedOutputS3Uri: "STRING_VALUE",
 *     },
 *     DisableGlueTableCreation: true || false,
 *     DataCatalogConfig: { // DataCatalogConfig
 *       TableName: "STRING_VALUE", // required
 *       Catalog: "STRING_VALUE", // required
 *       Database: "STRING_VALUE", // required
 *     },
 *     TableFormat: "Default" || "Glue" || "Iceberg",
 *   },
 *   ThroughputConfig: { // ThroughputConfig
 *     ThroughputMode: "OnDemand" || "Provisioned", // required
 *     ProvisionedReadCapacityUnits: Number("int"),
 *     ProvisionedWriteCapacityUnits: Number("int"),
 *   },
 *   RoleArn: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateFeatureGroupCommand(input);
 * const response = await client.send(command);
 * // { // CreateFeatureGroupResponse
 * //   FeatureGroupArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateFeatureGroupCommandInput - {@link CreateFeatureGroupCommandInput}
 * @returns {@link CreateFeatureGroupCommandOutput}
 * @see {@link CreateFeatureGroupCommandInput} for command's `input` shape.
 * @see {@link CreateFeatureGroupCommandOutput} for command's `response` shape.
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
export declare class CreateFeatureGroupCommand extends CreateFeatureGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateFeatureGroupRequest;
            output: CreateFeatureGroupResponse;
        };
        sdk: {
            input: CreateFeatureGroupCommandInput;
            output: CreateFeatureGroupCommandOutput;
        };
    };
}
