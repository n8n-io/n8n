import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { DocumentType as __DocumentType } from "@smithy/types";
import { KendraServiceException as __BaseException } from "./KendraServiceException";
/**
 * <p>Summary information on an access control configuration that you created for your
 *             documents in an index.</p>
 * @public
 */
export interface AccessControlConfigurationSummary {
    /**
     * <p>The identifier of the access control configuration.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * <p>Access Control List files for the documents in a data source. For the format of the
 *             file, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/s3-acl.html">Access control
 *                 for S3 data sources</a>.</p>
 * @public
 */
export interface AccessControlListConfiguration {
    /**
     * <p>Path to the Amazon S3 bucket that contains the ACL files.</p>
     * @public
     */
    KeyPath?: string | undefined;
}
/**
 * <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 * @public
 */
export declare class AccessDeniedException extends __BaseException {
    readonly name: "AccessDeniedException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
/**
 * <p>Provides information about the column that should be used for filtering the query
 *             response by groups.</p>
 * @public
 */
export interface AclConfiguration {
    /**
     * <p>A list of groups, separated by semi-colons, that filters a query response based on
     *             user context. The document is only returned to users that are in one of the groups
     *             specified in the <code>UserContext</code> field of the <code>Query</code> API.</p>
     * @public
     */
    AllowedGroupsColumnName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const HighlightType: {
    readonly STANDARD: "STANDARD";
    readonly THESAURUS_SYNONYM: "THESAURUS_SYNONYM";
};
/**
 * @public
 */
export type HighlightType = (typeof HighlightType)[keyof typeof HighlightType];
/**
 * <p>Provides information that you can use to highlight a search result so that your users
 *             can quickly identify terms in the response.</p>
 * @public
 */
export interface Highlight {
    /**
     * <p>The zero-based location in the response string where the highlight starts.</p>
     * @public
     */
    BeginOffset: number | undefined;
    /**
     * <p>The zero-based location in the response string where the highlight ends.</p>
     * @public
     */
    EndOffset: number | undefined;
    /**
     * <p>Indicates whether the response is the best response. True if this is the best
     *             response; otherwise, false.</p>
     * @public
     */
    TopAnswer?: boolean | undefined;
    /**
     * <p>The highlight type. </p>
     * @public
     */
    Type?: HighlightType | undefined;
}
/**
 * <p>Provides text and information about where to highlight the text.</p>
 * @public
 */
export interface TextWithHighlights {
    /**
     * <p>The text to display to the user.</p>
     * @public
     */
    Text?: string | undefined;
    /**
     * <p>The beginning and end of the text that should be highlighted.</p>
     * @public
     */
    Highlights?: Highlight[] | undefined;
}
/**
 * <p>An attribute returned with a document from a search.</p>
 * @public
 */
export interface AdditionalResultAttributeValue {
    /**
     * <p>The text associated with the attribute and information about the highlight to apply to
     *             the text.</p>
     * @public
     */
    TextWithHighlightsValue?: TextWithHighlights | undefined;
}
/**
 * @public
 * @enum
 */
export declare const AdditionalResultAttributeValueType: {
    readonly TEXT_WITH_HIGHLIGHTS_VALUE: "TEXT_WITH_HIGHLIGHTS_VALUE";
};
/**
 * @public
 */
export type AdditionalResultAttributeValueType = (typeof AdditionalResultAttributeValueType)[keyof typeof AdditionalResultAttributeValueType];
/**
 * <p>An attribute returned from an index query.</p>
 * @public
 */
export interface AdditionalResultAttribute {
    /**
     * <p>The key that identifies the attribute.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The data type of the <code>Value</code> property.</p>
     * @public
     */
    ValueType: AdditionalResultAttributeValueType | undefined;
    /**
     * <p>An object that contains the attribute value.</p>
     * @public
     */
    Value: AdditionalResultAttributeValue | undefined;
}
/**
 * <p>Maps attributes or field names of the documents synced from the data source
 *       to Amazon Kendra index field names. You can set up field mappings for each
 *       data source when calling <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_CreateDataSource.html">CreateDataSource</a>
 *       or <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_UpdateDataSource.html">UpdateDataSource</a> API. To create custom fields, use the <code>UpdateIndex</code>
 *       API to first create an index field and then map to the data source field. For more
 *       information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>.</p>
 * @public
 */
export interface DataSourceToIndexFieldMapping {
    /**
     * <p>The name of the field in the data source. You must first create the index field
     *       using the <code>UpdateIndex</code> API.</p>
     * @public
     */
    DataSourceFieldName: string | undefined;
    /**
     * <p>The format for date fields in the data source. If the field specified in
     *       <code>DataSourceFieldName</code> is a date field, you must specify the date
     *       format. If the field is not a date field, an exception is thrown.</p>
     * @public
     */
    DateFieldFormat?: string | undefined;
    /**
     * <p>The name of the index field to map to the data source field. The index field type
     *       must match the data source field type.</p>
     * @public
     */
    IndexFieldName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const AlfrescoEntity: {
    readonly blog: "blog";
    readonly documentLibrary: "documentLibrary";
    readonly wiki: "wiki";
};
/**
 * @public
 */
export type AlfrescoEntity = (typeof AlfrescoEntity)[keyof typeof AlfrescoEntity];
/**
 * <p>Information required to find a specific file in an Amazon S3 bucket.</p>
 * @public
 */
export interface S3Path {
    /**
     * <p>The name of the S3 bucket that contains the file.</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The name of the file.</p>
     * @public
     */
    Key: string | undefined;
}
/**
 * <p>Provides the configuration information to connect to an Amazon VPC.</p>
 * @public
 */
export interface DataSourceVpcConfiguration {
    /**
     * <p>A list of identifiers for subnets within your Amazon VPC. The subnets should be able to
     *       connect to each other in the VPC, and they should have outgoing access to the Internet through
     *       a NAT device.</p>
     * @public
     */
    SubnetIds: string[] | undefined;
    /**
     * <p>A list of identifiers of security groups within your Amazon VPC. The security groups
     *       should enable Amazon Kendra to connect to the data source.</p>
     * @public
     */
    SecurityGroupIds: string[] | undefined;
}
/**
 * <p>Provides the configuration information to connect to Alfresco as your data
 *             source.</p>
 *          <note>
 *             <p>Support for <code>AlfrescoConfiguration</code> ended May 2023.
 *                 We recommend migrating to or using the Alfresco data source template
 *                 schema / <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> API.</p>
 *          </note>
 * @public
 */
export interface AlfrescoConfiguration {
    /**
     * <p>The URL of the Alfresco site. For example,
     *             <i>https://hostname:8080</i>.</p>
     * @public
     */
    SiteUrl: string | undefined;
    /**
     * <p>The identifier of the Alfresco site. For example, <i>my-site</i>.</p>
     * @public
     */
    SiteId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             key-value pairs required to connect to your Alfresco data source. The secret must
     *             contain a JSON structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>username—The user name of the Alfresco account.</p>
     *             </li>
     *             <li>
     *                <p>password—The password of the Alfresco account.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>The path to the SSL certificate stored in an Amazon S3 bucket. You use this to
     *             connect to Alfresco if you require a secure SSL connection.</p>
     *          <p>You can simply generate a self-signed X509 certificate on any computer using OpenSSL.
     *             For an example of using OpenSSL to create an X509 certificate, see <a href="https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/configuring-https-ssl.html">Create and sign an X509 certificate</a>.</p>
     * @public
     */
    SslCertificateS3Path: S3Path | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index shared files.</p>
     * @public
     */
    CrawlSystemFolders?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index comments of blogs and other content.</p>
     * @public
     */
    CrawlComments?: boolean | undefined;
    /**
     * <p>Specify whether to index document libraries, wikis, or blogs. You can specify one or
     *             more of these options.</p>
     * @public
     */
    EntityFilter?: AlfrescoEntity[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Alfresco document libraries to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Alfresco fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html"> Mapping data source fields</a>. The
     *             Alfresco data source field names must exist in your Alfresco custom metadata.</p>
     * @public
     */
    DocumentLibraryFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Alfresco blogs to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Alfresco fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">
     *                 Mapping data source fields</a>. The Alfresco data source field names must exist
     *             in your Alfresco custom metadata.</p>
     * @public
     */
    BlogFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Alfresco wikis to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Alfresco fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">
     *                 Mapping data source fields</a>. The Alfresco data source field names must exist
     *             in your Alfresco custom metadata.</p>
     * @public
     */
    WikiFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain files in your Alfresco data
     *             source. Files that match the patterns are included in the index. Files that don't match
     *             the patterns are excluded from the index. If a file matches both an inclusion pattern
     *             and an exclusion pattern, the exclusion pattern takes precedence and the file isn't
     *             included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain files in your Alfresco data
     *             source. Files that match the patterns are excluded from the index. Files that don't
     *             match the patterns are included in the index. If a file matches both an inclusion
     *             pattern and an exclusion pattern, the exclusion pattern takes precedence and the file
     *             isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your Alfresco.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EntityType: {
    readonly GROUP: "GROUP";
    readonly USER: "USER";
};
/**
 * @public
 */
export type EntityType = (typeof EntityType)[keyof typeof EntityType];
/**
 * <p>Provides the configuration information for users or groups in
 *             your IAM Identity Center identity source to grant access your Amazon Kendra
 *             experience.</p>
 * @public
 */
export interface EntityConfiguration {
    /**
     * <p>The identifier of a user or group in your IAM Identity Center identity
     *             source. For example, a user ID could be an email.</p>
     * @public
     */
    EntityId: string | undefined;
    /**
     * <p>Specifies whether you are configuring a <code>User</code> or a
     *             <code>Group</code>.</p>
     * @public
     */
    EntityType: EntityType | undefined;
}
/**
 * @public
 */
export interface AssociateEntitiesToExperienceRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>Lists users or groups in your IAM Identity Center identity source.</p>
     * @public
     */
    EntityList: EntityConfiguration[] | undefined;
}
/**
 * <p>Information on the users or groups in your IAM Identity Center identity
 *             source that failed to properly configure with your Amazon Kendra experience.</p>
 * @public
 */
export interface FailedEntity {
    /**
     * <p>The identifier of the user or group in your IAM Identity Center identity
     *             source. For example, a user ID could be an email.</p>
     * @public
     */
    EntityId?: string | undefined;
    /**
     * <p>The reason the user or group in your IAM Identity Center identity source
     *             failed to properly configure with your Amazon Kendra experience.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * @public
 */
export interface AssociateEntitiesToExperienceResponse {
    /**
     * <p>Lists the users or groups in your IAM Identity Center identity source that
     *             failed to properly configure with your Amazon Kendra experience.</p>
     * @public
     */
    FailedEntityList?: FailedEntity[] | undefined;
}
/**
 * <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>The resource you want to use already exists. Please check you have provided the
 *             correct resource and try again.</p>
 * @public
 */
export declare class ResourceAlreadyExistException extends __BaseException {
    readonly name: "ResourceAlreadyExistException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceAlreadyExistException, __BaseException>);
}
/**
 * <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 * @public
 */
export declare class ResourceNotFoundException extends __BaseException {
    readonly name: "ResourceNotFoundException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>);
}
/**
 * <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 * @public
 */
export declare class ThrottlingException extends __BaseException {
    readonly name: "ThrottlingException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ThrottlingException, __BaseException>);
}
/**
 * <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 * @public
 */
export declare class ValidationException extends __BaseException {
    readonly name: "ValidationException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ValidationException, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const Persona: {
    readonly OWNER: "OWNER";
    readonly VIEWER: "VIEWER";
};
/**
 * @public
 */
export type Persona = (typeof Persona)[keyof typeof Persona];
/**
 * <p>Provides the configuration information for users or groups in your
 *             IAM Identity Center identity source for access to your Amazon Kendra experience.
 *             Specific permissions are defined for each user or group once they are
 *             granted access to your Amazon Kendra experience.</p>
 * @public
 */
export interface EntityPersonaConfiguration {
    /**
     * <p>The identifier of a user or group in your IAM Identity Center identity
     *             source. For example, a user ID could be an email.</p>
     * @public
     */
    EntityId: string | undefined;
    /**
     * <p>The persona that defines the specific permissions of the user or group
     *             in your IAM Identity Center identity source. The available personas or
     *             access roles are <code>Owner</code> and <code>Viewer</code>. For more
     *             information on these personas, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html#access-search-experience">Providing
     *                 access to your search page</a>.</p>
     * @public
     */
    Persona: Persona | undefined;
}
/**
 * @public
 */
export interface AssociatePersonasToEntitiesRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The personas that define the specific permissions of users or groups in
     *             your IAM Identity Center identity source. The available personas or access
     *             roles are <code>Owner</code> and <code>Viewer</code>. For more information
     *             on these personas, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html#access-search-experience">Providing
     *                 access to your search page</a>.</p>
     * @public
     */
    Personas: EntityPersonaConfiguration[] | undefined;
}
/**
 * @public
 */
export interface AssociatePersonasToEntitiesResponse {
    /**
     * <p>Lists the users or groups in your IAM Identity Center identity source that
     *             failed to properly configure with your Amazon Kendra experience.</p>
     * @public
     */
    FailedEntityList?: FailedEntity[] | undefined;
}
/**
 * <p>The value of a document attribute. You can only provide one value for a document
 *             attribute.</p>
 * @public
 */
export interface DocumentAttributeValue {
    /**
     * <p>A string, such as "department".</p>
     * @public
     */
    StringValue?: string | undefined;
    /**
     * <p>A list of strings. The default maximum length or number of strings is 10.</p>
     * @public
     */
    StringListValue?: string[] | undefined;
    /**
     * <p>A long integer value.</p>
     * @public
     */
    LongValue?: number | undefined;
    /**
     * <p>A date expressed as an ISO 8601 string.</p>
     *          <p>It is important for the time zone to be included in the ISO 8601 date-time format. For
     *             example, 2012-03-25T12:30:10+01:00 is the ISO 8601 date-time format for March 25th 2012
     *             at 12:30PM (plus 10 seconds) in Central European Time.</p>
     * @public
     */
    DateValue?: Date | undefined;
}
/**
 * <p>A document attribute or metadata field. To create custom document attributes, see
 *                 <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-attributes.html">Custom
 *                 attributes</a>.</p>
 * @public
 */
export interface DocumentAttribute {
    /**
     * <p>The identifier for the attribute.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The value of the attribute.</p>
     * @public
     */
    Value: DocumentAttributeValue | undefined;
}
/**
 * @public
 * @enum
 */
export declare const AttributeSuggestionsMode: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
};
/**
 * @public
 */
export type AttributeSuggestionsMode = (typeof AttributeSuggestionsMode)[keyof typeof AttributeSuggestionsMode];
/**
 * <p>Provides the configuration information for a document field/attribute that you want to base query
 *             suggestions on.</p>
 * @public
 */
export interface SuggestableConfig {
    /**
     * <p>The name of the document field/attribute.</p>
     * @public
     */
    AttributeName?: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> means the document field/attribute is suggestible, so the contents within the
     *             field can be used for query suggestions.</p>
     * @public
     */
    Suggestable?: boolean | undefined;
}
/**
 * <p>Gets information on the configuration of document fields/attributes that you want to base
 *             query suggestions on. To change your configuration, use <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_AttributeSuggestionsUpdateConfig.html">AttributeSuggestionsUpdateConfig</a> and then call <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateQuerySuggestionsConfig.html">UpdateQuerySuggestionsConfig</a>.</p>
 * @public
 */
export interface AttributeSuggestionsDescribeConfig {
    /**
     * <p>The list of fields/attributes that you want to set as suggestible for query suggestions.</p>
     * @public
     */
    SuggestableConfigList?: SuggestableConfig[] | undefined;
    /**
     * <p>The mode is set to either <code>ACTIVE</code> or <code>INACTIVE</code>. If the <code>Mode</code>
     *             for query history is set to <code>ENABLED</code> when calling <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateQuerySuggestionsConfig.html">UpdateQuerySuggestionsConfig</a>
     *             and <code>AttributeSuggestionsMode</code> to use fields/attributes is set to <code>ACTIVE</code>,
     *             and you haven't set your <code>SuggestionTypes</code> preference to <code>DOCUMENT_ATTRIBUTES</code>,
     *             then Amazon Kendra uses the query history.</p>
     * @public
     */
    AttributeSuggestionsMode?: AttributeSuggestionsMode | undefined;
}
/**
 * <p>Data source information for user context filtering.</p>
 * @public
 */
export interface DataSourceGroup {
    /**
     * <p>The identifier of the group you want to add to your list of groups. This is for
     *          filtering search results based on the groups' access to documents.</p>
     * @public
     */
    GroupId: string | undefined;
    /**
     * <p>The identifier of the data source group you want to add to your list of data source
     *          groups. This is for filtering search results based on the groups' access to documents in
     *          that data source.</p>
     * @public
     */
    DataSourceId: string | undefined;
}
/**
 * <p>Provides information about the user context for an Amazon Kendra index.</p>
 *          <p>User context filtering is a kind of personalized search with the benefit of controlling
 *          access to documents. For example, not all teams that search the company portal for
 *          information should access top-secret company documents, nor are these documents relevant to
 *          all users. Only specific users or groups of teams given access to top-secret documents
 *          should see these documents in their search results.</p>
 *          <p>You provide one of the following:</p>
 *          <ul>
 *             <li>
 *                <p>User token</p>
 *             </li>
 *             <li>
 *                <p>User ID, the groups the user belongs to, and any data sources the groups can
 *                access.</p>
 *             </li>
 *          </ul>
 *          <p>If you provide both, an exception is thrown.</p>
 *          <important>
 *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index, you can use
 *                <code>UserId</code>, <code>Groups</code>, and <code>DataSourceGroups</code> to filter
 *             content. If you set the <code>UserId</code> to a particular user ID, it also includes
 *             all public documents.</p>
 *             <p>Amazon Kendra Gen AI Enterprise Edition indices don't support token based document filtering.
 *             If you're using an Amazon Kendra Gen AI Enterprise Edition index, Amazon Kendra returns a
 *                <code>ValidationException</code> error if the <code>Token</code> field has a non-null
 *             value.</p>
 *          </important>
 * @public
 */
export interface UserContext {
    /**
     * <p>The user context token for filtering search results for a user. It must be a JWT or a
     *          JSON token.</p>
     * @public
     */
    Token?: string | undefined;
    /**
     * <p>The identifier of the user you want to filter search results based on their access to
     *          documents.</p>
     * @public
     */
    UserId?: string | undefined;
    /**
     * <p>The list of groups you want to filter search results based on the groups' access to
     *          documents.</p>
     * @public
     */
    Groups?: string[] | undefined;
    /**
     * <p>The list of data source groups you want to filter search results based on groups' access
     *          to documents in that data source.</p>
     * @public
     */
    DataSourceGroups?: DataSourceGroup[] | undefined;
}
/**
 * <p>Updates the configuration information for the document fields/attributes that you want
 *             to base query suggestions on.</p>
 *          <p>To deactivate using documents fields for query suggestions, set the mode to
 *             <code>INACTIVE</code>. You must also set <code>SuggestionTypes</code> as either
 *             <code>QUERY</code> or <code>DOCUMENT_ATTRIBUTES</code> and then call <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_GetQuerySuggestions.html">GetQuerySuggestions</a>. If you set to <code>QUERY</code>, then
 *             Amazon Kendra uses the query history to base suggestions on. If you set to
 *             <code>DOCUMENT_ATTRIBUTES</code>, then Amazon Kendra uses the contents of document
 *             fields to base suggestions on.</p>
 * @public
 */
export interface AttributeSuggestionsUpdateConfig {
    /**
     * <p>The list of fields/attributes that you want to set as suggestible for query
     *             suggestions.</p>
     * @public
     */
    SuggestableConfigList?: SuggestableConfig[] | undefined;
    /**
     * <p>You can set the mode to <code>ACTIVE</code> or <code>INACTIVE</code>. You must also set
     *             <code>SuggestionTypes</code> as either <code>QUERY</code> or <code>DOCUMENT_ATTRIBUTES</code>
     *             and then call <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_GetQuerySuggestions.html">GetQuerySuggestions</a>. If <code>Mode</code> to use query history is set to
     *             <code>ENABLED</code> when calling <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateQuerySuggestionsConfig.html">UpdateQuerySuggestionsConfig</a> and <code>AttributeSuggestionsMode</code> to use
     *             fields/attributes is set to <code>ACTIVE</code>, and you haven't set your
     *             <code>SuggestionTypes</code> preference to <code>DOCUMENT_ATTRIBUTES</code>, then
     *             Amazon Kendra uses the query history.</p>
     * @public
     */
    AttributeSuggestionsMode?: AttributeSuggestionsMode | undefined;
}
/**
 * <p>Provides the configuration information to connect to websites that require basic user
 *             authentication.</p>
 * @public
 */
export interface BasicAuthenticationConfiguration {
    /**
     * <p>The name of the website host you want to connect to using authentication
     *             credentials.</p>
     *          <p>For example, the host name of https://a.example.com/page1.html is
     *             "a.example.com".</p>
     * @public
     */
    Host: string | undefined;
    /**
     * <p>The port number of the website host you want to connect to using authentication
     *             credentials.</p>
     *          <p>For example, the port for https://a.example.com/page1.html is 443, the standard port
     *             for HTTPS.</p>
     * @public
     */
    Port: number | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret. You create a
     *             secret to store your credentials in <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html">Secrets Manager</a>
     *          </p>
     *          <p>You use a secret if basic authentication credentials are required to connect to a
     *             website. The secret stores your credentials of user name and password.</p>
     * @public
     */
    Credentials: string | undefined;
}
/**
 * <p>Provides the configuration information to connect to websites that require user
 *             authentication.</p>
 * @public
 */
export interface AuthenticationConfiguration {
    /**
     * <p>The list of configuration information that's required to connect to and crawl a
     *             website host using basic authentication credentials.</p>
     *          <p>The list includes the name and port number of the website host.</p>
     * @public
     */
    BasicAuthentication?: BasicAuthenticationConfiguration[] | undefined;
}
/**
 * <p>Maps a particular data source sync job to a particular data source.</p>
 * @public
 */
export interface DataSourceSyncJobMetricTarget {
    /**
     * <p>The ID of the data source that is running the sync job.</p>
     * @public
     */
    DataSourceId: string | undefined;
    /**
     * <p>The ID of the sync job that is running on the data source.</p>
     *          <p>If the ID of a sync job is not provided and there is a sync job running, then the ID of
     *       this sync job is used and metrics are generated for this sync job.</p>
     *          <p>If the ID of a sync job is not provided and there is no sync job running, then no metrics
     *       are generated and documents are indexed/deleted at the index level without sync job metrics
     *       included.</p>
     * @public
     */
    DataSourceSyncJobId?: string | undefined;
}
/**
 * @public
 */
export interface BatchDeleteDocumentRequest {
    /**
     * <p>The identifier of the index that contains the documents to delete.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>One or more identifiers for documents to delete from the index.</p>
     * @public
     */
    DocumentIdList: string[] | undefined;
    /**
     * <p>Maps a particular data source sync job to a particular data source.</p>
     * @public
     */
    DataSourceSyncJobMetricTarget?: DataSourceSyncJobMetricTarget | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ErrorCode: {
    readonly INTERNAL_ERROR: "InternalError";
    readonly INVALID_REQUEST: "InvalidRequest";
};
/**
 * @public
 */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
/**
 * <p>Provides information about documents that could not be removed from an index by the
 *                 <code>BatchDeleteDocument</code> API.</p>
 * @public
 */
export interface BatchDeleteDocumentResponseFailedDocument {
    /**
     * <p>The identifier of the document that couldn't be removed from the index.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p> The identifier of the data source connector that the document belongs to. </p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>The error code for why the document couldn't be removed from the index.</p>
     * @public
     */
    ErrorCode?: ErrorCode | undefined;
    /**
     * <p>An explanation for why the document couldn't be removed from the index.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * @public
 */
export interface BatchDeleteDocumentResponse {
    /**
     * <p>A list of documents that could not be removed from the index. Each entry contains an
     *             error message that indicates why the document couldn't be removed from the index.</p>
     * @public
     */
    FailedDocuments?: BatchDeleteDocumentResponseFailedDocument[] | undefined;
}
/**
 * <p>A conflict occurred with the request. Please fix any inconsistences with your
 *             resources and try again.</p>
 * @public
 */
export declare class ConflictException extends __BaseException {
    readonly name: "ConflictException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
/**
 * @public
 */
export interface BatchDeleteFeaturedResultsSetRequest {
    /**
     * <p>The identifier of the index used for featuring results.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifiers of the featured results sets that you want to delete.</p>
     * @public
     */
    FeaturedResultsSetIds: string[] | undefined;
}
/**
 * <p>Provides information about a set of featured results that couldn't be
 *             removed from an index by the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_BatchDeleteFeaturedResultsSet.html">BatchDeleteFeaturedResultsSet</a> API.</p>
 * @public
 */
export interface BatchDeleteFeaturedResultsSetError {
    /**
     * <p>The identifier of the set of featured results that couldn't be removed
     *             from the index.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The error code for why the set of featured results couldn't be removed
     *             from the index.</p>
     * @public
     */
    ErrorCode: ErrorCode | undefined;
    /**
     * <p>An explanation for why the set of featured results couldn't be removed
     *             from the index.</p>
     * @public
     */
    ErrorMessage: string | undefined;
}
/**
 * @public
 */
export interface BatchDeleteFeaturedResultsSetResponse {
    /**
     * <p>The list of errors for the featured results set IDs, explaining why they
     *             couldn't be removed from the index.</p>
     * @public
     */
    Errors: BatchDeleteFeaturedResultsSetError[] | undefined;
}
/**
 * <p>Identifies a document for which to retrieve status information</p>
 * @public
 */
export interface DocumentInfo {
    /**
     * <p>The identifier of the document.</p>
     * @public
     */
    DocumentId: string | undefined;
    /**
     * <p>Attributes that identify a specific version of a document to check.</p>
     *          <p>The only valid attributes are:</p>
     *          <ul>
     *             <li>
     *                <p>version</p>
     *             </li>
     *             <li>
     *                <p>datasourceId</p>
     *             </li>
     *             <li>
     *                <p>jobExecutionId</p>
     *             </li>
     *          </ul>
     *          <p>The attributes follow these rules:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>dataSourceId</code> and <code>jobExecutionId</code> must be used
     *                     together.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>version</code> is ignored if <code>dataSourceId</code> and
     *                         <code>jobExecutionId</code> are not provided.</p>
     *             </li>
     *             <li>
     *                <p>If <code>dataSourceId</code> and <code>jobExecutionId</code> are provided, but
     *                         <code>version</code> is not, the version defaults to "0".</p>
     *             </li>
     *          </ul>
     * @public
     */
    Attributes?: DocumentAttribute[] | undefined;
}
/**
 * @public
 */
export interface BatchGetDocumentStatusRequest {
    /**
     * <p>The identifier of the index to add documents to. The index ID is returned by the
     *                 <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_CreateIndex.html">CreateIndex
     *             </a> API.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A list of <code>DocumentInfo</code> objects that identify the documents for which to
     *             get the status. You identify the documents by their document ID and optional
     *             attributes.</p>
     * @public
     */
    DocumentInfoList: DocumentInfo[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DocumentStatus: {
    readonly FAILED: "FAILED";
    readonly INDEXED: "INDEXED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly PROCESSING: "PROCESSING";
    readonly UPDATED: "UPDATED";
    readonly UPDATE_FAILED: "UPDATE_FAILED";
};
/**
 * @public
 */
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
/**
 * <p>Provides information about the status of documents submitted for indexing.</p>
 * @public
 */
export interface Status {
    /**
     * <p>The identifier of the document.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p>The current status of a document.</p>
     *          <p>If the document was submitted for deletion, the status is <code>NOT_FOUND</code> after
     *             the document is deleted.</p>
     * @public
     */
    DocumentStatus?: DocumentStatus | undefined;
    /**
     * <p>Indicates the source of the error.</p>
     * @public
     */
    FailureCode?: string | undefined;
    /**
     * <p>Provides detailed information about why the document couldn't be indexed. Use this
     *             information to correct the error before you resubmit the document for indexing.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * <p>Provides a response when the status of a document could not be retrieved.</p>
 * @public
 */
export interface BatchGetDocumentStatusResponseError {
    /**
     * <p>The identifier of the document whose status could not be retrieved.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p> The identifier of the data source connector that the failed document belongs to.
     *         </p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>Indicates the source of the error.</p>
     * @public
     */
    ErrorCode?: ErrorCode | undefined;
    /**
     * <p>States that the API could not get the status of a document. This could be because the
     *             request is not valid or there is a system error.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * @public
 */
export interface BatchGetDocumentStatusResponse {
    /**
     * <p>A list of documents that Amazon Kendra couldn't get the status for. The list
     *             includes the ID of the document and the reason that the status couldn't be found.</p>
     * @public
     */
    Errors?: BatchGetDocumentStatusResponseError[] | undefined;
    /**
     * <p>The status of documents. The status indicates if the document is waiting to be
     *             indexed, is in the process of indexing, has completed indexing, or failed indexing. If a
     *             document failed indexing, the status provides the reason why.</p>
     * @public
     */
    DocumentStatusList?: Status[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ConditionOperator: {
    readonly BeginsWith: "BeginsWith";
    readonly Contains: "Contains";
    readonly Equals: "Equals";
    readonly Exists: "Exists";
    readonly GreaterThan: "GreaterThan";
    readonly GreaterThanOrEquals: "GreaterThanOrEquals";
    readonly LessThan: "LessThan";
    readonly LessThanOrEquals: "LessThanOrEquals";
    readonly NotContains: "NotContains";
    readonly NotEquals: "NotEquals";
    readonly NotExists: "NotExists";
};
/**
 * @public
 */
export type ConditionOperator = (typeof ConditionOperator)[keyof typeof ConditionOperator];
/**
 * <p>The condition used for the target document attribute or metadata field when ingesting
 *             documents into Amazon Kendra. You use this with <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_DocumentAttributeTarget.html">DocumentAttributeTarget to
 *                 apply the condition</a>.</p>
 *          <p>For example, you can create the 'Department' target field and have it prefill
 *             department names associated with the documents based on information in the 'Source_URI'
 *             field. Set the condition that if the 'Source_URI' field contains 'financial' in its URI
 *             value, then prefill the target field 'Department' with the target value 'Finance' for
 *             the document.</p>
 *          <p>Amazon Kendra cannot create a target field if it has not already been created as
 *             an index field. After you create your index field, you can create a document metadata
 *             field using <code>DocumentAttributeTarget</code>. Amazon Kendra then will map your
 *             newly created metadata field to your index field.</p>
 * @public
 */
export interface DocumentAttributeCondition {
    /**
     * <p>The identifier of the document attribute used for the condition.</p>
     *          <p>For example, 'Source_URI' could be an identifier for the attribute or metadata field
     *             that contains source URIs associated with the documents.</p>
     *          <p>Amazon Kendra currently does not support <code>_document_body</code> as an
     *             attribute key used for the condition.</p>
     * @public
     */
    ConditionDocumentAttributeKey: string | undefined;
    /**
     * <p>The condition operator.</p>
     *          <p>For example, you can use 'Contains' to partially match a string.</p>
     * @public
     */
    Operator: ConditionOperator | undefined;
    /**
     * <p>The value used by the operator.</p>
     *          <p>For example, you can specify the value 'financial' for strings in the 'Source_URI'
     *             field that partially match or contain this value.</p>
     * @public
     */
    ConditionOnValue?: DocumentAttributeValue | undefined;
}
/**
 * <p>The target document attribute or metadata field you want to alter when ingesting
 *             documents into Amazon Kendra.</p>
 *          <p>For example, you can delete customer identification numbers associated with the
 *             documents, stored in the document metadata field called 'Customer_ID'. You set the
 *             target key as 'Customer_ID' and the deletion flag to <code>TRUE</code>. This removes all
 *             customer ID values in the field 'Customer_ID'. This would scrub personally identifiable
 *             information from each document's metadata.</p>
 *          <p>Amazon Kendra cannot create a target field if it has not already been created as
 *             an index field. After you create your index field, you can create a document metadata
 *             field using <code>DocumentAttributeTarget</code>. Amazon Kendra then will map your
 *             newly created metadata field to your index field.</p>
 *          <p>You can also use this with <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_DocumentAttributeCondition.html">DocumentAttributeCondition</a>.</p>
 * @public
 */
export interface DocumentAttributeTarget {
    /**
     * <p>The identifier of the target document attribute or metadata field.</p>
     *          <p>For example, 'Department' could be an identifier for the target attribute or metadata
     *             field that includes the department names associated with the documents.</p>
     * @public
     */
    TargetDocumentAttributeKey?: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to delete the existing target value for your specified target
     *             attribute key. You cannot create a target value and set this to <code>TRUE</code>. To
     *             create a target value (<code>TargetDocumentAttributeValue</code>), set this to
     *                 <code>FALSE</code>.</p>
     * @public
     */
    TargetDocumentAttributeValueDeletion?: boolean | undefined;
    /**
     * <p>The target value you want to create for the target attribute.</p>
     *          <p>For example, 'Finance' could be the target value for the target attribute key
     *             'Department'.</p>
     * @public
     */
    TargetDocumentAttributeValue?: DocumentAttributeValue | undefined;
}
/**
 * <p>Provides the configuration information for applying basic logic to alter document
 *             metadata and content when ingesting documents into Amazon Kendra. To apply advanced
 *             logic, to go beyond what you can do with basic logic, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_HookConfiguration.html">HookConfiguration</a>.</p>
 *          <p>For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata
 *                 during the ingestion process</a>.</p>
 * @public
 */
export interface InlineCustomDocumentEnrichmentConfiguration {
    /**
     * <p>Configuration of the condition used for the target document attribute or metadata
     *             field when ingesting documents into Amazon Kendra.</p>
     * @public
     */
    Condition?: DocumentAttributeCondition | undefined;
    /**
     * <p>Configuration of the target document attribute or metadata field when ingesting
     *             documents into Amazon Kendra. You can also include a value.</p>
     * @public
     */
    Target?: DocumentAttributeTarget | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to delete content if the condition used for the target attribute is
     *             met.</p>
     * @public
     */
    DocumentContentDeletion?: boolean | undefined;
}
/**
 * <p>Provides the configuration information for invoking a Lambda function in Lambda to alter document metadata and content when ingesting documents into
 *                 Amazon Kendra. You can configure your Lambda function using <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_CustomDocumentEnrichmentConfiguration.html">PreExtractionHookConfiguration</a> if you want to apply advanced alterations on
 *             the original or raw documents. If you want to apply advanced alterations on the Amazon Kendra structured documents, you must configure your Lambda function using
 *                 <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_CustomDocumentEnrichmentConfiguration.html">PostExtractionHookConfiguration</a>. You can only invoke one Lambda function.
 *             However, this function can invoke other functions it requires.</p>
 *          <p>For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata
 *                 during the ingestion process</a>.</p>
 * @public
 */
export interface HookConfiguration {
    /**
     * <p>The condition used for when a Lambda function should be invoked.</p>
     *          <p>For example, you can specify a condition that if there are empty date-time values,
     *             then Amazon Kendra should invoke a function that inserts the current
     *             date-time.</p>
     * @public
     */
    InvocationCondition?: DocumentAttributeCondition | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to run a Lambda function
     *             during ingestion. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">an IAM roles for Amazon Kendra</a>.</p>
     * @public
     */
    LambdaArn: string | undefined;
    /**
     * <p>Stores the original, raw documents or the structured, parsed documents before and
     *             after altering them. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html#cde-data-contracts-lambda">Data contracts for Lambda functions</a>.</p>
     * @public
     */
    S3Bucket: string | undefined;
}
/**
 * <p>Provides the configuration information for altering document metadata and content
 *             during the document ingestion process.</p>
 *          <p>For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata
 *                 during the ingestion process</a>.</p>
 * @public
 */
export interface CustomDocumentEnrichmentConfiguration {
    /**
     * <p>Configuration information to alter document attributes or metadata fields and content
     *             when ingesting documents into Amazon Kendra.</p>
     * @public
     */
    InlineConfigurations?: InlineCustomDocumentEnrichmentConfiguration[] | undefined;
    /**
     * <p>Configuration information for invoking a Lambda function in Lambda on
     *             the original or raw documents before extracting their metadata and text. You can use a
     *             Lambda function to apply advanced logic for creating, modifying, or deleting document
     *             metadata and content. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html#advanced-data-manipulation">Advanced data manipulation</a>.</p>
     * @public
     */
    PreExtractionHookConfiguration?: HookConfiguration | undefined;
    /**
     * <p>Configuration information for invoking a Lambda function in Lambda on
     *             the structured documents with their metadata and text extracted. You can use a Lambda
     *             function to apply advanced logic for creating, modifying, or deleting document metadata
     *             and content. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html#advanced-data-manipulation">Advanced data manipulation</a>.</p>
     * @public
     */
    PostExtractionHookConfiguration?: HookConfiguration | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to run
     *                 <code>PreExtractionHookConfiguration</code> and
     *                 <code>PostExtractionHookConfiguration</code> for altering document metadata and
     *             content during the document ingestion process. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">an IAM roles for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReadAccessType: {
    readonly ALLOW: "ALLOW";
    readonly DENY: "DENY";
};
/**
 * @public
 */
export type ReadAccessType = (typeof ReadAccessType)[keyof typeof ReadAccessType];
/**
 * @public
 * @enum
 */
export declare const PrincipalType: {
    readonly GROUP: "GROUP";
    readonly USER: "USER";
};
/**
 * @public
 */
export type PrincipalType = (typeof PrincipalType)[keyof typeof PrincipalType];
/**
 * <p>Provides user and group information for <a href="https://docs.aws.amazon.com/kendra/latest/dg/user-context-filter.html">user context
 *             filtering</a>.</p>
 * @public
 */
export interface Principal {
    /**
     * <p>The name of the user or group.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The type of principal.</p>
     * @public
     */
    Type: PrincipalType | undefined;
    /**
     * <p>Whether to allow or deny document access to the principal.</p>
     * @public
     */
    Access: ReadAccessType | undefined;
    /**
     * <p>The identifier of the data source the principal should access documents from.</p>
     * @public
     */
    DataSourceId?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ContentType: {
    readonly CSV: "CSV";
    readonly HTML: "HTML";
    readonly JSON: "JSON";
    readonly MD: "MD";
    readonly MS_EXCEL: "MS_EXCEL";
    readonly MS_WORD: "MS_WORD";
    readonly PDF: "PDF";
    readonly PLAIN_TEXT: "PLAIN_TEXT";
    readonly PPT: "PPT";
    readonly RTF: "RTF";
    readonly XML: "XML";
    readonly XSLT: "XSLT";
};
/**
 * @public
 */
export type ContentType = (typeof ContentType)[keyof typeof ContentType];
/**
 * <p> Information to define the hierarchy for which documents users should have access to.
 *         </p>
 * @public
 */
export interface HierarchicalPrincipal {
    /**
     * <p>A list of <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Principal.html">principal</a> lists that define the hierarchy for which documents users should
     *             have access to. Each hierarchical list specifies which user or group has allow or deny
     *             access for each document.</p>
     * @public
     */
    PrincipalList: Principal[] | undefined;
}
/**
 * <p>A document in an index.</p>
 * @public
 */
export interface Document {
    /**
     * <p>A identifier of the document in the index.</p>
     *          <p>Note, each document ID must be unique per index. You cannot create a data source to
     *             index your documents with their unique IDs and then use the
     *                 <code>BatchPutDocument</code> API to index the same documents, or vice versa. You
     *             can delete a data source and then use the <code>BatchPutDocument</code> API to index the
     *             same documents, or vice versa.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The title of the document.</p>
     * @public
     */
    Title?: string | undefined;
    /**
     * <p>The contents of the document. </p>
     *          <p>Documents passed to the <code>Blob</code> parameter must be base64 encoded. Your code
     *             might not need to encode the document file bytes if you're using an Amazon Web Services
     *             SDK to call Amazon Kendra APIs. If you are calling the Amazon Kendra endpoint
     *             directly using REST, you must base64 encode the contents before sending.</p>
     * @public
     */
    Blob?: Uint8Array | undefined;
    /**
     * <p>Information required to find a specific file in an Amazon S3 bucket.</p>
     * @public
     */
    S3Path?: S3Path | undefined;
    /**
     * <p>Custom attributes to apply to the document. Use the custom attributes to provide
     *             additional information for searching, to provide facets for refining searches, and to
     *             provide additional information in the query response.</p>
     *          <p>For example, 'DataSourceId' and 'DataSourceSyncJobId' are custom attributes that
     *             provide information on the synchronization of documents running on a data source. Note,
     *             'DataSourceSyncJobId' could be an optional custom attribute as Amazon Kendra will use the ID of
     *             a running sync job.</p>
     * @public
     */
    Attributes?: DocumentAttribute[] | undefined;
    /**
     * <p>Information on principals (users and/or groups) and which documents they should have
     *             access to. This is useful for user context filtering, where search results are filtered
     *             based on the user or their group access to documents.</p>
     * @public
     */
    AccessControlList?: Principal[] | undefined;
    /**
     * <p>The list of <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Principal.html">principal</a> lists that define the hierarchy for which documents users should
     *             have access to.</p>
     * @public
     */
    HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
    /**
     * <p>The file type of the document in the <code>Blob</code> field.</p>
     *          <p>If you want to index snippets or subsets of HTML documents instead of the entirety of
     *             the HTML documents, you must add the <code>HTML</code> start and closing tags
     *                 (<code><HTML>content</HTML></code>) around the content.</p>
     * @public
     */
    ContentType?: ContentType | undefined;
    /**
     * <p>The identifier of the access control configuration that you want to apply to the
     *             document.</p>
     * @public
     */
    AccessControlConfigurationId?: string | undefined;
}
/**
 * @public
 */
export interface BatchPutDocumentRequest {
    /**
     * <p>The identifier of the index to add the documents to. You need to create the index
     *             first using the <code>CreateIndex</code> API.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *             your S3 bucket. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM access roles for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>One or more documents to add to the index.</p>
     *          <p>Documents have the following file size limits.</p>
     *          <ul>
     *             <li>
     *                <p>50 MB total size for any file</p>
     *             </li>
     *             <li>
     *                <p>5 MB extracted text for any file</p>
     *             </li>
     *          </ul>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas</a>.</p>
     * @public
     */
    Documents: Document[] | undefined;
    /**
     * <p>Configuration information for altering your document metadata and content during the
     *             document ingestion process when you use the <code>BatchPutDocument</code> API.</p>
     *          <p>For more information on how to create, modify and delete document metadata, or make
     *             other content alterations when you ingest documents into Amazon Kendra, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata during the ingestion process</a>.</p>
     * @public
     */
    CustomDocumentEnrichmentConfiguration?: CustomDocumentEnrichmentConfiguration | undefined;
}
/**
 * <p>Provides information about a document that could not be indexed.</p>
 * @public
 */
export interface BatchPutDocumentResponseFailedDocument {
    /**
     * <p>The identifier of the document.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p> The identifier of the data source connector that the failed document belongs to.
     *         </p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>The type of error that caused the document to fail to be indexed.</p>
     * @public
     */
    ErrorCode?: ErrorCode | undefined;
    /**
     * <p>A description of the reason why the document could not be indexed.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * @public
 */
export interface BatchPutDocumentResponse {
    /**
     * <p>A list of documents that were not added to the index because the document failed a
     *             validation check. Each document contains an error message that indicates why the
     *             document couldn't be added to the index.</p>
     *          <p>If there was an error adding a document to an index the error is reported in your
     *                 Amazon Web Services CloudWatch log. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/cloudwatch-logs.html">Monitoring Amazon Kendra with Amazon CloudWatch logs</a>.</p>
     * @public
     */
    FailedDocuments?: BatchPutDocumentResponseFailedDocument[] | undefined;
}
/**
 * <p>You have exceeded the set limits for your Amazon Kendra service. Please see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas</a> for
 *             more information, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> to inquire about
 *             an increase of limits.</p>
 * @public
 */
export declare class ServiceQuotaExceededException extends __BaseException {
    readonly name: "ServiceQuotaExceededException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceQuotaExceededException, __BaseException>);
}
/**
 * @public
 */
export interface ClearQuerySuggestionsRequest {
    /**
     * <p>The identifier of the index you want to clear query suggestions from.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 */
export interface CreateAccessControlConfigurationRequest {
    /**
     * <p>The identifier of the index to create an access control configuration for your
     *             documents.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A name for the access control configuration.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A description for the access control configuration.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Information on principals (users and/or groups) and which documents they should have
     *             access to. This is useful for user context filtering, where search results are filtered
     *             based on the user or their group access to documents.</p>
     * @public
     */
    AccessControlList?: Principal[] | undefined;
    /**
     * <p>The list of <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Principal.html">principal</a> lists that define the hierarchy for which documents users should
     *             have access to.</p>
     * @public
     */
    HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
    /**
     * <p>A token that you provide to identify the request to create an access control
     *             configuration. Multiple calls to the <code>CreateAccessControlConfiguration</code> API
     *             with the same client token will create only one access control configuration.</p>
     * @public
     */
    ClientToken?: string | undefined;
}
/**
 * @public
 */
export interface CreateAccessControlConfigurationResponse {
    /**
     * <p>The identifier of the access control configuration for your documents in an
     *             index.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * <p>Provides the configuration information to connect to Box as
 *             your data source.</p>
 * @public
 */
export interface BoxConfiguration {
    /**
     * <p>The identifier of the Box Enterprise platform. You can find the enterprise
     *             ID in the Box Developer Console settings or when you create an app in Box and
     *             download your authentication credentials. For example, <i>801234567</i>.</p>
     * @public
     */
    EnterpriseId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains
     *             the key-value pairs required to connect to your Box platform. The secret must
     *             contain a JSON structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>clientID—The identifier of the client OAuth 2.0 authentication
     *                     application created in Box.</p>
     *             </li>
     *             <li>
     *                <p>clientSecret—A set of characters known only to the OAuth 2.0
     *                     authentication application created in Box.</p>
     *             </li>
     *             <li>
     *                <p>publicKeyId—The identifier of the public key contained within an
     *                     identity certificate.</p>
     *             </li>
     *             <li>
     *                <p>privateKey—A set of characters that make up an encryption key.</p>
     *             </li>
     *             <li>
     *                <p>passphrase—A set of characters that act like a password.</p>
     *             </li>
     *          </ul>
     *          <p>You create an application in Box to generate the keys or credentials required
     *             for the secret. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-box.html">Using a Box data source</a>.</p>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use the Slack change log to determine which documents require
     *             updating in the index. Depending on the data source change log's size, it may take
     *             longer for Amazon Kendra to use the change log than to scan all of your
     *             documents.</p>
     * @public
     */
    UseChangeLog?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index comments.</p>
     * @public
     */
    CrawlComments?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index the contents of tasks.</p>
     * @public
     */
    CrawlTasks?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index web links.</p>
     * @public
     */
    CrawlWebLinks?: boolean | undefined;
    /**
     * <p>A
     *             list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Box files to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Box fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>.
     *             The Box field names must exist in your Box custom metadata.</p>
     * @public
     */
    FileFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes
     *             or field names of Box tasks to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Box fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>.
     *             The Box field names must exist in your Box custom metadata.</p>
     * @public
     */
    TaskFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes
     *             or field names of Box comments to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Box fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>.
     *             The Box field names must exist in your Box custom metadata.</p>
     * @public
     */
    CommentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes
     *             or field names of Box web links to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Box fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>.
     *             The Box field names must exist in your Box custom metadata.</p>
     * @public
     */
    WebLinkFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain files and folders in your
     *             Box platform. Files and folders that match the patterns are included in the index.
     *             Files and folders that don't match the patterns are excluded from the index. If a
     *             file or folder matches both an inclusion and exclusion pattern, the exclusion pattern
     *             takes precedence and the file or folder isn't included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain files and folders from
     *             your Box platform. Files and folders that match the patterns are excluded from the
     *             index.Files and folders that don't match the patterns are included in the index.
     *             If a file or folder matches both an inclusion and exclusion pattern, the exclusion
     *             pattern takes precedence and the file or folder isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information for an Amazon VPC to connect to your Box. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ConfluenceAttachmentFieldName: {
    readonly AUTHOR: "AUTHOR";
    readonly CONTENT_TYPE: "CONTENT_TYPE";
    readonly CREATED_DATE: "CREATED_DATE";
    readonly DISPLAY_URL: "DISPLAY_URL";
    readonly FILE_SIZE: "FILE_SIZE";
    readonly ITEM_TYPE: "ITEM_TYPE";
    readonly PARENT_ID: "PARENT_ID";
    readonly SPACE_KEY: "SPACE_KEY";
    readonly SPACE_NAME: "SPACE_NAME";
    readonly URL: "URL";
    readonly VERSION: "VERSION";
};
/**
 * @public
 */
export type ConfluenceAttachmentFieldName = (typeof ConfluenceAttachmentFieldName)[keyof typeof ConfluenceAttachmentFieldName];
/**
 * <p>Maps attributes or field names of Confluence attachments to Amazon Kendra index
 *             field names. To create custom fields, use the <code>UpdateIndex</code> API before you
 *             map to Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
 *             Confuence data source field names must exist in your Confluence custom metadata.</p>
 * @public
 */
export interface ConfluenceAttachmentToIndexFieldMapping {
    /**
     * <p>The name of the field in the data source. </p>
     *          <p>You must first create the index field using the <code>UpdateIndex</code> API. </p>
     * @public
     */
    DataSourceFieldName?: ConfluenceAttachmentFieldName | undefined;
    /**
     * <p>The format for date fields in the data source. If the field specified in
     *                 <code>DataSourceFieldName</code> is a date field you must specify the date format.
     *             If the field is not a date field, an exception is thrown.</p>
     * @public
     */
    DateFieldFormat?: string | undefined;
    /**
     * <p>The name of the index field to map to the Confluence data source field. The index
     *             field type must match the Confluence field type.</p>
     * @public
     */
    IndexFieldName?: string | undefined;
}
/**
 * <p>Configuration of attachment settings for the Confluence data source. Attachment
 *             settings are optional, if you don't specify settings attachments, Amazon Kendra
 *             won't index them.</p>
 * @public
 */
export interface ConfluenceAttachmentConfiguration {
    /**
     * <p>
     *             <code>TRUE</code> to index attachments of pages and blogs in Confluence.</p>
     * @public
     */
    CrawlAttachments?: boolean | undefined;
    /**
     * <p>Maps attributes or field names of Confluence attachments to Amazon Kendra index
     *             field names. To create custom fields, use the <code>UpdateIndex</code> API before you
     *             map to Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Confluence data source field names must exist in your Confluence custom metadata.</p>
     *          <p>If you specify the <code>AttachentFieldMappings</code> parameter, you must specify at
     *             least one field mapping.</p>
     * @public
     */
    AttachmentFieldMappings?: ConfluenceAttachmentToIndexFieldMapping[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ConfluenceAuthenticationType: {
    readonly HTTP_BASIC: "HTTP_BASIC";
    readonly PAT: "PAT";
};
/**
 * @public
 */
export type ConfluenceAuthenticationType = (typeof ConfluenceAuthenticationType)[keyof typeof ConfluenceAuthenticationType];
/**
 * @public
 * @enum
 */
export declare const ConfluenceBlogFieldName: {
    readonly AUTHOR: "AUTHOR";
    readonly DISPLAY_URL: "DISPLAY_URL";
    readonly ITEM_TYPE: "ITEM_TYPE";
    readonly LABELS: "LABELS";
    readonly PUBLISH_DATE: "PUBLISH_DATE";
    readonly SPACE_KEY: "SPACE_KEY";
    readonly SPACE_NAME: "SPACE_NAME";
    readonly URL: "URL";
    readonly VERSION: "VERSION";
};
/**
 * @public
 */
export type ConfluenceBlogFieldName = (typeof ConfluenceBlogFieldName)[keyof typeof ConfluenceBlogFieldName];
/**
 * <p>Maps attributes or field names of Confluence blog to Amazon Kendra index field
 *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
 *             Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
 *             Confluence data source field names must exist in your Confluence custom metadata.</p>
 * @public
 */
export interface ConfluenceBlogToIndexFieldMapping {
    /**
     * <p>The name of the field in the data source. </p>
     * @public
     */
    DataSourceFieldName?: ConfluenceBlogFieldName | undefined;
    /**
     * <p>The format for date fields in the data source. If the field specified in
     *                 <code>DataSourceFieldName</code> is a date field you must specify the date format.
     *             If the field is not a date field, an exception is thrown.</p>
     * @public
     */
    DateFieldFormat?: string | undefined;
    /**
     * <p>The name of the index field to map to the Confluence data source field. The index
     *             field type must match the Confluence field type.</p>
     * @public
     */
    IndexFieldName?: string | undefined;
}
/**
 * <p>Configuration of blog settings for the Confluence data source. Blogs are always
 *             indexed unless filtered from the index by the <code>ExclusionPatterns</code> or
 *                 <code>InclusionPatterns</code> fields in the <code>ConfluenceConfiguration</code>
 *             object.</p>
 * @public
 */
export interface ConfluenceBlogConfiguration {
    /**
     * <p>Maps attributes or field names of Confluence blogs to Amazon Kendra index field
     *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
     *             Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Confluence data source field names must exist in your Confluence custom metadata.</p>
     *          <p>If you specify the <code>BlogFieldMappings</code> parameter, you must specify at least
     *             one field mapping.</p>
     * @public
     */
    BlogFieldMappings?: ConfluenceBlogToIndexFieldMapping[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ConfluencePageFieldName: {
    readonly AUTHOR: "AUTHOR";
    readonly CONTENT_STATUS: "CONTENT_STATUS";
    readonly CREATED_DATE: "CREATED_DATE";
    readonly DISPLAY_URL: "DISPLAY_URL";
    readonly ITEM_TYPE: "ITEM_TYPE";
    readonly LABELS: "LABELS";
    readonly MODIFIED_DATE: "MODIFIED_DATE";
    readonly PARENT_ID: "PARENT_ID";
    readonly SPACE_KEY: "SPACE_KEY";
    readonly SPACE_NAME: "SPACE_NAME";
    readonly URL: "URL";
    readonly VERSION: "VERSION";
};
/**
 * @public
 */
export type ConfluencePageFieldName = (typeof ConfluencePageFieldName)[keyof typeof ConfluencePageFieldName];
/**
 * <p>Maps attributes or field names of Confluence pages to Amazon Kendra index field
 *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
 *             Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
 *             Confluence data source field names must exist in your Confluence custom metadata.</p>
 * @public
 */
export interface ConfluencePageToIndexFieldMapping {
    /**
     * <p>The name of the field in the data source.</p>
     * @public
     */
    DataSourceFieldName?: ConfluencePageFieldName | undefined;
    /**
     * <p>The format for date fields in the data source. If the field specified in
     *                 <code>DataSourceFieldName</code> is a date field you must specify the date format.
     *             If the field is not a date field, an exception is thrown.</p>
     * @public
     */
    DateFieldFormat?: string | undefined;
    /**
     * <p>The name of the index field to map to the Confluence data source field. The index
     *             field type must match the Confluence field type.</p>
     * @public
     */
    IndexFieldName?: string | undefined;
}
/**
 * <p>Configuration of the page settings for the Confluence data source.</p>
 * @public
 */
export interface ConfluencePageConfiguration {
    /**
     * <p>Maps attributes or field names of Confluence pages to Amazon Kendra index field
     *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
     *             Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Confluence data source field names must exist in your Confluence custom metadata.</p>
     *          <p>If you specify the <code>PageFieldMappings</code> parameter, you must specify at least
     *             one field mapping.</p>
     * @public
     */
    PageFieldMappings?: ConfluencePageToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides the configuration information for a web proxy to connect to website
 *             hosts.</p>
 * @public
 */
export interface ProxyConfiguration {
    /**
     * <p>The name of the website host you want to connect to via a web proxy server.</p>
     *          <p>For example, the host name of https://a.example.com/page1.html is
     *             "a.example.com".</p>
     * @public
     */
    Host: string | undefined;
    /**
     * <p>The port number of the website host you want to connect to via a web proxy server. </p>
     *          <p>For example, the port for https://a.example.com/page1.html is 443, the standard port
     *             for HTTPS.</p>
     * @public
     */
    Port: number | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret. You create a
     *             secret to store your credentials in <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html">Secrets Manager</a>
     *          </p>
     *          <p>The credentials are optional. You use a secret if web proxy credentials are required
     *             to connect to a website host. Amazon Kendra currently support basic authentication
     *             to connect to a web proxy server. The secret stores your credentials.</p>
     * @public
     */
    Credentials?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ConfluenceSpaceFieldName: {
    readonly DISPLAY_URL: "DISPLAY_URL";
    readonly ITEM_TYPE: "ITEM_TYPE";
    readonly SPACE_KEY: "SPACE_KEY";
    readonly URL: "URL";
};
/**
 * @public
 */
export type ConfluenceSpaceFieldName = (typeof ConfluenceSpaceFieldName)[keyof typeof ConfluenceSpaceFieldName];
/**
 * <p>Maps attributes or field names of Confluence spaces to Amazon Kendra index field
 *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
 *             Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
 *             Confluence data source field names must exist in your Confluence custom metadata.</p>
 * @public
 */
export interface ConfluenceSpaceToIndexFieldMapping {
    /**
     * <p>The name of the field in the data source. </p>
     * @public
     */
    DataSourceFieldName?: ConfluenceSpaceFieldName | undefined;
    /**
     * <p>The format for date fields in the data source. If the field specified in
     *                 <code>DataSourceFieldName</code> is a date field you must specify the date format.
     *             If the field is not a date field, an exception is thrown.</p>
     * @public
     */
    DateFieldFormat?: string | undefined;
    /**
     * <p>The name of the index field to map to the Confluence data source field. The index
     *             field type must match the Confluence field type.</p>
     * @public
     */
    IndexFieldName?: string | undefined;
}
/**
 * <p>Configuration information for indexing Confluence spaces.</p>
 * @public
 */
export interface ConfluenceSpaceConfiguration {
    /**
     * <p>
     *             <code>TRUE</code> to index personal spaces. You can add restrictions to items in
     *             personal spaces. If personal spaces are indexed, queries without user context
     *             information may return restricted items from a personal space in their results. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/user-context-filter.html">Filtering on user
     *             context</a>.</p>
     * @public
     */
    CrawlPersonalSpaces?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index archived spaces.</p>
     * @public
     */
    CrawlArchivedSpaces?: boolean | undefined;
    /**
     * <p>A list of space keys for Confluence spaces. If you include a key, the blogs,
     *             documents, and attachments in the space are indexed. Spaces that aren't in the list
     *             aren't indexed. A space in the list must exist. Otherwise, Amazon Kendra logs an
     *             error when the data source is synchronized. If a space is in both the
     *                 <code>IncludeSpaces</code> and the <code>ExcludeSpaces</code> list, the space is
     *             excluded.</p>
     * @public
     */
    IncludeSpaces?: string[] | undefined;
    /**
     * <p>A list of space keys of Confluence spaces. If you include a key, the blogs, documents,
     *             and attachments in the space are not indexed. If a space is in both the
     *                 <code>ExcludeSpaces</code> and the <code>IncludeSpaces</code> list, the space is
     *             excluded.</p>
     * @public
     */
    ExcludeSpaces?: string[] | undefined;
    /**
     * <p>Maps attributes or field names of Confluence spaces to Amazon Kendra index field
     *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
     *             Confluence fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Confluence data source field names must exist in your Confluence custom metadata.</p>
     *          <p>If you specify the <code>SpaceFieldMappings</code> parameter, you must specify at
     *             least one field mapping.</p>
     * @public
     */
    SpaceFieldMappings?: ConfluenceSpaceToIndexFieldMapping[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ConfluenceVersion: {
    readonly CLOUD: "CLOUD";
    readonly SERVER: "SERVER";
};
/**
 * @public
 */
export type ConfluenceVersion = (typeof ConfluenceVersion)[keyof typeof ConfluenceVersion];
/**
 * <p>Provides the configuration information to connect to Confluence as your data
 *             source.</p>
 * @public
 */
export interface ConfluenceConfiguration {
    /**
     * <p>The URL of your Confluence instance. Use the full URL of the server. For example,
     *                 <i>https://server.example.com:port/</i>. You can also use an IP
     *             address, for example, <i>https://192.168.1.113/</i>.</p>
     * @public
     */
    ServerUrl: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             user name and password required to connect to the Confluence instance. If you use
     *             Confluence Cloud, you use a generated API token as the password.</p>
     *          <p>You can also provide authentication credentials in the form of a personal access
     *             token. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-confluence.html">Using a Confluence data
     *                 source</a>.</p>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>The version or the type of Confluence installation to connect to.</p>
     * @public
     */
    Version: ConfluenceVersion | undefined;
    /**
     * <p>Configuration information for indexing Confluence spaces.</p>
     * @public
     */
    SpaceConfiguration?: ConfluenceSpaceConfiguration | undefined;
    /**
     * <p>Configuration information for indexing Confluence pages.</p>
     * @public
     */
    PageConfiguration?: ConfluencePageConfiguration | undefined;
    /**
     * <p>Configuration information for indexing Confluence blogs.</p>
     * @public
     */
    BlogConfiguration?: ConfluenceBlogConfiguration | undefined;
    /**
     * <p>Configuration information for indexing attachments to Confluence blogs and
     *             pages.</p>
     * @public
     */
    AttachmentConfiguration?: ConfluenceAttachmentConfiguration | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your Confluence.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>A list of regular expression patterns to include certain blog posts, pages, spaces, or
     *             attachments in your Confluence. Content that matches the patterns are included in the
     *             index. Content that doesn't match the patterns is excluded from the index. If content
     *             matches both an inclusion and exclusion pattern, the exclusion pattern takes precedence
     *             and the content isn't included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain blog posts, pages, spaces, or
     *             attachments in your Confluence. Content that matches the patterns are excluded from the
     *             index. Content that doesn't match the patterns is included in the index. If content
     *             matches both an inclusion and exclusion pattern, the exclusion pattern takes precedence
     *             and the content isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information to connect to your Confluence URL instance via a web proxy.
     *             You can use this option for Confluence Server.</p>
     *          <p>You must provide the website host name and port number. For example, the host name of
     *                 <i>https://a.example.com/page1.html</i> is "a.example.com" and the
     *             port is 443, the standard port for HTTPS.</p>
     *          <p>Web proxy credentials are optional and you can use them to connect to a web proxy
     *             server that requires basic authentication of user name and password. To store web proxy
     *             credentials, you use a secret in Secrets Manager.</p>
     *          <p>It is recommended that you follow best security practices when configuring your web
     *             proxy. This includes setting up throttling, setting up logging and monitoring, and
     *             applying security patches on a regular basis. If you use your web proxy with multiple
     *             data sources, sync jobs that occur at the same time could strain the load on your proxy.
     *             It is recommended you prepare your proxy beforehand for any security and load
     *             requirements.</p>
     * @public
     */
    ProxyConfiguration?: ProxyConfiguration | undefined;
    /**
     * <p>Whether you want to connect to Confluence using basic authentication of user name and
     *             password, or a personal access token. You can use a personal access token for Confluence
     *             Server.</p>
     * @public
     */
    AuthenticationType?: ConfluenceAuthenticationType | undefined;
}
/**
 * <p>Provides information about how Amazon Kendra should use the columns of a database
 *             in an index.</p>
 * @public
 */
export interface ColumnConfiguration {
    /**
     * <p>The column that provides the document's identifier.</p>
     * @public
     */
    DocumentIdColumnName: string | undefined;
    /**
     * <p>The column that contains the contents of the document.</p>
     * @public
     */
    DocumentDataColumnName: string | undefined;
    /**
     * <p>The column that contains the title of the document.</p>
     * @public
     */
    DocumentTitleColumnName?: string | undefined;
    /**
     * <p>An array of objects that map database column names to the corresponding fields in an
     *             index. You must first create the fields in the index using the <code>UpdateIndex</code>
     *             API.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>One to five columns that indicate when a document in the database has changed.</p>
     * @public
     */
    ChangeDetectingColumns: string[] | undefined;
}
/**
 * <p>Provides the configuration information that's required to connect to a
 *             database.</p>
 * @public
 */
export interface ConnectionConfiguration {
    /**
     * <p>The name of the host for the database. Can be either a string
     *             (host.subdomain.domain.tld) or an IPv4 or IPv6 address.</p>
     * @public
     */
    DatabaseHost: string | undefined;
    /**
     * <p>The port that the database uses for connections.</p>
     * @public
     */
    DatabasePort: number | undefined;
    /**
     * <p>The name of the database containing the document data.</p>
     * @public
     */
    DatabaseName: string | undefined;
    /**
     * <p>The name of the table that contains the document data.</p>
     * @public
     */
    TableName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that stores
     *             the credentials. The credentials should be a user-password pair. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-database.html">Using a
     *                 Database Data Source</a>. For more information about Secrets Manager, see
     *             <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html"> What
     *                 Is Secrets Manager</a> in the <i>Secrets Manager</i>
     *             user guide.</p>
     * @public
     */
    SecretArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DatabaseEngineType: {
    readonly RDS_AURORA_MYSQL: "RDS_AURORA_MYSQL";
    readonly RDS_AURORA_POSTGRESQL: "RDS_AURORA_POSTGRESQL";
    readonly RDS_MYSQL: "RDS_MYSQL";
    readonly RDS_POSTGRESQL: "RDS_POSTGRESQL";
};
/**
 * @public
 */
export type DatabaseEngineType = (typeof DatabaseEngineType)[keyof typeof DatabaseEngineType];
/**
 * @public
 * @enum
 */
export declare const QueryIdentifiersEnclosingOption: {
    readonly DOUBLE_QUOTES: "DOUBLE_QUOTES";
    readonly NONE: "NONE";
};
/**
 * @public
 */
export type QueryIdentifiersEnclosingOption = (typeof QueryIdentifiersEnclosingOption)[keyof typeof QueryIdentifiersEnclosingOption];
/**
 * <p>Provides the configuration information to use a SQL database.</p>
 * @public
 */
export interface SqlConfiguration {
    /**
     * <p>Determines whether Amazon Kendra encloses SQL identifiers for tables and column
     *             names in double quotes (") when making a database query.</p>
     *          <p>By default, Amazon Kendra passes SQL identifiers the way that they are entered
     *             into the data source configuration. It does not change the case of identifiers or
     *             enclose them in quotes.</p>
     *          <p>PostgreSQL internally converts uppercase characters to lower case characters in
     *             identifiers unless they are quoted. Choosing this option encloses identifiers in quotes
     *             so that PostgreSQL does not convert the character's case.</p>
     *          <p>For MySQL databases, you must enable the <code>ansi_quotes</code> option when you set
     *             this field to <code>DOUBLE_QUOTES</code>.</p>
     * @public
     */
    QueryIdentifiersEnclosingOption?: QueryIdentifiersEnclosingOption | undefined;
}
/**
 * <p>Provides the configuration information to an <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-database.html">Amazon Kendra supported
 *             database</a>.</p>
 * @public
 */
export interface DatabaseConfiguration {
    /**
     * <p>The type of database engine that runs the database.</p>
     * @public
     */
    DatabaseEngineType: DatabaseEngineType | undefined;
    /**
     * <p>Configuration information that's required to connect to a database.</p>
     * @public
     */
    ConnectionConfiguration: ConnectionConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to an Amazon VPC.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>Information about where the index should get the document information from the
     *             database.</p>
     * @public
     */
    ColumnConfiguration: ColumnConfiguration | undefined;
    /**
     * <p>Information about the database column that provides information for user context
     *             filtering.</p>
     * @public
     */
    AclConfiguration?: AclConfiguration | undefined;
    /**
     * <p>Provides information about how Amazon Kendra uses quote marks around SQL
     *             identifiers when querying a database data source.</p>
     * @public
     */
    SqlConfiguration?: SqlConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FsxFileSystemType: {
    readonly WINDOWS: "WINDOWS";
};
/**
 * @public
 */
export type FsxFileSystemType = (typeof FsxFileSystemType)[keyof typeof FsxFileSystemType];
/**
 * <p>Provides the configuration information to connect to Amazon FSx as your data
 *             source.</p>
 *          <note>
 *             <p>Amazon Kendra now supports an upgraded Amazon FSx Windows connector.</p>
 *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
 *                 <code>FsxConfiguration</code> object to configure your connector.</p>
 *             <p>Connectors configured using the older console and API architecture will continue to
 *                 function as configured. However, you won't be able to edit or update them. If you want
 *                 to edit or update your connector configuration, you must create a new connector.</p>
 *             <p>We recommended migrating your connector workflow to the upgraded version. Support for
 *                 connectors configured using the older architecture is scheduled to end by June 2024.</p>
 *          </note>
 * @public
 */
export interface FsxConfiguration {
    /**
     * <p>The identifier of the Amazon FSx file system.</p>
     *          <p>You can find your file system ID on the file system dashboard in the Amazon FSx console. For information on how to create a file system in Amazon FSx
     *             console, using Windows File Server as an example, see <a href="https://docs.aws.amazon.com/fsx/latest/WindowsGuide/getting-started-step1.html">Amazon FSx Getting
     *                 started guide</a>.</p>
     * @public
     */
    FileSystemId: string | undefined;
    /**
     * <p>The Amazon FSx file system type. Windows is currently the only supported
     *             type.</p>
     * @public
     */
    FileSystemType: FsxFileSystemType | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your Amazon FSx. Your Amazon FSx instance must reside inside your VPC.</p>
     * @public
     */
    VpcConfiguration: DataSourceVpcConfiguration | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             key-value pairs required to connect to your Amazon FSx file system. Windows is
     *             currently the only supported type. The secret must contain a JSON structure with the
     *             following keys:</p>
     *          <ul>
     *             <li>
     *                <p>username—The Active Directory user name, along with the Domain Name
     *                     System (DNS) domain name. For example,
     *                         <i>user@corp.example.com</i>. The Active Directory user
     *                     account must have read and mounting access to the Amazon FSx file system
     *                     for Windows.</p>
     *             </li>
     *             <li>
     *                <p>password—The password of the Active Directory user account with read
     *                     and mounting access to the Amazon FSx Windows file system.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn?: string | undefined;
    /**
     * <p>A list of regular expression patterns to include certain files in your Amazon FSx file system. Files that match the patterns are included in the index.
     *             Files that don't match the patterns are excluded from the index. If a file matches both
     *             an inclusion and exclusion pattern, the exclusion pattern takes precedence and the file
     *             isn't included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain files in your Amazon FSx file system. Files that match the patterns are excluded from the index.
     *             Files that don't match the patterns are included in the index. If a file matches both an
     *             inclusion and exclusion pattern, the exclusion pattern takes precedence and the file
     *             isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map Amazon FSx data source attributes or field names to Amazon Kendra index field names. To
     *             create custom fields, use the <code>UpdateIndex</code> API before you map to Amazon FSx fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *                 Amazon FSx data source field names must exist in your Amazon FSx
     *             custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides the configuration information to include certain types of GitHub content. You
 *             can configure to index repository files only, or also include issues and pull requests,
 *             comments, and comment attachments.</p>
 * @public
 */
export interface GitHubDocumentCrawlProperties {
    /**
     * <p>
     *             <code>TRUE</code> to index all files with a repository.</p>
     * @public
     */
    CrawlRepositoryDocuments?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index all issues within a repository.</p>
     * @public
     */
    CrawlIssue?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index all comments on issues.</p>
     * @public
     */
    CrawlIssueComment?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to include all comment attachments for issues.</p>
     * @public
     */
    CrawlIssueCommentAttachment?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index all pull requests within a repository.</p>
     * @public
     */
    CrawlPullRequest?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index all comments on pull requests.</p>
     * @public
     */
    CrawlPullRequestComment?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to include all comment attachments for pull requests.</p>
     * @public
     */
    CrawlPullRequestCommentAttachment?: boolean | undefined;
}
/**
 * <p>Provides the configuration information to connect to GitHub Enterprise Server (on
 *             premises).</p>
 * @public
 */
export interface OnPremiseConfiguration {
    /**
     * <p>The GitHub host URL or API endpoint URL. For example,
     *                 <i>https://on-prem-host-url/api/v3/</i>
     *          </p>
     * @public
     */
    HostUrl: string | undefined;
    /**
     * <p>The name of the organization of the GitHub Enterprise Server (on-premises) account you
     *             want to connect to. You can find your organization name by logging into GitHub desktop
     *             and selecting <b>Your organizations</b> under your profile
     *             picture dropdown.</p>
     * @public
     */
    OrganizationName: string | undefined;
    /**
     * <p>The path to the SSL certificate stored in an Amazon S3 bucket. You use this to
     *             connect to GitHub if you require a secure SSL connection.</p>
     *          <p>You can simply generate a self-signed X509 certificate on any computer using OpenSSL.
     *             For an example of using OpenSSL to create an X509 certificate, see <a href="https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/configuring-https-ssl.html">Create and sign an X509 certificate</a>.</p>
     * @public
     */
    SslCertificateS3Path: S3Path | undefined;
}
/**
 * <p>Provides the configuration information to connect to GitHub Enterprise Cloud
 *             (SaaS).</p>
 * @public
 */
export interface SaaSConfiguration {
    /**
     * <p>The name of the organization of the GitHub Enterprise Cloud (SaaS) account you want to
     *             connect to. You can find your organization name by logging into GitHub desktop and
     *             selecting <b>Your organizations</b> under your profile picture
     *             dropdown.</p>
     * @public
     */
    OrganizationName: string | undefined;
    /**
     * <p>The GitHub host URL or API endpoint URL. For example,
     *                 <i>https://api.github.com</i>.</p>
     * @public
     */
    HostUrl: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Type: {
    readonly ON_PREMISE: "ON_PREMISE";
    readonly SAAS: "SAAS";
};
/**
 * @public
 */
export type Type = (typeof Type)[keyof typeof Type];
/**
 * <p>Provides the configuration information to connect to GitHub as your data
 *             source.</p>
 *          <note>
 *             <p>Amazon Kendra now supports an upgraded GitHub connector.</p>
 *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
 *                     <code>GitHubConfiguration</code> object to configure your connector.</p>
 *             <p>Connectors configured using the older console and API architecture will continue
 *                 to function as configured. However, you won’t be able to edit or update them. If you
 *                 want to edit or update your connector configuration, you must create a new
 *                 connector.</p>
 *             <p>We recommended migrating your connector workflow to the upgraded version. Support
 *                 for connectors configured using the older architecture is scheduled to end by June
 *                 2024.</p>
 *          </note>
 * @public
 */
export interface GitHubConfiguration {
    /**
     * <p>Configuration information to connect to GitHub Enterprise Cloud (SaaS).</p>
     * @public
     */
    SaaSConfiguration?: SaaSConfiguration | undefined;
    /**
     * <p>Configuration information to connect to GitHub Enterprise Server (on premises).</p>
     * @public
     */
    OnPremiseConfiguration?: OnPremiseConfiguration | undefined;
    /**
     * <p>The type of GitHub service you want to connect to—GitHub Enterprise Cloud
     *             (SaaS) or GitHub Enterprise Server (on premises).</p>
     * @public
     */
    Type?: Type | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             key-value pairs required to connect to your GitHub. The secret must contain a JSON
     *             structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>personalToken—The access token created in GitHub. For more information
     *                     on creating a token in GitHub, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-github.html">Using a GitHub data
     *                         source</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use the GitHub change log to determine which documents require
     *             updating in the index. Depending on the GitHub change log's size, it may take longer for
     *                 Amazon Kendra to use the change log than to scan all of your documents in
     *             GitHub.</p>
     * @public
     */
    UseChangeLog?: boolean | undefined;
    /**
     * <p>Configuration information to include certain types of GitHub content. You can
     *             configure to index repository files only, or also include issues and pull requests,
     *             comments, and comment attachments.</p>
     * @public
     */
    GitHubDocumentCrawlProperties?: GitHubDocumentCrawlProperties | undefined;
    /**
     * <p>A list of names of the specific repositories you want to index.</p>
     * @public
     */
    RepositoryFilter?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain folder names in your GitHub
     *             repository or repositories. Folder names that match the patterns are included in the
     *             index. Folder names that don't match the patterns are excluded from the index. If a
     *             folder matches both an inclusion and exclusion pattern, the exclusion pattern takes
     *             precedence and the folder isn't included in the index.</p>
     * @public
     */
    InclusionFolderNamePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain file types in your GitHub
     *             repository or repositories. File types that match the patterns are included in the
     *             index. File types that don't match the patterns are excluded from the index. If a file
     *             matches both an inclusion and exclusion pattern, the exclusion pattern takes precedence
     *             and the file isn't included in the index.</p>
     * @public
     */
    InclusionFileTypePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain file names in your GitHub
     *             repository or repositories. File names that match the patterns are included in the
     *             index. File names that don't match the patterns are excluded from the index. If a file
     *             matches both an inclusion and exclusion pattern, the exclusion pattern takes precedence
     *             and the file isn't included in the index.</p>
     * @public
     */
    InclusionFileNamePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain folder names in your GitHub
     *             repository or repositories. Folder names that match the patterns are excluded from the
     *             index. Folder names that don't match the patterns are included in the index. If a folder
     *             matches both an exclusion and inclusion pattern, the exclusion pattern takes precedence
     *             and the folder isn't included in the index.</p>
     * @public
     */
    ExclusionFolderNamePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain file types in your GitHub
     *             repository or repositories. File types that match the patterns are excluded from the
     *             index. File types that don't match the patterns are included in the index. If a file
     *             matches both an exclusion and inclusion pattern, the exclusion pattern takes precedence
     *             and the file isn't included in the index.</p>
     * @public
     */
    ExclusionFileTypePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain file names in your GitHub
     *             repository or repositories. File names that match the patterns are excluded from the
     *             index. File names that don't match the patterns are included in the index. If a file
     *             matches both an exclusion and inclusion pattern, the exclusion pattern takes precedence
     *             and the file isn't included in the index.</p>
     * @public
     */
    ExclusionFileNamePatterns?: string[] | undefined;
    /**
     * <p>Configuration information of an Amazon Virtual Private Cloud to connect to your GitHub. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map GitHub
     *             repository attributes or field names to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to GitHub fields. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             GitHub data source field names must exist in your GitHub custom metadata.</p>
     * @public
     */
    GitHubRepositoryConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub commits to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to GitHub fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The GitHub data source field names must exist
     *             in your GitHub custom metadata.</p>
     * @public
     */
    GitHubCommitConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub issues to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to GitHub fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The GitHub data source field names must exist
     *             in your GitHub custom metadata.</p>
     * @public
     */
    GitHubIssueDocumentConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub issue comments to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to GitHub fields. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             GitHub data source field names must exist in your GitHub custom metadata.</p>
     * @public
     */
    GitHubIssueCommentConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub issue attachments to Amazon Kendra index field names. To
     *             create custom fields, use the <code>UpdateIndex</code> API before you map to GitHub
     *             fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             GitHub data source field names must exist in your GitHub custom metadata.</p>
     * @public
     */
    GitHubIssueAttachmentConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub pull request comments to Amazon Kendra index field names. To
     *             create custom fields, use the <code>UpdateIndex</code> API before you map to GitHub
     *             fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             GitHub data source field names must exist in your GitHub custom metadata.</p>
     * @public
     */
    GitHubPullRequestCommentConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub pull requests to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to GitHub fields. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             GitHub data source field names must exist in your GitHub custom metadata.</p>
     * @public
     */
    GitHubPullRequestDocumentConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of GitHub pull request attachments to Amazon Kendra index field names.
     *             To create custom fields, use the <code>UpdateIndex</code> API before you map to GitHub
     *             fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             GitHub data source field names must exist in your GitHub custom metadata.</p>
     * @public
     */
    GitHubPullRequestDocumentAttachmentConfigurationFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides the configuration information to connect to Google Drive as your data
 *             source.</p>
 * @public
 */
export interface GoogleDriveConfiguration {
    /**
     * <p>The Amazon Resource Name (ARN) of a Secrets Managersecret that contains the
     *             credentials required to connect to Google Drive. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-google-drive.html">Using a
     *                 Google Workspace Drive data source</a>.</p>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>A list of regular expression patterns to include certain items in your Google Drive,
     *             including shared drives and users' My Drives. Items that match the patterns are included
     *             in the index. Items that don't match the patterns are excluded from the index. If an
     *             item matches both an inclusion and exclusion pattern, the exclusion pattern takes
     *             precedence and the item isn't included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain items in your Google Drive,
     *             including shared drives and users' My Drives. Items that match the patterns are excluded
     *             from the index. Items that don't match the patterns are included in the index. If an
     *             item matches both an inclusion and exclusion pattern, the exclusion pattern takes
     *             precedence and the item isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Maps Google Drive data source attributes or field names to Amazon Kendra index
     *             field names. To create custom fields, use the <code>UpdateIndex</code> API before you
     *             map to Google Drive fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Google Drive data source field names must exist in your Google Drive custom
     *             metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of MIME types to exclude from the index. All documents matching the specified
     *             MIME type are excluded. </p>
     *          <p>For a list of MIME types, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-google-drive.html">Using a
     *                 Google Workspace Drive data source</a>.</p>
     * @public
     */
    ExcludeMimeTypes?: string[] | undefined;
    /**
     * <p>A list of email addresses of the users. Documents owned by these users are excluded
     *             from the index. Documents shared with excluded users are indexed unless they are
     *             excluded in another way.</p>
     * @public
     */
    ExcludeUserAccounts?: string[] | undefined;
    /**
     * <p>A list of identifiers or shared drives to exclude from the index. All files and
     *             folders stored on the shared drive are excluded.</p>
     * @public
     */
    ExcludeSharedDrives?: string[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const IssueSubEntity: {
    readonly ATTACHMENTS: "ATTACHMENTS";
    readonly COMMENTS: "COMMENTS";
    readonly WORKLOGS: "WORKLOGS";
};
/**
 * @public
 */
export type IssueSubEntity = (typeof IssueSubEntity)[keyof typeof IssueSubEntity];
/**
 * <p>Provides the configuration information to connect to Jira as your data source.</p>
 * @public
 */
export interface JiraConfiguration {
    /**
     * <p>The URL of the Jira account. For example,
     *             <i>company.atlassian.net</i>.</p>
     * @public
     */
    JiraAccountUrl: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of a secret in Secrets Manager contains the
     *             key-value pairs required to connect to your Jira data source. The secret must contain a
     *             JSON structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>jiraId—The Jira user name or email.</p>
     *             </li>
     *             <li>
     *                <p>jiraCredentials—The Jira API token. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-jira.html">Using a
     *                         Jira data source</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use the Jira change log to determine which documents require
     *             updating in the index. Depending on the change log's size, it may take longer for
     *                 Amazon Kendra to use the change log than to scan all of your documents in
     *             Jira.</p>
     * @public
     */
    UseChangeLog?: boolean | undefined;
    /**
     * <p>Specify which projects to crawl in your Jira data source. You can specify one or more
     *             Jira project IDs.</p>
     * @public
     */
    Project?: string[] | undefined;
    /**
     * <p>Specify which issue types to crawl in your Jira data source. You can specify one or
     *             more of these options to crawl.</p>
     * @public
     */
    IssueType?: string[] | undefined;
    /**
     * <p>Specify which statuses to crawl in your Jira data source. You can specify one or more
     *             of these options to crawl.</p>
     * @public
     */
    Status?: string[] | undefined;
    /**
     * <p>Specify whether to crawl comments, attachments, and work logs. You can specify one or
     *             more of these options.</p>
     * @public
     */
    IssueSubEntityFilter?: IssueSubEntity[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Jira attachments to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Jira fields. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html"> Mapping data source fields</a>. The
     *             Jira data source field names must exist in your Jira custom metadata.</p>
     * @public
     */
    AttachmentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Jira comments to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Jira fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">
     *                 Mapping data source fields</a>. The Jira data source field names must exist in
     *             your Jira custom metadata.</p>
     * @public
     */
    CommentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Jira issues to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Jira fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">
     *                 Mapping data source fields</a>. The Jira data source field names must exist in
     *             your Jira custom metadata.</p>
     * @public
     */
    IssueFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Jira projects to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Jira fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">
     *                 Mapping data source fields</a>. The Jira data source field names must exist in
     *             your Jira custom metadata.</p>
     * @public
     */
    ProjectFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Jira work logs to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Jira fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">
     *                 Mapping data source fields</a>. The Jira data source field names must exist in
     *             your Jira custom metadata.</p>
     * @public
     */
    WorkLogFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain file paths, file names, and
     *             file types in your Jira data source. Files that match the patterns are included in the
     *             index. Files that don't match the patterns are excluded from the index. If a file
     *             matches both an inclusion pattern and an exclusion pattern, the exclusion pattern takes
     *             precedence and the file isn't included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain file paths, file names, and
     *             file types in your Jira data source. Files that match the patterns are excluded from the
     *             index. Files that don’t match the patterns are included in the index. If a file matches
     *             both an inclusion pattern and an exclusion pattern, the exclusion pattern takes
     *             precedence and the file isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your Jira. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
/**
 * <p>User accounts whose documents should be indexed.</p>
 * @public
 */
export interface OneDriveUsers {
    /**
     * <p>A list of users whose documents should be indexed. Specify the user names in email
     *             format, for example, <code>username@tenantdomain</code>. If you need to index the
     *             documents of more than 10 users, use the <code>OneDriveUserS3Path</code> field to
     *             specify the location of a file containing a list of users.</p>
     * @public
     */
    OneDriveUserList?: string[] | undefined;
    /**
     * <p>The S3 bucket location of a file containing a list of users whose documents should be
     *             indexed.</p>
     * @public
     */
    OneDriveUserS3Path?: S3Path | undefined;
}
/**
 * <p>Provides the configuration information to connect to OneDrive as your data
 *             source.</p>
 * @public
 */
export interface OneDriveConfiguration {
    /**
     * <p>The Azure Active Directory domain of the organization. </p>
     * @public
     */
    TenantDomain: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Managersecret that contains the
     *             user name and password to connect to OneDrive. The user name should be the application
     *             ID for the OneDrive application, and the password is the application key for the
     *             OneDrive application.</p>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>A list of user accounts whose documents should be indexed.</p>
     * @public
     */
    OneDriveUsers: OneDriveUsers | undefined;
    /**
     * <p>A list of regular expression patterns to include certain documents in your OneDrive.
     *             Documents that match the patterns are included in the index. Documents that don't match
     *             the patterns are excluded from the index. If a document matches both an inclusion and
     *             exclusion pattern, the exclusion pattern takes precedence and the document isn't
     *             included in the index.</p>
     *          <p>The pattern is applied to the file name.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain documents in your OneDrive.
     *             Documents that match the patterns are excluded from the index. Documents that don't
     *             match the patterns are included in the index. If a document matches both an inclusion
     *             and exclusion pattern, the exclusion pattern takes precedence and the document isn't
     *             included in the index.</p>
     *          <p>The pattern is applied to the file name.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map OneDrive data
     *             source attributes or field names to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to OneDrive fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             OneDrive data source field names must exist in your OneDrive custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to disable local groups information.</p>
     * @public
     */
    DisableLocalGroups?: boolean | undefined;
}
/**
 * <p>Provides the configuration information to connect to Quip as your data source.</p>
 * @public
 */
export interface QuipConfiguration {
    /**
     * <p>The Quip site domain. For example,
     *                 <i>https://quip-company.quipdomain.com/browse</i>. The domain in this
     *             example is "quipdomain".</p>
     * @public
     */
    Domain: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             key-value pairs that are required to connect to your Quip. The secret must contain a
     *             JSON structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>accessToken—The token created in Quip. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-slack.html">Using a
     *                         Quip data source</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index file comments.</p>
     * @public
     */
    CrawlFileComments?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index the contents of chat rooms.</p>
     * @public
     */
    CrawlChatRooms?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index attachments.</p>
     * @public
     */
    CrawlAttachments?: boolean | undefined;
    /**
     * <p>The identifiers of the Quip folders you want to index. You can find the folder ID in
     *             your browser URL when you access your folder in Quip. For example,
     *                 <i>https://quip-company.quipdomain.com/zlLuOVNSarTL/folder-name</i>.
     *             The folder ID in this example is "zlLuOVNSarTL".</p>
     * @public
     */
    FolderIds?: string[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Quip threads to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Quip fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The Quip field names must exist in your Quip
     *             custom metadata.</p>
     * @public
     */
    ThreadFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Quip messages to Amazon Kendra index field names. To create custom
     *             fields, use the <code>UpdateIndex</code> API before you map to Quip fields. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The Quip field names must exist in your Quip
     *             custom metadata.</p>
     * @public
     */
    MessageFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map attributes or
     *             field names of Quip attachments to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Quip fields. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Quip field names must exist in your Quip custom metadata.</p>
     * @public
     */
    AttachmentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain files in your Quip file
     *             system. Files that match the patterns are included in the index. Files that don't match
     *             the patterns are excluded from the index. If a file matches both an inclusion pattern
     *             and an exclusion pattern, the exclusion pattern takes precedence, and the file isn't
     *             included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain files in your Quip file
     *             system. Files that match the patterns are excluded from the index. Files that don’t
     *             match the patterns are included in the index. If a file matches both an inclusion
     *             pattern and an exclusion pattern, the exclusion pattern takes precedence, and the file
     *             isn't included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud (VPC) to connect to your Quip.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
/**
 * <p>Document metadata files that contain information such as the document access control
 *             information, source URI, document author, and custom attributes. Each metadata file
 *             contains metadata about a single document.</p>
 * @public
 */
export interface DocumentsMetadataConfiguration {
    /**
     * <p>A prefix used to filter metadata configuration files in the Amazon Web Services S3
     *             bucket. The S3 bucket might contain multiple metadata files. Use <code>S3Prefix</code>
     *             to include only the desired metadata files.</p>
     * @public
     */
    S3Prefix?: string | undefined;
}
/**
 * <p>Provides the configuration information to connect to an Amazon S3
 *             bucket.</p>
 *          <note>
 *             <p>Amazon Kendra now supports an upgraded Amazon S3 connector.</p>
 *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
 *                 <code>S3DataSourceConfiguration</code> object to configure your connector.</p>
 *             <p>Connectors configured using the older console and API architecture will continue to
 *                 function as configured. However, you won't be able to edit or update them. If you want
 *                 to edit or update your connector configuration, you must create a new connector.</p>
 *             <p>We recommended migrating your connector workflow to the upgraded version. Support for
 *                 connectors configured using the older architecture is scheduled to end by June 2024.</p>
 *          </note>
 * @public
 */
export interface S3DataSourceConfiguration {
    /**
     * <p>The name of the bucket that contains the documents.</p>
     * @public
     */
    BucketName: string | undefined;
    /**
     * <p>A list of S3 prefixes for the documents that should be included in the index.</p>
     * @public
     */
    InclusionPrefixes?: string[] | undefined;
    /**
     * <p>A list of glob patterns (patterns that can expand a wildcard pattern into a list of
     *             path names that match the given pattern) for certain file names and file types to include
     *             in your index. If a document matches both an inclusion and exclusion prefix or pattern,
     *             the exclusion prefix takes precendence and the document is not indexed. Examples of glob
     *             patterns include:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <i>/myapp/config/*</i>—All files inside config directory.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/*.png</i>—All .png files in all directories.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/*.\{png, ico, md\}</i>—All .png, .ico or .md files in all
     *                     directories.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>/myapp/src/**\/*.ts</i>—All .ts files inside src directory (and all
     *                     its subdirectories).</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/!(*.module).ts</i>—All .ts files but not .module.ts</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>*.png , *.jpg</i>—All PNG and JPEG image files
     *                     in a directory (files with the extensions .png and .jpg).</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>*internal*</i>—All files in a directory that
     *                     contain 'internal' in the file name, such as 'internal', 'internal_only',
     *                     'company_internal'.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/*internal*</i>—All internal-related files in
     *                     a directory and its subdirectories.</p>
     *             </li>
     *          </ul>
     *          <p>For more examples, see <a href="https://docs.aws.amazon.com/cli/latest/reference/s3/#use-of-exclude-and-include-filters">Use of Exclude and
     *             Include Filters</a> in the Amazon Web Services CLI Command Reference.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of glob patterns (patterns that can expand a wildcard pattern into a list of
     *             path names that match the given pattern) for certain file names and file types to exclude
     *             from your index. If a document matches both an inclusion and exclusion prefix or pattern,
     *             the exclusion prefix takes precendence and the document is not indexed. Examples of glob
     *             patterns include:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <i>/myapp/config/*</i>—All files inside config directory.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/*.png</i>—All .png files in all directories.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/*.\{png, ico, md\}</i>—All .png, .ico or .md files in all
     *                     directories.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>/myapp/src/**\/*.ts</i>—All .ts files inside src directory (and all
     *                     its subdirectories).</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/!(*.module).ts</i>—All .ts files but not .module.ts</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>*.png , *.jpg</i>—All PNG and JPEG image files
     *                     in a directory (files with the extensions .png and .jpg).</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>*internal*</i>—All files in a directory that
     *                     contain 'internal' in the file name, such as 'internal', 'internal_only',
     *                     'company_internal'.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <i>**\/*internal*</i>—All internal-related files in
     *                     a directory and its subdirectories.</p>
     *             </li>
     *          </ul>
     *          <p>For more examples, see <a href="https://docs.aws.amazon.com/cli/latest/reference/s3/#use-of-exclude-and-include-filters">Use of Exclude and
     *                 Include Filters</a> in the Amazon Web Services CLI Command Reference.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Document metadata files that contain information such as the document access control
     *             information, source URI, document author, and custom attributes. Each metadata file
     *             contains metadata about a single document.</p>
     * @public
     */
    DocumentsMetadataConfiguration?: DocumentsMetadataConfiguration | undefined;
    /**
     * <p>Provides the path to the S3 bucket that contains the user context filtering files for
     *             the data source. For the format of the file, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/s3-acl.html">Access control for S3 data
     *             sources</a>.</p>
     * @public
     */
    AccessControlListConfiguration?: AccessControlListConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SalesforceChatterFeedIncludeFilterType: {
    readonly ACTIVE_USER: "ACTIVE_USER";
    readonly STANDARD_USER: "STANDARD_USER";
};
/**
 * @public
 */
export type SalesforceChatterFeedIncludeFilterType = (typeof SalesforceChatterFeedIncludeFilterType)[keyof typeof SalesforceChatterFeedIncludeFilterType];
/**
 * <p>The configuration information for syncing a Salesforce chatter feed. The contents of
 *             the object comes from the Salesforce FeedItem table.</p>
 * @public
 */
export interface SalesforceChatterFeedConfiguration {
    /**
     * <p>The name of the column in the Salesforce FeedItem table that contains the content to
     *             index. Typically this is the <code>Body</code> column.</p>
     * @public
     */
    DocumentDataFieldName: string | undefined;
    /**
     * <p>The name of the column in the Salesforce FeedItem table that contains the title of the
     *             document. This is typically the <code>Title</code> column.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>Maps fields from a Salesforce chatter feed into Amazon Kendra index
     *             fields.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>Filters the documents in the feed based on status of the user. When you specify
     *                 <code>ACTIVE_USERS</code> only documents from users who have an active account are
     *             indexed. When you specify <code>STANDARD_USER</code> only documents for Salesforce
     *             standard users are documented. You can specify both.</p>
     * @public
     */
    IncludeFilterTypes?: SalesforceChatterFeedIncludeFilterType[] | undefined;
}
/**
 * <p>Provides the configuration information for indexing Salesforce custom articles.</p>
 * @public
 */
export interface SalesforceCustomKnowledgeArticleTypeConfiguration {
    /**
     * <p>The name of the configuration.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The name of the field in the custom knowledge article that contains the document data
     *             to index.</p>
     * @public
     */
    DocumentDataFieldName: string | undefined;
    /**
     * <p>The name of the field in the custom knowledge article that contains the document
     *             title.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>Maps attributes or field names of the custom knowledge article to Amazon Kendra
     *             index field names. To create custom fields, use the <code>UpdateIndex</code> API before
     *             you map to Salesforce fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Salesforce data source field names must exist in your Salesforce custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SalesforceKnowledgeArticleState: {
    readonly ARCHIVED: "ARCHIVED";
    readonly DRAFT: "DRAFT";
    readonly PUBLISHED: "PUBLISHED";
};
/**
 * @public
 */
export type SalesforceKnowledgeArticleState = (typeof SalesforceKnowledgeArticleState)[keyof typeof SalesforceKnowledgeArticleState];
/**
 * <p>Provides the configuration information for standard Salesforce knowledge
 *             articles.</p>
 * @public
 */
export interface SalesforceStandardKnowledgeArticleTypeConfiguration {
    /**
     * <p>The name of the field that contains the document data to index.</p>
     * @public
     */
    DocumentDataFieldName: string | undefined;
    /**
     * <p>The name of the field that contains the document title.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>Maps attributes or field names of the knowledge article to Amazon Kendra index
     *             field names. To create custom fields, use the <code>UpdateIndex</code> API before you
     *             map to Salesforce fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Salesforce data source field names must exist in your Salesforce custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides the configuration information for the knowledge article types that Amazon Kendra indexes. Amazon Kendra indexes standard knowledge articles and the
 *             standard fields of knowledge articles, or the custom fields of custom knowledge
 *             articles, but not both </p>
 * @public
 */
export interface SalesforceKnowledgeArticleConfiguration {
    /**
     * <p>Specifies the document states that should be included when Amazon Kendra indexes
     *             knowledge articles. You must specify at least one state.</p>
     * @public
     */
    IncludedStates: SalesforceKnowledgeArticleState[] | undefined;
    /**
     * <p>Configuration information for standard Salesforce knowledge articles.</p>
     * @public
     */
    StandardKnowledgeArticleTypeConfiguration?: SalesforceStandardKnowledgeArticleTypeConfiguration | undefined;
    /**
     * <p>Configuration information for custom Salesforce knowledge articles.</p>
     * @public
     */
    CustomKnowledgeArticleTypeConfigurations?: SalesforceCustomKnowledgeArticleTypeConfiguration[] | undefined;
}
/**
 * <p>Provides the configuration information for processing attachments to Salesforce
 *             standard objects.</p>
 * @public
 */
export interface SalesforceStandardObjectAttachmentConfiguration {
    /**
     * <p>The name of the field used for the document title.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>One or more objects that map fields in attachments to Amazon Kendra index
     *             fields.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SalesforceStandardObjectName: {
    readonly ACCOUNT: "ACCOUNT";
    readonly CAMPAIGN: "CAMPAIGN";
    readonly CASE: "CASE";
    readonly CONTACT: "CONTACT";
    readonly CONTRACT: "CONTRACT";
    readonly DOCUMENT: "DOCUMENT";
    readonly GROUP: "GROUP";
    readonly IDEA: "IDEA";
    readonly LEAD: "LEAD";
    readonly OPPORTUNITY: "OPPORTUNITY";
    readonly PARTNER: "PARTNER";
    readonly PRICEBOOK: "PRICEBOOK";
    readonly PRODUCT: "PRODUCT";
    readonly PROFILE: "PROFILE";
    readonly SOLUTION: "SOLUTION";
    readonly TASK: "TASK";
    readonly USER: "USER";
};
/**
 * @public
 */
export type SalesforceStandardObjectName = (typeof SalesforceStandardObjectName)[keyof typeof SalesforceStandardObjectName];
/**
 * <p>Provides the configuration information for indexing a single standard object.</p>
 * @public
 */
export interface SalesforceStandardObjectConfiguration {
    /**
     * <p>The name of the standard object.</p>
     * @public
     */
    Name: SalesforceStandardObjectName | undefined;
    /**
     * <p>The name of the field in the standard object table that contains the document
     *             contents.</p>
     * @public
     */
    DocumentDataFieldName: string | undefined;
    /**
     * <p>The name of the field in the standard object table that contains the document
     *             title.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>Maps attributes or field names of the standard object to Amazon Kendra index
     *             field names. To create custom fields, use the <code>UpdateIndex</code> API before you
     *             map to Salesforce fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Salesforce data source field names must exist in your Salesforce custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides the configuration information to connect to Salesforce as your data
 *             source.</p>
 * @public
 */
export interface SalesforceConfiguration {
    /**
     * <p>The instance URL for the Salesforce site that you want to index.</p>
     * @public
     */
    ServerUrl: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Managersecret that contains the
     *             key/value pairs required to connect to your Salesforce instance. The secret must contain
     *             a JSON structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>authenticationUrl - The OAUTH endpoint that Amazon Kendra connects to get
     *                     an OAUTH token. </p>
     *             </li>
     *             <li>
     *                <p>consumerKey - The application public key generated when you created your
     *                     Salesforce application.</p>
     *             </li>
     *             <li>
     *                <p>consumerSecret - The application private key generated when you created your
     *                     Salesforce application.</p>
     *             </li>
     *             <li>
     *                <p>password - The password associated with the user logging in to the Salesforce
     *                     instance.</p>
     *             </li>
     *             <li>
     *                <p>securityToken - The token associated with the user logging in to the
     *                     Salesforce instance.</p>
     *             </li>
     *             <li>
     *                <p>username - The user name of the user logging in to the Salesforce
     *                     instance.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>Configuration of the Salesforce standard objects that Amazon Kendra
     *             indexes.</p>
     * @public
     */
    StandardObjectConfigurations?: SalesforceStandardObjectConfiguration[] | undefined;
    /**
     * <p>Configuration information for the knowledge article types that Amazon Kendra
     *             indexes. Amazon Kendra indexes standard knowledge articles and the standard fields
     *             of knowledge articles, or the custom fields of custom knowledge articles, but not
     *             both.</p>
     * @public
     */
    KnowledgeArticleConfiguration?: SalesforceKnowledgeArticleConfiguration | undefined;
    /**
     * <p>Configuration information for Salesforce chatter feeds.</p>
     * @public
     */
    ChatterFeedConfiguration?: SalesforceChatterFeedConfiguration | undefined;
    /**
     * <p>Indicates whether Amazon Kendra should index attachments to Salesforce
     *             objects.</p>
     * @public
     */
    CrawlAttachments?: boolean | undefined;
    /**
     * <p>Configuration information for processing attachments to Salesforce standard objects.
     *         </p>
     * @public
     */
    StandardObjectAttachmentConfiguration?: SalesforceStandardObjectAttachmentConfiguration | undefined;
    /**
     * <p>A list of regular expression patterns to include certain documents in your Salesforce.
     *             Documents that match the patterns are included in the index. Documents that don't match
     *             the patterns are excluded from the index. If a document matches both an inclusion and
     *             exclusion pattern, the exclusion pattern takes precedence and the document isn't
     *             included in the index.</p>
     *          <p>The pattern is applied to the name of the attached file.</p>
     * @public
     */
    IncludeAttachmentFilePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain documents in your Salesforce.
     *             Documents that match the patterns are excluded from the index. Documents that don't
     *             match the patterns are included in the index. If a document matches both an inclusion
     *             and exclusion pattern, the exclusion pattern takes precedence and the document isn't
     *             included in the index.</p>
     *          <p>The pattern is applied to the name of the attached file.</p>
     * @public
     */
    ExcludeAttachmentFilePatterns?: string[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ServiceNowAuthenticationType: {
    readonly HTTP_BASIC: "HTTP_BASIC";
    readonly OAUTH2: "OAUTH2";
};
/**
 * @public
 */
export type ServiceNowAuthenticationType = (typeof ServiceNowAuthenticationType)[keyof typeof ServiceNowAuthenticationType];
/**
 * <p>Provides the configuration information for crawling knowledge articles in the
 *             ServiceNow site.</p>
 * @public
 */
export interface ServiceNowKnowledgeArticleConfiguration {
    /**
     * <p>
     *             <code>TRUE</code> to index attachments to knowledge articles.</p>
     * @public
     */
    CrawlAttachments?: boolean | undefined;
    /**
     * <p>A list of regular expression patterns applied to include knowledge article
     *             attachments. Attachments that match the patterns are included in the index. Items that
     *             don't match the patterns are excluded from the index. If an item matches both an
     *             inclusion and exclusion pattern, the exclusion pattern takes precedence and the item
     *             isn't included in the index.</p>
     * @public
     */
    IncludeAttachmentFilePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns applied to exclude certain knowledge article
     *             attachments. Attachments that match the patterns are excluded from the index. Items that
     *             don't match the patterns are included in the index. If an item matches both an inclusion
     *             and exclusion pattern, the exclusion pattern takes precedence and the item isn't
     *             included in the index.</p>
     * @public
     */
    ExcludeAttachmentFilePatterns?: string[] | undefined;
    /**
     * <p>The name of the ServiceNow field that is mapped to the index document contents field
     *             in the Amazon Kendra index.</p>
     * @public
     */
    DocumentDataFieldName: string | undefined;
    /**
     * <p>The name of the ServiceNow field that is mapped to the index document title
     *             field.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>Maps attributes or field names of knoweldge articles to Amazon Kendra index field
     *             names. To create custom fields, use the <code>UpdateIndex</code> API before you map to
     *             ServiceNow fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             ServiceNow data source field names must exist in your ServiceNow custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>A query that selects the knowledge articles to index. The query can return articles
     *             from multiple knowledge bases, and the knowledge bases can be public or private.</p>
     *          <p>The query string must be one generated by the ServiceNow console. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/servicenow-query.html">Specifying documents to index with a
     *                 query</a>. </p>
     * @public
     */
    FilterQuery?: string | undefined;
}
/**
 * <p>Provides the configuration information for crawling service catalog items in the
 *             ServiceNow site</p>
 * @public
 */
export interface ServiceNowServiceCatalogConfiguration {
    /**
     * <p>
     *             <code>TRUE</code> to index attachments to service catalog items.</p>
     * @public
     */
    CrawlAttachments?: boolean | undefined;
    /**
     * <p>A list of regular expression patterns to include certain attachments of catalogs in
     *             your ServiceNow. Item that match the patterns are included in the index. Items that
     *             don't match the patterns are excluded from the index. If an item matches both an
     *             inclusion and exclusion pattern, the exclusion pattern takes precedence and the item
     *             isn't included in the index.</p>
     *          <p>The regex is applied to the file name of the attachment.</p>
     * @public
     */
    IncludeAttachmentFilePatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain attachments of catalogs in
     *             your ServiceNow. Item that match the patterns are excluded from the index. Items that
     *             don't match the patterns are included in the index. If an item matches both an inclusion
     *             and exclusion pattern, the exclusion pattern takes precedence and the item isn't
     *             included in the index.</p>
     *          <p>The regex is applied to the file name of the attachment.</p>
     * @public
     */
    ExcludeAttachmentFilePatterns?: string[] | undefined;
    /**
     * <p>The name of the ServiceNow field that is mapped to the index document contents field
     *             in the Amazon Kendra index.</p>
     * @public
     */
    DocumentDataFieldName: string | undefined;
    /**
     * <p>The name of the ServiceNow field that is mapped to the index document title
     *             field.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>Maps attributes or field names of catalogs to Amazon Kendra index field names. To
     *             create custom fields, use the <code>UpdateIndex</code> API before you map to ServiceNow
     *             fields. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             ServiceNow data source field names must exist in your ServiceNow custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ServiceNowBuildVersionType: {
    readonly LONDON: "LONDON";
    readonly OTHERS: "OTHERS";
};
/**
 * @public
 */
export type ServiceNowBuildVersionType = (typeof ServiceNowBuildVersionType)[keyof typeof ServiceNowBuildVersionType];
/**
 * <p>Provides the configuration information to connect to ServiceNow as your data
 *             source.</p>
 * @public
 */
export interface ServiceNowConfiguration {
    /**
     * <p>The ServiceNow instance that the data source connects to. The host endpoint should
     *             look like the following: <i>\{instance\}.service-now.com.</i>
     *          </p>
     * @public
     */
    HostUrl: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Secrets Manager secret that contains the
     *             user name and password required to connect to the ServiceNow instance. You can also
     *             provide OAuth authentication credentials of user name, password, client ID, and client
     *             secret. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-servicenow.html">Using a ServiceNow data
     *                 source</a>.</p>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>The identifier of the release that the ServiceNow host is running. If the host is not
     *             running the <code>LONDON</code> release, use <code>OTHERS</code>.</p>
     * @public
     */
    ServiceNowBuildVersion: ServiceNowBuildVersionType | undefined;
    /**
     * <p>Configuration information for crawling knowledge articles in the ServiceNow
     *             site.</p>
     * @public
     */
    KnowledgeArticleConfiguration?: ServiceNowKnowledgeArticleConfiguration | undefined;
    /**
     * <p>Configuration information for crawling service catalogs in the ServiceNow site.</p>
     * @public
     */
    ServiceCatalogConfiguration?: ServiceNowServiceCatalogConfiguration | undefined;
    /**
     * <p>The type of authentication used to connect to the ServiceNow instance. If you choose
     *                 <code>HTTP_BASIC</code>, Amazon Kendra is authenticated using the user name and
     *             password provided in the Secrets Manager secret in the <code>SecretArn</code>
     *             field. If you choose <code>OAUTH2</code>, Amazon Kendra is authenticated using the
     *             credentials of client ID, client secret, user name and password.</p>
     *          <p>When you use <code>OAUTH2</code> authentication, you must generate a token and a
     *             client secret using the ServiceNow console. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-servicenow.html">Using a
     *                 ServiceNow data source</a>.</p>
     * @public
     */
    AuthenticationType?: ServiceNowAuthenticationType | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SharePointOnlineAuthenticationType: {
    readonly HTTP_BASIC: "HTTP_BASIC";
    readonly OAUTH2: "OAUTH2";
};
/**
 * @public
 */
export type SharePointOnlineAuthenticationType = (typeof SharePointOnlineAuthenticationType)[keyof typeof SharePointOnlineAuthenticationType];
/**
 * @public
 * @enum
 */
export declare const SharePointVersion: {
    readonly SHAREPOINT_2013: "SHAREPOINT_2013";
    readonly SHAREPOINT_2016: "SHAREPOINT_2016";
    readonly SHAREPOINT_2019: "SHAREPOINT_2019";
    readonly SHAREPOINT_ONLINE: "SHAREPOINT_ONLINE";
};
/**
 * @public
 */
export type SharePointVersion = (typeof SharePointVersion)[keyof typeof SharePointVersion];
/**
 * <p>Provides the configuration information to connect to Microsoft SharePoint as your data
 *             source.</p>
 * @public
 */
export interface SharePointConfiguration {
    /**
     * <p>The version of Microsoft SharePoint that you use.</p>
     * @public
     */
    SharePointVersion: SharePointVersion | undefined;
    /**
     * <p>The Microsoft SharePoint site URLs for the documents you want to index.</p>
     * @public
     */
    Urls: string[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             user name and password required to connect to the SharePoint instance. For more
     *             information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-sharepoint.html">Microsoft
     *             SharePoint</a>.</p>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index document attachments.</p>
     * @public
     */
    CrawlAttachments?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use the SharePoint change log to determine which documents
     *             require updating in the index. Depending on the change log's size, it may take longer
     *             for Amazon Kendra to use the change log than to scan all of your documents in
     *             SharePoint.</p>
     * @public
     */
    UseChangeLog?: boolean | undefined;
    /**
     * <p>A list of regular expression patterns to include certain documents in your SharePoint.
     *             Documents that match the patterns are included in the index. Documents that don't match
     *             the patterns are excluded from the index. If a document matches both an inclusion and
     *             exclusion pattern, the exclusion pattern takes precedence and the document isn't
     *             included in the index.</p>
     *          <p>The regex applies to the display URL of the SharePoint document.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain documents in your SharePoint.
     *             Documents that match the patterns are excluded from the index. Documents that don't
     *             match the patterns are included in the index. If a document matches both an inclusion
     *             and exclusion pattern, the exclusion pattern takes precedence and the document isn't
     *             included in the index.</p>
     *          <p>The regex applies to the display URL of the SharePoint document.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your Microsoft
     *             SharePoint. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map SharePoint data
     *             source attributes or field names to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to SharePoint fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             SharePoint data source field names must exist in your SharePoint custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
    /**
     * <p>The Microsoft SharePoint attribute field that contains the title of the
     *             document.</p>
     * @public
     */
    DocumentTitleFieldName?: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to disable local groups information.</p>
     * @public
     */
    DisableLocalGroups?: boolean | undefined;
    /**
     * <p>The path to the SSL certificate stored in an Amazon S3 bucket. You use this to
     *             connect to SharePoint Server if you require a secure SSL connection.</p>
     *          <p>You can generate a self-signed X509 certificate on any computer using OpenSSL. For an
     *             example of using OpenSSL to create an X509 certificate, see <a href="https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/configuring-https-ssl.html">Create and sign an X509
     *                 certificate</a>.</p>
     * @public
     */
    SslCertificateS3Path?: S3Path | undefined;
    /**
     * <p>Whether you want to connect to SharePoint Online using basic authentication of user
     *             name and password, or OAuth authentication of user name, password, client ID, and client
     *             secret, or AD App-only authentication of client secret.</p>
     * @public
     */
    AuthenticationType?: SharePointOnlineAuthenticationType | undefined;
    /**
     * <p>Configuration information to connect to your Microsoft SharePoint site URLs via
     *             instance via a web proxy. You can use this option for SharePoint Server.</p>
     *          <p>You must provide the website host name and port number. For example, the host name of
     *                 <i>https://a.example.com/page1.html</i> is "a.example.com" and the
     *             port is 443, the standard port for HTTPS.</p>
     *          <p>Web proxy credentials are optional and you can use them to connect to a web proxy
     *             server that requires basic authentication of user name and password. To store web proxy
     *             credentials, you use a secret in Secrets Manager.</p>
     *          <p>It is recommended that you follow best security practices when configuring your web
     *             proxy. This includes setting up throttling, setting up logging and monitoring, and
     *             applying security patches on a regular basis. If you use your web proxy with multiple
     *             data sources, sync jobs that occur at the same time could strain the load on your proxy.
     *             It is recommended you prepare your proxy beforehand for any security and load
     *             requirements.</p>
     * @public
     */
    ProxyConfiguration?: ProxyConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SlackEntity: {
    readonly DIRECT_MESSAGE: "DIRECT_MESSAGE";
    readonly GROUP_MESSAGE: "GROUP_MESSAGE";
    readonly PRIVATE_CHANNEL: "PRIVATE_CHANNEL";
    readonly PUBLIC_CHANNEL: "PUBLIC_CHANNEL";
};
/**
 * @public
 */
export type SlackEntity = (typeof SlackEntity)[keyof typeof SlackEntity];
/**
 * <p>Provides the configuration information to connect to Slack as your data source.</p>
 *          <note>
 *             <p>Amazon Kendra now supports an upgraded Slack connector.</p>
 *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
 *                 <code>SlackConfiguration</code> object to configure your connector.</p>
 *             <p>Connectors configured using the older console and API architecture will continue to
 *                 function as configured. However, you won’t be able to edit or update them. If you want
 *                 to edit or update your connector configuration, you must create a new connector.</p>
 *             <p>We recommended migrating your connector workflow to the upgraded version. Support for
 *                 connectors configured using the older architecture is scheduled to end by June 2024.</p>
 *          </note>
 * @public
 */
export interface SlackConfiguration {
    /**
     * <p>The identifier of the team in the Slack workspace. For example,
     *                 <i>T0123456789</i>.</p>
     *          <p>You can find your team ID in the URL of the main page of your Slack workspace. When
     *             you log in to Slack via a browser, you are directed to the URL of the main page. For
     *             example, <i>https://app.slack.com/client/<b>T0123456789</b>/...</i>.</p>
     * @public
     */
    TeamId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an Secrets Manager secret that contains the
     *             key-value pairs required to connect to your Slack workspace team. The secret must
     *             contain a JSON structure with the following keys:</p>
     *          <ul>
     *             <li>
     *                <p>slackToken—The user or bot token created in Slack. For more information
     *                     on creating a token in Slack, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-source-slack.html#slack-authentication">Authentication for a Slack data source</a>.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SecretArn: string | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your Slack. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>Specify whether to index public channels, private channels, group messages, and direct
     *             messages. You can specify one or more of these options.</p>
     * @public
     */
    SlackEntityList: SlackEntity[] | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use the Slack change log to determine which documents require
     *             updating in the index. Depending on the Slack change log's size, it may take longer for
     *                 Amazon Kendra to use the change log than to scan all of your documents in
     *             Slack.</p>
     * @public
     */
    UseChangeLog?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to index bot messages from your Slack workspace team.</p>
     * @public
     */
    CrawlBotMessage?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to exclude archived messages to index from your Slack workspace
     *             team.</p>
     * @public
     */
    ExcludeArchived?: boolean | undefined;
    /**
     * <p>The date to start crawling your data from your Slack workspace team. The date must
     *             follow this format: <code>yyyy-mm-dd</code>.</p>
     * @public
     */
    SinceCrawlDate: string | undefined;
    /**
     * <p>The number of hours for change log to look back from when you last synchronized your
     *             data. You can look back up to 7 days or 168 hours.</p>
     *          <p>Change log updates your index only if new content was added since you last synced your
     *             data. Updated or deleted content from before you last synced does not get updated in
     *             your index. To capture updated or deleted content before you last synced, set the
     *                 <code>LookBackPeriod</code> to the number of hours you want change log to look
     *             back.</p>
     * @public
     */
    LookBackPeriod?: number | undefined;
    /**
     * <p>The list of private channel names from your Slack workspace team. You use this if you
     *             want to index specific private channels, not all private channels. You can also use
     *             regular expression patterns to filter private channels.</p>
     * @public
     */
    PrivateChannelFilter?: string[] | undefined;
    /**
     * <p>The list of public channel names to index from your Slack workspace team. You use this
     *             if you want to index specific public channels, not all public channels. You can also use
     *             regular expression patterns to filter public channels.</p>
     * @public
     */
    PublicChannelFilter?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to include certain attached files in your Slack
     *             workspace team. Files that match the patterns are included in the index. Files that
     *             don't match the patterns are excluded from the index. If a file matches both an
     *             inclusion and exclusion pattern, the exclusion pattern takes precedence and the file
     *             isn't included in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain attached files in your Slack
     *             workspace team. Files that match the patterns are excluded from the index. Files that
     *             don’t match the patterns are included in the index. If a file matches both an inclusion
     *             and exclusion pattern, the exclusion pattern takes precedence and the file isn't
     *             included in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that map Slack data
     *             source attributes or field names to Amazon Kendra index field names. To create
     *             custom fields, use the <code>UpdateIndex</code> API before you map to Slack fields. For
     *             more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping data source fields</a>. The
     *             Slack data source field names must exist in your Slack custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides a template for the configuration information to connect to your data
 *       source.</p>
 * @public
 */
export interface TemplateConfiguration {
    /**
     * <p>The template schema used for the data source, where templates schemas are
     *       supported.</p>
     *          <p>See <a href="https://docs.aws.amazon.com/kendra/latest/dg/ds-schemas.html">Data source
     *         template schemas</a>.</p>
     * @public
     */
    Template?: __DocumentType | undefined;
}
/**
 * @public
 * @enum
 */
export declare const WebCrawlerMode: {
    readonly EVERYTHING: "EVERYTHING";
    readonly HOST_ONLY: "HOST_ONLY";
    readonly SUBDOMAINS: "SUBDOMAINS";
};
/**
 * @public
 */
export type WebCrawlerMode = (typeof WebCrawlerMode)[keyof typeof WebCrawlerMode];
/**
 * <p>Provides the configuration information for the seed or starting point URLs to
 *             crawl.</p>
 *          <p>
 *             <i>When selecting websites to index, you must adhere to the <a href="https://aws.amazon.com/aup/">Amazon Acceptable Use Policy</a> and all
 *                 other Amazon terms. Remember that you must only use Amazon Kendra Web Crawler
 *                 to index your own web pages, or web pages that you have authorization to
 *                 index.</i>
 *          </p>
 * @public
 */
export interface SeedUrlConfiguration {
    /**
     * <p>The list of seed or starting point URLs of the websites you want to crawl.</p>
     *          <p>The list can include a maximum of 100 seed URLs.</p>
     * @public
     */
    SeedUrls: string[] | undefined;
    /**
     * <p>You can choose one of the following modes:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>HOST_ONLY</code>—crawl only the website host names. For
     *                     example, if the seed URL is "abc.example.com", then only URLs with host name
     *                     "abc.example.com" are crawled.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUBDOMAINS</code>—crawl the website host names with subdomains.
     *                     For example, if the seed URL is "abc.example.com", then "a.abc.example.com" and
     *                     "b.abc.example.com" are also crawled.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>EVERYTHING</code>—crawl the website host names with subdomains
     *                     and other domains that the web pages link to.</p>
     *             </li>
     *          </ul>
     *          <p>The default mode is set to <code>HOST_ONLY</code>.</p>
     * @public
     */
    WebCrawlerMode?: WebCrawlerMode | undefined;
}
/**
 * <p>Provides the configuration information for the sitemap URLs to crawl.</p>
 *          <p>
 *             <i>When selecting websites to index, you must adhere to the <a href="https://aws.amazon.com/aup/">Amazon Acceptable Use Policy</a> and all
 *                 other Amazon terms. Remember that you must only use Amazon Kendra Web Crawler
 *                 to index your own web pages, or web pages that you have authorization to
 *                 index.</i>
 *          </p>
 * @public
 */
export interface SiteMapsConfiguration {
    /**
     * <p>The list of sitemap URLs of the websites you want to crawl.</p>
     *          <p>The list can include a maximum of three sitemap URLs.</p>
     * @public
     */
    SiteMaps: string[] | undefined;
}
/**
 * <p>Provides the configuration information of the URLs to crawl.</p>
 *          <p>You can only crawl websites that use the secure communication protocol, Hypertext
 *             Transfer Protocol Secure (HTTPS). If you receive an error when crawling a website, it
 *             could be that the website is blocked from crawling.</p>
 *          <p>
 *             <i>When selecting websites to index, you must adhere to the <a href="https://aws.amazon.com/aup/">Amazon Acceptable Use Policy</a> and all
 *                 other Amazon terms. Remember that you must only use Amazon Kendra Web Crawler
 *                 to index your own web pages, or web pages that you have authorization to
 *                 index.</i>
 *          </p>
 * @public
 */
export interface Urls {
    /**
     * <p>Configuration of the seed or starting point URLs of the websites you want to
     *             crawl.</p>
     *          <p>You can choose to crawl only the website host names, or the website host names with
     *             subdomains, or the website host names with subdomains and other domains that the
     *             web pages link to.</p>
     *          <p>You can list up to 100 seed URLs.</p>
     * @public
     */
    SeedUrlConfiguration?: SeedUrlConfiguration | undefined;
    /**
     * <p>Configuration of the sitemap URLs of the websites you want to crawl.</p>
     *          <p>Only URLs belonging to the same website host names are crawled. You can list up to
     *             three sitemap URLs.</p>
     * @public
     */
    SiteMapsConfiguration?: SiteMapsConfiguration | undefined;
}
/**
 * <p>Provides the configuration information required for Amazon Kendra Web
 *             Crawler.</p>
 * @public
 */
export interface WebCrawlerConfiguration {
    /**
     * <p>Specifies the seed or starting point URLs of the websites or the sitemap URLs of the
     *             websites you want to crawl.</p>
     *          <p>You can include website subdomains. You can list up to 100 seed URLs and up to three
     *             sitemap URLs.</p>
     *          <p>You can only crawl websites that use the secure communication protocol, Hypertext
     *             Transfer Protocol Secure (HTTPS). If you receive an error when crawling a website, it
     *             could be that the website is blocked from crawling.</p>
     *          <p>
     *             <i>When selecting websites to index, you must adhere to the <a href="https://aws.amazon.com/aup/">Amazon Acceptable Use Policy</a> and all
     *                 other Amazon terms. Remember that you must only use Amazon Kendra Web Crawler
     *                 to index your own web pages, or web pages that you have authorization to
     *                 index.</i>
     *          </p>
     * @public
     */
    Urls: Urls | undefined;
    /**
     * <p>The 'depth' or number of levels from the seed level to crawl. For example, the seed
     *             URL page is depth 1 and any hyperlinks on this page that are also crawled are depth 2.</p>
     * @public
     */
    CrawlDepth?: number | undefined;
    /**
     * <p>The maximum number of URLs on a web page to include when crawling a website. This
     *             number is per web page.</p>
     *          <p>As a website’s web pages are crawled, any URLs the web pages link to are also crawled.
     *             URLs on a web page are crawled in order of appearance.</p>
     *          <p>The default maximum links per page is 100.</p>
     * @public
     */
    MaxLinksPerPage?: number | undefined;
    /**
     * <p>The maximum size (in MB) of a web page or attachment to crawl.</p>
     *          <p>Files larger than this size (in MB) are skipped/not crawled.</p>
     *          <p>The default maximum size of a web page or attachment is set to 50 MB.</p>
     * @public
     */
    MaxContentSizePerPageInMegaBytes?: number | undefined;
    /**
     * <p>The maximum number of URLs crawled per website host per minute.</p>
     *          <p>A minimum of one URL is required.</p>
     *          <p>The default maximum number of URLs crawled per website host per minute is 300.</p>
     * @public
     */
    MaxUrlsPerMinuteCrawlRate?: number | undefined;
    /**
     * <p>A list of regular expression patterns to include certain URLs to crawl. URLs that
     *             match the patterns are included in the index. URLs that don't match the patterns are
     *             excluded from the index. If a URL matches both an inclusion and exclusion pattern, the
     *             exclusion pattern takes precedence and the URL file isn't included in the index.</p>
     * @public
     */
    UrlInclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain URLs to crawl. URLs that
     *             match the patterns are excluded from the index. URLs that don't match the patterns are
     *             included in the index. If a URL matches both an inclusion and exclusion pattern, the
     *             exclusion pattern takes precedence and the URL file isn't included in the index.</p>
     * @public
     */
    UrlExclusionPatterns?: string[] | undefined;
    /**
     * <p>Configuration information required to connect to your internal websites via a web
     *             proxy.</p>
     *          <p>You must provide the website host name and port number. For example, the host name of
     *             https://a.example.com/page1.html is "a.example.com" and the port is 443, the standard
     *             port for HTTPS.</p>
     *          <p>Web proxy credentials are optional and you can use them to connect to a web proxy
     *             server that requires basic authentication. To store web proxy credentials, you use a
     *             secret in <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html">Secrets Manager</a>.</p>
     * @public
     */
    ProxyConfiguration?: ProxyConfiguration | undefined;
    /**
     * <p>Configuration information required to connect to websites using authentication.</p>
     *          <p>You can connect to websites using basic authentication of user name and password. You
     *             use a secret in <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html">Secrets Manager</a> to
     *             store your authentication credentials.</p>
     *          <p>You must provide the website host name and port number. For example, the host name of
     *             https://a.example.com/page1.html is "a.example.com" and the port is 443, the standard
     *             port for HTTPS.</p>
     * @public
     */
    AuthenticationConfiguration?: AuthenticationConfiguration | undefined;
}
/**
 * <p>Provides the configuration information to connect to Amazon WorkDocs
 *             as your data source.</p>
 *          <p>Amazon WorkDocs connector is available in Oregon, North Virginia, Sydney, Singapore and Ireland
 *             regions.</p>
 * @public
 */
export interface WorkDocsConfiguration {
    /**
     * <p>The identifier of the directory corresponding to your
     *             Amazon WorkDocs site repository.</p>
     *          <p>You can find the organization ID in the
     *             <a href="https://console.aws.amazon.com/directoryservicev2/">Directory Service</a> by going to
     *             <b>Active Directory</b>, then
     *             <b>Directories</b>. Your Amazon WorkDocs site directory has an
     *             ID, which is the organization ID. You can also set up a new Amazon WorkDocs
     *             directory in the Directory Service console and enable a Amazon WorkDocs site
     *             for the directory in the Amazon WorkDocs console.</p>
     * @public
     */
    OrganizationId: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to include comments on documents
     *             in your index. Including comments in your index means each comment
     *             is a document that can be searched on.</p>
     *          <p>The default is set to <code>FALSE</code>.</p>
     * @public
     */
    CrawlComments?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use the Amazon WorkDocs change log to determine
     *             which documents require updating in the index. Depending on the change log's
     *             size, it may take longer for Amazon Kendra to use the change log than to
     *             scan all of your documents in Amazon WorkDocs.</p>
     * @public
     */
    UseChangeLog?: boolean | undefined;
    /**
     * <p>A list of regular expression patterns to include certain files
     *             in your Amazon WorkDocs site repository. Files that match the patterns
     *             are included in the index. Files that don't match the patterns are
     *             excluded from the index. If a file matches both an inclusion and exclusion
     *             pattern, the exclusion pattern takes precedence and the file isn't included
     *             in the index.</p>
     * @public
     */
    InclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of regular expression patterns to exclude certain files
     *             in your Amazon WorkDocs site repository. Files that match the patterns
     *             are excluded from the index. Files that don’t match the patterns
     *             are included in the index. If a file matches both an inclusion and exclusion
     *             pattern, the exclusion pattern takes precedence and the file isn't included
     *             in the index.</p>
     * @public
     */
    ExclusionPatterns?: string[] | undefined;
    /**
     * <p>A list of <code>DataSourceToIndexFieldMapping</code> objects that
     *             map Amazon WorkDocs data source attributes or field names to Amazon Kendra
     *             index field names. To create custom fields, use the
     *             <code>UpdateIndex</code> API before you map to Amazon WorkDocs fields.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/field-mapping.html">Mapping
     *                 data source fields</a>. The Amazon WorkDocs data source field names
     *             must exist in your Amazon WorkDocs custom metadata.</p>
     * @public
     */
    FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
/**
 * <p>Provides the configuration information for an Amazon Kendra data source.</p>
 * @public
 */
export interface DataSourceConfiguration {
    /**
     * <p>Provides the configuration information to connect to an Amazon S3 bucket as your
     *       data source.</p>
     *          <note>
     *             <p>Amazon Kendra now supports an upgraded Amazon S3 connector.</p>
     *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
     *         <code>S3DataSourceConfiguration</code> object to configure your connector.</p>
     *             <p>Connectors configured using the older console and API architecture will continue to
     *         function as configured. However, you won't be able to edit or update them. If you want
     *         to edit or update your connector configuration, you must create a new connector.</p>
     *             <p>We recommended migrating your connector workflow to the upgraded version. Support for
     *         connectors configured using the older architecture is scheduled to end by June 2024.</p>
     *          </note>
     * @public
     */
    S3Configuration?: S3DataSourceConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Microsoft SharePoint as your data
     *       source.</p>
     * @public
     */
    SharePointConfiguration?: SharePointConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to a database as your data
     *       source.</p>
     * @public
     */
    DatabaseConfiguration?: DatabaseConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Salesforce as your data
     *       source.</p>
     * @public
     */
    SalesforceConfiguration?: SalesforceConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Microsoft OneDrive as your data
     *       source.</p>
     * @public
     */
    OneDriveConfiguration?: OneDriveConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to ServiceNow as your data
     *       source.</p>
     * @public
     */
    ServiceNowConfiguration?: ServiceNowConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Confluence as your data
     *       source.</p>
     * @public
     */
    ConfluenceConfiguration?: ConfluenceConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Google Drive as your data
     *       source.</p>
     * @public
     */
    GoogleDriveConfiguration?: GoogleDriveConfiguration | undefined;
    /**
     * <p>Provides the configuration information required for Amazon Kendra Web
     *             Crawler.</p>
     * @public
     */
    WebCrawlerConfiguration?: WebCrawlerConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Amazon WorkDocs as your data
     *       source.</p>
     * @public
     */
    WorkDocsConfiguration?: WorkDocsConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Amazon FSx as your data
     *       source.</p>
     *          <note>
     *             <p>Amazon Kendra now supports an upgraded Amazon FSx Windows connector.</p>
     *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
     *         <code>FsxConfiguration</code> object to configure your connector.</p>
     *             <p>Connectors configured using the older console and API architecture will continue to
     *         function as configured. However, you won't be able to edit or update them. If you want
     *         to edit or update your connector configuration, you must create a new connector.</p>
     *             <p>We recommended migrating your connector workflow to the upgraded version. Support for
     *         connectors configured using the older architecture is scheduled to end by June 2024.</p>
     *          </note>
     * @public
     */
    FsxConfiguration?: FsxConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Slack as your data source.</p>
     *          <note>
     *             <p>Amazon Kendra now supports an upgraded Slack connector.</p>
     *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
     *         <code>SlackConfiguration</code> object to configure your connector.</p>
     *             <p>Connectors configured using the older console and API architecture will continue to
     *         function as configured. However, you won't be able to edit or update them. If you want
     *         to edit or update your connector configuration, you must create a new connector.</p>
     *             <p>We recommended migrating your connector workflow to the upgraded version. Support for
     *         connectors configured using the older architecture is scheduled to end by June 2024.</p>
     *          </note>
     * @public
     */
    SlackConfiguration?: SlackConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Box as your data source.</p>
     * @public
     */
    BoxConfiguration?: BoxConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Quip as your data source.</p>
     * @public
     */
    QuipConfiguration?: QuipConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Jira as your data source.</p>
     * @public
     */
    JiraConfiguration?: JiraConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to GitHub as your data source.</p>
     *          <note>
     *             <p>Amazon Kendra now supports an upgraded GitHub connector.</p>
     *             <p>You must now use the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a> object instead of the
     *         <code>GitHubConfiguration</code> object to configure your connector.</p>
     *             <p>Connectors configured using the older console and API architecture will continue
     *         to function as configured. However, you won’t be able to edit or update them. If you
     *         want to edit or update your connector configuration, you must create a new
     *         connector.</p>
     *             <p>We recommended migrating your connector workflow to the upgraded version. Support
     *         for connectors configured using the older architecture is scheduled to end by June
     *         2024.</p>
     *          </note>
     * @public
     */
    GitHubConfiguration?: GitHubConfiguration | undefined;
    /**
     * <p>Provides the configuration information to connect to Alfresco as your data source.</p>
     *          <note>
     *             <p>Support for <code>AlfrescoConfiguration</code> ended May 2023.
     *         We recommend migrating to or using the Alfresco data source template
     *         schema / <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_TemplateConfiguration.html">TemplateConfiguration</a>
     *         API.</p>
     *          </note>
     *
     * @deprecated
     * @public
     */
    AlfrescoConfiguration?: AlfrescoConfiguration | undefined;
    /**
     * <p>Provides a template for the configuration information to connect to your data
     *       source.</p>
     * @public
     */
    TemplateConfiguration?: TemplateConfiguration | undefined;
}
/**
 * <p>A key-value pair that identifies or categorizes an index, FAQ,
 *       data source, or other resource. TA tag key and value can consist of Unicode letters,
 *       digits, white space, and any of the following symbols: _ . : / = + - @.</p>
 * @public
 */
export interface Tag {
    /**
     * <p>The key for the tag. Keys are not case sensitive and must be unique for the index, FAQ,
     *       data source, or other resource.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The value associated with the tag. The value may be an empty string but it can't be
     *       null.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DataSourceType: {
    readonly ALFRESCO: "ALFRESCO";
    readonly BOX: "BOX";
    readonly CONFLUENCE: "CONFLUENCE";
    readonly CUSTOM: "CUSTOM";
    readonly DATABASE: "DATABASE";
    readonly FSX: "FSX";
    readonly GITHUB: "GITHUB";
    readonly GOOGLEDRIVE: "GOOGLEDRIVE";
    readonly JIRA: "JIRA";
    readonly ONEDRIVE: "ONEDRIVE";
    readonly QUIP: "QUIP";
    readonly S3: "S3";
    readonly SALESFORCE: "SALESFORCE";
    readonly SERVICENOW: "SERVICENOW";
    readonly SHAREPOINT: "SHAREPOINT";
    readonly SLACK: "SLACK";
    readonly TEMPLATE: "TEMPLATE";
    readonly WEBCRAWLER: "WEBCRAWLER";
    readonly WORKDOCS: "WORKDOCS";
};
/**
 * @public
 */
export type DataSourceType = (typeof DataSourceType)[keyof typeof DataSourceType];
/**
 * @public
 */
export interface CreateDataSourceRequest {
    /**
     * <p>A name for the data source connector.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The identifier of the index you want to use with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The type of data source repository. For example, <code>SHAREPOINT</code>.</p>
     * @public
     */
    Type: DataSourceType | undefined;
    /**
     * <p>Configuration information to connect to your data source repository.</p>
     *          <p>You can't specify the <code>Configuration</code> parameter when the <code>Type</code>
     *       parameter is set to <code>CUSTOM</code>. If you do, you receive a
     *         <code>ValidationException</code> exception.</p>
     *          <p>The <code>Configuration</code> parameter is required for all other data sources.</p>
     * @public
     */
    Configuration?: DataSourceConfiguration | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your data source.
     *       For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>A description for the data source connector.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Sets the frequency for Amazon Kendra to check the documents in your data source
     *       repository and update the index. If you don't set a schedule Amazon Kendra will not
     *       periodically update the index. You can call the <code>StartDataSourceSyncJob</code> API to
     *       update the index.</p>
     *          <p>Specify a <code>cron-</code> format schedule string or an empty string to indicate that
     *       the index is updated on demand.</p>
     *          <p>You can't specify the <code>Schedule</code> parameter when the <code>Type</code> parameter
     *       is set to <code>CUSTOM</code>. If you do, you receive a <code>ValidationException</code>
     *       exception.</p>
     * @public
     */
    Schedule?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *       the data source and required resources. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM access roles for Amazon Kendra.</a>.</p>
     *          <p>You can't specify the <code>RoleArn</code> parameter when the <code>Type</code> parameter
     *       is set to <code>CUSTOM</code>. If you do, you receive a <code>ValidationException</code>
     *       exception.</p>
     *          <p>The <code>RoleArn</code> parameter is required for all other data sources.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>A list of key-value pairs that identify or categorize the data source connector. You
     *       can also use tags to help control access to the data source connector. Tag keys and values
     *       can consist of Unicode letters, digits, white space, and any of the following symbols:
     *       _ . : / = + - @.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A token that you provide to identify the request to create a data source connector.
     *       Multiple calls to the <code>CreateDataSource</code> API with the same client token will create
     *       only one data source connector.</p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>The code for a language. This allows you to support a language for all
     *             documents when creating the data source connector. English is supported
     *             by default. For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
    /**
     * <p>Configuration information for altering document metadata and content during the
     *             document ingestion process.</p>
     *          <p>For more information on how to create, modify and delete document metadata, or make
     *             other content alterations when you ingest documents into Amazon Kendra, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata during the ingestion process</a>.</p>
     * @public
     */
    CustomDocumentEnrichmentConfiguration?: CustomDocumentEnrichmentConfiguration | undefined;
}
/**
 * @public
 */
export interface CreateDataSourceResponse {
    /**
     * <p>The identifier of the data source connector.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * <p>Provides the configuration information for your content sources, such as data sources,
 *             FAQs, and content indexed directly via <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_BatchPutDocument.html">BatchPutDocument</a>.</p>
 * @public
 */
export interface ContentSourceConfiguration {
    /**
     * <p>The identifier of the data sources you want to use for your Amazon Kendra experience.</p>
     * @public
     */
    DataSourceIds?: string[] | undefined;
    /**
     * <p>The identifier of the FAQs that you want to use for your Amazon Kendra experience.</p>
     * @public
     */
    FaqIds?: string[] | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use documents you indexed directly using the
     *                 <code>BatchPutDocument</code> API.</p>
     * @public
     */
    DirectPutContent?: boolean | undefined;
}
/**
 * <p>Provides the configuration information for the identifiers of your users.</p>
 * @public
 */
export interface UserIdentityConfiguration {
    /**
     * <p>The IAM Identity Center field name that contains the identifiers of your users,
     *             such as their emails. This is used for <a href="https://docs.aws.amazon.com/kendra/latest/dg/user-context-filter.html">user context filtering</a>
     *             and for granting access to your Amazon Kendra experience. You must set up IAM Identity Center
     *             with Amazon Kendra. You must include your users and groups in your Access Control List when
     *             you ingest documents into your index. For more information, see
     *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/getting-started-aws-sso.html">Getting
     *                 started with an IAM Identity Center identity source</a>.</p>
     * @public
     */
    IdentityAttributeName?: string | undefined;
}
/**
 * <p>Provides the configuration information for your Amazon Kendra experience. This includes
 *             the data source IDs and/or FAQ IDs, and user or group information to grant access
 *             to your Amazon Kendra experience.</p>
 * @public
 */
export interface ExperienceConfiguration {
    /**
     * <p>The identifiers of your data sources and FAQs. Or, you can specify
     *             that you want to use documents indexed via the <code>BatchPutDocument</code>
     *             API. This is the content you want to use for your Amazon Kendra experience.</p>
     * @public
     */
    ContentSourceConfiguration?: ContentSourceConfiguration | undefined;
    /**
     * <p>The IAM Identity Center field name that contains the identifiers of your users,
     *             such as their emails.</p>
     * @public
     */
    UserIdentityConfiguration?: UserIdentityConfiguration | undefined;
}
/**
 * @public
 */
export interface CreateExperienceRequest {
    /**
     * <p>A name for your Amazon Kendra experience.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *             <code>Query</code> API, <code>GetQuerySuggestions</code> API, and other required APIs.
     *             The role also must include permission to access IAM Identity Center that stores your
     *             user and group information. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM access roles for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>Configuration information for your Amazon Kendra experience. This includes
     *             <code>ContentSourceConfiguration</code>, which specifies the data source IDs
     *             and/or FAQ IDs, and <code>UserIdentityConfiguration</code>, which specifies the
     *             user or group information to grant access to your Amazon Kendra experience.</p>
     * @public
     */
    Configuration?: ExperienceConfiguration | undefined;
    /**
     * <p>A description for your Amazon Kendra experience.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A token that you provide to identify the request to create your Amazon Kendra experience.
     *             Multiple calls to the <code>CreateExperience</code> API with the same client
     *             token creates only one Amazon Kendra experience.</p>
     * @public
     */
    ClientToken?: string | undefined;
}
/**
 * @public
 */
export interface CreateExperienceResponse {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FaqFileFormat: {
    readonly CSV: "CSV";
    readonly CSV_WITH_HEADER: "CSV_WITH_HEADER";
    readonly JSON: "JSON";
};
/**
 * @public
 */
export type FaqFileFormat = (typeof FaqFileFormat)[keyof typeof FaqFileFormat];
/**
 * @public
 */
export interface CreateFaqRequest {
    /**
     * <p>The identifier of the index for the FAQ.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A name for the FAQ.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A description for the FAQ.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The path to the FAQ file in S3.</p>
     * @public
     */
    S3Path: S3Path | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *             the S3 bucket that contains the FAQ file. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM access roles for
     *                 Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>A list of key-value pairs that identify the FAQ. You can use the tags to identify and
     *             organize your resources and to control access to resources.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The format of the FAQ input file. You can choose between a basic CSV format, a CSV
     *             format that includes customs attributes in a header, and a JSON format that includes
     *             custom attributes.</p>
     *          <p>The default format is CSV.</p>
     *          <p>The format must match the format of the file stored in the S3 bucket identified in
     *             the <code>S3Path</code> parameter.</p>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-creating-faq.html">Adding questions and
     *             answers</a>.</p>
     * @public
     */
    FileFormat?: FaqFileFormat | undefined;
    /**
     * <p>A token that you provide to identify the request to create a FAQ. Multiple calls to
     *             the <code>CreateFaqRequest</code> API with the same client token will create only one
     *             FAQ. </p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>The code for a language. This allows you to support a language
     *             for the FAQ document. English is supported by default.
     *             For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
}
/**
 * @public
 */
export interface CreateFaqResponse {
    /**
     * <p>The identifier of the FAQ.</p>
     * @public
     */
    Id?: string | undefined;
}
/**
 * <p>A featured document. This document is displayed at the top of the search
 *             results page, placed above all other results for certain queries. If there's
 *             an exact match of a query, then the document is featured in the search results.</p>
 * @public
 */
export interface FeaturedDocument {
    /**
     * <p>The identifier of the document to feature in the search results. You can
     *             use the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Query.html">Query</a> API to search for
     *             specific documents with their document IDs included in the result items,
     *             or you can use the console.</p>
     * @public
     */
    Id?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FeaturedResultsSetStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
};
/**
 * @public
 */
export type FeaturedResultsSetStatus = (typeof FeaturedResultsSetStatus)[keyof typeof FeaturedResultsSetStatus];
/**
 * @public
 */
export interface CreateFeaturedResultsSetRequest {
    /**
     * <p>The identifier of the index that you want to use for featuring results.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A name for the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetName: string | undefined;
    /**
     * <p>A description for the set of featured results.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A token that you provide to identify the request to create a set of
     *             featured results. Multiple calls to the <code>CreateFeaturedResultsSet</code>
     *             API with the same client token will create only one featured results set.</p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>The current status of the set of featured results. When the value is
     *             <code>ACTIVE</code>, featured results are ready for use. You can still
     *             configure your settings before setting the status to <code>ACTIVE</code>.
     *             You can set the status to <code>ACTIVE</code> or <code>INACTIVE</code>
     *             using the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateFeaturedResultsSet.html">UpdateFeaturedResultsSet</a> API. The queries you specify for
     *             featured results must be unique per featured results set for each index,
     *             whether the status is <code>ACTIVE</code> or <code>INACTIVE</code>.</p>
     * @public
     */
    Status?: FeaturedResultsSetStatus | undefined;
    /**
     * <p>A list of queries for featuring results. For more information on the
     *             list of queries, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_FeaturedResultsSet.html">FeaturedResultsSet</a>.</p>
     * @public
     */
    QueryTexts?: string[] | undefined;
    /**
     * <p>A list of document IDs for the documents you want to feature at the
     *             top of the search results page. For more information on the list of
     *             documents, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_FeaturedResultsSet.html">FeaturedResultsSet</a>.</p>
     * @public
     */
    FeaturedDocuments?: FeaturedDocument[] | undefined;
    /**
     * <p>A list of key-value pairs that identify or categorize the featured results set. You
     *             can also use tags to help control access to the featured results set. Tag keys and
     *             values can consist of Unicode letters, digits, white space, and any of the following
     *             symbols:_ . : / = + - @.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>A set of featured results that are displayed at the top of your search results.
 *             Featured results are placed above all other results for certain queries. If there's
 *             an exact match of a query, then one or more specific documents are featured in the
 *             search results.</p>
 * @public
 */
export interface FeaturedResultsSet {
    /**
     * <p>The identifier of the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetId?: string | undefined;
    /**
     * <p>The name for the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetName?: string | undefined;
    /**
     * <p>The description for the set of featured results.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The current status of the set of featured results. When the value is
     *             <code>ACTIVE</code>, featured results are ready for use. You can still
     *             configure your settings before setting the status to <code>ACTIVE</code>.
     *             You can set the status to <code>ACTIVE</code> or <code>INACTIVE</code>
     *             using the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateFeaturedResultsSet.html">UpdateFeaturedResultsSet</a> API. The queries you specify for
     *             featured results must be unique per featured results set for each index,
     *             whether the status is <code>ACTIVE</code> or <code>INACTIVE</code>.</p>
     * @public
     */
    Status?: FeaturedResultsSetStatus | undefined;
    /**
     * <p>The list of queries for featuring results.</p>
     *          <p>Specific queries are mapped to specific documents for featuring in
     *             the results. If a query contains an exact match, then one or more
     *             specific documents are featured in the results. The exact match applies
     *             to the full query. For example, if you only specify 'Kendra', queries
     *             such as 'How does kendra semantically rank results?' will not render the
     *             featured results. Featured results are designed for specific queries,
     *             rather than queries that are too broad in scope.</p>
     * @public
     */
    QueryTexts?: string[] | undefined;
    /**
     * <p>The list of document IDs for the documents you want to feature at the
     *             top of the search results page. You can use the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Query.html">Query</a> API to search for
     *             specific documents with their document IDs included in the result items,
     *             or you can use the console.</p>
     *          <p>You can add up to four featured documents. You can request to increase this
     *             limit by contacting <a href="http://aws.amazon.com/contact-us/">Support</a>.</p>
     *          <p>Specific queries are mapped to specific documents for featuring in the
     *             results. If a query contains an exact match, then one or more specific
     *             documents are featured in the results. The exact match applies to the full
     *             query. For example, if you only specify 'Kendra', queries such as 'How does
     *             kendra semantically rank results?' will not render the featured results.
     *             Featured results are designed for specific queries, rather than queries
     *             that are too broad in scope.</p>
     * @public
     */
    FeaturedDocuments?: FeaturedDocument[] | undefined;
    /**
     * <p>The Unix timestamp when the set of featured results was last updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: number | undefined;
    /**
     * <p>The Unix timestamp when the set of featured results was created.</p>
     * @public
     */
    CreationTimestamp?: number | undefined;
}
/**
 * @public
 */
export interface CreateFeaturedResultsSetResponse {
    /**
     * <p>Information on the set of featured results. This includes the identifier of
     *             the featured results set, whether the featured results set is active or inactive,
     *             when the featured results set was created, and more.</p>
     * @public
     */
    FeaturedResultsSet?: FeaturedResultsSet | undefined;
}
/**
 * <p>Information about a conflicting query used across different sets of
 *             featured results. When you create a featured results set, you must check
 *             that the queries are unique per featured results set for each index.</p>
 * @public
 */
export interface ConflictingItem {
    /**
     * <p>The text of the conflicting query.</p>
     * @public
     */
    QueryText?: string | undefined;
    /**
     * <p>The name for the set of featured results that the conflicting query
     *             belongs to.</p>
     * @public
     */
    SetName?: string | undefined;
    /**
     * <p>The identifier of the set of featured results that the conflicting
     *             query belongs to.</p>
     * @public
     */
    SetId?: string | undefined;
}
/**
 * <p>An error message with a list of conflicting queries used across different sets
 *             of featured results. This occurred with the request for a new featured results set.
 *             Check that the queries you specified for featured results are unique per featured
 *             results set for each index.</p>
 * @public
 */
export declare class FeaturedResultsConflictException extends __BaseException {
    readonly name: "FeaturedResultsConflictException";
    readonly $fault: "client";
    /**
     * <p>An explanation for the conflicting queries.</p>
     * @public
     */
    Message?: string | undefined;
    /**
     * <p>A list of the conflicting queries, including the query text, the name for
     *             the featured results set, and the identifier of the featured results set.</p>
     * @public
     */
    ConflictingItems?: ConflictingItem[] | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<FeaturedResultsConflictException, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const IndexEdition: {
    readonly DEVELOPER_EDITION: "DEVELOPER_EDITION";
    readonly ENTERPRISE_EDITION: "ENTERPRISE_EDITION";
    readonly GEN_AI_ENTERPRISE_EDITION: "GEN_AI_ENTERPRISE_EDITION";
};
/**
 * @public
 */
export type IndexEdition = (typeof IndexEdition)[keyof typeof IndexEdition];
/**
 * <p>Provides the identifier of the KMS key used to encrypt data
 *             indexed by Amazon Kendra. Amazon Kendra doesn't support asymmetric
 *             keys.</p>
 * @public
 */
export interface ServerSideEncryptionConfiguration {
    /**
     * <p>The identifier of the KMS key. Amazon Kendra doesn't support
     *             asymmetric keys.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const UserContextPolicy: {
    readonly ATTRIBUTE_FILTER: "ATTRIBUTE_FILTER";
    readonly USER_TOKEN: "USER_TOKEN";
};
/**
 * @public
 */
export type UserContextPolicy = (typeof UserContextPolicy)[keyof typeof UserContextPolicy];
/**
 * @public
 * @enum
 */
export declare const UserGroupResolutionMode: {
    readonly AWS_SSO: "AWS_SSO";
    readonly NONE: "NONE";
};
/**
 * @public
 */
export type UserGroupResolutionMode = (typeof UserGroupResolutionMode)[keyof typeof UserGroupResolutionMode];
/**
 * <p>Provides the configuration information to get users and groups from an IAM Identity Center identity source. This is useful for user context filtering, where search
 *          results are filtered based on the user or their group access to documents. You can also use
 *          the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_PutPrincipalMapping.html">PutPrincipalMapping</a> API to map users to their groups so that you only need to
 *          provide the user ID when you issue the query.</p>
 *          <p>To set up an IAM Identity Center identity source in the console to use with Amazon Kendra, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/getting-started-aws-sso.html">Getting started with an IAM Identity Center identity source</a>. You must also grant the required permissions to
 *          use IAM Identity Center with Amazon Kendra. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html#iam-roles-aws-sso">IAM roles for IAM Identity Center</a>.</p>
 *          <p>Amazon Kendra currently does not support using
 *             <code>UserGroupResolutionConfiguration</code> with an Amazon Web Services organization
 *          member account for your IAM Identity Center identify source. You must create your index in
 *          the management account for the organization in order to use
 *             <code>UserGroupResolutionConfiguration</code>.</p>
 *          <important>
 *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index,
 *                <code>UserGroupResolutionConfiguration</code> isn't supported.</p>
 *          </important>
 * @public
 */
export interface UserGroupResolutionConfiguration {
    /**
     * <p>The identity store provider (mode) you want to use to get users and groups. IAM Identity Center is currently the only available mode. Your users and groups must exist in
     *          an IAM Identity Center identity source in order to use this mode.</p>
     * @public
     */
    UserGroupResolutionMode: UserGroupResolutionMode | undefined;
}
/**
 * <p>Provides the configuration information for the JSON token type.</p>
 * @public
 */
export interface JsonTokenTypeConfiguration {
    /**
     * <p>The user name attribute field.</p>
     * @public
     */
    UserNameAttributeField: string | undefined;
    /**
     * <p>The group attribute field.</p>
     * @public
     */
    GroupAttributeField: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const KeyLocation: {
    readonly SECRET_MANAGER: "SECRET_MANAGER";
    readonly URL: "URL";
};
/**
 * @public
 */
export type KeyLocation = (typeof KeyLocation)[keyof typeof KeyLocation];
/**
 * <p>Provides the configuration information for the JWT token type.</p>
 * @public
 */
export interface JwtTokenTypeConfiguration {
    /**
     * <p>The location of the key.</p>
     * @public
     */
    KeyLocation: KeyLocation | undefined;
    /**
     * <p>The signing key URL.</p>
     * @public
     */
    URL?: string | undefined;
    /**
     * <p>The Amazon Resource Name (arn) of the secret.</p>
     * @public
     */
    SecretManagerArn?: string | undefined;
    /**
     * <p>The user name attribute field.</p>
     * @public
     */
    UserNameAttributeField?: string | undefined;
    /**
     * <p>The group attribute field.</p>
     * @public
     */
    GroupAttributeField?: string | undefined;
    /**
     * <p>The issuer of the token.</p>
     * @public
     */
    Issuer?: string | undefined;
    /**
     * <p>The regular expression that identifies the claim.</p>
     * @public
     */
    ClaimRegex?: string | undefined;
}
/**
 * <p>Provides the configuration information for a token.</p>
 *          <important>
 *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
 *                <code>UserTokenConfigurations</code> to configure user context policy, Amazon Kendra returns
 *             a <code>ValidationException</code> error.</p>
 *          </important>
 * @public
 */
export interface UserTokenConfiguration {
    /**
     * <p>Information about the JWT token type configuration.</p>
     * @public
     */
    JwtTokenTypeConfiguration?: JwtTokenTypeConfiguration | undefined;
    /**
     * <p>Information about the JSON token type configuration.</p>
     * @public
     */
    JsonTokenTypeConfiguration?: JsonTokenTypeConfiguration | undefined;
}
/**
 * @public
 */
export interface CreateIndexRequest {
    /**
     * <p>A name for the index.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The Amazon Kendra edition to use for the index. Choose <code>DEVELOPER_EDITION</code>
     *       for indexes intended for development, testing, or proof of concept. Use
     *         <code>ENTERPRISE_EDITION</code> for production. Use <code>GEN_AI_ENTERPRISE_EDITION</code>
     *       for creating generative AI applications. Once you set the edition for an index, it can't be
     *       changed. </p>
     *          <p>The <code>Edition</code> parameter is optional. If you don't supply a value, the default
     *       is <code>ENTERPRISE_EDITION</code>.</p>
     *          <p>For more information on quota limits for Gen AI Enterprise Edition, Enterprise Edition, and
     *       Developer Edition indices, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas</a>.</p>
     * @public
     */
    Edition?: IndexEdition | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *       your Amazon CloudWatch logs and metrics. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM access roles
     *         for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>The identifier of the KMS customer managed key (CMK) that's used to encrypt
     *       data indexed by Amazon Kendra. Amazon Kendra doesn't support asymmetric CMKs.</p>
     * @public
     */
    ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration | undefined;
    /**
     * <p>A description for the index.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A token that you provide to identify the request to create an index. Multiple calls to the
     *         <code>CreateIndex</code> API with the same client token will create only one index.</p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>A list of key-value pairs that identify or categorize the index. You can also use tags to
     *       help control access to the index. Tag keys and values can consist of Unicode letters, digits,
     *       white space, and any of the following symbols: _ . : / = + - @.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The user token configuration.</p>
     *          <important>
     *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
     *                <code>UserTokenConfigurations</code> to configure user context policy, Amazon Kendra returns
     *             a <code>ValidationException</code> error.</p>
     *          </important>
     * @public
     */
    UserTokenConfigurations?: UserTokenConfiguration[] | undefined;
    /**
     * <p>The user context policy.</p>
     *          <important>
     *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index, you can only use
     *                <code>ATTRIBUTE_FILTER</code> to filter search results by user context. If you're
     *             using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
     *                <code>USER_TOKEN</code> to configure user context policy, Amazon Kendra returns a
     *                <code>ValidationException</code> error.</p>
     *          </important>
     *          <dl>
     *             <dt>ATTRIBUTE_FILTER</dt>
     *             <dd>
     *                <p>All indexed content is searchable and displayable for all users. If you want to
     *                   filter search results on user context, you can use the attribute filters of
     *                      <code>_user_id</code> and <code>_group_ids</code> or you can provide user and
     *                   group information in <code>UserContext</code>. </p>
     *             </dd>
     *             <dt>USER_TOKEN</dt>
     *             <dd>
     *                <p>Enables token-based user access control to filter search results on user
     *                   context. All documents with no access control and all documents accessible to the
     *                   user will be searchable and displayable. </p>
     *             </dd>
     *          </dl>
     * @public
     */
    UserContextPolicy?: UserContextPolicy | undefined;
    /**
     * <p>Gets users and groups from IAM Identity Center identity source. To configure this,
     *          see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UserGroupResolutionConfiguration.html">UserGroupResolutionConfiguration</a>. This is useful for user context filtering,
     *          where search results are filtered based on the user or their group access to
     *          documents.</p>
     *          <important>
     *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index,
     *                <code>UserGroupResolutionConfiguration</code> isn't supported.</p>
     *          </important>
     * @public
     */
    UserGroupResolutionConfiguration?: UserGroupResolutionConfiguration | undefined;
}
/**
 * @public
 */
export interface CreateIndexResponse {
    /**
     * <p>The identifier of the index. Use this identifier when you query an index, set up a data
     *       source, or index a document.</p>
     * @public
     */
    Id?: string | undefined;
}
/**
 * @public
 */
export interface CreateQuerySuggestionsBlockListRequest {
    /**
     * <p>The identifier of the index you want to create a query suggestions block list for.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A name for the block list.</p>
     *          <p>For example, the name 'offensive-words', which includes all
     *             offensive words that could appear in user queries and need to be
     *             blocked from suggestions.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A description for the block list.</p>
     *          <p>For example, the description "List of all offensive words that can
     *             appear in user queries and need to be blocked from suggestions."</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The S3 path to your block list text file in your S3 bucket.</p>
     *          <p>Each block word or phrase should be on a separate line in a text file.</p>
     *          <p>For information on the current quota limits for block lists, see
     *                 <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
     *                     for Amazon Kendra</a>.</p>
     * @public
     */
    SourceS3Path: S3Path | undefined;
    /**
     * <p>A token that you provide to identify the request to create a
     *             query suggestions block list.</p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to
     *             access your S3 bucket that contains the block list text file. For more information,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM access roles for
     *                 Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>A list of key-value pairs that identify or categorize the block list.
     *             Tag keys and values can consist of Unicode letters, digits, white space,
     *             and any of the following symbols: _ . : / = + - @.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateQuerySuggestionsBlockListResponse {
    /**
     * <p>The identifier of the block list.</p>
     * @public
     */
    Id?: string | undefined;
}
/**
 * @public
 */
export interface CreateThesaurusRequest {
    /**
     * <p>The identifier of the index for the thesaurus.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A name for the thesaurus.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A description for the thesaurus.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission
     *          to access your S3 bucket that contains the thesaurus file. For more information,
     *          see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM
     *             access roles for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>A list of key-value pairs that identify or categorize the thesaurus. You can
     *          also use tags to help control access to the thesaurus. Tag keys and values can
     *          consist of Unicode letters, digits, white space, and any of the following
     *          symbols: _ . : / = + - @.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The path to the thesaurus file in S3.</p>
     * @public
     */
    SourceS3Path: S3Path | undefined;
    /**
     * <p>A token that you provide to identify the request to create a
     *          thesaurus. Multiple calls to the <code>CreateThesaurus</code> API
     *          with the same client token will create only one thesaurus.
     *       </p>
     * @public
     */
    ClientToken?: string | undefined;
}
/**
 * @public
 */
export interface CreateThesaurusResponse {
    /**
     * <p>The identifier of the thesaurus.
     *       </p>
     * @public
     */
    Id?: string | undefined;
}
/**
 * @public
 */
export interface DeleteAccessControlConfigurationRequest {
    /**
     * <p>The identifier of the index for an access control configuration.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the access control configuration you want to delete.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 */
export interface DeleteAccessControlConfigurationResponse {
}
/**
 * @public
 */
export interface DeleteDataSourceRequest {
    /**
     * <p>The identifier of the data source connector you want to delete.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 */
export interface DeleteExperienceRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience you want to delete.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 */
export interface DeleteExperienceResponse {
}
/**
 * @public
 */
export interface DeleteFaqRequest {
    /**
     * <p>The identifier of the FAQ you want to remove.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for the FAQ.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 */
export interface DeleteIndexRequest {
    /**
     * <p>The identifier of the index you want to delete.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 */
export interface DeletePrincipalMappingRequest {
    /**
     * <p>The identifier of the index you want to delete a group from.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the data source you want to delete a group from.</p>
     *          <p>A group can be tied to multiple data sources. You can delete a group from accessing
     *             documents in a certain data source. For example, the groups "Research", "Engineering",
     *             and "Sales and Marketing" are all tied to the company's documents stored in the data
     *             sources Confluence and Salesforce. You want to delete "Research" and "Engineering"
     *             groups from Salesforce, so that these groups cannot access customer-related documents
     *             stored in Salesforce. Only "Sales and Marketing" should access documents in the
     *             Salesforce data source.</p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>The identifier of the group you want to delete.</p>
     * @public
     */
    GroupId: string | undefined;
    /**
     * <p>The timestamp identifier you specify to ensure Amazon Kendra does not override
     *             the latest <code>DELETE</code> action with previous actions. The highest number ID,
     *             which is the ordering ID, is the latest action you want to process and apply on top of
     *             other actions with lower number IDs. This prevents previous actions with lower number
     *             IDs from possibly overriding the latest action.</p>
     *          <p>The ordering ID can be the Unix time of the last update you made to a group members
     *             list. You would then provide this list when calling <code>PutPrincipalMapping</code>.
     *             This ensures your <code>DELETE</code> action for that updated group with the latest
     *             members list doesn't get overwritten by earlier <code>DELETE</code> actions for the same
     *             group which are yet to be processed.</p>
     *          <p>The default ordering ID is the current Unix time in milliseconds that the action was
     *             received by Amazon Kendra. </p>
     * @public
     */
    OrderingId?: number | undefined;
}
/**
 * @public
 */
export interface DeleteQuerySuggestionsBlockListRequest {
    /**
     * <p>The identifier of the index for the block list.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the block list you want to delete.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 */
export interface DeleteThesaurusRequest {
    /**
     * <p>The identifier of the thesaurus you want to delete.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for the thesaurus.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 */
export interface DescribeAccessControlConfigurationRequest {
    /**
     * <p>The identifier of the index for an access control configuration.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the access control configuration you want to get information
     *             on.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 */
export interface DescribeAccessControlConfigurationResponse {
    /**
     * <p>The name for the access control configuration.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The description for the access control configuration.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The error message containing details if there are issues processing the access control
     *             configuration.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>Information on principals (users and/or groups) and which documents they should have
     *             access to. This is useful for user context filtering, where search results are filtered
     *             based on the user or their group access to documents.</p>
     * @public
     */
    AccessControlList?: Principal[] | undefined;
    /**
     * <p>The list of <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Principal.html">principal</a> lists that define the hierarchy for which documents users should
     *             have access to.</p>
     * @public
     */
    HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
}
/**
 * @public
 */
export interface DescribeDataSourceRequest {
    /**
     * <p>The identifier of the data source connector.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DataSourceStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly UPDATING: "UPDATING";
};
/**
 * @public
 */
export type DataSourceStatus = (typeof DataSourceStatus)[keyof typeof DataSourceStatus];
/**
 * @public
 */
export interface DescribeDataSourceResponse {
    /**
     * <p>The identifier of the data source connector.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId?: string | undefined;
    /**
     * <p>The name for the data source connector.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The type of the data source. For example, <code>SHAREPOINT</code>.</p>
     * @public
     */
    Type?: DataSourceType | undefined;
    /**
     * <p>Configuration details for the data source connector. This shows how the data source is
     *       configured. The configuration options for a data source depend on the data source
     *       provider.</p>
     * @public
     */
    Configuration?: DataSourceConfiguration | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your data source.
     *       For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>The Unix timestamp when the data source connector was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the data source connector was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>The description for the data source connector.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The current status of the data source connector. When the status is <code>ACTIVE</code>
     *       the data source is ready to use. When the status is <code>FAILED</code>, the
     *         <code>ErrorMessage</code> field contains the reason that the data source failed.</p>
     * @public
     */
    Status?: DataSourceStatus | undefined;
    /**
     * <p>The schedule for Amazon Kendra to update the index.</p>
     * @public
     */
    Schedule?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role with permission to
     *       access the data source and required resources.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>When the <code>Status</code> field value is <code>FAILED</code>, the
     *         <code>ErrorMessage</code> field contains a description of the error that caused the data
     *       source to fail.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>The code for a language. This shows a supported language for all
     *             documents in the data source. English is supported by
     *             default. For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
    /**
     * <p>Configuration information for altering document metadata and content during the
     *             document ingestion process when you describe a data source.</p>
     *          <p>For more information on how to create, modify and delete document metadata, or make
     *             other content alterations when you ingest documents into Amazon Kendra, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata during the ingestion process</a>.</p>
     * @public
     */
    CustomDocumentEnrichmentConfiguration?: CustomDocumentEnrichmentConfiguration | undefined;
}
/**
 * @public
 */
export interface DescribeExperienceRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience you want to get information on.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EndpointType: {
    readonly HOME: "HOME";
};
/**
 * @public
 */
export type EndpointType = (typeof EndpointType)[keyof typeof EndpointType];
/**
 * <p>Provides the configuration information for the endpoint for your Amazon Kendra
 *             experience.</p>
 * @public
 */
export interface ExperienceEndpoint {
    /**
     * <p>The type of endpoint for your Amazon Kendra experience. The type currently available
     *             is <code>HOME</code>, which is a unique and fully hosted URL to the home page
     *             of your Amazon Kendra experience.</p>
     * @public
     */
    EndpointType?: EndpointType | undefined;
    /**
     * <p>The endpoint of your Amazon Kendra experience.</p>
     * @public
     */
    Endpoint?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ExperienceStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
};
/**
 * @public
 */
export type ExperienceStatus = (typeof ExperienceStatus)[keyof typeof ExperienceStatus];
/**
 * @public
 */
export interface DescribeExperienceResponse {
    /**
     * <p>Shows the identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>Shows the identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId?: string | undefined;
    /**
     * <p>Shows the name of your Amazon Kendra experience.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>Shows the endpoint URLs for your Amazon Kendra experiences. The URLs are unique and fully
     *             hosted by Amazon Web Services.</p>
     * @public
     */
    Endpoints?: ExperienceEndpoint[] | undefined;
    /**
     * <p>Shows the configuration information for your Amazon Kendra experience. This includes
     *                 <code>ContentSourceConfiguration</code>, which specifies the data source IDs
     *             and/or FAQ IDs, and <code>UserIdentityConfiguration</code>, which specifies the
     *             user or group information to grant access to your Amazon Kendra experience.</p>
     * @public
     */
    Configuration?: ExperienceConfiguration | undefined;
    /**
     * <p>The Unix timestamp when your Amazon Kendra experience was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when your Amazon Kendra experience was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>Shows the description for your Amazon Kendra experience.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The current processing status of your Amazon Kendra experience. When the status
     *             is <code>ACTIVE</code>, your Amazon Kendra experience is ready to use. When the
     *             status is <code>FAILED</code>, the <code>ErrorMessage</code> field contains
     *             the reason that this failed.</p>
     * @public
     */
    Status?: ExperienceStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role with permission to access
     *             the <code>Query</code> API, <code>QuerySuggestions</code> API,
     *             <code>SubmitFeedback</code> API, and IAM Identity Center that stores
     *             your users and groups information.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The reason your Amazon Kendra experience could not properly process.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * @public
 */
export interface DescribeFaqRequest {
    /**
     * <p>The identifier of the FAQ you want to get information on.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for the FAQ.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FaqStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly UPDATING: "UPDATING";
};
/**
 * @public
 */
export type FaqStatus = (typeof FaqStatus)[keyof typeof FaqStatus];
/**
 * @public
 */
export interface DescribeFaqResponse {
    /**
     * <p>The identifier of the FAQ.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The identifier of the index for the FAQ.</p>
     * @public
     */
    IndexId?: string | undefined;
    /**
     * <p>The name that you gave the FAQ when it was created.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The description of the FAQ that you provided when it was created.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The Unix timestamp when the FAQ was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the FAQ was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>Information required to find a specific file in an Amazon S3 bucket.</p>
     * @public
     */
    S3Path?: S3Path | undefined;
    /**
     * <p>The status of the FAQ. It is ready to use when the status is
     *             <code>ACTIVE</code>.</p>
     * @public
     */
    Status?: FaqStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that provides access
     *             to the S3 bucket containing the FAQ file.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>If the <code>Status</code> field is <code>FAILED</code>, the <code>ErrorMessage</code>
     *             field contains the reason why the FAQ failed.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>The file format used for the FAQ file.</p>
     * @public
     */
    FileFormat?: FaqFileFormat | undefined;
    /**
     * <p>The code for a language. This shows a supported language
     *             for the FAQ document. English is supported by default.
     *             For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
}
/**
 * @public
 */
export interface DescribeFeaturedResultsSetRequest {
    /**
     * <p>The identifier of the index used for featuring results.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the set of featured results that you want to get
     *             information on.</p>
     * @public
     */
    FeaturedResultsSetId: string | undefined;
}
/**
 * <p>A document ID doesn't exist but you have specified as a featured document.
 *             Amazon Kendra cannot feature the document if it doesn't exist in the index.
 *             You can check the status of a document and its ID or check for documents with
 *             status errors using the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_BatchGetDocumentStatus.html">BatchGetDocumentStatus</a>
 *             API.</p>
 * @public
 */
export interface FeaturedDocumentMissing {
    /**
     * <p>The identifier of the document that doesn't exist but you have specified
     *             as a featured document.</p>
     * @public
     */
    Id?: string | undefined;
}
/**
 * <p>A featured document with its metadata information. This document is displayed
 *             at the top of the search results page, placed above all other results for certain
 *             queries. If there's an exact match of a query, then the document is featured in
 *             the search results.</p>
 * @public
 */
export interface FeaturedDocumentWithMetadata {
    /**
     * <p>The identifier of the featured document with its metadata. You can use
     *             the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Query.html">Query</a> API to search for
     *             specific documents with their document IDs included in the result items,
     *             or you can use the console.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The main title of the featured document.</p>
     * @public
     */
    Title?: string | undefined;
    /**
     * <p>The source URI location of the featured document.</p>
     * @public
     */
    URI?: string | undefined;
}
/**
 * @public
 */
export interface DescribeFeaturedResultsSetResponse {
    /**
     * <p>The identifier of the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetId?: string | undefined;
    /**
     * <p>The name for the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetName?: string | undefined;
    /**
     * <p>The description for the set of featured results.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The current status of the set of featured results. When the value is
     *             <code>ACTIVE</code>, featured results are ready for use. You can still
     *             configure your settings before setting the status to <code>ACTIVE</code>.
     *             You can set the status to <code>ACTIVE</code> or <code>INACTIVE</code>
     *             using the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateFeaturedResultsSet.html">UpdateFeaturedResultsSet</a> API. The queries you specify for
     *             featured results must be unique per featured results set for each index,
     *             whether the status is <code>ACTIVE</code> or <code>INACTIVE</code>.</p>
     * @public
     */
    Status?: FeaturedResultsSetStatus | undefined;
    /**
     * <p>The list of queries for featuring results. For more information on the
     *             list of queries, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_FeaturedResultsSet.html">FeaturedResultsSet</a>.</p>
     * @public
     */
    QueryTexts?: string[] | undefined;
    /**
     * <p>The list of document IDs for the documents you want to feature with their
     *             metadata information. For more information on the list of featured documents,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_FeaturedResultsSet.html">FeaturedResultsSet</a>.</p>
     * @public
     */
    FeaturedDocumentsWithMetadata?: FeaturedDocumentWithMetadata[] | undefined;
    /**
     * <p>The list of document IDs that don't exist but you have specified as featured
     *             documents. Amazon Kendra cannot feature these documents if they don't exist
     *             in the index. You can check the status of a document and its ID or check for
     *             documents with status errors using the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_BatchGetDocumentStatus.html">BatchGetDocumentStatus</a> API.</p>
     * @public
     */
    FeaturedDocumentsMissing?: FeaturedDocumentMissing[] | undefined;
    /**
     * <p>The timestamp when the set of featured results was last updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: number | undefined;
    /**
     * <p>The Unix timestamp when the set of the featured results was created.</p>
     * @public
     */
    CreationTimestamp?: number | undefined;
}
/**
 * @public
 */
export interface DescribeIndexRequest {
    /**
     * <p>The identifier of the index you want to get information on.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * <p>Specifies additional capacity units configured for your Enterprise Edition index. You can
 *       add and remove capacity units to fit your usage requirements.</p>
 * @public
 */
export interface CapacityUnitsConfiguration {
    /**
     * <p>The amount of extra storage capacity for an index. A single capacity unit provides 30 GB
     *       of storage space or 100,000 documents, whichever is reached first. You can add up to 100 extra
     *       capacity units.</p>
     * @public
     */
    StorageCapacityUnits: number | undefined;
    /**
     * <p>The amount of extra query capacity for an index and <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_GetQuerySuggestions.html">GetQuerySuggestions</a>
     *       capacity.</p>
     *          <p>A single extra capacity unit for an index provides 0.1 queries per second or approximately
     *       8,000 queries per day. You can add up to 100 extra capacity units.</p>
     *          <p>
     *             <code>GetQuerySuggestions</code> capacity is five times the provisioned query capacity for
     *       an index, or the base capacity of 2.5 calls per second, whichever is higher. For example, the
     *       base capacity for an index is 0.1 queries per second, and <code>GetQuerySuggestions</code>
     *       capacity has a base of 2.5 calls per second. If you add another 0.1 queries per second to
     *       total 0.2 queries per second for an index, the <code>GetQuerySuggestions</code> capacity is
     *       2.5 calls per second (higher than five times 0.2 queries per second).</p>
     * @public
     */
    QueryCapacityUnits: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Order: {
    readonly ASCENDING: "ASCENDING";
    readonly DESCENDING: "DESCENDING";
};
/**
 * @public
 */
export type Order = (typeof Order)[keyof typeof Order];
/**
 * <p>Provides information for tuning the relevance of a field in a search. When a query
 *             includes terms that match the field, the results are given a boost in the response based
 *             on these tuning parameters.</p>
 * @public
 */
export interface Relevance {
    /**
     * <p>Indicates that this field determines how "fresh" a document is. For example, if
     *             document 1 was created on November 5, and document 2 was created on October 31, document
     *             1 is "fresher" than document 2. Only applies to <code>DATE</code> fields.</p>
     * @public
     */
    Freshness?: boolean | undefined;
    /**
     * <p>The relative importance of the field in the search. Larger numbers provide more of a
     *             boost than smaller numbers.</p>
     * @public
     */
    Importance?: number | undefined;
    /**
     * <p>Specifies the time period that the boost applies to. For example, to make the boost
     *             apply to documents with the field value within the last month, you would use "2628000s".
     *             Once the field value is beyond the specified range, the effect of the boost drops off.
     *             The higher the importance, the faster the effect drops off. If you don't specify a
     *             value, the default is 3 months. The value of the field is a numeric string followed by
     *             the character "s", for example "86400s" for one day, or "604800s" for one week. </p>
     *          <p>Only applies to <code>DATE</code> fields.</p>
     * @public
     */
    Duration?: string | undefined;
    /**
     * <p>Determines how values should be interpreted.</p>
     *          <p>When the <code>RankOrder</code> field is <code>ASCENDING</code>, higher numbers are
     *             better. For example, a document with a rating score of 10 is higher ranking than a
     *             document with a rating score of 1.</p>
     *          <p>When the <code>RankOrder</code> field is <code>DESCENDING</code>, lower numbers are
     *             better. For example, in a task tracking application, a priority 1 task is more important
     *             than a priority 5 task.</p>
     *          <p>Only applies to <code>LONG</code> fields.</p>
     * @public
     */
    RankOrder?: Order | undefined;
    /**
     * <p>A list of values that should be given a different boost when they appear in the result
     *             list. For example, if you are boosting a field called "department", query terms that
     *             match the department field are boosted in the result. However, you can add entries from
     *             the department field to boost documents with those values higher. </p>
     *          <p>For example, you can add entries to the map with names of departments. If you add
     *             "HR",5 and "Legal",3 those departments are given special attention when they appear in
     *             the metadata of a document. When those terms appear they are given the specified
     *             importance instead of the regular importance for the boost.</p>
     * @public
     */
    ValueImportanceMap?: Record<string, number> | undefined;
}
/**
 * <p>Provides information about how a custom index field is used during a search.</p>
 * @public
 */
export interface Search {
    /**
     * <p>Indicates that the field can be used to create search facets, a count of results for
     *             each value in the field. The default is <code>false</code> .</p>
     * @public
     */
    Facetable?: boolean | undefined;
    /**
     * <p>Determines whether the field is used in the search. If the <code>Searchable</code>
     *             field is <code>true</code>, you can use relevance tuning to manually tune how Amazon Kendra weights the field in the search. The default is <code>true</code> for
     *             string fields and <code>false</code> for number and date fields.</p>
     * @public
     */
    Searchable?: boolean | undefined;
    /**
     * <p>Determines whether the field is returned in the query response. The default is
     *                 <code>true</code>.</p>
     * @public
     */
    Displayable?: boolean | undefined;
    /**
     * <p>Determines whether the field can be used to sort the results of a query. If you
     *             specify sorting on a field that does not have <code>Sortable</code> set to
     *                 <code>true</code>, Amazon Kendra returns an exception. The default is
     *             <code>false</code>.</p>
     * @public
     */
    Sortable?: boolean | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DocumentAttributeValueType: {
    readonly DATE_VALUE: "DATE_VALUE";
    readonly LONG_VALUE: "LONG_VALUE";
    readonly STRING_LIST_VALUE: "STRING_LIST_VALUE";
    readonly STRING_VALUE: "STRING_VALUE";
};
/**
 * @public
 */
export type DocumentAttributeValueType = (typeof DocumentAttributeValueType)[keyof typeof DocumentAttributeValueType];
/**
 * <p>Specifies the properties, such as relevance tuning and searchability, of an index
 *             field.</p>
 * @public
 */
export interface DocumentMetadataConfiguration {
    /**
     * <p>The name of the index field.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The data type of the index field. </p>
     * @public
     */
    Type: DocumentAttributeValueType | undefined;
    /**
     * <p>Provides tuning parameters to determine how the field affects the search
     *             results.</p>
     * @public
     */
    Relevance?: Relevance | undefined;
    /**
     * <p>Provides information about how the field is used during a search.</p>
     * @public
     */
    Search?: Search | undefined;
}
/**
 * <p>Provides statistical information about the FAQ questions and answers for an
 *             index.</p>
 * @public
 */
export interface FaqStatistics {
    /**
     * <p>The total number of FAQ questions and answers for an index.</p>
     * @public
     */
    IndexedQuestionAnswersCount: number | undefined;
}
/**
 * <p>Provides information about text documents indexed in an index.</p>
 * @public
 */
export interface TextDocumentStatistics {
    /**
     * <p>The number of text documents indexed.</p>
     * @public
     */
    IndexedTextDocumentsCount: number | undefined;
    /**
     * <p>The total size, in bytes, of the indexed documents.</p>
     * @public
     */
    IndexedTextBytes: number | undefined;
}
/**
 * <p>Provides information about the number of documents and the number of questions and answers
 *       in an index.</p>
 * @public
 */
export interface IndexStatistics {
    /**
     * <p>The number of question and answer topics in the index.</p>
     * @public
     */
    FaqStatistics: FaqStatistics | undefined;
    /**
     * <p>The number of text documents indexed.</p>
     * @public
     */
    TextDocumentStatistics: TextDocumentStatistics | undefined;
}
/**
 * @public
 * @enum
 */
export declare const IndexStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly SYSTEM_UPDATING: "SYSTEM_UPDATING";
    readonly UPDATING: "UPDATING";
};
/**
 * @public
 */
export type IndexStatus = (typeof IndexStatus)[keyof typeof IndexStatus];
/**
 * @public
 */
export interface DescribeIndexResponse {
    /**
     * <p>The name of the index.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The identifier of the index.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The Amazon Kendra edition used for the index. You decide the edition when you create
     *       the index.</p>
     * @public
     */
    Edition?: IndexEdition | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that gives Amazon Kendra permission to write to your Amazon CloudWatch logs.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The identifier of the KMS customer master key (CMK) that is used to encrypt
     *       your data. Amazon Kendra doesn't support asymmetric CMKs.</p>
     * @public
     */
    ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration | undefined;
    /**
     * <p>The current status of the index. When the value is <code>ACTIVE</code>, the index is ready
     *       for use. If the <code>Status</code> field value is <code>FAILED</code>, the
     *         <code>ErrorMessage</code> field contains a message that explains why.</p>
     * @public
     */
    Status?: IndexStatus | undefined;
    /**
     * <p>The description for the index.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The Unix timestamp when the index was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the index was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>Configuration information for document metadata or fields. Document metadata are fields or
     *       attributes associated with your documents. For example, the company department name associated
     *       with each document.</p>
     * @public
     */
    DocumentMetadataConfigurations?: DocumentMetadataConfiguration[] | undefined;
    /**
     * <p>Provides information about the number of FAQ questions and answers and the number of text
     *       documents indexed.</p>
     * @public
     */
    IndexStatistics?: IndexStatistics | undefined;
    /**
     * <p>When the <code>Status</code> field value is <code>FAILED</code>, the
     *         <code>ErrorMessage</code> field contains a message that explains why.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>For Enterprise Edition indexes, you can choose to use additional capacity to meet the
     *       needs of your application. This contains the capacity units used for the index. A query or
     *       document storage capacity of zero indicates that the index is using the default capacity. For
     *       more information on the default capacity for an index and adjusting this, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/adjusting-capacity.html">Adjusting
     *         capacity</a>.</p>
     * @public
     */
    CapacityUnits?: CapacityUnitsConfiguration | undefined;
    /**
     * <p>The user token configuration for the Amazon Kendra index.</p>
     * @public
     */
    UserTokenConfigurations?: UserTokenConfiguration[] | undefined;
    /**
     * <p>The user context policy for the Amazon Kendra index.</p>
     * @public
     */
    UserContextPolicy?: UserContextPolicy | undefined;
    /**
     * <p>Whether you have enabled IAM Identity Center identity source for your users and
     *          groups. This is useful for user context filtering, where search results are filtered based
     *          on the user or their group access to documents.</p>
     * @public
     */
    UserGroupResolutionConfiguration?: UserGroupResolutionConfiguration | undefined;
}
/**
 * @public
 */
export interface DescribePrincipalMappingRequest {
    /**
     * <p>The identifier of the index required to check the processing of <code>PUT</code> and
     *                 <code>DELETE</code> actions for mapping users to their groups.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the data source to check the processing of <code>PUT</code> and
     *                 <code>DELETE</code> actions for mapping users to their groups.</p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>The identifier of the group required to check the processing of <code>PUT</code> and
     *                 <code>DELETE</code> actions for mapping users to their groups.</p>
     * @public
     */
    GroupId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PrincipalMappingStatus: {
    readonly DELETED: "DELETED";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly PROCESSING: "PROCESSING";
    readonly SUCCEEDED: "SUCCEEDED";
};
/**
 * @public
 */
export type PrincipalMappingStatus = (typeof PrincipalMappingStatus)[keyof typeof PrincipalMappingStatus];
/**
 * <p>Summary information on the processing of <code>PUT</code> and <code>DELETE</code>
 *             actions for mapping users to their groups.</p>
 * @public
 */
export interface GroupOrderingIdSummary {
    /**
     * <p>The current processing status of actions for mapping users to their groups. The status
     *             can be either <code>PROCESSING</code>, <code>SUCCEEDED</code>, <code>DELETING</code>,
     *                 <code>DELETED</code>, or <code>FAILED</code>.</p>
     * @public
     */
    Status?: PrincipalMappingStatus | undefined;
    /**
     * <p>The Unix timestamp when an action was last updated. An action can be a <code>PUT</code>
     *             or <code>DELETE</code> action for mapping users to their groups.</p>
     * @public
     */
    LastUpdatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when an action was received by Amazon Kendra. An action can
     *             be a <code>PUT</code> or <code>DELETE</code> action for mapping users to their groups.</p>
     * @public
     */
    ReceivedAt?: Date | undefined;
    /**
     * <p>The order in which actions should complete processing. An action can be a
     *                 <code>PUT</code> or <code>DELETE</code> action for mapping users to their
     *             groups.</p>
     * @public
     */
    OrderingId?: number | undefined;
    /**
     * <p>The reason an action could not be processed. An action can be a <code>PUT</code> or
     *                 <code>DELETE</code> action for mapping users to their groups.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * @public
 */
export interface DescribePrincipalMappingResponse {
    /**
     * <p>Shows the identifier of the index to see information on the processing of
     *                 <code>PUT</code> and <code>DELETE</code> actions for mapping users to their
     *             groups.</p>
     * @public
     */
    IndexId?: string | undefined;
    /**
     * <p>Shows the identifier of the data source to see information on the processing of
     *                 <code>PUT</code> and <code>DELETE</code> actions for mapping users to their
     *             groups.</p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>Shows the identifier of the group to see information on the processing of
     *                 <code>PUT</code> and <code>DELETE</code> actions for mapping users to their
     *             groups.</p>
     * @public
     */
    GroupId?: string | undefined;
    /**
     * <p>Shows the following information on the processing of <code>PUT</code> and
     *                 <code>DELETE</code> actions for mapping users to their groups:</p>
     *          <ul>
     *             <li>
     *                <p>Status—the status can be either <code>PROCESSING</code>,
     *                         <code>SUCCEEDED</code>, <code>DELETING</code>, <code>DELETED</code>, or
     *                         <code>FAILED</code>.</p>
     *             </li>
     *             <li>
     *                <p>Last updated—the last date-time an action was updated.</p>
     *             </li>
     *             <li>
     *                <p>Received—the last date-time an action was received or
     *                     submitted.</p>
     *             </li>
     *             <li>
     *                <p>Ordering ID—the latest action that should process and apply after
     *                     other actions.</p>
     *             </li>
     *             <li>
     *                <p>Failure reason—the reason an action could not be processed.</p>
     *             </li>
     *          </ul>
     * @public
     */
    GroupOrderingIdSummaries?: GroupOrderingIdSummary[] | undefined;
}
/**
 * @public
 */
export interface DescribeQuerySuggestionsBlockListRequest {
    /**
     * <p>The identifier of the index for the block list.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the block list you want to get information on.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const QuerySuggestionsBlockListStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly ACTIVE_BUT_UPDATE_FAILED: "ACTIVE_BUT_UPDATE_FAILED";
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly UPDATING: "UPDATING";
};
/**
 * @public
 */
export type QuerySuggestionsBlockListStatus = (typeof QuerySuggestionsBlockListStatus)[keyof typeof QuerySuggestionsBlockListStatus];
/**
 * @public
 */
export interface DescribeQuerySuggestionsBlockListResponse {
    /**
     * <p>The identifier of the index for the block list.</p>
     * @public
     */
    IndexId?: string | undefined;
    /**
     * <p>The identifier of the block list.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The name of the block list.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The description for the block list.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The current status of the block list. When the value is
     *             <code>ACTIVE</code>, the block list is ready for use.</p>
     * @public
     */
    Status?: QuerySuggestionsBlockListStatus | undefined;
    /**
     * <p>The error message containing details if there are issues processing
     *             the block list.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>The Unix timestamp when a block list for query suggestions was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when a block list for query suggestions was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>Shows the current S3 path to your block list text file in your S3 bucket.</p>
     *          <p>Each block word or phrase should be on a separate line in a text file.</p>
     *          <p>For information on the current quota limits for block lists, see
     *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
     *                 for Amazon Kendra</a>.</p>
     * @public
     */
    SourceS3Path?: S3Path | undefined;
    /**
     * <p>The current number of valid, non-empty words or phrases in
     *             the block list text file.</p>
     * @public
     */
    ItemCount?: number | undefined;
    /**
     * <p>The current size of the block list text file in S3.</p>
     * @public
     */
    FileSizeBytes?: number | undefined;
    /**
     * <p>The IAM (Identity and Access Management) role used by
     *             Amazon Kendra to access the block list text file in S3.</p>
     *          <p>The role needs S3 read permissions to your file in S3 and needs to
     *             give STS (Security Token Service) assume role permissions to
     *             Amazon Kendra.</p>
     * @public
     */
    RoleArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeQuerySuggestionsConfigRequest {
    /**
     * <p>The identifier of the index with query suggestions that you want to get
     *             information on.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Mode: {
    readonly ENABLED: "ENABLED";
    readonly LEARN_ONLY: "LEARN_ONLY";
};
/**
 * @public
 */
export type Mode = (typeof Mode)[keyof typeof Mode];
/**
 * @public
 * @enum
 */
export declare const QuerySuggestionsStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly UPDATING: "UPDATING";
};
/**
 * @public
 */
export type QuerySuggestionsStatus = (typeof QuerySuggestionsStatus)[keyof typeof QuerySuggestionsStatus];
/**
 * @public
 */
export interface DescribeQuerySuggestionsConfigResponse {
    /**
     * <p>Whether query suggestions are currently in
     *             <code>ENABLED</code> mode or <code>LEARN_ONLY</code> mode.</p>
     *          <p>By default, Amazon Kendra enables query suggestions.<code>LEARN_ONLY</code>
     *             turns off query suggestions for your users. You can change the mode using
     *             the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateQuerySuggestionsConfig.html">UpdateQuerySuggestionsConfig</a>
     *             API.</p>
     * @public
     */
    Mode?: Mode | undefined;
    /**
     * <p>Whether the status of query suggestions settings is currently
     *             <code>ACTIVE</code> or <code>UPDATING</code>.</p>
     *          <p>Active means the current settings apply and Updating means your
     *             changed settings are in the process of applying.</p>
     * @public
     */
    Status?: QuerySuggestionsStatus | undefined;
    /**
     * <p>How recent your queries are in your query log time
     *             window (in days).</p>
     * @public
     */
    QueryLogLookBackWindowInDays?: number | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to use all queries, otherwise use only queries that include
     *             user information to generate the query suggestions.</p>
     * @public
     */
    IncludeQueriesWithoutUserInformation?: boolean | undefined;
    /**
     * <p>The minimum number of unique users who must search a query in
     *             order for the query to be eligible to suggest to your users.</p>
     * @public
     */
    MinimumNumberOfQueryingUsers?: number | undefined;
    /**
     * <p>The minimum number of times a query must be searched in order for
     *             the query to be eligible to suggest to your users.</p>
     * @public
     */
    MinimumQueryCount?: number | undefined;
    /**
     * <p>The Unix timestamp when query suggestions for an index was last updated.</p>
     *          <p>Amazon Kendra automatically updates suggestions every 24 hours, after you
     *             change a setting or after you apply a <a href="https://docs.aws.amazon.com/kendra/latest/dg/query-suggestions.html#query-suggestions-blocklist">block list</a>.</p>
     * @public
     */
    LastSuggestionsBuildTime?: Date | undefined;
    /**
     * <p>The Unix timestamp when query suggestions for an index was last cleared.</p>
     *          <p>After you clear suggestions, Amazon Kendra learns new suggestions based
     *             on new queries added to the query log from the time you cleared suggestions.
     *             Amazon Kendra only considers re-occurences of a query from the time you cleared
     *             suggestions. </p>
     * @public
     */
    LastClearTime?: Date | undefined;
    /**
     * <p>The current total count of query suggestions for an index.</p>
     *          <p>This count can change when you update your query suggestions settings,
     *             if you filter out certain queries from suggestions using a block list,
     *             and as the query log accumulates more queries for Amazon Kendra to learn from.</p>
     *          <p>If the count is much lower than you expected, it could be because Amazon Kendra
     *             needs more queries in the query history to learn from or your current query suggestions
     *             settings are too strict.</p>
     * @public
     */
    TotalSuggestionsCount?: number | undefined;
    /**
     * <p>Configuration information for the document fields/attributes that you want to base query
     *             suggestions on.</p>
     * @public
     */
    AttributeSuggestionsConfig?: AttributeSuggestionsDescribeConfig | undefined;
}
/**
 * @public
 */
export interface DescribeThesaurusRequest {
    /**
     * <p>The identifier of the thesaurus you want to get information on.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for the thesaurus.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ThesaurusStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly ACTIVE_BUT_UPDATE_FAILED: "ACTIVE_BUT_UPDATE_FAILED";
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly UPDATING: "UPDATING";
};
/**
 * @public
 */
export type ThesaurusStatus = (typeof ThesaurusStatus)[keyof typeof ThesaurusStatus];
/**
 * @public
 */
export interface DescribeThesaurusResponse {
    /**
     * <p>The identifier of the thesaurus.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The identifier of the index for the thesaurus.</p>
     * @public
     */
    IndexId?: string | undefined;
    /**
     * <p>The thesaurus name.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The thesaurus description.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The current status of the thesaurus. When the value is <code>ACTIVE</code>,
     *          queries are able to use the thesaurus. If the <code>Status</code> field value
     *          is <code>FAILED</code>, the <code>ErrorMessage</code> field provides
     *          more information.
     *       </p>
     *          <p>If the status is <code>ACTIVE_BUT_UPDATE_FAILED</code>, it means
     *          that Amazon Kendra could not ingest the new thesaurus file. The old
     *       thesaurus file is still active.
     *       </p>
     * @public
     */
    Status?: ThesaurusStatus | undefined;
    /**
     * <p>When the <code>Status</code> field value is <code>FAILED</code>, the
     *          <code>ErrorMessage</code> field provides more information.
     *       </p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>The Unix timestamp when the thesaurus was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the thesaurus was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>An IAM role that gives Amazon Kendra permissions
     *          to access thesaurus file specified in <code>SourceS3Path</code>.
     *       </p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>Information required to find a specific file in an Amazon S3 bucket.</p>
     * @public
     */
    SourceS3Path?: S3Path | undefined;
    /**
     * <p>The size of the thesaurus file in bytes.</p>
     * @public
     */
    FileSizeBytes?: number | undefined;
    /**
     * <p>The number of unique terms in the thesaurus file. For example, the
     *         synonyms <code>a,b,c</code> and <code>a=>d</code>, the term
     *         count would be 4.
     *       </p>
     * @public
     */
    TermCount?: number | undefined;
    /**
     * <p>The number of synonym rules in the thesaurus file.</p>
     * @public
     */
    SynonymRuleCount?: number | undefined;
}
/**
 * @public
 */
export interface DisassociateEntitiesFromExperienceRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>Lists users or groups in your IAM Identity Center identity source.</p>
     * @public
     */
    EntityList: EntityConfiguration[] | undefined;
}
/**
 * @public
 */
export interface DisassociateEntitiesFromExperienceResponse {
    /**
     * <p>Lists the users or groups in your IAM Identity Center identity source that
     *             failed to properly remove access to your Amazon Kendra experience.</p>
     * @public
     */
    FailedEntityList?: FailedEntity[] | undefined;
}
/**
 * @public
 */
export interface DisassociatePersonasFromEntitiesRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifiers of users or groups in your IAM Identity Center identity
     *             source. For example, user IDs could be user emails.</p>
     * @public
     */
    EntityIds: string[] | undefined;
}
/**
 * @public
 */
export interface DisassociatePersonasFromEntitiesResponse {
    /**
     * <p>Lists the users or groups in your IAM Identity Center identity source that
     *             failed to properly remove access to your Amazon Kendra experience.</p>
     * @public
     */
    FailedEntityList?: FailedEntity[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SuggestionType: {
    readonly DOCUMENT_ATTRIBUTES: "DOCUMENT_ATTRIBUTES";
    readonly QUERY: "QUERY";
};
/**
 * @public
 */
export type SuggestionType = (typeof SuggestionType)[keyof typeof SuggestionType];
/**
 * <p>The document ID and its fields/attributes that are used for a query suggestion, if
 *             document fields set to use for query suggestions.</p>
 * @public
 */
export interface SourceDocument {
    /**
     * <p>The identifier of the document used for a query suggestion.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p>The document fields/attributes used for a query suggestion.</p>
     * @public
     */
    SuggestionAttributes?: string[] | undefined;
    /**
     * <p>The additional fields/attributes to include in the response. You can use additional
     *             fields to provide extra information in the response. Additional fields are not used
     *             to based suggestions on.</p>
     * @public
     */
    AdditionalAttributes?: DocumentAttribute[] | undefined;
}
/**
 * <p>The text highlights for a single query suggestion.</p>
 * @public
 */
export interface SuggestionHighlight {
    /**
     * <p>The zero-based location in the response string where the highlight starts.</p>
     * @public
     */
    BeginOffset?: number | undefined;
    /**
     * <p>The zero-based location in the response string where the highlight ends.</p>
     * @public
     */
    EndOffset?: number | undefined;
}
/**
 * <p>Provides text and information about where to highlight the query suggestion text.</p>
 * @public
 */
export interface SuggestionTextWithHighlights {
    /**
     * <p>The query suggestion text to display to the user.</p>
     * @public
     */
    Text?: string | undefined;
    /**
     * <p>The beginning and end of the query suggestion text that should be highlighted.</p>
     * @public
     */
    Highlights?: SuggestionHighlight[] | undefined;
}
/**
 * <p>The <code>SuggestionTextWithHighlights</code> structure information.</p>
 * @public
 */
export interface SuggestionValue {
    /**
     * <p>The <code>SuggestionTextWithHighlights</code> structure that contains
     *             the query suggestion text and highlights.</p>
     * @public
     */
    Text?: SuggestionTextWithHighlights | undefined;
}
/**
 * <p>A single query suggestion.</p>
 * @public
 */
export interface Suggestion {
    /**
     * <p>The UUID (universally unique identifier) of a single
     *             query suggestion.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The value for the UUID (universally unique identifier)
     *             of a single query suggestion.</p>
     *          <p>The value is the text string of a suggestion.</p>
     * @public
     */
    Value?: SuggestionValue | undefined;
    /**
     * <p>The list of document IDs and their fields/attributes that are used for a
     *             single query suggestion, if document fields set to use for query suggestions.</p>
     * @public
     */
    SourceDocuments?: SourceDocument[] | undefined;
}
/**
 * @public
 */
export interface GetQuerySuggestionsResponse {
    /**
     * <p>The identifier for a list of query suggestions for an index.</p>
     * @public
     */
    QuerySuggestionsId?: string | undefined;
    /**
     * <p>A list of query suggestions for an index.</p>
     * @public
     */
    Suggestions?: Suggestion[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Interval: {
    readonly ONE_MONTH_AGO: "ONE_MONTH_AGO";
    readonly ONE_WEEK_AGO: "ONE_WEEK_AGO";
    readonly THIS_MONTH: "THIS_MONTH";
    readonly THIS_WEEK: "THIS_WEEK";
    readonly TWO_MONTHS_AGO: "TWO_MONTHS_AGO";
    readonly TWO_WEEKS_AGO: "TWO_WEEKS_AGO";
};
/**
 * @public
 */
export type Interval = (typeof Interval)[keyof typeof Interval];
/**
 * @public
 * @enum
 */
export declare const MetricType: {
    readonly AGG_QUERY_DOC_METRICS: "AGG_QUERY_DOC_METRICS";
    readonly DOCS_BY_CLICK_COUNT: "DOCS_BY_CLICK_COUNT";
    readonly QUERIES_BY_COUNT: "QUERIES_BY_COUNT";
    readonly QUERIES_BY_ZERO_CLICK_RATE: "QUERIES_BY_ZERO_CLICK_RATE";
    readonly QUERIES_BY_ZERO_RESULT_RATE: "QUERIES_BY_ZERO_RESULT_RATE";
    readonly TREND_QUERY_DOC_METRICS: "TREND_QUERY_DOC_METRICS";
};
/**
 * @public
 */
export type MetricType = (typeof MetricType)[keyof typeof MetricType];
/**
 * @public
 */
export interface GetSnapshotsRequest {
    /**
     * <p>The identifier of the index to get search metrics data.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The time interval or time window to get search metrics data. The time interval uses
     *             the time zone of your index. You can view data in the following time windows:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>THIS_WEEK</code>: The current week, starting on the Sunday and ending on
     *                     the day before the current date.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ONE_WEEK_AGO</code>: The previous week, starting on the Sunday and
     *                     ending on the following Saturday.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TWO_WEEKS_AGO</code>: The week before the previous week, starting on the
     *                     Sunday and ending on the following Saturday.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>THIS_MONTH</code>: The current month, starting on the first day of the
     *                     month and ending on the day before the current date.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ONE_MONTH_AGO</code>: The previous month, starting on the first day of
     *                     the month and ending on the last day of the month.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TWO_MONTHS_AGO</code>: The month before the previous month, starting on
     *                     the first day of the month and ending on last day of the month.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Interval: Interval | undefined;
    /**
     * <p>The metric you want to retrieve. You can specify only one metric per call.</p>
     *          <p>For more information about the metrics you can view, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/search-analytics.html">Gaining insights with search
     *                 analytics</a>.</p>
     * @public
     */
    MetricType: MetricType | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve),
     *                 Amazon Kendra returns a pagination token in the response. You can use this
     *             pagination token to retrieve the next set of search metrics data.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of returned data for the metric.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Provides a range of time.</p>
 * @public
 */
export interface TimeRange {
    /**
     * <p>The Unix timestamp for the beginning of the time range.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The Unix timestamp for the end of the time range.</p>
     * @public
     */
    EndTime?: Date | undefined;
}
/**
 * @public
 */
export interface GetSnapshotsResponse {
    /**
     * <p>The Unix timestamp for the beginning and end of the time window for the
     *             search metrics data.</p>
     * @public
     */
    SnapShotTimeFilter?: TimeRange | undefined;
    /**
     * <p>The column headers for the search metrics data.</p>
     * @public
     */
    SnapshotsDataHeader?: string[] | undefined;
    /**
     * <p>The search metrics data. The data returned depends on the metric type you
     *             requested.</p>
     * @public
     */
    SnapshotsData?: string[][] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token, which you can use
     *             in a later request to retrieve the next set of search metrics data.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>The input to the request is not valid. Please provide the correct input and try
 *             again.</p>
 * @public
 */
export declare class InvalidRequestException extends __BaseException {
    readonly name: "InvalidRequestException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
}
/**
 * @public
 */
export interface ListAccessControlConfigurationsRequest {
    /**
     * <p>The identifier of the index for the access control configuration.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there's more data to retrieve),
     *                 Amazon Kendra returns a pagination token in the response. You can use this
     *             pagination token to retrieve the next set of access control configurations.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of access control configurations to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListAccessControlConfigurationsResponse {
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token, which you can use
     *             in the subsequent request to retrieve the next set of access control
     *             configurations.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The details of your access control configurations.</p>
     * @public
     */
    AccessControlConfigurations: AccessControlConfigurationSummary[] | undefined;
}
/**
 * @public
 */
export interface ListDataSourcesRequest {
    /**
     * <p>The identifier of the index used with one or more data source connectors.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve), Amazon Kendra returns a pagination token in the response. You can use this pagination token to
     *       retrieve the next set of data source connectors. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of data source connectors to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information for a Amazon Kendra data source.</p>
 * @public
 */
export interface DataSourceSummary {
    /**
     * <p>The name of the data source.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The identifier for the data source.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The type of the data source.</p>
     * @public
     */
    Type?: DataSourceType | undefined;
    /**
     * <p>The Unix timestamp when the data source connector was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the data source connector was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>The status of the data source. When the status is <code>ACTIVE</code> the data source is
     *       ready to use.</p>
     * @public
     */
    Status?: DataSourceStatus | undefined;
    /**
     * <p>The code for a language. This shows a supported language for all documents
     *             in the data source. English is supported by default.
     *             For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
}
/**
 * @public
 */
export interface ListDataSourcesResponse {
    /**
     * <p>An array of summary information for one or more data source connector.</p>
     * @public
     */
    SummaryItems?: DataSourceSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token that you can use in
     *       the subsequent request to retrieve the next set of data source connectors.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DataSourceSyncJobStatus: {
    readonly ABORTED: "ABORTED";
    readonly FAILED: "FAILED";
    readonly INCOMPLETE: "INCOMPLETE";
    readonly STOPPING: "STOPPING";
    readonly SUCCEEDED: "SUCCEEDED";
    readonly SYNCING: "SYNCING";
    readonly SYNCING_INDEXING: "SYNCING_INDEXING";
};
/**
 * @public
 */
export type DataSourceSyncJobStatus = (typeof DataSourceSyncJobStatus)[keyof typeof DataSourceSyncJobStatus];
/**
 * @public
 */
export interface ListDataSourceSyncJobsRequest {
    /**
     * <p>The identifier of the data source connector.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve), Amazon Kendra returns a pagination token in the response. You can use this pagination token to
     *       retrieve the next set of jobs.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of synchronization jobs to return in the response. If there are fewer
     *       results in the list, this response contains only the actual results.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>When specified, the synchronization jobs returned in the list are limited to jobs between
     *       the specified dates.</p>
     * @public
     */
    StartTimeFilter?: TimeRange | undefined;
    /**
     * <p>Only returns synchronization jobs with the <code>Status</code> field equal to the
     *       specified status.</p>
     * @public
     */
    StatusFilter?: DataSourceSyncJobStatus | undefined;
}
/**
 * <p>Maps a batch delete document request to a specific data source sync job. This is optional
 *       and should only be supplied when documents are deleted by a data source connector.</p>
 * @public
 */
export interface DataSourceSyncJobMetrics {
    /**
     * <p>The number of documents added from the data source up to now in the data source
     *       sync.</p>
     * @public
     */
    DocumentsAdded?: string | undefined;
    /**
     * <p>The number of documents modified in the data source up to now in the data source sync
     *       run.</p>
     * @public
     */
    DocumentsModified?: string | undefined;
    /**
     * <p>The number of documents deleted from the data source up to now in the data source sync
     *       run.</p>
     * @public
     */
    DocumentsDeleted?: string | undefined;
    /**
     * <p>The number of documents that failed to sync from the data source up to now in the data
     *       source sync run.</p>
     * @public
     */
    DocumentsFailed?: string | undefined;
    /**
     * <p>The current number of documents crawled by the current sync job in the data source.</p>
     * @public
     */
    DocumentsScanned?: string | undefined;
}
/**
 * <p>Provides information about a data source synchronization job.</p>
 * @public
 */
export interface DataSourceSyncJob {
    /**
     * <p>A identifier for the synchronization job.</p>
     * @public
     */
    ExecutionId?: string | undefined;
    /**
     * <p>The Unix timestamp when the synchronization job started.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The Unix timestamp when the synchronization job completed.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>The execution status of the synchronization job. When the <code>Status</code> field is set
     *       to <code>SUCCEEDED</code>, the synchronization job is done. If the status code is set to
     *         <code>FAILED</code>, the <code>ErrorCode</code> and <code>ErrorMessage</code> fields give
     *       you the reason for the failure.</p>
     * @public
     */
    Status?: DataSourceSyncJobStatus | undefined;
    /**
     * <p>If the <code>Status</code> field is set to <code>ERROR</code>, the
     *         <code>ErrorMessage</code> field contains a description of the error that caused the
     *       synchronization to fail.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
    /**
     * <p>If the <code>Status</code> field is set to <code>FAILED</code>, the <code>ErrorCode</code>
     *       field indicates the reason the synchronization failed.</p>
     * @public
     */
    ErrorCode?: ErrorCode | undefined;
    /**
     * <p>If the reason that the synchronization failed is due to an error with the underlying data
     *       source, this field contains a code that identifies the error.</p>
     * @public
     */
    DataSourceErrorCode?: string | undefined;
    /**
     * <p>Maps a batch delete document request to a specific data source sync job. This is optional
     *       and should only be supplied when documents are deleted by a data source connector.</p>
     * @public
     */
    Metrics?: DataSourceSyncJobMetrics | undefined;
}
/**
 * @public
 */
export interface ListDataSourceSyncJobsResponse {
    /**
     * <p>A history of synchronization jobs for the data source connector.</p>
     * @public
     */
    History?: DataSourceSyncJob[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token that you can use in
     *       the subsequent request to retrieve the next set of jobs.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListEntityPersonasRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve),
     *             Amazon Kendra returns a pagination token in the response. You can use this pagination
     *             token to retrieve the next set of users or groups.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of returned users or groups.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information for users or groups in your IAM Identity Center identity
 *             source. This applies to users and groups with specific permissions that define
 *             their level of access to your Amazon Kendra experience. You can create an Amazon Kendra experience
 *             such as a search application. For more information on creating a search application
 *             experience, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html">Building a
 *                 search experience with no code</a>.</p>
 * @public
 */
export interface PersonasSummary {
    /**
     * <p>The identifier of a user or group in your IAM Identity Center identity source.
     *             For example, a user ID could be an email.</p>
     * @public
     */
    EntityId?: string | undefined;
    /**
     * <p>The persona that defines the specific permissions of the user or group in
     *             your IAM Identity Center identity source. The available personas or access
     *             roles are <code>Owner</code> and <code>Viewer</code>. For more information on
     *             these personas, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html#access-search-experience">Providing
     *                 access to your search page</a>.</p>
     * @public
     */
    Persona?: Persona | undefined;
    /**
     * <p>The Unix timestamp when the summary information was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the summary information was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
}
/**
 * @public
 */
export interface ListEntityPersonasResponse {
    /**
     * <p>An array of summary information for one or more users or groups.</p>
     * @public
     */
    SummaryItems?: PersonasSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token, which you can use in
     *             a later request to retrieve the next set of users or groups.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListExperienceEntitiesRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve),
     *             Amazon Kendra returns a pagination token in the response. You can use this pagination
     *             token to retrieve the next set of users or groups.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Information about the user entity.</p>
 * @public
 */
export interface EntityDisplayData {
    /**
     * <p>The name of the user.</p>
     * @public
     */
    UserName?: string | undefined;
    /**
     * <p>The name of the group.</p>
     * @public
     */
    GroupName?: string | undefined;
    /**
     * <p>The user name of the user.</p>
     * @public
     */
    IdentifiedUserName?: string | undefined;
    /**
     * <p>The first name of the user.</p>
     * @public
     */
    FirstName?: string | undefined;
    /**
     * <p>The last name of the user.</p>
     * @public
     */
    LastName?: string | undefined;
}
/**
 * <p>Summary information for users or groups in your IAM Identity Center identity
 *             source with granted access to your Amazon Kendra experience. You can create an Amazon Kendra
 *             experience such as a search application. For more information on creating a
 *             search application experience, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html">Building
 *                 a search experience with no code</a>.</p>
 * @public
 */
export interface ExperienceEntitiesSummary {
    /**
     * <p>The identifier of a user or group in your IAM Identity Center identity source.
     *             For example, a user ID could be an email.</p>
     * @public
     */
    EntityId?: string | undefined;
    /**
     * <p>Shows the type as <code>User</code> or <code>Group</code>.</p>
     * @public
     */
    EntityType?: EntityType | undefined;
    /**
     * <p>Information about the user entity.</p>
     * @public
     */
    DisplayData?: EntityDisplayData | undefined;
}
/**
 * @public
 */
export interface ListExperienceEntitiesResponse {
    /**
     * <p>An array of summary information for one or more users or groups.</p>
     * @public
     */
    SummaryItems?: ExperienceEntitiesSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token, which you can use in
     *             a later request to retrieve the next set of users or groups.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListExperiencesRequest {
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data
     *             to retrieve), Amazon Kendra returns a pagination token in the response. You can use this
     *             pagination token to retrieve the next set of Amazon Kendra experiences.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of returned Amazon Kendra experiences.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information for your Amazon Kendra experience. You can create an Amazon Kendra
 *             experience such as a search application. For more information on creating
 *             a search application experience, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html">Building
 *                 a search experience with no code</a>.</p>
 * @public
 */
export interface ExperiencesSummary {
    /**
     * <p>The name of your Amazon Kendra experience.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The identifier of your Amazon Kendra experience.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The Unix timestamp when your Amazon Kendra experience was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The processing status of your Amazon Kendra experience.</p>
     * @public
     */
    Status?: ExperienceStatus | undefined;
    /**
     * <p>The endpoint URLs for your Amazon Kendra experiences. The URLs are unique
     *             and fully hosted by Amazon Web Services.</p>
     * @public
     */
    Endpoints?: ExperienceEndpoint[] | undefined;
}
/**
 * @public
 */
export interface ListExperiencesResponse {
    /**
     * <p>An array of summary information for one or more Amazon Kendra experiences.</p>
     * @public
     */
    SummaryItems?: ExperiencesSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token, which you can use
     *             in a later request to retrieve the next set of Amazon Kendra experiences.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListFaqsRequest {
    /**
     * <p>The index for the FAQs.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve),
     *                 Amazon Kendra returns a pagination token in the response. You can use this
     *             pagination token to retrieve the next set of FAQs.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of FAQs to return in the response. If there are fewer results in
     *             the list, this response contains only the actual results.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information for frequently asked questions and answers included in an
 *             index.</p>
 * @public
 */
export interface FaqSummary {
    /**
     * <p>The identifier of the FAQ.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The name that you assigned the FAQ when you created or updated the FAQ.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The current status of the FAQ. When the status is <code>ACTIVE</code> the FAQ is ready
     *             for use.</p>
     * @public
     */
    Status?: FaqStatus | undefined;
    /**
     * <p>The Unix timestamp when the FAQ was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the FAQ was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>The file type used to create the FAQ. </p>
     * @public
     */
    FileFormat?: FaqFileFormat | undefined;
    /**
     * <p>The code for a language. This shows a supported language for the FAQ document
     *             as part of the summary information for FAQs. English is supported by default.
     *             For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
}
/**
 * @public
 */
export interface ListFaqsResponse {
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token that you can use
     *             in the subsequent request to retrieve the next set of FAQs.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Summary information about the FAQs for a specified index.</p>
     * @public
     */
    FaqSummaryItems?: FaqSummary[] | undefined;
}
/**
 * @public
 */
export interface ListFeaturedResultsSetsRequest {
    /**
     * <p>The identifier of the index used for featuring results.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns a pagination token
     *             in the response. You can use this pagination token to retrieve the next set
     *             of featured results sets.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of featured results sets to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information for a set of featured results. Featured results are placed
 *             above all other results for certain queries. If there's an exact match of a query,
 *             then one or more specific documents are featured in the search results.</p>
 * @public
 */
export interface FeaturedResultsSetSummary {
    /**
     * <p>The identifier of the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetId?: string | undefined;
    /**
     * <p>The name for the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetName?: string | undefined;
    /**
     * <p>The current status of the set of featured results. When the value is
     *             <code>ACTIVE</code>, featured results are ready for use. You can still
     *             configure your settings before setting the status to <code>ACTIVE</code>.
     *             You can set the status to <code>ACTIVE</code> or <code>INACTIVE</code>
     *             using the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UpdateFeaturedResultsSet.html">UpdateFeaturedResultsSet</a> API. The queries you specify for
     *             featured results must be unique per featured results set for each index,
     *             whether the status is <code>ACTIVE</code> or <code>INACTIVE</code>.</p>
     * @public
     */
    Status?: FeaturedResultsSetStatus | undefined;
    /**
     * <p>The Unix timestamp when the set of featured results was last updated.</p>
     * @public
     */
    LastUpdatedTimestamp?: number | undefined;
    /**
     * <p>The Unix timestamp when the set of featured results was created.</p>
     * @public
     */
    CreationTimestamp?: number | undefined;
}
/**
 * @public
 */
export interface ListFeaturedResultsSetsResponse {
    /**
     * <p>An array of summary information for one or more featured results sets.</p>
     * @public
     */
    FeaturedResultsSetSummaryItems?: FeaturedResultsSetSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns a pagination token
     *             in the response.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListGroupsOlderThanOrderingIdRequest {
    /**
     * <p>The identifier of the index for getting a list of groups mapped to users before a
     *             given ordering or timestamp identifier.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the data source for getting a list of groups mapped to users before
     *             a given ordering timestamp identifier.</p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>The timestamp identifier used for the latest <code>PUT</code> or <code>DELETE</code>
     *             action for mapping users to their groups.</p>
     * @public
     */
    OrderingId: number | undefined;
    /**
     * <p> If the previous response was incomplete (because there is more data to retrieve),
     *                 Amazon Kendra returns a pagination token in the response. You can use this
     *             pagination token to retrieve the next set of groups that are mapped to users before a
     *             given ordering or timestamp identifier. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p> The maximum number of returned groups that are mapped to users before a given
     *             ordering or timestamp identifier. </p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information for groups.</p>
 * @public
 */
export interface GroupSummary {
    /**
     * <p>The identifier of the group you want group summary information on.</p>
     * @public
     */
    GroupId?: string | undefined;
    /**
     * <p>The timestamp identifier used for the latest <code>PUT</code> or <code>DELETE</code>
     *             action.</p>
     * @public
     */
    OrderingId?: number | undefined;
}
/**
 * @public
 */
export interface ListGroupsOlderThanOrderingIdResponse {
    /**
     * <p> Summary information for list of groups that are mapped to users before a given
     *             ordering or timestamp identifier. </p>
     * @public
     */
    GroupsSummaries?: GroupSummary[] | undefined;
    /**
     * <p> If the response is truncated, Amazon Kendra returns this token that you can use
     *             in the subsequent request to retrieve the next set of groups that are mapped to users
     *             before a given ordering or timestamp identifier. </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListIndicesRequest {
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve), Amazon Kendra returns a pagination token in the response. You can use this pagination token to
     *       retrieve the next set of indexes. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of indices to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information on the configuration of an index.</p>
 * @public
 */
export interface IndexConfigurationSummary {
    /**
     * <p>The name of the index.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>A identifier for the index. Use this to identify the index when you are using APIs such as
     *         <code>Query</code>, <code>DescribeIndex</code>, <code>UpdateIndex</code>, and
     *         <code>DeleteIndex</code>.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>Indicates whether the index is a Enterprise Edition index or a Developer Edition index.
     *     </p>
     * @public
     */
    Edition?: IndexEdition | undefined;
    /**
     * <p>The Unix timestamp when the index was created.</p>
     * @public
     */
    CreatedAt: Date | undefined;
    /**
     * <p>The Unix timestamp when the index was last updated.</p>
     * @public
     */
    UpdatedAt: Date | undefined;
    /**
     * <p>The current status of the index. When the status is <code>ACTIVE</code>, the index is
     *       ready to search.</p>
     * @public
     */
    Status: IndexStatus | undefined;
}
/**
 * @public
 */
export interface ListIndicesResponse {
    /**
     * <p>An array of summary information on the configuration of one or more indexes.</p>
     * @public
     */
    IndexConfigurationSummaryItems?: IndexConfigurationSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token that you can use in
     *       the subsequent request to retrieve the next set of indexes.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListQuerySuggestionsBlockListsRequest {
    /**
     * <p>The identifier of the index for a list of all block lists that exist for
     *             that index.</p>
     *          <p>For information on the current quota limits for block lists, see
     *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
     *                 for Amazon Kendra</a>.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve),
     *             Amazon Kendra returns a pagination token in the response. You can use this pagination
     *             token to retrieve the next set of block lists (<code>BlockListSummaryItems</code>).</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of block lists to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary information on a query suggestions block list.</p>
 *          <p>This includes information on the block list ID, block list name, when the
 *             block list was created, when the block list was last updated, and the count
 *             of block words/phrases in the block list.</p>
 *          <p>For information on the current quota limits for block lists, see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
 *                 for Amazon Kendra</a>.</p>
 * @public
 */
export interface QuerySuggestionsBlockListSummary {
    /**
     * <p>The identifier of a block list.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The name of the block list.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The status of the block list.</p>
     * @public
     */
    Status?: QuerySuggestionsBlockListStatus | undefined;
    /**
     * <p>The Unix timestamp when the block list was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the block list was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
    /**
     * <p>The number of items in the block list file.</p>
     * @public
     */
    ItemCount?: number | undefined;
}
/**
 * @public
 */
export interface ListQuerySuggestionsBlockListsResponse {
    /**
     * <p>Summary items for a block list.</p>
     *          <p>This includes summary items on the block list ID, block list name, when the
     *             block list was created, when the block list was last updated, and the count
     *             of block words/phrases in the block list.</p>
     *          <p>For information on the current quota limits for block lists, see
     *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
     *                 for Amazon Kendra</a>.</p>
     * @public
     */
    BlockListSummaryItems?: QuerySuggestionsBlockListSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon Kendra returns this token that you can use
     *             in the subsequent request to retrieve the next set of block lists.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTagsForResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the index, FAQ, data source, or other resource to
     *       get a list of tags for. For example, the ARN of an index is constructed as follows:
     *       <i>arn:aws:kendra:your-region:your-account-id:index/index-id</i>
     *       For information on how to construct an ARN for all types of Amazon Kendra resources, see
     *       <a href="https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkendra.html#amazonkendra-resources-for-iam-policies">Resource
     *         types</a>.</p>
     * @public
     */
    ResourceARN: string | undefined;
}
/**
 * @public
 */
export interface ListTagsForResourceResponse {
    /**
     * <p>A list of tags associated with the index, FAQ, data source, or other resource.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>The resource you want to use isn't available. Please check you have provided the
 *             correct resource and try again.</p>
 * @public
 */
export declare class ResourceUnavailableException extends __BaseException {
    readonly name: "ResourceUnavailableException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceUnavailableException, __BaseException>);
}
/**
 * @public
 */
export interface ListThesauriRequest {
    /**
     * <p>The identifier of the index with one or more thesauri.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>If the previous response was incomplete (because there is more data to retrieve),
     *          Amazon Kendra returns a pagination token in the response. You can use this pagination token to
     *          retrieve the next set of thesauri (<code>ThesaurusSummaryItems</code>).
     *       </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of thesauri to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>An array of summary information for a thesaurus or multiple thesauri.</p>
 * @public
 */
export interface ThesaurusSummary {
    /**
     * <p>The identifier of the thesaurus.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The name of the thesaurus.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The status of the thesaurus.</p>
     * @public
     */
    Status?: ThesaurusStatus | undefined;
    /**
     * <p>The Unix timestamp when the thesaurus was created.</p>
     * @public
     */
    CreatedAt?: Date | undefined;
    /**
     * <p>The Unix timestamp when the thesaurus was last updated.</p>
     * @public
     */
    UpdatedAt?: Date | undefined;
}
/**
 * @public
 */
export interface ListThesauriResponse {
    /**
     * <p>If the response is truncated, Amazon Kendra returns this
     *          token that you can use in the subsequent request to
     *          retrieve the next set of thesauri.
     *       </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>An array of summary information for a thesaurus or multiple thesauri.</p>
     * @public
     */
    ThesaurusSummaryItems?: ThesaurusSummary[] | undefined;
}
/**
 * <p>The sub groups that belong to a group.</p>
 * @public
 */
export interface MemberGroup {
    /**
     * <p>The identifier of the sub group you want to map to a group.</p>
     * @public
     */
    GroupId: string | undefined;
    /**
     * <p>The identifier of the data source for the sub group you want to map to a group.</p>
     * @public
     */
    DataSourceId?: string | undefined;
}
/**
 * <p>The users that belong to a group.</p>
 * @public
 */
export interface MemberUser {
    /**
     * <p>The identifier of the user you want to map to a group.</p>
     * @public
     */
    UserId: string | undefined;
}
/**
 * <p>A list of users that belong to a group. This is useful for user context
 *             filtering, where search results are filtered based on the user or their group access to
 *             documents.</p>
 * @public
 */
export interface GroupMembers {
    /**
     * <p>A list of users that belong to a group. This can also include sub groups. For example,
     *             the sub groups "Research", "Engineering", and "Sales and Marketing" all belong to the group
     *             "Company A".</p>
     * @public
     */
    MemberGroups?: MemberGroup[] | undefined;
    /**
     * <p>A list of users that belong to a group. For example, a list of interns all belong to
     *             the "Interns" group.</p>
     * @public
     */
    MemberUsers?: MemberUser[] | undefined;
    /**
     * <p>If you have more than 1000 users and/or sub groups for a single group, you need to
     *             provide the path to the S3 file that lists your users and sub groups for a group. Your
     *             sub groups can contain more than 1000 users, but the list of sub groups that belong to a
     *             group (and/or users) must be no more than 1000.</p>
     *          <p>You can download this <a href="https://docs.aws.amazon.com/kendra/latest/dg/samples/group_members.zip">example
     *                 S3 file</a> that uses the correct format for listing group members. Note,
     *                 <code>dataSourceId</code> is optional. The value of <code>type</code> for a group is
     *             always <code>GROUP</code> and for a user it is always <code>USER</code>.</p>
     * @public
     */
    S3PathforGroupMembers?: S3Path | undefined;
}
/**
 * @public
 */
export interface PutPrincipalMappingRequest {
    /**
     * <p>The identifier of the index you want to map users to their groups.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the data source you want to map users to their groups.</p>
     *          <p>This is useful if a group is tied to multiple data sources, but you only want the
     *             group to access documents of a certain data source. For example, the groups "Research",
     *             "Engineering", and "Sales and Marketing" are all tied to the company's documents stored
     *             in the data sources Confluence and Salesforce. However, "Sales and Marketing" team only
     *             needs access to customer-related documents stored in Salesforce.</p>
     * @public
     */
    DataSourceId?: string | undefined;
    /**
     * <p>The identifier of the group you want to map its users to.</p>
     * @public
     */
    GroupId: string | undefined;
    /**
     * <p>The list that contains your users that belong the same group. This can include sub groups
     *             that belong to a group.</p>
     *          <p>For example, the group "Company A" includes the user "CEO" and the sub groups
     *             "Research", "Engineering", and "Sales and Marketing".</p>
     *          <p>If you have more than 1000 users and/or sub groups for a single group, you need to
     *             provide the path to the S3 file that lists your users and sub groups for a group. Your
     *             sub groups can contain more than 1000 users, but the list of sub groups that belong to a
     *             group (and/or users) must be no more than 1000.</p>
     * @public
     */
    GroupMembers: GroupMembers | undefined;
    /**
     * <p>The timestamp identifier you specify to ensure Amazon Kendra doesn't override
     *             the latest <code>PUT</code> action with previous actions. The highest number ID, which
     *             is the ordering ID, is the latest action you want to process and apply on top of other
     *             actions with lower number IDs. This prevents previous actions with lower number IDs from
     *             possibly overriding the latest action.</p>
     *          <p>The ordering ID can be the Unix time of the last update you made to a group members
     *             list. You would then provide this list when calling <code>PutPrincipalMapping</code>.
     *             This ensures your <code>PUT</code> action for that updated group with the latest members
     *             list doesn't get overwritten by earlier <code>PUT</code> actions for the same group
     *             which are yet to be processed.</p>
     *          <p>The default ordering ID is the current Unix time in milliseconds that the action was
     *             received by Amazon Kendra.</p>
     * @public
     */
    OrderingId?: number | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that has access to the
     *             S3 file that contains your list of users that belong to a group.</p>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html#iam-roles-ds">IAM roles for
     *             Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn?: string | undefined;
}
/**
 * <p>Specifies the configuration information needed to customize how collapsed search
 *             result groups expand.</p>
 * @public
 */
export interface ExpandConfiguration {
    /**
     * <p>The number of collapsed search result groups to expand. If you set this value to 10,
     *             for example, only the first 10 out of 100 result groups will have expand functionality.
     *         </p>
     * @public
     */
    MaxResultItemsToExpand?: number | undefined;
    /**
     * <p>The number of expanded results to show per collapsed primary document. For instance,
     *             if you set this value to 3, then at most 3 results per collapsed group will be
     *             displayed.</p>
     * @public
     */
    MaxExpandedResultsPerItem?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MissingAttributeKeyStrategy: {
    readonly COLLAPSE: "COLLAPSE";
    readonly EXPAND: "EXPAND";
    readonly IGNORE: "IGNORE";
};
/**
 * @public
 */
export type MissingAttributeKeyStrategy = (typeof MissingAttributeKeyStrategy)[keyof typeof MissingAttributeKeyStrategy];
/**
 * @public
 * @enum
 */
export declare const SortOrder: {
    readonly ASC: "ASC";
    readonly DESC: "DESC";
};
/**
 * @public
 */
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
/**
 * <p>Specifies the document attribute to use to sort the response to a Amazon Kendra
 *             query. You can specify a single attribute for sorting. The attribute must have the
 *                 <code>Sortable</code> flag set to <code>true</code>, otherwise Amazon Kendra
 *             returns an exception.</p>
 *          <p>You can sort attributes of the following types.</p>
 *          <ul>
 *             <li>
 *                <p>Date value</p>
 *             </li>
 *             <li>
 *                <p>Long value</p>
 *             </li>
 *             <li>
 *                <p>String value</p>
 *             </li>
 *          </ul>
 *          <p>You can't sort attributes of the following type.</p>
 *          <ul>
 *             <li>
 *                <p>String list value</p>
 *             </li>
 *          </ul>
 * @public
 */
export interface SortingConfiguration {
    /**
     * <p>The name of the document attribute used to sort the response. You can use any field
     *             that has the <code>Sortable</code> flag set to true.</p>
     *          <p>You can also sort by any of the following built-in attributes:</p>
     *          <ul>
     *             <li>
     *                <p>_category</p>
     *             </li>
     *             <li>
     *                <p>_created_at</p>
     *             </li>
     *             <li>
     *                <p>_last_updated_at</p>
     *             </li>
     *             <li>
     *                <p>_version</p>
     *             </li>
     *             <li>
     *                <p>_view_count</p>
     *             </li>
     *          </ul>
     * @public
     */
    DocumentAttributeKey: string | undefined;
    /**
     * <p>The order that the results should be returned in. In case of ties, the relevance
     *             assigned to the result by Amazon Kendra is used as the tie-breaker.</p>
     * @public
     */
    SortOrder: SortOrder | undefined;
}
/**
 * <p>Specifies how to group results by document attribute value, and how to display them
 *             collapsed/expanded under a designated primary document for each group.</p>
 * @public
 */
export interface CollapseConfiguration {
    /**
     * <p>The document attribute used to group search results. You can use any attribute that
     *             has the <code>Sortable</code> flag set to true. You can also sort by any of the
     *             following built-in attributes:"_category","_created_at", "_last_updated_at", "_version",
     *             "_view_count".</p>
     * @public
     */
    DocumentAttributeKey: string | undefined;
    /**
     * <p>A prioritized list of document attributes/fields that determine the primary document
     *             among those in a collapsed group.</p>
     * @public
     */
    SortingConfigurations?: SortingConfiguration[] | undefined;
    /**
     * <p>Specifies the behavior for documents without a value for the collapse
     *             attribute.</p>
     *          <p>Amazon Kendra offers three customization options:</p>
     *          <ul>
     *             <li>
     *                <p>Choose to <code>COLLAPSE</code> all documents with null or missing values in
     *                     one group. This is the default configuration.</p>
     *             </li>
     *             <li>
     *                <p>Choose to <code>IGNORE</code> documents with null or missing values. Ignored
     *                     documents will not appear in query results.</p>
     *             </li>
     *             <li>
     *                <p>Choose to <code>EXPAND</code> each document with a null or missing value into
     *                     a group of its own.</p>
     *             </li>
     *          </ul>
     * @public
     */
    MissingAttributeKeyStrategy?: MissingAttributeKeyStrategy | undefined;
    /**
     * <p>Specifies whether to expand the collapsed results.</p>
     * @public
     */
    Expand?: boolean | undefined;
    /**
     * <p>Provides configuration information to customize expansion options for a collapsed
     *             group.</p>
     * @public
     */
    ExpandConfiguration?: ExpandConfiguration | undefined;
}
/**
 * <p>Overrides the document relevance properties of a custom index field.</p>
 * @public
 */
export interface DocumentRelevanceConfiguration {
    /**
     * <p>The name of the index field.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>Provides information for tuning the relevance of a field in a search. When a query
     *          includes terms that match the field, the results are given a boost in the response based on
     *          these tuning parameters.</p>
     * @public
     */
    Relevance: Relevance | undefined;
}
/**
 * @public
 * @enum
 */
export declare const QueryResultType: {
    readonly ANSWER: "ANSWER";
    readonly DOCUMENT: "DOCUMENT";
    readonly QUESTION_ANSWER: "QUESTION_ANSWER";
};
/**
 * @public
 */
export type QueryResultType = (typeof QueryResultType)[keyof typeof QueryResultType];
/**
 * <p>Provides the configuration information for suggested query spell corrections.</p>
 *          <p>Suggested spell corrections are based on words that appear in your indexed documents
 *             and how closely a corrected word matches a misspelled word.</p>
 *          <p>This feature is designed with certain defaults or limits. For information on the
 *             current limits and how to request more support for some limits, see the
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/query-spell-check.html">Spell
 *                 Checker documentation</a>.</p>
 * @public
 */
export interface SpellCorrectionConfiguration {
    /**
     * <p>
     *             <code>TRUE</code> to suggest spell corrections for queries.</p>
     * @public
     */
    IncludeQuerySpellCheckSuggestions: boolean | undefined;
}
/**
 * <p>A single featured result item. A featured result is displayed at the top of
 *             the search results page, placed above all other results for certain queries. If
 *             there's an exact match of a query, then certain documents are featured in the
 *             search results.</p>
 * @public
 */
export interface FeaturedResultsItem {
    /**
     * <p>The identifier of the featured result.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The type of document within the featured result response. For example,
     *             a response could include a question-answer type that's relevant to the
     *             query.</p>
     * @public
     */
    Type?: QueryResultType | undefined;
    /**
     * <p>One or more additional attributes associated with the featured result.</p>
     * @public
     */
    AdditionalAttributes?: AdditionalResultAttribute[] | undefined;
    /**
     * <p>The identifier of the featured document.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p>Provides text and information about where to highlight the text.</p>
     * @public
     */
    DocumentTitle?: TextWithHighlights | undefined;
    /**
     * <p>Provides text and information about where to highlight the text.</p>
     * @public
     */
    DocumentExcerpt?: TextWithHighlights | undefined;
    /**
     * <p>The source URI location of the featured document.</p>
     * @public
     */
    DocumentURI?: string | undefined;
    /**
     * <p>An array of document attributes assigned to a featured document in the
     *             search results. For example, the document author (<code>_author</code>) or
     *             the source URI (<code>_source_uri</code>) of the document.</p>
     * @public
     */
    DocumentAttributes?: DocumentAttribute[] | undefined;
    /**
     * <p>A token that identifies a particular featured result from a particular
     *             query. Use this token to provide click-through feedback for the result.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/submitting-feedback.html">Submitting feedback</a>.</p>
     * @public
     */
    FeedbackToken?: string | undefined;
}
/**
 * <p> A single expanded result in a collapsed group of search results.</p>
 *          <p>An expanded result item contains information about an expanded result document within
 *             a collapsed group of search results. This includes the original location of the
 *             document, a list of attributes assigned to the document, and relevant text from the
 *             document that satisfies the query. </p>
 * @public
 */
export interface ExpandedResultItem {
    /**
     * <p>The identifier for the expanded result.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The idenitifier of the document.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p>Provides text and information about where to highlight the text.</p>
     * @public
     */
    DocumentTitle?: TextWithHighlights | undefined;
    /**
     * <p>Provides text and information about where to highlight the text.</p>
     * @public
     */
    DocumentExcerpt?: TextWithHighlights | undefined;
    /**
     * <p>The URI of the original location of the document.</p>
     * @public
     */
    DocumentURI?: string | undefined;
    /**
     * <p>An array of document attributes assigned to a document in the search results. For
     *             example, the document author ("_author") or the source URI ("_source_uri") of the
     *             document.</p>
     * @public
     */
    DocumentAttributes?: DocumentAttribute[] | undefined;
}
/**
 * <p>Provides details about a collapsed group of search results.</p>
 * @public
 */
export interface CollapsedResultDetail {
    /**
     * <p>The value of the document attribute that results are collapsed on.</p>
     * @public
     */
    DocumentAttribute: DocumentAttribute | undefined;
    /**
     * <p>A list of results in the collapsed group.</p>
     * @public
     */
    ExpandedResults?: ExpandedResultItem[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const QueryResultFormat: {
    readonly TABLE: "TABLE";
    readonly TEXT: "TEXT";
};
/**
 * @public
 */
export type QueryResultFormat = (typeof QueryResultFormat)[keyof typeof QueryResultFormat];
/**
 * @internal
 */
export declare const ServerSideEncryptionConfigurationFilterSensitiveLog: (obj: ServerSideEncryptionConfiguration) => any;
/**
 * @internal
 */
export declare const CreateIndexRequestFilterSensitiveLog: (obj: CreateIndexRequest) => any;
/**
 * @internal
 */
export declare const DescribeIndexResponseFilterSensitiveLog: (obj: DescribeIndexResponse) => any;
/**
 * @internal
 */
export declare const EntityDisplayDataFilterSensitiveLog: (obj: EntityDisplayData) => any;
/**
 * @internal
 */
export declare const ExperienceEntitiesSummaryFilterSensitiveLog: (obj: ExperienceEntitiesSummary) => any;
/**
 * @internal
 */
export declare const ListExperienceEntitiesResponseFilterSensitiveLog: (obj: ListExperienceEntitiesResponse) => any;
