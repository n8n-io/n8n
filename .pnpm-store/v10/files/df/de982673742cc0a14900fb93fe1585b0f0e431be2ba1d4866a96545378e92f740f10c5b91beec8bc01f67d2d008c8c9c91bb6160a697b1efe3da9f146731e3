import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetImportJobRequest, GetImportJobResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetImportJobCommand}.
 */
export interface GetImportJobCommandInput extends GetImportJobRequest {
}
/**
 * @public
 *
 * The output of {@link GetImportJobCommand}.
 */
export interface GetImportJobCommandOutput extends GetImportJobResponse, __MetadataBearer {
}
declare const GetImportJobCommand_base: {
    new (input: GetImportJobCommandInput): import("@smithy/smithy-client").CommandImpl<GetImportJobCommandInput, GetImportJobCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetImportJobCommandInput): import("@smithy/smithy-client").CommandImpl<GetImportJobCommandInput, GetImportJobCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides information about an import job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetImportJobCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetImportJobCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetImportJobRequest
 *   JobId: "STRING_VALUE", // required
 * };
 * const command = new GetImportJobCommand(input);
 * const response = await client.send(command);
 * // { // GetImportJobResponse
 * //   JobId: "STRING_VALUE",
 * //   ImportDestination: { // ImportDestination
 * //     SuppressionListDestination: { // SuppressionListDestination
 * //       SuppressionListImportAction: "DELETE" || "PUT", // required
 * //     },
 * //     ContactListDestination: { // ContactListDestination
 * //       ContactListName: "STRING_VALUE", // required
 * //       ContactListImportAction: "DELETE" || "PUT", // required
 * //     },
 * //   },
 * //   ImportDataSource: { // ImportDataSource
 * //     S3Url: "STRING_VALUE", // required
 * //     DataFormat: "CSV" || "JSON", // required
 * //   },
 * //   FailureInfo: { // FailureInfo
 * //     FailedRecordsS3Url: "STRING_VALUE",
 * //     ErrorMessage: "STRING_VALUE",
 * //   },
 * //   JobStatus: "CREATED" || "PROCESSING" || "COMPLETED" || "FAILED" || "CANCELLED",
 * //   CreatedTimestamp: new Date("TIMESTAMP"),
 * //   CompletedTimestamp: new Date("TIMESTAMP"),
 * //   ProcessedRecordsCount: Number("int"),
 * //   FailedRecordsCount: Number("int"),
 * // };
 *
 * ```
 *
 * @param GetImportJobCommandInput - {@link GetImportJobCommandInput}
 * @returns {@link GetImportJobCommandOutput}
 * @see {@link GetImportJobCommandInput} for command's `input` shape.
 * @see {@link GetImportJobCommandOutput} for command's `response` shape.
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
export declare class GetImportJobCommand extends GetImportJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetImportJobRequest;
            output: GetImportJobResponse;
        };
        sdk: {
            input: GetImportJobCommandInput;
            output: GetImportJobCommandOutput;
        };
    };
}
