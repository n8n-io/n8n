import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetDedicatedIpRequest, GetDedicatedIpResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDedicatedIpCommand}.
 */
export interface GetDedicatedIpCommandInput extends GetDedicatedIpRequest {
}
/**
 * @public
 *
 * The output of {@link GetDedicatedIpCommand}.
 */
export interface GetDedicatedIpCommandOutput extends GetDedicatedIpResponse, __MetadataBearer {
}
declare const GetDedicatedIpCommand_base: {
    new (input: GetDedicatedIpCommandInput): import("@smithy/smithy-client").CommandImpl<GetDedicatedIpCommandInput, GetDedicatedIpCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetDedicatedIpCommandInput): import("@smithy/smithy-client").CommandImpl<GetDedicatedIpCommandInput, GetDedicatedIpCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Get information about a dedicated IP address, including the name of the dedicated IP
 *             pool that it's associated with, as well information about the automatic warm-up process
 *             for the address.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetDedicatedIpCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetDedicatedIpCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetDedicatedIpRequest
 *   Ip: "STRING_VALUE", // required
 * };
 * const command = new GetDedicatedIpCommand(input);
 * const response = await client.send(command);
 * // { // GetDedicatedIpResponse
 * //   DedicatedIp: { // DedicatedIp
 * //     Ip: "STRING_VALUE", // required
 * //     WarmupStatus: "IN_PROGRESS" || "DONE" || "NOT_APPLICABLE", // required
 * //     WarmupPercentage: Number("int"), // required
 * //     PoolName: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param GetDedicatedIpCommandInput - {@link GetDedicatedIpCommandInput}
 * @returns {@link GetDedicatedIpCommandOutput}
 * @see {@link GetDedicatedIpCommandInput} for command's `input` shape.
 * @see {@link GetDedicatedIpCommandOutput} for command's `response` shape.
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
export declare class GetDedicatedIpCommand extends GetDedicatedIpCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetDedicatedIpRequest;
            output: GetDedicatedIpResponse;
        };
        sdk: {
            input: GetDedicatedIpCommandInput;
            output: GetDedicatedIpCommandOutput;
        };
    };
}
