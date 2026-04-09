import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListCompilationJobsRequest, ListCompilationJobsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListCompilationJobsCommand}.
 */
export interface ListCompilationJobsCommandInput extends ListCompilationJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListCompilationJobsCommand}.
 */
export interface ListCompilationJobsCommandOutput extends ListCompilationJobsResponse, __MetadataBearer {
}
declare const ListCompilationJobsCommand_base: {
    new (input: ListCompilationJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListCompilationJobsCommandInput, ListCompilationJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListCompilationJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListCompilationJobsCommandInput, ListCompilationJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists model compilation jobs that satisfy various filters.</p> <p>To create a model compilation job, use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateCompilationJob.html">CreateCompilationJob</a>. To get information about a particular model compilation job you have created, use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeCompilationJob.html">DescribeCompilationJob</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListCompilationJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListCompilationJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListCompilationJobsRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   StatusEquals: "INPROGRESS" || "COMPLETED" || "FAILED" || "STARTING" || "STOPPING" || "STOPPED",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListCompilationJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListCompilationJobsResponse
 * //   CompilationJobSummaries: [ // CompilationJobSummaries // required
 * //     { // CompilationJobSummary
 * //       CompilationJobName: "STRING_VALUE", // required
 * //       CompilationJobArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       CompilationStartTime: new Date("TIMESTAMP"),
 * //       CompilationEndTime: new Date("TIMESTAMP"),
 * //       CompilationTargetDevice: "lambda" || "ml_m4" || "ml_m5" || "ml_m6g" || "ml_c4" || "ml_c5" || "ml_c6g" || "ml_p2" || "ml_p3" || "ml_g4dn" || "ml_inf1" || "ml_inf2" || "ml_trn1" || "ml_eia2" || "jetson_tx1" || "jetson_tx2" || "jetson_nano" || "jetson_xavier" || "rasp3b" || "rasp4b" || "imx8qm" || "deeplens" || "rk3399" || "rk3288" || "aisage" || "sbe_c" || "qcs605" || "qcs603" || "sitara_am57x" || "amba_cv2" || "amba_cv22" || "amba_cv25" || "x86_win32" || "x86_win64" || "coreml" || "jacinto_tda4vm" || "imx8mplus",
 * //       CompilationTargetPlatformOs: "ANDROID" || "LINUX",
 * //       CompilationTargetPlatformArch: "X86_64" || "X86" || "ARM64" || "ARM_EABI" || "ARM_EABIHF",
 * //       CompilationTargetPlatformAccelerator: "INTEL_GRAPHICS" || "MALI" || "NVIDIA" || "NNA",
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       CompilationJobStatus: "INPROGRESS" || "COMPLETED" || "FAILED" || "STARTING" || "STOPPING" || "STOPPED", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListCompilationJobsCommandInput - {@link ListCompilationJobsCommandInput}
 * @returns {@link ListCompilationJobsCommandOutput}
 * @see {@link ListCompilationJobsCommandInput} for command's `input` shape.
 * @see {@link ListCompilationJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListCompilationJobsCommand extends ListCompilationJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListCompilationJobsRequest;
            output: ListCompilationJobsResponse;
        };
        sdk: {
            input: ListCompilationJobsCommandInput;
            output: ListCompilationJobsCommandOutput;
        };
    };
}
