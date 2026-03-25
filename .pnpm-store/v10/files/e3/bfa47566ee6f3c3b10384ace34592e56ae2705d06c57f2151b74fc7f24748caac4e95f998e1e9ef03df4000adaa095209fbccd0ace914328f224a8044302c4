import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteDomainRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteDomainCommand}.
 */
export interface DeleteDomainCommandInput extends DeleteDomainRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteDomainCommand}.
 */
export interface DeleteDomainCommandOutput extends __MetadataBearer {
}
declare const DeleteDomainCommand_base: {
    new (input: DeleteDomainCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDomainCommandInput, DeleteDomainCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteDomainCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDomainCommandInput, DeleteDomainCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to delete a domain. If you onboarded with IAM mode, you will need to delete your domain to onboard again using IAM Identity Center. Use with caution. All of the members of the domain will lose access to their EFS volume, including data, notebooks, and other artifacts. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteDomainCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteDomainCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteDomainRequest
 *   DomainId: "STRING_VALUE", // required
 *   RetentionPolicy: { // RetentionPolicy
 *     HomeEfsFileSystem: "Retain" || "Delete",
 *   },
 * };
 * const command = new DeleteDomainCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteDomainCommandInput - {@link DeleteDomainCommandInput}
 * @returns {@link DeleteDomainCommandOutput}
 * @see {@link DeleteDomainCommandInput} for command's `input` shape.
 * @see {@link DeleteDomainCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class DeleteDomainCommand extends DeleteDomainCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteDomainRequest;
            output: {};
        };
        sdk: {
            input: DeleteDomainCommandInput;
            output: DeleteDomainCommandOutput;
        };
    };
}
