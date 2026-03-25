import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetDedicatedIpPoolRequest, GetDedicatedIpPoolResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDedicatedIpPoolCommand}.
 */
export interface GetDedicatedIpPoolCommandInput extends GetDedicatedIpPoolRequest {
}
/**
 * @public
 *
 * The output of {@link GetDedicatedIpPoolCommand}.
 */
export interface GetDedicatedIpPoolCommandOutput extends GetDedicatedIpPoolResponse, __MetadataBearer {
}
declare const GetDedicatedIpPoolCommand_base: {
    new (input: GetDedicatedIpPoolCommandInput): import("@smithy/smithy-client").CommandImpl<GetDedicatedIpPoolCommandInput, GetDedicatedIpPoolCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetDedicatedIpPoolCommandInput): import("@smithy/smithy-client").CommandImpl<GetDedicatedIpPoolCommandInput, GetDedicatedIpPoolCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve information about the dedicated pool.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetDedicatedIpPoolCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetDedicatedIpPoolCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetDedicatedIpPoolRequest
 *   PoolName: "STRING_VALUE", // required
 * };
 * const command = new GetDedicatedIpPoolCommand(input);
 * const response = await client.send(command);
 * // { // GetDedicatedIpPoolResponse
 * //   DedicatedIpPool: { // DedicatedIpPool
 * //     PoolName: "STRING_VALUE", // required
 * //     ScalingMode: "STANDARD" || "MANAGED", // required
 * //   },
 * // };
 *
 * ```
 *
 * @param GetDedicatedIpPoolCommandInput - {@link GetDedicatedIpPoolCommandInput}
 * @returns {@link GetDedicatedIpPoolCommandOutput}
 * @see {@link GetDedicatedIpPoolCommandInput} for command's `input` shape.
 * @see {@link GetDedicatedIpPoolCommandOutput} for command's `response` shape.
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
export declare class GetDedicatedIpPoolCommand extends GetDedicatedIpPoolCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetDedicatedIpPoolRequest;
            output: GetDedicatedIpPoolResponse;
        };
        sdk: {
            input: GetDedicatedIpPoolCommandInput;
            output: GetDedicatedIpPoolCommandOutput;
        };
    };
}
