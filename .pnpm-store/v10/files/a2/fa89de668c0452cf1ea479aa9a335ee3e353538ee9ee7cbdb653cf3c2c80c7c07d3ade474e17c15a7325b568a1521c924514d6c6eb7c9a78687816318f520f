import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutDedicatedIpInPoolRequest, PutDedicatedIpInPoolResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutDedicatedIpInPoolCommand}.
 */
export interface PutDedicatedIpInPoolCommandInput extends PutDedicatedIpInPoolRequest {
}
/**
 * @public
 *
 * The output of {@link PutDedicatedIpInPoolCommand}.
 */
export interface PutDedicatedIpInPoolCommandOutput extends PutDedicatedIpInPoolResponse, __MetadataBearer {
}
declare const PutDedicatedIpInPoolCommand_base: {
    new (input: PutDedicatedIpInPoolCommandInput): import("@smithy/smithy-client").CommandImpl<PutDedicatedIpInPoolCommandInput, PutDedicatedIpInPoolCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutDedicatedIpInPoolCommandInput): import("@smithy/smithy-client").CommandImpl<PutDedicatedIpInPoolCommandInput, PutDedicatedIpInPoolCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Move a dedicated IP address to an existing dedicated IP pool.</p>
 *          <note>
 *             <p>The dedicated IP address that you specify must already exist, and must be
 *                 associated with your Amazon Web Services account.
 *
 *             </p>
 *             <p>The dedicated IP pool you specify must already exist. You can create a new pool by
 *                 using the <code>CreateDedicatedIpPool</code> operation.</p>
 *          </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutDedicatedIpInPoolCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutDedicatedIpInPoolCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutDedicatedIpInPoolRequest
 *   Ip: "STRING_VALUE", // required
 *   DestinationPoolName: "STRING_VALUE", // required
 * };
 * const command = new PutDedicatedIpInPoolCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutDedicatedIpInPoolCommandInput - {@link PutDedicatedIpInPoolCommandInput}
 * @returns {@link PutDedicatedIpInPoolCommandOutput}
 * @see {@link PutDedicatedIpInPoolCommandInput} for command's `input` shape.
 * @see {@link PutDedicatedIpInPoolCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
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
export declare class PutDedicatedIpInPoolCommand extends PutDedicatedIpInPoolCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutDedicatedIpInPoolRequest;
            output: {};
        };
        sdk: {
            input: PutDedicatedIpInPoolCommandInput;
            output: PutDedicatedIpInPoolCommandOutput;
        };
    };
}
