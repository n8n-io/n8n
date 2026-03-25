import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutAccountDedicatedIpWarmupAttributesRequest, PutAccountDedicatedIpWarmupAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutAccountDedicatedIpWarmupAttributesCommand}.
 */
export interface PutAccountDedicatedIpWarmupAttributesCommandInput extends PutAccountDedicatedIpWarmupAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutAccountDedicatedIpWarmupAttributesCommand}.
 */
export interface PutAccountDedicatedIpWarmupAttributesCommandOutput extends PutAccountDedicatedIpWarmupAttributesResponse, __MetadataBearer {
}
declare const PutAccountDedicatedIpWarmupAttributesCommand_base: {
    new (input: PutAccountDedicatedIpWarmupAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutAccountDedicatedIpWarmupAttributesCommandInput, PutAccountDedicatedIpWarmupAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [PutAccountDedicatedIpWarmupAttributesCommandInput]): import("@smithy/smithy-client").CommandImpl<PutAccountDedicatedIpWarmupAttributesCommandInput, PutAccountDedicatedIpWarmupAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Enable or disable the automatic warm-up feature for dedicated IP addresses.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutAccountDedicatedIpWarmupAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutAccountDedicatedIpWarmupAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutAccountDedicatedIpWarmupAttributesRequest
 *   AutoWarmupEnabled: true || false,
 * };
 * const command = new PutAccountDedicatedIpWarmupAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutAccountDedicatedIpWarmupAttributesCommandInput - {@link PutAccountDedicatedIpWarmupAttributesCommandInput}
 * @returns {@link PutAccountDedicatedIpWarmupAttributesCommandOutput}
 * @see {@link PutAccountDedicatedIpWarmupAttributesCommandInput} for command's `input` shape.
 * @see {@link PutAccountDedicatedIpWarmupAttributesCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
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
export declare class PutAccountDedicatedIpWarmupAttributesCommand extends PutAccountDedicatedIpWarmupAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutAccountDedicatedIpWarmupAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutAccountDedicatedIpWarmupAttributesCommandInput;
            output: PutAccountDedicatedIpWarmupAttributesCommandOutput;
        };
    };
}
