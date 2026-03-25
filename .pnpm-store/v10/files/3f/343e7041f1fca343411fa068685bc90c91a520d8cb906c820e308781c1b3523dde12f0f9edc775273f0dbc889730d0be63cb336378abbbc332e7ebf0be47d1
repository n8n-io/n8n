import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateMultiRegionEndpointRequest, CreateMultiRegionEndpointResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateMultiRegionEndpointCommand}.
 */
export interface CreateMultiRegionEndpointCommandInput extends CreateMultiRegionEndpointRequest {
}
/**
 * @public
 *
 * The output of {@link CreateMultiRegionEndpointCommand}.
 */
export interface CreateMultiRegionEndpointCommandOutput extends CreateMultiRegionEndpointResponse, __MetadataBearer {
}
declare const CreateMultiRegionEndpointCommand_base: {
    new (input: CreateMultiRegionEndpointCommandInput): import("@smithy/smithy-client").CommandImpl<CreateMultiRegionEndpointCommandInput, CreateMultiRegionEndpointCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateMultiRegionEndpointCommandInput): import("@smithy/smithy-client").CommandImpl<CreateMultiRegionEndpointCommandInput, CreateMultiRegionEndpointCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a multi-region endpoint (global-endpoint).</p>
 *          <p>The primary region is going to be the AWS-Region where the operation is executed.
 *             The secondary region has to be provided in request's parameters.
 *             From the data flow standpoint there is no difference between primary
 *             and secondary regions - sending traffic will be split equally between the two.
 *             The primary region is the region where the resource has been created and where it can be managed.
 *         </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateMultiRegionEndpointCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateMultiRegionEndpointCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateMultiRegionEndpointRequest
 *   EndpointName: "STRING_VALUE", // required
 *   Details: { // Details
 *     RoutesDetails: [ // RoutesDetails // required
 *       { // RouteDetails
 *         Region: "STRING_VALUE", // required
 *       },
 *     ],
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateMultiRegionEndpointCommand(input);
 * const response = await client.send(command);
 * // { // CreateMultiRegionEndpointResponse
 * //   Status: "CREATING" || "READY" || "FAILED" || "DELETING",
 * //   EndpointId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateMultiRegionEndpointCommandInput - {@link CreateMultiRegionEndpointCommandInput}
 * @returns {@link CreateMultiRegionEndpointCommandOutput}
 * @see {@link CreateMultiRegionEndpointCommandInput} for command's `input` shape.
 * @see {@link CreateMultiRegionEndpointCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link AlreadyExistsException} (client fault)
 *  <p>The resource specified in your request already exists.</p>
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>There are too many instances of the specified resource type.</p>
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
export declare class CreateMultiRegionEndpointCommand extends CreateMultiRegionEndpointCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateMultiRegionEndpointRequest;
            output: CreateMultiRegionEndpointResponse;
        };
        sdk: {
            input: CreateMultiRegionEndpointCommandInput;
            output: CreateMultiRegionEndpointCommandOutput;
        };
    };
}
