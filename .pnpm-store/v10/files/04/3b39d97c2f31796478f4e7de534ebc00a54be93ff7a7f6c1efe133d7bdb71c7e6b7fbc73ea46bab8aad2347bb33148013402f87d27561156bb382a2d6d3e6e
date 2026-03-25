import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutAccountSuppressionAttributesRequest, PutAccountSuppressionAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutAccountSuppressionAttributesCommand}.
 */
export interface PutAccountSuppressionAttributesCommandInput extends PutAccountSuppressionAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutAccountSuppressionAttributesCommand}.
 */
export interface PutAccountSuppressionAttributesCommandOutput extends PutAccountSuppressionAttributesResponse, __MetadataBearer {
}
declare const PutAccountSuppressionAttributesCommand_base: {
    new (input: PutAccountSuppressionAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutAccountSuppressionAttributesCommandInput, PutAccountSuppressionAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [PutAccountSuppressionAttributesCommandInput]): import("@smithy/smithy-client").CommandImpl<PutAccountSuppressionAttributesCommandInput, PutAccountSuppressionAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Change the settings for the account-level suppression list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutAccountSuppressionAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutAccountSuppressionAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutAccountSuppressionAttributesRequest
 *   SuppressedReasons: [ // SuppressionListReasons
 *     "BOUNCE" || "COMPLAINT",
 *   ],
 * };
 * const command = new PutAccountSuppressionAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutAccountSuppressionAttributesCommandInput - {@link PutAccountSuppressionAttributesCommandInput}
 * @returns {@link PutAccountSuppressionAttributesCommandOutput}
 * @see {@link PutAccountSuppressionAttributesCommandInput} for command's `input` shape.
 * @see {@link PutAccountSuppressionAttributesCommandOutput} for command's `response` shape.
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
export declare class PutAccountSuppressionAttributesCommand extends PutAccountSuppressionAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutAccountSuppressionAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutAccountSuppressionAttributesCommandInput;
            output: PutAccountSuppressionAttributesCommandOutput;
        };
    };
}
