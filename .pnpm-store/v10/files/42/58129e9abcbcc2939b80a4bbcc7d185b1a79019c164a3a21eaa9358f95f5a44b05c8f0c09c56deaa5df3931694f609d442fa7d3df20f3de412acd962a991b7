import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListWorkforcesRequest, ListWorkforcesResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListWorkforcesCommand}.
 */
export interface ListWorkforcesCommandInput extends ListWorkforcesRequest {
}
/**
 * @public
 *
 * The output of {@link ListWorkforcesCommand}.
 */
export interface ListWorkforcesCommandOutput extends ListWorkforcesResponse, __MetadataBearer {
}
declare const ListWorkforcesCommand_base: {
    new (input: ListWorkforcesCommandInput): import("@smithy/smithy-client").CommandImpl<ListWorkforcesCommandInput, ListWorkforcesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListWorkforcesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListWorkforcesCommandInput, ListWorkforcesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Use this operation to list all private and vendor workforces in an Amazon Web Services Region. Note that you can only have one private workforce per Amazon Web Services Region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListWorkforcesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListWorkforcesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListWorkforcesRequest
 *   SortBy: "Name" || "CreateDate",
 *   SortOrder: "Ascending" || "Descending",
 *   NameContains: "STRING_VALUE",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListWorkforcesCommand(input);
 * const response = await client.send(command);
 * // { // ListWorkforcesResponse
 * //   Workforces: [ // Workforces // required
 * //     { // Workforce
 * //       WorkforceName: "STRING_VALUE", // required
 * //       WorkforceArn: "STRING_VALUE", // required
 * //       LastUpdatedDate: new Date("TIMESTAMP"),
 * //       SourceIpConfig: { // SourceIpConfig
 * //         Cidrs: [ // Cidrs // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       SubDomain: "STRING_VALUE",
 * //       CognitoConfig: { // CognitoConfig
 * //         UserPool: "STRING_VALUE", // required
 * //         ClientId: "STRING_VALUE", // required
 * //       },
 * //       OidcConfig: { // OidcConfigForResponse
 * //         ClientId: "STRING_VALUE",
 * //         Issuer: "STRING_VALUE",
 * //         AuthorizationEndpoint: "STRING_VALUE",
 * //         TokenEndpoint: "STRING_VALUE",
 * //         UserInfoEndpoint: "STRING_VALUE",
 * //         LogoutEndpoint: "STRING_VALUE",
 * //         JwksUri: "STRING_VALUE",
 * //         Scope: "STRING_VALUE",
 * //         AuthenticationRequestExtraParams: { // AuthenticationRequestExtraParams
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //       },
 * //       CreateDate: new Date("TIMESTAMP"),
 * //       WorkforceVpcConfig: { // WorkforceVpcConfigResponse
 * //         VpcId: "STRING_VALUE", // required
 * //         SecurityGroupIds: [ // WorkforceSecurityGroupIds // required
 * //           "STRING_VALUE",
 * //         ],
 * //         Subnets: [ // WorkforceSubnets // required
 * //           "STRING_VALUE",
 * //         ],
 * //         VpcEndpointId: "STRING_VALUE",
 * //       },
 * //       Status: "Initializing" || "Updating" || "Deleting" || "Failed" || "Active",
 * //       FailureReason: "STRING_VALUE",
 * //       IpAddressType: "ipv4" || "dualstack",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListWorkforcesCommandInput - {@link ListWorkforcesCommandInput}
 * @returns {@link ListWorkforcesCommandOutput}
 * @see {@link ListWorkforcesCommandInput} for command's `input` shape.
 * @see {@link ListWorkforcesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListWorkforcesCommand extends ListWorkforcesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListWorkforcesRequest;
            output: ListWorkforcesResponse;
        };
        sdk: {
            input: ListWorkforcesCommandInput;
            output: ListWorkforcesCommandOutput;
        };
    };
}
