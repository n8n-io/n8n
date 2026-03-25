import {
  HostHeaderInputConfig,
  HostHeaderResolvedConfig,
} from "@aws-sdk/middleware-host-header";
import {
  UserAgentInputConfig,
  UserAgentResolvedConfig,
} from "@aws-sdk/middleware-user-agent";
import {
  RegionInputConfig,
  RegionResolvedConfig,
} from "@smithy/config-resolver";
import {
  EndpointInputConfig,
  EndpointResolvedConfig,
} from "@smithy/middleware-endpoint";
import {
  RetryInputConfig,
  RetryResolvedConfig,
} from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import {
  Client as __Client,
  DefaultsMode as __DefaultsMode,
  SmithyConfiguration as __SmithyConfiguration,
  SmithyResolvedConfiguration as __SmithyResolvedConfiguration,
} from "@smithy/smithy-client";
import {
  AwsCredentialIdentityProvider,
  BodyLengthCalculator as __BodyLengthCalculator,
  CheckOptionalClientConfig as __CheckOptionalClientConfig,
  ChecksumConstructor as __ChecksumConstructor,
  Decoder as __Decoder,
  Encoder as __Encoder,
  HashConstructor as __HashConstructor,
  HttpHandlerOptions as __HttpHandlerOptions,
  Logger as __Logger,
  Provider as __Provider,
  Provider,
  StreamCollector as __StreamCollector,
  UrlParser as __UrlParser,
  UserAgent as __UserAgent,
} from "@smithy/types";
import {
  HttpAuthSchemeInputConfig,
  HttpAuthSchemeResolvedConfig,
} from "./auth/httpAuthSchemeProvider";
import {
  BatchGetMetricDataCommandInput,
  BatchGetMetricDataCommandOutput,
} from "./commands/BatchGetMetricDataCommand";
import {
  CancelExportJobCommandInput,
  CancelExportJobCommandOutput,
} from "./commands/CancelExportJobCommand";
import {
  CreateConfigurationSetCommandInput,
  CreateConfigurationSetCommandOutput,
} from "./commands/CreateConfigurationSetCommand";
import {
  CreateConfigurationSetEventDestinationCommandInput,
  CreateConfigurationSetEventDestinationCommandOutput,
} from "./commands/CreateConfigurationSetEventDestinationCommand";
import {
  CreateContactCommandInput,
  CreateContactCommandOutput,
} from "./commands/CreateContactCommand";
import {
  CreateContactListCommandInput,
  CreateContactListCommandOutput,
} from "./commands/CreateContactListCommand";
import {
  CreateCustomVerificationEmailTemplateCommandInput,
  CreateCustomVerificationEmailTemplateCommandOutput,
} from "./commands/CreateCustomVerificationEmailTemplateCommand";
import {
  CreateDedicatedIpPoolCommandInput,
  CreateDedicatedIpPoolCommandOutput,
} from "./commands/CreateDedicatedIpPoolCommand";
import {
  CreateDeliverabilityTestReportCommandInput,
  CreateDeliverabilityTestReportCommandOutput,
} from "./commands/CreateDeliverabilityTestReportCommand";
import {
  CreateEmailIdentityCommandInput,
  CreateEmailIdentityCommandOutput,
} from "./commands/CreateEmailIdentityCommand";
import {
  CreateEmailIdentityPolicyCommandInput,
  CreateEmailIdentityPolicyCommandOutput,
} from "./commands/CreateEmailIdentityPolicyCommand";
import {
  CreateEmailTemplateCommandInput,
  CreateEmailTemplateCommandOutput,
} from "./commands/CreateEmailTemplateCommand";
import {
  CreateExportJobCommandInput,
  CreateExportJobCommandOutput,
} from "./commands/CreateExportJobCommand";
import {
  CreateImportJobCommandInput,
  CreateImportJobCommandOutput,
} from "./commands/CreateImportJobCommand";
import {
  CreateMultiRegionEndpointCommandInput,
  CreateMultiRegionEndpointCommandOutput,
} from "./commands/CreateMultiRegionEndpointCommand";
import {
  CreateTenantCommandInput,
  CreateTenantCommandOutput,
} from "./commands/CreateTenantCommand";
import {
  CreateTenantResourceAssociationCommandInput,
  CreateTenantResourceAssociationCommandOutput,
} from "./commands/CreateTenantResourceAssociationCommand";
import {
  DeleteConfigurationSetCommandInput,
  DeleteConfigurationSetCommandOutput,
} from "./commands/DeleteConfigurationSetCommand";
import {
  DeleteConfigurationSetEventDestinationCommandInput,
  DeleteConfigurationSetEventDestinationCommandOutput,
} from "./commands/DeleteConfigurationSetEventDestinationCommand";
import {
  DeleteContactCommandInput,
  DeleteContactCommandOutput,
} from "./commands/DeleteContactCommand";
import {
  DeleteContactListCommandInput,
  DeleteContactListCommandOutput,
} from "./commands/DeleteContactListCommand";
import {
  DeleteCustomVerificationEmailTemplateCommandInput,
  DeleteCustomVerificationEmailTemplateCommandOutput,
} from "./commands/DeleteCustomVerificationEmailTemplateCommand";
import {
  DeleteDedicatedIpPoolCommandInput,
  DeleteDedicatedIpPoolCommandOutput,
} from "./commands/DeleteDedicatedIpPoolCommand";
import {
  DeleteEmailIdentityCommandInput,
  DeleteEmailIdentityCommandOutput,
} from "./commands/DeleteEmailIdentityCommand";
import {
  DeleteEmailIdentityPolicyCommandInput,
  DeleteEmailIdentityPolicyCommandOutput,
} from "./commands/DeleteEmailIdentityPolicyCommand";
import {
  DeleteEmailTemplateCommandInput,
  DeleteEmailTemplateCommandOutput,
} from "./commands/DeleteEmailTemplateCommand";
import {
  DeleteMultiRegionEndpointCommandInput,
  DeleteMultiRegionEndpointCommandOutput,
} from "./commands/DeleteMultiRegionEndpointCommand";
import {
  DeleteSuppressedDestinationCommandInput,
  DeleteSuppressedDestinationCommandOutput,
} from "./commands/DeleteSuppressedDestinationCommand";
import {
  DeleteTenantCommandInput,
  DeleteTenantCommandOutput,
} from "./commands/DeleteTenantCommand";
import {
  DeleteTenantResourceAssociationCommandInput,
  DeleteTenantResourceAssociationCommandOutput,
} from "./commands/DeleteTenantResourceAssociationCommand";
import {
  GetAccountCommandInput,
  GetAccountCommandOutput,
} from "./commands/GetAccountCommand";
import {
  GetBlacklistReportsCommandInput,
  GetBlacklistReportsCommandOutput,
} from "./commands/GetBlacklistReportsCommand";
import {
  GetConfigurationSetCommandInput,
  GetConfigurationSetCommandOutput,
} from "./commands/GetConfigurationSetCommand";
import {
  GetConfigurationSetEventDestinationsCommandInput,
  GetConfigurationSetEventDestinationsCommandOutput,
} from "./commands/GetConfigurationSetEventDestinationsCommand";
import {
  GetContactCommandInput,
  GetContactCommandOutput,
} from "./commands/GetContactCommand";
import {
  GetContactListCommandInput,
  GetContactListCommandOutput,
} from "./commands/GetContactListCommand";
import {
  GetCustomVerificationEmailTemplateCommandInput,
  GetCustomVerificationEmailTemplateCommandOutput,
} from "./commands/GetCustomVerificationEmailTemplateCommand";
import {
  GetDedicatedIpCommandInput,
  GetDedicatedIpCommandOutput,
} from "./commands/GetDedicatedIpCommand";
import {
  GetDedicatedIpPoolCommandInput,
  GetDedicatedIpPoolCommandOutput,
} from "./commands/GetDedicatedIpPoolCommand";
import {
  GetDedicatedIpsCommandInput,
  GetDedicatedIpsCommandOutput,
} from "./commands/GetDedicatedIpsCommand";
import {
  GetDeliverabilityDashboardOptionsCommandInput,
  GetDeliverabilityDashboardOptionsCommandOutput,
} from "./commands/GetDeliverabilityDashboardOptionsCommand";
import {
  GetDeliverabilityTestReportCommandInput,
  GetDeliverabilityTestReportCommandOutput,
} from "./commands/GetDeliverabilityTestReportCommand";
import {
  GetDomainDeliverabilityCampaignCommandInput,
  GetDomainDeliverabilityCampaignCommandOutput,
} from "./commands/GetDomainDeliverabilityCampaignCommand";
import {
  GetDomainStatisticsReportCommandInput,
  GetDomainStatisticsReportCommandOutput,
} from "./commands/GetDomainStatisticsReportCommand";
import {
  GetEmailIdentityCommandInput,
  GetEmailIdentityCommandOutput,
} from "./commands/GetEmailIdentityCommand";
import {
  GetEmailIdentityPoliciesCommandInput,
  GetEmailIdentityPoliciesCommandOutput,
} from "./commands/GetEmailIdentityPoliciesCommand";
import {
  GetEmailTemplateCommandInput,
  GetEmailTemplateCommandOutput,
} from "./commands/GetEmailTemplateCommand";
import {
  GetExportJobCommandInput,
  GetExportJobCommandOutput,
} from "./commands/GetExportJobCommand";
import {
  GetImportJobCommandInput,
  GetImportJobCommandOutput,
} from "./commands/GetImportJobCommand";
import {
  GetMessageInsightsCommandInput,
  GetMessageInsightsCommandOutput,
} from "./commands/GetMessageInsightsCommand";
import {
  GetMultiRegionEndpointCommandInput,
  GetMultiRegionEndpointCommandOutput,
} from "./commands/GetMultiRegionEndpointCommand";
import {
  GetReputationEntityCommandInput,
  GetReputationEntityCommandOutput,
} from "./commands/GetReputationEntityCommand";
import {
  GetSuppressedDestinationCommandInput,
  GetSuppressedDestinationCommandOutput,
} from "./commands/GetSuppressedDestinationCommand";
import {
  GetTenantCommandInput,
  GetTenantCommandOutput,
} from "./commands/GetTenantCommand";
import {
  ListConfigurationSetsCommandInput,
  ListConfigurationSetsCommandOutput,
} from "./commands/ListConfigurationSetsCommand";
import {
  ListContactListsCommandInput,
  ListContactListsCommandOutput,
} from "./commands/ListContactListsCommand";
import {
  ListContactsCommandInput,
  ListContactsCommandOutput,
} from "./commands/ListContactsCommand";
import {
  ListCustomVerificationEmailTemplatesCommandInput,
  ListCustomVerificationEmailTemplatesCommandOutput,
} from "./commands/ListCustomVerificationEmailTemplatesCommand";
import {
  ListDedicatedIpPoolsCommandInput,
  ListDedicatedIpPoolsCommandOutput,
} from "./commands/ListDedicatedIpPoolsCommand";
import {
  ListDeliverabilityTestReportsCommandInput,
  ListDeliverabilityTestReportsCommandOutput,
} from "./commands/ListDeliverabilityTestReportsCommand";
import {
  ListDomainDeliverabilityCampaignsCommandInput,
  ListDomainDeliverabilityCampaignsCommandOutput,
} from "./commands/ListDomainDeliverabilityCampaignsCommand";
import {
  ListEmailIdentitiesCommandInput,
  ListEmailIdentitiesCommandOutput,
} from "./commands/ListEmailIdentitiesCommand";
import {
  ListEmailTemplatesCommandInput,
  ListEmailTemplatesCommandOutput,
} from "./commands/ListEmailTemplatesCommand";
import {
  ListExportJobsCommandInput,
  ListExportJobsCommandOutput,
} from "./commands/ListExportJobsCommand";
import {
  ListImportJobsCommandInput,
  ListImportJobsCommandOutput,
} from "./commands/ListImportJobsCommand";
import {
  ListMultiRegionEndpointsCommandInput,
  ListMultiRegionEndpointsCommandOutput,
} from "./commands/ListMultiRegionEndpointsCommand";
import {
  ListRecommendationsCommandInput,
  ListRecommendationsCommandOutput,
} from "./commands/ListRecommendationsCommand";
import {
  ListReputationEntitiesCommandInput,
  ListReputationEntitiesCommandOutput,
} from "./commands/ListReputationEntitiesCommand";
import {
  ListResourceTenantsCommandInput,
  ListResourceTenantsCommandOutput,
} from "./commands/ListResourceTenantsCommand";
import {
  ListSuppressedDestinationsCommandInput,
  ListSuppressedDestinationsCommandOutput,
} from "./commands/ListSuppressedDestinationsCommand";
import {
  ListTagsForResourceCommandInput,
  ListTagsForResourceCommandOutput,
} from "./commands/ListTagsForResourceCommand";
import {
  ListTenantResourcesCommandInput,
  ListTenantResourcesCommandOutput,
} from "./commands/ListTenantResourcesCommand";
import {
  ListTenantsCommandInput,
  ListTenantsCommandOutput,
} from "./commands/ListTenantsCommand";
import {
  PutAccountDedicatedIpWarmupAttributesCommandInput,
  PutAccountDedicatedIpWarmupAttributesCommandOutput,
} from "./commands/PutAccountDedicatedIpWarmupAttributesCommand";
import {
  PutAccountDetailsCommandInput,
  PutAccountDetailsCommandOutput,
} from "./commands/PutAccountDetailsCommand";
import {
  PutAccountSendingAttributesCommandInput,
  PutAccountSendingAttributesCommandOutput,
} from "./commands/PutAccountSendingAttributesCommand";
import {
  PutAccountSuppressionAttributesCommandInput,
  PutAccountSuppressionAttributesCommandOutput,
} from "./commands/PutAccountSuppressionAttributesCommand";
import {
  PutAccountVdmAttributesCommandInput,
  PutAccountVdmAttributesCommandOutput,
} from "./commands/PutAccountVdmAttributesCommand";
import {
  PutConfigurationSetArchivingOptionsCommandInput,
  PutConfigurationSetArchivingOptionsCommandOutput,
} from "./commands/PutConfigurationSetArchivingOptionsCommand";
import {
  PutConfigurationSetDeliveryOptionsCommandInput,
  PutConfigurationSetDeliveryOptionsCommandOutput,
} from "./commands/PutConfigurationSetDeliveryOptionsCommand";
import {
  PutConfigurationSetReputationOptionsCommandInput,
  PutConfigurationSetReputationOptionsCommandOutput,
} from "./commands/PutConfigurationSetReputationOptionsCommand";
import {
  PutConfigurationSetSendingOptionsCommandInput,
  PutConfigurationSetSendingOptionsCommandOutput,
} from "./commands/PutConfigurationSetSendingOptionsCommand";
import {
  PutConfigurationSetSuppressionOptionsCommandInput,
  PutConfigurationSetSuppressionOptionsCommandOutput,
} from "./commands/PutConfigurationSetSuppressionOptionsCommand";
import {
  PutConfigurationSetTrackingOptionsCommandInput,
  PutConfigurationSetTrackingOptionsCommandOutput,
} from "./commands/PutConfigurationSetTrackingOptionsCommand";
import {
  PutConfigurationSetVdmOptionsCommandInput,
  PutConfigurationSetVdmOptionsCommandOutput,
} from "./commands/PutConfigurationSetVdmOptionsCommand";
import {
  PutDedicatedIpInPoolCommandInput,
  PutDedicatedIpInPoolCommandOutput,
} from "./commands/PutDedicatedIpInPoolCommand";
import {
  PutDedicatedIpPoolScalingAttributesCommandInput,
  PutDedicatedIpPoolScalingAttributesCommandOutput,
} from "./commands/PutDedicatedIpPoolScalingAttributesCommand";
import {
  PutDedicatedIpWarmupAttributesCommandInput,
  PutDedicatedIpWarmupAttributesCommandOutput,
} from "./commands/PutDedicatedIpWarmupAttributesCommand";
import {
  PutDeliverabilityDashboardOptionCommandInput,
  PutDeliverabilityDashboardOptionCommandOutput,
} from "./commands/PutDeliverabilityDashboardOptionCommand";
import {
  PutEmailIdentityConfigurationSetAttributesCommandInput,
  PutEmailIdentityConfigurationSetAttributesCommandOutput,
} from "./commands/PutEmailIdentityConfigurationSetAttributesCommand";
import {
  PutEmailIdentityDkimAttributesCommandInput,
  PutEmailIdentityDkimAttributesCommandOutput,
} from "./commands/PutEmailIdentityDkimAttributesCommand";
import {
  PutEmailIdentityDkimSigningAttributesCommandInput,
  PutEmailIdentityDkimSigningAttributesCommandOutput,
} from "./commands/PutEmailIdentityDkimSigningAttributesCommand";
import {
  PutEmailIdentityFeedbackAttributesCommandInput,
  PutEmailIdentityFeedbackAttributesCommandOutput,
} from "./commands/PutEmailIdentityFeedbackAttributesCommand";
import {
  PutEmailIdentityMailFromAttributesCommandInput,
  PutEmailIdentityMailFromAttributesCommandOutput,
} from "./commands/PutEmailIdentityMailFromAttributesCommand";
import {
  PutSuppressedDestinationCommandInput,
  PutSuppressedDestinationCommandOutput,
} from "./commands/PutSuppressedDestinationCommand";
import {
  SendBulkEmailCommandInput,
  SendBulkEmailCommandOutput,
} from "./commands/SendBulkEmailCommand";
import {
  SendCustomVerificationEmailCommandInput,
  SendCustomVerificationEmailCommandOutput,
} from "./commands/SendCustomVerificationEmailCommand";
import {
  SendEmailCommandInput,
  SendEmailCommandOutput,
} from "./commands/SendEmailCommand";
import {
  TagResourceCommandInput,
  TagResourceCommandOutput,
} from "./commands/TagResourceCommand";
import {
  TestRenderEmailTemplateCommandInput,
  TestRenderEmailTemplateCommandOutput,
} from "./commands/TestRenderEmailTemplateCommand";
import {
  UntagResourceCommandInput,
  UntagResourceCommandOutput,
} from "./commands/UntagResourceCommand";
import {
  UpdateConfigurationSetEventDestinationCommandInput,
  UpdateConfigurationSetEventDestinationCommandOutput,
} from "./commands/UpdateConfigurationSetEventDestinationCommand";
import {
  UpdateContactCommandInput,
  UpdateContactCommandOutput,
} from "./commands/UpdateContactCommand";
import {
  UpdateContactListCommandInput,
  UpdateContactListCommandOutput,
} from "./commands/UpdateContactListCommand";
import {
  UpdateCustomVerificationEmailTemplateCommandInput,
  UpdateCustomVerificationEmailTemplateCommandOutput,
} from "./commands/UpdateCustomVerificationEmailTemplateCommand";
import {
  UpdateEmailIdentityPolicyCommandInput,
  UpdateEmailIdentityPolicyCommandOutput,
} from "./commands/UpdateEmailIdentityPolicyCommand";
import {
  UpdateEmailTemplateCommandInput,
  UpdateEmailTemplateCommandOutput,
} from "./commands/UpdateEmailTemplateCommand";
import {
  UpdateReputationEntityCustomerManagedStatusCommandInput,
  UpdateReputationEntityCustomerManagedStatusCommandOutput,
} from "./commands/UpdateReputationEntityCustomerManagedStatusCommand";
import {
  UpdateReputationEntityPolicyCommandInput,
  UpdateReputationEntityPolicyCommandOutput,
} from "./commands/UpdateReputationEntityPolicyCommand";
import {
  ClientInputEndpointParameters,
  ClientResolvedEndpointParameters,
  EndpointParameters,
} from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
export type ServiceInputTypes =
  | BatchGetMetricDataCommandInput
  | CancelExportJobCommandInput
  | CreateConfigurationSetCommandInput
  | CreateConfigurationSetEventDestinationCommandInput
  | CreateContactCommandInput
  | CreateContactListCommandInput
  | CreateCustomVerificationEmailTemplateCommandInput
  | CreateDedicatedIpPoolCommandInput
  | CreateDeliverabilityTestReportCommandInput
  | CreateEmailIdentityCommandInput
  | CreateEmailIdentityPolicyCommandInput
  | CreateEmailTemplateCommandInput
  | CreateExportJobCommandInput
  | CreateImportJobCommandInput
  | CreateMultiRegionEndpointCommandInput
  | CreateTenantCommandInput
  | CreateTenantResourceAssociationCommandInput
  | DeleteConfigurationSetCommandInput
  | DeleteConfigurationSetEventDestinationCommandInput
  | DeleteContactCommandInput
  | DeleteContactListCommandInput
  | DeleteCustomVerificationEmailTemplateCommandInput
  | DeleteDedicatedIpPoolCommandInput
  | DeleteEmailIdentityCommandInput
  | DeleteEmailIdentityPolicyCommandInput
  | DeleteEmailTemplateCommandInput
  | DeleteMultiRegionEndpointCommandInput
  | DeleteSuppressedDestinationCommandInput
  | DeleteTenantCommandInput
  | DeleteTenantResourceAssociationCommandInput
  | GetAccountCommandInput
  | GetBlacklistReportsCommandInput
  | GetConfigurationSetCommandInput
  | GetConfigurationSetEventDestinationsCommandInput
  | GetContactCommandInput
  | GetContactListCommandInput
  | GetCustomVerificationEmailTemplateCommandInput
  | GetDedicatedIpCommandInput
  | GetDedicatedIpPoolCommandInput
  | GetDedicatedIpsCommandInput
  | GetDeliverabilityDashboardOptionsCommandInput
  | GetDeliverabilityTestReportCommandInput
  | GetDomainDeliverabilityCampaignCommandInput
  | GetDomainStatisticsReportCommandInput
  | GetEmailIdentityCommandInput
  | GetEmailIdentityPoliciesCommandInput
  | GetEmailTemplateCommandInput
  | GetExportJobCommandInput
  | GetImportJobCommandInput
  | GetMessageInsightsCommandInput
  | GetMultiRegionEndpointCommandInput
  | GetReputationEntityCommandInput
  | GetSuppressedDestinationCommandInput
  | GetTenantCommandInput
  | ListConfigurationSetsCommandInput
  | ListContactListsCommandInput
  | ListContactsCommandInput
  | ListCustomVerificationEmailTemplatesCommandInput
  | ListDedicatedIpPoolsCommandInput
  | ListDeliverabilityTestReportsCommandInput
  | ListDomainDeliverabilityCampaignsCommandInput
  | ListEmailIdentitiesCommandInput
  | ListEmailTemplatesCommandInput
  | ListExportJobsCommandInput
  | ListImportJobsCommandInput
  | ListMultiRegionEndpointsCommandInput
  | ListRecommendationsCommandInput
  | ListReputationEntitiesCommandInput
  | ListResourceTenantsCommandInput
  | ListSuppressedDestinationsCommandInput
  | ListTagsForResourceCommandInput
  | ListTenantResourcesCommandInput
  | ListTenantsCommandInput
  | PutAccountDedicatedIpWarmupAttributesCommandInput
  | PutAccountDetailsCommandInput
  | PutAccountSendingAttributesCommandInput
  | PutAccountSuppressionAttributesCommandInput
  | PutAccountVdmAttributesCommandInput
  | PutConfigurationSetArchivingOptionsCommandInput
  | PutConfigurationSetDeliveryOptionsCommandInput
  | PutConfigurationSetReputationOptionsCommandInput
  | PutConfigurationSetSendingOptionsCommandInput
  | PutConfigurationSetSuppressionOptionsCommandInput
  | PutConfigurationSetTrackingOptionsCommandInput
  | PutConfigurationSetVdmOptionsCommandInput
  | PutDedicatedIpInPoolCommandInput
  | PutDedicatedIpPoolScalingAttributesCommandInput
  | PutDedicatedIpWarmupAttributesCommandInput
  | PutDeliverabilityDashboardOptionCommandInput
  | PutEmailIdentityConfigurationSetAttributesCommandInput
  | PutEmailIdentityDkimAttributesCommandInput
  | PutEmailIdentityDkimSigningAttributesCommandInput
  | PutEmailIdentityFeedbackAttributesCommandInput
  | PutEmailIdentityMailFromAttributesCommandInput
  | PutSuppressedDestinationCommandInput
  | SendBulkEmailCommandInput
  | SendCustomVerificationEmailCommandInput
  | SendEmailCommandInput
  | TagResourceCommandInput
  | TestRenderEmailTemplateCommandInput
  | UntagResourceCommandInput
  | UpdateConfigurationSetEventDestinationCommandInput
  | UpdateContactCommandInput
  | UpdateContactListCommandInput
  | UpdateCustomVerificationEmailTemplateCommandInput
  | UpdateEmailIdentityPolicyCommandInput
  | UpdateEmailTemplateCommandInput
  | UpdateReputationEntityCustomerManagedStatusCommandInput
  | UpdateReputationEntityPolicyCommandInput;
export type ServiceOutputTypes =
  | BatchGetMetricDataCommandOutput
  | CancelExportJobCommandOutput
  | CreateConfigurationSetCommandOutput
  | CreateConfigurationSetEventDestinationCommandOutput
  | CreateContactCommandOutput
  | CreateContactListCommandOutput
  | CreateCustomVerificationEmailTemplateCommandOutput
  | CreateDedicatedIpPoolCommandOutput
  | CreateDeliverabilityTestReportCommandOutput
  | CreateEmailIdentityCommandOutput
  | CreateEmailIdentityPolicyCommandOutput
  | CreateEmailTemplateCommandOutput
  | CreateExportJobCommandOutput
  | CreateImportJobCommandOutput
  | CreateMultiRegionEndpointCommandOutput
  | CreateTenantCommandOutput
  | CreateTenantResourceAssociationCommandOutput
  | DeleteConfigurationSetCommandOutput
  | DeleteConfigurationSetEventDestinationCommandOutput
  | DeleteContactCommandOutput
  | DeleteContactListCommandOutput
  | DeleteCustomVerificationEmailTemplateCommandOutput
  | DeleteDedicatedIpPoolCommandOutput
  | DeleteEmailIdentityCommandOutput
  | DeleteEmailIdentityPolicyCommandOutput
  | DeleteEmailTemplateCommandOutput
  | DeleteMultiRegionEndpointCommandOutput
  | DeleteSuppressedDestinationCommandOutput
  | DeleteTenantCommandOutput
  | DeleteTenantResourceAssociationCommandOutput
  | GetAccountCommandOutput
  | GetBlacklistReportsCommandOutput
  | GetConfigurationSetCommandOutput
  | GetConfigurationSetEventDestinationsCommandOutput
  | GetContactCommandOutput
  | GetContactListCommandOutput
  | GetCustomVerificationEmailTemplateCommandOutput
  | GetDedicatedIpCommandOutput
  | GetDedicatedIpPoolCommandOutput
  | GetDedicatedIpsCommandOutput
  | GetDeliverabilityDashboardOptionsCommandOutput
  | GetDeliverabilityTestReportCommandOutput
  | GetDomainDeliverabilityCampaignCommandOutput
  | GetDomainStatisticsReportCommandOutput
  | GetEmailIdentityCommandOutput
  | GetEmailIdentityPoliciesCommandOutput
  | GetEmailTemplateCommandOutput
  | GetExportJobCommandOutput
  | GetImportJobCommandOutput
  | GetMessageInsightsCommandOutput
  | GetMultiRegionEndpointCommandOutput
  | GetReputationEntityCommandOutput
  | GetSuppressedDestinationCommandOutput
  | GetTenantCommandOutput
  | ListConfigurationSetsCommandOutput
  | ListContactListsCommandOutput
  | ListContactsCommandOutput
  | ListCustomVerificationEmailTemplatesCommandOutput
  | ListDedicatedIpPoolsCommandOutput
  | ListDeliverabilityTestReportsCommandOutput
  | ListDomainDeliverabilityCampaignsCommandOutput
  | ListEmailIdentitiesCommandOutput
  | ListEmailTemplatesCommandOutput
  | ListExportJobsCommandOutput
  | ListImportJobsCommandOutput
  | ListMultiRegionEndpointsCommandOutput
  | ListRecommendationsCommandOutput
  | ListReputationEntitiesCommandOutput
  | ListResourceTenantsCommandOutput
  | ListSuppressedDestinationsCommandOutput
  | ListTagsForResourceCommandOutput
  | ListTenantResourcesCommandOutput
  | ListTenantsCommandOutput
  | PutAccountDedicatedIpWarmupAttributesCommandOutput
  | PutAccountDetailsCommandOutput
  | PutAccountSendingAttributesCommandOutput
  | PutAccountSuppressionAttributesCommandOutput
  | PutAccountVdmAttributesCommandOutput
  | PutConfigurationSetArchivingOptionsCommandOutput
  | PutConfigurationSetDeliveryOptionsCommandOutput
  | PutConfigurationSetReputationOptionsCommandOutput
  | PutConfigurationSetSendingOptionsCommandOutput
  | PutConfigurationSetSuppressionOptionsCommandOutput
  | PutConfigurationSetTrackingOptionsCommandOutput
  | PutConfigurationSetVdmOptionsCommandOutput
  | PutDedicatedIpInPoolCommandOutput
  | PutDedicatedIpPoolScalingAttributesCommandOutput
  | PutDedicatedIpWarmupAttributesCommandOutput
  | PutDeliverabilityDashboardOptionCommandOutput
  | PutEmailIdentityConfigurationSetAttributesCommandOutput
  | PutEmailIdentityDkimAttributesCommandOutput
  | PutEmailIdentityDkimSigningAttributesCommandOutput
  | PutEmailIdentityFeedbackAttributesCommandOutput
  | PutEmailIdentityMailFromAttributesCommandOutput
  | PutSuppressedDestinationCommandOutput
  | SendBulkEmailCommandOutput
  | SendCustomVerificationEmailCommandOutput
  | SendEmailCommandOutput
  | TagResourceCommandOutput
  | TestRenderEmailTemplateCommandOutput
  | UntagResourceCommandOutput
  | UpdateConfigurationSetEventDestinationCommandOutput
  | UpdateContactCommandOutput
  | UpdateContactListCommandOutput
  | UpdateCustomVerificationEmailTemplateCommandOutput
  | UpdateEmailIdentityPolicyCommandOutput
  | UpdateEmailTemplateCommandOutput
  | UpdateReputationEntityCustomerManagedStatusCommandOutput
  | UpdateReputationEntityPolicyCommandOutput;
export interface ClientDefaults
  extends Partial<__SmithyConfiguration<__HttpHandlerOptions>> {
  requestHandler?: __HttpHandlerUserInput;
  sha256?: __ChecksumConstructor | __HashConstructor;
  urlParser?: __UrlParser;
  bodyLengthChecker?: __BodyLengthCalculator;
  streamCollector?: __StreamCollector;
  base64Decoder?: __Decoder;
  base64Encoder?: __Encoder;
  utf8Decoder?: __Decoder;
  utf8Encoder?: __Encoder;
  runtime?: string;
  disableHostPrefix?: boolean;
  serviceId?: string;
  useDualstackEndpoint?: boolean | __Provider<boolean>;
  useFipsEndpoint?: boolean | __Provider<boolean>;
  region?: string | __Provider<string>;
  profile?: string;
  defaultUserAgentProvider?: Provider<__UserAgent>;
  credentialDefaultProvider?: (input: any) => AwsCredentialIdentityProvider;
  maxAttempts?: number | __Provider<number>;
  retryMode?: string | __Provider<string>;
  logger?: __Logger;
  extensions?: RuntimeExtension[];
  defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
}
export type SESv2ClientConfigType = Partial<
  __SmithyConfiguration<__HttpHandlerOptions>
> &
  ClientDefaults &
  UserAgentInputConfig &
  RetryInputConfig &
  RegionInputConfig &
  HostHeaderInputConfig &
  EndpointInputConfig<EndpointParameters> &
  HttpAuthSchemeInputConfig &
  ClientInputEndpointParameters;
export interface SESv2ClientConfig extends SESv2ClientConfigType {}
export type SESv2ClientResolvedConfigType =
  __SmithyResolvedConfiguration<__HttpHandlerOptions> &
    Required<ClientDefaults> &
    RuntimeExtensionsConfig &
    UserAgentResolvedConfig &
    RetryResolvedConfig &
    RegionResolvedConfig &
    HostHeaderResolvedConfig &
    EndpointResolvedConfig<EndpointParameters> &
    HttpAuthSchemeResolvedConfig &
    ClientResolvedEndpointParameters;
export interface SESv2ClientResolvedConfig
  extends SESv2ClientResolvedConfigType {}
export declare class SESv2Client extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig
> {
  readonly config: SESv2ClientResolvedConfig;
  constructor(
    ...[configuration]: __CheckOptionalClientConfig<SESv2ClientConfig>
  );
  destroy(): void;
}
