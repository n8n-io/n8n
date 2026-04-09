import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeDataSourceRequest, DescribeDataSourceResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeDataSourceCommand}.
 */
export interface DescribeDataSourceCommandInput extends DescribeDataSourceRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeDataSourceCommand}.
 */
export interface DescribeDataSourceCommandOutput extends DescribeDataSourceResponse, __MetadataBearer {
}
declare const DescribeDataSourceCommand_base: {
    new (input: DescribeDataSourceCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDataSourceCommandInput, DescribeDataSourceCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeDataSourceCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDataSourceCommandInput, DescribeDataSourceCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about an Amazon Kendra data source connector.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeDataSourceCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeDataSourceCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeDataSourceRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 * };
 * const command = new DescribeDataSourceCommand(input);
 * const response = await client.send(command);
 * // { // DescribeDataSourceResponse
 * //   Id: "STRING_VALUE",
 * //   IndexId: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   Type: "S3" || "SHAREPOINT" || "DATABASE" || "SALESFORCE" || "ONEDRIVE" || "SERVICENOW" || "CUSTOM" || "CONFLUENCE" || "GOOGLEDRIVE" || "WEBCRAWLER" || "WORKDOCS" || "FSX" || "SLACK" || "BOX" || "QUIP" || "JIRA" || "GITHUB" || "ALFRESCO" || "TEMPLATE",
 * //   Configuration: { // DataSourceConfiguration
 * //     S3Configuration: { // S3DataSourceConfiguration
 * //       BucketName: "STRING_VALUE", // required
 * //       InclusionPrefixes: [ // DataSourceInclusionsExclusionsStrings
 * //         "STRING_VALUE",
 * //       ],
 * //       InclusionPatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ExclusionPatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       DocumentsMetadataConfiguration: { // DocumentsMetadataConfiguration
 * //         S3Prefix: "STRING_VALUE",
 * //       },
 * //       AccessControlListConfiguration: { // AccessControlListConfiguration
 * //         KeyPath: "STRING_VALUE",
 * //       },
 * //     },
 * //     SharePointConfiguration: { // SharePointConfiguration
 * //       SharePointVersion: "SHAREPOINT_2013" || "SHAREPOINT_2016" || "SHAREPOINT_ONLINE" || "SHAREPOINT_2019", // required
 * //       Urls: [ // SharePointUrlList // required
 * //         "STRING_VALUE",
 * //       ],
 * //       SecretArn: "STRING_VALUE", // required
 * //       CrawlAttachments: true || false,
 * //       UseChangeLog: true || false,
 * //       InclusionPatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ExclusionPatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       VpcConfiguration: { // DataSourceVpcConfiguration
 * //         SubnetIds: [ // SubnetIdList // required
 * //           "STRING_VALUE",
 * //         ],
 * //         SecurityGroupIds: [ // SecurityGroupIdList // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       FieldMappings: [ // DataSourceToIndexFieldMappingList
 * //         { // DataSourceToIndexFieldMapping
 * //           DataSourceFieldName: "STRING_VALUE", // required
 * //           DateFieldFormat: "STRING_VALUE",
 * //           IndexFieldName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       DocumentTitleFieldName: "STRING_VALUE",
 * //       DisableLocalGroups: true || false,
 * //       SslCertificateS3Path: { // S3Path
 * //         Bucket: "STRING_VALUE", // required
 * //         Key: "STRING_VALUE", // required
 * //       },
 * //       AuthenticationType: "HTTP_BASIC" || "OAUTH2",
 * //       ProxyConfiguration: { // ProxyConfiguration
 * //         Host: "STRING_VALUE", // required
 * //         Port: Number("int"), // required
 * //         Credentials: "STRING_VALUE",
 * //       },
 * //     },
 * //     DatabaseConfiguration: { // DatabaseConfiguration
 * //       DatabaseEngineType: "RDS_AURORA_MYSQL" || "RDS_AURORA_POSTGRESQL" || "RDS_MYSQL" || "RDS_POSTGRESQL", // required
 * //       ConnectionConfiguration: { // ConnectionConfiguration
 * //         DatabaseHost: "STRING_VALUE", // required
 * //         DatabasePort: Number("int"), // required
 * //         DatabaseName: "STRING_VALUE", // required
 * //         TableName: "STRING_VALUE", // required
 * //         SecretArn: "STRING_VALUE", // required
 * //       },
 * //       VpcConfiguration: {
 * //         SubnetIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //         SecurityGroupIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       ColumnConfiguration: { // ColumnConfiguration
 * //         DocumentIdColumnName: "STRING_VALUE", // required
 * //         DocumentDataColumnName: "STRING_VALUE", // required
 * //         DocumentTitleColumnName: "STRING_VALUE",
 * //         FieldMappings: [
 * //           {
 * //             DataSourceFieldName: "STRING_VALUE", // required
 * //             DateFieldFormat: "STRING_VALUE",
 * //             IndexFieldName: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //         ChangeDetectingColumns: [ // ChangeDetectingColumns // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       AclConfiguration: { // AclConfiguration
 * //         AllowedGroupsColumnName: "STRING_VALUE", // required
 * //       },
 * //       SqlConfiguration: { // SqlConfiguration
 * //         QueryIdentifiersEnclosingOption: "DOUBLE_QUOTES" || "NONE",
 * //       },
 * //     },
 * //     SalesforceConfiguration: { // SalesforceConfiguration
 * //       ServerUrl: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       StandardObjectConfigurations: [ // SalesforceStandardObjectConfigurationList
 * //         { // SalesforceStandardObjectConfiguration
 * //           Name: "ACCOUNT" || "CAMPAIGN" || "CASE" || "CONTACT" || "CONTRACT" || "DOCUMENT" || "GROUP" || "IDEA" || "LEAD" || "OPPORTUNITY" || "PARTNER" || "PRICEBOOK" || "PRODUCT" || "PROFILE" || "SOLUTION" || "TASK" || "USER", // required
 * //           DocumentDataFieldName: "STRING_VALUE", // required
 * //           DocumentTitleFieldName: "STRING_VALUE",
 * //           FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //         },
 * //       ],
 * //       KnowledgeArticleConfiguration: { // SalesforceKnowledgeArticleConfiguration
 * //         IncludedStates: [ // SalesforceKnowledgeArticleStateList // required
 * //           "DRAFT" || "PUBLISHED" || "ARCHIVED",
 * //         ],
 * //         StandardKnowledgeArticleTypeConfiguration: { // SalesforceStandardKnowledgeArticleTypeConfiguration
 * //           DocumentDataFieldName: "STRING_VALUE", // required
 * //           DocumentTitleFieldName: "STRING_VALUE",
 * //           FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //         },
 * //         CustomKnowledgeArticleTypeConfigurations: [ // SalesforceCustomKnowledgeArticleTypeConfigurationList
 * //           { // SalesforceCustomKnowledgeArticleTypeConfiguration
 * //             Name: "STRING_VALUE", // required
 * //             DocumentDataFieldName: "STRING_VALUE", // required
 * //             DocumentTitleFieldName: "STRING_VALUE",
 * //             FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //           },
 * //         ],
 * //       },
 * //       ChatterFeedConfiguration: { // SalesforceChatterFeedConfiguration
 * //         DocumentDataFieldName: "STRING_VALUE", // required
 * //         DocumentTitleFieldName: "STRING_VALUE",
 * //         FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //         IncludeFilterTypes: [ // SalesforceChatterFeedIncludeFilterTypes
 * //           "ACTIVE_USER" || "STANDARD_USER",
 * //         ],
 * //       },
 * //       CrawlAttachments: true || false,
 * //       StandardObjectAttachmentConfiguration: { // SalesforceStandardObjectAttachmentConfiguration
 * //         DocumentTitleFieldName: "STRING_VALUE",
 * //         FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       },
 * //       IncludeAttachmentFilePatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExcludeAttachmentFilePatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //     },
 * //     OneDriveConfiguration: { // OneDriveConfiguration
 * //       TenantDomain: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       OneDriveUsers: { // OneDriveUsers
 * //         OneDriveUserList: [ // OneDriveUserList
 * //           "STRING_VALUE",
 * //         ],
 * //         OneDriveUserS3Path: {
 * //           Bucket: "STRING_VALUE", // required
 * //           Key: "STRING_VALUE", // required
 * //         },
 * //       },
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       DisableLocalGroups: true || false,
 * //     },
 * //     ServiceNowConfiguration: { // ServiceNowConfiguration
 * //       HostUrl: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       ServiceNowBuildVersion: "LONDON" || "OTHERS", // required
 * //       KnowledgeArticleConfiguration: { // ServiceNowKnowledgeArticleConfiguration
 * //         CrawlAttachments: true || false,
 * //         IncludeAttachmentFilePatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //         ExcludeAttachmentFilePatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //         DocumentDataFieldName: "STRING_VALUE", // required
 * //         DocumentTitleFieldName: "STRING_VALUE",
 * //         FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //         FilterQuery: "STRING_VALUE",
 * //       },
 * //       ServiceCatalogConfiguration: { // ServiceNowServiceCatalogConfiguration
 * //         CrawlAttachments: true || false,
 * //         IncludeAttachmentFilePatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //         ExcludeAttachmentFilePatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //         DocumentDataFieldName: "STRING_VALUE", // required
 * //         DocumentTitleFieldName: "STRING_VALUE",
 * //         FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       },
 * //       AuthenticationType: "HTTP_BASIC" || "OAUTH2",
 * //     },
 * //     ConfluenceConfiguration: { // ConfluenceConfiguration
 * //       ServerUrl: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       Version: "CLOUD" || "SERVER", // required
 * //       SpaceConfiguration: { // ConfluenceSpaceConfiguration
 * //         CrawlPersonalSpaces: true || false,
 * //         CrawlArchivedSpaces: true || false,
 * //         IncludeSpaces: [ // ConfluenceSpaceList
 * //           "STRING_VALUE",
 * //         ],
 * //         ExcludeSpaces: [
 * //           "STRING_VALUE",
 * //         ],
 * //         SpaceFieldMappings: [ // ConfluenceSpaceFieldMappingsList
 * //           { // ConfluenceSpaceToIndexFieldMapping
 * //             DataSourceFieldName: "DISPLAY_URL" || "ITEM_TYPE" || "SPACE_KEY" || "URL",
 * //             DateFieldFormat: "STRING_VALUE",
 * //             IndexFieldName: "STRING_VALUE",
 * //           },
 * //         ],
 * //       },
 * //       PageConfiguration: { // ConfluencePageConfiguration
 * //         PageFieldMappings: [ // ConfluencePageFieldMappingsList
 * //           { // ConfluencePageToIndexFieldMapping
 * //             DataSourceFieldName: "AUTHOR" || "CONTENT_STATUS" || "CREATED_DATE" || "DISPLAY_URL" || "ITEM_TYPE" || "LABELS" || "MODIFIED_DATE" || "PARENT_ID" || "SPACE_KEY" || "SPACE_NAME" || "URL" || "VERSION",
 * //             DateFieldFormat: "STRING_VALUE",
 * //             IndexFieldName: "STRING_VALUE",
 * //           },
 * //         ],
 * //       },
 * //       BlogConfiguration: { // ConfluenceBlogConfiguration
 * //         BlogFieldMappings: [ // ConfluenceBlogFieldMappingsList
 * //           { // ConfluenceBlogToIndexFieldMapping
 * //             DataSourceFieldName: "AUTHOR" || "DISPLAY_URL" || "ITEM_TYPE" || "LABELS" || "PUBLISH_DATE" || "SPACE_KEY" || "SPACE_NAME" || "URL" || "VERSION",
 * //             DateFieldFormat: "STRING_VALUE",
 * //             IndexFieldName: "STRING_VALUE",
 * //           },
 * //         ],
 * //       },
 * //       AttachmentConfiguration: { // ConfluenceAttachmentConfiguration
 * //         CrawlAttachments: true || false,
 * //         AttachmentFieldMappings: [ // ConfluenceAttachmentFieldMappingsList
 * //           { // ConfluenceAttachmentToIndexFieldMapping
 * //             DataSourceFieldName: "AUTHOR" || "CONTENT_TYPE" || "CREATED_DATE" || "DISPLAY_URL" || "FILE_SIZE" || "ITEM_TYPE" || "PARENT_ID" || "SPACE_KEY" || "SPACE_NAME" || "URL" || "VERSION",
 * //             DateFieldFormat: "STRING_VALUE",
 * //             IndexFieldName: "STRING_VALUE",
 * //           },
 * //         ],
 * //       },
 * //       VpcConfiguration: {
 * //         SubnetIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //         SecurityGroupIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ProxyConfiguration: {
 * //         Host: "STRING_VALUE", // required
 * //         Port: Number("int"), // required
 * //         Credentials: "STRING_VALUE",
 * //       },
 * //       AuthenticationType: "HTTP_BASIC" || "PAT",
 * //     },
 * //     GoogleDriveConfiguration: { // GoogleDriveConfiguration
 * //       SecretArn: "STRING_VALUE", // required
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       ExcludeMimeTypes: [ // ExcludeMimeTypesList
 * //         "STRING_VALUE",
 * //       ],
 * //       ExcludeUserAccounts: [ // ExcludeUserAccountsList
 * //         "STRING_VALUE",
 * //       ],
 * //       ExcludeSharedDrives: [ // ExcludeSharedDrivesList
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //     WebCrawlerConfiguration: { // WebCrawlerConfiguration
 * //       Urls: { // Urls
 * //         SeedUrlConfiguration: { // SeedUrlConfiguration
 * //           SeedUrls: [ // SeedUrlList // required
 * //             "STRING_VALUE",
 * //           ],
 * //           WebCrawlerMode: "HOST_ONLY" || "SUBDOMAINS" || "EVERYTHING",
 * //         },
 * //         SiteMapsConfiguration: { // SiteMapsConfiguration
 * //           SiteMaps: [ // SiteMapsList // required
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //       },
 * //       CrawlDepth: Number("int"),
 * //       MaxLinksPerPage: Number("int"),
 * //       MaxContentSizePerPageInMegaBytes: Number("float"),
 * //       MaxUrlsPerMinuteCrawlRate: Number("int"),
 * //       UrlInclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       UrlExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ProxyConfiguration: {
 * //         Host: "STRING_VALUE", // required
 * //         Port: Number("int"), // required
 * //         Credentials: "STRING_VALUE",
 * //       },
 * //       AuthenticationConfiguration: { // AuthenticationConfiguration
 * //         BasicAuthentication: [ // BasicAuthenticationConfigurationList
 * //           { // BasicAuthenticationConfiguration
 * //             Host: "STRING_VALUE", // required
 * //             Port: Number("int"), // required
 * //             Credentials: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //     },
 * //     WorkDocsConfiguration: { // WorkDocsConfiguration
 * //       OrganizationId: "STRING_VALUE", // required
 * //       CrawlComments: true || false,
 * //       UseChangeLog: true || false,
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //     },
 * //     FsxConfiguration: { // FsxConfiguration
 * //       FileSystemId: "STRING_VALUE", // required
 * //       FileSystemType: "WINDOWS", // required
 * //       VpcConfiguration: {
 * //         SubnetIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //         SecurityGroupIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       SecretArn: "STRING_VALUE",
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //     },
 * //     SlackConfiguration: { // SlackConfiguration
 * //       TeamId: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       VpcConfiguration: {
 * //         SubnetIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //         SecurityGroupIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       SlackEntityList: [ // SlackEntityList // required
 * //         "PUBLIC_CHANNEL" || "PRIVATE_CHANNEL" || "GROUP_MESSAGE" || "DIRECT_MESSAGE",
 * //       ],
 * //       UseChangeLog: true || false,
 * //       CrawlBotMessage: true || false,
 * //       ExcludeArchived: true || false,
 * //       SinceCrawlDate: "STRING_VALUE", // required
 * //       LookBackPeriod: Number("int"),
 * //       PrivateChannelFilter: [ // PrivateChannelFilter
 * //         "STRING_VALUE",
 * //       ],
 * //       PublicChannelFilter: [ // PublicChannelFilter
 * //         "STRING_VALUE",
 * //       ],
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       FieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //     },
 * //     BoxConfiguration: { // BoxConfiguration
 * //       EnterpriseId: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       UseChangeLog: true || false,
 * //       CrawlComments: true || false,
 * //       CrawlTasks: true || false,
 * //       CrawlWebLinks: true || false,
 * //       FileFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       TaskFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       CommentFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       WebLinkFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       VpcConfiguration: "<DataSourceVpcConfiguration>",
 * //     },
 * //     QuipConfiguration: { // QuipConfiguration
 * //       Domain: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       CrawlFileComments: true || false,
 * //       CrawlChatRooms: true || false,
 * //       CrawlAttachments: true || false,
 * //       FolderIds: [ // FolderIdList
 * //         "STRING_VALUE",
 * //       ],
 * //       ThreadFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       MessageFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       AttachmentFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       VpcConfiguration: "<DataSourceVpcConfiguration>",
 * //     },
 * //     JiraConfiguration: { // JiraConfiguration
 * //       JiraAccountUrl: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       UseChangeLog: true || false,
 * //       Project: [ // Project
 * //         "STRING_VALUE",
 * //       ],
 * //       IssueType: [ // IssueType
 * //         "STRING_VALUE",
 * //       ],
 * //       Status: [ // JiraStatus
 * //         "STRING_VALUE",
 * //       ],
 * //       IssueSubEntityFilter: [ // IssueSubEntityFilter
 * //         "COMMENTS" || "ATTACHMENTS" || "WORKLOGS",
 * //       ],
 * //       AttachmentFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       CommentFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       IssueFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       ProjectFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       WorkLogFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       VpcConfiguration: "<DataSourceVpcConfiguration>",
 * //     },
 * //     GitHubConfiguration: { // GitHubConfiguration
 * //       SaaSConfiguration: { // SaaSConfiguration
 * //         OrganizationName: "STRING_VALUE", // required
 * //         HostUrl: "STRING_VALUE", // required
 * //       },
 * //       OnPremiseConfiguration: { // OnPremiseConfiguration
 * //         HostUrl: "STRING_VALUE", // required
 * //         OrganizationName: "STRING_VALUE", // required
 * //         SslCertificateS3Path: {
 * //           Bucket: "STRING_VALUE", // required
 * //           Key: "STRING_VALUE", // required
 * //         },
 * //       },
 * //       Type: "SAAS" || "ON_PREMISE",
 * //       SecretArn: "STRING_VALUE", // required
 * //       UseChangeLog: true || false,
 * //       GitHubDocumentCrawlProperties: { // GitHubDocumentCrawlProperties
 * //         CrawlRepositoryDocuments: true || false,
 * //         CrawlIssue: true || false,
 * //         CrawlIssueComment: true || false,
 * //         CrawlIssueCommentAttachment: true || false,
 * //         CrawlPullRequest: true || false,
 * //         CrawlPullRequestComment: true || false,
 * //         CrawlPullRequestCommentAttachment: true || false,
 * //       },
 * //       RepositoryFilter: [ // RepositoryNames
 * //         "STRING_VALUE",
 * //       ],
 * //       InclusionFolderNamePatterns: [ // StringList
 * //         "STRING_VALUE",
 * //       ],
 * //       InclusionFileTypePatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       InclusionFileNamePatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ExclusionFolderNamePatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ExclusionFileTypePatterns: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ExclusionFileNamePatterns: "<StringList>",
 * //       VpcConfiguration: "<DataSourceVpcConfiguration>",
 * //       GitHubRepositoryConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubCommitConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubIssueDocumentConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubIssueCommentConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubIssueAttachmentConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubPullRequestCommentConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubPullRequestDocumentConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       GitHubPullRequestDocumentAttachmentConfigurationFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //     },
 * //     AlfrescoConfiguration: { // AlfrescoConfiguration
 * //       SiteUrl: "STRING_VALUE", // required
 * //       SiteId: "STRING_VALUE", // required
 * //       SecretArn: "STRING_VALUE", // required
 * //       SslCertificateS3Path: {
 * //         Bucket: "STRING_VALUE", // required
 * //         Key: "STRING_VALUE", // required
 * //       },
 * //       CrawlSystemFolders: true || false,
 * //       CrawlComments: true || false,
 * //       EntityFilter: [ // EntityFilter
 * //         "wiki" || "blog" || "documentLibrary",
 * //       ],
 * //       DocumentLibraryFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       BlogFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       WikiFieldMappings: "<DataSourceToIndexFieldMappingList>",
 * //       InclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       ExclusionPatterns: "<DataSourceInclusionsExclusionsStrings>",
 * //       VpcConfiguration: "<DataSourceVpcConfiguration>",
 * //     },
 * //     TemplateConfiguration: { // TemplateConfiguration
 * //       Template: "DOCUMENT_VALUE",
 * //     },
 * //   },
 * //   VpcConfiguration: "<DataSourceVpcConfiguration>",
 * //   CreatedAt: new Date("TIMESTAMP"),
 * //   UpdatedAt: new Date("TIMESTAMP"),
 * //   Description: "STRING_VALUE",
 * //   Status: "CREATING" || "DELETING" || "FAILED" || "UPDATING" || "ACTIVE",
 * //   Schedule: "STRING_VALUE",
 * //   RoleArn: "STRING_VALUE",
 * //   ErrorMessage: "STRING_VALUE",
 * //   LanguageCode: "STRING_VALUE",
 * //   CustomDocumentEnrichmentConfiguration: { // CustomDocumentEnrichmentConfiguration
 * //     InlineConfigurations: [ // InlineCustomDocumentEnrichmentConfigurationList
 * //       { // InlineCustomDocumentEnrichmentConfiguration
 * //         Condition: { // DocumentAttributeCondition
 * //           ConditionDocumentAttributeKey: "STRING_VALUE", // required
 * //           Operator: "GreaterThan" || "GreaterThanOrEquals" || "LessThan" || "LessThanOrEquals" || "Equals" || "NotEquals" || "Contains" || "NotContains" || "Exists" || "NotExists" || "BeginsWith", // required
 * //           ConditionOnValue: { // DocumentAttributeValue
 * //             StringValue: "STRING_VALUE",
 * //             StringListValue: [ // DocumentAttributeStringListValue
 * //               "STRING_VALUE",
 * //             ],
 * //             LongValue: Number("long"),
 * //             DateValue: new Date("TIMESTAMP"),
 * //           },
 * //         },
 * //         Target: { // DocumentAttributeTarget
 * //           TargetDocumentAttributeKey: "STRING_VALUE",
 * //           TargetDocumentAttributeValueDeletion: true || false,
 * //           TargetDocumentAttributeValue: {
 * //             StringValue: "STRING_VALUE",
 * //             StringListValue: [
 * //               "STRING_VALUE",
 * //             ],
 * //             LongValue: Number("long"),
 * //             DateValue: new Date("TIMESTAMP"),
 * //           },
 * //         },
 * //         DocumentContentDeletion: true || false,
 * //       },
 * //     ],
 * //     PreExtractionHookConfiguration: { // HookConfiguration
 * //       InvocationCondition: {
 * //         ConditionDocumentAttributeKey: "STRING_VALUE", // required
 * //         Operator: "GreaterThan" || "GreaterThanOrEquals" || "LessThan" || "LessThanOrEquals" || "Equals" || "NotEquals" || "Contains" || "NotContains" || "Exists" || "NotExists" || "BeginsWith", // required
 * //         ConditionOnValue: {
 * //           StringValue: "STRING_VALUE",
 * //           StringListValue: [
 * //             "STRING_VALUE",
 * //           ],
 * //           LongValue: Number("long"),
 * //           DateValue: new Date("TIMESTAMP"),
 * //         },
 * //       },
 * //       LambdaArn: "STRING_VALUE", // required
 * //       S3Bucket: "STRING_VALUE", // required
 * //     },
 * //     PostExtractionHookConfiguration: {
 * //       InvocationCondition: {
 * //         ConditionDocumentAttributeKey: "STRING_VALUE", // required
 * //         Operator: "GreaterThan" || "GreaterThanOrEquals" || "LessThan" || "LessThanOrEquals" || "Equals" || "NotEquals" || "Contains" || "NotContains" || "Exists" || "NotExists" || "BeginsWith", // required
 * //         ConditionOnValue: {
 * //           StringValue: "STRING_VALUE",
 * //           StringListValue: [
 * //             "STRING_VALUE",
 * //           ],
 * //           LongValue: Number("long"),
 * //           DateValue: new Date("TIMESTAMP"),
 * //         },
 * //       },
 * //       LambdaArn: "STRING_VALUE", // required
 * //       S3Bucket: "STRING_VALUE", // required
 * //     },
 * //     RoleArn: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeDataSourceCommandInput - {@link DescribeDataSourceCommandInput}
 * @returns {@link DescribeDataSourceCommandOutput}
 * @see {@link DescribeDataSourceCommandInput} for command's `input` shape.
 * @see {@link DescribeDataSourceCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 *
 * @throws {@link KendraServiceException}
 * <p>Base exception class for all service exceptions from Kendra service.</p>
 *
 *
 * @public
 */
export declare class DescribeDataSourceCommand extends DescribeDataSourceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeDataSourceRequest;
            output: DescribeDataSourceResponse;
        };
        sdk: {
            input: DescribeDataSourceCommandInput;
            output: DescribeDataSourceCommandOutput;
        };
    };
}
