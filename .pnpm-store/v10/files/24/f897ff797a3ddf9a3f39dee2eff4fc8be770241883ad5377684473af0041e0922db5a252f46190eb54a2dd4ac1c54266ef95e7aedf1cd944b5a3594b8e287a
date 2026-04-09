import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeWorkforceRequest, DescribeWorkforceResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeWorkforceCommand}.
 */
export interface DescribeWorkforceCommandInput extends DescribeWorkforceRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeWorkforceCommand}.
 */
export interface DescribeWorkforceCommandOutput extends DescribeWorkforceResponse, __MetadataBearer {
}
declare const DescribeWorkforceCommand_base: {
    new (input: DescribeWorkforceCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeWorkforceCommandInput, DescribeWorkforceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeWorkforceCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeWorkforceCommandInput, DescribeWorkforceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists private workforce information, including workforce name, Amazon Resource Name (ARN), and, if applicable, allowed IP address ranges (<a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">CIDRs</a>). Allowable IP address ranges are the IP addresses that workers can use to access tasks. </p> <important> <p>This operation applies only to private workforces.</p> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeWorkforceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeWorkforceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeWorkforceRequest
 *   WorkforceName: "STRING_VALUE", // required
 * };
 * const command = new DescribeWorkforceCommand(input);
 * const response = await client.send(command);
 * // { // DescribeWorkforceResponse
 * //   Workforce: { // Workforce
 * //     WorkforceName: "STRING_VALUE", // required
 * //     WorkforceArn: "STRING_VALUE", // required
 * //     LastUpdatedDate: new Date("TIMESTAMP"),
 * //     SourceIpConfig: { // SourceIpConfig
 * //       Cidrs: [ // Cidrs // required
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //     SubDomain: "STRING_VALUE",
 * //     CognitoConfig: { // CognitoConfig
 * //       UserPool: "STRING_VALUE", // required
 * //       ClientId: "STRING_VALUE", // required
 * //     },
 * //     OidcConfig: { // OidcConfigForResponse
 * //       ClientId: "STRING_VALUE",
 * //       Issuer: "STRING_VALUE",
 * //       AuthorizationEndpoint: "STRING_VALUE",
 * //       TokenEndpoint: "STRING_VALUE",
 * //       UserInfoEndpoint: "STRING_VALUE",
 * //       LogoutEndpoint: "STRING_VALUE",
 * //       JwksUri: "STRING_VALUE",
 * //       Scope: "STRING_VALUE",
 * //       AuthenticationRequestExtraParams: { // AuthenticationRequestExtraParams
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //     CreateDate: new Date("TIMESTAMP"),
 * //     WorkforceVpcConfig: { // WorkforceVpcConfigResponse
 * //       VpcId: "STRING_VALUE", // required
 * //       SecurityGroupIds: [ // WorkforceSecurityGroupIds // required
 * //         "STRING_VALUE",
 * //       ],
 * //       Subnets: [ // WorkforceSubnets // required
 * //         "STRING_VALUE",
 * //       ],
 * //       VpcEndpointId: "STRING_VALUE",
 * //     },
 * //     Status: "Initializing" || "Updating" || "Deleting" || "Failed" || "Active",
 * //     FailureReason: "STRING_VALUE",
 * //     IpAddressType: "ipv4" || "dualstack",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeWorkforceCommandInput - {@link DescribeWorkforceCommandInput}
 * @returns {@link DescribeWorkforceCommandOutput}
 * @see {@link DescribeWorkforceCommandInput} for command's `input` shape.
 * @see {@link DescribeWorkforceCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeWorkforceCommand extends DescribeWorkforceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeWorkforceRequest;
            output: DescribeWorkforceResponse;
        };
        sdk: {
            input: DescribeWorkforceCommandInput;
            output: DescribeWorkforceCommandOutput;
        };
    };
}
