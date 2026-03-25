import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteDedicatedIpPoolRequest, DeleteDedicatedIpPoolResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteDedicatedIpPoolCommand}.
 */
export interface DeleteDedicatedIpPoolCommandInput extends DeleteDedicatedIpPoolRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteDedicatedIpPoolCommand}.
 */
export interface DeleteDedicatedIpPoolCommandOutput extends DeleteDedicatedIpPoolResponse, __MetadataBearer {
}
declare const DeleteDedicatedIpPoolCommand_base: {
    new (input: DeleteDedicatedIpPoolCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDedicatedIpPoolCommandInput, DeleteDedicatedIpPoolCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteDedicatedIpPoolCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDedicatedIpPoolCommandInput, DeleteDedicatedIpPoolCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete a dedicated IP pool.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteDedicatedIpPoolCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteDedicatedIpPoolCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteDedicatedIpPoolRequest
 *   PoolName: "STRING_VALUE", // required
 * };
 * const command = new DeleteDedicatedIpPoolCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteDedicatedIpPoolCommandInput - {@link DeleteDedicatedIpPoolCommandInput}
 * @returns {@link DeleteDedicatedIpPoolCommandOutput}
 * @see {@link DeleteDedicatedIpPoolCommandInput} for command's `input` shape.
 * @see {@link DeleteDedicatedIpPoolCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link ConcurrentModificationException} (server fault)
 *  <p>The resource is being modified by another operation or thread.</p>
 *
 * @throws {@link NotFoundException} (client fault)
 *  <p>The resource you attempted to access doesn't exist.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Too many requests have been made to the operation.</p>
 *
 * @throws {@link SESv2ServiceException}
 * <p>Base exception class for all service exceptions from SESv2 service.</p>
 *
 *
 * @public
 */
export declare class DeleteDedicatedIpPoolCommand extends DeleteDedicatedIpPoolCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteDedicatedIpPoolRequest;
            output: {};
        };
        sdk: {
            input: DeleteDedicatedIpPoolCommandInput;
            output: DeleteDedicatedIpPoolCommandOutput;
        };
    };
}
