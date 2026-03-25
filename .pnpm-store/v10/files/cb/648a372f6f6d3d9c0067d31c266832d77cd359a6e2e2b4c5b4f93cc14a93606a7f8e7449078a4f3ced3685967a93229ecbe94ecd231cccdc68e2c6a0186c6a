import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateTenantRequest, CreateTenantResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateTenantCommand}.
 */
export interface CreateTenantCommandInput extends CreateTenantRequest {
}
/**
 * @public
 *
 * The output of {@link CreateTenantCommand}.
 */
export interface CreateTenantCommandOutput extends CreateTenantResponse, __MetadataBearer {
}
declare const CreateTenantCommand_base: {
    new (input: CreateTenantCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTenantCommandInput, CreateTenantCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateTenantCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTenantCommandInput, CreateTenantCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create a tenant.</p>
 *          <p>
 *             <i>Tenants</i> are logical containers that group related SES resources together.
 *             Each tenant can have its own set of resources like email identities, configuration sets,
 *             and templates, along with reputation metrics and sending status. This helps isolate and manage
 *             email sending for different customers or business units within your Amazon SES API v2 account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateTenantCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateTenantCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateTenantRequest
 *   TenantName: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateTenantCommand(input);
 * const response = await client.send(command);
 * // { // CreateTenantResponse
 * //   TenantName: "STRING_VALUE",
 * //   TenantId: "STRING_VALUE",
 * //   TenantArn: "STRING_VALUE",
 * //   CreatedTimestamp: new Date("TIMESTAMP"),
 * //   Tags: [ // TagList
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   SendingStatus: "ENABLED" || "REINSTATED" || "DISABLED",
 * // };
 *
 * ```
 *
 * @param CreateTenantCommandInput - {@link CreateTenantCommandInput}
 * @returns {@link CreateTenantCommandOutput}
 * @see {@link CreateTenantCommandInput} for command's `input` shape.
 * @see {@link CreateTenantCommandOutput} for command's `response` shape.
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
export declare class CreateTenantCommand extends CreateTenantCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateTenantRequest;
            output: CreateTenantResponse;
        };
        sdk: {
            input: CreateTenantCommandInput;
            output: CreateTenantCommandOutput;
        };
    };
}
