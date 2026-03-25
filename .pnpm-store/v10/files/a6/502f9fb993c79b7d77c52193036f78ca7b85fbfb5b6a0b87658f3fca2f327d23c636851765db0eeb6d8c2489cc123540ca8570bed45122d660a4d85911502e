import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListHumanTaskUisRequest, ListHumanTaskUisResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListHumanTaskUisCommand}.
 */
export interface ListHumanTaskUisCommandInput extends ListHumanTaskUisRequest {
}
/**
 * @public
 *
 * The output of {@link ListHumanTaskUisCommand}.
 */
export interface ListHumanTaskUisCommandOutput extends ListHumanTaskUisResponse, __MetadataBearer {
}
declare const ListHumanTaskUisCommand_base: {
    new (input: ListHumanTaskUisCommandInput): import("@smithy/smithy-client").CommandImpl<ListHumanTaskUisCommandInput, ListHumanTaskUisCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListHumanTaskUisCommandInput]): import("@smithy/smithy-client").CommandImpl<ListHumanTaskUisCommandInput, ListHumanTaskUisCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about the human task user interfaces in your account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListHumanTaskUisCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListHumanTaskUisCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListHumanTaskUisRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListHumanTaskUisCommand(input);
 * const response = await client.send(command);
 * // { // ListHumanTaskUisResponse
 * //   HumanTaskUiSummaries: [ // HumanTaskUiSummaries // required
 * //     { // HumanTaskUiSummary
 * //       HumanTaskUiName: "STRING_VALUE", // required
 * //       HumanTaskUiArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListHumanTaskUisCommandInput - {@link ListHumanTaskUisCommandInput}
 * @returns {@link ListHumanTaskUisCommandOutput}
 * @see {@link ListHumanTaskUisCommandInput} for command's `input` shape.
 * @see {@link ListHumanTaskUisCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListHumanTaskUisCommand extends ListHumanTaskUisCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListHumanTaskUisRequest;
            output: ListHumanTaskUisResponse;
        };
        sdk: {
            input: ListHumanTaskUisCommandInput;
            output: ListHumanTaskUisCommandOutput;
        };
    };
}
