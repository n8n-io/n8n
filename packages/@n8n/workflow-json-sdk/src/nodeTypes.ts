/* eslint-disable @typescript-eslint/naming-convention */
// Auto-generated node types from nodes.json
// This provides type-safe access to all n8n node types
// Note: Some nodes have multiple versions (e.g., Airtable_v1, Airtable_v2_1)

// ===== Base Parameter Types =====

/** Common parameters for nodes that support pagination */
export interface PaginationParams {
	returnAll?: boolean;
	limit?: number;
}

/** Common parameters for resource-based nodes */
export interface ResourceBasedParams {
	resource?: string;
	operation?: string;
}

/** Common parameters for nodes with additional/optional fields */
export interface ExtendableParams {
	additionalFields?: Record<string, unknown>;
	updateFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
	filters?: Record<string, unknown>;
}

/** Base interface that most node parameters extend from */
export interface BaseNodeParams extends PaginationParams, ResourceBasedParams, ExtendableParams {
	[key: string]: unknown;
}

// ===== Node Type Constants =====

/**
 * Enumeration of all available n8n node types.
 * Use this for type-safe node type strings.
 * For nodes with multiple versions, version suffixes are added (e.g., Airtable_v2_1).
 */
export const NodeTypes = {
	ActionNetwork: 'n8n-nodes-base.actionNetwork' as const,
	ActiveCampaign: 'n8n-nodes-base.activeCampaign' as const,
	ActiveCampaignTrigger: 'n8n-nodes-base.activeCampaignTrigger' as const,
	AcuitySchedulingTrigger: 'n8n-nodes-base.acuitySchedulingTrigger' as const,
	Adalo: 'n8n-nodes-base.adalo' as const,
	Affinity: 'n8n-nodes-base.affinity' as const,
	AffinityTrigger: 'n8n-nodes-base.affinityTrigger' as const,
	AgileCrm: 'n8n-nodes-base.agileCrm' as const,
	Airtable_v2_1: 'n8n-nodes-base.airtable' as const,
	Airtable_v1: 'n8n-nodes-base.airtable' as const,
	AirtableTrigger: 'n8n-nodes-base.airtableTrigger' as const,
	Airtop: 'n8n-nodes-base.airtop' as const,
	AiTransform: 'n8n-nodes-base.aiTransform' as const,
	Amqp: 'n8n-nodes-base.amqp' as const,
	AmqpTrigger: 'n8n-nodes-base.amqpTrigger' as const,
	ApiTemplateIo: 'n8n-nodes-base.apiTemplateIo' as const,
	Asana: 'n8n-nodes-base.asana' as const,
	AsanaTrigger: 'n8n-nodes-base.asanaTrigger' as const,
	Automizy: 'n8n-nodes-base.automizy' as const,
	Autopilot: 'n8n-nodes-base.autopilot' as const,
	AutopilotTrigger: 'n8n-nodes-base.autopilotTrigger' as const,
	AwsLambda: 'n8n-nodes-base.awsLambda' as const,
	AwsSns: 'n8n-nodes-base.awsSns' as const,
	AwsSnsTrigger: 'n8n-nodes-base.awsSnsTrigger' as const,
	AwsCertificateManager: 'n8n-nodes-base.awsCertificateManager' as const,
	AwsCognito: 'n8n-nodes-base.awsCognito' as const,
	AwsComprehend: 'n8n-nodes-base.awsComprehend' as const,
	AwsDynamoDb: 'n8n-nodes-base.awsDynamoDb' as const,
	AwsElb: 'n8n-nodes-base.awsElb' as const,
	AwsIam: 'n8n-nodes-base.awsIam' as const,
	AwsRekognition: 'n8n-nodes-base.awsRekognition' as const,
	AwsS3_v2: 'n8n-nodes-base.awsS3' as const,
	AwsS3_v1: 'n8n-nodes-base.awsS3' as const,
	AwsSes: 'n8n-nodes-base.awsSes' as const,
	AwsSqs: 'n8n-nodes-base.awsSqs' as const,
	AwsTextract: 'n8n-nodes-base.awsTextract' as const,
	AwsTranscribe: 'n8n-nodes-base.awsTranscribe' as const,
	BambooHr: 'n8n-nodes-base.bambooHr' as const,
	Bannerbear: 'n8n-nodes-base.bannerbear' as const,
	Baserow: 'n8n-nodes-base.baserow' as const,
	Beeminder: 'n8n-nodes-base.beeminder' as const,
	BitbucketTrigger: 'n8n-nodes-base.bitbucketTrigger' as const,
	Bitly: 'n8n-nodes-base.bitly' as const,
	Bitwarden: 'n8n-nodes-base.bitwarden' as const,
	Box: 'n8n-nodes-base.box' as const,
	BoxTrigger: 'n8n-nodes-base.boxTrigger' as const,
	Brandfetch: 'n8n-nodes-base.Brandfetch' as const,
	Bubble: 'n8n-nodes-base.bubble' as const,
	CalTrigger: 'n8n-nodes-base.calTrigger' as const,
	CalendlyTrigger: 'n8n-nodes-base.calendlyTrigger' as const,
	Chargebee: 'n8n-nodes-base.chargebee' as const,
	ChargebeeTrigger: 'n8n-nodes-base.chargebeeTrigger' as const,
	CircleCi: 'n8n-nodes-base.circleCi' as const,
	CiscoWebex: 'n8n-nodes-base.ciscoWebex' as const,
	CiscoWebexTrigger: 'n8n-nodes-base.ciscoWebexTrigger' as const,
	Cloudflare: 'n8n-nodes-base.cloudflare' as const,
	Clearbit: 'n8n-nodes-base.clearbit' as const,
	ClickUp: 'n8n-nodes-base.clickUp' as const,
	ClickUpTrigger: 'n8n-nodes-base.clickUpTrigger' as const,
	Clockify: 'n8n-nodes-base.clockify' as const,
	ClockifyTrigger: 'n8n-nodes-base.clockifyTrigger' as const,
	Cockpit: 'n8n-nodes-base.cockpit' as const,
	Coda: 'n8n-nodes-base.coda' as const,
	Code_v2: 'n8n-nodes-base.code' as const,
	CoinGecko: 'n8n-nodes-base.coinGecko' as const,
	CompareDatasets: 'n8n-nodes-base.compareDatasets' as const,
	Compression: 'n8n-nodes-base.compression' as const,
	Contentful: 'n8n-nodes-base.contentful' as const,
	ConvertKit: 'n8n-nodes-base.convertKit' as const,
	ConvertKitTrigger: 'n8n-nodes-base.convertKitTrigger' as const,
	Copper: 'n8n-nodes-base.copper' as const,
	CopperTrigger: 'n8n-nodes-base.copperTrigger' as const,
	Cortex: 'n8n-nodes-base.cortex' as const,
	CrateDb: 'n8n-nodes-base.crateDb' as const,
	Cron: 'n8n-nodes-base.cron' as const,
	CrowdDev: 'n8n-nodes-base.crowdDev' as const,
	CrowdDevTrigger: 'n8n-nodes-base.crowdDevTrigger' as const,
	Crypto: 'n8n-nodes-base.crypto' as const,
	CustomerIo: 'n8n-nodes-base.customerIo' as const,
	CustomerIoTrigger: 'n8n-nodes-base.customerIoTrigger' as const,
	DataTable: 'n8n-nodes-base.dataTable' as const,
	DateTime_v2: 'n8n-nodes-base.dateTime' as const,
	DateTime_v1: 'n8n-nodes-base.dateTime' as const,
	DebugHelper: 'n8n-nodes-base.debugHelper' as const,
	DeepL: 'n8n-nodes-base.deepL' as const,
	Demio: 'n8n-nodes-base.demio' as const,
	Dhl: 'n8n-nodes-base.dhl' as const,
	Discord_v2: 'n8n-nodes-base.discord' as const,
	Discord_v1: 'n8n-nodes-base.discord' as const,
	Discourse: 'n8n-nodes-base.discourse' as const,
	Disqus: 'n8n-nodes-base.disqus' as const,
	Drift: 'n8n-nodes-base.drift' as const,
	Dropbox: 'n8n-nodes-base.dropbox' as const,
	Dropcontact: 'n8n-nodes-base.dropcontact' as const,
	EditImage: 'n8n-nodes-base.editImage' as const,
	Egoi: 'n8n-nodes-base.egoi' as const,
	Elasticsearch: 'n8n-nodes-base.elasticsearch' as const,
	ElasticSecurity: 'n8n-nodes-base.elasticSecurity' as const,
	EmailReadImap_v2_1: 'n8n-nodes-base.emailReadImap' as const,
	EmailReadImap_v1: 'n8n-nodes-base.emailReadImap' as const,
	EmailSend_v2_1: 'n8n-nodes-base.emailSend' as const,
	EmailSend_v1: 'n8n-nodes-base.emailSend' as const,
	Emelia: 'n8n-nodes-base.emelia' as const,
	EmeliaTrigger: 'n8n-nodes-base.emeliaTrigger' as const,
	ErpNext: 'n8n-nodes-base.erpNext' as const,
	ErrorTrigger: 'n8n-nodes-base.errorTrigger' as const,
	EvaluationTrigger: 'n8n-nodes-base.evaluationTrigger' as const,
	Evaluation: 'n8n-nodes-base.evaluation' as const,
	EventbriteTrigger: 'n8n-nodes-base.eventbriteTrigger' as const,
	ExecuteCommand: 'n8n-nodes-base.executeCommand' as const,
	ExecuteWorkflow: 'n8n-nodes-base.executeWorkflow' as const,
	ExecuteWorkflowTrigger: 'n8n-nodes-base.executeWorkflowTrigger' as const,
	ExecutionData: 'n8n-nodes-base.executionData' as const,
	FacebookGraphApi: 'n8n-nodes-base.facebookGraphApi' as const,
	FacebookTrigger: 'n8n-nodes-base.facebookTrigger' as const,
	FacebookLeadAdsTrigger: 'n8n-nodes-base.facebookLeadAdsTrigger' as const,
	FigmaTrigger: 'n8n-nodes-base.figmaTrigger' as const,
	Filemaker: 'n8n-nodes-base.filemaker' as const,
	ReadWriteFile: 'n8n-nodes-base.readWriteFile' as const,
	ConvertToFile: 'n8n-nodes-base.convertToFile' as const,
	ExtractFromFile: 'n8n-nodes-base.extractFromFile' as const,
	Filter_v2_2: 'n8n-nodes-base.filter' as const,
	Filter_v1: 'n8n-nodes-base.filter' as const,
	Flow: 'n8n-nodes-base.flow' as const,
	FlowTrigger: 'n8n-nodes-base.flowTrigger' as const,
	Form: 'n8n-nodes-base.form' as const,
	FormTrigger_v2_3: 'n8n-nodes-base.formTrigger' as const,
	FormTrigger_v1: 'n8n-nodes-base.formTrigger' as const,
	FormIoTrigger: 'n8n-nodes-base.formIoTrigger' as const,
	FormstackTrigger: 'n8n-nodes-base.formstackTrigger' as const,
	Freshdesk: 'n8n-nodes-base.freshdesk' as const,
	Freshservice: 'n8n-nodes-base.freshservice' as const,
	FreshworksCrm: 'n8n-nodes-base.freshworksCrm' as const,
	Ftp: 'n8n-nodes-base.ftp' as const,
	Function: 'n8n-nodes-base.function' as const,
	FunctionItem: 'n8n-nodes-base.functionItem' as const,
	GetResponse: 'n8n-nodes-base.getResponse' as const,
	GetResponseTrigger: 'n8n-nodes-base.getResponseTrigger' as const,
	Ghost: 'n8n-nodes-base.ghost' as const,
	Git: 'n8n-nodes-base.git' as const,
	Github: 'n8n-nodes-base.github' as const,
	GithubTrigger: 'n8n-nodes-base.githubTrigger' as const,
	Gitlab: 'n8n-nodes-base.gitlab' as const,
	GitlabTrigger: 'n8n-nodes-base.gitlabTrigger' as const,
	Gong: 'n8n-nodes-base.gong' as const,
	GoogleAds: 'n8n-nodes-base.googleAds' as const,
	GoogleAnalytics_v2: 'n8n-nodes-base.googleAnalytics' as const,
	GoogleAnalytics_v1: 'n8n-nodes-base.googleAnalytics' as const,
	GoogleBigQuery_v2_1: 'n8n-nodes-base.googleBigQuery' as const,
	GoogleBigQuery_v1: 'n8n-nodes-base.googleBigQuery' as const,
	GoogleBooks: 'n8n-nodes-base.googleBooks' as const,
	GoogleCalendar: 'n8n-nodes-base.googleCalendar' as const,
	GoogleCalendarTrigger: 'n8n-nodes-base.googleCalendarTrigger' as const,
	GoogleChat: 'n8n-nodes-base.googleChat' as const,
	GoogleCloudNaturalLanguage: 'n8n-nodes-base.googleCloudNaturalLanguage' as const,
	GoogleCloudStorage: 'n8n-nodes-base.googleCloudStorage' as const,
	GoogleContacts: 'n8n-nodes-base.googleContacts' as const,
	GoogleDocs: 'n8n-nodes-base.googleDocs' as const,
	GoogleDrive_v3: 'n8n-nodes-base.googleDrive' as const,
	GoogleDrive_v2: 'n8n-nodes-base.googleDrive' as const,
	GoogleDriveTrigger: 'n8n-nodes-base.googleDriveTrigger' as const,
	GoogleFirebaseCloudFirestore: 'n8n-nodes-base.googleFirebaseCloudFirestore' as const,
	GoogleFirebaseRealtimeDatabase: 'n8n-nodes-base.googleFirebaseRealtimeDatabase' as const,
	Gmail_v2_1: 'n8n-nodes-base.gmail' as const,
	Gmail_v1: 'n8n-nodes-base.gmail' as const,
	GmailTrigger: 'n8n-nodes-base.gmailTrigger' as const,
	GSuiteAdmin: 'n8n-nodes-base.gSuiteAdmin' as const,
	GoogleBusinessProfile: 'n8n-nodes-base.googleBusinessProfile' as const,
	GoogleBusinessProfileTrigger: 'n8n-nodes-base.googleBusinessProfileTrigger' as const,
	GooglePerspective: 'n8n-nodes-base.googlePerspective' as const,
	GoogleSheets_v4_7: 'n8n-nodes-base.googleSheets' as const,
	GoogleSheets_v2: 'n8n-nodes-base.googleSheets' as const,
	GoogleSheetsTrigger: 'n8n-nodes-base.googleSheetsTrigger' as const,
	GoogleSlides: 'n8n-nodes-base.googleSlides' as const,
	GoogleTasks: 'n8n-nodes-base.googleTasks' as const,
	GoogleTranslate: 'n8n-nodes-base.googleTranslate' as const,
	YouTube: 'n8n-nodes-base.youTube' as const,
	Gotify: 'n8n-nodes-base.gotify' as const,
	GoToWebinar: 'n8n-nodes-base.goToWebinar' as const,
	Grafana: 'n8n-nodes-base.grafana' as const,
	Graphql: 'n8n-nodes-base.graphql' as const,
	Grist: 'n8n-nodes-base.grist' as const,
	GumroadTrigger: 'n8n-nodes-base.gumroadTrigger' as const,
	HackerNews: 'n8n-nodes-base.hackerNews' as const,
	HaloPSA: 'n8n-nodes-base.haloPSA' as const,
	Harvest: 'n8n-nodes-base.harvest' as const,
	HelpScout: 'n8n-nodes-base.helpScout' as const,
	HelpScoutTrigger: 'n8n-nodes-base.helpScoutTrigger' as const,
	HighLevel_v2: 'n8n-nodes-base.highLevel' as const,
	HighLevel_v1: 'n8n-nodes-base.highLevel' as const,
	HomeAssistant: 'n8n-nodes-base.homeAssistant' as const,
	HtmlExtract: 'n8n-nodes-base.htmlExtract' as const,
	Html: 'n8n-nodes-base.html' as const,
	HttpRequest_v4_3: 'n8n-nodes-base.httpRequest' as const,
	HttpRequest_v2: 'n8n-nodes-base.httpRequest' as const,
	HttpRequest_v1: 'n8n-nodes-base.httpRequest' as const,
	Hubspot_v2_2: 'n8n-nodes-base.hubspot' as const,
	Hubspot_v1: 'n8n-nodes-base.hubspot' as const,
	HubspotTrigger: 'n8n-nodes-base.hubspotTrigger' as const,
	HumanticAi: 'n8n-nodes-base.humanticAi' as const,
	Hunter: 'n8n-nodes-base.hunter' as const,
	ICal: 'n8n-nodes-base.iCal' as const,
	If_v2_2: 'n8n-nodes-base.if' as const,
	If_v1: 'n8n-nodes-base.if' as const,
	Intercom: 'n8n-nodes-base.intercom' as const,
	Interval: 'n8n-nodes-base.interval' as const,
	InvoiceNinja: 'n8n-nodes-base.invoiceNinja' as const,
	InvoiceNinjaTrigger: 'n8n-nodes-base.invoiceNinjaTrigger' as const,
	ItemLists_v3_1: 'n8n-nodes-base.itemLists' as const,
	ItemLists_v2_2: 'n8n-nodes-base.itemLists' as const,
	ItemLists_v1: 'n8n-nodes-base.itemLists' as const,
	Iterable: 'n8n-nodes-base.iterable' as const,
	Jenkins: 'n8n-nodes-base.jenkins' as const,
	JinaAi: 'n8n-nodes-base.jinaAi' as const,
	Jira: 'n8n-nodes-base.jira' as const,
	JiraTrigger: 'n8n-nodes-base.jiraTrigger' as const,
	JotFormTrigger: 'n8n-nodes-base.jotFormTrigger' as const,
	Jwt: 'n8n-nodes-base.jwt' as const,
	Kafka: 'n8n-nodes-base.kafka' as const,
	KafkaTrigger: 'n8n-nodes-base.kafkaTrigger' as const,
	Keap: 'n8n-nodes-base.keap' as const,
	KeapTrigger: 'n8n-nodes-base.keapTrigger' as const,
	Kitemaker: 'n8n-nodes-base.kitemaker' as const,
	KoBoToolbox: 'n8n-nodes-base.koBoToolbox' as const,
	KoBoToolboxTrigger: 'n8n-nodes-base.koBoToolboxTrigger' as const,
	Ldap: 'n8n-nodes-base.ldap' as const,
	Lemlist_v2: 'n8n-nodes-base.lemlist' as const,
	Lemlist_v1: 'n8n-nodes-base.lemlist' as const,
	LemlistTrigger: 'n8n-nodes-base.lemlistTrigger' as const,
	Line: 'n8n-nodes-base.line' as const,
	Linear: 'n8n-nodes-base.linear' as const,
	LinearTrigger: 'n8n-nodes-base.linearTrigger' as const,
	LingvaNex: 'n8n-nodes-base.lingvaNex' as const,
	LinkedIn: 'n8n-nodes-base.linkedIn' as const,
	LocalFileTrigger: 'n8n-nodes-base.localFileTrigger' as const,
	LoneScaleTrigger: 'n8n-nodes-base.loneScaleTrigger' as const,
	LoneScale: 'n8n-nodes-base.loneScale' as const,
	Magento2: 'n8n-nodes-base.magento2' as const,
	Mailcheck: 'n8n-nodes-base.mailcheck' as const,
	Mailchimp: 'n8n-nodes-base.mailchimp' as const,
	MailchimpTrigger: 'n8n-nodes-base.mailchimpTrigger' as const,
	MailerLite_v2: 'n8n-nodes-base.mailerLite' as const,
	MailerLite_v1: 'n8n-nodes-base.mailerLite' as const,
	MailerLiteTrigger_v2: 'n8n-nodes-base.mailerLiteTrigger' as const,
	MailerLiteTrigger_v1: 'n8n-nodes-base.mailerLiteTrigger' as const,
	Mailgun: 'n8n-nodes-base.mailgun' as const,
	Mailjet: 'n8n-nodes-base.mailjet' as const,
	MailjetTrigger: 'n8n-nodes-base.mailjetTrigger' as const,
	Mandrill: 'n8n-nodes-base.mandrill' as const,
	ManualTrigger: 'n8n-nodes-base.manualTrigger' as const,
	Markdown: 'n8n-nodes-base.markdown' as const,
	Marketstack: 'n8n-nodes-base.marketstack' as const,
	Matrix: 'n8n-nodes-base.matrix' as const,
	Mattermost: 'n8n-nodes-base.mattermost' as const,
	Mautic: 'n8n-nodes-base.mautic' as const,
	MauticTrigger: 'n8n-nodes-base.mauticTrigger' as const,
	Medium: 'n8n-nodes-base.medium' as const,
	Merge_v3_2: 'n8n-nodes-base.merge' as const,
	Merge_v2_1: 'n8n-nodes-base.merge' as const,
	Merge_v1: 'n8n-nodes-base.merge' as const,
	MessageBird: 'n8n-nodes-base.messageBird' as const,
	Metabase: 'n8n-nodes-base.metabase' as const,
	AzureCosmosDb: 'n8n-nodes-base.azureCosmosDb' as const,
	MicrosoftDynamicsCrm: 'n8n-nodes-base.microsoftDynamicsCrm' as const,
	MicrosoftEntra: 'n8n-nodes-base.microsoftEntra' as const,
	MicrosoftExcel_v2_2: 'n8n-nodes-base.microsoftExcel' as const,
	MicrosoftExcel_v1: 'n8n-nodes-base.microsoftExcel' as const,
	MicrosoftGraphSecurity: 'n8n-nodes-base.microsoftGraphSecurity' as const,
	MicrosoftOneDrive: 'n8n-nodes-base.microsoftOneDrive' as const,
	MicrosoftOneDriveTrigger: 'n8n-nodes-base.microsoftOneDriveTrigger' as const,
	MicrosoftOutlook_v2: 'n8n-nodes-base.microsoftOutlook' as const,
	MicrosoftOutlook_v1: 'n8n-nodes-base.microsoftOutlook' as const,
	MicrosoftOutlookTrigger: 'n8n-nodes-base.microsoftOutlookTrigger' as const,
	MicrosoftSharePoint: 'n8n-nodes-base.microsoftSharePoint' as const,
	MicrosoftSql: 'n8n-nodes-base.microsoftSql' as const,
	AzureStorage: 'n8n-nodes-base.azureStorage' as const,
	MicrosoftTeams_v1_1: 'n8n-nodes-base.microsoftTeams' as const,
	MicrosoftTeams_v2: 'n8n-nodes-base.microsoftTeams' as const,
	MicrosoftTeamsTrigger: 'n8n-nodes-base.microsoftTeamsTrigger' as const,
	MicrosoftToDo: 'n8n-nodes-base.microsoftToDo' as const,
	Mindee: 'n8n-nodes-base.mindee' as const,
	Misp: 'n8n-nodes-base.misp' as const,
	MistralAi: 'n8n-nodes-base.mistralAi' as const,
	Mocean: 'n8n-nodes-base.mocean' as const,
	MondayCom: 'n8n-nodes-base.mondayCom' as const,
	MongoDb: 'n8n-nodes-base.mongoDb' as const,
	MonicaCrm: 'n8n-nodes-base.monicaCrm' as const,
	MoveBinaryData: 'n8n-nodes-base.moveBinaryData' as const,
	Mqtt: 'n8n-nodes-base.mqtt' as const,
	MqttTrigger: 'n8n-nodes-base.mqttTrigger' as const,
	Msg91: 'n8n-nodes-base.msg91' as const,
	MySql_v2_5: 'n8n-nodes-base.mySql' as const,
	MySql_v1: 'n8n-nodes-base.mySql' as const,
	N8n: 'n8n-nodes-base.n8n' as const,
	N8nTrainingCustomerDatastore: 'n8n-nodes-base.n8nTrainingCustomerDatastore' as const,
	N8nTrainingCustomerMessenger: 'n8n-nodes-base.n8nTrainingCustomerMessenger' as const,
	N8nTrigger: 'n8n-nodes-base.n8nTrigger' as const,
	Nasa: 'n8n-nodes-base.nasa' as const,
	Netlify: 'n8n-nodes-base.netlify' as const,
	NetlifyTrigger: 'n8n-nodes-base.netlifyTrigger' as const,
	NextCloud: 'n8n-nodes-base.nextCloud' as const,
	NocoDb: 'n8n-nodes-base.nocoDb' as const,
	SendInBlue: 'n8n-nodes-base.sendInBlue' as const,
	SendInBlueTrigger: 'n8n-nodes-base.sendInBlueTrigger' as const,
	StickyNote: 'n8n-nodes-base.stickyNote' as const,
	NoOp: 'n8n-nodes-base.noOp' as const,
	Onfleet: 'n8n-nodes-base.onfleet' as const,
	OnfleetTrigger: 'n8n-nodes-base.onfleetTrigger' as const,
	CitrixAdc: 'n8n-nodes-base.citrixAdc' as const,
	Notion_v2_2: 'n8n-nodes-base.notion' as const,
	Notion_v1: 'n8n-nodes-base.notion' as const,
	NotionTrigger: 'n8n-nodes-base.notionTrigger' as const,
	Npm: 'n8n-nodes-base.npm' as const,
	Odoo: 'n8n-nodes-base.odoo' as const,
	Okta: 'n8n-nodes-base.okta' as const,
	OneSimpleApi: 'n8n-nodes-base.oneSimpleApi' as const,
	OpenAi_v1_1: 'n8n-nodes-base.openAi' as const,
	OpenThesaurus: 'n8n-nodes-base.openThesaurus' as const,
	OpenWeatherMap: 'n8n-nodes-base.openWeatherMap' as const,
	OracleDatabase: 'n8n-nodes-base.oracleDatabase' as const,
	Orbit: 'n8n-nodes-base.orbit' as const,
	Oura: 'n8n-nodes-base.oura' as const,
	Paddle: 'n8n-nodes-base.paddle' as const,
	PagerDuty: 'n8n-nodes-base.pagerDuty' as const,
	PayPal: 'n8n-nodes-base.payPal' as const,
	PayPalTrigger: 'n8n-nodes-base.payPalTrigger' as const,
	Peekalink: 'n8n-nodes-base.peekalink' as const,
	Perplexity: 'n8n-nodes-base.perplexity' as const,
	Phantombuster: 'n8n-nodes-base.phantombuster' as const,
	PhilipsHue: 'n8n-nodes-base.philipsHue' as const,
	Pipedrive: 'n8n-nodes-base.pipedrive' as const,
	PipedriveTrigger: 'n8n-nodes-base.pipedriveTrigger' as const,
	Plivo: 'n8n-nodes-base.plivo' as const,
	PostBin: 'n8n-nodes-base.postBin' as const,
	Postgres_v2_6: 'n8n-nodes-base.postgres' as const,
	Postgres_v1: 'n8n-nodes-base.postgres' as const,
	PostgresTrigger: 'n8n-nodes-base.postgresTrigger' as const,
	PostHog: 'n8n-nodes-base.postHog' as const,
	PostmarkTrigger: 'n8n-nodes-base.postmarkTrigger' as const,
	ProfitWell: 'n8n-nodes-base.profitWell' as const,
	Pushbullet: 'n8n-nodes-base.pushbullet' as const,
	Pushcut: 'n8n-nodes-base.pushcut' as const,
	PushcutTrigger: 'n8n-nodes-base.pushcutTrigger' as const,
	Pushover: 'n8n-nodes-base.pushover' as const,
	QuestDb: 'n8n-nodes-base.questDb' as const,
	Quickbase: 'n8n-nodes-base.quickbase' as const,
	Quickbooks: 'n8n-nodes-base.quickbooks' as const,
	QuickChart: 'n8n-nodes-base.quickChart' as const,
	Rabbitmq: 'n8n-nodes-base.rabbitmq' as const,
	RabbitmqTrigger: 'n8n-nodes-base.rabbitmqTrigger' as const,
	Raindrop: 'n8n-nodes-base.raindrop' as const,
	ReadBinaryFile: 'n8n-nodes-base.readBinaryFile' as const,
	ReadBinaryFiles: 'n8n-nodes-base.readBinaryFiles' as const,
	ReadPDF: 'n8n-nodes-base.readPDF' as const,
	Reddit: 'n8n-nodes-base.reddit' as const,
	Redis: 'n8n-nodes-base.redis' as const,
	RedisTrigger: 'n8n-nodes-base.redisTrigger' as const,
	RenameKeys: 'n8n-nodes-base.renameKeys' as const,
	RespondToWebhook: 'n8n-nodes-base.respondToWebhook' as const,
	Rocketchat: 'n8n-nodes-base.rocketchat' as const,
	RssFeedRead: 'n8n-nodes-base.rssFeedRead' as const,
	RssFeedReadTrigger: 'n8n-nodes-base.rssFeedReadTrigger' as const,
	Rundeck: 'n8n-nodes-base.rundeck' as const,
	S3: 'n8n-nodes-base.s3' as const,
	Salesforce: 'n8n-nodes-base.salesforce' as const,
	SalesforceTrigger: 'n8n-nodes-base.salesforceTrigger' as const,
	Salesmate: 'n8n-nodes-base.salesmate' as const,
	ScheduleTrigger: 'n8n-nodes-base.scheduleTrigger' as const,
	SeaTable_v2: 'n8n-nodes-base.seaTable' as const,
	SeaTable_v1: 'n8n-nodes-base.seaTable' as const,
	SeaTableTrigger_v2: 'n8n-nodes-base.seaTableTrigger' as const,
	SeaTableTrigger_v1: 'n8n-nodes-base.seaTableTrigger' as const,
	SecurityScorecard: 'n8n-nodes-base.securityScorecard' as const,
	Segment: 'n8n-nodes-base.segment' as const,
	SendGrid: 'n8n-nodes-base.sendGrid' as const,
	Sendy: 'n8n-nodes-base.sendy' as const,
	SentryIo: 'n8n-nodes-base.sentryIo' as const,
	ServiceNow: 'n8n-nodes-base.serviceNow' as const,
	Set_v3_4: 'n8n-nodes-base.set' as const,
	Set_v2: 'n8n-nodes-base.set' as const,
	Shopify: 'n8n-nodes-base.shopify' as const,
	ShopifyTrigger: 'n8n-nodes-base.shopifyTrigger' as const,
	Signl4: 'n8n-nodes-base.signl4' as const,
	Simulate: 'n8n-nodes-base.simulate' as const,
	SimulateTrigger: 'n8n-nodes-base.simulateTrigger' as const,
	Slack_v2_3: 'n8n-nodes-base.slack' as const,
	Slack_v1: 'n8n-nodes-base.slack' as const,
	SlackTrigger: 'n8n-nodes-base.slackTrigger' as const,
	Sms77: 'n8n-nodes-base.sms77' as const,
	Snowflake: 'n8n-nodes-base.snowflake' as const,
	SplitInBatches_v3: 'n8n-nodes-base.splitInBatches' as const,
	SplitInBatches_v2: 'n8n-nodes-base.splitInBatches' as const,
	SplitInBatches_v1: 'n8n-nodes-base.splitInBatches' as const,
	Splunk_v2: 'n8n-nodes-base.splunk' as const,
	Splunk_v1: 'n8n-nodes-base.splunk' as const,
	Spontit: 'n8n-nodes-base.spontit' as const,
	Spotify: 'n8n-nodes-base.spotify' as const,
	SpreadsheetFile_v2: 'n8n-nodes-base.spreadsheetFile' as const,
	SpreadsheetFile_v1: 'n8n-nodes-base.spreadsheetFile' as const,
	SseTrigger: 'n8n-nodes-base.sseTrigger' as const,
	Ssh: 'n8n-nodes-base.ssh' as const,
	Stackby: 'n8n-nodes-base.stackby' as const,
	Start: 'n8n-nodes-base.start' as const,
	StopAndError: 'n8n-nodes-base.stopAndError' as const,
	Storyblok: 'n8n-nodes-base.storyblok' as const,
	Strapi: 'n8n-nodes-base.strapi' as const,
	Strava: 'n8n-nodes-base.strava' as const,
	StravaTrigger: 'n8n-nodes-base.stravaTrigger' as const,
	Stripe: 'n8n-nodes-base.stripe' as const,
	StripeTrigger: 'n8n-nodes-base.stripeTrigger' as const,
	Supabase: 'n8n-nodes-base.supabase' as const,
	SurveyMonkeyTrigger: 'n8n-nodes-base.surveyMonkeyTrigger' as const,
	Switch_v3_3: 'n8n-nodes-base.switch' as const,
	Switch_v2: 'n8n-nodes-base.switch' as const,
	Switch_v1: 'n8n-nodes-base.switch' as const,
	SyncroMsp: 'n8n-nodes-base.syncroMsp' as const,
	Taiga: 'n8n-nodes-base.taiga' as const,
	TaigaTrigger: 'n8n-nodes-base.taigaTrigger' as const,
	Tapfiliate: 'n8n-nodes-base.tapfiliate' as const,
	Telegram: 'n8n-nodes-base.telegram' as const,
	TelegramTrigger: 'n8n-nodes-base.telegramTrigger' as const,
	TheHiveProject: 'n8n-nodes-base.theHiveProject' as const,
	TheHiveProjectTrigger: 'n8n-nodes-base.theHiveProjectTrigger' as const,
	TheHive: 'n8n-nodes-base.theHive' as const,
	TheHiveTrigger: 'n8n-nodes-base.theHiveTrigger' as const,
	TimescaleDb: 'n8n-nodes-base.timescaleDb' as const,
	Todoist_v2_1: 'n8n-nodes-base.todoist' as const,
	Todoist_v1: 'n8n-nodes-base.todoist' as const,
	TogglTrigger: 'n8n-nodes-base.togglTrigger' as const,
	Totp: 'n8n-nodes-base.totp' as const,
	TravisCi: 'n8n-nodes-base.travisCi' as const,
	Trello: 'n8n-nodes-base.trello' as const,
	TrelloTrigger: 'n8n-nodes-base.trelloTrigger' as const,
	Twake: 'n8n-nodes-base.twake' as const,
	Twilio: 'n8n-nodes-base.twilio' as const,
	TwilioTrigger: 'n8n-nodes-base.twilioTrigger' as const,
	Twist: 'n8n-nodes-base.twist' as const,
	Twitter_v2: 'n8n-nodes-base.twitter' as const,
	Twitter_v1: 'n8n-nodes-base.twitter' as const,
	TypeformTrigger: 'n8n-nodes-base.typeformTrigger' as const,
	UnleashedSoftware: 'n8n-nodes-base.unleashedSoftware' as const,
	Uplead: 'n8n-nodes-base.uplead' as const,
	Uproc: 'n8n-nodes-base.uproc' as const,
	UptimeRobot: 'n8n-nodes-base.uptimeRobot' as const,
	UrlScanIo: 'n8n-nodes-base.urlScanIo' as const,
	Vero: 'n8n-nodes-base.vero' as const,
	VenafiTlsProtectCloud: 'n8n-nodes-base.venafiTlsProtectCloud' as const,
	VenafiTlsProtectCloudTrigger: 'n8n-nodes-base.venafiTlsProtectCloudTrigger' as const,
	VenafiTlsProtectDatacenter: 'n8n-nodes-base.venafiTlsProtectDatacenter' as const,
	Vonage: 'n8n-nodes-base.vonage' as const,
	Wait: 'n8n-nodes-base.wait' as const,
	Webflow_v2: 'n8n-nodes-base.webflow' as const,
	Webflow_v1: 'n8n-nodes-base.webflow' as const,
	WebflowTrigger_v2: 'n8n-nodes-base.webflowTrigger' as const,
	WebflowTrigger_v1: 'n8n-nodes-base.webflowTrigger' as const,
	Webhook: 'n8n-nodes-base.webhook' as const,
	Wekan: 'n8n-nodes-base.wekan' as const,
	WhatsAppTrigger: 'n8n-nodes-base.whatsAppTrigger' as const,
	WhatsApp: 'n8n-nodes-base.whatsApp' as const,
	Wise: 'n8n-nodes-base.wise' as const,
	WiseTrigger: 'n8n-nodes-base.wiseTrigger' as const,
	WooCommerce: 'n8n-nodes-base.wooCommerce' as const,
	WooCommerceTrigger: 'n8n-nodes-base.wooCommerceTrigger' as const,
	Wordpress: 'n8n-nodes-base.wordpress' as const,
	WorkableTrigger: 'n8n-nodes-base.workableTrigger' as const,
	WorkflowTrigger: 'n8n-nodes-base.workflowTrigger' as const,
	WriteBinaryFile: 'n8n-nodes-base.writeBinaryFile' as const,
	WufooTrigger: 'n8n-nodes-base.wufooTrigger' as const,
	Xero: 'n8n-nodes-base.xero' as const,
	Xml: 'n8n-nodes-base.xml' as const,
	Yourls: 'n8n-nodes-base.yourls' as const,
	Zammad: 'n8n-nodes-base.zammad' as const,
	Zendesk: 'n8n-nodes-base.zendesk' as const,
	ZendeskTrigger: 'n8n-nodes-base.zendeskTrigger' as const,
	ZohoCrm: 'n8n-nodes-base.zohoCrm' as const,
	Zoom: 'n8n-nodes-base.zoom' as const,
	Zulip: 'n8n-nodes-base.zulip' as const,
	Aggregate: 'n8n-nodes-base.aggregate' as const,
	Limit: 'n8n-nodes-base.limit' as const,
	RemoveDuplicates_v1_1: 'n8n-nodes-base.removeDuplicates' as const,
	RemoveDuplicates_v2: 'n8n-nodes-base.removeDuplicates' as const,
	SplitOut: 'n8n-nodes-base.splitOut' as const,
	Sort: 'n8n-nodes-base.sort' as const,
	Summarize: 'n8n-nodes-base.summarize' as const,
	Anthropic: '@n8n/n8n-nodes-langchain.anthropic' as const,
	GoogleGemini: '@n8n/n8n-nodes-langchain.googleGemini' as const,
	Ollama: '@n8n/n8n-nodes-langchain.ollama' as const,
	OpenAi_v1_8: '@n8n/n8n-nodes-langchain.openAi' as const,
	OpenAi_v2: '@n8n/n8n-nodes-langchain.openAi' as const,
	Agent_v2_2: '@n8n/n8n-nodes-langchain.agent' as const,
	Agent_v1_9: '@n8n/n8n-nodes-langchain.agent' as const,
	Agent_v3: '@n8n/n8n-nodes-langchain.agent' as const,
	AgentTool: '@n8n/n8n-nodes-langchain.agentTool' as const,
	OpenAiAssistant: '@n8n/n8n-nodes-langchain.openAiAssistant' as const,
	ChainSummarization_v2_1: '@n8n/n8n-nodes-langchain.chainSummarization' as const,
	ChainSummarization_v1: '@n8n/n8n-nodes-langchain.chainSummarization' as const,
	ChainLlm: '@n8n/n8n-nodes-langchain.chainLlm' as const,
	ChainRetrievalQa: '@n8n/n8n-nodes-langchain.chainRetrievalQa' as const,
	SentimentAnalysis: '@n8n/n8n-nodes-langchain.sentimentAnalysis' as const,
	InformationExtractor: '@n8n/n8n-nodes-langchain.informationExtractor' as const,
	TextClassifier: '@n8n/n8n-nodes-langchain.textClassifier' as const,
	Code_v1: '@n8n/n8n-nodes-langchain.code' as const,
	DocumentDefaultDataLoader: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader' as const,
	DocumentBinaryInputLoader: '@n8n/n8n-nodes-langchain.documentBinaryInputLoader' as const,
	DocumentGithubLoader: '@n8n/n8n-nodes-langchain.documentGithubLoader' as const,
	DocumentJsonInputLoader: '@n8n/n8n-nodes-langchain.documentJsonInputLoader' as const,
	EmbeddingsCohere: '@n8n/n8n-nodes-langchain.embeddingsCohere' as const,
	EmbeddingsAwsBedrock: '@n8n/n8n-nodes-langchain.embeddingsAwsBedrock' as const,
	EmbeddingsAzureOpenAi: '@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi' as const,
	EmbeddingsGoogleGemini: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini' as const,
	EmbeddingsGoogleVertex: '@n8n/n8n-nodes-langchain.embeddingsGoogleVertex' as const,
	EmbeddingsHuggingFaceInference:
		'@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference' as const,
	EmbeddingsMistralCloud: '@n8n/n8n-nodes-langchain.embeddingsMistralCloud' as const,
	EmbeddingsOpenAi: '@n8n/n8n-nodes-langchain.embeddingsOpenAi' as const,
	EmbeddingsLemonade: '@n8n/n8n-nodes-langchain.embeddingsLemonade' as const,
	EmbeddingsOllama: '@n8n/n8n-nodes-langchain.embeddingsOllama' as const,
	LmChatAnthropic: '@n8n/n8n-nodes-langchain.lmChatAnthropic' as const,
	LmChatAzureOpenAi: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi' as const,
	LmChatAwsBedrock: '@n8n/n8n-nodes-langchain.lmChatAwsBedrock' as const,
	LmChatCohere: '@n8n/n8n-nodes-langchain.lmChatCohere' as const,
	LmChatDeepSeek: '@n8n/n8n-nodes-langchain.lmChatDeepSeek' as const,
	LmChatGoogleGemini: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' as const,
	LmChatGoogleVertex: '@n8n/n8n-nodes-langchain.lmChatGoogleVertex' as const,
	LmChatGroq: '@n8n/n8n-nodes-langchain.lmChatGroq' as const,
	LmChatMistralCloud: '@n8n/n8n-nodes-langchain.lmChatMistralCloud' as const,
	LmChatLemonade: '@n8n/n8n-nodes-langchain.lmChatLemonade' as const,
	LmChatOllama: '@n8n/n8n-nodes-langchain.lmChatOllama' as const,
	LmChatOpenRouter: '@n8n/n8n-nodes-langchain.lmChatOpenRouter' as const,
	LmChatVercelAiGateway: '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway' as const,
	LmChatXAiGrok: '@n8n/n8n-nodes-langchain.lmChatXAiGrok' as const,
	LmChatOpenAi: '@n8n/n8n-nodes-langchain.lmChatOpenAi' as const,
	LmOpenAi: '@n8n/n8n-nodes-langchain.lmOpenAi' as const,
	LmCohere: '@n8n/n8n-nodes-langchain.lmCohere' as const,
	LmLemonade: '@n8n/n8n-nodes-langchain.lmLemonade' as const,
	LmOllama: '@n8n/n8n-nodes-langchain.lmOllama' as const,
	LmOpenHuggingFaceInference: '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference' as const,
	McpClientTool: '@n8n/n8n-nodes-langchain.mcpClientTool' as const,
	McpTrigger: '@n8n/n8n-nodes-langchain.mcpTrigger' as const,
	MemoryBufferWindow: '@n8n/n8n-nodes-langchain.memoryBufferWindow' as const,
	MemoryMotorhead: '@n8n/n8n-nodes-langchain.memoryMotorhead' as const,
	MemoryPostgresChat: '@n8n/n8n-nodes-langchain.memoryPostgresChat' as const,
	MemoryMongoDbChat: '@n8n/n8n-nodes-langchain.memoryMongoDbChat' as const,
	MemoryRedisChat: '@n8n/n8n-nodes-langchain.memoryRedisChat' as const,
	MemoryManager: '@n8n/n8n-nodes-langchain.memoryManager' as const,
	MemoryChatRetriever: '@n8n/n8n-nodes-langchain.memoryChatRetriever' as const,
	MemoryXata: '@n8n/n8n-nodes-langchain.memoryXata' as const,
	MemoryZep: '@n8n/n8n-nodes-langchain.memoryZep' as const,
	OutputParserAutofixing: '@n8n/n8n-nodes-langchain.outputParserAutofixing' as const,
	OutputParserItemList: '@n8n/n8n-nodes-langchain.outputParserItemList' as const,
	OutputParserStructured: '@n8n/n8n-nodes-langchain.outputParserStructured' as const,
	RerankerCohere: '@n8n/n8n-nodes-langchain.rerankerCohere' as const,
	RetrieverContextualCompression:
		'@n8n/n8n-nodes-langchain.retrieverContextualCompression' as const,
	RetrieverVectorStore: '@n8n/n8n-nodes-langchain.retrieverVectorStore' as const,
	RetrieverMultiQuery: '@n8n/n8n-nodes-langchain.retrieverMultiQuery' as const,
	RetrieverWorkflow: '@n8n/n8n-nodes-langchain.retrieverWorkflow' as const,
	TextSplitterCharacterTextSplitter:
		'@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter' as const,
	TextSplitterRecursiveCharacterTextSplitter:
		'@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter' as const,
	TextSplitterTokenSplitter: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter' as const,
	ToolCalculator: '@n8n/n8n-nodes-langchain.toolCalculator' as const,
	ToolCode: '@n8n/n8n-nodes-langchain.toolCode' as const,
	ToolHttpRequest: '@n8n/n8n-nodes-langchain.toolHttpRequest' as const,
	ToolSearXng: '@n8n/n8n-nodes-langchain.toolSearXng' as const,
	ToolSerpApi: '@n8n/n8n-nodes-langchain.toolSerpApi' as const,
	ToolThink: '@n8n/n8n-nodes-langchain.toolThink' as const,
	ToolVectorStore: '@n8n/n8n-nodes-langchain.toolVectorStore' as const,
	ToolWikipedia: '@n8n/n8n-nodes-langchain.toolWikipedia' as const,
	ToolWolframAlpha: '@n8n/n8n-nodes-langchain.toolWolframAlpha' as const,
	ToolWorkflow_v2_2: '@n8n/n8n-nodes-langchain.toolWorkflow' as const,
	ToolWorkflow_v1_3: '@n8n/n8n-nodes-langchain.toolWorkflow' as const,
	ManualChatTrigger: '@n8n/n8n-nodes-langchain.manualChatTrigger' as const,
	ChatTrigger: '@n8n/n8n-nodes-langchain.chatTrigger' as const,
	Chat: '@n8n/n8n-nodes-langchain.chat' as const,
	VectorStoreInMemory: '@n8n/n8n-nodes-langchain.vectorStoreInMemory' as const,
	VectorStoreInMemoryInsert: '@n8n/n8n-nodes-langchain.vectorStoreInMemoryInsert' as const,
	VectorStoreInMemoryLoad: '@n8n/n8n-nodes-langchain.vectorStoreInMemoryLoad' as const,
	VectorStoreMilvus: '@n8n/n8n-nodes-langchain.vectorStoreMilvus' as const,
	VectorStoreMongoDBAtlas: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas' as const,
	VectorStorePGVector: '@n8n/n8n-nodes-langchain.vectorStorePGVector' as const,
	VectorStorePinecone: '@n8n/n8n-nodes-langchain.vectorStorePinecone' as const,
	VectorStorePineconeInsert: '@n8n/n8n-nodes-langchain.vectorStorePineconeInsert' as const,
	VectorStorePineconeLoad: '@n8n/n8n-nodes-langchain.vectorStorePineconeLoad' as const,
	VectorStoreRedis: '@n8n/n8n-nodes-langchain.vectorStoreRedis' as const,
	VectorStoreQdrant: '@n8n/n8n-nodes-langchain.vectorStoreQdrant' as const,
	VectorStoreSupabase: '@n8n/n8n-nodes-langchain.vectorStoreSupabase' as const,
	VectorStoreSupabaseInsert: '@n8n/n8n-nodes-langchain.vectorStoreSupabaseInsert' as const,
	VectorStoreSupabaseLoad: '@n8n/n8n-nodes-langchain.vectorStoreSupabaseLoad' as const,
	VectorStoreWeaviate: '@n8n/n8n-nodes-langchain.vectorStoreWeaviate' as const,
	VectorStoreZep: '@n8n/n8n-nodes-langchain.vectorStoreZep' as const,
	VectorStoreZepInsert: '@n8n/n8n-nodes-langchain.vectorStoreZepInsert' as const,
	VectorStoreZepLoad: '@n8n/n8n-nodes-langchain.vectorStoreZepLoad' as const,
	ToolExecutor: '@n8n/n8n-nodes-langchain.toolExecutor' as const,
	ModelSelector: '@n8n/n8n-nodes-langchain.modelSelector' as const,
	ActionNetworkTool: 'n8n-nodes-base.actionNetworkTool' as const,
	ActiveCampaignTool: 'n8n-nodes-base.activeCampaignTool' as const,
	AdaloTool: 'n8n-nodes-base.adaloTool' as const,
	AffinityTool: 'n8n-nodes-base.affinityTool' as const,
	AgileCrmTool: 'n8n-nodes-base.agileCrmTool' as const,
	AirtableTool: 'n8n-nodes-base.airtableTool' as const,
	AirtopTool: 'n8n-nodes-base.airtopTool' as const,
	AmqpTool: 'n8n-nodes-base.amqpTool' as const,
	ApiTemplateIoTool: 'n8n-nodes-base.apiTemplateIoTool' as const,
	AsanaTool: 'n8n-nodes-base.asanaTool' as const,
	AutopilotTool: 'n8n-nodes-base.autopilotTool' as const,
	AwsLambdaTool: 'n8n-nodes-base.awsLambdaTool' as const,
	AwsSnsTool: 'n8n-nodes-base.awsSnsTool' as const,
	AwsS3Tool: 'n8n-nodes-base.awsS3Tool' as const,
	AwsSesTool: 'n8n-nodes-base.awsSesTool' as const,
	AwsTextractTool: 'n8n-nodes-base.awsTextractTool' as const,
	AwsTranscribeTool: 'n8n-nodes-base.awsTranscribeTool' as const,
	BambooHrTool: 'n8n-nodes-base.bambooHrTool' as const,
	BaserowTool: 'n8n-nodes-base.baserowTool' as const,
	BeeminderTool: 'n8n-nodes-base.beeminderTool' as const,
	BitlyTool: 'n8n-nodes-base.bitlyTool' as const,
	BitwardenTool: 'n8n-nodes-base.bitwardenTool' as const,
	BrandfetchTool: 'n8n-nodes-base.BrandfetchTool' as const,
	BubbleTool: 'n8n-nodes-base.bubbleTool' as const,
	ChargebeeTool: 'n8n-nodes-base.chargebeeTool' as const,
	CircleCiTool: 'n8n-nodes-base.circleCiTool' as const,
	CiscoWebexTool: 'n8n-nodes-base.ciscoWebexTool' as const,
	CloudflareTool: 'n8n-nodes-base.cloudflareTool' as const,
	ClearbitTool: 'n8n-nodes-base.clearbitTool' as const,
	ClickUpTool: 'n8n-nodes-base.clickUpTool' as const,
	ClockifyTool: 'n8n-nodes-base.clockifyTool' as const,
	CockpitTool: 'n8n-nodes-base.cockpitTool' as const,
	CodaTool: 'n8n-nodes-base.codaTool' as const,
	CoinGeckoTool: 'n8n-nodes-base.coinGeckoTool' as const,
	CompressionTool: 'n8n-nodes-base.compressionTool' as const,
	ContentfulTool: 'n8n-nodes-base.contentfulTool' as const,
	ConvertKitTool: 'n8n-nodes-base.convertKitTool' as const,
	CopperTool: 'n8n-nodes-base.copperTool' as const,
	CrateDbTool: 'n8n-nodes-base.crateDbTool' as const,
	CrowdDevTool: 'n8n-nodes-base.crowdDevTool' as const,
	CryptoTool: 'n8n-nodes-base.cryptoTool' as const,
	CustomerIoTool: 'n8n-nodes-base.customerIoTool' as const,
	DataTableTool: 'n8n-nodes-base.dataTableTool' as const,
	DateTimeTool: 'n8n-nodes-base.dateTimeTool' as const,
	DeepLTool: 'n8n-nodes-base.deepLTool' as const,
	DemioTool: 'n8n-nodes-base.demioTool' as const,
	DhlTool: 'n8n-nodes-base.dhlTool' as const,
	DiscordTool: 'n8n-nodes-base.discordTool' as const,
	DiscourseTool: 'n8n-nodes-base.discourseTool' as const,
	DriftTool: 'n8n-nodes-base.driftTool' as const,
	DropboxTool: 'n8n-nodes-base.dropboxTool' as const,
	DropcontactTool: 'n8n-nodes-base.dropcontactTool' as const,
	EgoiTool: 'n8n-nodes-base.egoiTool' as const,
	ElasticsearchTool: 'n8n-nodes-base.elasticsearchTool' as const,
	ElasticSecurityTool: 'n8n-nodes-base.elasticSecurityTool' as const,
	EmailReadImapTool: 'n8n-nodes-base.emailReadImapTool' as const,
	EmailSendTool: 'n8n-nodes-base.emailSendTool' as const,
	EmeliaTool: 'n8n-nodes-base.emeliaTool' as const,
	ErpNextTool: 'n8n-nodes-base.erpNextTool' as const,
	ExecuteCommandTool: 'n8n-nodes-base.executeCommandTool' as const,
	FacebookGraphApiTool: 'n8n-nodes-base.facebookGraphApiTool' as const,
	FilemakerTool: 'n8n-nodes-base.filemakerTool' as const,
	FreshdeskTool: 'n8n-nodes-base.freshdeskTool' as const,
	FreshserviceTool: 'n8n-nodes-base.freshserviceTool' as const,
	FreshworksCrmTool: 'n8n-nodes-base.freshworksCrmTool' as const,
	GetResponseTool: 'n8n-nodes-base.getResponseTool' as const,
	GhostTool: 'n8n-nodes-base.ghostTool' as const,
	GitTool: 'n8n-nodes-base.gitTool' as const,
	GithubTool: 'n8n-nodes-base.githubTool' as const,
	GitlabTool: 'n8n-nodes-base.gitlabTool' as const,
	GongTool: 'n8n-nodes-base.gongTool' as const,
	GoogleAdsTool: 'n8n-nodes-base.googleAdsTool' as const,
	GoogleAnalyticsTool: 'n8n-nodes-base.googleAnalyticsTool' as const,
	GoogleBigQueryTool: 'n8n-nodes-base.googleBigQueryTool' as const,
	GoogleBooksTool: 'n8n-nodes-base.googleBooksTool' as const,
	GoogleCalendarTool: 'n8n-nodes-base.googleCalendarTool' as const,
	GoogleChatTool: 'n8n-nodes-base.googleChatTool' as const,
	GoogleCloudNaturalLanguageTool: 'n8n-nodes-base.googleCloudNaturalLanguageTool' as const,
	GoogleCloudStorageTool: 'n8n-nodes-base.googleCloudStorageTool' as const,
	GoogleContactsTool: 'n8n-nodes-base.googleContactsTool' as const,
	GoogleDocsTool: 'n8n-nodes-base.googleDocsTool' as const,
	GoogleDriveTool: 'n8n-nodes-base.googleDriveTool' as const,
	GoogleFirebaseCloudFirestoreTool: 'n8n-nodes-base.googleFirebaseCloudFirestoreTool' as const,
	GoogleFirebaseRealtimeDatabaseTool: 'n8n-nodes-base.googleFirebaseRealtimeDatabaseTool' as const,
	GmailTool: 'n8n-nodes-base.gmailTool' as const,
	GSuiteAdminTool: 'n8n-nodes-base.gSuiteAdminTool' as const,
	GoogleBusinessProfileTool: 'n8n-nodes-base.googleBusinessProfileTool' as const,
	GooglePerspectiveTool: 'n8n-nodes-base.googlePerspectiveTool' as const,
	GoogleSheetsTool: 'n8n-nodes-base.googleSheetsTool' as const,
	GoogleSlidesTool: 'n8n-nodes-base.googleSlidesTool' as const,
	GoogleTasksTool: 'n8n-nodes-base.googleTasksTool' as const,
	GoogleTranslateTool: 'n8n-nodes-base.googleTranslateTool' as const,
	YouTubeTool: 'n8n-nodes-base.youTubeTool' as const,
	GotifyTool: 'n8n-nodes-base.gotifyTool' as const,
	GoToWebinarTool: 'n8n-nodes-base.goToWebinarTool' as const,
	GrafanaTool: 'n8n-nodes-base.grafanaTool' as const,
	GraphqlTool: 'n8n-nodes-base.graphqlTool' as const,
	GristTool: 'n8n-nodes-base.gristTool' as const,
	HackerNewsTool: 'n8n-nodes-base.hackerNewsTool' as const,
	HaloPSATool: 'n8n-nodes-base.haloPSATool' as const,
	HarvestTool: 'n8n-nodes-base.harvestTool' as const,
	HelpScoutTool: 'n8n-nodes-base.helpScoutTool' as const,
	HighLevelTool: 'n8n-nodes-base.highLevelTool' as const,
	HomeAssistantTool: 'n8n-nodes-base.homeAssistantTool' as const,
	HttpRequestTool: 'n8n-nodes-base.httpRequestTool' as const,
	HubspotTool: 'n8n-nodes-base.hubspotTool' as const,
	HumanticAiTool: 'n8n-nodes-base.humanticAiTool' as const,
	HunterTool: 'n8n-nodes-base.hunterTool' as const,
	IntercomTool: 'n8n-nodes-base.intercomTool' as const,
	InvoiceNinjaTool: 'n8n-nodes-base.invoiceNinjaTool' as const,
	IterableTool: 'n8n-nodes-base.iterableTool' as const,
	JenkinsTool: 'n8n-nodes-base.jenkinsTool' as const,
	JinaAiTool: 'n8n-nodes-base.jinaAiTool' as const,
	JiraTool: 'n8n-nodes-base.jiraTool' as const,
	JwtTool: 'n8n-nodes-base.jwtTool' as const,
	KafkaTool: 'n8n-nodes-base.kafkaTool' as const,
	KeapTool: 'n8n-nodes-base.keapTool' as const,
	KitemakerTool: 'n8n-nodes-base.kitemakerTool' as const,
	KoBoToolboxTool: 'n8n-nodes-base.koBoToolboxTool' as const,
	LdapTool: 'n8n-nodes-base.ldapTool' as const,
	LemlistTool: 'n8n-nodes-base.lemlistTool' as const,
	LineTool: 'n8n-nodes-base.lineTool' as const,
	LinearTool: 'n8n-nodes-base.linearTool' as const,
	LingvaNexTool: 'n8n-nodes-base.lingvaNexTool' as const,
	LinkedInTool: 'n8n-nodes-base.linkedInTool' as const,
	LoneScaleTool: 'n8n-nodes-base.loneScaleTool' as const,
	Magento2Tool: 'n8n-nodes-base.magento2Tool' as const,
	MailcheckTool: 'n8n-nodes-base.mailcheckTool' as const,
	MailchimpTool: 'n8n-nodes-base.mailchimpTool' as const,
	MailerLiteTool: 'n8n-nodes-base.mailerLiteTool' as const,
	MailgunTool: 'n8n-nodes-base.mailgunTool' as const,
	MailjetTool: 'n8n-nodes-base.mailjetTool' as const,
	MandrillTool: 'n8n-nodes-base.mandrillTool' as const,
	MarketstackTool: 'n8n-nodes-base.marketstackTool' as const,
	MatrixTool: 'n8n-nodes-base.matrixTool' as const,
	MattermostTool: 'n8n-nodes-base.mattermostTool' as const,
	MauticTool: 'n8n-nodes-base.mauticTool' as const,
	MediumTool: 'n8n-nodes-base.mediumTool' as const,
	MessageBirdTool: 'n8n-nodes-base.messageBirdTool' as const,
	MetabaseTool: 'n8n-nodes-base.metabaseTool' as const,
	MicrosoftDynamicsCrmTool: 'n8n-nodes-base.microsoftDynamicsCrmTool' as const,
	MicrosoftEntraTool: 'n8n-nodes-base.microsoftEntraTool' as const,
	MicrosoftExcelTool: 'n8n-nodes-base.microsoftExcelTool' as const,
	MicrosoftGraphSecurityTool: 'n8n-nodes-base.microsoftGraphSecurityTool' as const,
	MicrosoftOneDriveTool: 'n8n-nodes-base.microsoftOneDriveTool' as const,
	MicrosoftOutlookTool: 'n8n-nodes-base.microsoftOutlookTool' as const,
	MicrosoftSharePointTool: 'n8n-nodes-base.microsoftSharePointTool' as const,
	MicrosoftSqlTool: 'n8n-nodes-base.microsoftSqlTool' as const,
	MicrosoftTeamsTool: 'n8n-nodes-base.microsoftTeamsTool' as const,
	MicrosoftToDoTool: 'n8n-nodes-base.microsoftToDoTool' as const,
	MispTool: 'n8n-nodes-base.mispTool' as const,
	MistralAiTool: 'n8n-nodes-base.mistralAiTool' as const,
	MoceanTool: 'n8n-nodes-base.moceanTool' as const,
	MondayComTool: 'n8n-nodes-base.mondayComTool' as const,
	MongoDbTool: 'n8n-nodes-base.mongoDbTool' as const,
	MonicaCrmTool: 'n8n-nodes-base.monicaCrmTool' as const,
	MqttTool: 'n8n-nodes-base.mqttTool' as const,
	Msg91Tool: 'n8n-nodes-base.msg91Tool' as const,
	MySqlTool: 'n8n-nodes-base.mySqlTool' as const,
	NasaTool: 'n8n-nodes-base.nasaTool' as const,
	NetlifyTool: 'n8n-nodes-base.netlifyTool' as const,
	NextCloudTool: 'n8n-nodes-base.nextCloudTool' as const,
	NocoDbTool: 'n8n-nodes-base.nocoDbTool' as const,
	SendInBlueTool: 'n8n-nodes-base.sendInBlueTool' as const,
	OnfleetTool: 'n8n-nodes-base.onfleetTool' as const,
	NotionTool: 'n8n-nodes-base.notionTool' as const,
	NpmTool: 'n8n-nodes-base.npmTool' as const,
	OdooTool: 'n8n-nodes-base.odooTool' as const,
	OktaTool: 'n8n-nodes-base.oktaTool' as const,
	OneSimpleApiTool: 'n8n-nodes-base.oneSimpleApiTool' as const,
	OpenThesaurusTool: 'n8n-nodes-base.openThesaurusTool' as const,
	OpenWeatherMapTool: 'n8n-nodes-base.openWeatherMapTool' as const,
	OracleDatabaseTool: 'n8n-nodes-base.oracleDatabaseTool' as const,
	OuraTool: 'n8n-nodes-base.ouraTool' as const,
	PaddleTool: 'n8n-nodes-base.paddleTool' as const,
	PagerDutyTool: 'n8n-nodes-base.pagerDutyTool' as const,
	PeekalinkTool: 'n8n-nodes-base.peekalinkTool' as const,
	PerplexityTool: 'n8n-nodes-base.perplexityTool' as const,
	PhantombusterTool: 'n8n-nodes-base.phantombusterTool' as const,
	PhilipsHueTool: 'n8n-nodes-base.philipsHueTool' as const,
	PipedriveTool: 'n8n-nodes-base.pipedriveTool' as const,
	PlivoTool: 'n8n-nodes-base.plivoTool' as const,
	PostBinTool: 'n8n-nodes-base.postBinTool' as const,
	PostgresTool: 'n8n-nodes-base.postgresTool' as const,
	PostHogTool: 'n8n-nodes-base.postHogTool' as const,
	ProfitWellTool: 'n8n-nodes-base.profitWellTool' as const,
	PushbulletTool: 'n8n-nodes-base.pushbulletTool' as const,
	PushcutTool: 'n8n-nodes-base.pushcutTool' as const,
	PushoverTool: 'n8n-nodes-base.pushoverTool' as const,
	QuestDbTool: 'n8n-nodes-base.questDbTool' as const,
	QuickbaseTool: 'n8n-nodes-base.quickbaseTool' as const,
	QuickbooksTool: 'n8n-nodes-base.quickbooksTool' as const,
	QuickChartTool: 'n8n-nodes-base.quickChartTool' as const,
	RabbitmqTool: 'n8n-nodes-base.rabbitmqTool' as const,
	RaindropTool: 'n8n-nodes-base.raindropTool' as const,
	RedditTool: 'n8n-nodes-base.redditTool' as const,
	RedisTool: 'n8n-nodes-base.redisTool' as const,
	RocketchatTool: 'n8n-nodes-base.rocketchatTool' as const,
	RssFeedReadTool: 'n8n-nodes-base.rssFeedReadTool' as const,
	RundeckTool: 'n8n-nodes-base.rundeckTool' as const,
	S3Tool: 'n8n-nodes-base.s3Tool' as const,
	SalesforceTool: 'n8n-nodes-base.salesforceTool' as const,
	SalesmateTool: 'n8n-nodes-base.salesmateTool' as const,
	SeaTableTool_v2: 'n8n-nodes-base.seaTableTool' as const,
	SeaTableTool_v1: 'n8n-nodes-base.seaTableTool' as const,
	SecurityScorecardTool: 'n8n-nodes-base.securityScorecardTool' as const,
	SegmentTool: 'n8n-nodes-base.segmentTool' as const,
	SendGridTool: 'n8n-nodes-base.sendGridTool' as const,
	SendyTool: 'n8n-nodes-base.sendyTool' as const,
	SentryIoTool: 'n8n-nodes-base.sentryIoTool' as const,
	ServiceNowTool: 'n8n-nodes-base.serviceNowTool' as const,
	ShopifyTool: 'n8n-nodes-base.shopifyTool' as const,
	Signl4Tool: 'n8n-nodes-base.signl4Tool' as const,
	SlackTool: 'n8n-nodes-base.slackTool' as const,
	Sms77Tool: 'n8n-nodes-base.sms77Tool' as const,
	SnowflakeTool: 'n8n-nodes-base.snowflakeTool' as const,
	SplunkTool: 'n8n-nodes-base.splunkTool' as const,
	SpontitTool: 'n8n-nodes-base.spontitTool' as const,
	SpotifyTool: 'n8n-nodes-base.spotifyTool' as const,
	StackbyTool: 'n8n-nodes-base.stackbyTool' as const,
	StoryblokTool: 'n8n-nodes-base.storyblokTool' as const,
	StrapiTool: 'n8n-nodes-base.strapiTool' as const,
	StravaTool: 'n8n-nodes-base.stravaTool' as const,
	StripeTool: 'n8n-nodes-base.stripeTool' as const,
	SupabaseTool: 'n8n-nodes-base.supabaseTool' as const,
	SyncroMspTool: 'n8n-nodes-base.syncroMspTool' as const,
	TaigaTool: 'n8n-nodes-base.taigaTool' as const,
	TapfiliateTool: 'n8n-nodes-base.tapfiliateTool' as const,
	TelegramTool: 'n8n-nodes-base.telegramTool' as const,
	TheHiveProjectTool: 'n8n-nodes-base.theHiveProjectTool' as const,
	TheHiveTool: 'n8n-nodes-base.theHiveTool' as const,
	TimescaleDbTool: 'n8n-nodes-base.timescaleDbTool' as const,
	TodoistTool: 'n8n-nodes-base.todoistTool' as const,
	TotpTool: 'n8n-nodes-base.totpTool' as const,
	TravisCiTool: 'n8n-nodes-base.travisCiTool' as const,
	TrelloTool: 'n8n-nodes-base.trelloTool' as const,
	TwakeTool: 'n8n-nodes-base.twakeTool' as const,
	TwilioTool: 'n8n-nodes-base.twilioTool' as const,
	TwistTool: 'n8n-nodes-base.twistTool' as const,
	TwitterTool: 'n8n-nodes-base.twitterTool' as const,
	UnleashedSoftwareTool: 'n8n-nodes-base.unleashedSoftwareTool' as const,
	UpleadTool: 'n8n-nodes-base.upleadTool' as const,
	UprocTool: 'n8n-nodes-base.uprocTool' as const,
	UptimeRobotTool: 'n8n-nodes-base.uptimeRobotTool' as const,
	UrlScanIoTool: 'n8n-nodes-base.urlScanIoTool' as const,
	VeroTool: 'n8n-nodes-base.veroTool' as const,
	VenafiTlsProtectCloudTool: 'n8n-nodes-base.venafiTlsProtectCloudTool' as const,
	VenafiTlsProtectDatacenterTool: 'n8n-nodes-base.venafiTlsProtectDatacenterTool' as const,
	VonageTool: 'n8n-nodes-base.vonageTool' as const,
	WebflowTool: 'n8n-nodes-base.webflowTool' as const,
	WekanTool: 'n8n-nodes-base.wekanTool' as const,
	WhatsAppTool: 'n8n-nodes-base.whatsAppTool' as const,
	WooCommerceTool: 'n8n-nodes-base.wooCommerceTool' as const,
	WordpressTool: 'n8n-nodes-base.wordpressTool' as const,
	XeroTool: 'n8n-nodes-base.xeroTool' as const,
	YourlsTool: 'n8n-nodes-base.yourlsTool' as const,
	ZammadTool: 'n8n-nodes-base.zammadTool' as const,
	ZendeskTool: 'n8n-nodes-base.zendeskTool' as const,
	ZohoCrmTool: 'n8n-nodes-base.zohoCrmTool' as const,
	ZoomTool: 'n8n-nodes-base.zoomTool' as const,
	ZulipTool: 'n8n-nodes-base.zulipTool' as const,
	AnthropicTool: '@n8n/n8n-nodes-langchain.anthropicTool' as const,
	GoogleGeminiTool: '@n8n/n8n-nodes-langchain.googleGeminiTool' as const,
	OllamaTool: '@n8n/n8n-nodes-langchain.ollamaTool' as const,
} as const;

/** Union type of all node type strings */
export type NodeType =
	| 'n8n-nodes-base.actionNetwork'
	| 'n8n-nodes-base.activeCampaign'
	| 'n8n-nodes-base.activeCampaignTrigger'
	| 'n8n-nodes-base.acuitySchedulingTrigger'
	| 'n8n-nodes-base.adalo'
	| 'n8n-nodes-base.affinity'
	| 'n8n-nodes-base.affinityTrigger'
	| 'n8n-nodes-base.agileCrm'
	| 'n8n-nodes-base.airtable'
	| 'n8n-nodes-base.airtableTrigger'
	| 'n8n-nodes-base.airtop'
	| 'n8n-nodes-base.aiTransform'
	| 'n8n-nodes-base.amqp'
	| 'n8n-nodes-base.amqpTrigger'
	| 'n8n-nodes-base.apiTemplateIo'
	| 'n8n-nodes-base.asana'
	| 'n8n-nodes-base.asanaTrigger'
	| 'n8n-nodes-base.automizy'
	| 'n8n-nodes-base.autopilot'
	| 'n8n-nodes-base.autopilotTrigger'
	| 'n8n-nodes-base.awsLambda'
	| 'n8n-nodes-base.awsSns'
	| 'n8n-nodes-base.awsSnsTrigger'
	| 'n8n-nodes-base.awsCertificateManager'
	| 'n8n-nodes-base.awsCognito'
	| 'n8n-nodes-base.awsComprehend'
	| 'n8n-nodes-base.awsDynamoDb'
	| 'n8n-nodes-base.awsElb'
	| 'n8n-nodes-base.awsIam'
	| 'n8n-nodes-base.awsRekognition'
	| 'n8n-nodes-base.awsS3'
	| 'n8n-nodes-base.awsSes'
	| 'n8n-nodes-base.awsSqs'
	| 'n8n-nodes-base.awsTextract'
	| 'n8n-nodes-base.awsTranscribe'
	| 'n8n-nodes-base.bambooHr'
	| 'n8n-nodes-base.bannerbear'
	| 'n8n-nodes-base.baserow'
	| 'n8n-nodes-base.beeminder'
	| 'n8n-nodes-base.bitbucketTrigger'
	| 'n8n-nodes-base.bitly'
	| 'n8n-nodes-base.bitwarden'
	| 'n8n-nodes-base.box'
	| 'n8n-nodes-base.boxTrigger'
	| 'n8n-nodes-base.Brandfetch'
	| 'n8n-nodes-base.bubble'
	| 'n8n-nodes-base.calTrigger'
	| 'n8n-nodes-base.calendlyTrigger'
	| 'n8n-nodes-base.chargebee'
	| 'n8n-nodes-base.chargebeeTrigger'
	| 'n8n-nodes-base.circleCi'
	| 'n8n-nodes-base.ciscoWebex'
	| 'n8n-nodes-base.ciscoWebexTrigger'
	| 'n8n-nodes-base.cloudflare'
	| 'n8n-nodes-base.clearbit'
	| 'n8n-nodes-base.clickUp'
	| 'n8n-nodes-base.clickUpTrigger'
	| 'n8n-nodes-base.clockify'
	| 'n8n-nodes-base.clockifyTrigger'
	| 'n8n-nodes-base.cockpit'
	| 'n8n-nodes-base.coda'
	| 'n8n-nodes-base.code'
	| 'n8n-nodes-base.coinGecko'
	| 'n8n-nodes-base.compareDatasets'
	| 'n8n-nodes-base.compression'
	| 'n8n-nodes-base.contentful'
	| 'n8n-nodes-base.convertKit'
	| 'n8n-nodes-base.convertKitTrigger'
	| 'n8n-nodes-base.copper'
	| 'n8n-nodes-base.copperTrigger'
	| 'n8n-nodes-base.cortex'
	| 'n8n-nodes-base.crateDb'
	| 'n8n-nodes-base.cron'
	| 'n8n-nodes-base.crowdDev'
	| 'n8n-nodes-base.crowdDevTrigger'
	| 'n8n-nodes-base.crypto'
	| 'n8n-nodes-base.customerIo'
	| 'n8n-nodes-base.customerIoTrigger'
	| 'n8n-nodes-base.dataTable'
	| 'n8n-nodes-base.dateTime'
	| 'n8n-nodes-base.debugHelper'
	| 'n8n-nodes-base.deepL'
	| 'n8n-nodes-base.demio'
	| 'n8n-nodes-base.dhl'
	| 'n8n-nodes-base.discord'
	| 'n8n-nodes-base.discourse'
	| 'n8n-nodes-base.disqus'
	| 'n8n-nodes-base.drift'
	| 'n8n-nodes-base.dropbox'
	| 'n8n-nodes-base.dropcontact'
	| 'n8n-nodes-base.editImage'
	| 'n8n-nodes-base.egoi'
	| 'n8n-nodes-base.elasticsearch'
	| 'n8n-nodes-base.elasticSecurity'
	| 'n8n-nodes-base.emailReadImap'
	| 'n8n-nodes-base.emailSend'
	| 'n8n-nodes-base.emelia'
	| 'n8n-nodes-base.emeliaTrigger'
	| 'n8n-nodes-base.erpNext'
	| 'n8n-nodes-base.errorTrigger'
	| 'n8n-nodes-base.evaluationTrigger'
	| 'n8n-nodes-base.evaluation'
	| 'n8n-nodes-base.eventbriteTrigger'
	| 'n8n-nodes-base.executeCommand'
	| 'n8n-nodes-base.executeWorkflow'
	| 'n8n-nodes-base.executeWorkflowTrigger'
	| 'n8n-nodes-base.executionData'
	| 'n8n-nodes-base.facebookGraphApi'
	| 'n8n-nodes-base.facebookTrigger'
	| 'n8n-nodes-base.facebookLeadAdsTrigger'
	| 'n8n-nodes-base.figmaTrigger'
	| 'n8n-nodes-base.filemaker'
	| 'n8n-nodes-base.readWriteFile'
	| 'n8n-nodes-base.convertToFile'
	| 'n8n-nodes-base.extractFromFile'
	| 'n8n-nodes-base.filter'
	| 'n8n-nodes-base.flow'
	| 'n8n-nodes-base.flowTrigger'
	| 'n8n-nodes-base.form'
	| 'n8n-nodes-base.formTrigger'
	| 'n8n-nodes-base.formIoTrigger'
	| 'n8n-nodes-base.formstackTrigger'
	| 'n8n-nodes-base.freshdesk'
	| 'n8n-nodes-base.freshservice'
	| 'n8n-nodes-base.freshworksCrm'
	| 'n8n-nodes-base.ftp'
	| 'n8n-nodes-base.function'
	| 'n8n-nodes-base.functionItem'
	| 'n8n-nodes-base.getResponse'
	| 'n8n-nodes-base.getResponseTrigger'
	| 'n8n-nodes-base.ghost'
	| 'n8n-nodes-base.git'
	| 'n8n-nodes-base.github'
	| 'n8n-nodes-base.githubTrigger'
	| 'n8n-nodes-base.gitlab'
	| 'n8n-nodes-base.gitlabTrigger'
	| 'n8n-nodes-base.gong'
	| 'n8n-nodes-base.googleAds'
	| 'n8n-nodes-base.googleAnalytics'
	| 'n8n-nodes-base.googleBigQuery'
	| 'n8n-nodes-base.googleBooks'
	| 'n8n-nodes-base.googleCalendar'
	| 'n8n-nodes-base.googleCalendarTrigger'
	| 'n8n-nodes-base.googleChat'
	| 'n8n-nodes-base.googleCloudNaturalLanguage'
	| 'n8n-nodes-base.googleCloudStorage'
	| 'n8n-nodes-base.googleContacts'
	| 'n8n-nodes-base.googleDocs'
	| 'n8n-nodes-base.googleDrive'
	| 'n8n-nodes-base.googleDriveTrigger'
	| 'n8n-nodes-base.googleFirebaseCloudFirestore'
	| 'n8n-nodes-base.googleFirebaseRealtimeDatabase'
	| 'n8n-nodes-base.gmail'
	| 'n8n-nodes-base.gmailTrigger'
	| 'n8n-nodes-base.gSuiteAdmin'
	| 'n8n-nodes-base.googleBusinessProfile'
	| 'n8n-nodes-base.googleBusinessProfileTrigger'
	| 'n8n-nodes-base.googlePerspective'
	| 'n8n-nodes-base.googleSheets'
	| 'n8n-nodes-base.googleSheetsTrigger'
	| 'n8n-nodes-base.googleSlides'
	| 'n8n-nodes-base.googleTasks'
	| 'n8n-nodes-base.googleTranslate'
	| 'n8n-nodes-base.youTube'
	| 'n8n-nodes-base.gotify'
	| 'n8n-nodes-base.goToWebinar'
	| 'n8n-nodes-base.grafana'
	| 'n8n-nodes-base.graphql'
	| 'n8n-nodes-base.grist'
	| 'n8n-nodes-base.gumroadTrigger'
	| 'n8n-nodes-base.hackerNews'
	| 'n8n-nodes-base.haloPSA'
	| 'n8n-nodes-base.harvest'
	| 'n8n-nodes-base.helpScout'
	| 'n8n-nodes-base.helpScoutTrigger'
	| 'n8n-nodes-base.highLevel'
	| 'n8n-nodes-base.homeAssistant'
	| 'n8n-nodes-base.htmlExtract'
	| 'n8n-nodes-base.html'
	| 'n8n-nodes-base.httpRequest'
	| 'n8n-nodes-base.hubspot'
	| 'n8n-nodes-base.hubspotTrigger'
	| 'n8n-nodes-base.humanticAi'
	| 'n8n-nodes-base.hunter'
	| 'n8n-nodes-base.iCal'
	| 'n8n-nodes-base.if'
	| 'n8n-nodes-base.intercom'
	| 'n8n-nodes-base.interval'
	| 'n8n-nodes-base.invoiceNinja'
	| 'n8n-nodes-base.invoiceNinjaTrigger'
	| 'n8n-nodes-base.itemLists'
	| 'n8n-nodes-base.iterable'
	| 'n8n-nodes-base.jenkins'
	| 'n8n-nodes-base.jinaAi'
	| 'n8n-nodes-base.jira'
	| 'n8n-nodes-base.jiraTrigger'
	| 'n8n-nodes-base.jotFormTrigger'
	| 'n8n-nodes-base.jwt'
	| 'n8n-nodes-base.kafka'
	| 'n8n-nodes-base.kafkaTrigger'
	| 'n8n-nodes-base.keap'
	| 'n8n-nodes-base.keapTrigger'
	| 'n8n-nodes-base.kitemaker'
	| 'n8n-nodes-base.koBoToolbox'
	| 'n8n-nodes-base.koBoToolboxTrigger'
	| 'n8n-nodes-base.ldap'
	| 'n8n-nodes-base.lemlist'
	| 'n8n-nodes-base.lemlistTrigger'
	| 'n8n-nodes-base.line'
	| 'n8n-nodes-base.linear'
	| 'n8n-nodes-base.linearTrigger'
	| 'n8n-nodes-base.lingvaNex'
	| 'n8n-nodes-base.linkedIn'
	| 'n8n-nodes-base.localFileTrigger'
	| 'n8n-nodes-base.loneScaleTrigger'
	| 'n8n-nodes-base.loneScale'
	| 'n8n-nodes-base.magento2'
	| 'n8n-nodes-base.mailcheck'
	| 'n8n-nodes-base.mailchimp'
	| 'n8n-nodes-base.mailchimpTrigger'
	| 'n8n-nodes-base.mailerLite'
	| 'n8n-nodes-base.mailerLiteTrigger'
	| 'n8n-nodes-base.mailgun'
	| 'n8n-nodes-base.mailjet'
	| 'n8n-nodes-base.mailjetTrigger'
	| 'n8n-nodes-base.mandrill'
	| 'n8n-nodes-base.manualTrigger'
	| 'n8n-nodes-base.markdown'
	| 'n8n-nodes-base.marketstack'
	| 'n8n-nodes-base.matrix'
	| 'n8n-nodes-base.mattermost'
	| 'n8n-nodes-base.mautic'
	| 'n8n-nodes-base.mauticTrigger'
	| 'n8n-nodes-base.medium'
	| 'n8n-nodes-base.merge'
	| 'n8n-nodes-base.messageBird'
	| 'n8n-nodes-base.metabase'
	| 'n8n-nodes-base.azureCosmosDb'
	| 'n8n-nodes-base.microsoftDynamicsCrm'
	| 'n8n-nodes-base.microsoftEntra'
	| 'n8n-nodes-base.microsoftExcel'
	| 'n8n-nodes-base.microsoftGraphSecurity'
	| 'n8n-nodes-base.microsoftOneDrive'
	| 'n8n-nodes-base.microsoftOneDriveTrigger'
	| 'n8n-nodes-base.microsoftOutlook'
	| 'n8n-nodes-base.microsoftOutlookTrigger'
	| 'n8n-nodes-base.microsoftSharePoint'
	| 'n8n-nodes-base.microsoftSql'
	| 'n8n-nodes-base.azureStorage'
	| 'n8n-nodes-base.microsoftTeams'
	| 'n8n-nodes-base.microsoftTeamsTrigger'
	| 'n8n-nodes-base.microsoftToDo'
	| 'n8n-nodes-base.mindee'
	| 'n8n-nodes-base.misp'
	| 'n8n-nodes-base.mistralAi'
	| 'n8n-nodes-base.mocean'
	| 'n8n-nodes-base.mondayCom'
	| 'n8n-nodes-base.mongoDb'
	| 'n8n-nodes-base.monicaCrm'
	| 'n8n-nodes-base.moveBinaryData'
	| 'n8n-nodes-base.mqtt'
	| 'n8n-nodes-base.mqttTrigger'
	| 'n8n-nodes-base.msg91'
	| 'n8n-nodes-base.mySql'
	| 'n8n-nodes-base.n8n'
	| 'n8n-nodes-base.n8nTrainingCustomerDatastore'
	| 'n8n-nodes-base.n8nTrainingCustomerMessenger'
	| 'n8n-nodes-base.n8nTrigger'
	| 'n8n-nodes-base.nasa'
	| 'n8n-nodes-base.netlify'
	| 'n8n-nodes-base.netlifyTrigger'
	| 'n8n-nodes-base.nextCloud'
	| 'n8n-nodes-base.nocoDb'
	| 'n8n-nodes-base.sendInBlue'
	| 'n8n-nodes-base.sendInBlueTrigger'
	| 'n8n-nodes-base.stickyNote'
	| 'n8n-nodes-base.noOp'
	| 'n8n-nodes-base.onfleet'
	| 'n8n-nodes-base.onfleetTrigger'
	| 'n8n-nodes-base.citrixAdc'
	| 'n8n-nodes-base.notion'
	| 'n8n-nodes-base.notionTrigger'
	| 'n8n-nodes-base.npm'
	| 'n8n-nodes-base.odoo'
	| 'n8n-nodes-base.okta'
	| 'n8n-nodes-base.oneSimpleApi'
	| 'n8n-nodes-base.openAi'
	| 'n8n-nodes-base.openThesaurus'
	| 'n8n-nodes-base.openWeatherMap'
	| 'n8n-nodes-base.oracleDatabase'
	| 'n8n-nodes-base.orbit'
	| 'n8n-nodes-base.oura'
	| 'n8n-nodes-base.paddle'
	| 'n8n-nodes-base.pagerDuty'
	| 'n8n-nodes-base.payPal'
	| 'n8n-nodes-base.payPalTrigger'
	| 'n8n-nodes-base.peekalink'
	| 'n8n-nodes-base.perplexity'
	| 'n8n-nodes-base.phantombuster'
	| 'n8n-nodes-base.philipsHue'
	| 'n8n-nodes-base.pipedrive'
	| 'n8n-nodes-base.pipedriveTrigger'
	| 'n8n-nodes-base.plivo'
	| 'n8n-nodes-base.postBin'
	| 'n8n-nodes-base.postgres'
	| 'n8n-nodes-base.postgresTrigger'
	| 'n8n-nodes-base.postHog'
	| 'n8n-nodes-base.postmarkTrigger'
	| 'n8n-nodes-base.profitWell'
	| 'n8n-nodes-base.pushbullet'
	| 'n8n-nodes-base.pushcut'
	| 'n8n-nodes-base.pushcutTrigger'
	| 'n8n-nodes-base.pushover'
	| 'n8n-nodes-base.questDb'
	| 'n8n-nodes-base.quickbase'
	| 'n8n-nodes-base.quickbooks'
	| 'n8n-nodes-base.quickChart'
	| 'n8n-nodes-base.rabbitmq'
	| 'n8n-nodes-base.rabbitmqTrigger'
	| 'n8n-nodes-base.raindrop'
	| 'n8n-nodes-base.readBinaryFile'
	| 'n8n-nodes-base.readBinaryFiles'
	| 'n8n-nodes-base.readPDF'
	| 'n8n-nodes-base.reddit'
	| 'n8n-nodes-base.redis'
	| 'n8n-nodes-base.redisTrigger'
	| 'n8n-nodes-base.renameKeys'
	| 'n8n-nodes-base.respondToWebhook'
	| 'n8n-nodes-base.rocketchat'
	| 'n8n-nodes-base.rssFeedRead'
	| 'n8n-nodes-base.rssFeedReadTrigger'
	| 'n8n-nodes-base.rundeck'
	| 'n8n-nodes-base.s3'
	| 'n8n-nodes-base.salesforce'
	| 'n8n-nodes-base.salesforceTrigger'
	| 'n8n-nodes-base.salesmate'
	| 'n8n-nodes-base.scheduleTrigger'
	| 'n8n-nodes-base.seaTable'
	| 'n8n-nodes-base.seaTableTrigger'
	| 'n8n-nodes-base.securityScorecard'
	| 'n8n-nodes-base.segment'
	| 'n8n-nodes-base.sendGrid'
	| 'n8n-nodes-base.sendy'
	| 'n8n-nodes-base.sentryIo'
	| 'n8n-nodes-base.serviceNow'
	| 'n8n-nodes-base.set'
	| 'n8n-nodes-base.shopify'
	| 'n8n-nodes-base.shopifyTrigger'
	| 'n8n-nodes-base.signl4'
	| 'n8n-nodes-base.simulate'
	| 'n8n-nodes-base.simulateTrigger'
	| 'n8n-nodes-base.slack'
	| 'n8n-nodes-base.slackTrigger'
	| 'n8n-nodes-base.sms77'
	| 'n8n-nodes-base.snowflake'
	| 'n8n-nodes-base.splitInBatches'
	| 'n8n-nodes-base.splunk'
	| 'n8n-nodes-base.spontit'
	| 'n8n-nodes-base.spotify'
	| 'n8n-nodes-base.spreadsheetFile'
	| 'n8n-nodes-base.sseTrigger'
	| 'n8n-nodes-base.ssh'
	| 'n8n-nodes-base.stackby'
	| 'n8n-nodes-base.start'
	| 'n8n-nodes-base.stopAndError'
	| 'n8n-nodes-base.storyblok'
	| 'n8n-nodes-base.strapi'
	| 'n8n-nodes-base.strava'
	| 'n8n-nodes-base.stravaTrigger'
	| 'n8n-nodes-base.stripe'
	| 'n8n-nodes-base.stripeTrigger'
	| 'n8n-nodes-base.supabase'
	| 'n8n-nodes-base.surveyMonkeyTrigger'
	| 'n8n-nodes-base.switch'
	| 'n8n-nodes-base.syncroMsp'
	| 'n8n-nodes-base.taiga'
	| 'n8n-nodes-base.taigaTrigger'
	| 'n8n-nodes-base.tapfiliate'
	| 'n8n-nodes-base.telegram'
	| 'n8n-nodes-base.telegramTrigger'
	| 'n8n-nodes-base.theHiveProject'
	| 'n8n-nodes-base.theHiveProjectTrigger'
	| 'n8n-nodes-base.theHive'
	| 'n8n-nodes-base.theHiveTrigger'
	| 'n8n-nodes-base.timescaleDb'
	| 'n8n-nodes-base.todoist'
	| 'n8n-nodes-base.togglTrigger'
	| 'n8n-nodes-base.totp'
	| 'n8n-nodes-base.travisCi'
	| 'n8n-nodes-base.trello'
	| 'n8n-nodes-base.trelloTrigger'
	| 'n8n-nodes-base.twake'
	| 'n8n-nodes-base.twilio'
	| 'n8n-nodes-base.twilioTrigger'
	| 'n8n-nodes-base.twist'
	| 'n8n-nodes-base.twitter'
	| 'n8n-nodes-base.typeformTrigger'
	| 'n8n-nodes-base.unleashedSoftware'
	| 'n8n-nodes-base.uplead'
	| 'n8n-nodes-base.uproc'
	| 'n8n-nodes-base.uptimeRobot'
	| 'n8n-nodes-base.urlScanIo'
	| 'n8n-nodes-base.vero'
	| 'n8n-nodes-base.venafiTlsProtectCloud'
	| 'n8n-nodes-base.venafiTlsProtectCloudTrigger'
	| 'n8n-nodes-base.venafiTlsProtectDatacenter'
	| 'n8n-nodes-base.vonage'
	| 'n8n-nodes-base.wait'
	| 'n8n-nodes-base.webflow'
	| 'n8n-nodes-base.webflowTrigger'
	| 'n8n-nodes-base.webhook'
	| 'n8n-nodes-base.wekan'
	| 'n8n-nodes-base.whatsAppTrigger'
	| 'n8n-nodes-base.whatsApp'
	| 'n8n-nodes-base.wise'
	| 'n8n-nodes-base.wiseTrigger'
	| 'n8n-nodes-base.wooCommerce'
	| 'n8n-nodes-base.wooCommerceTrigger'
	| 'n8n-nodes-base.wordpress'
	| 'n8n-nodes-base.workableTrigger'
	| 'n8n-nodes-base.workflowTrigger'
	| 'n8n-nodes-base.writeBinaryFile'
	| 'n8n-nodes-base.wufooTrigger'
	| 'n8n-nodes-base.xero'
	| 'n8n-nodes-base.xml'
	| 'n8n-nodes-base.yourls'
	| 'n8n-nodes-base.zammad'
	| 'n8n-nodes-base.zendesk'
	| 'n8n-nodes-base.zendeskTrigger'
	| 'n8n-nodes-base.zohoCrm'
	| 'n8n-nodes-base.zoom'
	| 'n8n-nodes-base.zulip'
	| 'n8n-nodes-base.aggregate'
	| 'n8n-nodes-base.limit'
	| 'n8n-nodes-base.removeDuplicates'
	| 'n8n-nodes-base.splitOut'
	| 'n8n-nodes-base.sort'
	| 'n8n-nodes-base.summarize'
	| '@n8n/n8n-nodes-langchain.anthropic'
	| '@n8n/n8n-nodes-langchain.googleGemini'
	| '@n8n/n8n-nodes-langchain.ollama'
	| '@n8n/n8n-nodes-langchain.openAi'
	| '@n8n/n8n-nodes-langchain.agent'
	| '@n8n/n8n-nodes-langchain.agentTool'
	| '@n8n/n8n-nodes-langchain.openAiAssistant'
	| '@n8n/n8n-nodes-langchain.chainSummarization'
	| '@n8n/n8n-nodes-langchain.chainLlm'
	| '@n8n/n8n-nodes-langchain.chainRetrievalQa'
	| '@n8n/n8n-nodes-langchain.sentimentAnalysis'
	| '@n8n/n8n-nodes-langchain.informationExtractor'
	| '@n8n/n8n-nodes-langchain.textClassifier'
	| '@n8n/n8n-nodes-langchain.code'
	| '@n8n/n8n-nodes-langchain.documentDefaultDataLoader'
	| '@n8n/n8n-nodes-langchain.documentBinaryInputLoader'
	| '@n8n/n8n-nodes-langchain.documentGithubLoader'
	| '@n8n/n8n-nodes-langchain.documentJsonInputLoader'
	| '@n8n/n8n-nodes-langchain.embeddingsCohere'
	| '@n8n/n8n-nodes-langchain.embeddingsAwsBedrock'
	| '@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi'
	| '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini'
	| '@n8n/n8n-nodes-langchain.embeddingsGoogleVertex'
	| '@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference'
	| '@n8n/n8n-nodes-langchain.embeddingsMistralCloud'
	| '@n8n/n8n-nodes-langchain.embeddingsOpenAi'
	| '@n8n/n8n-nodes-langchain.embeddingsLemonade'
	| '@n8n/n8n-nodes-langchain.embeddingsOllama'
	| '@n8n/n8n-nodes-langchain.lmChatAnthropic'
	| '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi'
	| '@n8n/n8n-nodes-langchain.lmChatAwsBedrock'
	| '@n8n/n8n-nodes-langchain.lmChatCohere'
	| '@n8n/n8n-nodes-langchain.lmChatDeepSeek'
	| '@n8n/n8n-nodes-langchain.lmChatGoogleGemini'
	| '@n8n/n8n-nodes-langchain.lmChatGoogleVertex'
	| '@n8n/n8n-nodes-langchain.lmChatGroq'
	| '@n8n/n8n-nodes-langchain.lmChatMistralCloud'
	| '@n8n/n8n-nodes-langchain.lmChatLemonade'
	| '@n8n/n8n-nodes-langchain.lmChatOllama'
	| '@n8n/n8n-nodes-langchain.lmChatOpenRouter'
	| '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway'
	| '@n8n/n8n-nodes-langchain.lmChatXAiGrok'
	| '@n8n/n8n-nodes-langchain.lmChatOpenAi'
	| '@n8n/n8n-nodes-langchain.lmOpenAi'
	| '@n8n/n8n-nodes-langchain.lmCohere'
	| '@n8n/n8n-nodes-langchain.lmLemonade'
	| '@n8n/n8n-nodes-langchain.lmOllama'
	| '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference'
	| '@n8n/n8n-nodes-langchain.mcpClientTool'
	| '@n8n/n8n-nodes-langchain.mcpTrigger'
	| '@n8n/n8n-nodes-langchain.memoryBufferWindow'
	| '@n8n/n8n-nodes-langchain.memoryMotorhead'
	| '@n8n/n8n-nodes-langchain.memoryPostgresChat'
	| '@n8n/n8n-nodes-langchain.memoryMongoDbChat'
	| '@n8n/n8n-nodes-langchain.memoryRedisChat'
	| '@n8n/n8n-nodes-langchain.memoryManager'
	| '@n8n/n8n-nodes-langchain.memoryChatRetriever'
	| '@n8n/n8n-nodes-langchain.memoryXata'
	| '@n8n/n8n-nodes-langchain.memoryZep'
	| '@n8n/n8n-nodes-langchain.outputParserAutofixing'
	| '@n8n/n8n-nodes-langchain.outputParserItemList'
	| '@n8n/n8n-nodes-langchain.outputParserStructured'
	| '@n8n/n8n-nodes-langchain.rerankerCohere'
	| '@n8n/n8n-nodes-langchain.retrieverContextualCompression'
	| '@n8n/n8n-nodes-langchain.retrieverVectorStore'
	| '@n8n/n8n-nodes-langchain.retrieverMultiQuery'
	| '@n8n/n8n-nodes-langchain.retrieverWorkflow'
	| '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter'
	| '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter'
	| '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter'
	| '@n8n/n8n-nodes-langchain.toolCalculator'
	| '@n8n/n8n-nodes-langchain.toolCode'
	| '@n8n/n8n-nodes-langchain.toolHttpRequest'
	| '@n8n/n8n-nodes-langchain.toolSearXng'
	| '@n8n/n8n-nodes-langchain.toolSerpApi'
	| '@n8n/n8n-nodes-langchain.toolThink'
	| '@n8n/n8n-nodes-langchain.toolVectorStore'
	| '@n8n/n8n-nodes-langchain.toolWikipedia'
	| '@n8n/n8n-nodes-langchain.toolWolframAlpha'
	| '@n8n/n8n-nodes-langchain.toolWorkflow'
	| '@n8n/n8n-nodes-langchain.manualChatTrigger'
	| '@n8n/n8n-nodes-langchain.chatTrigger'
	| '@n8n/n8n-nodes-langchain.chat'
	| '@n8n/n8n-nodes-langchain.vectorStoreInMemory'
	| '@n8n/n8n-nodes-langchain.vectorStoreInMemoryInsert'
	| '@n8n/n8n-nodes-langchain.vectorStoreInMemoryLoad'
	| '@n8n/n8n-nodes-langchain.vectorStoreMilvus'
	| '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas'
	| '@n8n/n8n-nodes-langchain.vectorStorePGVector'
	| '@n8n/n8n-nodes-langchain.vectorStorePinecone'
	| '@n8n/n8n-nodes-langchain.vectorStorePineconeInsert'
	| '@n8n/n8n-nodes-langchain.vectorStorePineconeLoad'
	| '@n8n/n8n-nodes-langchain.vectorStoreRedis'
	| '@n8n/n8n-nodes-langchain.vectorStoreQdrant'
	| '@n8n/n8n-nodes-langchain.vectorStoreSupabase'
	| '@n8n/n8n-nodes-langchain.vectorStoreSupabaseInsert'
	| '@n8n/n8n-nodes-langchain.vectorStoreSupabaseLoad'
	| '@n8n/n8n-nodes-langchain.vectorStoreWeaviate'
	| '@n8n/n8n-nodes-langchain.vectorStoreZep'
	| '@n8n/n8n-nodes-langchain.vectorStoreZepInsert'
	| '@n8n/n8n-nodes-langchain.vectorStoreZepLoad'
	| '@n8n/n8n-nodes-langchain.toolExecutor'
	| '@n8n/n8n-nodes-langchain.modelSelector'
	| 'n8n-nodes-base.actionNetworkTool'
	| 'n8n-nodes-base.activeCampaignTool'
	| 'n8n-nodes-base.adaloTool'
	| 'n8n-nodes-base.affinityTool'
	| 'n8n-nodes-base.agileCrmTool'
	| 'n8n-nodes-base.airtableTool'
	| 'n8n-nodes-base.airtopTool'
	| 'n8n-nodes-base.amqpTool'
	| 'n8n-nodes-base.apiTemplateIoTool'
	| 'n8n-nodes-base.asanaTool'
	| 'n8n-nodes-base.autopilotTool'
	| 'n8n-nodes-base.awsLambdaTool'
	| 'n8n-nodes-base.awsSnsTool'
	| 'n8n-nodes-base.awsS3Tool'
	| 'n8n-nodes-base.awsSesTool'
	| 'n8n-nodes-base.awsTextractTool'
	| 'n8n-nodes-base.awsTranscribeTool'
	| 'n8n-nodes-base.bambooHrTool'
	| 'n8n-nodes-base.baserowTool'
	| 'n8n-nodes-base.beeminderTool'
	| 'n8n-nodes-base.bitlyTool'
	| 'n8n-nodes-base.bitwardenTool'
	| 'n8n-nodes-base.BrandfetchTool'
	| 'n8n-nodes-base.bubbleTool'
	| 'n8n-nodes-base.chargebeeTool'
	| 'n8n-nodes-base.circleCiTool'
	| 'n8n-nodes-base.ciscoWebexTool'
	| 'n8n-nodes-base.cloudflareTool'
	| 'n8n-nodes-base.clearbitTool'
	| 'n8n-nodes-base.clickUpTool'
	| 'n8n-nodes-base.clockifyTool'
	| 'n8n-nodes-base.cockpitTool'
	| 'n8n-nodes-base.codaTool'
	| 'n8n-nodes-base.coinGeckoTool'
	| 'n8n-nodes-base.compressionTool'
	| 'n8n-nodes-base.contentfulTool'
	| 'n8n-nodes-base.convertKitTool'
	| 'n8n-nodes-base.copperTool'
	| 'n8n-nodes-base.crateDbTool'
	| 'n8n-nodes-base.crowdDevTool'
	| 'n8n-nodes-base.cryptoTool'
	| 'n8n-nodes-base.customerIoTool'
	| 'n8n-nodes-base.dataTableTool'
	| 'n8n-nodes-base.dateTimeTool'
	| 'n8n-nodes-base.deepLTool'
	| 'n8n-nodes-base.demioTool'
	| 'n8n-nodes-base.dhlTool'
	| 'n8n-nodes-base.discordTool'
	| 'n8n-nodes-base.discourseTool'
	| 'n8n-nodes-base.driftTool'
	| 'n8n-nodes-base.dropboxTool'
	| 'n8n-nodes-base.dropcontactTool'
	| 'n8n-nodes-base.egoiTool'
	| 'n8n-nodes-base.elasticsearchTool'
	| 'n8n-nodes-base.elasticSecurityTool'
	| 'n8n-nodes-base.emailReadImapTool'
	| 'n8n-nodes-base.emailSendTool'
	| 'n8n-nodes-base.emeliaTool'
	| 'n8n-nodes-base.erpNextTool'
	| 'n8n-nodes-base.executeCommandTool'
	| 'n8n-nodes-base.facebookGraphApiTool'
	| 'n8n-nodes-base.filemakerTool'
	| 'n8n-nodes-base.freshdeskTool'
	| 'n8n-nodes-base.freshserviceTool'
	| 'n8n-nodes-base.freshworksCrmTool'
	| 'n8n-nodes-base.getResponseTool'
	| 'n8n-nodes-base.ghostTool'
	| 'n8n-nodes-base.gitTool'
	| 'n8n-nodes-base.githubTool'
	| 'n8n-nodes-base.gitlabTool'
	| 'n8n-nodes-base.gongTool'
	| 'n8n-nodes-base.googleAdsTool'
	| 'n8n-nodes-base.googleAnalyticsTool'
	| 'n8n-nodes-base.googleBigQueryTool'
	| 'n8n-nodes-base.googleBooksTool'
	| 'n8n-nodes-base.googleCalendarTool'
	| 'n8n-nodes-base.googleChatTool'
	| 'n8n-nodes-base.googleCloudNaturalLanguageTool'
	| 'n8n-nodes-base.googleCloudStorageTool'
	| 'n8n-nodes-base.googleContactsTool'
	| 'n8n-nodes-base.googleDocsTool'
	| 'n8n-nodes-base.googleDriveTool'
	| 'n8n-nodes-base.googleFirebaseCloudFirestoreTool'
	| 'n8n-nodes-base.googleFirebaseRealtimeDatabaseTool'
	| 'n8n-nodes-base.gmailTool'
	| 'n8n-nodes-base.gSuiteAdminTool'
	| 'n8n-nodes-base.googleBusinessProfileTool'
	| 'n8n-nodes-base.googlePerspectiveTool'
	| 'n8n-nodes-base.googleSheetsTool'
	| 'n8n-nodes-base.googleSlidesTool'
	| 'n8n-nodes-base.googleTasksTool'
	| 'n8n-nodes-base.googleTranslateTool'
	| 'n8n-nodes-base.youTubeTool'
	| 'n8n-nodes-base.gotifyTool'
	| 'n8n-nodes-base.goToWebinarTool'
	| 'n8n-nodes-base.grafanaTool'
	| 'n8n-nodes-base.graphqlTool'
	| 'n8n-nodes-base.gristTool'
	| 'n8n-nodes-base.hackerNewsTool'
	| 'n8n-nodes-base.haloPSATool'
	| 'n8n-nodes-base.harvestTool'
	| 'n8n-nodes-base.helpScoutTool'
	| 'n8n-nodes-base.highLevelTool'
	| 'n8n-nodes-base.homeAssistantTool'
	| 'n8n-nodes-base.httpRequestTool'
	| 'n8n-nodes-base.hubspotTool'
	| 'n8n-nodes-base.humanticAiTool'
	| 'n8n-nodes-base.hunterTool'
	| 'n8n-nodes-base.intercomTool'
	| 'n8n-nodes-base.invoiceNinjaTool'
	| 'n8n-nodes-base.iterableTool'
	| 'n8n-nodes-base.jenkinsTool'
	| 'n8n-nodes-base.jinaAiTool'
	| 'n8n-nodes-base.jiraTool'
	| 'n8n-nodes-base.jwtTool'
	| 'n8n-nodes-base.kafkaTool'
	| 'n8n-nodes-base.keapTool'
	| 'n8n-nodes-base.kitemakerTool'
	| 'n8n-nodes-base.koBoToolboxTool'
	| 'n8n-nodes-base.ldapTool'
	| 'n8n-nodes-base.lemlistTool'
	| 'n8n-nodes-base.lineTool'
	| 'n8n-nodes-base.linearTool'
	| 'n8n-nodes-base.lingvaNexTool'
	| 'n8n-nodes-base.linkedInTool'
	| 'n8n-nodes-base.loneScaleTool'
	| 'n8n-nodes-base.magento2Tool'
	| 'n8n-nodes-base.mailcheckTool'
	| 'n8n-nodes-base.mailchimpTool'
	| 'n8n-nodes-base.mailerLiteTool'
	| 'n8n-nodes-base.mailgunTool'
	| 'n8n-nodes-base.mailjetTool'
	| 'n8n-nodes-base.mandrillTool'
	| 'n8n-nodes-base.marketstackTool'
	| 'n8n-nodes-base.matrixTool'
	| 'n8n-nodes-base.mattermostTool'
	| 'n8n-nodes-base.mauticTool'
	| 'n8n-nodes-base.mediumTool'
	| 'n8n-nodes-base.messageBirdTool'
	| 'n8n-nodes-base.metabaseTool'
	| 'n8n-nodes-base.microsoftDynamicsCrmTool'
	| 'n8n-nodes-base.microsoftEntraTool'
	| 'n8n-nodes-base.microsoftExcelTool'
	| 'n8n-nodes-base.microsoftGraphSecurityTool'
	| 'n8n-nodes-base.microsoftOneDriveTool'
	| 'n8n-nodes-base.microsoftOutlookTool'
	| 'n8n-nodes-base.microsoftSharePointTool'
	| 'n8n-nodes-base.microsoftSqlTool'
	| 'n8n-nodes-base.microsoftTeamsTool'
	| 'n8n-nodes-base.microsoftToDoTool'
	| 'n8n-nodes-base.mispTool'
	| 'n8n-nodes-base.mistralAiTool'
	| 'n8n-nodes-base.moceanTool'
	| 'n8n-nodes-base.mondayComTool'
	| 'n8n-nodes-base.mongoDbTool'
	| 'n8n-nodes-base.monicaCrmTool'
	| 'n8n-nodes-base.mqttTool'
	| 'n8n-nodes-base.msg91Tool'
	| 'n8n-nodes-base.mySqlTool'
	| 'n8n-nodes-base.nasaTool'
	| 'n8n-nodes-base.netlifyTool'
	| 'n8n-nodes-base.nextCloudTool'
	| 'n8n-nodes-base.nocoDbTool'
	| 'n8n-nodes-base.sendInBlueTool'
	| 'n8n-nodes-base.onfleetTool'
	| 'n8n-nodes-base.notionTool'
	| 'n8n-nodes-base.npmTool'
	| 'n8n-nodes-base.odooTool'
	| 'n8n-nodes-base.oktaTool'
	| 'n8n-nodes-base.oneSimpleApiTool'
	| 'n8n-nodes-base.openThesaurusTool'
	| 'n8n-nodes-base.openWeatherMapTool'
	| 'n8n-nodes-base.oracleDatabaseTool'
	| 'n8n-nodes-base.ouraTool'
	| 'n8n-nodes-base.paddleTool'
	| 'n8n-nodes-base.pagerDutyTool'
	| 'n8n-nodes-base.peekalinkTool'
	| 'n8n-nodes-base.perplexityTool'
	| 'n8n-nodes-base.phantombusterTool'
	| 'n8n-nodes-base.philipsHueTool'
	| 'n8n-nodes-base.pipedriveTool'
	| 'n8n-nodes-base.plivoTool'
	| 'n8n-nodes-base.postBinTool'
	| 'n8n-nodes-base.postgresTool'
	| 'n8n-nodes-base.postHogTool'
	| 'n8n-nodes-base.profitWellTool'
	| 'n8n-nodes-base.pushbulletTool'
	| 'n8n-nodes-base.pushcutTool'
	| 'n8n-nodes-base.pushoverTool'
	| 'n8n-nodes-base.questDbTool'
	| 'n8n-nodes-base.quickbaseTool'
	| 'n8n-nodes-base.quickbooksTool'
	| 'n8n-nodes-base.quickChartTool'
	| 'n8n-nodes-base.rabbitmqTool'
	| 'n8n-nodes-base.raindropTool'
	| 'n8n-nodes-base.redditTool'
	| 'n8n-nodes-base.redisTool'
	| 'n8n-nodes-base.rocketchatTool'
	| 'n8n-nodes-base.rssFeedReadTool'
	| 'n8n-nodes-base.rundeckTool'
	| 'n8n-nodes-base.s3Tool'
	| 'n8n-nodes-base.salesforceTool'
	| 'n8n-nodes-base.salesmateTool'
	| 'n8n-nodes-base.seaTableTool'
	| 'n8n-nodes-base.securityScorecardTool'
	| 'n8n-nodes-base.segmentTool'
	| 'n8n-nodes-base.sendGridTool'
	| 'n8n-nodes-base.sendyTool'
	| 'n8n-nodes-base.sentryIoTool'
	| 'n8n-nodes-base.serviceNowTool'
	| 'n8n-nodes-base.shopifyTool'
	| 'n8n-nodes-base.signl4Tool'
	| 'n8n-nodes-base.slackTool'
	| 'n8n-nodes-base.sms77Tool'
	| 'n8n-nodes-base.snowflakeTool'
	| 'n8n-nodes-base.splunkTool'
	| 'n8n-nodes-base.spontitTool'
	| 'n8n-nodes-base.spotifyTool'
	| 'n8n-nodes-base.stackbyTool'
	| 'n8n-nodes-base.storyblokTool'
	| 'n8n-nodes-base.strapiTool'
	| 'n8n-nodes-base.stravaTool'
	| 'n8n-nodes-base.stripeTool'
	| 'n8n-nodes-base.supabaseTool'
	| 'n8n-nodes-base.syncroMspTool'
	| 'n8n-nodes-base.taigaTool'
	| 'n8n-nodes-base.tapfiliateTool'
	| 'n8n-nodes-base.telegramTool'
	| 'n8n-nodes-base.theHiveProjectTool'
	| 'n8n-nodes-base.theHiveTool'
	| 'n8n-nodes-base.timescaleDbTool'
	| 'n8n-nodes-base.todoistTool'
	| 'n8n-nodes-base.totpTool'
	| 'n8n-nodes-base.travisCiTool'
	| 'n8n-nodes-base.trelloTool'
	| 'n8n-nodes-base.twakeTool'
	| 'n8n-nodes-base.twilioTool'
	| 'n8n-nodes-base.twistTool'
	| 'n8n-nodes-base.twitterTool'
	| 'n8n-nodes-base.unleashedSoftwareTool'
	| 'n8n-nodes-base.upleadTool'
	| 'n8n-nodes-base.uprocTool'
	| 'n8n-nodes-base.uptimeRobotTool'
	| 'n8n-nodes-base.urlScanIoTool'
	| 'n8n-nodes-base.veroTool'
	| 'n8n-nodes-base.venafiTlsProtectCloudTool'
	| 'n8n-nodes-base.venafiTlsProtectDatacenterTool'
	| 'n8n-nodes-base.vonageTool'
	| 'n8n-nodes-base.webflowTool'
	| 'n8n-nodes-base.wekanTool'
	| 'n8n-nodes-base.whatsAppTool'
	| 'n8n-nodes-base.wooCommerceTool'
	| 'n8n-nodes-base.wordpressTool'
	| 'n8n-nodes-base.xeroTool'
	| 'n8n-nodes-base.yourlsTool'
	| 'n8n-nodes-base.zammadTool'
	| 'n8n-nodes-base.zendeskTool'
	| 'n8n-nodes-base.zohoCrmTool'
	| 'n8n-nodes-base.zoomTool'
	| 'n8n-nodes-base.zulipTool'
	| '@n8n/n8n-nodes-langchain.anthropicTool'
	| '@n8n/n8n-nodes-langchain.googleGeminiTool'
	| '@n8n/n8n-nodes-langchain.ollamaTool';

// ===== Display Name Mapping =====

/** Map of node types to their display names */
export const NodeDisplayNames: Record<NodeType, string> = {
	'n8n-nodes-base.actionNetwork': 'Action Network',
	'n8n-nodes-base.activeCampaign': 'ActiveCampaign',
	'n8n-nodes-base.activeCampaignTrigger': 'ActiveCampaign Trigger',
	'n8n-nodes-base.acuitySchedulingTrigger': 'Acuity Scheduling Trigger',
	'n8n-nodes-base.adalo': 'Adalo',
	'n8n-nodes-base.affinity': 'Affinity',
	'n8n-nodes-base.affinityTrigger': 'Affinity Trigger',
	'n8n-nodes-base.agileCrm': 'Agile CRM',
	'n8n-nodes-base.airtable': 'Airtable',
	'n8n-nodes-base.airtableTrigger': 'Airtable Trigger',
	'n8n-nodes-base.airtop': 'Airtop',
	'n8n-nodes-base.aiTransform': 'AI Transform',
	'n8n-nodes-base.amqp': 'AMQP Sender',
	'n8n-nodes-base.amqpTrigger': 'AMQP Trigger',
	'n8n-nodes-base.apiTemplateIo': 'APITemplate.io',
	'n8n-nodes-base.asana': 'Asana',
	'n8n-nodes-base.asanaTrigger': 'Asana Trigger',
	'n8n-nodes-base.automizy': 'Automizy',
	'n8n-nodes-base.autopilot': 'Autopilot',
	'n8n-nodes-base.autopilotTrigger': 'Autopilot Trigger',
	'n8n-nodes-base.awsLambda': 'AWS Lambda',
	'n8n-nodes-base.awsSns': 'AWS SNS',
	'n8n-nodes-base.awsSnsTrigger': 'AWS SNS Trigger',
	'n8n-nodes-base.awsCertificateManager': 'AWS Certificate Manager',
	'n8n-nodes-base.awsCognito': 'AWS Cognito',
	'n8n-nodes-base.awsComprehend': 'AWS Comprehend',
	'n8n-nodes-base.awsDynamoDb': 'AWS DynamoDB',
	'n8n-nodes-base.awsElb': 'AWS ELB',
	'n8n-nodes-base.awsIam': 'AWS IAM',
	'n8n-nodes-base.awsRekognition': 'AWS Rekognition',
	'n8n-nodes-base.awsS3': 'AWS S3',
	'n8n-nodes-base.awsSes': 'AWS SES',
	'n8n-nodes-base.awsSqs': 'AWS SQS',
	'n8n-nodes-base.awsTextract': 'AWS Textract',
	'n8n-nodes-base.awsTranscribe': 'AWS Transcribe',
	'n8n-nodes-base.bambooHr': 'BambooHR',
	'n8n-nodes-base.bannerbear': 'Bannerbear',
	'n8n-nodes-base.baserow': 'Baserow',
	'n8n-nodes-base.beeminder': 'Beeminder',
	'n8n-nodes-base.bitbucketTrigger': 'Bitbucket Trigger',
	'n8n-nodes-base.bitly': 'Bitly',
	'n8n-nodes-base.bitwarden': 'Bitwarden',
	'n8n-nodes-base.box': 'Box',
	'n8n-nodes-base.boxTrigger': 'Box Trigger',
	'n8n-nodes-base.Brandfetch': 'Brandfetch',
	'n8n-nodes-base.bubble': 'Bubble',
	'n8n-nodes-base.calTrigger': 'Cal.com Trigger',
	'n8n-nodes-base.calendlyTrigger': 'Calendly Trigger',
	'n8n-nodes-base.chargebee': 'Chargebee',
	'n8n-nodes-base.chargebeeTrigger': 'Chargebee Trigger',
	'n8n-nodes-base.circleCi': 'CircleCI',
	'n8n-nodes-base.ciscoWebex': 'Webex by Cisco',
	'n8n-nodes-base.ciscoWebexTrigger': 'Webex by Cisco Trigger',
	'n8n-nodes-base.cloudflare': 'Cloudflare',
	'n8n-nodes-base.clearbit': 'Clearbit',
	'n8n-nodes-base.clickUp': 'ClickUp',
	'n8n-nodes-base.clickUpTrigger': 'ClickUp Trigger',
	'n8n-nodes-base.clockify': 'Clockify',
	'n8n-nodes-base.clockifyTrigger': 'Clockify Trigger',
	'n8n-nodes-base.cockpit': 'Cockpit',
	'n8n-nodes-base.coda': 'Coda',
	'n8n-nodes-base.code': 'Code',
	'n8n-nodes-base.coinGecko': 'CoinGecko',
	'n8n-nodes-base.compareDatasets': 'Compare Datasets',
	'n8n-nodes-base.compression': 'Compression',
	'n8n-nodes-base.contentful': 'Contentful',
	'n8n-nodes-base.convertKit': 'ConvertKit',
	'n8n-nodes-base.convertKitTrigger': 'ConvertKit Trigger',
	'n8n-nodes-base.copper': 'Copper',
	'n8n-nodes-base.copperTrigger': 'Copper Trigger',
	'n8n-nodes-base.cortex': 'Cortex',
	'n8n-nodes-base.crateDb': 'CrateDB',
	'n8n-nodes-base.cron': 'Cron',
	'n8n-nodes-base.crowdDev': 'crowd.dev',
	'n8n-nodes-base.crowdDevTrigger': 'crowd.dev Trigger',
	'n8n-nodes-base.crypto': 'Crypto',
	'n8n-nodes-base.customerIo': 'Customer.io',
	'n8n-nodes-base.customerIoTrigger': 'Customer.io Trigger',
	'n8n-nodes-base.dataTable': 'Data table',
	'n8n-nodes-base.dateTime': 'Date & Time',
	'n8n-nodes-base.debugHelper': 'DebugHelper',
	'n8n-nodes-base.deepL': 'DeepL',
	'n8n-nodes-base.demio': 'Demio',
	'n8n-nodes-base.dhl': 'DHL',
	'n8n-nodes-base.discord': 'Discord',
	'n8n-nodes-base.discourse': 'Discourse',
	'n8n-nodes-base.disqus': 'Disqus',
	'n8n-nodes-base.drift': 'Drift',
	'n8n-nodes-base.dropbox': 'Dropbox',
	'n8n-nodes-base.dropcontact': 'Dropcontact',
	'n8n-nodes-base.editImage': 'Edit Image',
	'n8n-nodes-base.egoi': 'E-goi',
	'n8n-nodes-base.elasticsearch': 'Elasticsearch',
	'n8n-nodes-base.elasticSecurity': 'Elastic Security',
	'n8n-nodes-base.emailReadImap': 'Email Trigger (IMAP)',
	'n8n-nodes-base.emailSend': 'Send Email',
	'n8n-nodes-base.emelia': 'Emelia',
	'n8n-nodes-base.emeliaTrigger': 'Emelia Trigger',
	'n8n-nodes-base.erpNext': 'ERPNext',
	'n8n-nodes-base.errorTrigger': 'Error Trigger',
	'n8n-nodes-base.evaluationTrigger': 'Evaluation Trigger',
	'n8n-nodes-base.evaluation': 'Evaluation',
	'n8n-nodes-base.eventbriteTrigger': 'Eventbrite Trigger',
	'n8n-nodes-base.executeCommand': 'Execute Command',
	'n8n-nodes-base.executeWorkflow': 'Execute Sub-workflow',
	'n8n-nodes-base.executeWorkflowTrigger': 'Execute Workflow Trigger',
	'n8n-nodes-base.executionData': 'Execution Data',
	'n8n-nodes-base.facebookGraphApi': 'Facebook Graph API',
	'n8n-nodes-base.facebookTrigger': 'Facebook Trigger',
	'n8n-nodes-base.facebookLeadAdsTrigger': 'Facebook Lead Ads Trigger',
	'n8n-nodes-base.figmaTrigger': 'Figma Trigger (Beta)',
	'n8n-nodes-base.filemaker': 'FileMaker',
	'n8n-nodes-base.readWriteFile': 'Read/Write Files from Disk',
	'n8n-nodes-base.convertToFile': 'Convert to File',
	'n8n-nodes-base.extractFromFile': 'Extract from File',
	'n8n-nodes-base.filter': 'Filter',
	'n8n-nodes-base.flow': 'Flow',
	'n8n-nodes-base.flowTrigger': 'Flow Trigger',
	'n8n-nodes-base.form': 'n8n Form',
	'n8n-nodes-base.formTrigger': 'n8n Form Trigger',
	'n8n-nodes-base.formIoTrigger': 'Form.io Trigger',
	'n8n-nodes-base.formstackTrigger': 'Formstack Trigger',
	'n8n-nodes-base.freshdesk': 'Freshdesk',
	'n8n-nodes-base.freshservice': 'Freshservice',
	'n8n-nodes-base.freshworksCrm': 'Freshworks CRM',
	'n8n-nodes-base.ftp': 'FTP',
	'n8n-nodes-base.function': 'Function',
	'n8n-nodes-base.functionItem': 'Function Item',
	'n8n-nodes-base.getResponse': 'GetResponse',
	'n8n-nodes-base.getResponseTrigger': 'GetResponse Trigger',
	'n8n-nodes-base.ghost': 'Ghost',
	'n8n-nodes-base.git': 'Git',
	'n8n-nodes-base.github': 'GitHub',
	'n8n-nodes-base.githubTrigger': 'Github Trigger',
	'n8n-nodes-base.gitlab': 'GitLab',
	'n8n-nodes-base.gitlabTrigger': 'GitLab Trigger',
	'n8n-nodes-base.gong': 'Gong',
	'n8n-nodes-base.googleAds': 'Google Ads',
	'n8n-nodes-base.googleAnalytics': 'Google Analytics',
	'n8n-nodes-base.googleBigQuery': 'Google BigQuery',
	'n8n-nodes-base.googleBooks': 'Google Books',
	'n8n-nodes-base.googleCalendar': 'Google Calendar',
	'n8n-nodes-base.googleCalendarTrigger': 'Google Calendar Trigger',
	'n8n-nodes-base.googleChat': 'Google Chat',
	'n8n-nodes-base.googleCloudNaturalLanguage': 'Google Cloud Natural Language',
	'n8n-nodes-base.googleCloudStorage': 'Google Cloud Storage',
	'n8n-nodes-base.googleContacts': 'Google Contacts',
	'n8n-nodes-base.googleDocs': 'Google Docs',
	'n8n-nodes-base.googleDrive': 'Google Drive',
	'n8n-nodes-base.googleDriveTrigger': 'Google Drive Trigger',
	'n8n-nodes-base.googleFirebaseCloudFirestore': 'Google Cloud Firestore',
	'n8n-nodes-base.googleFirebaseRealtimeDatabase': 'Google Cloud Realtime Database',
	'n8n-nodes-base.gmail': 'Gmail',
	'n8n-nodes-base.gmailTrigger': 'Gmail Trigger',
	'n8n-nodes-base.gSuiteAdmin': 'Google Workspace Admin',
	'n8n-nodes-base.googleBusinessProfile': 'Google Business Profile',
	'n8n-nodes-base.googleBusinessProfileTrigger': 'Google Business Profile Trigger',
	'n8n-nodes-base.googlePerspective': 'Google Perspective',
	'n8n-nodes-base.googleSheets': 'Google Sheets',
	'n8n-nodes-base.googleSheetsTrigger': 'Google Sheets Trigger',
	'n8n-nodes-base.googleSlides': 'Google Slides',
	'n8n-nodes-base.googleTasks': 'Google Tasks',
	'n8n-nodes-base.googleTranslate': 'Google Translate',
	'n8n-nodes-base.youTube': 'YouTube',
	'n8n-nodes-base.gotify': 'Gotify',
	'n8n-nodes-base.goToWebinar': 'GoToWebinar',
	'n8n-nodes-base.grafana': 'Grafana',
	'n8n-nodes-base.graphql': 'GraphQL',
	'n8n-nodes-base.grist': 'Grist',
	'n8n-nodes-base.gumroadTrigger': 'Gumroad Trigger',
	'n8n-nodes-base.hackerNews': 'Hacker News',
	'n8n-nodes-base.haloPSA': 'HaloPSA',
	'n8n-nodes-base.harvest': 'Harvest',
	'n8n-nodes-base.helpScout': 'Help Scout',
	'n8n-nodes-base.helpScoutTrigger': 'Help Scout Trigger',
	'n8n-nodes-base.highLevel': 'HighLevel',
	'n8n-nodes-base.homeAssistant': 'Home Assistant',
	'n8n-nodes-base.htmlExtract': 'HTML Extract',
	'n8n-nodes-base.html': 'HTML',
	'n8n-nodes-base.httpRequest': 'HTTP Request',
	'n8n-nodes-base.hubspot': 'HubSpot',
	'n8n-nodes-base.hubspotTrigger': 'HubSpot Trigger',
	'n8n-nodes-base.humanticAi': 'Humantic AI',
	'n8n-nodes-base.hunter': 'Hunter',
	'n8n-nodes-base.iCal': 'iCalendar',
	'n8n-nodes-base.if': 'If',
	'n8n-nodes-base.intercom': 'Intercom',
	'n8n-nodes-base.interval': 'Interval',
	'n8n-nodes-base.invoiceNinja': 'Invoice Ninja',
	'n8n-nodes-base.invoiceNinjaTrigger': 'Invoice Ninja Trigger',
	'n8n-nodes-base.itemLists': 'Item Lists',
	'n8n-nodes-base.iterable': 'Iterable',
	'n8n-nodes-base.jenkins': 'Jenkins',
	'n8n-nodes-base.jinaAi': 'Jina AI',
	'n8n-nodes-base.jira': 'Jira Software',
	'n8n-nodes-base.jiraTrigger': 'Jira Trigger',
	'n8n-nodes-base.jotFormTrigger': 'Jotform Trigger',
	'n8n-nodes-base.jwt': 'JWT',
	'n8n-nodes-base.kafka': 'Kafka',
	'n8n-nodes-base.kafkaTrigger': 'Kafka Trigger',
	'n8n-nodes-base.keap': 'Keap',
	'n8n-nodes-base.keapTrigger': 'Keap Trigger',
	'n8n-nodes-base.kitemaker': 'Kitemaker',
	'n8n-nodes-base.koBoToolbox': 'KoBoToolbox',
	'n8n-nodes-base.koBoToolboxTrigger': 'KoBoToolbox Trigger',
	'n8n-nodes-base.ldap': 'Ldap',
	'n8n-nodes-base.lemlist': 'Lemlist',
	'n8n-nodes-base.lemlistTrigger': 'Lemlist Trigger',
	'n8n-nodes-base.line': 'Line',
	'n8n-nodes-base.linear': 'Linear',
	'n8n-nodes-base.linearTrigger': 'Linear Trigger',
	'n8n-nodes-base.lingvaNex': 'LingvaNex',
	'n8n-nodes-base.linkedIn': 'LinkedIn',
	'n8n-nodes-base.localFileTrigger': 'Local File Trigger',
	'n8n-nodes-base.loneScaleTrigger': 'LoneScale Trigger',
	'n8n-nodes-base.loneScale': 'LoneScale',
	'n8n-nodes-base.magento2': 'Magento 2',
	'n8n-nodes-base.mailcheck': 'Mailcheck',
	'n8n-nodes-base.mailchimp': 'Mailchimp',
	'n8n-nodes-base.mailchimpTrigger': 'Mailchimp Trigger',
	'n8n-nodes-base.mailerLite': 'MailerLite',
	'n8n-nodes-base.mailerLiteTrigger': 'MailerLite Trigger',
	'n8n-nodes-base.mailgun': 'Mailgun',
	'n8n-nodes-base.mailjet': 'Mailjet',
	'n8n-nodes-base.mailjetTrigger': 'Mailjet Trigger',
	'n8n-nodes-base.mandrill': 'Mandrill',
	'n8n-nodes-base.manualTrigger': 'Manual Trigger',
	'n8n-nodes-base.markdown': 'Markdown',
	'n8n-nodes-base.marketstack': 'Marketstack',
	'n8n-nodes-base.matrix': 'Matrix',
	'n8n-nodes-base.mattermost': 'Mattermost',
	'n8n-nodes-base.mautic': 'Mautic',
	'n8n-nodes-base.mauticTrigger': 'Mautic Trigger',
	'n8n-nodes-base.medium': 'Medium',
	'n8n-nodes-base.merge': 'Merge',
	'n8n-nodes-base.messageBird': 'MessageBird',
	'n8n-nodes-base.metabase': 'Metabase',
	'n8n-nodes-base.azureCosmosDb': 'Azure Cosmos DB',
	'n8n-nodes-base.microsoftDynamicsCrm': 'Microsoft Dynamics CRM',
	'n8n-nodes-base.microsoftEntra': 'Microsoft Entra ID',
	'n8n-nodes-base.microsoftExcel': 'Microsoft Excel 365',
	'n8n-nodes-base.microsoftGraphSecurity': 'Microsoft Graph Security',
	'n8n-nodes-base.microsoftOneDrive': 'Microsoft OneDrive',
	'n8n-nodes-base.microsoftOneDriveTrigger': 'Microsoft OneDrive Trigger',
	'n8n-nodes-base.microsoftOutlook': 'Microsoft Outlook',
	'n8n-nodes-base.microsoftOutlookTrigger': 'Microsoft Outlook Trigger',
	'n8n-nodes-base.microsoftSharePoint': 'Microsoft SharePoint',
	'n8n-nodes-base.microsoftSql': 'Microsoft SQL',
	'n8n-nodes-base.azureStorage': 'Azure Storage',
	'n8n-nodes-base.microsoftTeams': 'Microsoft Teams',
	'n8n-nodes-base.microsoftTeamsTrigger': 'Microsoft Teams Trigger',
	'n8n-nodes-base.microsoftToDo': 'Microsoft To Do',
	'n8n-nodes-base.mindee': 'Mindee',
	'n8n-nodes-base.misp': 'MISP',
	'n8n-nodes-base.mistralAi': 'Mistral AI',
	'n8n-nodes-base.mocean': 'Mocean',
	'n8n-nodes-base.mondayCom': 'Monday.com',
	'n8n-nodes-base.mongoDb': 'MongoDB',
	'n8n-nodes-base.monicaCrm': 'Monica CRM',
	'n8n-nodes-base.moveBinaryData': 'Convert to/from binary data',
	'n8n-nodes-base.mqtt': 'MQTT',
	'n8n-nodes-base.mqttTrigger': 'MQTT Trigger',
	'n8n-nodes-base.msg91': 'MSG91',
	'n8n-nodes-base.mySql': 'MySQL',
	'n8n-nodes-base.n8n': 'n8n',
	'n8n-nodes-base.n8nTrainingCustomerDatastore': 'Customer Datastore (n8n training)',
	'n8n-nodes-base.n8nTrainingCustomerMessenger': 'Customer Messenger (n8n training)',
	'n8n-nodes-base.n8nTrigger': 'n8n Trigger',
	'n8n-nodes-base.nasa': 'NASA',
	'n8n-nodes-base.netlify': 'Netlify',
	'n8n-nodes-base.netlifyTrigger': 'Netlify Trigger',
	'n8n-nodes-base.nextCloud': 'Nextcloud',
	'n8n-nodes-base.nocoDb': 'NocoDB',
	'n8n-nodes-base.sendInBlue': 'Brevo',
	'n8n-nodes-base.sendInBlueTrigger': 'Brevo Trigger',
	'n8n-nodes-base.stickyNote': 'Sticky Note',
	'n8n-nodes-base.noOp': 'No Operation, do nothing',
	'n8n-nodes-base.onfleet': 'Onfleet',
	'n8n-nodes-base.onfleetTrigger': 'Onfleet Trigger',
	'n8n-nodes-base.citrixAdc': 'Netscaler ADC',
	'n8n-nodes-base.notion': 'Notion',
	'n8n-nodes-base.notionTrigger': 'Notion Trigger',
	'n8n-nodes-base.npm': 'Npm',
	'n8n-nodes-base.odoo': 'Odoo',
	'n8n-nodes-base.okta': 'Okta',
	'n8n-nodes-base.oneSimpleApi': 'One Simple API',
	'n8n-nodes-base.openAi': 'OpenAI',
	'n8n-nodes-base.openThesaurus': 'OpenThesaurus',
	'n8n-nodes-base.openWeatherMap': 'OpenWeatherMap',
	'n8n-nodes-base.oracleDatabase': 'Oracle Database',
	'n8n-nodes-base.orbit': 'Orbit',
	'n8n-nodes-base.oura': 'Oura',
	'n8n-nodes-base.paddle': 'Paddle',
	'n8n-nodes-base.pagerDuty': 'PagerDuty',
	'n8n-nodes-base.payPal': 'PayPal',
	'n8n-nodes-base.payPalTrigger': 'PayPal Trigger',
	'n8n-nodes-base.peekalink': 'Peekalink',
	'n8n-nodes-base.perplexity': 'Perplexity',
	'n8n-nodes-base.phantombuster': 'Phantombuster',
	'n8n-nodes-base.philipsHue': 'Philips Hue',
	'n8n-nodes-base.pipedrive': 'Pipedrive',
	'n8n-nodes-base.pipedriveTrigger': 'Pipedrive Trigger',
	'n8n-nodes-base.plivo': 'Plivo',
	'n8n-nodes-base.postBin': 'PostBin',
	'n8n-nodes-base.postgres': 'Postgres',
	'n8n-nodes-base.postgresTrigger': 'Postgres Trigger',
	'n8n-nodes-base.postHog': 'PostHog',
	'n8n-nodes-base.postmarkTrigger': 'Postmark Trigger',
	'n8n-nodes-base.profitWell': 'ProfitWell',
	'n8n-nodes-base.pushbullet': 'Pushbullet',
	'n8n-nodes-base.pushcut': 'Pushcut',
	'n8n-nodes-base.pushcutTrigger': 'Pushcut Trigger',
	'n8n-nodes-base.pushover': 'Pushover',
	'n8n-nodes-base.questDb': 'QuestDB',
	'n8n-nodes-base.quickbase': 'Quick Base',
	'n8n-nodes-base.quickbooks': 'QuickBooks Online',
	'n8n-nodes-base.quickChart': 'QuickChart',
	'n8n-nodes-base.rabbitmq': 'RabbitMQ',
	'n8n-nodes-base.rabbitmqTrigger': 'RabbitMQ Trigger',
	'n8n-nodes-base.raindrop': 'Raindrop',
	'n8n-nodes-base.readBinaryFile': 'Read Binary File',
	'n8n-nodes-base.readBinaryFiles': 'Read Binary Files',
	'n8n-nodes-base.readPDF': 'Read PDF',
	'n8n-nodes-base.reddit': 'Reddit',
	'n8n-nodes-base.redis': 'Redis',
	'n8n-nodes-base.redisTrigger': 'Redis Trigger',
	'n8n-nodes-base.renameKeys': 'Rename Keys',
	'n8n-nodes-base.respondToWebhook': 'Respond to Webhook',
	'n8n-nodes-base.rocketchat': 'RocketChat',
	'n8n-nodes-base.rssFeedRead': 'RSS Read',
	'n8n-nodes-base.rssFeedReadTrigger': 'RSS Feed Trigger',
	'n8n-nodes-base.rundeck': 'Rundeck',
	'n8n-nodes-base.s3': 'S3',
	'n8n-nodes-base.salesforce': 'Salesforce',
	'n8n-nodes-base.salesforceTrigger': 'Salesforce Trigger',
	'n8n-nodes-base.salesmate': 'Salesmate',
	'n8n-nodes-base.scheduleTrigger': 'Schedule Trigger',
	'n8n-nodes-base.seaTable': 'SeaTable',
	'n8n-nodes-base.seaTableTrigger': 'SeaTable Trigger',
	'n8n-nodes-base.securityScorecard': 'SecurityScorecard',
	'n8n-nodes-base.segment': 'Segment',
	'n8n-nodes-base.sendGrid': 'SendGrid',
	'n8n-nodes-base.sendy': 'Sendy',
	'n8n-nodes-base.sentryIo': 'Sentry.io',
	'n8n-nodes-base.serviceNow': 'ServiceNow',
	'n8n-nodes-base.set': 'Edit Fields (Set)',
	'n8n-nodes-base.shopify': 'Shopify',
	'n8n-nodes-base.shopifyTrigger': 'Shopify Trigger',
	'n8n-nodes-base.signl4': 'SIGNL4',
	'n8n-nodes-base.simulate': 'Simulate',
	'n8n-nodes-base.simulateTrigger': 'Simulate Trigger',
	'n8n-nodes-base.slack': 'Slack',
	'n8n-nodes-base.slackTrigger': 'Slack Trigger',
	'n8n-nodes-base.sms77': 'seven',
	'n8n-nodes-base.snowflake': 'Snowflake',
	'n8n-nodes-base.splitInBatches': 'Loop Over Items (Split in Batches)',
	'n8n-nodes-base.splunk': 'Splunk',
	'n8n-nodes-base.spontit': 'Spontit',
	'n8n-nodes-base.spotify': 'Spotify',
	'n8n-nodes-base.spreadsheetFile': 'Spreadsheet File',
	'n8n-nodes-base.sseTrigger': 'SSE Trigger',
	'n8n-nodes-base.ssh': 'SSH',
	'n8n-nodes-base.stackby': 'Stackby',
	'n8n-nodes-base.start': 'Start',
	'n8n-nodes-base.stopAndError': 'Stop and Error',
	'n8n-nodes-base.storyblok': 'Storyblok',
	'n8n-nodes-base.strapi': 'Strapi',
	'n8n-nodes-base.strava': 'Strava',
	'n8n-nodes-base.stravaTrigger': 'Strava Trigger',
	'n8n-nodes-base.stripe': 'Stripe',
	'n8n-nodes-base.stripeTrigger': 'Stripe Trigger',
	'n8n-nodes-base.supabase': 'Supabase',
	'n8n-nodes-base.surveyMonkeyTrigger': 'SurveyMonkey Trigger',
	'n8n-nodes-base.switch': 'Switch',
	'n8n-nodes-base.syncroMsp': 'SyncroMSP',
	'n8n-nodes-base.taiga': 'Taiga',
	'n8n-nodes-base.taigaTrigger': 'Taiga Trigger',
	'n8n-nodes-base.tapfiliate': 'Tapfiliate',
	'n8n-nodes-base.telegram': 'Telegram',
	'n8n-nodes-base.telegramTrigger': 'Telegram Trigger',
	'n8n-nodes-base.theHiveProject': 'TheHive 5',
	'n8n-nodes-base.theHiveProjectTrigger': 'TheHive 5 Trigger',
	'n8n-nodes-base.theHive': 'TheHive',
	'n8n-nodes-base.theHiveTrigger': 'TheHive Trigger',
	'n8n-nodes-base.timescaleDb': 'TimescaleDB',
	'n8n-nodes-base.todoist': 'Todoist',
	'n8n-nodes-base.togglTrigger': 'Toggl Trigger',
	'n8n-nodes-base.totp': 'TOTP',
	'n8n-nodes-base.travisCi': 'TravisCI',
	'n8n-nodes-base.trello': 'Trello',
	'n8n-nodes-base.trelloTrigger': 'Trello Trigger',
	'n8n-nodes-base.twake': 'Twake',
	'n8n-nodes-base.twilio': 'Twilio',
	'n8n-nodes-base.twilioTrigger': 'Twilio Trigger',
	'n8n-nodes-base.twist': 'Twist',
	'n8n-nodes-base.twitter': 'X (Formerly Twitter)',
	'n8n-nodes-base.typeformTrigger': 'Typeform Trigger',
	'n8n-nodes-base.unleashedSoftware': 'Unleashed Software',
	'n8n-nodes-base.uplead': 'Uplead',
	'n8n-nodes-base.uproc': 'uProc',
	'n8n-nodes-base.uptimeRobot': 'UptimeRobot',
	'n8n-nodes-base.urlScanIo': 'urlscan.io',
	'n8n-nodes-base.vero': 'Vero',
	'n8n-nodes-base.venafiTlsProtectCloud': 'Venafi TLS Protect Cloud',
	'n8n-nodes-base.venafiTlsProtectCloudTrigger': 'Venafi TLS Protect Cloud Trigger',
	'n8n-nodes-base.venafiTlsProtectDatacenter': 'Venafi TLS Protect Datacenter',
	'n8n-nodes-base.vonage': 'Vonage',
	'n8n-nodes-base.wait': 'Wait',
	'n8n-nodes-base.webflow': 'Webflow',
	'n8n-nodes-base.webflowTrigger': 'Webflow Trigger',
	'n8n-nodes-base.webhook': 'Webhook',
	'n8n-nodes-base.wekan': 'Wekan',
	'n8n-nodes-base.whatsAppTrigger': 'WhatsApp Trigger',
	'n8n-nodes-base.whatsApp': 'WhatsApp Business Cloud',
	'n8n-nodes-base.wise': 'Wise',
	'n8n-nodes-base.wiseTrigger': 'Wise Trigger',
	'n8n-nodes-base.wooCommerce': 'WooCommerce',
	'n8n-nodes-base.wooCommerceTrigger': 'WooCommerce Trigger',
	'n8n-nodes-base.wordpress': 'Wordpress',
	'n8n-nodes-base.workableTrigger': 'Workable Trigger',
	'n8n-nodes-base.workflowTrigger': 'Workflow Trigger',
	'n8n-nodes-base.writeBinaryFile': 'Write Binary File',
	'n8n-nodes-base.wufooTrigger': 'Wufoo Trigger',
	'n8n-nodes-base.xero': 'Xero',
	'n8n-nodes-base.xml': 'XML',
	'n8n-nodes-base.yourls': 'Yourls',
	'n8n-nodes-base.zammad': 'Zammad',
	'n8n-nodes-base.zendesk': 'Zendesk',
	'n8n-nodes-base.zendeskTrigger': 'Zendesk Trigger',
	'n8n-nodes-base.zohoCrm': 'Zoho CRM',
	'n8n-nodes-base.zoom': 'Zoom',
	'n8n-nodes-base.zulip': 'Zulip',
	'n8n-nodes-base.aggregate': 'Aggregate',
	'n8n-nodes-base.limit': 'Limit',
	'n8n-nodes-base.removeDuplicates': 'Remove Duplicates',
	'n8n-nodes-base.splitOut': 'Split Out',
	'n8n-nodes-base.sort': 'Sort',
	'n8n-nodes-base.summarize': 'Summarize',
	'@n8n/n8n-nodes-langchain.anthropic': 'Anthropic',
	'@n8n/n8n-nodes-langchain.googleGemini': 'Google Gemini',
	'@n8n/n8n-nodes-langchain.ollama': 'Ollama',
	'@n8n/n8n-nodes-langchain.openAi': 'OpenAI',
	'@n8n/n8n-nodes-langchain.agent': 'AI Agent',
	'@n8n/n8n-nodes-langchain.agentTool': 'AI Agent Tool',
	'@n8n/n8n-nodes-langchain.openAiAssistant': 'OpenAI Assistant',
	'@n8n/n8n-nodes-langchain.chainSummarization': 'Summarization Chain',
	'@n8n/n8n-nodes-langchain.chainLlm': 'Basic LLM Chain',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa': 'Question and Answer Chain',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis': 'Sentiment Analysis',
	'@n8n/n8n-nodes-langchain.informationExtractor': 'Information Extractor',
	'@n8n/n8n-nodes-langchain.textClassifier': 'Text Classifier',
	'@n8n/n8n-nodes-langchain.code': 'LangChain Code',
	'@n8n/n8n-nodes-langchain.documentDefaultDataLoader': 'Default Data Loader',
	'@n8n/n8n-nodes-langchain.documentBinaryInputLoader': 'Binary Input Loader',
	'@n8n/n8n-nodes-langchain.documentGithubLoader': 'GitHub Document Loader',
	'@n8n/n8n-nodes-langchain.documentJsonInputLoader': 'JSON Input Loader',
	'@n8n/n8n-nodes-langchain.embeddingsCohere': 'Embeddings Cohere',
	'@n8n/n8n-nodes-langchain.embeddingsAwsBedrock': 'Embeddings AWS Bedrock',
	'@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi': 'Embeddings Azure OpenAI',
	'@n8n/n8n-nodes-langchain.embeddingsGoogleGemini': 'Embeddings Google Gemini',
	'@n8n/n8n-nodes-langchain.embeddingsGoogleVertex': 'Embeddings Google Vertex',
	'@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference': 'Embeddings Hugging Face Inference',
	'@n8n/n8n-nodes-langchain.embeddingsMistralCloud': 'Embeddings Mistral Cloud',
	'@n8n/n8n-nodes-langchain.embeddingsOpenAi': 'Embeddings OpenAI',
	'@n8n/n8n-nodes-langchain.embeddingsLemonade': 'Embeddings Lemonade',
	'@n8n/n8n-nodes-langchain.embeddingsOllama': 'Embeddings Ollama',
	'@n8n/n8n-nodes-langchain.lmChatAnthropic': 'Anthropic Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi': 'Azure OpenAI Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatAwsBedrock': 'AWS Bedrock Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatCohere': 'Cohere Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatDeepSeek': 'DeepSeek Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatGoogleGemini': 'Google Gemini Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatGoogleVertex': 'Google Vertex Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatGroq': 'Groq Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatMistralCloud': 'Mistral Cloud Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatLemonade': 'Lemonade Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatOllama': 'Ollama Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatOpenRouter': 'OpenRouter Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatVercelAiGateway': 'Vercel AI Gateway Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatXAiGrok': 'xAI Grok Chat Model',
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': 'OpenAI Chat Model',
	'@n8n/n8n-nodes-langchain.lmOpenAi': 'OpenAI Model',
	'@n8n/n8n-nodes-langchain.lmCohere': 'Cohere Model',
	'@n8n/n8n-nodes-langchain.lmLemonade': 'Lemonade Model',
	'@n8n/n8n-nodes-langchain.lmOllama': 'Ollama Model',
	'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference': 'Hugging Face Inference Model',
	'@n8n/n8n-nodes-langchain.mcpClientTool': 'MCP Client Tool',
	'@n8n/n8n-nodes-langchain.mcpTrigger': 'MCP Server Trigger',
	'@n8n/n8n-nodes-langchain.memoryBufferWindow': 'Simple Memory',
	'@n8n/n8n-nodes-langchain.memoryMotorhead': 'Motorhead',
	'@n8n/n8n-nodes-langchain.memoryPostgresChat': 'Postgres Chat Memory',
	'@n8n/n8n-nodes-langchain.memoryMongoDbChat': 'MongoDB Chat Memory',
	'@n8n/n8n-nodes-langchain.memoryRedisChat': 'Redis Chat Memory',
	'@n8n/n8n-nodes-langchain.memoryManager': 'Chat Memory Manager',
	'@n8n/n8n-nodes-langchain.memoryChatRetriever': 'Chat Messages Retriever',
	'@n8n/n8n-nodes-langchain.memoryXata': 'Xata',
	'@n8n/n8n-nodes-langchain.memoryZep': 'Zep',
	'@n8n/n8n-nodes-langchain.outputParserAutofixing': 'Auto-fixing Output Parser',
	'@n8n/n8n-nodes-langchain.outputParserItemList': 'Item List Output Parser',
	'@n8n/n8n-nodes-langchain.outputParserStructured': 'Structured Output Parser',
	'@n8n/n8n-nodes-langchain.rerankerCohere': 'Reranker Cohere',
	'@n8n/n8n-nodes-langchain.retrieverContextualCompression': 'Contextual Compression Retriever',
	'@n8n/n8n-nodes-langchain.retrieverVectorStore': 'Vector Store Retriever',
	'@n8n/n8n-nodes-langchain.retrieverMultiQuery': 'MultiQuery Retriever',
	'@n8n/n8n-nodes-langchain.retrieverWorkflow': 'Workflow Retriever',
	'@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter': 'Character Text Splitter',
	'@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter':
		'Recursive Character Text Splitter',
	'@n8n/n8n-nodes-langchain.textSplitterTokenSplitter': 'Token Splitter',
	'@n8n/n8n-nodes-langchain.toolCalculator': 'Calculator',
	'@n8n/n8n-nodes-langchain.toolCode': 'Code Tool',
	'@n8n/n8n-nodes-langchain.toolHttpRequest': 'HTTP Request Tool',
	'@n8n/n8n-nodes-langchain.toolSearXng': 'SearXNG',
	'@n8n/n8n-nodes-langchain.toolSerpApi': 'SerpApi (Google Search)',
	'@n8n/n8n-nodes-langchain.toolThink': 'Think Tool',
	'@n8n/n8n-nodes-langchain.toolVectorStore': 'Vector Store Question Answer Tool',
	'@n8n/n8n-nodes-langchain.toolWikipedia': 'Wikipedia',
	'@n8n/n8n-nodes-langchain.toolWolframAlpha': 'Wolfram|Alpha',
	'@n8n/n8n-nodes-langchain.toolWorkflow': 'Call n8n Workflow Tool',
	'@n8n/n8n-nodes-langchain.manualChatTrigger': 'Manual Chat Trigger',
	'@n8n/n8n-nodes-langchain.chatTrigger': 'Chat Trigger',
	'@n8n/n8n-nodes-langchain.chat': 'Respond to Chat',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory': 'Simple Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemoryInsert': 'In Memory Vector Store Insert',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemoryLoad': 'In Memory Vector Store Load',
	'@n8n/n8n-nodes-langchain.vectorStoreMilvus': 'Milvus Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas': 'MongoDB Atlas Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStorePGVector': 'Postgres PGVector Store',
	'@n8n/n8n-nodes-langchain.vectorStorePinecone': 'Pinecone Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStorePineconeInsert': 'Pinecone: Insert',
	'@n8n/n8n-nodes-langchain.vectorStorePineconeLoad': 'Pinecone: Load',
	'@n8n/n8n-nodes-langchain.vectorStoreRedis': 'Redis Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreQdrant': 'Qdrant Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreSupabase': 'Supabase Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreSupabaseInsert': 'Supabase: Insert',
	'@n8n/n8n-nodes-langchain.vectorStoreSupabaseLoad': 'Supabase: Load',
	'@n8n/n8n-nodes-langchain.vectorStoreWeaviate': 'Weaviate Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreZep': 'Zep Vector Store',
	'@n8n/n8n-nodes-langchain.vectorStoreZepInsert': 'Zep Vector Store: Insert',
	'@n8n/n8n-nodes-langchain.vectorStoreZepLoad': 'Zep Vector Store: Load',
	'@n8n/n8n-nodes-langchain.toolExecutor': 'Tool Executor',
	'@n8n/n8n-nodes-langchain.modelSelector': 'Model Selector',
	'n8n-nodes-base.actionNetworkTool': 'Action Network Tool',
	'n8n-nodes-base.activeCampaignTool': 'ActiveCampaign Tool',
	'n8n-nodes-base.adaloTool': 'Adalo Tool',
	'n8n-nodes-base.affinityTool': 'Affinity Tool',
	'n8n-nodes-base.agileCrmTool': 'Agile CRM Tool',
	'n8n-nodes-base.airtableTool': 'Airtable Tool',
	'n8n-nodes-base.airtopTool': 'Airtop Tool',
	'n8n-nodes-base.amqpTool': 'AMQP Sender Tool',
	'n8n-nodes-base.apiTemplateIoTool': 'APITemplate.io Tool',
	'n8n-nodes-base.asanaTool': 'Asana Tool',
	'n8n-nodes-base.autopilotTool': 'Autopilot Tool',
	'n8n-nodes-base.awsLambdaTool': 'AWS Lambda Tool',
	'n8n-nodes-base.awsSnsTool': 'AWS SNS Tool',
	'n8n-nodes-base.awsS3Tool': 'AWS S3 Tool',
	'n8n-nodes-base.awsSesTool': 'AWS SES Tool',
	'n8n-nodes-base.awsTextractTool': 'AWS Textract Tool',
	'n8n-nodes-base.awsTranscribeTool': 'AWS Transcribe Tool',
	'n8n-nodes-base.bambooHrTool': 'BambooHR Tool',
	'n8n-nodes-base.baserowTool': 'Baserow Tool',
	'n8n-nodes-base.beeminderTool': 'Beeminder Tool',
	'n8n-nodes-base.bitlyTool': 'Bitly Tool',
	'n8n-nodes-base.bitwardenTool': 'Bitwarden Tool',
	'n8n-nodes-base.BrandfetchTool': 'Brandfetch Tool',
	'n8n-nodes-base.bubbleTool': 'Bubble Tool',
	'n8n-nodes-base.chargebeeTool': 'Chargebee Tool',
	'n8n-nodes-base.circleCiTool': 'CircleCI Tool',
	'n8n-nodes-base.ciscoWebexTool': 'Webex by Cisco Tool',
	'n8n-nodes-base.cloudflareTool': 'Cloudflare Tool',
	'n8n-nodes-base.clearbitTool': 'Clearbit Tool',
	'n8n-nodes-base.clickUpTool': 'ClickUp Tool',
	'n8n-nodes-base.clockifyTool': 'Clockify Tool',
	'n8n-nodes-base.cockpitTool': 'Cockpit Tool',
	'n8n-nodes-base.codaTool': 'Coda Tool',
	'n8n-nodes-base.coinGeckoTool': 'CoinGecko Tool',
	'n8n-nodes-base.compressionTool': 'Compression Tool',
	'n8n-nodes-base.contentfulTool': 'Contentful Tool',
	'n8n-nodes-base.convertKitTool': 'ConvertKit Tool',
	'n8n-nodes-base.copperTool': 'Copper Tool',
	'n8n-nodes-base.crateDbTool': 'CrateDB Tool',
	'n8n-nodes-base.crowdDevTool': 'crowd.dev Tool',
	'n8n-nodes-base.cryptoTool': 'Crypto Tool',
	'n8n-nodes-base.customerIoTool': 'Customer.io Tool',
	'n8n-nodes-base.dataTableTool': 'Data table Tool',
	'n8n-nodes-base.dateTimeTool': 'Date & Time Tool',
	'n8n-nodes-base.deepLTool': 'DeepL Tool',
	'n8n-nodes-base.demioTool': 'Demio Tool',
	'n8n-nodes-base.dhlTool': 'DHL Tool',
	'n8n-nodes-base.discordTool': 'Discord Tool',
	'n8n-nodes-base.discourseTool': 'Discourse Tool',
	'n8n-nodes-base.driftTool': 'Drift Tool',
	'n8n-nodes-base.dropboxTool': 'Dropbox Tool',
	'n8n-nodes-base.dropcontactTool': 'Dropcontact Tool',
	'n8n-nodes-base.egoiTool': 'E-goi Tool',
	'n8n-nodes-base.elasticsearchTool': 'Elasticsearch Tool',
	'n8n-nodes-base.elasticSecurityTool': 'Elastic Security Tool',
	'n8n-nodes-base.emailReadImapTool': 'Email Trigger (IMAP) Tool',
	'n8n-nodes-base.emailSendTool': 'Send Email Tool',
	'n8n-nodes-base.emeliaTool': 'Emelia Tool',
	'n8n-nodes-base.erpNextTool': 'ERPNext Tool',
	'n8n-nodes-base.executeCommandTool': 'Execute Command Tool',
	'n8n-nodes-base.facebookGraphApiTool': 'Facebook Graph API Tool',
	'n8n-nodes-base.filemakerTool': 'FileMaker Tool',
	'n8n-nodes-base.freshdeskTool': 'Freshdesk Tool',
	'n8n-nodes-base.freshserviceTool': 'Freshservice Tool',
	'n8n-nodes-base.freshworksCrmTool': 'Freshworks CRM Tool',
	'n8n-nodes-base.getResponseTool': 'GetResponse Tool',
	'n8n-nodes-base.ghostTool': 'Ghost Tool',
	'n8n-nodes-base.gitTool': 'Git Tool',
	'n8n-nodes-base.githubTool': 'GitHub Tool',
	'n8n-nodes-base.gitlabTool': 'GitLab Tool',
	'n8n-nodes-base.gongTool': 'Gong Tool',
	'n8n-nodes-base.googleAdsTool': 'Google Ads Tool',
	'n8n-nodes-base.googleAnalyticsTool': 'Google Analytics Tool',
	'n8n-nodes-base.googleBigQueryTool': 'Google BigQuery Tool',
	'n8n-nodes-base.googleBooksTool': 'Google Books Tool',
	'n8n-nodes-base.googleCalendarTool': 'Google Calendar Tool',
	'n8n-nodes-base.googleChatTool': 'Google Chat Tool',
	'n8n-nodes-base.googleCloudNaturalLanguageTool': 'Google Cloud Natural Language Tool',
	'n8n-nodes-base.googleCloudStorageTool': 'Google Cloud Storage Tool',
	'n8n-nodes-base.googleContactsTool': 'Google Contacts Tool',
	'n8n-nodes-base.googleDocsTool': 'Google Docs Tool',
	'n8n-nodes-base.googleDriveTool': 'Google Drive Tool',
	'n8n-nodes-base.googleFirebaseCloudFirestoreTool': 'Google Cloud Firestore Tool',
	'n8n-nodes-base.googleFirebaseRealtimeDatabaseTool': 'Google Cloud Realtime Database Tool',
	'n8n-nodes-base.gmailTool': 'Gmail Tool',
	'n8n-nodes-base.gSuiteAdminTool': 'Google Workspace Admin Tool',
	'n8n-nodes-base.googleBusinessProfileTool': 'Google Business Profile Tool',
	'n8n-nodes-base.googlePerspectiveTool': 'Google Perspective Tool',
	'n8n-nodes-base.googleSheetsTool': 'Google Sheets Tool',
	'n8n-nodes-base.googleSlidesTool': 'Google Slides Tool',
	'n8n-nodes-base.googleTasksTool': 'Google Tasks Tool',
	'n8n-nodes-base.googleTranslateTool': 'Google Translate Tool',
	'n8n-nodes-base.youTubeTool': 'YouTube Tool',
	'n8n-nodes-base.gotifyTool': 'Gotify Tool',
	'n8n-nodes-base.goToWebinarTool': 'GoToWebinar Tool',
	'n8n-nodes-base.grafanaTool': 'Grafana Tool',
	'n8n-nodes-base.graphqlTool': 'GraphQL Tool',
	'n8n-nodes-base.gristTool': 'Grist Tool',
	'n8n-nodes-base.hackerNewsTool': 'Hacker News Tool',
	'n8n-nodes-base.haloPSATool': 'HaloPSA Tool',
	'n8n-nodes-base.harvestTool': 'Harvest Tool',
	'n8n-nodes-base.helpScoutTool': 'Help Scout Tool',
	'n8n-nodes-base.highLevelTool': 'HighLevel Tool',
	'n8n-nodes-base.homeAssistantTool': 'Home Assistant Tool',
	'n8n-nodes-base.httpRequestTool': 'HTTP Request Tool',
	'n8n-nodes-base.hubspotTool': 'HubSpot Tool',
	'n8n-nodes-base.humanticAiTool': 'Humantic AI Tool',
	'n8n-nodes-base.hunterTool': 'Hunter Tool',
	'n8n-nodes-base.intercomTool': 'Intercom Tool',
	'n8n-nodes-base.invoiceNinjaTool': 'Invoice Ninja Tool',
	'n8n-nodes-base.iterableTool': 'Iterable Tool',
	'n8n-nodes-base.jenkinsTool': 'Jenkins Tool',
	'n8n-nodes-base.jinaAiTool': 'Jina AI Tool',
	'n8n-nodes-base.jiraTool': 'Jira Software Tool',
	'n8n-nodes-base.jwtTool': 'JWT Tool',
	'n8n-nodes-base.kafkaTool': 'Kafka Tool',
	'n8n-nodes-base.keapTool': 'Keap Tool',
	'n8n-nodes-base.kitemakerTool': 'Kitemaker Tool',
	'n8n-nodes-base.koBoToolboxTool': 'KoBoToolbox Tool',
	'n8n-nodes-base.ldapTool': 'Ldap Tool',
	'n8n-nodes-base.lemlistTool': 'Lemlist Tool',
	'n8n-nodes-base.lineTool': 'Line Tool',
	'n8n-nodes-base.linearTool': 'Linear Tool',
	'n8n-nodes-base.lingvaNexTool': 'LingvaNex Tool',
	'n8n-nodes-base.linkedInTool': 'LinkedIn Tool',
	'n8n-nodes-base.loneScaleTool': 'LoneScale Tool',
	'n8n-nodes-base.magento2Tool': 'Magento 2 Tool',
	'n8n-nodes-base.mailcheckTool': 'Mailcheck Tool',
	'n8n-nodes-base.mailchimpTool': 'Mailchimp Tool',
	'n8n-nodes-base.mailerLiteTool': 'MailerLite Tool',
	'n8n-nodes-base.mailgunTool': 'Mailgun Tool',
	'n8n-nodes-base.mailjetTool': 'Mailjet Tool',
	'n8n-nodes-base.mandrillTool': 'Mandrill Tool',
	'n8n-nodes-base.marketstackTool': 'Marketstack Tool',
	'n8n-nodes-base.matrixTool': 'Matrix Tool',
	'n8n-nodes-base.mattermostTool': 'Mattermost Tool',
	'n8n-nodes-base.mauticTool': 'Mautic Tool',
	'n8n-nodes-base.mediumTool': 'Medium Tool',
	'n8n-nodes-base.messageBirdTool': 'MessageBird Tool',
	'n8n-nodes-base.metabaseTool': 'Metabase Tool',
	'n8n-nodes-base.microsoftDynamicsCrmTool': 'Microsoft Dynamics CRM Tool',
	'n8n-nodes-base.microsoftEntraTool': 'Microsoft Entra ID Tool',
	'n8n-nodes-base.microsoftExcelTool': 'Microsoft Excel 365 Tool',
	'n8n-nodes-base.microsoftGraphSecurityTool': 'Microsoft Graph Security Tool',
	'n8n-nodes-base.microsoftOneDriveTool': 'Microsoft OneDrive Tool',
	'n8n-nodes-base.microsoftOutlookTool': 'Microsoft Outlook Tool',
	'n8n-nodes-base.microsoftSharePointTool': 'Microsoft SharePoint Tool',
	'n8n-nodes-base.microsoftSqlTool': 'Microsoft SQL Tool',
	'n8n-nodes-base.microsoftTeamsTool': 'Microsoft Teams Tool',
	'n8n-nodes-base.microsoftToDoTool': 'Microsoft To Do Tool',
	'n8n-nodes-base.mispTool': 'MISP Tool',
	'n8n-nodes-base.mistralAiTool': 'Mistral AI Tool',
	'n8n-nodes-base.moceanTool': 'Mocean Tool',
	'n8n-nodes-base.mondayComTool': 'Monday.com Tool',
	'n8n-nodes-base.mongoDbTool': 'MongoDB Tool',
	'n8n-nodes-base.monicaCrmTool': 'Monica CRM Tool',
	'n8n-nodes-base.mqttTool': 'MQTT Tool',
	'n8n-nodes-base.msg91Tool': 'MSG91 Tool',
	'n8n-nodes-base.mySqlTool': 'MySQL Tool',
	'n8n-nodes-base.nasaTool': 'NASA Tool',
	'n8n-nodes-base.netlifyTool': 'Netlify Tool',
	'n8n-nodes-base.nextCloudTool': 'Nextcloud Tool',
	'n8n-nodes-base.nocoDbTool': 'NocoDB Tool',
	'n8n-nodes-base.sendInBlueTool': 'Brevo Tool',
	'n8n-nodes-base.onfleetTool': 'Onfleet Tool',
	'n8n-nodes-base.notionTool': 'Notion Tool',
	'n8n-nodes-base.npmTool': 'Npm Tool',
	'n8n-nodes-base.odooTool': 'Odoo Tool',
	'n8n-nodes-base.oktaTool': 'Okta Tool',
	'n8n-nodes-base.oneSimpleApiTool': 'One Simple API Tool',
	'n8n-nodes-base.openThesaurusTool': 'OpenThesaurus Tool',
	'n8n-nodes-base.openWeatherMapTool': 'OpenWeatherMap Tool',
	'n8n-nodes-base.oracleDatabaseTool': 'Oracle Database Tool',
	'n8n-nodes-base.ouraTool': 'Oura Tool',
	'n8n-nodes-base.paddleTool': 'Paddle Tool',
	'n8n-nodes-base.pagerDutyTool': 'PagerDuty Tool',
	'n8n-nodes-base.peekalinkTool': 'Peekalink Tool',
	'n8n-nodes-base.perplexityTool': 'Perplexity Tool',
	'n8n-nodes-base.phantombusterTool': 'Phantombuster Tool',
	'n8n-nodes-base.philipsHueTool': 'Philips Hue Tool',
	'n8n-nodes-base.pipedriveTool': 'Pipedrive Tool',
	'n8n-nodes-base.plivoTool': 'Plivo Tool',
	'n8n-nodes-base.postBinTool': 'PostBin Tool',
	'n8n-nodes-base.postgresTool': 'Postgres Tool',
	'n8n-nodes-base.postHogTool': 'PostHog Tool',
	'n8n-nodes-base.profitWellTool': 'ProfitWell Tool',
	'n8n-nodes-base.pushbulletTool': 'Pushbullet Tool',
	'n8n-nodes-base.pushcutTool': 'Pushcut Tool',
	'n8n-nodes-base.pushoverTool': 'Pushover Tool',
	'n8n-nodes-base.questDbTool': 'QuestDB Tool',
	'n8n-nodes-base.quickbaseTool': 'Quick Base Tool',
	'n8n-nodes-base.quickbooksTool': 'QuickBooks Online Tool',
	'n8n-nodes-base.quickChartTool': 'QuickChart Tool',
	'n8n-nodes-base.rabbitmqTool': 'RabbitMQ Tool',
	'n8n-nodes-base.raindropTool': 'Raindrop Tool',
	'n8n-nodes-base.redditTool': 'Reddit Tool',
	'n8n-nodes-base.redisTool': 'Redis Tool',
	'n8n-nodes-base.rocketchatTool': 'RocketChat Tool',
	'n8n-nodes-base.rssFeedReadTool': 'RSS Read Tool',
	'n8n-nodes-base.rundeckTool': 'Rundeck Tool',
	'n8n-nodes-base.s3Tool': 'S3 Tool',
	'n8n-nodes-base.salesforceTool': 'Salesforce Tool',
	'n8n-nodes-base.salesmateTool': 'Salesmate Tool',
	'n8n-nodes-base.seaTableTool': 'SeaTable Tool',
	'n8n-nodes-base.securityScorecardTool': 'SecurityScorecard Tool',
	'n8n-nodes-base.segmentTool': 'Segment Tool',
	'n8n-nodes-base.sendGridTool': 'SendGrid Tool',
	'n8n-nodes-base.sendyTool': 'Sendy Tool',
	'n8n-nodes-base.sentryIoTool': 'Sentry.io Tool',
	'n8n-nodes-base.serviceNowTool': 'ServiceNow Tool',
	'n8n-nodes-base.shopifyTool': 'Shopify Tool',
	'n8n-nodes-base.signl4Tool': 'SIGNL4 Tool',
	'n8n-nodes-base.slackTool': 'Slack Tool',
	'n8n-nodes-base.sms77Tool': 'seven Tool',
	'n8n-nodes-base.snowflakeTool': 'Snowflake Tool',
	'n8n-nodes-base.splunkTool': 'Splunk Tool',
	'n8n-nodes-base.spontitTool': 'Spontit Tool',
	'n8n-nodes-base.spotifyTool': 'Spotify Tool',
	'n8n-nodes-base.stackbyTool': 'Stackby Tool',
	'n8n-nodes-base.storyblokTool': 'Storyblok Tool',
	'n8n-nodes-base.strapiTool': 'Strapi Tool',
	'n8n-nodes-base.stravaTool': 'Strava Tool',
	'n8n-nodes-base.stripeTool': 'Stripe Tool',
	'n8n-nodes-base.supabaseTool': 'Supabase Tool',
	'n8n-nodes-base.syncroMspTool': 'SyncroMSP Tool',
	'n8n-nodes-base.taigaTool': 'Taiga Tool',
	'n8n-nodes-base.tapfiliateTool': 'Tapfiliate Tool',
	'n8n-nodes-base.telegramTool': 'Telegram Tool',
	'n8n-nodes-base.theHiveProjectTool': 'TheHive 5 Tool',
	'n8n-nodes-base.theHiveTool': 'TheHive Tool',
	'n8n-nodes-base.timescaleDbTool': 'TimescaleDB Tool',
	'n8n-nodes-base.todoistTool': 'Todoist Tool',
	'n8n-nodes-base.totpTool': 'TOTP Tool',
	'n8n-nodes-base.travisCiTool': 'TravisCI Tool',
	'n8n-nodes-base.trelloTool': 'Trello Tool',
	'n8n-nodes-base.twakeTool': 'Twake Tool',
	'n8n-nodes-base.twilioTool': 'Twilio Tool',
	'n8n-nodes-base.twistTool': 'Twist Tool',
	'n8n-nodes-base.twitterTool': 'X (Formerly Twitter) Tool',
	'n8n-nodes-base.unleashedSoftwareTool': 'Unleashed Software Tool',
	'n8n-nodes-base.upleadTool': 'Uplead Tool',
	'n8n-nodes-base.uprocTool': 'uProc Tool',
	'n8n-nodes-base.uptimeRobotTool': 'UptimeRobot Tool',
	'n8n-nodes-base.urlScanIoTool': 'urlscan.io Tool',
	'n8n-nodes-base.veroTool': 'Vero Tool',
	'n8n-nodes-base.venafiTlsProtectCloudTool': 'Venafi TLS Protect Cloud Tool',
	'n8n-nodes-base.venafiTlsProtectDatacenterTool': 'Venafi TLS Protect Datacenter Tool',
	'n8n-nodes-base.vonageTool': 'Vonage Tool',
	'n8n-nodes-base.webflowTool': 'Webflow Tool',
	'n8n-nodes-base.wekanTool': 'Wekan Tool',
	'n8n-nodes-base.whatsAppTool': 'WhatsApp Business Cloud Tool',
	'n8n-nodes-base.wooCommerceTool': 'WooCommerce Tool',
	'n8n-nodes-base.wordpressTool': 'Wordpress Tool',
	'n8n-nodes-base.xeroTool': 'Xero Tool',
	'n8n-nodes-base.yourlsTool': 'Yourls Tool',
	'n8n-nodes-base.zammadTool': 'Zammad Tool',
	'n8n-nodes-base.zendeskTool': 'Zendesk Tool',
	'n8n-nodes-base.zohoCrmTool': 'Zoho CRM Tool',
	'n8n-nodes-base.zoomTool': 'Zoom Tool',
	'n8n-nodes-base.zulipTool': 'Zulip Tool',
	'@n8n/n8n-nodes-langchain.anthropicTool': 'Anthropic Tool',
	'@n8n/n8n-nodes-langchain.googleGeminiTool': 'Google Gemini Tool',
	'@n8n/n8n-nodes-langchain.ollamaTool': 'Ollama Tool',
};

// ===== Node Parameter Interfaces =====

export interface ActionNetworkParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'attendance'
		| 'event'
		| 'person'
		| 'personTag'
		| 'petition'
		| 'signature'
		| 'tag'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Person ID */
	personId?: string;
	/** Event ID */
	eventId?: string;
	/** Simplify */
	simple?: boolean;
	/** Attendance ID */
	attendanceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Origin System */
	originSystem?: string;
	/** Title */
	title?: string;
	/** Email Address */
	email_addresses?: Record<string, unknown>;
	/** Petition ID */
	petitionId?: string;
	/** Signature ID */
	signatureId?: string;
	/** Name */
	name?: string;
	/** Tag ID */
	tagId?: string;
	/** Tagging Name or ID */
	taggingId?: string;
}

export interface ActiveCampaignParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'account'
		| 'accountContact'
		| 'connection'
		| 'contact'
		| 'contactList'
		| 'contactTag'
		| 'deal'
		| 'ecommerceCustomer'
		| 'ecommerceOrder'
		| 'ecommerceOrderProducts'
		| 'list'
		| 'tag'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Type */
	tagType?: 'contact' | 'template';
	/** Name */
	name?: string;
	/** Tag ID */
	tagId?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
	/** Contact ID */
	contactId?: number;
	/** Contact Tag ID */
	contactTagId?: number;
	/** List ID */
	listId?: number;
	/** Account ID */
	accountId?: number;
	/** Account ID */
	account?: number;
	/** Contact ID */
	contact?: number;
	/** Account Contact ID */
	accountContactId?: number;
	/** Email */
	email?: string;
	/** Update if Exists */
	updateIfExists?: boolean;
	/** Title */
	title?: string;
	/** Deal Value */
	value?: number;
	/** Currency */
	currency?:
		| 'eur'
		| 'usd'
		| 'gbp'
		| 'chf'
		| 'cny'
		| ''
		| 'aed'
		| 'afn'
		| 'all'
		| 'amd'
		| 'ang'
		| 'aoa'
		| 'ars'
		| 'aud'
		| 'awg'
		| 'azn'
		| 'bam'
		| 'bbd'
		| 'bdt'
		| 'bgn'
		| 'bhd'
		| 'bif'
		| 'bmd'
		| 'bnd'
		| 'bob'
		| 'brl'
		| 'bsd'
		| 'btc'
		| 'btn'
		| 'bwp'
		| 'byn'
		| 'bzd'
		| 'cad'
		| 'cdf'
		| 'clf'
		| 'clp'
		| 'cnh'
		| 'cop'
		| 'crc'
		| 'cuc'
		| 'cup'
		| 'cve'
		| 'czk'
		| 'djf'
		| 'dkk'
		| 'dop'
		| 'dzd'
		| 'egp'
		| 'ern'
		| 'etb'
		| 'fjd'
		| 'fkp'
		| 'gel'
		| 'ggp'
		| 'ghs'
		| 'gip'
		| 'gmd'
		| 'gnf'
		| 'gtq'
		| 'gyd'
		| 'hkd'
		| 'hnl'
		| 'hrk'
		| 'htg'
		| 'huf'
		| 'idr'
		| 'ils'
		| 'imp'
		| 'inr'
		| 'iqd'
		| 'irr'
		| 'isk'
		| 'jep'
		| 'jmd'
		| 'jod'
		| 'jpy'
		| 'kes'
		| 'kgs'
		| 'khr'
		| 'kmf'
		| 'kpw'
		| 'krw'
		| 'kwd'
		| 'kyd'
		| 'kzt'
		| 'lak'
		| 'lbp'
		| 'lkr'
		| 'lrd'
		| 'lsl'
		| 'lyd'
		| 'mad'
		| 'mdl'
		| 'mga'
		| 'mkd'
		| 'mmk'
		| 'mnt'
		| 'mop'
		| 'mro'
		| 'mru'
		| 'mur'
		| 'mvr'
		| 'mwk'
		| 'mxn'
		| 'myr'
		| 'mzn'
		| 'nad'
		| 'ngn'
		| 'nio'
		| 'nok'
		| 'npr'
		| 'nzd'
		| 'omr'
		| 'pab'
		| 'pen'
		| 'pgk'
		| 'php'
		| 'pkr'
		| 'pln'
		| 'pyg'
		| 'qar'
		| 'ron'
		| 'rsd'
		| 'rub'
		| 'rwf'
		| 'sar'
		| 'sbd'
		| 'scr'
		| 'sdg'
		| 'sek'
		| 'sgd'
		| 'shp'
		| 'sll'
		| 'sos'
		| 'srd'
		| 'ssp'
		| 'std'
		| 'stn'
		| 'svc'
		| 'syp'
		| 'szl'
		| 'thb'
		| 'tjs'
		| 'tmt'
		| 'tnd'
		| 'top'
		| 'try'
		| 'ttd'
		| 'twd'
		| 'tzs'
		| 'uah'
		| 'ugx'
		| 'uyu'
		| 'uzs'
		| 'vef'
		| 'vnd'
		| 'vuv'
		| 'wst'
		| 'xaf'
		| 'xag'
		| 'xau'
		| 'xcd'
		| 'xdr'
		| 'xof'
		| 'xpd'
		| 'xpf'
		| 'xpt'
		| 'yer'
		| 'zar'
		| 'zmw'
		| 'zwl';
	/** Deal Pipeline ID */
	group?: string;
	/** Deal Stage ID */
	stage?: string;
	/** Deal Owner ID */
	owner?: string;
	/** Deal ID */
	dealId?: number;
	/** Deal Note */
	dealNote?: string;
	/** Deal Note ID */
	dealNoteId?: number;
	/** Service */
	service?: string;
	/** External Account ID */
	externalid?: string;
	/** Logo URL */
	logoUrl?: string;
	/** Link URL */
	linkUrl?: string;
	/** Connection ID */
	connectionId?: number;
	/** External Checkout ID */
	externalcheckoutid?: string;
	/** Order Source */
	source?: number;
	/** Total Price */
	totalPrice?: number;
	/** Connection ID */
	connectionid?: number;
	/** Customer ID */
	customerid?: number;
	/** Creation Date */
	externalCreatedDate?: string;
	/** Abandoning Date */
	abandonedDate?: string;
	/** Products */
	orderProducts?: Record<string, unknown>;
	/** Order ID */
	orderId?: number;
	/** Customer ID */
	ecommerceCustomerId?: number;
	/** Product ID */
	procuctId?: number;
}

export interface ActiveCampaignTriggerParameters extends BaseNodeParams {
	/** Event Names or IDs */
	events?: unknown;
	/** Source */
	sources?: unknown;
}

export interface AcuitySchedulingTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Event */
	event?:
		| 'appointment.canceled'
		| 'appointment.changed'
		| 'appointment.rescheduled'
		| 'appointment.scheduled'
		| 'order.completed';
	/** Resolve Data */
	resolveData?: boolean;
}

export interface AdaloParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'collection' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Collection ID */
	collectionId?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface AffinityParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'list' | 'listEntry' | 'organization' | 'person';
	/** Operation */
	operation?: 'get' | 'getAll';
	/** List ID */
	listId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Entity ID */
	entityId?: string;
	/** List Entry ID */
	listEntryId?: string;
	/** Name */
	name?: string;
	/** Domain */
	domain?: string;
	/** Organization ID */
	organizationId?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Emails */
	emails?: string;
	/** Person ID */
	personId?: string;
}

export interface AffinityTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
}

export interface AgileCrmParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'company' | 'contact' | 'deal';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** Simplify */
	simple?: boolean;
	/** See <a href="https://github.com/agilecrm/rest-api#121-get-contacts-by-dynamic-filter" target="_blank">Agile CRM guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Company ID */
	companyId?: string;
	/** Deal ID */
	dealId?: string;
	/** Close Date */
	closeDate?: string;
	/** Expected Value */
	expectedValue?: number;
	/** Milestone */
	milestone?: string;
	/** Name */
	name?: string;
	/** Probability */
	probability?: number;
}

export interface Airtable_v2_1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'airtableTokenApi' | 'airtableOAuth2Api';
	/** Resource */
	resource?: 'base' | 'record';
	/** Operation */
	operation?: 'create' | 'upsert' | 'deleteRecord' | 'get' | 'search' | 'update';
	/** Base */
	base?: unknown;
	/** Table */
	table?: unknown;
	/** Columns */
	columns?: unknown;
	/** Record ID */
	id?: string;
	/** Filter By Formula */
	filterByFormula?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
}

export interface Airtable_v1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'airtableTokenApi' | 'airtableOAuth2Api' | 'airtableApi';
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** This type of connection (API Key) was deprecated and can't be used anymore. Please create a new credential of type 'Access Token' instead. */
	deprecated?: unknown;
	/** Operation */
	operation?: 'append' | 'delete' | 'list' | 'read' | 'update';
	/** Base */
	application?: unknown;
	/** Table */
	table?: unknown;
	/** Add All Fields */
	addAllFields?: boolean;
	/** Fields */
	fields?: string;
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Download Fields */
	downloadFieldNames?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** Update All Fields */
	updateAllFields?: boolean;
}

export interface AirtableTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Authentication */
	authentication?: 'airtableApi' | 'airtableTokenApi' | 'airtableOAuth2Api';
	/** Base */
	baseId?: unknown;
	/** Table */
	tableId?: unknown;
	/** Trigger Field */
	triggerField?: string;
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Download Fields */
	downloadFieldNames?: string;
}

export interface AirtopParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'extraction' | 'file' | 'interaction' | 'session' | 'window';
	/** Operation */
	operation?: 'create' | 'save' | 'terminate' | 'waitForDownload';
	/** Profile Name */
	profileName?: string;
	/** Save Profile */
	saveProfileOnTermination?: boolean;
	/** Idle Timeout */
	timeoutMinutes?: number;
	/** Proxy */
	proxy?: 'none' | 'integrated' | 'proxyUrl';
	/** Proxy Configuration */
	proxyConfig?: Record<string, unknown>;
	/** Proxy URL */
	proxyUrl?: string;
	/** Note: This operation is not needed if you enabled 'Save Profile' in the 'Create Session' operation */
	notice?: unknown;
	/** Session ID */
	sessionId?: string;
	/** Window ID */
	windowId?: string;
	/** URL */
	url?: string;
	/** Get Live View */
	getLiveView?: boolean;
	/** Include Navigation Bar */
	includeNavigationBar?: boolean;
	/** Screen Resolution */
	screenResolution?: string;
	/** Disable Resize */
	disableResize?: boolean;
	/** Output Binary Image */
	outputImageAsBinary?: boolean;
	/** File ID */
	fileId?: string;
	/** Output Binary File */
	outputBinaryFile?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Session IDs */
	sessionIds?: string;
	/** Output Files in Single Item */
	outputSingleItem?: boolean;
	/** Element Description */
	elementDescription?: string;
	/** Include Hidden Elements */
	includeHiddenElements?: boolean;
	/** File Name */
	fileName?: string;
	/** File Type */
	fileType?: 'browser_download' | 'screenshot' | 'video' | 'customer_upload';
	/** Source */
	source?: 'url' | 'binary';
	/** Binary Property */
	binaryPropertyName?: string;
	/** Trigger File Input */
	triggerFileInputParameter?: boolean;
	/** Session Mode */
	sessionMode?: 'new' | 'existing';
	/** Auto-Terminate Session */
	autoTerminateSession?: boolean;
	/** Prompt */
	prompt?: string;
	/** Click Type */
	clickType?: 'click' | 'doubleClick' | 'rightClick';
	/** Form Data */
	formData?: string;
	/** Scroll Mode */
	scrollingMode?: 'automatic' | 'manual';
	/** Element Description */
	scrollToElement?: string;
	/** Scroll To Edge */
	scrollToEdge?: Record<string, unknown>;
	/** Scroll By */
	scrollBy?: Record<string, unknown>;
	/** Scrollable Area */
	scrollWithin?: string;
	/** Text */
	text?: string;
	/** Press Enter Key */
	pressEnterKey?: boolean;
}

export interface AiTransformParameters extends BaseNodeParams {
	/** Instructions */
	instructions?: unknown;
	/** Code Generated For Prompt */
	codeGeneratedForPrompt?: unknown;
	/** Generated JavaScript */
	jsCode?: string;
}

export interface AmqpParameters extends BaseNodeParams {
	/** Queue / Topic */
	sink?: string;
	/** Headers */
	headerParametersJson?: string | object;
}

export interface AmqpTriggerParameters extends BaseNodeParams {
	/** Queue / Topic */
	sink?: string;
	/** Clientname */
	clientname?: string;
	/** Subscription */
	subscription?: string;
}

export interface ApiTemplateIoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'account' | 'image' | 'pdf' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Template Name or ID */
	imageTemplateId?: string;
	/** Template Name or ID */
	pdfTemplateId?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
	/** Overrides (JSON) */
	overridesJson?: string | object;
	/** Properties (JSON) */
	propertiesJson?: string | object;
	/** Overrides */
	overridesUi?: Record<string, unknown>;
	/** Properties */
	propertiesUi?: Record<string, unknown>;
}

export interface AsanaParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'project'
		| 'subtask'
		| 'task'
		| 'taskComment'
		| 'taskProject'
		| 'taskTag'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Parent Task ID */
	taskId?: string;
	/** Name */
	name?: string;
	/** Additional Fields */
	otherProperties?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Workspace Name or ID */
	workspace?: string;
	/** Task ID */
	id?: string;
	/** Project Name or ID */
	projectId?: string;
	/** Section Name or ID */
	section?: string;
	/** Filters */
	searchTaskProperties?: Record<string, unknown>;
	/** Is Text HTML */
	isTextHtml?: boolean;
	/** Text */
	text?: string;
	/** Project Name or ID */
	project?: string;
	/** Tags Name or ID */
	tag?: string;
	/** User ID */
	userId?: string;
	/** Team Name or ID */
	team?: string;
}

export interface AsanaTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: string;
	/** Workspace Name or ID */
	workspace?: string;
}

export interface AutomizyParameters extends BaseNodeParams {
	/** This service may no longer exist and will be removed from n8n in a future release. */
	deprecated?: unknown;
	/** Resource */
	resource?: 'contact' | 'list';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Email */
	email?: string;
	/** List Name or ID */
	listId?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
}

export interface AutopilotParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'contactJourney' | 'contactList' | 'list';
	/** Operation */
	operation?: 'upsert' | 'delete' | 'get' | 'getAll';
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Trigger Name or ID */
	triggerId?: string;
	/** List Name or ID */
	listId?: string;
	/** Name */
	name?: string;
}

export interface AutopilotTriggerParameters extends BaseNodeParams {
	/** Event */
	event?:
		| 'contactAdded'
		| 'contactAddedToList'
		| 'contactEnteredSegment'
		| 'contactLeftSegment'
		| 'contactRemovedFromList'
		| 'contactUnsubscribed'
		| 'contactUpdated';
}

export interface AwsLambdaParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'invoke' | '__CUSTOM_API_CALL__';
	/** Function Name or ID */
	function?: string;
	/** Qualifier */
	qualifier?: string;
	/** Invocation Type */
	invocationType?: 'RequestResponse' | 'Event';
	/** JSON Input */
	payload?: string;
}

export interface AwsSnsParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'create' | 'delete' | 'publish' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Topic */
	topic?: unknown;
	/** Subject */
	subject?: string;
	/** Message */
	message?: string;
}

export interface AwsSnsTriggerParameters extends BaseNodeParams {
	/** Topic */
	topic?: unknown;
}

export interface AwsCertificateManagerParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'certificate' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getMany' | 'getMetadata' | 'renew' | '__CUSTOM_API_CALL__';
	/** Certificate ARN */
	certificateArn?: string;
	/** Bucket Name */
	bucketName?: string;
	/** Certificate Key */
	certificateKey?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface AwsCognitoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'group' | 'user' | 'userPool' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** User Pool */
	userPool?: unknown;
	/** Group Name */
	newGroupName?: string;
	/** Group */
	group?: unknown;
	/** Include Users */
	includeUsers?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** User Name */
	newUserName?: string;
	/** User */
	user?: unknown;
	/** Simplify */
	simple?: boolean;
	/** User Attributes */
	userAttributes?: Record<string, unknown>;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface AwsComprehendParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'text' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'detectDominantLanguage'
		| 'detectEntities'
		| 'detectSentiment'
		| '__CUSTOM_API_CALL__';
	/** Language Code */
	languageCode?:
		| 'ar'
		| 'zh'
		| 'zh-TW'
		| 'en'
		| 'fr'
		| 'de'
		| 'hi'
		| 'it'
		| 'ja'
		| 'ko'
		| 'pt'
		| 'es';
	/** Text */
	text?: string;
	/** Simplify */
	simple?: boolean;
}

export interface AwsDynamoDbParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'item' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'upsert' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Table Name or ID */
	tableName?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return */
	returnValues?: 'ALL_OLD' | 'NONE';
	/** Keys */
	keysUi?: Record<string, unknown>;
	/** Simplify */
	simple?: boolean;
	/** Select */
	select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES';
	/** Scan */
	scan?: boolean;
	/** Filter Expression */
	filterExpression?: string;
	/** Key Condition Expression */
	keyConditionExpression?: string;
	/** Expression Attribute Values */
	eavUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface AwsElbParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'listenerCertificate' | 'loadBalancer' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getMany' | '__CUSTOM_API_CALL__';
	/** IP Address Type */
	ipAddressType?: 'ipv4' | 'dualstack';
	/** Name */
	name?: string;
	/** Schema */
	schema?: 'internal' | 'internet-facing';
	/** Type */
	type?: 'application' | 'network';
	/** Subnet ID Names or IDs */
	subnets?: unknown;
	/** Load Balancer ARN */
	loadBalancerId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Listener ARN Name or ID */
	listenerId?: string;
	/** Certificate ARN */
	certificateId?: string;
}

export interface AwsIamParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'user' | 'group' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addToGroup'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'removeFromGroup'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** User */
	user?: unknown;
	/** Group */
	group?: unknown;
	/** User Name */
	userName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Group Name */
	groupName?: string;
	/** Include Users */
	includeUsers?: boolean;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface AwsRekognitionParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'image' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | '__CUSTOM_API_CALL__';
	/** Type */
	type?:
		| 'detectFaces'
		| 'detectLabels'
		| 'detectModerationLabels'
		| 'detectText'
		| 'recognizeCelebrity';
	/** Binary File */
	binaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Bucket */
	bucket?: string;
	/** Name */
	name?: string;
}

export interface AwsS3_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'bucket' | 'file' | 'folder' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'search' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Bucket Name */
	bucketName?: string;
	/** Folder Name */
	folderName?: string;
	/** Folder Key */
	folderKey?: string;
	/** Source Path */
	sourcePath?: string;
	/** Destination Path */
	destinationPath?: string;
	/** File Name */
	fileName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** File Key */
	fileKey?: string;
}

export interface AwsS3_v1Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'bucket' | 'file' | 'folder';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'search';
	/** Name */
	name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Bucket Name */
	bucketName?: string;
	/** Folder Name */
	folderName?: string;
	/** Folder Key */
	folderKey?: string;
	/** Source Path */
	sourcePath?: string;
	/** Destination Path */
	destinationPath?: string;
	/** File Name */
	fileName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** File Key */
	fileKey?: string;
}

export interface AwsSesParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'customVerificationEmail' | 'email' | 'template' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'send' | 'update' | '__CUSTOM_API_CALL__';
	/** From Email */
	fromEmailAddress?: string;
	/** Template Name */
	templateName?: string;
	/** Template Content */
	templateContent?: string;
	/** Template Subject */
	templateSubject?: string;
	/** Success Redirection URL */
	successRedirectionURL?: string;
	/** Failure Redirection URL */
	failureRedirectionURL?: string;
	/** Email */
	email?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Is Body HTML */
	isBodyHtml?: boolean;
	/** Subject */
	subject?: string;
	/** Body */
	body?: string;
	/** From Email */
	fromEmail?: string;
	/** To Addresses */
	toAddresses?: string;
	/** Template Data */
	templateDataUi?: Record<string, unknown>;
	/** Subject Part */
	subjectPart?: string;
	/** Html Part */
	htmlPart?: string;
}

export interface AwsSqsParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'sendMessage' | '__CUSTOM_API_CALL__';
	/** Queue Name or ID */
	queue?: string;
	/** Queue Type */
	queueType?: 'fifo' | 'standard';
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
	/** Message Group ID */
	messageGroupId?: string;
}

export interface AwsTextractParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'analyzeExpense' | '__CUSTOM_API_CALL__';
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** Simplify */
	simple?: boolean;
}

export interface AwsTranscribeParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'transcriptionJob' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Job Name */
	transcriptionJobName?: string;
	/** Media File URI */
	mediaFileUri?: string;
	/** Detect Language */
	detectLanguage?: boolean;
	/** Language */
	languageCode?: 'en-US' | 'en-GB' | 'de-DE' | 'en-IN' | 'en-IE' | 'ru-RU' | 'es-ES';
	/** Return Transcript */
	returnTranscript?: boolean;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface BambooHrParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'companyReport' | 'employee' | 'employeeDocument' | 'file';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** Synced with Trax Payroll */
	synced?: boolean;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Address */
	address?: Record<string, unknown>;
	/** Date of Birth */
	dateOfBirth?: string;
	/** Department Name or ID */
	department?: string;
	/** Division Name or ID */
	division?: string;
	/** Employee Number */
	employeeNumber?: string;
	/** FLSA Overtime Status */
	exempt?: 'exempt' | 'non-exempt';
	/** Gender */
	gender?: 'female' | 'male';
	/** Hire Date */
	hireDate?: string;
	/** Location Name or ID */
	location?: string;
	/** Marital Status */
	maritalStatus?: 'single' | 'married' | 'domesticPartnership';
	/** Mobile Phone */
	mobilePhone?: string;
	/** Pay Per */
	paidPer?: 'hour' | 'day' | 'week' | 'month' | 'quater' | 'year';
	/** Pay Rate */
	payRate?: Record<string, unknown>;
	/** Pay Type */
	payType?:
		| 'commission'
		| 'contract'
		| 'daily'
		| 'exceptionHourly'
		| 'hourly'
		| 'monthly'
		| 'pieceRate'
		| 'proRata'
		| 'salary'
		| 'weekly';
	/** Preferred Name */
	preferredName?: string;
	/** Social Security Number */
	ssn?: string;
	/** Employee ID */
	employeeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Address */
	addasasress?: Record<string, unknown>;
	/** File ID */
	fileId?: string;
	/** Put Output In Field */
	output?: string;
	/** Simplify */
	simplifyOutput?: boolean;
	/** Employee Document Category ID */
	categoryId?: string;
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** Report ID */
	reportId?: string;
	/** Format */
	format?: 'CSV' | 'JSON' | 'PDF' | 'XLS' | 'XML';
}

export interface BannerbearParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'image' | 'template';
	/** Operation */
	operation?: 'create' | 'get';
	/** Template Name or ID */
	templateId?: string;
	/** Modifications */
	modificationsUi?: Record<string, unknown>;
	/** Image ID */
	imageId?: string;
}

export interface BaserowParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'row';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Database Name or ID */
	databaseId?: string;
	/** Table Name or ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Options */
	additionalOptions?: Record<string, unknown>;
}

export interface BeeminderParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'charge' | 'datapoint' | 'goal' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Goal Name or ID */
	goalName?: string;
	/** Amount */
	amount?: number;
	/** Datapoints */
	datapoints?: string | object;
	/** Goal Slug */
	slug?: string;
	/** Goal Title */
	title?: string;
	/** Goal Type */
	goal_type?: 'hustler' | 'biker' | 'fatloser' | 'gainer' | 'inboxer' | 'drinker' | 'custom';
	/** Goal Units */
	gunits?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Value */
	value?: number;
	/** Datapoint ID */
	datapointId?: string;
}

export interface BitbucketTriggerParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'repository' | 'workspace';
	/** Workspace Name or ID */
	workspace?: string;
	/** Event Names or IDs */
	events?: unknown;
	/** Repository Name or ID */
	repository?: string;
}

export interface BitlyParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'link' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'update' | '__CUSTOM_API_CALL__';
	/** Long URL */
	longUrl?: string;
	/** Deeplinks */
	deeplink?: Record<string, unknown>;
	/** Bitlink */
	id?: string;
}

export interface BitwardenParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'collection' | 'event' | 'group' | 'member';
	/** Operation */
	operation?: 'delete' | 'get' | 'getAll' | 'update';
	/** Collection ID */
	collectionId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Group ID */
	groupId?: string;
	/** Name */
	name?: string;
	/** Access All */
	accessAll?: boolean;
	/** Member IDs */
	memberIds?: string;
	/** Member ID */
	memberId?: string;
	/** Type */
	type?: 0 | 1 | 2 | 3;
	/** Email */
	email?: string;
	/** Group IDs */
	groupIds?: string;
}

export interface BoxParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'file' | 'folder' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'copy'
		| 'delete'
		| 'download'
		| 'get'
		| 'search'
		| 'share'
		| 'upload'
		| '__CUSTOM_API_CALL__';
	/** File ID */
	fileId?: string;
	/** Parent ID */
	parentId?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Query */
	query?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Accessible By */
	accessibleBy?: 'group' | 'user';
	/** Use Email */
	useEmail?: boolean;
	/** Email */
	email?: string;
	/** User ID */
	userId?: string;
	/** Group ID */
	groupId?: string;
	/** Role */
	role?:
		| 'coOwner'
		| 'editor'
		| 'previewer'
		| 'previewerUploader'
		| 'uploader'
		| 'viewer'
		| 'viewerUploader';
	/** File Name */
	fileName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Name */
	name?: string;
	/** Folder ID */
	folderId?: string;
	/** Recursive */
	recursive?: boolean;
}

export interface BoxTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
	/** Target Type */
	targetType?: 'file' | 'folder';
	/** Target ID */
	targetId?: string;
}

export interface BrandfetchParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'color' | 'company' | 'font' | 'industry' | 'logo' | '__CUSTOM_API_CALL__';
	/** Domain */
	domain?: string;
	/** Download */
	download?: boolean;
	/** Image Type */
	imageTypes?: unknown;
	/** Image Format */
	imageFormats?: unknown;
}

export interface BubbleParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'object';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Type Name */
	typeName?: string;
	/** Properties */
	properties?: Record<string, unknown>;
	/** Object ID */
	objectId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
}

export interface CalTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
	/** API Version */
	version?: 1 | 2;
}

export interface CalendlyTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'oAuth2' | 'apiKey';
	/** Action required: Calendly will discontinue API Key authentication on May 31, 2025. Update node to use OAuth2 authentication now to ensure your workflows continue to work. */
	deprecationNotice?: unknown;
	/** Scope */
	scope?: 'organization' | 'user';
	/** Events */
	events?: unknown;
}

export interface ChargebeeParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'customer' | 'invoice' | 'subscription';
	/** Operation */
	operation?: 'create';
	/** Properties */
	properties?: Record<string, unknown>;
	/** Max Results */
	maxResults?: number;
	/** Invoice ID */
	invoiceId?: string;
	/** Subscription ID */
	subscriptionId?: string;
	/** Schedule End of Term */
	endOfTerm?: boolean;
}

export interface ChargebeeTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
}

export interface CircleCiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'pipeline';
	/** Operation */
	operation?: 'get' | 'getAll' | 'trigger';
	/** Provider */
	vcs?: 'bitbucket' | 'github';
	/** Project Slug */
	projectSlug?: string;
	/** Pipeline Number */
	pipelineNumber?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface CiscoWebexParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'meeting' | 'message' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Start */
	start?: string;
	/** End */
	end?: string;
	/** Meeting ID */
	meetingId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Destination */
	destination?: 'room' | 'person';
	/** Room Name or ID */
	roomId?: string;
	/** Specify Person By */
	specifyPersonBy?: 'email' | 'id';
	/** Person ID */
	toPersonId?: string;
	/** Person Email */
	toPersonEmail?: string;
	/** Text */
	text?: string;
	/** Message ID */
	messageId?: string;
	/** Is Markdown */
	markdown?: boolean;
	/** Markdown */
	markdownText?: string;
}

export interface CiscoWebexTriggerParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'all'
		| 'attachmentAction'
		| 'meeting'
		| 'membership'
		| 'message'
		| 'recording'
		| 'room'
		| '__CUSTOM_API_CALL__';
	/** Event */
	event?: 'created' | 'deleted' | 'updated' | 'all';
	/** Resolve Data */
	resolveData?: boolean;
}

export interface CloudflareParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'zoneCertificate' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getMany' | 'upload' | '__CUSTOM_API_CALL__';
	/** Zone Name or ID */
	zoneId?: string;
	/** Certificate Content */
	certificate?: string;
	/** Private Key */
	privateKey?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Certificate ID */
	certificateId?: string;
}

export interface ClearbitParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'company' | 'person';
	/** Operation */
	operation?: 'autocomplete' | 'enrich';
	/** Domain */
	domain?: string;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
}

export interface ClickUpParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'checklist'
		| 'checklistItem'
		| 'comment'
		| 'folder'
		| 'goal'
		| 'goalKeyResult'
		| 'list'
		| 'spaceTag'
		| 'task'
		| 'taskDependency'
		| 'taskList'
		| 'taskTag'
		| 'timeEntry'
		| 'timeEntryTag'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'update' | '__CUSTOM_API_CALL__';
	/** Task ID */
	task?: string;
	/** Name */
	name?: string;
	/** Checklist ID */
	checklist?: string;
	/** Checklist Item ID */
	checklistItem?: string;
	/** Comment On */
	commentOn?: 'list' | 'task' | 'view';
	/** ID */
	id?: string;
	/** Comment Text */
	commentText?: string;
	/** Comment ID */
	comment?: string;
	/** Comments On */
	commentsOn?: 'list' | 'task' | 'view';
	/** Limit */
	limit?: number;
	/** Team Name or ID */
	team?: string;
	/** Space Name or ID */
	space?: string;
	/** Folder Name or ID */
	folder?: string;
	/** Goal ID */
	goal?: string;
	/** Type */
	type?: 'automatic' | 'boolean' | 'currency' | 'number' | 'percentage';
	/** Key Result ID */
	keyResult?: string;
	/** Task ID */
	taskId?: string;
	/** Tag Name */
	tagName?: string;
	/** List ID */
	listId?: string;
	/** New Name */
	newName?: string;
	/** Foreground Color */
	foregroundColor?: unknown;
	/** Background Color */
	backgroundColor?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Folderless List */
	folderless?: boolean;
	/** List Name or ID */
	list?: string;
	/** Include Subtasks */
	includeSubtasks?: boolean;
	/** Include Markdown Description */
	includeMarkdownDescription?: boolean;
	/** Field ID */
	field?: string;
	/** Value Is JSON */
	jsonParse?: boolean;
	/** Value */
	value?: string;
	/** Depends On Task ID */
	dependsOnTask?: string;
	/** Running */
	running?: boolean;
	/** Time Entry ID */
	timeEntry?: string;
	/** Start */
	start?: string;
	/** Duration (Minutes) */
	duration?: number;
	/** Archived */
	archived?: boolean;
	/** Time Entry IDs */
	timeEntryIds?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** Tag Names or IDs */
	tagNames?: unknown;
}

export interface ClickUpTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Team Name or ID */
	team?: string;
	/** Events */
	events?: unknown;
}

export interface ClockifyParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'client'
		| 'project'
		| 'tag'
		| 'task'
		| 'timeEntry'
		| 'user'
		| 'workspace'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Client Name */
	name?: string;
	/** Client ID */
	clientId?: string;
	/** Project ID */
	projectId?: string;
	/** Tag ID */
	tagId?: string;
	/** Task ID */
	taskId?: string;
	/** Start */
	start?: string;
	/** Time Entry ID */
	timeEntryId?: string;
}

export interface ClockifyTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Trigger */
	watchField?: 0;
}

export interface CockpitParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'collection' | 'form' | 'singleton';
	/** Operation */
	operation?: 'create' | 'getAll' | 'update';
	/** Collection Name or ID */
	collection?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Entry ID */
	id?: string;
	/** JSON Data Fields */
	jsonDataFields?: boolean;
	/** Entry Data */
	dataFieldsJson?: string | object;
	/** Entry Data */
	dataFieldsUi?: Record<string, unknown>;
	/** Form */
	form?: string;
	/** Singleton Name or ID */
	singleton?: string;
}

export interface CodaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'control' | 'formula' | 'table' | 'view';
	/** Operation */
	operation?:
		| 'createRow'
		| 'deleteRow'
		| 'getAllColumns'
		| 'getAllRows'
		| 'getColumn'
		| 'getRow'
		| 'pushButton';
	/** Doc Name or ID */
	docId?: string;
	/** Table Name or ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Column Name or ID */
	columnId?: string;
	/** Formula ID */
	formulaId?: string;
	/** Control ID */
	controlId?: string;
	/** View ID */
	viewId?: string;
	/** Key Name */
	keyName?: string;
}

export interface Code_v2Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'runOnceForAllItems' | 'runOnceForEachItem';
	/** Language */
	language?: 'javaScript' | 'python' | 'pythonNative';
	/** JavaScript */
	jsCode?: string;
	/** Type <code>$</code> for a list of <a target="_blank" href="https://docs.n8n.io/code-examples/methods-variables-reference/">special vars/methods</a>. Debug by using <code>console.log()</code> statements and viewing their output in the browser console. */
	notice?: unknown;
	/** Python */
	pythonCode?: string;
}

export interface CoinGeckoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'coin' | 'event';
	/** Operation */
	operation?:
		| 'candlestick'
		| 'get'
		| 'getAll'
		| 'history'
		| 'market'
		| 'marketChart'
		| 'price'
		| 'ticker';
	/** Search By */
	searchBy?: 'coinId' | 'contractAddress';
	/** Coin Name or ID */
	coinId?: string;
	/** Base Currency Name or ID */
	baseCurrency?: string;
	/** Base Currency Names or IDs */
	baseCurrencies?: unknown;
	/** Platform ID */
	platformId?: 'ethereum';
	/** Contract Address */
	contractAddress?: string;
	/** Contract Addresses */
	contractAddresses?: string;
	/** Quote Currency Name or ID */
	quoteCurrency?: string;
	/** Quote Currency Names or IDs */
	quoteCurrencies?: unknown;
	/** Range (Days) */
	days?: '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max';
	/** Date */
	date?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface CompareDatasetsParameters extends BaseNodeParams {
	/** Items from different branches are paired together when the fields below match. If paired, the rest of the fields are compared to determine whether the items are the same or different */
	infoBox?: unknown;
	/** Fields to Match */
	mergeByFields?: Record<string, unknown>;
	/** When There Are Differences */
	resolve?: 'preferInput1' | 'preferInput2' | 'mix' | 'includeBoth';
	/** Fuzzy Compare */
	fuzzyCompare?: boolean;
	/** Prefer */
	preferWhenMix?: 'input1' | 'input2';
	/** For Everything Except */
	exceptWhenMix?: string;
}

export interface CompressionParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'compress' | 'decompress';
	/** Input Binary Field(s) */
	binaryPropertyName?: string;
	/** Output Format */
	outputFormat?: 'gzip' | 'zip';
	/** File Name */
	fileName?: string;
	/** Put Output File in Field */
	binaryPropertyOutput?: string;
	/** Output File Prefix */
	outputPrefix?: string;
}

export interface ContentfulParameters extends BaseNodeParams {
	/** Source */
	source?: 'deliveryApi' | 'previewApi';
	/** Resource */
	resource?: 'asset' | 'contentType' | 'entry' | 'locale' | 'space';
	/** Operation */
	operation?: 'get';
	/** Environment ID */
	environmentId?: string;
	/** Content Type ID */
	contentTypeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Entry ID */
	entryId?: string;
	/** Asset ID */
	assetId?: string;
}

export interface ConvertKitParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'customField' | 'form' | 'sequence' | 'tag' | 'tagSubscriber';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update';
	/** Field ID */
	id?: string;
	/** Label */
	label?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Email */
	email?: string;
	/** Name */
	name?: string;
	/** Tag Name or ID */
	tagId?: string;
}

export interface ConvertKitTriggerParameters extends BaseNodeParams {
	/** Event */
	event?:
		| 'formSubscribe'
		| 'linkClick'
		| 'productPurchase'
		| 'purchaseCreate'
		| 'courseComplete'
		| 'courseSubscribe'
		| 'subscriberActivate'
		| 'subscriberUnsubscribe'
		| 'tagAdd'
		| 'tagRemove';
	/** Form Name or ID */
	formId?: string;
	/** Sequence Name or ID */
	courseId?: string;
	/** Initiating Link */
	link?: string;
	/** Product ID */
	productId?: string;
	/** Tag Name or ID */
	tagId?: string;
}

export interface CopperParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'company'
		| 'customerSource'
		| 'lead'
		| 'opportunity'
		| 'person'
		| 'project'
		| 'task'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Company ID */
	companyId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	filterFields?: Record<string, unknown>;
	/** Lead ID */
	leadId?: string;
	/** Customer Source ID */
	customerSourceId?: string;
	/** Primary Contact ID */
	primaryContactId?: string;
	/** Opportunity ID */
	opportunityId?: string;
	/** Person ID */
	personId?: string;
	/** Project ID */
	projectId?: string;
	/** Task ID */
	taskId?: string;
}

export interface CopperTriggerParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'company'
		| 'lead'
		| 'opportunity'
		| 'person'
		| 'project'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Event */
	event?: 'delete' | 'new' | 'update';
}

export interface CortexParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'analyzer' | 'job' | 'responder' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'execute' | '__CUSTOM_API_CALL__';
	/** Analyzer Type Name or ID */
	analyzer?: string;
	/** Observable Type Name or ID */
	observableType?: string;
	/** Observable Value */
	observableValue?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** TLP */
	tlp?: 0 | 1 | 2 | 3;
	/** Responder Type Name or ID */
	responder?: string;
	/** Entity Type Name or ID */
	entityType?: string;
	/** JSON Parameters */
	jsonObject?: boolean;
	/** Entity Object (JSON) */
	objectData?: string;
	/** Parameters */
	parameters?: Record<string, unknown>;
	/** Job ID */
	jobId?: string;
}

export interface CrateDbParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Schema */
	schema?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface CronParameters extends BaseNodeParams {
	/** This workflow will run on the schedule you define here once you <a data-key="activate">activate</a> it.<br><br>For testing, you can also trigger it manually: by going back to the canvas and clicking 'execute workflow' */
	notice?: unknown;
	/** Trigger Times */
	triggerTimes?: Record<string, unknown>;
}

export interface CrowdDevParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'activity'
		| 'automation'
		| 'member'
		| 'note'
		| 'organization'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'createWithMember' | 'createForMember' | '__CUSTOM_API_CALL__';
	/** Username */
	username?: Record<string, unknown>;
	/** displayName */
	displayName?: string;
	/** Emails */
	emails?: Record<string, unknown>;
	/** Joined At */
	joinedAt?: string;
	/** Member */
	member?: string;
	/** Type */
	type?: string;
	/** Timestamp */
	timestamp?: string;
	/** Platform */
	platform?: string;
	/** Source ID */
	sourceId?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** ID */
	id?: string;
	/** Body */
	body?: string;
	/** Name */
	name?: string;
	/** Trigger */
	trigger?: 'new_activity' | 'new_member';
	/** URL */
	url?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface CrowdDevTriggerParameters extends BaseNodeParams {
	/** Trigger */
	trigger?: 'new_activity' | 'new_member';
}

export interface CryptoParameters extends BaseNodeParams {
	/** Action */
	action?: 'generate' | 'hash' | 'hmac' | 'sign';
	/** Type */
	type?: 'MD5' | 'SHA256' | 'SHA3-256' | 'SHA3-384' | 'SHA3-512' | 'SHA384' | 'SHA512';
	/** Binary File */
	binaryData?: boolean;
	/** Binary Property Name */
	binaryPropertyName?: string;
	/** Value */
	value?: string;
	/** Property Name */
	dataPropertyName?: string;
	/** Encoding */
	encoding?: 'base64' | 'hex';
	/** Secret */
	secret?: string;
	/** Algorithm Name or ID */
	algorithm?:
		| 'RSA-MD5'
		| 'RSA-RIPEMD160'
		| 'RSA-SHA1'
		| 'RSA-SHA1-2'
		| 'RSA-SHA224'
		| 'RSA-SHA256'
		| 'RSA-SHA3-224'
		| 'RSA-SHA3-256'
		| 'RSA-SHA3-384'
		| 'RSA-SHA3-512'
		| 'RSA-SHA384'
		| 'RSA-SHA512'
		| 'RSA-SHA512/224'
		| 'RSA-SHA512/256'
		| 'RSA-SM3'
		| 'blake2b512'
		| 'blake2s256'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-224'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-256'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-384'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-512'
		| 'md5'
		| 'md5-sha1'
		| 'md5WithRSAEncryption'
		| 'ripemd'
		| 'ripemd160'
		| 'ripemd160WithRSA'
		| 'rmd160'
		| 'sha1'
		| 'sha1WithRSAEncryption'
		| 'sha224'
		| 'sha224WithRSAEncryption'
		| 'sha256'
		| 'sha256WithRSAEncryption'
		| 'sha3-224'
		| 'sha3-256'
		| 'sha3-384'
		| 'sha3-512'
		| 'sha384'
		| 'sha384WithRSAEncryption'
		| 'sha512'
		| 'sha512-224'
		| 'sha512-224WithRSAEncryption'
		| 'sha512-256'
		| 'sha512-256WithRSAEncryption'
		| 'sha512WithRSAEncryption'
		| 'shake128'
		| 'shake256'
		| 'sm3'
		| 'sm3WithRSAEncryption'
		| 'ssl3-md5'
		| 'ssl3-sha1';
	/** Private Key */
	privateKey?: string;
	/** Type */
	encodingType?: 'ascii' | 'base64' | 'hex' | 'uuid';
	/** Length */
	stringLength?: number;
}

export interface CustomerIoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'customer' | 'event' | 'campaign' | 'segment' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'getMetrics' | '__CUSTOM_API_CALL__';
	/** Campaign ID */
	campaignId?: number;
	/** Period */
	period?: 'hours' | 'days' | 'weeks' | 'months';
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** ID */
	id?: string;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Customer ID */
	customerId?: string;
	/** Event Name */
	eventName?: string;
	/** Segment ID */
	segmentId?: number;
	/** Customer IDs */
	customerIds?: string;
}

export interface CustomerIoTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
}

export interface DataTableParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'row';
	/** Operation */
	operation?: 'deleteRows' | 'get' | 'rowExists' | 'rowNotExists' | 'insert' | 'update' | 'upsert';
	/** Data table */
	dataTableId?: unknown;
	/** Must Match */
	matchType?: 'anyCondition' | 'allConditions';
	/** Columns */
	columns?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface DateTime_v2Parameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'addToDate'
		| 'extractDate'
		| 'formatDate'
		| 'getCurrentDate'
		| 'getTimeBetweenDates'
		| 'roundDate'
		| 'subtractFromDate';
	/** You can also refer to the current date in n8n expressions by using <code>{{$now}}</code> or <code>{{$today}}</code>. <a target="_blank" href="https://docs.n8n.io/code/cookbook/luxon/">More info</a> */
	notice?: unknown;
	/** Include Current Time */
	includeTime?: boolean;
	/** Output Field Name */
	outputFieldName?: string;
	/** Date to Add To */
	magnitude?: string;
	/** Time Unit to Add */
	timeUnit?:
		| 'years'
		| 'quarters'
		| 'months'
		| 'weeks'
		| 'days'
		| 'hours'
		| 'minutes'
		| 'seconds'
		| 'milliseconds';
	/** Duration */
	duration?: number;
	/** Date */
	date?: string;
	/** Format */
	format?:
		| 'custom'
		| 'MM/dd/yyyy'
		| 'yyyy/MM/dd'
		| 'MMMM dd yyyy'
		| 'MM-dd-yyyy'
		| 'yyyy-MM-dd'
		| 'X'
		| 'x';
	/** Custom Format */
	customFormat?: string;
	/** Mode */
	mode?: 'roundDown' | 'roundUp';
	/** To Nearest */
	toNearest?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
	/** To */
	to?: 'month';
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Units */
	units?: unknown;
	/** Part */
	part?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
}

export interface DateTime_v1Parameters extends BaseNodeParams {
	/** More powerful date functionality is available in <a href='https://docs.n8n.io/code/cookbook/luxon/' target='_blank'>expressions</a>,</br> e.g. <code>{{ $now.plus(1, 'week') }}</code> */
	noticeDateTime?: unknown;
	/** Action */
	action?: 'calculate' | 'format';
	/** Value */
	value?: string;
	/** Property Name */
	dataPropertyName?: string;
	/** Custom Format */
	custom?: boolean;
	/** To Format */
	toFormat?: string;
	/** Operation */
	operation?: 'add' | 'subtract';
	/** Duration */
	duration?: number;
	/** Time Unit */
	timeUnit?:
		| 'quarters'
		| 'years'
		| 'months'
		| 'weeks'
		| 'days'
		| 'hours'
		| 'minutes'
		| 'seconds'
		| 'milliseconds';
}

export interface DebugHelperParameters extends BaseNodeParams {
	/** Category */
	category?: 'doNothing' | 'throwError' | 'oom' | 'randomData';
	/** Error Type */
	throwErrorType?: 'NodeApiError' | 'NodeOperationError' | 'Error';
	/** Error Message */
	throwErrorMessage?: string;
	/** Memory Size to Generate */
	memorySizeValue?: number;
	/** Data Type */
	randomDataType?:
		| 'address'
		| 'latLong'
		| 'creditCard'
		| 'email'
		| 'ipv4'
		| 'ipv6'
		| 'macAddress'
		| 'nanoid'
		| 'url'
		| 'user'
		| 'uuid'
		| 'semver';
	/** NanoId Alphabet */
	nanoidAlphabet?: string;
	/** NanoId Length */
	nanoidLength?: string;
	/** Seed */
	randomDataSeed?: string;
	/** Number of Items to Generate */
	randomDataCount?: number;
	/** Output as Single Array */
	randomDataSingleArray?: boolean;
}

export interface DeepLParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'language' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'translate' | '__CUSTOM_API_CALL__';
	/** Text */
	text?: string;
	/** Target Language Name or ID */
	translateTo?: string;
}

export interface DemioParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'event' | 'report';
	/** Operation */
	operation?: 'get' | 'getAll' | 'register';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Event ID */
	eventId?: string;
	/** First Name */
	firstName?: string;
	/** Email */
	email?: string;
	/** Session Name or ID */
	dateId?: string;
}

export interface DhlParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'get';
	/** Tracking Number */
	trackingNumber?: string;
}

export interface Discord_v2Parameters extends BaseNodeParams {
	/** Connection Type */
	authentication?: 'botToken' | 'oAuth2' | 'webhook';
	/** Resource */
	resource?: 'channel' | 'message' | 'member' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'deleteMessage'
		| 'get'
		| 'getAll'
		| 'react'
		| 'send'
		| 'sendAndWait'
		| '__CUSTOM_API_CALL__';
	/** Server */
	guildId?: unknown;
	/** Channel */
	channelId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Message ID */
	messageId?: string;
	/** Emoji */
	emoji?: string;
	/** Send To */
	sendTo?: 'user' | 'channel';
	/** User */
	userId?: unknown;
	/** Message */
	content?: string;
	/** Embeds */
	embeds?: Record<string, unknown>;
	/** Files */
	files?: Record<string, unknown>;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Name */
	name?: string;
	/** Type */
	type?: '0' | '2' | '4';
	/** After */
	after?: string;
	/** Role */
	role?: unknown;
}

export interface Discord_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Webhook URL */
	webhookUri?: string;
	/** Content */
	text?: string;
}

export interface DiscourseParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'category' | 'group' | 'post' | 'user' | 'userGroup' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Color */
	color?: unknown;
	/** Text Color */
	textColor?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Category ID */
	categoryId?: string;
	/** Group ID */
	groupId?: string;
	/** Title */
	title?: string;
	/** Content */
	content?: string;
	/** Post ID */
	postId?: string;
	/** Email */
	email?: string;
	/** Username */
	username?: string;
	/** Password */
	password?: string;
	/** By */
	by?: 'username' | 'externalId';
	/** SSO External ID */
	externalId?: string;
	/** Flag */
	flag?: 'active' | 'blocked' | 'new' | 'staff' | 'suspect' | 'suspended';
	/** Usernames */
	usernames?: string;
}

export interface DisqusParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'forum';
	/** Operation */
	operation?: 'get' | 'getCategories' | 'getThreads' | 'getPosts';
	/** Forum Name */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface DriftParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'getCustomAttributes'
		| 'delete'
		| 'get'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
}

export interface DropboxParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'file' | 'folder' | 'search' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'move' | 'upload' | '__CUSTOM_API_CALL__';
	/** From Path */
	path?: string;
	/** To Path */
	toPath?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Query */
	query?: string;
	/** File Status */
	fileStatus?: 'active' | 'deleted';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
}

export interface DropcontactParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'enrich' | 'fetchRequest' | '__CUSTOM_API_CALL__';
	/** Request ID */
	requestId?: string;
	/** Email */
	email?: string;
	/** Simplify Output (Faster) */
	simplify?: boolean;
}

export interface EditImageParameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'blur'
		| 'border'
		| 'composite'
		| 'create'
		| 'crop'
		| 'draw'
		| 'information'
		| 'multiStep'
		| 'resize'
		| 'rotate'
		| 'shear'
		| 'text'
		| 'transparent';
	/** Property Name */
	dataPropertyName?: string;
	/** Operations */
	operations?: Record<string, unknown>;
	/** Background Color */
	backgroundColor?: unknown;
	/** Image Width */
	width?: number;
	/** Image Height */
	height?: number;
	/** Primitive */
	primitive?: 'circle' | 'line' | 'rectangle';
	/** Color */
	color?: unknown;
	/** Start Position X */
	startPositionX?: number;
	/** Start Position Y */
	startPositionY?: number;
	/** End Position X */
	endPositionX?: number;
	/** End Position Y */
	endPositionY?: number;
	/** Corner Radius */
	cornerRadius?: number;
	/** Text */
	text?: string;
	/** Font Size */
	fontSize?: number;
	/** Font Color */
	fontColor?: unknown;
	/** Position X */
	positionX?: number;
	/** Position Y */
	positionY?: number;
	/** Max Line Length */
	lineLength?: number;
	/** Blur */
	blur?: number;
	/** Sigma */
	sigma?: number;
	/** Border Width */
	borderWidth?: number;
	/** Border Height */
	borderHeight?: number;
	/** Border Color */
	borderColor?: unknown;
	/** Composite Image Property */
	dataPropertyNameComposite?: string;
	/** Operator */
	operator?:
		| 'Add'
		| 'Atop'
		| 'Bumpmap'
		| 'Copy'
		| 'CopyBlack'
		| 'CopyBlue'
		| 'CopyCyan'
		| 'CopyGreen'
		| 'CopyMagenta'
		| 'CopyOpacity'
		| 'CopyRed'
		| 'CopyYellow'
		| 'Difference'
		| 'Divide'
		| 'In'
		| 'Minus'
		| 'Multiply'
		| 'Out'
		| 'Over'
		| 'Plus'
		| 'Subtract'
		| 'Xor';
	/** Option */
	resizeOption?:
		| 'ignoreAspectRatio'
		| 'maximumArea'
		| 'minimumArea'
		| 'onlyIfLarger'
		| 'onlyIfSmaller'
		| 'percent';
	/** Rotate */
	rotate?: number;
	/** Degrees X */
	degreesX?: number;
	/** Degrees Y */
	degreesY?: number;
}

export interface EgoiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** List Name or ID */
	list?: string;
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** By */
	by?: 'id' | 'email';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
}

export interface ElasticsearchParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'document' | 'index' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Index ID */
	indexId?: string;
	/** Document ID */
	documentId?: string;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** By default, you cannot page through more than 10,000 hits. To page through more hits, add "Sort" from options. */
	paginateNotice?: unknown;
	/** Limit */
	limit?: number;
	/** Data to Send */
	dataToSend?: 'defineBelow' | 'autoMapInputData';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
}

export interface ElasticSecurityParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'case' | 'caseComment' | 'caseTag' | 'connector' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'getStatus'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Connector Name or ID */
	connectorId?: string;
	/** Connector Type */
	connectorType?: '.resilient' | '.jira' | '.servicenow';
	/** Issue Type */
	issueType?: string;
	/** Priority */
	priority?: string;
	/** Urgency */
	urgency?: 1 | 2 | 3;
	/** Severity */
	severity?: 1 | 2 | 3;
	/** Impact */
	impact?: 1 | 2 | 3;
	/** Category */
	category?: string;
	/** Issue Types */
	issueTypes?: string;
	/** Severity Code */
	severityCode?: number;
	/** Case ID */
	caseId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sortOptions?: Record<string, unknown>;
	/** Comment */
	comment?: string;
	/** Simplify */
	simple?: boolean;
	/** Comment ID */
	commentId?: string;
	/** Tag Name or ID */
	tag?: string;
	/** Connector Name */
	name?: string;
	/** API URL */
	apiUrl?: string;
	/** Email */
	email?: string;
	/** API Token */
	apiToken?: string;
	/** Project Key */
	projectKey?: string;
	/** Username */
	username?: string;
	/** Password */
	password?: string;
	/** API Key ID */
	apiKeyId?: string;
	/** API Key Secret */
	apiKeySecret?: string;
	/** Organization ID */
	orgId?: string;
}

export interface EmailReadImap_v2_1Parameters extends BaseNodeParams {
	/** Mailbox Name */
	mailbox?: string;
	/** Action */
	postProcessAction?: 'read' | 'nothing';
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Format */
	format?: 'raw' | 'resolved' | 'simple';
	/** Property Prefix Name */
	dataPropertyAttachmentsPrefixName?: string;
}

export interface EmailReadImap_v1Parameters extends BaseNodeParams {
	/** Mailbox Name */
	mailbox?: string;
	/** Action */
	postProcessAction?: 'read' | 'nothing';
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Format */
	format?: 'raw' | 'resolved' | 'simple';
	/** Property Prefix Name */
	dataPropertyAttachmentsPrefixName?: string;
}

export interface EmailSend_v2_1Parameters extends BaseNodeParams {
	/** Operation */
	operation?: 'send' | 'sendAndWait';
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** Subject */
	subject?: string;
	/** Email Format */
	emailFormat?: 'text' | 'html' | 'both';
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface EmailSend_v1Parameters extends BaseNodeParams {
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** CC Email */
	ccEmail?: string;
	/** BCC Email */
	bccEmail?: string;
	/** Subject */
	subject?: string;
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** Attachments */
	attachments?: string;
}

export interface EmeliaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'campaign' | 'contactList';
	/** Operation */
	operation?: 'addContact' | 'create' | 'duplicate' | 'get' | 'getAll' | 'pause' | 'start';
	/** Campaign Name or ID */
	campaignId?: string;
	/** Contact Email */
	contactEmail?: string;
	/** Campaign Name */
	campaignName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Contact List Name or ID */
	contactListId?: string;
}

export interface EmeliaTriggerParameters extends BaseNodeParams {
	/** Campaign Name or ID */
	campaignId?: string;
	/** Events */
	events?: unknown;
}

export interface ErpNextParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** DocType Name or ID */
	docType?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Properties */
	properties?: Record<string, unknown>;
	/** Document Name */
	documentName?: string;
}

export interface ErrorTriggerParameters extends BaseNodeParams {
	/** This node will trigger when there is an error in another workflow, as long as that workflow is set up to do so. <a href="https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.errortrigger" target="_blank">More info</a> */
	notice?: unknown;
}

export interface EvaluationTriggerParameters extends BaseNodeParams {
	/** Source */
	source?: 'dataTable' | 'googleSheets';
	/** Pulls a test dataset from a Google Sheet. The workflow will run once for each row, in sequence. Tips for wiring this node up <a href="https://docs.n8n.io/advanced-ai/evaluations/tips-and-common-issues/#combining-multiple-triggers">here</a>. */
	notice?: unknown;
	/** Credentials */
	credentials?: unknown;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Document Containing Dataset */
	documentId?: unknown;
	/** Sheet Containing Dataset */
	sheetName?: unknown;
	/** Data table */
	dataTableId?: unknown;
	/** Limit Rows */
	limitRows?: boolean;
	/** Max Rows to Process */
	maxRows?: number;
	/** Filters */
	filtersUI?: Record<string, unknown>;
	/** Filter Rows */
	filterRows?: boolean;
	/** Must Match */
	matchType?: 'anyCondition' | 'allConditions';
}

export interface EvaluationParameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'setInputs'
		| 'setOutputs'
		| 'setMetrics'
		| 'checkIfEvaluating'
		| '__CUSTOM_API_CALL__';
	/** Source */
	source?: 'dataTable' | 'googleSheets';
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** For adding columns from your dataset to the evaluation results. Anything you add here will be displayed in the ‘evaluations’ tab, not on the Google Sheet or Data table. */
	setInputsNotice?: unknown;
	/** Inputs */
	inputs?: Record<string, unknown>;
	/** Credentials */
	credentials?: unknown;
	/** Document Containing Dataset */
	documentId?: unknown;
	/** Sheet Containing Dataset */
	sheetName?: unknown;
	/** Data table */
	dataTableId?: unknown;
	/** Outputs */
	outputs?: Record<string, unknown>;
	/** Metrics measure the quality of an execution. They will be displayed in the ‘evaluations’ tab, not on the Google Sheet or Data table. */
	notice?: unknown;
	/** Metric */
	metric?: unknown;
	/** Expected Answer */
	expectedAnswer?: string;
	/** Actual Answer */
	actualAnswer?: string;
	/** User Query */
	userQuery?: string;
	/** Expected Tools */
	expectedTools?: string;
	/** Intermediate Steps (of Agent) */
	intermediateSteps?: string;
	/** Prompt */
	prompt?: string;
	/** Metrics to Return */
	metrics?: unknown;
}

export interface EventbriteTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'privateKey' | 'oAuth2';
	/** Organization Name or ID */
	organization?: string;
	/** Event Name or ID */
	event?: string;
	/** Actions */
	actions?: unknown;
	/** Resolve Data */
	resolveData?: boolean;
}

export interface ExecuteCommandParameters extends BaseNodeParams {
	/** Execute Once */
	executeOnce?: boolean;
	/** Command */
	command?: string;
}

export interface ExecuteWorkflowParameters extends BaseNodeParams {
	/** This node is out of date. Please upgrade by removing it and adding a new one */
	outdatedVersionWarning?: unknown;
	/** Source */
	source?: 'database' | 'localFile' | 'parameter' | 'url';
	/** Workflow ID */
	workflowId?: string;
	/** Workflow Path */
	workflowPath?: string;
	/** Workflow JSON */
	workflowJson?: string | object;
	/** Workflow URL */
	workflowUrl?: string;
	/** Any data you pass into this node will be output by the Execute Workflow Trigger. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/" target="_blank">More info</a> */
	executeWorkflowNotice?: unknown;
	/** Workflow Inputs */
	workflowInputs?: unknown;
	/** Mode */
	mode?: 'once' | 'each';
}

export interface ExecuteWorkflowTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
	/** When an ‘execute workflow’ node calls this workflow, the execution starts here. Any data passed into the 'execute workflow' node will be output by this node. */
	notice?: unknown;
	/** This node is out of date. Please upgrade by removing it and adding a new one */
	outdatedVersionWarning?: unknown;
	/** Input data mode */
	inputSource?: 'workflowInputs' | 'jsonExample' | 'passthrough';
	/** Provide an example object to infer fields and their types.<br>To allow any type for a given field, set the value to null. */
	jsonExample_notice?: unknown;
	/** JSON Example */
	jsonExample?: string | object;
	/** Workflow Input Schema */
	workflowInputs?: Record<string, unknown>;
}

export interface ExecutionDataParameters extends BaseNodeParams {
	/** Save important data using this node. It will be displayed on each execution for easy reference and you can filter by it.<br />Filtering is available on Pro and Enterprise plans. <a href='https://n8n.io/pricing/' target='_blank'>More Info</a> */
	notice?: unknown;
	/** Operation */
	operation?: 'save';
	/** Data to Save */
	dataToSave?: Record<string, unknown>;
}

export interface FacebookGraphApiParameters extends BaseNodeParams {
	/** Host URL */
	hostUrl?: 'graph.facebook.com' | 'graph-video.facebook.com';
	/** HTTP Request Method */
	httpRequestMethod?: 'GET' | 'POST' | 'DELETE';
	/** Graph API Version */
	graphApiVersion?:
		| ''
		| 'v23.0'
		| 'v22.0'
		| 'v21.0'
		| 'v20.0'
		| 'v19.0'
		| 'v18.0'
		| 'v17.0'
		| 'v16.0'
		| 'v15.0'
		| 'v14.0'
		| 'v13.0'
		| 'v12.0'
		| 'v11.0'
		| 'v10.0'
		| 'v9.0'
		| 'v8.0'
		| 'v7.0'
		| 'v6.0'
		| 'v5.0'
		| 'v4.0'
		| 'v3.3'
		| 'v3.2'
		| 'v3.1'
		| 'v3.0';
	/** Node */
	node?: string;
	/** Edge */
	edge?: string;
	/** Ignore SSL Issues (Insecure) */
	allowUnauthorizedCerts?: boolean;
	/** Send Binary File */
	sendBinaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
}

export interface FacebookTriggerParameters extends BaseNodeParams {
	/** APP ID */
	appId?: string;
	/** To watch Whatsapp business account events use the Whatsapp trigger node */
	whatsappBusinessAccountNotice?: unknown;
	/** Object */
	object?:
		| 'adAccount'
		| 'application'
		| 'certificateTransparency'
		| 'group'
		| 'instagram'
		| 'link'
		| 'page'
		| 'permissions'
		| 'user'
		| 'whatsappBusinessAccount'
		| 'workplaceSecurity';
	/** Field Names or IDs */
	fields?: unknown;
}

export interface FacebookLeadAdsTriggerParameters extends BaseNodeParams {
	/** Due to Facebook API limitations, you can use just one Facebook Lead Ads trigger for each Facebook App */
	facebookLeadAdsNotice?: unknown;
	/** Event */
	event?: 'newLead';
	/** Page */
	page?: unknown;
	/** Form */
	form?: unknown;
}

export interface FigmaTriggerParameters extends BaseNodeParams {
	/** Team ID */
	teamId?: string;
	/** Trigger On */
	triggerOn?: 'fileComment' | 'fileDelete' | 'fileUpdate' | 'fileVersionUpdate' | 'libraryPublish';
}

export interface FilemakerParameters extends BaseNodeParams {
	/** Action */
	action?:
		| 'create'
		| 'delete'
		| 'duplicate'
		| 'edit'
		| 'find'
		| 'records'
		| 'record'
		| 'performscript';
	/** Layout Name or ID */
	layout?: string;
	/** Record ID */
	recid?: number;
	/** Offset */
	offset?: number;
	/** Limit */
	limit?: number;
	/** Get Portals */
	getPortals?: boolean;
	/** Portals Name or ID */
	portals?: string;
	/** Response Layout Name or ID */
	responseLayout?: string;
	/** Queries */
	queries?: Record<string, unknown>;
	/** Sort Data? */
	setSort?: boolean;
	/** Sort */
	sortParametersUi?: Record<string, unknown>;
	/** Before Find Script */
	setScriptBefore?: boolean;
	/** Script Name or ID */
	scriptBefore?: string;
	/** Script Parameter */
	scriptBeforeParam?: string;
	/** Before Sort Script */
	setScriptSort?: boolean;
	/** Script Name or ID */
	scriptSort?: string;
	/** Script Parameter */
	scriptSortParam?: string;
	/** After Sort Script */
	setScriptAfter?: boolean;
	/** Script Name or ID */
	scriptAfter?: string;
	/** Script Parameter */
	scriptAfterParam?: string;
	/** Mod ID */
	modId?: number;
	/** Fields */
	fieldsParametersUi?: Record<string, unknown>;
	/** Script Name or ID */
	script?: string;
	/** Script Parameter */
	scriptParam?: string;
}

export interface ReadWriteFileParameters extends BaseNodeParams {
	/** Use this node to read and write files on the same computer running n8n. To handle files between different computers please use other nodes (e.g. FTP, HTTP Request, AWS). */
	info?: unknown;
	/** Operation */
	operation?: 'read' | 'write';
	/** File(s) Selector */
	fileSelector?: string;
	/** File Path and Name */
	fileName?: string;
	/** Input Binary Field */
	dataPropertyName?: string;
}

export interface ConvertToFileParameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'csv'
		| 'html'
		| 'iCal'
		| 'toJson'
		| 'ods'
		| 'rtf'
		| 'toText'
		| 'xls'
		| 'xlsx'
		| 'toBinary';
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Base64 Input Field */
	sourceProperty?: string;
	/** Mode */
	mode?: 'once' | 'each';
	/** Event Title */
	title?: string;
	/** Start */
	start?: string;
	/** End */
	end?: string;
	/** All Day */
	allDay?: boolean;
}

export interface ExtractFromFileParameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'csv'
		| 'html'
		| 'fromIcs'
		| 'fromJson'
		| 'ods'
		| 'pdf'
		| 'rtf'
		| 'text'
		| 'xml'
		| 'xls'
		| 'xlsx'
		| 'binaryToPropery';
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Destination Output Field */
	destinationKey?: string;
}

export interface Filter_v2_2Parameters extends BaseNodeParams {
	/** Conditions */
	conditions?: unknown;
	/** Convert types where required */
	looseTypeValidation?: boolean;
}

export interface Filter_v1Parameters extends BaseNodeParams {
	/** Conditions */
	conditions?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
}

export interface FlowParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'task';
	/** Operation */
	operation?: 'create' | 'update' | 'get' | 'getAll';
	/** Workspace ID */
	workspaceId?: string;
	/** Name */
	name?: string;
	/** Task ID */
	taskId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface FlowTriggerParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'list' | 'task';
	/** Project ID */
	listIds?: string;
	/** Task ID */
	taskIds?: string;
}

export interface FormParameters extends BaseNodeParams {
	/** An n8n Form Trigger node must be set up before this node */
	triggerNotice?: unknown;
	/** Page Type */
	operation?: 'page' | 'completion';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Limit Wait Time */
	limitWaitTime?: boolean;
	/** Limit Type */
	limitType?: 'afterTimeInterval' | 'atSpecifiedTime';
	/** Amount */
	resumeAmount?: number;
	/** Unit */
	resumeUnit?: 'minutes' | 'hours' | 'days';
	/** Max Date and Time */
	maxDateAndTime?: string;
	/** On n8n Form Submission */
	respondWith?: 'text' | 'redirect' | 'showText' | 'returnBinary';
	/** URL */
	redirectUrl?: string;
	/** Completion Title */
	completionTitle?: string;
	/** Completion Message */
	completionMessage?: string;
	/** Text */
	responseText?: string;
	/** Input Data Field Name */
	inputDataFieldName?: string;
}

export interface FormTrigger_v2_3Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'basicAuth' | 'none';
	/** Form Path */
	path?: string;
	/** Form Title */
	formTitle?: string;
	/** Form Description */
	formDescription?: string;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Respond When */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
	/** In the 'Respond to Webhook' node, select 'Respond With JSON' and set the <strong>formSubmittedText</strong> key to display a custom response in the form, or the <strong>redirectURL</strong> key to redirect users to a URL */
	formNotice?: unknown;
	/** Build multi-step forms by adding a form page later in your workflow */
	addFormPage?: unknown;
}

export interface FormTrigger_v1Parameters extends BaseNodeParams {
	/** Form Path */
	path?: string;
	/** Form Title */
	formTitle?: string;
	/** Form Description */
	formDescription?: string;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Respond When */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
}

export interface FormIoTriggerParameters extends BaseNodeParams {
	/** Project Name or ID */
	projectId?: string;
	/** Form Name or ID */
	formId?: string;
	/** Trigger Events */
	events?: unknown;
	/** Simplify */
	simple?: boolean;
}

export interface FormstackTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Form Name or ID */
	formId?: string;
	/** Simplify */
	simple?: boolean;
}

export interface FreshdeskParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'ticket';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Requester Identification */
	requester?: 'email' | 'facebookId' | 'phone' | 'requesterId' | 'twitterId' | 'uniqueExternalId';
	/** Value */
	requesterIdentificationValue?: string;
	/** Status */
	status?: 'closed' | 'open' | 'pending' | 'resolved';
	/** Priority */
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	/** Source */
	source?:
		| 'chat'
		| 'email'
		| 'feedbackWidget'
		| 'mobileHelp'
		| 'OutboundEmail'
		| 'phone'
		| 'portal';
	/** Ticket ID */
	ticketId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
}

export interface FreshserviceParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'agent'
		| 'agentGroup'
		| 'agentRole'
		| 'announcement'
		| 'assetType'
		| 'change'
		| 'department'
		| 'location'
		| 'problem'
		| 'product'
		| 'release'
		| 'requester'
		| 'requesterGroup'
		| 'software'
		| 'ticket';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Email */
	email?: string;
	/** First Name */
	firstName?: string;
	/** Roles */
	roles?: Record<string, unknown>;
	/** Agent ID */
	agentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Agent Group ID */
	agentGroupId?: string;
	/** Agent Role ID */
	agentRoleId?: string;
	/** Title */
	title?: string;
	/** Body */
	bodyHtml?: string;
	/** Visibility */
	visibility?: 'agents_only' | 'grouped_visibility' | 'everyone';
	/** Visible From */
	visibleFrom?: string;
	/** Announcement ID */
	announcementId?: string;
	/** Asset Type ID */
	assetTypeId?: string;
	/** Requester Name or ID */
	requesterId?: string;
	/** Subject */
	subject?: string;
	/** Planned Start Date */
	plannedStartDate?: string;
	/** Planned End Date */
	plannedEndDate?: string;
	/** Change ID */
	changeId?: string;
	/** Department ID */
	departmentId?: string;
	/** Location ID */
	locationId?: string;
	/** Due By */
	dueBy?: string;
	/** Problem ID */
	problemId?: string;
	/** Product ID */
	productId?: string;
	/** Release Type */
	releaseType?: 1 | 2 | 3 | 4;
	/** Priority */
	priority?: 1 | 2 | 3 | 4;
	/** Status */
	status?: 1 | 2 | 3 | 4 | 5;
	/** Release ID */
	releaseId?: string;
	/** Primary Email */
	primaryEmail?: string;
	/** Requester Group ID */
	requesterGroupId?: string;
	/** Application Type */
	applicationType?: 'desktop' | 'mobile' | 'saas';
	/** Software ID */
	softwareId?: string;
	/** Description */
	description?: string;
	/** Ticket ID */
	ticketId?: string;
}

export interface FreshworksCrmParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'account'
		| 'appointment'
		| 'contact'
		| 'deal'
		| 'note'
		| 'salesActivity'
		| 'search'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Account ID */
	accountId?: string;
	/** View Name or ID */
	view?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Start Date */
	fromDate?: string;
	/** End Date */
	endDate?: string;
	/** Attendees */
	attendees?: Record<string, unknown>;
	/** Appointment ID */
	appointmentId?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Email Address */
	emails?: string;
	/** Contact ID */
	contactId?: string;
	/** Amount */
	amount?: number;
	/** Deal ID */
	dealId?: string;
	/** Content */
	description?: string;
	/** Target Type */
	targetableType?: 'Contact' | 'Deal' | 'SalesAccount';
	/** Target ID */
	targetable_id?: string;
	/** Note ID */
	noteId?: string;
	/** Sales Activity Type Name or ID */
	sales_activity_type_id?: string;
	/** Owner Name or ID */
	ownerId?: string;
	/** Start Date */
	from_date?: string;
	/** End Date */
	end_date?: string;
	/** Sales Activity ID */
	salesActivityId?: string;
	/** Search Term */
	query?: string;
	/** Search on Entities */
	entities?: unknown;
	/** Search Field */
	searchField?: 'email' | 'name' | 'customField';
	/** Custom Field Name */
	customFieldName?: string;
	/** Custom Field Value */
	customFieldValue?: string;
	/** Field Value */
	fieldValue?: string;
	/** Due Date */
	dueDate?: string;
	/** Task ID */
	taskId?: string;
}

export interface FtpParameters extends BaseNodeParams {
	/** Protocol */
	protocol?: 'ftp' | 'sftp';
	/** Operation */
	operation?: 'delete' | 'download' | 'list' | 'rename' | 'upload';
	/** Path */
	path?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Old Path */
	oldPath?: string;
	/** New Path */
	newPath?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Recursive */
	recursive?: boolean;
}

export interface FunctionParameters extends BaseNodeParams {
	/** A newer version of this node type is available, called the ‘Code’ node */
	notice?: unknown;
	/** JavaScript Code */
	functionCode?: string;
}

export interface FunctionItemParameters extends BaseNodeParams {
	/** A newer version of this node type is available, called the ‘Code’ node */
	notice?: unknown;
	/** JavaScript Code */
	functionCode?: string;
}

export interface GetResponseParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GetResponseTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Events */
	events?: unknown;
	/** List Names or IDs */
	listIds?: unknown;
}

export interface GhostParameters extends BaseNodeParams {
	/** Source */
	source?: 'adminApi' | 'contentApi';
	/** Resource */
	resource?: 'post' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Content Format */
	contentFormat?: 'html' | 'mobileDoc' | 'lexical';
	/** Content */
	content?: string;
	/** Post ID */
	postId?: string;
	/** By */
	by?: 'id' | 'slug';
	/** Identifier */
	identifier?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GitParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'gitPassword' | 'none';
	/** Operation */
	operation?:
		| 'add'
		| 'addConfig'
		| 'clone'
		| 'commit'
		| 'fetch'
		| 'listConfig'
		| 'log'
		| 'pull'
		| 'push'
		| 'pushTags'
		| 'status'
		| 'switchBranch'
		| 'tag'
		| 'userSetup';
	/** Repository Path */
	repositoryPath?: string;
	/** Paths to Add */
	pathsToAdd?: string;
	/** Key */
	key?: string;
	/** Value */
	value?: string;
	/** Source Repository */
	sourceRepository?: string;
	/** Message */
	message?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Branch Name */
	branchName?: string;
	/** Name */
	name?: string;
}

export interface GithubParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'file'
		| 'issue'
		| 'organization'
		| 'release'
		| 'repository'
		| 'review'
		| 'user'
		| 'workflow'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getRepositories' | '__CUSTOM_API_CALL__';
	/** Your execution will pause until a webhook is called. This URL will be generated at runtime and passed to your Github workflow as a resumeUrl input. */
	webhookNotice?: unknown;
	/** Repository Owner */
	owner?: unknown;
	/** Repository Name */
	repository?: unknown;
	/** Workflow */
	workflowId?: unknown;
	/** Ref */
	ref?: string;
	/** Inputs */
	inputs?: string | object;
	/** File Path */
	filePath?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Commit Message */
	commitMessage?: string;
	/** Additional Parameters */
	additionalParameters?: Record<string, unknown>;
	/** As Binary Property */
	asBinaryProperty?: boolean;
	/** Title */
	title?: string;
	/** Body */
	body?: string;
	/** Labels */
	labels?: Record<string, unknown>;
	/** Assignees */
	assignees?: Record<string, unknown>;
	/** Issue Number */
	issueNumber?: number;
	/** Edit Fields */
	editFields?: Record<string, unknown>;
	/** Lock Reason */
	lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam';
	/** Tag */
	releaseTag?: string;
	/** Release ID */
	release_id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	getRepositoryIssuesFilters?: Record<string, unknown>;
	/** Filters */
	getRepositoryPullRequestsFilters?: Record<string, unknown>;
	/** PR Number */
	pullRequestNumber?: number;
	/** Review ID */
	reviewId?: string;
	/** Event */
	event?: 'approve' | 'requestChanges' | 'comment' | 'pending';
	/** Organization */
	organization?: string;
	/** Email */
	email?: string;
	/** Filters */
	getUserIssuesFilters?: Record<string, unknown>;
}

export interface GithubTriggerParameters extends BaseNodeParams {
	/** Only members with owner privileges for an organization or admin privileges for a repository can set up the webhooks this node requires. */
	notice?: unknown;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Repository Owner */
	owner?: unknown;
	/** Repository Name */
	repository?: unknown;
	/** Events */
	events?: unknown;
}

export interface GitlabParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'file' | 'issue' | 'release' | 'repository' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'createComment' | 'edit' | 'get' | 'lock' | '__CUSTOM_API_CALL__';
	/** Project Owner */
	owner?: string;
	/** Project Name */
	repository?: string;
	/** Title */
	title?: string;
	/** Body */
	body?: string;
	/** Due Date */
	due_date?: string;
	/** Labels */
	labels?: Record<string, unknown>;
	/** Assignees */
	assignee_ids?: Record<string, unknown>;
	/** Issue Number */
	issueNumber?: number;
	/** Edit Fields */
	editFields?: Record<string, unknown>;
	/** Lock Reason */
	lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam';
	/** Tag */
	releaseTag?: string;
	/** Project ID */
	projectId?: string;
	/** Tag Name */
	tag_name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	getRepositoryIssuesFilters?: Record<string, unknown>;
	/** File Path */
	filePath?: string;
	/** Page */
	page?: number;
	/** Additional Parameters */
	additionalParameters?: Record<string, unknown>;
	/** As Binary Property */
	asBinaryProperty?: boolean;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Commit Message */
	commitMessage?: string;
	/** Branch */
	branch?: string;
}

export interface GitlabTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Repository Owner */
	owner?: string;
	/** Repository Name */
	repository?: string;
	/** Events */
	events?: unknown;
}

export interface GongParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'call' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Call to Get */
	call?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** User to Get */
	user?: unknown;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleAdsParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'campaign' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getAll' | 'get' | '__CUSTOM_API_CALL__';
	/** Divide field names expressed with <i>micros</i> by 1,000,000 to get the actual value */
	campaigsNotice?: unknown;
	/** Manager Customer ID */
	managerCustomerId?: string;
	/** Client Customer ID */
	clientCustomerId?: string;
	/** Campaign ID */
	campaignId?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleAnalytics_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'report' | 'userActivity' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | '__CUSTOM_API_CALL__';
	/** Property Type */
	propertyType?: 'ga4' | 'universal';
	/** Property */
	propertyId?: unknown;
	/** Date Range */
	dateRange?:
		| 'last7days'
		| 'last30days'
		| 'today'
		| 'yesterday'
		| 'lastCalendarWeek'
		| 'lastCalendarMonth'
		| 'custom';
	/** Start */
	startDate?: string;
	/** End */
	endDate?: string;
	/** Metrics */
	metricsGA4?: Record<string, unknown>;
	/** Dimensions to split by */
	dimensionsGA4?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify Output */
	simple?: boolean;
	/** View */
	viewId?: unknown;
	/** Metrics */
	metricsUA?: Record<string, unknown>;
	/** Dimensions to split by */
	dimensionsUA?: Record<string, unknown>;
	/** User ID */
	userId?: string;
}

export interface GoogleAnalytics_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Resource */
	resource?: 'report' | 'userActivity';
	/** Operation */
	operation?: 'get';
	/** View Name or ID */
	viewId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
	/** User ID */
	userId?: string;
}

export interface GoogleBigQuery_v2_1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Operation */
	operation?: 'executeQuery' | 'insert';
	/** Project */
	projectId?: unknown;
	/** Dataset */
	datasetId?: unknown;
	/** Table */
	tableId?: unknown;
	/** SQL Query */
	sqlQuery?: string;
	/** Data Mode */
	dataMode?: 'autoMap' | 'define';
	/** In this mode, make sure the incoming data fields are named the same as the columns in BigQuery. (Use an 'Edit Fields' node before this node to change them if required.) */
	info?: unknown;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
}

export interface GoogleBigQuery_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'record';
	/** Operation */
	operation?: 'create' | 'getAll';
	/** Project Name or ID */
	projectId?: string;
	/** Dataset Name or ID */
	datasetId?: string;
	/** Table Name or ID */
	tableId?: string;
	/** Columns */
	columns?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
}

export interface GoogleBooksParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'bookshelf' | 'bookshelfVolume' | 'volume' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** My Library */
	myLibrary?: boolean;
	/** Search Query */
	searchQuery?: string;
	/** User ID */
	userId?: string;
	/** Bookshelf ID */
	shelfId?: string;
	/** Volume ID */
	volumeId?: string;
	/** Volume Position */
	volumePosition?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GoogleCalendarParameters extends BaseNodeParams {
	/** Interact with your Google Calendar using our pre-built */
	preBuiltAgentsCalloutGoogleCalendar?: unknown;
	/** Resource */
	resource?: 'calendar' | 'event' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'availability' | '__CUSTOM_API_CALL__';
	/** Calendar */
	calendar?: unknown;
	/** Start Time */
	timeMin?: string;
	/** End Time */
	timeMax?: string;
	/** Start */
	start?: string;
	/** End */
	end?: string;
	/** Use Default Reminders */
	useDefaultReminders?: boolean;
	/** Reminders */
	remindersUi?: Record<string, unknown>;
	/** Event ID */
	eventId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Modify */
	modifyTarget?: 'instance' | 'event';
	/** This node will use the time zone set in n8n’s settings, but you can override this in the workflow settings */
	useN8nTimeZone?: unknown;
}

export interface GoogleCalendarTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Calendar */
	calendarId?: unknown;
	/** Trigger On */
	triggerOn?: 'eventCancelled' | 'eventCreated' | 'eventEnded' | 'eventStarted' | 'eventUpdated';
}

export interface GoogleChatParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'member' | 'message' | 'space' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Member ID */
	memberId?: string;
	/** Space Name or ID */
	spaceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Message */
	messageUi?: Record<string, unknown>;
	/** See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat Guide</a> To Creating Messages */
	jsonNotice?: unknown;
	/** Message (JSON) */
	messageJson?: string | object;
	/** Message ID */
	messageId?: string;
	/** Update Fields */
	updateFieldsUi?: Record<string, unknown>;
	/** Update Fields (JSON) */
	updateFieldsJson?: string | object;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface GoogleCloudNaturalLanguageParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyzeSentiment' | '__CUSTOM_API_CALL__';
	/** Source */
	source?: 'content' | 'gcsContentUri';
	/** Content */
	content?: string;
	/** Google Cloud Storage URI */
	gcsContentUri?: string;
}

export interface GoogleCloudStorageParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'bucket' | 'object' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Project ID */
	projectId?: string;
	/** Bucket Name */
	bucketName?: string;
	/** Prefix */
	prefix?: string;
	/** Projection */
	projection?: 'full' | 'noAcl';
	/** Return All */
	returnAll?: boolean;
	/** Filters */
	getFilters?: Record<string, unknown>;
	/** Predefined Access Control */
	createAcl?: Record<string, unknown>;
	/** Additional Parameters */
	createBody?: Record<string, unknown>;
	/** Object Name */
	objectName?: string;
	/** Projection */
	updateProjection?: 'full' | 'noAcl';
	/** Return Data */
	alt?: 'json' | 'media';
	/** Use Input Binary Field */
	createFromBinary?: boolean;
	/** Input Binary Field */
	createBinaryPropertyName?: string;
	/** File Content */
	createContent?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Limit */
	maxResults?: number;
	/** Create Fields */
	createData?: Record<string, unknown>;
	/** Update Fields */
	updateData?: Record<string, unknown>;
	/** Additional Parameters */
	createQuery?: Record<string, unknown>;
	/** Additional Parameters */
	getParameters?: Record<string, unknown>;
	/** Additional Parameters */
	metagenAndAclQuery?: Record<string, unknown>;
	/** Encryption Headers */
	encryptionHeaders?: Record<string, unknown>;
	/** Additional Parameters */
	listFilters?: Record<string, unknown>;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleContactsParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Family Name */
	familyName?: string;
	/** Given Name */
	givenName?: string;
	/** Contact ID */
	contactId?: string;
	/** Fields */
	fields?: unknown;
	/** RAW Data */
	rawData?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Use Query */
	useQuery?: boolean;
	/** Query */
	query?: string;
}

export interface GoogleDocsParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'update' | '__CUSTOM_API_CALL__';
	/** Drive Name or ID */
	driveId?: string;
	/** Folder Name or ID */
	folderId?: string;
	/** Title */
	title?: string;
	/** Doc ID or URL */
	documentURL?: string;
	/** Simplify */
	simple?: boolean;
	/** Actions */
	actionsUi?: Record<string, unknown>;
}

export interface GoogleDrive_v3Parameters extends BaseNodeParams {
	/** Retrieve, analyze, and answer questions using your Google Drive documents with our pre-built */
	preBuiltAgentsCalloutGoogleDrive?: unknown;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'file' | 'fileFolder' | 'folder' | 'drive' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'deleteDrive' | 'get' | 'list' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Shared Drive */
	driveId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** File */
	fileId?: unknown;
	/** Copy In The Same Folder */
	sameFolder?: boolean;
	/** Parent Folder */
	folderId?: unknown;
	/** File Content */
	content?: string;
	/** Permissions */
	permissionsUi?: Record<string, unknown>;
	/** Change File Content */
	changeFileContent?: boolean;
	/** Input Data Field Name */
	inputDataFieldName?: string;
	/** New Updated File Name */
	newUpdatedFileName?: string;
	/** Search Method */
	searchMethod?: 'name' | 'query';
	/** Search Query */
	queryString?: string;
	/** Filter */
	filter?: Record<string, unknown>;
	/** Folder */
	folderNoRootId?: unknown;
}

export interface GoogleDrive_v2Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'drive' | 'file' | 'folder';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'list' | 'share' | 'update' | 'upload';
	/** File */
	fileId?: unknown;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Use Query String */
	useQueryString?: boolean;
	/** Query String */
	queryString?: string;
	/** Limit */
	limit?: number;
	/** Filters */
	queryFilters?: Record<string, unknown>;
	/** Permissions */
	permissionsUi?: Record<string, unknown>;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** File Name */
	name?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** Parents */
	parents?: string;
	/** Drive */
	driveId?: unknown;
	/** Return All */
	returnAll?: boolean;
}

export interface GoogleDriveTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Credential Type */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Trigger On */
	triggerOn?: 'specificFile' | 'specificFolder';
	/** File */
	fileToWatch?: unknown;
	/** Watch For */
	event?: 'fileUpdated';
	/** Folder */
	folderToWatch?: unknown;
	/** Changes within subfolders won't trigger this node */
	asas?: unknown;
	/** Drive To Watch */
	driveToWatch?: string;
}

export interface GoogleFirebaseCloudFirestoreParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'googleFirebaseCloudFirestoreOAuth2Api' | 'serviceAccount';
	/** Resource */
	resource?: 'document' | 'collection' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'upsert' | 'delete' | 'get' | 'getAll' | 'query' | '__CUSTOM_API_CALL__';
	/** Project Name or ID */
	projectId?: string;
	/** Database */
	database?: string;
	/** Collection */
	collection?: string;
	/** Document ID */
	documentId?: string;
	/** Columns / Attributes */
	columns?: string;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Update Key */
	updateKey?: string;
	/** Query JSON */
	query?: string;
}

export interface GoogleFirebaseRealtimeDatabaseParameters extends BaseNodeParams {
	/** Project Name or ID */
	projectId?: string;
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'push' | 'update' | '__CUSTOM_API_CALL__';
	/** Object Path */
	path?: string;
	/** Columns / Attributes */
	attributes?: string;
}

export interface Gmail_v2_1Parameters extends BaseNodeParams {
	/** Sort your Gmail inbox using our pre-built */
	preBuiltAgentsCalloutGmail?: unknown;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'message' | 'label' | 'draft' | 'thread';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll';
	/** Draft ID */
	messageId?: string;
	/** Subject */
	subject?: string;
	/** To reply to an existing thread, specify the exact subject title of that thread. */
	threadNotice?: unknown;
	/** Email Type */
	emailType?: 'html' | 'text';
	/** Message */
	message?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Label ID */
	labelId?: string;
	/** To */
	sendTo?: string;
	/** Simplify */
	simple?: boolean;
	/** Fetching a lot of messages may take a long time. Consider using filters to speed things up */
	filtersNotice?: unknown;
	/** Label Names or IDs */
	labelIds?: unknown;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Thread ID */
	threadId?: string;
}

export interface Gmail_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'draft' | 'label' | 'message' | 'messageLabel';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll';
	/** Draft ID */
	messageId?: string;
	/** Subject */
	subject?: string;
	/** HTML */
	includeHtml?: boolean;
	/** HTML Message */
	htmlMessage?: string;
	/** Message */
	message?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Label ID */
	labelId?: string;
	/** Label List Visibility */
	labelListVisibility?: 'labelHide' | 'labelShow' | 'labelShowIfUnread';
	/** Message List Visibility */
	messageListVisibility?: 'hide' | 'show';
	/** Thread ID */
	threadId?: string;
	/** To Email */
	toList?: string;
	/** Label Names or IDs */
	labelIds?: unknown;
}

export interface GmailTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Event */
	event?: 'messageReceived';
	/** Simplify */
	simple?: boolean;
}

export interface GSuiteAdminParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'device' | 'group' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'update' | 'changeStatus' | '__CUSTOM_API_CALL__';
	/** Device */
	deviceId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Output */
	projection?: 'basic' | 'full';
	/** Include Children */
	includeChildOrgunits?: boolean;
	/** Filter */
	filter?: Record<string, unknown>;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Update Fields */
	updateOptions?: Record<string, unknown>;
	/** Status */
	action?: 'reenable' | 'disable';
	/** Group */
	groupId?: unknown;
	/** Group Name */
	name?: string;
	/** Group Email */
	email?: string;
	/** User */
	userId?: unknown;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Password */
	password?: string;
	/** Username */
	username?: string;
	/** Domain Name or ID */
	domain?: string;
	/** Output */
	output?: 'simplified' | 'raw' | 'select';
	/** Fields */
	fields?: unknown;
	/** Custom Schema Names or IDs */
	customFieldMask?: unknown;
}

export interface GoogleBusinessProfileParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'post' | 'review' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Account */
	account?: unknown;
	/** Location */
	location?: unknown;
	/** Post Type */
	postType?: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
	/** Summary */
	summary?: string;
	/** Title */
	title?: string;
	/** Start Date and Time */
	startDateTime?: string;
	/** End Date and Time */
	endDateTime?: string;
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Alert Type */
	alertType?: 'COVID_19';
	/** Options */
	additionalOptions?: Record<string, unknown>;
	/** Post */
	post?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Make sure that the updated options are supported by the post type. <a target='_blank' href='https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts#resource:-localpost'>More info</a>. */
	notice?: unknown;
	/** Review */
	review?: unknown;
	/** Reply */
	reply?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleBusinessProfileTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Event */
	event?: 'reviewAdded';
	/** Account */
	account?: unknown;
	/** Location */
	location?: unknown;
}

export interface GooglePerspectiveParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'analyzeComment' | '__CUSTOM_API_CALL__';
	/** Text */
	text?: string;
	/** Attributes to Analyze */
	requestedAttributesUi?: Record<string, unknown>;
}

export interface GoogleSheets_v4_7Parameters extends BaseNodeParams {
	/** Manage tasks in Google Sheets using our pre-built */
	preBuiltAgentsCalloutGoogleSheets?: unknown;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'spreadsheet' | 'sheet';
	/** Operation */
	operation?:
		| 'appendOrUpdate'
		| 'append'
		| 'clear'
		| 'create'
		| 'remove'
		| 'delete'
		| 'read'
		| 'update';
	/** Document */
	documentId?: unknown;
	/** Sheet */
	sheetName?: unknown;
	/** Data Mode */
	dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing';
	/** In this mode, make sure the incoming data is named the same as the columns in your Sheet. (Use an 'Edit Fields' node before this node to change it if required.) */
	autoMapNotice?: unknown;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Columns */
	columns?: unknown;
	/** Clear */
	clear?: 'wholeSheet' | 'specificRows' | 'specificColumns' | 'specificRange';
	/** Keep First Row */
	keepFirstRow?: boolean;
	/** Start Row Number */
	startIndex?: number;
	/** Number of Rows to Delete */
	rowsToDelete?: number;
	/** Number of Columns to Delete */
	columnsToDelete?: number;
	/** Range */
	range?: string;
	/** Title */
	title?: string;
	/** To Delete */
	toDelete?: 'rows' | 'columns';
	/** Number of Rows to Delete */
	numberToDelete?: number;
	/** Filters */
	filtersUI?: Record<string, unknown>;
	/** Combine Filters */
	combineFilters?: 'AND' | 'OR';
	/** Column to match on */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
	/** Sheets */
	sheetsUi?: Record<string, unknown>;
}

export interface GoogleSheets_v2Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'spreadsheet' | 'sheet';
	/** Operation */
	operation?:
		| 'append'
		| 'clear'
		| 'create'
		| 'upsert'
		| 'delete'
		| 'lookup'
		| 'read'
		| 'remove'
		| 'update';
	/** Spreadsheet ID */
	sheetId?: string;
	/** Range */
	range?: string;
	/** To Delete */
	toDelete?: Record<string, unknown>;
	/** RAW Data */
	rawData?: boolean;
	/** Data Property */
	dataProperty?: string;
	/** Data Start Row */
	dataStartRow?: number;
	/** Key Row */
	keyRow?: number;
	/** Lookup Column */
	lookupColumn?: string;
	/** Lookup Value */
	lookupValue?: string;
	/** Key */
	key?: string;
	/** Title */
	title?: string;
	/** Sheets */
	sheetsUi?: Record<string, unknown>;
	/** Simplify */
	simple?: boolean;
	/** Sheet ID */
	id?: string;
}

export interface GoogleSheetsTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Authentication */
	authentication?: unknown;
	/** Document */
	documentId?: unknown;
	/** Sheet */
	sheetName?: unknown;
	/** Trigger On */
	event?: 'rowAdded' | 'rowUpdate' | 'anyUpdate';
	/** Include in Output */
	includeInOutput?: 'new' | 'old' | 'both';
}

export interface GoogleSlidesParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'page' | 'presentation' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getSlides' | 'replaceText' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Presentation ID */
	presentationId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Page Object ID */
	pageObjectId?: string;
	/** Texts To Replace */
	textUi?: Record<string, unknown>;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
}

export interface GoogleTasksParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'task' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** TaskList Name or ID */
	task?: string;
	/** Title */
	title?: string;
	/** Task ID */
	taskId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GoogleTranslateParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'language' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'translate' | '__CUSTOM_API_CALL__';
	/** Text */
	text?: string;
	/** Translate To */
	translateTo?: string;
}

export interface YouTubeParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'channel'
		| 'playlist'
		| 'playlistItem'
		| 'video'
		| 'videoCategory'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'update' | 'uploadBanner' | '__CUSTOM_API_CALL__';
	/** Fields */
	part?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Channel ID */
	channelId?: string;
	/** Input Binary Field */
	binaryProperty?: string;
	/** Title */
	title?: string;
	/** Playlist ID */
	playlistId?: string;
	/** Video ID */
	videoId?: string;
	/** Playlist Item ID */
	playlistItemId?: string;
	/** Region Code */
	regionCode?: string;
	/** Category Name or ID */
	categoryId?: string;
	/** Rating */
	rating?: 'dislike' | 'like' | 'none';
}

export interface GotifyParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'message';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll';
	/** Message */
	message?: string;
	/** Message ID */
	messageId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GoToWebinarParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'attendee'
		| 'coorganizer'
		| 'panelist'
		| 'registrant'
		| 'session'
		| 'webinar'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'getDetails' | '__CUSTOM_API_CALL__';
	/** Webinar Key Name or ID */
	webinarKey?: string;
	/** Session Key Name or ID */
	sessionKey?: string;
	/** Registrant Key */
	registrantKey?: string;
	/** Details */
	details?: 'polls' | 'questions' | 'surveyAnswers';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Is External */
	isExternal?: boolean;
	/** Organizer Key */
	organizerKey?: string;
	/** Given Name */
	givenName?: string;
	/** Email */
	email?: string;
	/** Co-Organizer Key */
	coorganizerKey?: string;
	/** Name */
	name?: string;
	/** Panelist Key */
	panelistKey?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Subject */
	subject?: string;
	/** Time Range */
	times?: Record<string, unknown>;
	/** Notify Participants */
	notifyParticipants?: boolean;
}

export interface GrafanaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'dashboard' | 'team' | 'teamMember' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Dashboard UID or URL */
	dashboardUidOrUrl?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Team ID */
	teamId?: string;
	/** User Name or ID */
	userId?: string;
	/** User Name or ID */
	memberId?: string;
}

export interface GraphqlParameters extends BaseNodeParams {
	/** Authentication */
	authentication?:
		| 'basicAuth'
		| 'customAuth'
		| 'digestAuth'
		| 'headerAuth'
		| 'none'
		| 'oAuth1'
		| 'oAuth2'
		| 'queryAuth';
	/** HTTP Request Method */
	requestMethod?: 'GET' | 'POST';
	/** Endpoint */
	endpoint?: string;
	/** Ignore SSL Issues (Insecure) */
	allowUnauthorizedCerts?: boolean;
	/** Request Format */
	requestFormat?: 'graphql' | 'json';
	/** Query */
	query?: string;
	/** Variables */
	variables?: string | object;
	/** Operation Name */
	operationName?: string;
	/** Response Format */
	responseFormat?: 'json' | 'string';
	/** Response Data Property Name */
	dataPropertyName?: string;
	/** Headers */
	headerParametersUi?: Record<string, unknown>;
}

export interface GristParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update';
	/** Document ID */
	docId?: string;
	/** Table ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** Data to Send */
	dataToSend?: 'autoMapInputs' | 'defineInNode';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsToSend?: Record<string, unknown>;
}

export interface GumroadTriggerParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'cancellation' | 'dispute' | 'dispute_won' | 'refund' | 'sale';
}

export interface HackerNewsParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'all' | 'article' | 'user';
	/** Operation */
	operation?: 'getAll';
	/** Article ID */
	articleId?: string;
	/** Username */
	username?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface HaloPSAParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'client' | 'site' | 'ticket' | 'user';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	clientName?: string;
	/** Client ID */
	clientId?: string;
	/** Simplify */
	simplify?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Ticket Type Name or ID */
	ticketType?: string;
	/** Summary */
	summary?: string;
	/** Details */
	details?: string;
	/** Ticket ID */
	ticketId?: string;
	/** Name */
	siteName?: string;
	/** Select Client by ID */
	selectOption?: boolean;
	/** Site ID */
	siteId?: string;
	/** Name */
	userName?: string;
	/** User ID */
	userId?: string;
}

export interface HarvestParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'client'
		| 'company'
		| 'contact'
		| 'estimate'
		| 'expense'
		| 'invoice'
		| 'project'
		| 'task'
		| 'timeEntry'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Account Name or ID */
	accountId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Client ID */
	id?: string;
	/** Name */
	name?: string;
	/** First Name */
	firstName?: string;
	/** Client ID */
	clientId?: string;
	/** Project ID */
	projectId?: string;
	/** Expense Category ID */
	expenseCategoryId?: string;
	/** Spent Date */
	spentDate?: string;
	/** Is Billable */
	isBillable?: boolean;
	/** Bill By */
	billBy?: 'none' | 'People' | 'Project' | 'Tasks';
	/** Budget By */
	budgetBy?: string;
	/** Task ID */
	taskId?: string;
	/** Last Name */
	lastName?: string;
	/** Email */
	email?: string;
}

export interface HelpScoutParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'conversation' | 'customer' | 'mailbox' | 'thread' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Mailbox Name or ID */
	mailboxId?: string;
	/** Status */
	status?: 'active' | 'closed' | 'pending';
	/** Subject */
	subject?: string;
	/** Type */
	type?: 'chat' | 'email' | 'phone';
	/** Resolve Data */
	resolveData?: boolean;
	/** Threads */
	threadsUi?: Record<string, unknown>;
	/** Conversation ID */
	conversationId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Address */
	addressUi?: Record<string, unknown>;
	/** Chat Handles */
	chatsUi?: Record<string, unknown>;
	/** Emails */
	emailsUi?: Record<string, unknown>;
	/** Phones */
	phonesUi?: Record<string, unknown>;
	/** Social Profiles */
	socialProfilesUi?: Record<string, unknown>;
	/** Websites */
	websitesUi?: Record<string, unknown>;
	/** Customer ID */
	customerId?: string;
	/** Text */
	text?: string;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
}

export interface HelpScoutTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
}

export interface HighLevel_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'opportunity' | 'task' | 'calendar' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Create a new contact or update an existing one if email or phone matches (upsert) */
	contactCreateNotice?: unknown;
	/** Email */
	email?: string;
	/** Phone */
	phone?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Pipeline Name or ID */
	pipelineId?: string;
	/** Name */
	name?: string;
	/** Status */
	status?: 'open' | 'won' | 'lost' | 'abandoned';
	/** Opportunity ID */
	opportunityId?: string;
	/** Title */
	title?: string;
	/** Due Date */
	dueDate?: string;
	/** Completed */
	completed?: boolean;
	/** Task ID */
	taskId?: string;
	/** Calendar ID */
	calendarId?: string;
	/** Location ID */
	locationId?: string;
	/** Start Time */
	startTime?: string;
	/** Start Date */
	startDate?: number;
	/** End Date */
	endDate?: number;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface HighLevel_v1Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'opportunity' | 'task';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'lookup' | 'update';
	/** Create a new contact or update an existing one if email or phone matches (upsert) */
	contactCreateNotice?: unknown;
	/** Email */
	email?: string;
	/** Phone */
	phone?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Pipeline Name or ID */
	pipelineId?: string;
	/** Stage Name or ID */
	stageId?: string;
	/** Contact Identifier */
	contactIdentifier?: string;
	/** Title */
	title?: string;
	/** Status */
	status?: 'open' | 'won' | 'lost' | 'abandoned';
	/** Opportunity ID */
	opportunityId?: string;
	/** Due Date */
	dueDate?: string;
	/** Task ID */
	taskId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface HomeAssistantParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'cameraProxy' | 'config' | 'event' | 'log' | 'service' | 'state' | 'template';
	/** Operation */
	operation?: 'getScreenshot';
	/** Camera Entity Name or ID */
	cameraEntityId?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Event Type */
	eventType?: string;
	/** Event Attributes */
	eventAttributes?: Record<string, unknown>;
	/** Domain Name or ID */
	domain?: string;
	/** Service Name or ID */
	service?: string;
	/** Service Attributes */
	serviceAttributes?: Record<string, unknown>;
	/** Entity Name or ID */
	entityId?: string;
	/** State */
	state?: string;
	/** State Attributes */
	stateAttributes?: Record<string, unknown>;
	/** Template */
	template?: string;
}

export interface HtmlExtractParameters extends BaseNodeParams {
	/** Source Data */
	sourceData?: 'binary' | 'json';
	/** Input Binary Field */
	dataPropertyName?: string;
	/** Extraction Values */
	extractionValues?: Record<string, unknown>;
}

export interface HtmlParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'generateHtmlTemplate' | 'extractHtmlContent' | 'convertToHtmlTable';
	/** HTML Template */
	html?: string;
	/** <b>Tips</b>: Type ctrl+space for completions. Use <code>{{ }}</code> for expressions and <code>&lt;style&gt;</code> tags for CSS. JS in <code>&lt;script&gt;</code> tags is included but not executed in n8n. */
	notice?: unknown;
	/** Source Data */
	sourceData?: 'binary' | 'json';
	/** Input Binary Field */
	dataPropertyName?: string;
	/** Extraction Values */
	extractionValues?: Record<string, unknown>;
}

export interface HttpRequest_v4_3Parameters extends BaseNodeParams {
	/** Try the HTTP request tool with our pre-built */
	preBuiltAgentsCalloutHttpRequest?: unknown;
	curlImport?: unknown;
	/** Method */
	method?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
	/** URL */
	url?: string;
	/** Authentication */
	authentication?: 'none' | 'predefinedCredentialType' | 'genericCredentialType';
	/** Credential Type */
	nodeCredentialType?: unknown;
	/** Make sure you have specified the scope(s) for the Service Account in the credential */
	googleApiWarning?: unknown;
	/** Generic Auth Type */
	genericAuthType?: unknown;
	/** SSL Certificates */
	provideSslCertificates?: boolean;
	/** Provide certificates in node's 'Credential for SSL Certificates' parameter */
	provideSslCertificatesNotice?: unknown;
	/** SSL Certificate */
	sslCertificate?: unknown;
	/** Send Query Parameters */
	sendQuery?: boolean;
	/** Specify Query Parameters */
	specifyQuery?: 'keypair' | 'json';
	/** Query Parameters */
	queryParameters?: Record<string, unknown>;
	/** JSON */
	jsonQuery?: string | object;
	/** Send Headers */
	sendHeaders?: boolean;
	/** Specify Headers */
	specifyHeaders?: 'keypair' | 'json';
	/** Header Parameters */
	headerParameters?: Record<string, unknown>;
	/** JSON */
	jsonHeaders?: string | object;
	/** Send Body */
	sendBody?: boolean;
	/** Body Content Type */
	contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'binaryData' | 'raw';
	/** Specify Body */
	specifyBody?: 'keypair' | 'json';
	/** Body Parameters */
	bodyParameters?: Record<string, unknown>;
	/** JSON */
	jsonBody?: string | object;
	/** Body */
	body?: string;
	/** Input Data Field Name */
	inputDataFieldName?: string;
	/** Content Type */
	rawContentType?: string;
	/** Optimize Response */
	optimizeResponse?: boolean;
	/** Expected Response Type */
	responseType?: 'json' | 'html' | 'text';
	/** Field Containing Data */
	dataField?: string;
	/** Include Fields */
	fieldsToInclude?: 'all' | 'selected' | 'except';
	/** Fields */
	fields?: string;
	/** Selector (CSS) */
	cssSelector?: string;
	/** Return Only Content */
	onlyContent?: boolean;
	/** Elements To Omit */
	elementsToOmit?: string;
	/** Truncate Response */
	truncateResponse?: boolean;
	/** Max Response Characters */
	maxLength?: number;
	/** You can view the raw requests this node makes in your browser's developer console */
	infoMessage?: unknown;
}

export interface HttpRequest_v2Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'none' | 'predefinedCredentialType' | 'genericCredentialType';
	/** Credential Type */
	nodeCredentialType?: unknown;
	/** Generic Auth Type */
	genericAuthType?: unknown;
	/** Request Method */
	requestMethod?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
	/** URL */
	url?: string;
	/** Ignore SSL Issues (Insecure) */
	allowUnauthorizedCerts?: boolean;
	/** Response Format */
	responseFormat?: 'file' | 'json' | 'string';
	/** Property Name */
	dataPropertyName?: string;
	/** JSON/RAW Parameters */
	jsonParameters?: boolean;
	/** Send Binary File */
	sendBinaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Body Parameters */
	bodyParametersJson?: string | object;
	/** Body Parameters */
	bodyParametersUi?: Record<string, unknown>;
	/** Headers */
	headerParametersJson?: string | object;
	/** Headers */
	headerParametersUi?: Record<string, unknown>;
	/** Query Parameters */
	queryParametersJson?: string | object;
	/** Query Parameters */
	queryParametersUi?: Record<string, unknown>;
	/** You can view the raw requests this node makes in your browser's developer console */
	infoMessage?: unknown;
}

export interface HttpRequest_v1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?:
		| 'basicAuth'
		| 'digestAuth'
		| 'headerAuth'
		| 'none'
		| 'oAuth1'
		| 'oAuth2'
		| 'queryAuth';
	/** Request Method */
	requestMethod?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
	/** URL */
	url?: string;
	/** Ignore SSL Issues (Insecure) */
	allowUnauthorizedCerts?: boolean;
	/** Response Format */
	responseFormat?: 'file' | 'json' | 'string';
	/** Property Name */
	dataPropertyName?: string;
	/** JSON/RAW Parameters */
	jsonParameters?: boolean;
	/** Send Binary File */
	sendBinaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Body Parameters */
	bodyParametersJson?: string | object;
	/** Body Parameters */
	bodyParametersUi?: Record<string, unknown>;
	/** Headers */
	headerParametersJson?: string | object;
	/** Headers */
	headerParametersUi?: Record<string, unknown>;
	/** Query Parameters */
	queryParametersJson?: string | object;
	/** Query Parameters */
	queryParametersUi?: Record<string, unknown>;
	/** You can view the raw requests this node makes in your browser's developer console */
	infoMessage?: unknown;
}

export interface Hubspot_v2_2Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'appToken' | 'oAuth2';
	/** Resource */
	resource?: 'company' | 'contact' | 'contactList' | 'deal' | 'engagement' | 'ticket';
	/** Operation */
	operation?: 'upsert' | 'delete' | 'get' | 'getAll' | 'getRecentlyCreatedUpdated' | 'search';
	/** Email */
	email?: string;
	/** Contact to Get */
	contactId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter Groups */
	filterGroupsUi?: Record<string, unknown>;
	/** By */
	by?: 'id' | 'email';
	/** Contact to Add */
	id?: number;
	/** List to Add To */
	listId?: number;
	/** Name */
	name?: string;
	/** Company to Update */
	companyId?: unknown;
	/** Domain */
	domain?: string;
	/** Deal Stage Name or ID */
	stage?: string;
	/** Deal to Update */
	dealId?: unknown;
	/** Type */
	type?: 'call' | 'email' | 'meeting' | 'task';
	/** Due Date */
	dueDate?: string;
	/** Metadata */
	metadata?: Record<string, unknown>;
	/** Engagement to Get */
	engagementId?: unknown;
	/** Pipeline Name or ID */
	pipelineId?: string;
	/** Stage Name or ID */
	stageId?: string;
	/** Ticket Name */
	ticketName?: string;
	/** Ticket to Update */
	ticketId?: unknown;
}

export interface Hubspot_v1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'appToken' | 'oAuth2';
	/** Resource */
	resource?: 'company' | 'contact' | 'contactList' | 'deal' | 'engagement' | 'form' | 'ticket';
	/** Operation */
	operation?: 'upsert' | 'delete' | 'get' | 'getAll' | 'getRecentlyCreatedUpdated' | 'search';
	/** Email */
	email?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter Groups */
	filterGroupsUi?: Record<string, unknown>;
	/** By */
	by?: 'id' | 'email';
	/** Contact ID */
	id?: string;
	/** List ID */
	listId?: string;
	/** Name */
	name?: string;
	/** Company ID */
	companyId?: string;
	/** Domain */
	domain?: string;
	/** Deal Stage Name or ID */
	stage?: string;
	/** Deal ID */
	dealId?: string;
	/** Type */
	type?: 'call' | 'email' | 'meeting' | 'task';
	/** Metadata */
	metadata?: Record<string, unknown>;
	/** Engagement ID */
	engagementId?: string;
	/** Form Name or ID */
	formId?: string;
	/** Context */
	contextUi?: Record<string, unknown>;
	/** Legal Consent */
	lengalConsentUi?: Record<string, unknown>;
	/** Pipeline Name or ID */
	pipelineId?: string;
	/** Stage Name or ID */
	stageId?: string;
	/** Ticket Name */
	ticketName?: string;
	/** Ticket ID */
	ticketId?: string;
}

export interface HubspotTriggerParameters extends BaseNodeParams {
	/** Events */
	eventsUi?: Record<string, unknown>;
}

export interface HumanticAiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'profile';
	/** Operation */
	operation?: 'create' | 'get' | 'update';
	/** User ID */
	userId?: string;
	/** Send Resume */
	sendResume?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Text */
	text?: string;
}

export interface HunterParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'domainSearch' | 'emailFinder' | 'emailVerifier';
	/** Domain */
	domain?: string;
	/** Only Emails */
	onlyEmails?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Email */
	email?: string;
}

export interface ICalParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'createEventFile';
	/** Event Title */
	title?: string;
	/** Start */
	start?: string;
	/** End */
	end?: string;
	/** All Day */
	allDay?: boolean;
	/** Put Output File in Field */
	binaryPropertyName?: string;
}

export interface If_v2_2Parameters extends BaseNodeParams {
	/** Conditions */
	conditions?: unknown;
	/** Convert types where required */
	looseTypeValidation?: boolean;
}

export interface If_v1Parameters extends BaseNodeParams {
	/** Conditions */
	conditions?: Record<string, unknown>;
	/** Combine */
	combineOperation?: 'all' | 'any';
}

export interface IntercomParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'company' | 'lead' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Select By */
	selectBy?: 'id' | 'userId';
	/** Value */
	value?: string;
	/** Update By */
	updateBy?: 'id' | 'email' | 'userId';
	/** Identifier Type */
	identifierType?: 'userId' | 'email';
	/** Value */
	idValue?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Custom Attributes */
	customAttributesJson?: string | object;
	/** Custom Attributes */
	customAttributesUi?: Record<string, unknown>;
	/** Delete By */
	deleteBy?: 'id' | 'userId';
	/** Email */
	email?: string;
	/** List By */
	listBy?: 'id' | 'companyId';
	/** Company ID */
	companyId?: string;
}

export interface IntervalParameters extends BaseNodeParams {
	/** This workflow will run on the schedule you define here once you <a data-key="activate">activate</a> it.<br><br>For testing, you can also trigger it manually: by going back to the canvas and clicking 'execute workflow' */
	notice?: unknown;
	/** Interval */
	interval?: number;
	/** Unit */
	unit?: 'seconds' | 'minutes' | 'hours';
}

export interface InvoiceNinjaParameters extends BaseNodeParams {
	/** API Version */
	apiVersion?: 'v4' | 'v5';
	/** Resource */
	resource?:
		| 'bank_transaction'
		| 'client'
		| 'expense'
		| 'invoice'
		| 'payment'
		| 'quote'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Billing Address */
	billingAddressUi?: Record<string, unknown>;
	/** Contacts */
	contactsUi?: Record<string, unknown>;
	/** Shipping Address */
	shippingAddressUi?: Record<string, unknown>;
	/** Client ID */
	clientId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Invoice Items */
	invoiceItemsUi?: Record<string, unknown>;
	/** Invoice ID */
	invoiceId?: string;
	/** Time Logs */
	timeLogsUi?: Record<string, unknown>;
	/** Task ID */
	taskId?: string;
	/** Invoice Name or ID */
	invoice?: string;
	/** Amount */
	amount?: number;
	/** Payment ID */
	paymentId?: string;
	/** Expense ID */
	expenseId?: string;
	/** Quote ID */
	quoteId?: string;
	/** Bank Transaction ID */
	bankTransactionId?: string;
}

export interface InvoiceNinjaTriggerParameters extends BaseNodeParams {
	/** API Version */
	apiVersion?: 'v4' | 'v5';
	/** Event */
	event?: 'create_client' | 'create_invoice' | 'create_payment' | 'create_quote' | 'create_vendor';
}

export interface ItemLists_v3_1Parameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'concatenateItems'
		| 'limit'
		| 'removeDuplicates'
		| 'sort'
		| 'splitOutItems'
		| 'summarize';
	/** Aggregate */
	aggregate?: 'aggregateIndividualFields' | 'aggregateAllItemData';
	/** Fields To Aggregate */
	fieldsToAggregate?: Record<string, unknown>;
	/** Put Output in Field */
	destinationFieldName?: string;
	/** Include */
	include?: 'allFields' | 'specifiedFields' | 'allFieldsExcept';
	/** Fields To Exclude */
	fieldsToExclude?: string;
	/** Fields To Include */
	fieldsToInclude?: string;
	/** Max Items */
	maxItems?: number;
	/** Keep */
	keep?: 'firstItems' | 'lastItems';
	/** Compare */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields';
	/** Fields To Compare */
	fieldsToCompare?: string;
	/** Type */
	type?: 'simple' | 'random' | 'code';
	/** Fields To Sort By */
	sortFieldsUi?: Record<string, unknown>;
	/** Code */
	code?: string;
	/** Fields To Split Out */
	fieldToSplitOut?: string;
	/** Fields to Summarize */
	fieldsToSummarize?: Record<string, unknown>;
	/** Fields to Split By */
	fieldsToSplitBy?: string;
}

export interface ItemLists_v2_2Parameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'aggregateItems'
		| 'limit'
		| 'removeDuplicates'
		| 'sort'
		| 'splitOutItems'
		| 'summarize';
	/** Fields To Split Out */
	fieldToSplitOut?: string;
	/** Include */
	include?: 'noOtherFields' | 'allOtherFields' | 'selectedOtherFields';
	/** Fields To Include */
	fieldsToInclude?: Record<string, unknown>;
	/** Aggregate */
	aggregate?: 'aggregateIndividualFields' | 'aggregateAllItemData';
	/** Fields To Aggregate */
	fieldsToAggregate?: Record<string, unknown>;
	/** Put Output in Field */
	destinationFieldName?: string;
	/** Fields To Exclude */
	fieldsToExclude?: Record<string, unknown>;
	/** Compare */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields';
	/** Fields To Compare */
	fieldsToCompare?: Record<string, unknown>;
	/** Type */
	type?: 'simple' | 'random' | 'code';
	/** Fields To Sort By */
	sortFieldsUi?: Record<string, unknown>;
	/** Code */
	code?: string;
	/** Max Items */
	maxItems?: number;
	/** Keep */
	keep?: 'firstItems' | 'lastItems';
	/** Fields to Summarize */
	fieldsToSummarize?: Record<string, unknown>;
	/** Fields to Split By */
	fieldsToSplitBy?: string;
}

export interface ItemLists_v1Parameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'aggregateItems'
		| 'limit'
		| 'removeDuplicates'
		| 'sort'
		| 'splitOutItems'
		| 'summarize';
	/** Field To Split Out */
	fieldToSplitOut?: string;
	/** Include */
	include?: 'noOtherFields' | 'allOtherFields' | 'selectedOtherFields';
	/** Fields To Include */
	fieldsToInclude?: Record<string, unknown>;
	/** Aggregate */
	aggregate?: 'aggregateIndividualFields' | 'aggregateAllItemData';
	/** Fields To Aggregate */
	fieldsToAggregate?: Record<string, unknown>;
	/** Put Output in Field */
	destinationFieldName?: string;
	/** Fields To Exclude */
	fieldsToExclude?: Record<string, unknown>;
	/** Compare */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields';
	/** Fields To Compare */
	fieldsToCompare?: Record<string, unknown>;
	/** Type */
	type?: 'simple' | 'random' | 'code';
	/** Fields To Sort By */
	sortFieldsUi?: Record<string, unknown>;
	/** Code */
	code?: string;
	/** Max Items */
	maxItems?: number;
	/** Keep */
	keep?: 'firstItems' | 'lastItems';
	/** Fields to Summarize */
	fieldsToSummarize?: Record<string, unknown>;
	/** Fields to Split By */
	fieldsToSplitBy?: string;
}

export interface IterableParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'event' | 'user' | 'userList' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'track' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Identifier */
	identifier?: 'email' | 'userId';
	/** Value */
	value?: string;
	/** Create If Doesn't Exist */
	preferUserId?: boolean;
	/** By */
	by?: 'email' | 'userId';
	/** User ID */
	userId?: string;
	/** Email */
	email?: string;
	/** List Name or ID */
	listId?: string;
}

export interface JenkinsParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'build' | 'instance' | 'job';
	/** Operation */
	operation?: 'copy' | 'create' | 'trigger' | 'triggerParams';
	/** Make sure the job is setup to support triggering with parameters. <a href="https://wiki.jenkins.io/display/JENKINS/Parameterized+Build" target="_blank">More info</a> */
	triggerParamsNotice?: unknown;
	/** Job Name or ID */
	job?: string;
	/** Parameters */
	param?: Record<string, unknown>;
	/** New Job Name */
	newJob?: string;
	/** XML */
	xml?: string;
	/** To get the XML of an existing job, add ‘config.xml’ to the end of the job URL */
	createNotice?: unknown;
	/** Reason */
	reason?: string;
	/** Instance operation can shutdown Jenkins instance and make it unresponsive. Some commands may not be available depending on instance implementation. */
	instanceNotice?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface JinaAiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'reader' | 'research' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'read' | 'search' | '__CUSTOM_API_CALL__';
	/** URL */
	url?: string;
	/** Simplify */
	simplify?: boolean;
	/** Search Query */
	searchQuery?: string;
	/** Research Query */
	researchQuery?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface JiraParameters extends BaseNodeParams {
	/** Jira Version */
	jiraVersion?: 'cloud' | 'server' | 'serverPat';
	/** Resource */
	resource?: 'issue' | 'issueAttachment' | 'issueComment' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'changelog'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'notify'
		| 'transitions'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Project */
	project?: unknown;
	/** Issue Type */
	issueType?: unknown;
	/** Summary */
	summary?: string;
	/** Issue Key */
	issueKey?: string;
	/** Delete Subtasks */
	deleteSubtasks?: boolean;
	/** Simplify */
	simplifyOutput?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Notification Recipients */
	notificationRecipientsUi?: Record<string, unknown>;
	/** Notification Recipients */
	notificationRecipientsJson?: string | object;
	/** Notification Recipients Restrictions */
	notificationRecipientsRestrictionsUi?: Record<string, unknown>;
	/** Notification Recipients Restrictions */
	notificationRecipientsRestrictionsJson?: string | object;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
	/** Comment */
	comment?: string;
	/** Document Format (JSON) */
	commentJson?: string | object;
	/** Comment ID */
	commentId?: string;
	/** Username */
	username?: string;
	/** Email Address */
	emailAddress?: string;
	/** Display Name */
	displayName?: string;
	/** Account ID */
	accountId?: string;
}

export interface JiraTriggerParameters extends BaseNodeParams {
	/** Jira Version */
	jiraVersion?: 'cloud' | 'server' | 'serverPat';
	/** Authenticate Incoming Webhook */
	authenticateWebhook?: boolean;
	/** Authenticate Webhook With */
	incomingAuthentication?: 'queryAuth' | 'none';
	/** Events */
	events?: unknown;
}

export interface JotFormTriggerParameters extends BaseNodeParams {
	/** Form Name or ID */
	form?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** Only Answers */
	onlyAnswers?: boolean;
}

export interface JwtParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'decode' | 'sign' | 'verify';
	/** Use JSON to Build Payload */
	useJson?: boolean;
	/** Payload Claims */
	claims?: Record<string, unknown>;
	/** Payload Claims (JSON) */
	claimsJson?: string | object;
	/** Token */
	token?: string;
}

export interface KafkaParameters extends BaseNodeParams {
	/** Topic */
	topic?: string;
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Use Schema Registry */
	useSchemaRegistry?: boolean;
	/** Schema Registry URL */
	schemaRegistryUrl?: string;
	/** Use Key */
	useKey?: boolean;
	/** Key */
	key?: string;
	/** Event Name */
	eventName?: string;
	/** Headers */
	headersUi?: Record<string, unknown>;
	/** Headers (JSON) */
	headerParametersJson?: string | object;
}

export interface KafkaTriggerParameters extends BaseNodeParams {
	/** Topic */
	topic?: string;
	/** Group ID */
	groupId?: string;
	/** Use Schema Registry */
	useSchemaRegistry?: boolean;
	/** Schema Registry URL */
	schemaRegistryUrl?: string;
}

export interface KeapParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'company'
		| 'contact'
		| 'contactNote'
		| 'contactTag'
		| 'ecommerceOrder'
		| 'ecommerceProduct'
		| 'email'
		| 'file'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Company Name */
	companyName?: string;
	/** Addresses */
	addressesUi?: Record<string, unknown>;
	/** Faxes */
	faxesUi?: Record<string, unknown>;
	/** Phones */
	phonesUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Duplicate Option */
	duplicateOption?: 'email' | 'emailAndName';
	/** Emails */
	emailsUi?: Record<string, unknown>;
	/** Social Accounts */
	socialAccountsUi?: Record<string, unknown>;
	/** Contact ID */
	contactId?: string;
	/** User Name or ID */
	userId?: string;
	/** Note ID */
	noteId?: string;
	/** Tag Names or IDs */
	tagIds?: unknown;
	/** Order Date */
	orderDate?: string;
	/** Order Title */
	orderTitle?: string;
	/** Order Type */
	orderType?: 'offline' | 'online';
	/** Shipping Address */
	addressUi?: Record<string, unknown>;
	/** Order Items */
	orderItemsUi?: Record<string, unknown>;
	/** Order ID */
	orderId?: string;
	/** Product Name */
	productName?: string;
	/** Product ID */
	productId?: string;
	/** Sent To Address */
	sentToAddress?: string;
	/** Sent From Address */
	sentFromAddress?: string;
	/** Contact IDs */
	contactIds?: string;
	/** Subject */
	subject?: string;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
	/** Binary File */
	binaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File Association */
	fileAssociation?: 'company' | 'contact' | 'user';
	/** File Name */
	fileName?: string;
	/** File Data */
	fileData?: string;
	/** Is Public */
	isPublic?: boolean;
	/** File ID */
	fileId?: string;
}

export interface KeapTriggerParameters extends BaseNodeParams {
	/** Event Name or ID */
	eventId?: string;
	/** RAW Data */
	rawData?: boolean;
}

export interface KitemakerParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'organization' | 'space' | 'user' | 'workItem';
	/** Operation */
	operation?: 'get';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Space Name or ID */
	spaceId?: string;
	/** Status Name or ID */
	statusId?: string;
	/** Work Item ID */
	workItemId?: string;
}

export interface KoBoToolboxParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'file' | 'form' | 'hook' | 'submission' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'redeploy' | '__CUSTOM_API_CALL__';
	/** Form Name or ID */
	formId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Hook ID */
	hookId?: string;
	/** Hook Log ID */
	logId?: string;
	/** Log Status */
	status?: '' | '0' | '1' | '2';
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Submission ID */
	submissionId?: string;
	/** Validation Status */
	validationStatus?:
		| 'validation_status_approved'
		| 'validation_status_not_approved'
		| 'validation_status_on_hold';
	/** Filter */
	filterType?: 'none' | 'json';
	/** See <a href="https://github.com/SEL-Columbia/formhub/wiki/Formhub-Access-Points-(API)#api-parameters" target="_blank">Formhub API docs</a> to creating filters, using the MongoDB JSON format - e.g. {"_submission_time":{"$lt":"2021-10-01T01:02:03"}} */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** File ID */
	fileId?: string;
	/** Property Name */
	binaryPropertyName?: string;
	/** Download File Content */
	download?: boolean;
	/** File Upload Mode */
	fileMode?: 'binary' | 'url';
	/** File URL */
	fileUrl?: string;
}

export interface KoBoToolboxTriggerParameters extends BaseNodeParams {
	/** Form Name or ID */
	formId?: string;
	/** Trigger On */
	triggerOn?: 'formSubmission';
	/** Options */
	formatOptions?: Record<string, unknown>;
}

export interface LdapParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'compare' | 'create' | 'delete' | 'rename' | 'search' | 'update';
	/** Debug */
	nodeDebug?: boolean;
	/** DN */
	dn?: string;
	/** Attribute ID */
	id?: string;
	/** Value */
	value?: string;
	/** New DN */
	targetDn?: string;
	/** Attributes */
	attributes?: Record<string, unknown>;
	/** Base DN */
	baseDN?: string;
	/** Search For */
	searchFor?: string;
	/** Custom Filter */
	customFilter?: string;
	/** Attribute */
	attribute?: string;
	/** Search Text */
	searchText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface Lemlist_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'activity'
		| 'campaign'
		| 'enrich'
		| 'lead'
		| 'team'
		| 'unsubscribe'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getAll' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Timezone */
	timezone?: string;
	/** Enrichment ID */
	enrichId?: string;
	/** Lead ID */
	leadId?: string;
	/** Find Email */
	findEmail?: boolean;
	/** Verify Email */
	verifyEmail?: boolean;
	/** LinkedIn Enrichment */
	linkedinEnrichment?: boolean;
	/** Find Phone */
	findPhone?: boolean;
	/** Email */
	email?: string;
}

export interface Lemlist_v1Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'activity' | 'campaign' | 'lead' | 'team' | 'unsubscribe';
	/** Operation */
	operation?: 'getAll';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Email */
	email?: string;
}

export interface LemlistTriggerParameters extends BaseNodeParams {
	/** Event */
	event?:
		| '*'
		| 'contacted'
		| 'hooked'
		| 'attracted'
		| 'warmed'
		| 'interested'
		| 'skipped'
		| 'notInterested'
		| 'emailsSent'
		| 'emailsOpened'
		| 'emailsClicked'
		| 'emailsReplied'
		| 'emailsBounced'
		| 'emailsSendFailed'
		| 'emailsFailed'
		| 'emailsUnsubscribed'
		| 'emailsInterested'
		| 'emailsNotInterested'
		| 'opportunitiesDone'
		| 'aircallCreated'
		| 'aircallEnded'
		| 'aircallDone'
		| 'aircallInterested'
		| 'aircallNotInterested'
		| 'apiDone'
		| 'apiInterested'
		| 'apiNotInterested'
		| 'apiFailed'
		| 'linkedinVisitDone'
		| 'linkedinVisitFailed'
		| 'linkedinInviteDone'
		| 'linkedinInviteFailed'
		| 'linkedinInviteAccepted'
		| 'linkedinReplied'
		| 'linkedinSent'
		| 'linkedinVoiceNoteDone'
		| 'linkedinVoiceNoteFailed'
		| 'linkedinInterested'
		| 'linkedinNotInterested'
		| 'linkedinSendFailed'
		| 'manualInterested'
		| 'manualNotInterested'
		| 'paused'
		| 'resumed'
		| 'customDomainErrors'
		| 'connectionIssue'
		| 'sendLimitReached'
		| 'lemwarmPaused';
}

export interface LineParameters extends BaseNodeParams {
	/** End of service: LINE Notify will be discontinued from April 1st 2025, You can find more information <a href="https://notify-bot.line.me/closing-announce" target="_blank">here</a> */
	notice?: unknown;
	/** Resource */
	resource?: 'notification' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** Message */
	message?: string;
}

export interface LinearParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'comment' | 'issue' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'addComment' | '__CUSTOM_API_CALL__';
	/** Issue ID */
	issueId?: string;
	/** Comment */
	comment?: string;
	/** Team Name or ID */
	teamId?: string;
	/** Title */
	title?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Link */
	link?: string;
}

export interface LinearTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Make sure your credential has the "Admin" scope to create webhooks. */
	notice?: unknown;
	/** Team Name or ID */
	teamId?: string;
	/** Listen to Resources */
	resources?: unknown;
}

export interface LingvaNexParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'translate';
	/** Text */
	text?: string;
	/** Translate To */
	translateTo?: string;
}

export interface LinkedInParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'standard' | 'communityManagement';
	/** Resource */
	resource?: 'post' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Post As */
	postAs?: 'person' | 'organization';
	/** Person Name or ID */
	person?: string;
	/** Organization URN */
	organization?: string;
	/** Text */
	text?: string;
	/** Media Category */
	shareMediaCategory?: 'NONE' | 'ARTICLE' | 'IMAGE';
	/** Input Binary Field */
	binaryPropertyName?: string;
}

export interface LocalFileTriggerParameters extends BaseNodeParams {
	/** Trigger On */
	triggerOn?: 'file' | 'folder';
	/** File to Watch */
	path?: string;
	/** Watch for */
	events?: unknown;
}

export interface LoneScaleTriggerParameters extends BaseNodeParams {
	/** Workflow Name */
	workflow?: string;
}

export interface LoneScaleParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'list' | 'item' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Type */
	type?: 'COMPANY' | 'PEOPLE';
	/** List Name or ID */
	list?: string;
	/** First Name */
	first_name?: string;
	/** Last Name */
	last_name?: string;
	/** Company Name */
	company_name?: string;
	/** Additional Fields */
	peopleAdditionalFields?: Record<string, unknown>;
	/** Additional Fields */
	companyAdditionalFields?: Record<string, unknown>;
	/** Name */
	name?: string;
}

export interface Magento2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'customer' | 'invoice' | 'order' | 'product' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Customer ID */
	customerId?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Website Name or ID */
	website_id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://devdocs.magento.com/guides/v2.4/rest/performing-searches.html" target="_blank">Magento guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** Order ID */
	orderId?: string;
	/** SKU */
	sku?: string;
	/** Name */
	name?: string;
	/** Attribute Set Name or ID */
	attributeSetId?: string;
	/** Price */
	price?: number;
}

export interface MailcheckParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'email';
	/** Operation */
	operation?: 'check';
	/** Email */
	email?: string;
}

export interface MailchimpParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'campaign' | 'listGroup' | 'member' | 'memberTag' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** List Name or ID */
	list?: string;
	/** Email */
	email?: string;
	/** Status */
	status?: 'cleaned' | 'pending' | 'subscribed' | 'transactional' | 'unsubscribed';
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Location */
	locationFieldsUi?: Record<string, unknown>;
	/** Merge Fields */
	mergeFieldsUi?: Record<string, unknown>;
	/** Merge Fields */
	mergeFieldsJson?: string | object;
	/** Location */
	locationJson?: string | object;
	/** Interest Groups */
	groupsUi?: Record<string, unknown>;
	/** Interest Groups */
	groupJson?: string | object;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Tags */
	tags?: string;
	/** Group Category Name or ID */
	groupCategory?: string;
	/** Campaign ID */
	campaignId?: string;
}

export interface MailchimpTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** List Name or ID */
	list?: string;
	/** Events */
	events?: unknown;
	/** Sources */
	sources?: unknown;
}

export interface MailerLite_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'subscriber';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** Email */
	email?: string;
	/** Subscriber Email */
	subscriberId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface MailerLite_v1Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'subscriber';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** Email */
	email?: string;
	/** Subscriber Email */
	subscriberId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface MailerLiteTrigger_v2Parameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
}

export interface MailerLiteTrigger_v1Parameters extends BaseNodeParams {
	/** Event */
	event?:
		| 'campaign.sent'
		| 'subscriber.added_through_webform'
		| 'subscriber.add_to_group'
		| 'subscriber.automation_complete'
		| 'subscriber.automation_triggered'
		| 'subscriber.bounced'
		| 'subscriber.complaint'
		| 'subscriber.create'
		| 'subscriber.remove_from_group'
		| 'subscriber.unsubscribe'
		| 'subscriber.update';
}

export interface MailgunParameters extends BaseNodeParams {
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** Cc Email */
	ccEmail?: string;
	/** Bcc Email */
	bccEmail?: string;
	/** Subject */
	subject?: string;
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** Attachments */
	attachments?: string;
}

export interface MailjetParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'email' | 'sms' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | 'sendTemplate' | '__CUSTOM_API_CALL__';
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** Subject */
	subject?: string;
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Variables (JSON) */
	variablesJson?: string;
	/** Variables */
	variablesUi?: Record<string, unknown>;
	/** Template Name or ID */
	templateId?: string;
	/** From */
	from?: string;
	/** To */
	to?: string;
}

export interface MailjetTriggerParameters extends BaseNodeParams {
	/** Event */
	event?: 'blocked' | 'bounce' | 'open' | 'sent' | 'spam' | 'unsub';
}

export interface MandrillParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'message';
	/** Operation */
	operation?: 'sendTemplate' | 'sendHtml';
	/** Template Name or ID */
	template?: string;
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Merge Vars */
	mergeVarsJson?: string | object;
	/** Merge Vars */
	mergeVarsUi?: Record<string, unknown>;
	/** Metadata */
	metadataUi?: Record<string, unknown>;
	/** Metadata */
	metadataJson?: string | object;
	/** Attachments */
	attachmentsJson?: string | object;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
	/** Headers */
	headersJson?: string | object;
	/** Headers */
	headersUi?: Record<string, unknown>;
}

export interface ManualTriggerParameters extends BaseNodeParams {
	/** This node is where the workflow execution starts (when you click the ‘test’ button on the canvas).<br><br> <a data-action="showNodeCreator">Explore other ways to trigger your workflow</a> (e.g on a schedule, or a webhook) */
	notice?: unknown;
}

export interface MarkdownParameters extends BaseNodeParams {
	/** Mode */
	mode?: 'markdownToHtml' | 'htmlToMarkdown';
	/** HTML */
	html?: string;
	/** Markdown */
	markdown?: string;
	/** Destination Key */
	destinationKey?: string;
}

export interface MarketstackParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'endOfDayData' | 'exchange' | 'ticker';
	/** Operation */
	operation?: 'getAll';
	/** Ticker */
	symbols?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Exchange */
	exchange?: string;
	/** Ticker */
	symbol?: string;
}

export interface MatrixParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'account' | 'event' | 'media' | 'message' | 'room' | 'roomMember';
	/** Operation */
	operation?: 'me';
	/** Room ID */
	roomId?: string;
	/** Event ID */
	eventId?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Media Type */
	mediaType?: 'file' | 'image' | 'audio' | 'video';
	/** Text */
	text?: string;
	/** Message Type */
	messageType?: 'm.emote' | 'm.notice' | 'm.text';
	/** Message Format */
	messageFormat?: 'plain' | 'org.matrix.custom.html';
	/** Fallback Text */
	fallbackText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Other Options */
	otherOptions?: Record<string, unknown>;
	/** Room Name */
	roomName?: string;
	/** Preset */
	preset?: 'private_chat' | 'public_chat';
	/** Room Alias */
	roomAlias?: string;
	/** Room ID or Alias */
	roomIdOrAlias?: string;
	/** User ID */
	userId?: string;
	/** Reason */
	reason?: string;
}

export interface MattermostParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'channel' | 'message' | 'reaction' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addUser'
		| 'create'
		| 'delete'
		| 'members'
		| 'restore'
		| 'search'
		| 'statistics'
		| '__CUSTOM_API_CALL__';
	/** Team Name or ID */
	teamId?: string;
	/** Display Name */
	displayName?: string;
	/** Name */
	channel?: string;
	/** Type */
	type?: 'private' | 'public';
	/** Channel Name or ID */
	channelId?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** User Name or ID */
	userId?: string;
	/** Search Term */
	term?: string;
	/** Post ID */
	postId?: string;
	/** Message */
	message?: string;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Other Options */
	otherOptions?: Record<string, unknown>;
	/** Emoji Name */
	emojiName?: string;
	/** Username */
	username?: string;
	/** Auth Service */
	authService?: 'email' | 'gitlab' | 'google' | 'ldap' | 'office365' | 'saml';
	/** Auth Data */
	authData?: string;
	/** Email */
	email?: string;
	/** Password */
	password?: string;
	/** User IDs */
	userIds?: string;
	/** Emails */
	emails?: string;
}

export interface MauticParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'credentials' | 'oAuth2';
	/** Resource */
	resource?:
		| 'campaignContact'
		| 'company'
		| 'companyContact'
		| 'contact'
		| 'contactSegment'
		| 'segmentEmail'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Company Name */
	name?: string;
	/** Simplify */
	simple?: boolean;
	/** Company ID */
	companyId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Email */
	email?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Primary Company Name or ID */
	company?: string;
	/** Position */
	position?: string;
	/** Title */
	title?: string;
	/** Body */
	bodyJson?: string | object;
	/** Contact ID */
	contactId?: string;
	/** Action */
	action?: 'add' | 'remove';
	/** Channel */
	channel?: 'email' | 'sms';
	/** Points */
	points?: number;
	/** Campaign Email Name or ID */
	campaignEmailId?: string;
	/** Segment Name or ID */
	segmentId?: string;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Segment Email Name or ID */
	segmentEmailId?: string;
}

export interface MauticTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'credentials' | 'oAuth2';
	/** Event Names or IDs */
	events?: unknown;
	/** Events Order */
	eventsOrder?: 'ASC' | 'DESC';
}

export interface MediumParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'post' | 'publication' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Publication */
	publication?: boolean;
	/** Publication Name or ID */
	publicationId?: string;
	/** Title */
	title?: string;
	/** Content Format */
	contentFormat?: 'html' | 'markdown';
	/** Content */
	content?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface Merge_v3_2Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'append' | 'combine' | 'combineBySql' | 'chooseBranch';
	/** Combine By */
	combineBy?: 'combineByFields' | 'combineByPosition' | 'combineAll';
	/** Number of Inputs */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
	/** Fields To Match Have Different Names */
	advanced?: boolean;
	/** Fields to Match */
	fieldsToMatchString?: string;
	/** Fields to Match */
	mergeByFields?: Record<string, unknown>;
	/** Output Type */
	joinMode?: 'keepMatches' | 'keepNonMatches' | 'keepEverything' | 'enrichInput1' | 'enrichInput2';
	/** Output Data From */
	outputDataFrom?: 'both' | 'input1' | 'input2';
	/** Query */
	query?: string;
	/** Output Type */
	chooseBranchMode?: 'waitForAll';
	/** Output */
	output?: 'specifiedInput' | 'empty';
	/** Use Data of Input */
	useDataOfInput?: string;
}

export interface Merge_v2_1Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'append' | 'combine' | 'chooseBranch';
	/** Combination Mode */
	combinationMode?: 'mergeByFields' | 'mergeByPosition' | 'multiplex';
	/** Fields to Match */
	mergeByFields?: Record<string, unknown>;
	/** Output Type */
	joinMode?: 'keepMatches' | 'keepNonMatches' | 'keepEverything' | 'enrichInput1' | 'enrichInput2';
	/** Output Data From */
	outputDataFrom?: 'both' | 'input1' | 'input2';
	/** Output Type */
	chooseBranchMode?: 'waitForBoth';
	/** Output */
	output?: 'input1' | 'input2' | 'empty';
}

export interface Merge_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Mode */
	mode?:
		| 'append'
		| 'keepKeyMatches'
		| 'mergeByIndex'
		| 'mergeByKey'
		| 'multiplex'
		| 'passThrough'
		| 'removeKeyMatches'
		| 'wait';
	/** Join */
	join?: 'inner' | 'left' | 'outer';
	/** Property Input 1 */
	propertyName1?: string;
	/** Property Input 2 */
	propertyName2?: string;
	/** Output Data */
	output?: 'input1' | 'input2';
	/** Overwrite */
	overwrite?: 'always' | 'blank' | 'undefined';
}

export interface MessageBirdParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'sms' | 'balance';
	/** Operation */
	operation?: 'send';
	/** From */
	originator?: string;
	/** To */
	recipients?: string;
	/** Message */
	message?: string;
}

export interface MetabaseParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'alerts' | 'databases' | 'metrics' | 'questions' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'resultData' | '__CUSTOM_API_CALL__';
	/** Question ID */
	questionId?: string;
	/** Format */
	format?: 'csv' | 'json' | 'xlsx';
	/** Metric ID */
	metricId?: string;
	/** Database ID */
	databaseId?: string;
	/** Engine */
	engine?: 'h2' | 'mongo' | 'mysql' | 'postgres' | 'redshift' | 'sqlite';
	/** Host */
	host?: string;
	/** Name */
	name?: string;
	/** Port */
	port?: number;
	/** User */
	user?: string;
	/** Password */
	password?: string;
	/** Database Name */
	dbName?: string;
	/** File Path */
	filePath?: string;
	/** Full Sync */
	fullSync?: boolean;
	/** Simplify */
	simple?: boolean;
	/** Alert ID */
	alertId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface AzureCosmosDbParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'container' | 'item' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** ID */
	containerCreate?: string;
	/** Partition Key */
	partitionKey?: string | object;
	/** Container */
	container?: unknown;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Item Contents */
	customProperties?: string | object;
	/** Item */
	item?: unknown;
	/** Query */
	query?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftDynamicsCrmParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'account';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	name?: string;
	/** Account ID */
	accountId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface MicrosoftEntraParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'group' | 'user';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Group Type */
	groupType?: 'Unified' | '';
	/** Group Name */
	displayName?: string;
	/** Group Email Address */
	mailNickname?: string;
	/** Mail Enabled */
	mailEnabled?: boolean;
	/** Membership Type */
	membershipType?: '' | 'DynamicMembership';
	/** Security Enabled */
	securityEnabled?: boolean;
	/** Group to Delete */
	group?: unknown;
	/** Output */
	output?: 'simple' | 'raw' | 'fields';
	/** Fields */
	fields?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter */
	filter?: string;
	/** User to Add */
	user?: unknown;
	/** Account Enabled */
	accountEnabled?: boolean;
	/** User Principal Name */
	userPrincipalName?: string;
	/** Password */
	password?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftExcel_v2_2Parameters extends BaseNodeParams {
	/** This node connects to the Microsoft 365 cloud platform. Use the 'Extract from File' and 'Convert to File' nodes to directly manipulate spreadsheet files (.xls, .csv, etc). <a href="https://n8n.io/workflows/890-read-in-an-excel-spreadsheet-file/" target="_blank">More info</a>. */
	notice?: unknown;
	/** Resource */
	resource?: 'table' | 'workbook' | 'worksheet';
	/** Operation */
	operation?:
		| 'append'
		| 'convertToRange'
		| 'addTable'
		| 'deleteTable'
		| 'getColumns'
		| 'getRows'
		| 'lookup';
	/** Workbook */
	workbook?: unknown;
	/** Sheet */
	worksheet?: unknown;
	/** Table */
	table?: unknown;
	/** Data Mode */
	dataMode?: 'autoMap' | 'define' | 'raw';
	/** Data */
	data?: string | object;
	/** Values to Send */
	fieldsUi?: Record<string, unknown>;
	/** Select Range */
	selectRange?: 'auto' | 'manual';
	/** Range */
	range?: string;
	/** Has Headers */
	hasHeaders?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** RAW Data */
	rawData?: boolean;
	/** Data Property */
	dataProperty?: string;
	/** Lookup Column */
	lookupColumn?: string;
	/** Lookup Value */
	lookupValue?: string;
	/** Apply To */
	applyTo?: 'All' | 'Formats' | 'Contents';
	/** Select a Range */
	useRange?: boolean;
	/** Header Row */
	keyRow?: number;
	/** First Data Row */
	dataStartRow?: number;
	/** Column to match on */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
}

export interface MicrosoftExcel_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Resource */
	resource?: 'table' | 'workbook' | 'worksheet';
	/** Operation */
	operation?: 'addWorksheet' | 'getAll';
	/** Workbook Name or ID */
	workbook?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Worksheet Name or ID */
	worksheet?: string;
	/** Range */
	range?: string;
	/** RAW Data */
	rawData?: boolean;
	/** Data Property */
	dataProperty?: string;
	/** Data Start Row */
	dataStartRow?: number;
	/** Key Row */
	keyRow?: number;
	/** Table Name or ID */
	table?: string;
	/** Lookup Column */
	lookupColumn?: string;
	/** Lookup Value */
	lookupValue?: string;
}

export interface MicrosoftGraphSecurityParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'secureScore' | 'secureScoreControlProfile';
	/** Operation */
	operation?: 'get' | 'getAll';
	/** Secure Score ID */
	secureScoreId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Secure Score Control Profile ID */
	secureScoreControlProfileId?: string;
	/** Provider */
	provider?: string;
	/** Vendor */
	vendor?: string;
}

export interface MicrosoftOneDriveParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'file' | 'folder';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'get' | 'rename' | 'search' | 'share' | 'upload';
	/** File ID */
	fileId?: string;
	/** Parent Reference */
	parentReference?: Record<string, unknown>;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Item ID */
	itemId?: string;
	/** New Name */
	newName?: string;
	/** Query */
	query?: string;
	/** Type */
	type?: 'view' | 'edit' | 'embed';
	/** Scope */
	scope?: 'anonymous' | 'organization';
	/** File Name */
	fileName?: string;
	/** Parent ID */
	parentId?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Name */
	name?: string;
	/** Folder ID */
	folderId?: string;
}

export interface MicrosoftOneDriveTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Trigger On */
	event?: 'fileCreated' | 'fileUpdated' | 'folderCreated' | 'folderUpdated';
	/** Simplify */
	simple?: boolean;
	/** Watch Folder */
	watchFolder?: boolean;
	/** Watch */
	watch?: 'anyFile' | 'selectedFolder' | 'selectedFile';
	/** File */
	fileId?: unknown;
	/** Folder */
	folderId?: unknown;
}

export interface MicrosoftOutlook_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'calendar'
		| 'contact'
		| 'draft'
		| 'event'
		| 'folder'
		| 'folderMessage'
		| 'message'
		| 'messageAttachment';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	name?: string;
	/** Calendar */
	calendarId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** First Name */
	givenName?: string;
	/** Last Name */
	surname?: string;
	/** Contact */
	contactId?: unknown;
	/** Output */
	output?: 'simple' | 'raw' | 'fields';
	/** Fields */
	fields?: unknown;
	/** Subject */
	subject?: string;
	/** Message */
	bodyContent?: string;
	/** Draft */
	draftId?: unknown;
	/** To */
	to?: string;
	/** Start */
	startDateTime?: string;
	/** End */
	endDateTime?: string;
	/** Event */
	eventId?: unknown;
	/** From All Calendars */
	fromAllCalendars?: boolean;
	/** Name */
	displayName?: string;
	/** Folder */
	folderId?: unknown;
	/** Fetching a lot of messages may take a long time. Consider using filters to speed things up */
	filtersNotice?: unknown;
	/** Filters */
	filtersUI?: Record<string, unknown>;
	/** Message */
	messageId?: unknown;
	/** Reply to Sender Only */
	replyToSenderOnly?: boolean;
	/** Message */
	message?: string;
	/** To */
	toRecipients?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** Attachment */
	attachmentId?: unknown;
}

export interface MicrosoftOutlook_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Resource */
	resource?: 'draft' | 'folder' | 'folderMessage' | 'message' | 'messageAttachment';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'send' | 'update';
	/** Message ID */
	messageId?: string;
	/** Subject */
	subject?: string;
	/** Body Content */
	bodyContent?: string;
	/** Reply Type */
	replyType?: 'reply' | 'replyAll';
	/** Comment */
	comment?: string;
	/** Send */
	send?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Recipients */
	toRecipients?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Folder ID */
	folderId?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** Type */
	folderType?: 'folder' | 'searchFolder';
	/** Display Name */
	displayName?: string;
	/** Include Nested Folders */
	includeNestedFolders?: boolean;
	/** Source Folder IDs */
	sourceFolderIds?: string;
	/** Filter Query */
	filterQuery?: string;
}

export interface MicrosoftOutlookTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Trigger On */
	event?: 'messageReceived';
	/** Output */
	output?: 'simple' | 'raw' | 'fields';
	/** Fields */
	fields?: unknown;
}

export interface MicrosoftSharePointParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'file' | 'item' | 'list';
	/** Operation */
	operation?: 'download' | 'update' | 'upload';
	/** Site */
	site?: unknown;
	/** Parent Folder */
	folder?: unknown;
	/** File */
	file?: unknown;
	/** Updated File Name */
	fileName?: string;
	/** Change File Content */
	changeFileContent?: boolean;
	/** Updated File Contents */
	fileContents?: string;
	/** List */
	list?: unknown;
	/** Due to API restrictions, the following column types cannot be updated: Hyperlink, Location, Metadata */
	noticeUnsupportedFields?: unknown;
	/** Columns */
	columns?: unknown;
	/** Item */
	item?: unknown;
	/** Simplify */
	simplify?: boolean;
	/** Filter by Formula */
	filter?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftSqlParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update' | 'delete';
	/** Query */
	query?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Delete Key */
	deleteKey?: string;
}

export interface AzureStorageParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'oAuth2' | 'sharedKey';
	/** Resource */
	resource?: 'blob' | 'container' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Container */
	container?: unknown;
	/** Blob Name */
	blobCreate?: string;
	/** From */
	from?: 'binary' | 'url';
	/** Binary Contents */
	binaryPropertyName?: string;
	/** URL */
	url?: string;
	/** Blob */
	blob?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Container Name */
	containerCreate?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftTeams_v1_1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Resource */
	resource?: 'channel' | 'channelMessage' | 'chatMessage' | 'task';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Team Name or ID */
	teamId?: string;
	/** Name */
	name?: string;
	/** Channel Name or ID */
	channelId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Message Type */
	messageType?: 'text' | 'html';
	/** Message */
	message?: string;
	/** Chat Name or ID */
	chatId?: string;
	/** Message ID */
	messageId?: string;
	/** Group Source */
	groupSource?: 'all' | 'mine';
	/** Group Name or ID */
	groupId?: string;
	/** Plan Name or ID */
	planId?: string;
	/** Bucket Name or ID */
	bucketId?: string;
	/** Title */
	title?: string;
	/** Task ID */
	taskId?: string;
	/** Tasks For */
	tasksFor?: 'member' | 'plan';
	/** Member Name or ID */
	memberId?: string;
}

export interface MicrosoftTeams_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'channel' | 'channelMessage' | 'chatMessage' | 'task';
	/** Operation */
	operation?: 'create' | 'deleteChannel' | 'get' | 'getAll' | 'update';
	/** Team */
	teamId?: unknown;
	/** New Channel Name */
	name?: string;
	/** Channel */
	channelId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Content Type */
	contentType?: 'text' | 'html';
	/** Message */
	message?: string;
	/** Chat */
	chatId?: unknown;
	/** Message ID */
	messageId?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Team */
	groupId?: unknown;
	/** Plan */
	planId?: unknown;
	/** Bucket */
	bucketId?: unknown;
	/** Title */
	title?: string;
	/** Task ID */
	taskId?: string;
	/** Tasks For */
	tasksFor?: 'member' | 'plan';
}

export interface MicrosoftTeamsTriggerParameters extends BaseNodeParams {
	/** Trigger On */
	event?: 'newChannel' | 'newChannelMessage' | 'newChat' | 'newChatMessage' | 'newTeamMember';
	/** Watch All Teams */
	watchAllTeams?: boolean;
	/** Team */
	teamId?: unknown;
	/** Watch All Channels */
	watchAllChannels?: boolean;
	/** Channel */
	channelId?: unknown;
	/** Watch All Chats */
	watchAllChats?: boolean;
	/** Chat */
	chatId?: unknown;
}

export interface MicrosoftToDoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'linkedResource' | 'list' | 'task';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Task List Name or ID */
	taskListId?: string;
	/** Task ID */
	taskId?: string;
	/** Name */
	displayName?: string;
	/** Application Name */
	applicationName?: string;
	/** Linked Resource ID */
	linkedResourceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Subject */
	title?: string;
	/** List ID */
	listId?: string;
}

export interface MindeeParameters extends BaseNodeParams {
	/** API Version */
	apiVersion?: 1 | 3 | 4;
	/** Resource */
	resource?: 'invoice' | 'receipt' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'predict' | '__CUSTOM_API_CALL__';
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** RAW Data */
	rawData?: boolean;
}

export interface MispParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'attribute'
		| 'event'
		| 'eventTag'
		| 'feed'
		| 'galaxy'
		| 'noticelist'
		| 'object'
		| 'organisation'
		| 'tag'
		| 'user'
		| 'warninglist'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'search' | 'update' | '__CUSTOM_API_CALL__';
	/** Event UUID */
	eventId?: string;
	/** Type */
	type?: 'text' | 'url' | 'comment';
	/** Value */
	value?: string;
	/** Attribute ID */
	attributeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Use JSON to Specify Fields */
	useJson?: boolean;
	/** JSON */
	jsonOutput?: string | object;
	/** Organization Name or ID */
	org_id?: string;
	/** Information */
	information?: string;
	/** Tag Name or ID */
	tagId?: string;
	/** Name */
	name?: string;
	/** Provider */
	provider?: string;
	/** URL */
	url?: string;
	/** Feed ID */
	feedId?: string;
	/** Galaxy ID */
	galaxyId?: string;
	/** Noticelist ID */
	noticelistId?: string;
	/** Organisation ID */
	organisationId?: string;
	/** Email */
	email?: string;
	/** Role ID */
	role_id?: string;
	/** User ID */
	userId?: string;
	/** Warninglist ID */
	warninglistId?: string;
}

export interface MistralAiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'extractText' | '__CUSTOM_API_CALL__';
	/** Model */
	model?: 'mistral-ocr-latest';
	/** Document Type */
	documentType?: 'document_url' | 'image_url';
	/** Input Type */
	inputType?: 'binary' | 'url';
	/** Input Binary Field */
	binaryProperty?: string;
	/** URL */
	url?: string;
}

export interface MoceanParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'sms' | 'voice';
	/** Operation */
	operation?: 'send';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Language */
	language?: 'cmn-CN' | 'en-GB' | 'en-US' | 'ja-JP' | 'ko-KR';
	/** Message */
	message?: string;
}

export interface MondayComParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'board' | 'boardColumn' | 'boardGroup' | 'boardItem' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'archive' | 'create' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Board Name or ID */
	boardId?: string;
	/** Name */
	name?: string;
	/** Kind */
	kind?: 'share' | 'public' | 'private';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Column Type */
	columnType?:
		| 'checkbox'
		| 'country'
		| 'date'
		| 'dropdown'
		| 'email'
		| 'hour'
		| 'Link'
		| 'longText'
		| 'numbers'
		| 'people'
		| 'person'
		| 'phone'
		| 'rating'
		| 'status'
		| 'tags'
		| 'team'
		| 'text'
		| 'timeline'
		| 'timezone'
		| 'week'
		| 'worldClock';
	/** Group Name or ID */
	groupId?: string;
	/** Item ID */
	itemId?: string;
	/** Update Text */
	value?: string;
	/** Column Name or ID */
	columnId?: string;
	/** Column Values */
	columnValues?: string | object;
	/** Column Value */
	columnValue?: string;
}

export interface MongoDbParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'searchIndexes' | 'document';
	/** Operation */
	operation?:
		| 'aggregate'
		| 'delete'
		| 'find'
		| 'findOneAndReplace'
		| 'findOneAndUpdate'
		| 'insert'
		| 'update';
	/** Collection */
	collection?: string;
	/** Query */
	query?: string | object;
	/** Fields */
	fields?: string;
	/** Update Key */
	updateKey?: string;
	/** Upsert */
	upsert?: boolean;
	/** Index Name */
	indexName?: string;
	/** Index Name */
	indexNameRequired?: string;
	/** Index Definition */
	indexDefinition?: string | object;
	/** Index Type */
	indexType?: 'vectorSearch' | 'search';
}

export interface MonicaCrmParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'activity'
		| 'call'
		| 'contact'
		| 'contactField'
		| 'contactTag'
		| 'conversation'
		| 'conversationMessage'
		| 'journalEntry'
		| 'note'
		| 'reminder'
		| 'tag'
		| 'task';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Activity Type Name or ID */
	activityTypeId?: string;
	/** Contacts */
	contacts?: string;
	/** Happened At */
	happenedAt?: string;
	/** Summary */
	summary?: string;
	/** Activity ID */
	activityId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Contact ID */
	contactId?: string;
	/** Called At */
	calledAt?: string;
	/** Description */
	content?: string;
	/** Call ID */
	callId?: string;
	/** First Name */
	firstName?: string;
	/** Gender Name or ID */
	genderId?: string;
	/** Contact Field Type Name or ID */
	contactFieldTypeId?: string;
	/** Content */
	data?: string;
	/** Contact Field ID */
	contactFieldId?: string;
	/** Tag Names or IDs */
	tagsToAdd?: unknown;
	/** Tag Names or IDs */
	tagsToRemove?: unknown;
	/** Conversation ID */
	conversationId?: string;
	/** Written At */
	writtenAt?: string;
	/** Written By */
	writtenByMe?: true | false;
	/** Message ID */
	messageId?: string;
	/** Title */
	title?: string;
	/** Content */
	post?: string;
	/** Journal Entry ID */
	journalId?: string;
	/** Body */
	body?: string;
	/** Note ID */
	noteId?: string;
	/** Frequency Type */
	frequencyType?: 'one_time' | 'week' | 'month' | 'year';
	/** Recurring Interval */
	frequencyNumber?: number;
	/** Initial Date */
	initialDate?: string;
	/** Reminder ID */
	reminderId?: string;
	/** Name */
	name?: string;
	/** Tag ID */
	tagId?: string;
	/** Task ID */
	taskId?: string;
}

export interface MoveBinaryDataParameters extends BaseNodeParams {
	/** Mode */
	mode?: 'binaryToJson' | 'jsonToBinary';
	/** Set All Data */
	setAllData?: boolean;
	/** Source Key */
	sourceKey?: string;
	/** Destination Key */
	destinationKey?: string;
	/** Convert All Data */
	convertAllData?: boolean;
}

export interface MqttParameters extends BaseNodeParams {
	/** Topic */
	topic?: string;
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
}

export interface MqttTriggerParameters extends BaseNodeParams {
	/** Topics */
	topics?: string;
}

export interface Msg91Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'sms';
	/** Operation */
	operation?: 'send';
	/** Sender ID */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
}

export interface MySql_v2_5Parameters extends BaseNodeParams {
	/** Operation */
	operation?: 'deleteTable' | 'executeQuery' | 'insert' | 'upsert' | 'select' | 'update';
	/** Table */
	table?: unknown;
	/** Command */
	deleteCommand?: 'truncate' | 'delete' | 'drop';
	/** Select Rows */
	where?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
	/** Query */
	query?: string;
	/** Data Mode */
	dataMode?: 'autoMapInputData' | 'defineBelow';
	/** 
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		 */
	notice?: unknown;
	/** Values to Send */
	valuesToSend?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Column to Match On */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
}

export interface MySql_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Table */
	table?: unknown;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
}

export interface N8nParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'audit' | 'credential' | 'execution' | 'workflow' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'generate' | '__CUSTOM_API_CALL__';
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** Name */
	name?: string;
	/** Credential Type */
	credentialTypeName?: string;
	/** Data */
	data?: string | object;
	/** Credential ID */
	credentialId?: string;
	/** Execution ID */
	executionId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Workflow */
	workflowId?: unknown;
	/** Workflow Object */
	workflowObject?: string | object;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface N8nTrainingCustomerDatastoreParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'getOnePerson' | 'getAllPeople';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface N8nTrainingCustomerMessengerParameters extends BaseNodeParams {
	/** Customer ID */
	customerId?: string;
	/** Message */
	message?: string;
}

export interface N8nTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
}

export interface NasaParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'asteroidNeoBrowse'
		| 'asteroidNeoFeed'
		| 'asteroidNeoLookup'
		| 'astronomyPictureOfTheDay'
		| 'donkiCoronalMassEjection'
		| 'donkiHighSpeedStream'
		| 'donkiInterplanetaryShock'
		| 'donkiMagnetopauseCrossing'
		| 'donkiNotifications'
		| 'donkiRadiationBeltEnhancement'
		| 'donkiSolarEnergeticParticle'
		| 'donkiSolarFlare'
		| 'donkiWsaEnlilSimulation'
		| 'earthAssets'
		| 'earthImagery';
	/** Operation */
	operation?: 'get';
	/** Asteroid ID */
	asteroidId?: string;
	/** Download Image */
	download?: boolean;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Latitude */
	lat?: number;
	/** Longitude */
	lon?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface NetlifyParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'deploy' | 'site' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'cancel' | 'create' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Site Name or ID */
	siteId?: string;
	/** Deploy ID */
	deployId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface NetlifyTriggerParameters extends BaseNodeParams {
	/** Site Name or ID */
	siteId?: string;
	/** Event */
	event?: 'deployBuilding' | 'deployFailed' | 'deployCreated' | 'submissionCreated';
	/** Form Name or ID */
	formId?: string;
	/** Simplify */
	simple?: boolean;
}

export interface NextCloudParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'file' | 'folder' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'move' | 'share' | 'upload' | '__CUSTOM_API_CALL__';
	/** From Path */
	path?: string;
	/** To Path */
	toPath?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Binary File */
	binaryDataUpload?: boolean;
	/** File Content */
	fileContent?: string;
	/** Share Type */
	shareType?: 7 | 4 | 1 | 3 | 0;
	/** Circle ID */
	circleId?: string;
	/** Email */
	email?: string;
	/** Group ID */
	groupId?: string;
	/** User */
	user?: string;
	/** Username */
	userId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface NocoDbParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'nocoDbApiToken' | 'nocoDb';
	/** API Version */
	version?: 1 | 2 | 3;
	/** Resource */
	resource?: 'row' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Base Name or ID */
	projectId?: string;
	/** Table Name or ID */
	table?: string;
	/** Primary Key Type */
	primaryKey?: 'id' | 'ncRecordId' | 'custom';
	/** Field Name */
	customPrimaryKey?: string;
	/** Row ID Value */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Download Fields */
	downloadFieldNames?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** In this mode, make sure the incoming data fields are named the same as the columns in NocoDB. (Use an 'Edit Fields' node before this node to change them if required.) */
	info?: unknown;
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
}

export interface SendInBlueParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'attribute' | 'email' | 'sender' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'update' | 'delete' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Category */
	attributeCategory?: 'calculated' | 'category' | 'global' | 'normal' | 'transactional';
	/** Name */
	attributeName?: string;
	/** Type */
	attributeType?: 'boolean' | 'date' | 'float' | 'text';
	/** Value */
	attributeValue?: string;
	/** Contact Attribute List */
	attributeCategoryList?: Record<string, unknown>;
	/** Category */
	updateAttributeCategory?: 'calculated' | 'category' | 'global';
	/** Name */
	updateAttributeName?: string;
	/** Value */
	updateAttributeValue?: string;
	/** Update Fields */
	updateAttributeCategoryList?: Record<string, unknown>;
	/** Category */
	deleteAttributeCategory?: 'calculated' | 'category' | 'global' | 'normal' | 'transactional';
	/** Name */
	deleteAttributeName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
	/** Sender ID */
	id?: string;
	/** Contact Attributes */
	createContactAttributes?: Record<string, unknown>;
	/** Contact Identifier */
	identifier?: string;
	/** Attributes */
	updateAttributes?: Record<string, unknown>;
	/** Contact Attributes */
	upsertAttributes?: Record<string, unknown>;
	/** Send HTML */
	sendHTML?: boolean;
	/** Subject */
	subject?: string;
	/** Text Content */
	textContent?: string;
	/** HTML Content */
	htmlContent?: string;
	/** Sender */
	sender?: string;
	/** Receipients */
	receipients?: string;
	/** Template ID */
	templateId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface SendInBlueTriggerParameters extends BaseNodeParams {
	/** Resource */
	type?: 'inbound' | 'marketing' | 'transactional';
	/** Trigger On */
	events?: unknown;
}

export interface StickyNoteParameters extends BaseNodeParams {
	/** Content */
	content?: string;
	/** Height */
	height?: number;
	/** Width */
	width?: number;
	/** Color */
	color?: number;
}

export interface OnfleetParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'admin'
		| 'container'
		| 'destination'
		| 'hub'
		| 'organization'
		| 'recipient'
		| 'task'
		| 'team'
		| 'worker';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update';
	/** Admin ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
	/** Container Type */
	containerType?: 'organizations' | 'teams' | 'workers';
	/** Container ID */
	containerId?: string;
	/** Insert Type */
	type?: -1 | 0 | 1;
	/** Index */
	index?: number;
	/** Task IDs */
	tasks?: string;
	/** Unparsed Address */
	unparsed?: boolean;
	/** Destination Address */
	address?: string;
	/** Number */
	addressNumber?: string;
	/** Street */
	addressStreet?: string;
	/** City */
	addressCity?: string;
	/** Country */
	addressCountry?: string;
	/** Destination */
	destination?: Record<string, unknown>;
	/** Get By */
	getBy?: 'id' | 'phone' | 'name';
	/** Phone */
	phone?: string;
	/** Recipient Name */
	recipientName?: string;
	/** Recipient Phone */
	recipientPhone?: string;
	/** Complete as a Success */
	success?: boolean;
	/** Override Fields */
	overrideFields?: Record<string, unknown>;
	/** Worker Names or IDs */
	workers?: unknown;
	/** Administrator Names or IDs */
	managers?: unknown;
	/** Search by Location */
	byLocation?: boolean;
	/** Team Names or IDs */
	teams?: unknown;
	/** Longitude */
	longitude?: number;
	/** Latitude */
	latitude?: number;
	/** Schedule */
	schedule?: Record<string, unknown>;
}

export interface OnfleetTriggerParameters extends BaseNodeParams {
	/** Trigger On */
	triggerOn?:
		| 'SMSRecipientOptOut'
		| 'smsRecipientResponseMissed'
		| 'taskArrival'
		| 'taskAssigned'
		| 'taskCloned'
		| 'taskCompleted'
		| 'taskCreated'
		| 'taskDelayed'
		| 'taskDeleted'
		| 'taskEta'
		| 'taskFailed'
		| 'taskStarted'
		| 'taskUnassigned'
		| 'taskUpdated'
		| 'workerCreated'
		| 'workerDeleted'
		| 'workerDuty';
}

export interface CitrixAdcParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'certificate' | 'file' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'install' | '__CUSTOM_API_CALL__';
	/** Certificate File Name */
	certificateFileName?: string;
	/** Certificate Format */
	certificateFormat?: 'PEM' | 'DER';
	/** Certificate Type */
	certificateType?: 'ROOT_CERT' | 'INTM_CERT' | 'SRVR_CERT' | 'CLNT_CERT';
	/** Certificate Request File Name */
	certificateRequestFileName?: string;
	/** CA Certificate File Name */
	caCertificateFileName?: string;
	/** CA Certificate File Format */
	caCertificateFileFormat?: 'PEM' | 'DER';
	/** CA Private Key File Name */
	caPrivateKeyFileName?: string;
	/** CA Private Key File Format */
	caPrivateKeyFileFormat?: 'PEM' | 'DER';
	/** Private Key File Name */
	privateKeyFileName?: string;
	/** CA Serial File Number */
	caSerialFileNumber?: string;
	/** Private Key Format */
	privateKeyFormat?: 'PEM' | 'DER';
	/** Certificate-Key Pair Name */
	certificateKeyPairName?: string;
	/** Password */
	password?: string;
	/** Notify When Expires */
	notifyExpiration?: boolean;
	/** Notification Period (Days) */
	notificationPeriod?: number;
	/** Certificate Bundle */
	certificateBundle?: boolean;
	/** File Location */
	fileLocation?: string;
	/** Input Data Field Name */
	binaryProperty?: string;
	/** File Name */
	fileName?: string;
}

export interface Notion_v2_2Parameters extends BaseNodeParams {
	/** In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access. */
	notionNotice?: unknown;
	Credentials?: unknown;
	/** Resource */
	resource?: 'block' | 'database' | 'databasePage' | 'page' | 'user';
	/** Operation */
	operation?: 'append' | 'getAll';
	/** Block */
	blockId?: unknown;
	/** Blocks */
	blockUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Also Fetch Nested Blocks */
	fetchNestedBlocks?: boolean;
	/** Simplify Output */
	simplifyOutput?: boolean;
	/** Database */
	databaseId?: unknown;
	/** Simplify */
	simple?: boolean;
	/** Search Text */
	text?: string;
	/** Title */
	title?: string;
	/** Properties */
	propertiesUi?: Record<string, unknown>;
	/** Database Page */
	pageId?: unknown;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://developers.notion.com/reference/post-database-query#post-database-query-filter" target="_blank">Notion guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** User ID */
	userId?: string;
}

export interface Notion_v1Parameters extends BaseNodeParams {
	/** In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access. */
	notionNotice?: unknown;
	/** Resource */
	resource?: 'block' | 'database' | 'databasePage' | 'page' | 'user';
	/** Operation */
	operation?: 'append' | 'getAll';
	/** Block */
	blockId?: unknown;
	/** Blocks */
	blockUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Also Fetch Nested Blocks */
	fetchNestedBlocks?: boolean;
	/** Simplify Output */
	simplifyOutput?: boolean;
	/** Database */
	databaseId?: unknown;
	/** Simplify */
	simple?: boolean;
	/** Search Text */
	text?: string;
	/** Title */
	title?: string;
	/** Properties */
	propertiesUi?: Record<string, unknown>;
	/** Database Page */
	pageId?: unknown;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://developers.notion.com/reference/post-database-query#post-database-query-filter" target="_blank">Notion guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** User ID */
	userId?: string;
}

export interface NotionTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Event */
	event?: 'pageAddedToDatabase' | 'pagedUpdatedInDatabase';
	/** In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access. */
	notionNotice?: unknown;
	/** Database */
	databaseId?: unknown;
	/** Simplify */
	simple?: boolean;
}

export interface NpmParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'package' | 'distTag' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getMetadata' | 'getVersions' | 'search' | '__CUSTOM_API_CALL__';
	/** Package Name */
	packageName?: string;
	/** Package Version */
	packageVersion?: string;
	/** Query */
	query?: string;
	/** Limit */
	limit?: number;
	/** Offset */
	offset?: number;
	/** Distribution Tag Name */
	distTagName?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface OdooParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'custom' | 'note' | 'opportunity';
	/** Custom Resource Name or ID */
	customResource?: string;
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Fields */
	fieldsToCreateOrUpdate?: Record<string, unknown>;
	/** Custom Resource ID */
	customResourceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	filterRequest?: Record<string, unknown>;
	/** Name */
	opportunityName?: string;
	/** Opportunity ID */
	opportunityId?: string;
	/** Name */
	contactName?: string;
	/** Contact ID */
	contactId?: string;
	/** Memo */
	memo?: string;
	/** Note ID */
	noteId?: string;
}

export interface OktaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** User */
	userId?: unknown;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Username */
	login?: string;
	/** Email */
	email?: string;
	/** Activate */
	activate?: boolean;
	/** Fields */
	getCreateFields?: Record<string, unknown>;
	/** Fields */
	getUpdateFields?: Record<string, unknown>;
	/** Search Query */
	searchQuery?: string;
	/** Limit */
	limit?: number;
	/** Return All */
	returnAll?: boolean;
	/** Simplify */
	simplify?: boolean;
	/** Send Email */
	sendEmail?: boolean;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface OneSimpleApiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'information' | 'socialProfile' | 'utility' | 'website';
	/** Operation */
	operation?: 'pdf' | 'seo' | 'screenshot';
	/** Webpage URL */
	link?: string;
	/** Download PDF? */
	download?: boolean;
	/** Put Output In Field */
	output?: string;
	/** QR Content */
	message?: string;
	/** Profile Name */
	profileName?: string;
	/** Artist Name */
	artistName?: string;
	/** Value */
	value?: string;
	/** From Currency */
	fromCurrency?: string;
	/** To Currency */
	toCurrency?: string;
	/** Email Address */
	emailAddress?: string;
}

export interface OpenAi_v1_1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Resource */
	resource?: 'chat' | 'image' | 'text' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'complete' | '__CUSTOM_API_CALL__';
	/** Model */
	model?: string;
	/** Model */
	chatModel?: string;
	/** Prompt */
	prompt?: Record<string, unknown>;
	/** Simplify */
	simplifyOutput?: boolean;
	/** Model */
	imageModel?: string;
	/** Response Format */
	responseFormat?: 'binaryData' | 'imageUrl';
	/** Input */
	input?: string;
	/** Instruction */
	instruction?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface OpenThesaurusParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'getSynonyms';
	/** Text */
	text?: string;
}

export interface OpenWeatherMapParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'currentWeather' | '5DayForecast' | '__CUSTOM_API_CALL__';
	/** Format */
	format?: 'imperial' | 'metric' | 'standard';
	/** Location Selection */
	locationSelection?: 'cityName' | 'cityId' | 'coordinates' | 'zipCode';
	/** City */
	cityName?: string;
	/** City ID */
	cityId?: number;
	/** Latitude */
	latitude?: string;
	/** Longitude */
	longitude?: string;
	/** Zip Code */
	zipCode?: string;
	/** Language */
	language?: string;
}

export interface OracleDatabaseParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'deleteTable' | 'execute' | 'insert' | 'upsert' | 'select' | 'update';
	/** Schema */
	schema?: unknown;
	/** Table */
	table?: unknown;
	/** Command */
	deleteCommand?: 'truncate' | 'delete' | 'drop';
	/** Select Rows */
	where?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
	/** Important: Single Statement mode works only for the first item */
	stmtBatchingNotice?: unknown;
	/** Statement */
	query?: string;
	/** Columns */
	columns?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
}

export interface OrbitParameters extends BaseNodeParams {
	/** Orbit has been shutdown and will no longer function from July 11th, You can read more <a target="_blank" href="https://orbit.love/blog/orbit-is-joining-postman">here</a>. */
	deprecated?: unknown;
	/** Resource */
	resource?: 'activity' | 'member' | 'note' | 'post';
	/** Operation */
	operation?: 'create' | 'getAll';
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Member ID */
	memberId?: string;
	/** Title */
	title?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Resolve Identities */
	resolveIdentities?: boolean;
	/** Source */
	source?: 'discourse' | 'email' | 'github' | 'twitter';
	/** Search By */
	searchBy?: 'username' | 'id';
	/** ID */
	id?: string;
	/** Username */
	username?: string;
	/** Email */
	email?: string;
	/** Host */
	host?: string;
	/** Identity */
	identityUi?: Record<string, unknown>;
	/** Note */
	note?: string;
	/** Resolve Member */
	resolveMember?: boolean;
	/** Note ID */
	noteId?: string;
	/** URL */
	url?: string;
	/** Post ID */
	postId?: string;
}

export interface OuraParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'profile' | 'summary' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface PaddleParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'coupon' | 'payment' | 'plan' | 'product' | 'user';
	/** Operation */
	operation?: 'create' | 'getAll' | 'update';
	/** Coupon Type */
	couponType?: 'checkout' | 'product';
	/** Product Names or IDs */
	productIds?: unknown;
	/** Discount Type */
	discountType?: 'flat' | 'percentage';
	/** Discount Amount Currency */
	discountAmount?: number;
	/** Currency */
	currency?:
		| 'ARS'
		| 'AUD'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HUF'
		| 'INR'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'NOK'
		| 'NZD'
		| 'PLN'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TWD'
		| 'USD'
		| 'ZAR';
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Product ID */
	productId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Update By */
	updateBy?: 'couponCode' | 'group';
	/** Coupon Code */
	couponCode?: string;
	/** Group */
	group?: string;
	/** Payment Name or ID */
	paymentId?: string;
	/** Date */
	date?: string;
	/** Plan ID */
	planId?: string;
}

export interface PagerDutyParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'incident' | 'incidentNote' | 'logEntry' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Service Name or ID */
	serviceId?: string;
	/** Email */
	email?: string;
	/** Conference Bridge */
	conferenceBridgeUi?: Record<string, unknown>;
	/** Incident ID */
	incidentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Content */
	content?: string;
	/** Log Entry ID */
	logEntryId?: string;
	/** User ID */
	userId?: string;
}

export interface PayPalParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'payout' | 'payoutItem';
	/** Operation */
	operation?: 'create' | 'get';
	/** Sender Batch ID */
	senderBatchId?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Items */
	itemsUi?: Record<string, unknown>;
	/** Items */
	itemsJson?: string | object;
	/** Payout Batch ID */
	payoutBatchId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Payout Item ID */
	payoutItemId?: string;
}

export interface PayPalTriggerParameters extends BaseNodeParams {
	/** Event Names or IDs */
	events?: unknown;
}

export interface PeekalinkParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'isAvailable' | 'preview';
	/** URL */
	url?: string;
}

export interface PerplexityParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'complete' | '__CUSTOM_API_CALL__';
	/** Model */
	model?: 'sonar' | 'sonar-deep-research' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro';
	/** Messages */
	messages?: Record<string, unknown>;
	/** Simplify Output */
	simplify?: boolean;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface PhantombusterParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'agent' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getAll' | 'getOutput' | 'launch' | '__CUSTOM_API_CALL__';
	/** Agent Name or ID */
	agentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Resolve Data */
	resolveData?: boolean;
	/** JSON Parameters */
	jsonParameters?: boolean;
}

export interface PhilipsHueParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'light' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Light ID */
	lightId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** On */
	on?: boolean;
}

export interface PipedriveParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'activity'
		| 'deal'
		| 'dealActivity'
		| 'dealProduct'
		| 'file'
		| 'lead'
		| 'note'
		| 'organization'
		| 'person'
		| 'product'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Subject */
	subject?: string;
	/** Done */
	done?: '0' | '1';
	/** Type */
	type?: string;
	/** Activity ID */
	activityId?: number;
	/** Title */
	title?: string;
	/** Associate With */
	associateWith?: 'organization' | 'person';
	/** Organization ID */
	org_id?: number;
	/** Person ID */
	person_id?: number;
	/** Deal ID */
	dealId?: number;
	/** Product Name or ID */
	productId?: string;
	/** Item Price */
	item_price?: number;
	/** Quantity */
	quantity?: number;
	/** Product Attachment Name or ID */
	productAttachmentId?: string;
	/** Term */
	term?: string;
	/** Exact Match */
	exactMatch?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File ID */
	fileId?: number;
	/** Organization ID */
	organization_id?: number;
	/** Lead ID */
	leadId?: string;
	/** Content */
	content?: string;
	/** Note ID */
	noteId?: number;
	/** Name */
	name?: string;
	/** Organization ID */
	organizationId?: number;
	/** Person ID */
	personId?: number;
	/** Resolve Properties */
	resolveProperties?: boolean;
	/** Encode Properties */
	encodeProperties?: boolean;
}

export interface PipedriveTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Incoming Authentication */
	incomingAuthentication?: 'basicAuth' | 'none';
	/** Action */
	action?: 'added' | '*' | 'deleted' | 'merged' | 'updated';
	/** Entity */
	entity?:
		| 'activity'
		| 'activityType'
		| '*'
		| 'deal'
		| 'note'
		| 'organization'
		| 'person'
		| 'pipeline'
		| 'product'
		| 'stage'
		| 'user';
	/** Object */
	object?:
		| 'activity'
		| 'activityType'
		| '*'
		| 'deal'
		| 'note'
		| 'organization'
		| 'person'
		| 'pipeline'
		| 'product'
		| 'stage'
		| 'user';
}

export interface PlivoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'call' | 'mms' | 'sms';
	/** Operation */
	operation?: 'send';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
	/** Media URLs */
	media_urls?: string;
	/** Answer Method */
	answer_method?: 'GET' | 'POST';
	/** Answer URL */
	answer_url?: string;
}

export interface PostBinParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'bin' | 'request';
	/** Operation */
	operation?: 'create' | 'get' | 'delete';
	/** Bin ID */
	binId?: string;
	/** Bin Content */
	binContent?: string;
	/** Request ID */
	requestId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface Postgres_v2_6Parameters extends BaseNodeParams {
	/** Operation */
	operation?: 'deleteTable' | 'executeQuery' | 'insert' | 'upsert' | 'select' | 'update';
	/** Schema */
	schema?: unknown;
	/** Table */
	table?: unknown;
	/** Command */
	deleteCommand?: 'truncate' | 'delete' | 'drop';
	/** Restart Sequences */
	restartSequences?: boolean;
	/** Select Rows */
	where?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
	/** Query */
	query?: string;
	/** Data Mode */
	dataMode?: 'autoMapInputData' | 'defineBelow';
	/** 
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		 */
	notice?: unknown;
	/** Values to Send */
	valuesToSend?: Record<string, unknown>;
	/** Columns */
	columns?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Column to Match On */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
}

export interface Postgres_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Schema */
	schema?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface PostgresTriggerParameters extends BaseNodeParams {
	/** Listen For */
	triggerMode?: 'createTrigger' | 'listenTrigger';
	/** Schema Name */
	schema?: unknown;
	/** Table Name */
	tableName?: unknown;
	/** Channel Name */
	channelName?: string;
	/** Event to listen for */
	firesOn?: 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface PostHogParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'alias' | 'event' | 'identity' | 'track';
	/** Operation */
	operation?: 'create';
	/** Alias */
	alias?: string;
	/** Distinct ID */
	distinctId?: string;
	/** Event */
	eventName?: string;
	/** Name */
	name?: string;
}

export interface PostmarkTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
	/** First Open */
	firstOpen?: boolean;
	/** Include Content */
	includeContent?: boolean;
}

export interface ProfitWellParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'company' | 'metric';
	/** Operation */
	operation?: 'getSetting';
	/** Type */
	type?: 'daily' | 'monthly';
	/** Month */
	month?: string;
	/** Simplify */
	simple?: boolean;
}

export interface PushbulletParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'push' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Type */
	type?: 'file' | 'link' | 'note';
	/** Title */
	title?: string;
	/** Body */
	body?: string;
	/** URL */
	url?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Target */
	target?: 'channel_tag' | 'default' | 'device_iden' | 'email';
	/** Value */
	value?: string;
	/** Push ID */
	pushId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Dismissed */
	dismissed?: boolean;
}

export interface PushcutParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'notification';
	/** Operation */
	operation?: 'send';
	/** Notification Name or ID */
	notificationName?: string;
}

export interface PushcutTriggerParameters extends BaseNodeParams {
	/** Action Name */
	actionName?: string;
}

export interface PushoverParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'message' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'push' | '__CUSTOM_API_CALL__';
	/** User Key */
	userKey?: string;
	/** Message */
	message?: string;
	/** Priority */
	priority?: -2 | -1 | 0 | 1 | 2;
	/** Retry (Seconds) */
	retry?: number;
	/** Expire (Seconds) */
	expire?: number;
}

export interface QuestDbParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'executeQuery' | 'insert';
	/** Query */
	query?: string;
	/** Schema */
	schema?: unknown;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface QuickbaseParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'field' | 'file' | 'record' | 'report';
	/** Operation */
	operation?: 'getAll';
	/** Table ID */
	tableId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Record ID */
	recordId?: string;
	/** Field ID */
	fieldId?: string;
	/** Version Number */
	versionNumber?: number;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Columns */
	columns?: string;
	/** Simplify */
	simple?: boolean;
	/** Where */
	where?: string;
	/** Update Key */
	updateKey?: string;
	/** Merge Field Name or ID */
	mergeFieldId?: string;
	/** Report ID */
	reportId?: string;
}

export interface QuickbooksParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'bill'
		| 'customer'
		| 'employee'
		| 'estimate'
		| 'invoice'
		| 'item'
		| 'payment'
		| 'purchase'
		| 'transaction'
		| 'vendor'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** For Vendor Name or ID */
	VendorRef?: string;
	/** Line */
	Line?: Record<string, unknown>;
	/** Bill ID */
	billId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Display Name */
	displayName?: string;
	/** Customer ID */
	customerId?: string;
	/** Family Name */
	FamilyName?: string;
	/** Given Name */
	GivenName?: string;
	/** Employee ID */
	employeeId?: string;
	/** For Customer Name or ID */
	CustomerRef?: string;
	/** Estimate ID */
	estimateId?: string;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
	/** File Name */
	fileName?: string;
	/** Email */
	email?: string;
	/** Invoice ID */
	invoiceId?: string;
	/** Item ID */
	itemId?: string;
	/** Total Amount */
	TotalAmt?: number;
	/** Payment ID */
	paymentId?: string;
	/** Purchase ID */
	purchaseId?: string;
	/** Simplify */
	simple?: boolean;
	/** Vendor ID */
	vendorId?: string;
}

export interface QuickChartParameters extends BaseNodeParams {
	/** Chart Type */
	chartType?: 'bar' | 'doughnut' | 'line' | 'pie' | 'polarArea';
	/** Add Labels */
	labelsMode?: 'manually' | 'array';
	/** Labels */
	labelsUi?: Record<string, unknown>;
	/** Labels Array */
	labelsArray?: string;
	/** Data */
	data?: string | object;
	/** Put Output In Field */
	output?: string;
	/** Chart Options */
	chartOptions?: Record<string, unknown>;
	/** Dataset Options */
	datasetOptions?: Record<string, unknown>;
}

export interface RabbitmqParameters extends BaseNodeParams {
	/** Will delete an item from the queue triggered earlier in the workflow by a RabbitMQ Trigger node */
	deleteMessage?: unknown;
	/** Mode */
	mode?: 'queue' | 'exchange';
	/** Queue / Topic */
	queue?: string;
	/** Exchange */
	exchange?: string;
	/** Type */
	exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout';
	/** Routing Key */
	routingKey?: string;
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
}

export interface RabbitmqTriggerParameters extends BaseNodeParams {
	/** Queue / Topic */
	queue?: string;
	/** To delete an item from the queue, insert a RabbitMQ node later in the workflow and use the 'Delete from queue' operation */
	laterMessageNode?: unknown;
}

export interface RaindropParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'bookmark' | 'collection' | 'tag' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Collection Name or ID */
	collectionId?: string;
	/** Link */
	link?: string;
	/** Bookmark ID */
	bookmarkId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Type */
	type?: 'parent' | 'children';
	/** Tags */
	tags?: string;
	/** Self */
	self?: boolean;
	/** User ID */
	userId?: string;
}

export interface ReadBinaryFileParameters extends BaseNodeParams {
	/** File Path */
	filePath?: string;
	/** Property Name */
	dataPropertyName?: string;
}

export interface ReadBinaryFilesParameters extends BaseNodeParams {
	/** File Selector */
	fileSelector?: string;
	/** Property Name */
	dataPropertyName?: string;
}

export interface ReadPDFParameters extends BaseNodeParams {
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Encrypted */
	encrypted?: boolean;
	/** Password */
	password?: string;
}

export interface RedditParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'post' | 'postComment' | 'profile' | 'subreddit' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | 'delete' | 'reply' | '__CUSTOM_API_CALL__';
	/** Post ID */
	postId?: string;
	/** Comment Text */
	commentText?: string;
	/** Subreddit */
	subreddit?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Comment ID */
	commentId?: string;
	/** Reply Text */
	replyText?: string;
	/** Details */
	details?: 'blockedUsers' | 'friends' | 'identity' | 'karma' | 'prefs' | 'saved' | 'trophies';
	/** Content */
	content?: 'about' | 'rules';
	/** Kind */
	kind?: 'self' | 'link' | 'image';
	/** Title */
	title?: string;
	/** URL */
	url?: string;
	/** Text */
	text?: string;
	/** Resubmit */
	resubmit?: boolean;
	/** Location */
	location?: 'allReddit' | 'subreddit';
	/** Keyword */
	keyword?: string;
	/** Username */
	username?: string;
}

export interface RedisParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'delete' | 'get' | 'incr' | 'info' | 'keys' | 'pop' | 'publish' | 'push' | 'set';
	/** Key */
	key?: string;
	/** Name */
	propertyName?: string;
	/** Key Type */
	keyType?: 'automatic' | 'hash' | 'list' | 'sets' | 'string';
	/** Expire */
	expire?: boolean;
	/** TTL */
	ttl?: number;
	/** Key Pattern */
	keyPattern?: string;
	/** Get Values */
	getValues?: boolean;
	/** Value */
	value?: string;
	/** Value Is JSON */
	valueIsJSON?: boolean;
	/** Channel */
	channel?: string;
	/** Data */
	messageData?: string;
	/** List */
	list?: string;
	/** Tail */
	tail?: boolean;
}

export interface RedisTriggerParameters extends BaseNodeParams {
	/** Channels */
	channels?: string;
}

export interface RenameKeysParameters extends BaseNodeParams {
	/** Keys */
	keys?: Record<string, unknown>;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
}

export interface RespondToWebhookParameters extends BaseNodeParams {
	/** Enable Response Output Branch */
	enableResponseOutput?: boolean;
	/** Verify that the "Webhook" node's "Respond" parameter is set to "Using Respond to Webhook Node". <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details */
	generalNotice?: unknown;
	/** Respond With */
	respondWith?:
		| 'allIncomingItems'
		| 'binary'
		| 'firstIncomingItem'
		| 'json'
		| 'jwt'
		| 'noData'
		| 'redirect'
		| 'text';
	/** Credentials */
	credentials?: unknown;
	/** When using expressions, note that this node will only run for the first item in the input data */
	webhookNotice?: unknown;
	/** Redirect URL */
	redirectURL?: string;
	/** Response Body */
	responseBody?: string | object;
	/** Payload */
	payload?: string | object;
	/** Response Data Source */
	responseDataSource?: 'automatically' | 'set';
	/** Input Field Name */
	inputFieldName?: string;
	/** To avoid unexpected behavior, add a "Content-Type" response header with the appropriate value */
	contentTypeNotice?: unknown;
}

export interface RocketchatParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'chat' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'postMessage' | '__CUSTOM_API_CALL__';
	/** Channel */
	channel?: string;
	/** Text */
	text?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Attachments */
	attachmentsJson?: string | object;
}

export interface RssFeedReadParameters extends BaseNodeParams {
	/** URL */
	url?: string;
}

export interface RssFeedReadTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Feed URL */
	feedUrl?: string;
}

export interface RundeckParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'job' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'execute' | 'getMetadata' | '__CUSTOM_API_CALL__';
	/** Job ID */
	jobid?: string;
	/** Arguments */
	arguments?: Record<string, unknown>;
	/** Filter */
	filter?: string;
}

export interface S3Parameters extends BaseNodeParams {
	/** This node is for services that use the S3 standard, e.g. Minio or Digital Ocean Spaces. For AWS S3 use the 'AWS S3' node. */
	s3StandardNotice?: unknown;
	/** Resource */
	resource?: 'bucket' | 'file' | 'folder';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'search';
	/** Name */
	name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Bucket Name */
	bucketName?: string;
	/** Folder Name */
	folderName?: string;
	/** Folder Key */
	folderKey?: string;
	/** Source Path */
	sourcePath?: string;
	/** Destination Path */
	destinationPath?: string;
	/** File Name */
	fileName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** File Key */
	fileKey?: string;
}

export interface SalesforceParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'oAuth2' | 'jwt';
	/** Resource */
	resource?:
		| 'account'
		| 'attachment'
		| 'case'
		| 'contact'
		| 'customObject'
		| 'document'
		| 'flow'
		| 'lead'
		| 'opportunity'
		| 'search'
		| 'task'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addToCampaign'
		| 'addNote'
		| 'create'
		| 'upsert'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'getSummary'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Match Against */
	externalId?: string;
	/** Value to Match */
	externalIdValue?: string;
	/** Company */
	company?: string;
	/** Last Name */
	lastname?: string;
	/** Lead ID */
	leadId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Title */
	title?: string;
	/** Contact ID */
	contactId?: string;
	/** Custom Object Name or ID */
	customObject?: string;
	/** Fields */
	customFieldsUi?: Record<string, unknown>;
	/** Record ID */
	recordId?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Name */
	name?: string;
	/** Close Date */
	closeDate?: string;
	/** Stage Name or ID */
	stageName?: string;
	/** Opportunity ID */
	opportunityId?: string;
	/** Account ID */
	accountId?: string;
	/** Query */
	query?: string;
	/** Type Name or ID */
	type?: string;
	/** Case ID */
	caseId?: string;
	/** Status Name or ID */
	status?: string;
	/** Task ID */
	taskId?: string;
	/** Parent ID */
	parentId?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** User ID */
	userId?: string;
	/** API Name */
	apiName?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Variables */
	variablesJson?: string | object;
	/** Variables */
	variablesUi?: Record<string, unknown>;
}

export interface SalesforceTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Trigger On */
	triggerOn?:
		| 'accountCreated'
		| 'accountUpdated'
		| 'attachmentCreated'
		| 'attachmentUpdated'
		| 'caseCreated'
		| 'caseUpdated'
		| 'contactCreated'
		| 'contactUpdated'
		| 'customObjectCreated'
		| 'customObjectUpdated'
		| 'leadCreated'
		| 'leadUpdated'
		| 'opportunityCreated'
		| 'opportunityUpdated'
		| 'taskCreated'
		| 'taskUpdated'
		| 'userCreated'
		| 'userUpdated';
	/** Custom Object Name or ID */
	customObject?: string;
}

export interface SalesmateParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'activity' | 'company' | 'deal';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	name?: string;
	/** Owner Name or ID */
	owner?: string;
	/** RAW Data */
	rawData?: boolean;
	/** Company ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Filters */
	filtersJson?: string | object;
	/** Title */
	title?: string;
	/** Type */
	type?: string;
	/** Primary Contact Name or ID */
	primaryContact?: string;
	/** Pipeline */
	pipeline?: 'Sales';
	/** Status */
	status?: 'Open' | 'Close' | 'Lost';
	/** Stage */
	stage?: 'New (Untouched)' | 'Contacted' | 'Qualified' | 'In Negotiation' | 'Proposal Presented';
	/** Currency */
	currency?: string;
}

export interface ScheduleTriggerParameters extends BaseNodeParams {
	/** This workflow will run on the schedule you define here once you <a data-key="activate">activate</a> it.<br><br>For testing, you can also trigger it manually: by going back to the canvas and clicking 'execute workflow' */
	notice?: unknown;
	/** Trigger Rules */
	rule?: Record<string, unknown>;
}

export interface SeaTable_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'row' | 'base' | 'link' | 'asset';
	/** Operation */
	operation?: 'create' | 'remove' | 'get' | 'list' | 'lock' | 'search' | 'unlock' | 'update';
	/** Table Name */
	tableName?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	fieldsToSend?: 'autoMapInputData' | 'defineBelow';
	/** Apply Column Default Values */
	apply_default?: boolean;
	/** In this mode, make sure the incoming data fields are named the same as the columns in SeaTable. (Use an "Edit Fields" node before this node to change them if required.) */
	notice?: unknown;
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Columns to Send */
	columnsUi?: Record<string, unknown>;
	/** Save to "Big Data" Backend */
	bigdata?: boolean;
	/** View Name */
	viewName?: string;
	/** Column Name or ID */
	searchColumn?: string;
	/** Search Term */
	searchTerm?: string;
	/** Name or email of the collaborator */
	searchString?: string;
	/** Link Column */
	linkColumn?: string;
	/** Row ID From the Source Table */
	linkColumnSourceId?: string;
	/** Row ID From the Target */
	linkColumnTargetId?: string;
	/** Column Name */
	uploadColumn?: string;
	/** Property Name */
	dataPropertyName?: string;
	/** Asset Path */
	assetPath?: string;
}

export interface SeaTable_v1Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'row';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Table Name */
	tableName?: string;
	/** Table ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	fieldsToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Columns to Send */
	columnsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface SeaTableTrigger_v2Parameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Event */
	event?: 'newRow' | 'updatedRow' | 'newAsset';
	/** Table Name */
	tableName?: string;
	/** View Name */
	viewName?: string;
	/** Signature Column */
	assetColumn?: string;
	/** "Fetch Test Event" returns max. three items of the last hour. */
	notice?: unknown;
}

export interface SeaTableTrigger_v1Parameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Table Name or ID */
	tableName?: string;
	/** Event */
	event?: 'rowCreated';
	/** Simplify */
	simple?: boolean;
}

export interface SecurityScorecardParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'company' | 'industry' | 'invite' | 'portfolio' | 'portfolioCompany' | 'report';
	/** Operation */
	operation?:
		| 'getFactor'
		| 'getFactorHistorical'
		| 'getHistoricalScore'
		| 'getScorecard'
		| 'getScorePlan';
	/** Scorecard Identifier */
	scorecardIdentifier?: string;
	/** Score */
	score?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
	/** Industry */
	industry?: 'food' | 'healthcare' | 'manofacturing' | 'retail' | 'technology';
	/** Email */
	email?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Message */
	message?: string;
	/** Portfolio ID */
	portfolioId?: string;
	/** Portfolio Name */
	name?: string;
	/** Description */
	description?: string;
	/** Privacy */
	privacy?: 'private' | 'shared' | 'team';
	/** Domain */
	domain?: string;
	/** Report */
	report?:
		| 'detailed'
		| 'events-json'
		| 'issues'
		| 'partnership'
		| 'summary'
		| 'full-scorecard-json'
		| 'portfolio'
		| 'scorecard-footprint';
	/** Branding */
	branding?: 'securityscorecard' | 'company_and_securityscorecard' | 'company';
	/** Date */
	date?: string;
	/** Report URL */
	url?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
}

export interface SegmentParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'group' | 'identify' | 'track' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'add' | '__CUSTOM_API_CALL__';
	/** User ID */
	userId?: string;
	/** Group ID */
	groupId?: string;
	/** Traits */
	traits?: Record<string, unknown>;
	/** Context */
	context?: Record<string, unknown>;
	/** Integration */
	integrations?: Record<string, unknown>;
	/** Event */
	event?: string;
	/** Properties */
	properties?: Record<string, unknown>;
	/** Name */
	name?: string;
}

export interface SendGridParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'list' | 'mail' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** List ID */
	listId?: string;
	/** Delete Contacts */
	deleteContacts?: boolean;
	/** Contact Sample */
	contactSample?: boolean;
	/** Email */
	email?: string;
	/** Contact IDs */
	ids?: string;
	/** Delete All */
	deleteAll?: boolean;
	/** By */
	by?: 'id' | 'email';
	/** Contact ID */
	contactId?: string;
	/** Sender Email */
	fromEmail?: string;
	/** Sender Name */
	fromName?: string;
	/** Recipient Email */
	toEmail?: string;
	/** Subject */
	subject?: string;
	/** Dynamic Template */
	dynamicTemplate?: boolean;
	/** MIME Type */
	contentType?: 'text/plain' | 'text/html';
	/** Message Body */
	contentValue?: string;
	/** Template Name or ID */
	templateId?: string;
	/** Dynamic Template Fields */
	dynamicTemplateFields?: Record<string, unknown>;
}

export interface SendyParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'campaign' | 'subscriber';
	/** Operation */
	operation?: 'create';
	/** From Name */
	fromName?: string;
	/** From Email */
	fromEmail?: string;
	/** Reply To */
	replyTo?: string;
	/** Title */
	title?: string;
	/** Subject */
	subject?: string;
	/** HTML Text */
	htmlText?: string;
	/** Send Campaign */
	sendCampaign?: boolean;
	/** Brand ID */
	brandId?: string;
	/** Email */
	email?: string;
	/** List ID */
	listId?: string;
}

export interface SentryIoParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2' | 'accessTokenServer';
	/** Resource */
	resource?:
		| 'event'
		| 'issue'
		| 'organization'
		| 'project'
		| 'release'
		| 'team'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Organization Slug Name or ID */
	organizationSlug?: string;
	/** Project Slug Name or ID */
	projectSlug?: string;
	/** Full */
	full?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Event ID */
	eventId?: string;
	/** Issue ID */
	issueId?: string;
	/** Name */
	name?: string;
	/** Agree to Terms */
	agreeTerms?: boolean;
	/** Slug Name or ID */
	organization_slug?: string;
	/** Team Slug Name or ID */
	teamSlug?: string;
	/** Version */
	version?: string;
	/** URL */
	url?: string;
	/** Project Names or IDs */
	projects?: unknown;
}

export interface ServiceNowParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'basicAuth' | 'oAuth2';
	/** Resource */
	resource?:
		| 'attachment'
		| 'businessService'
		| 'configurationItems'
		| 'department'
		| 'dictionary'
		| 'incident'
		| 'tableRecord'
		| 'user'
		| 'userGroup'
		| 'userRole'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'upload' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Table Name or ID */
	tableName?: string;
	/** Table Record ID */
	id?: string;
	/** Input Data Field Name */
	inputDataFieldName?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Download Attachments */
	download?: boolean;
	/** Output Field */
	outputField?: string;
	/** Short Description */
	short_description?: string;
	/** Data to Send */
	dataToSend?: 'mapInput' | 'columns' | 'nothing';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsToSend?: Record<string, unknown>;
	/** Retrieve Identifier */
	getOption?: 'id' | 'user_name';
	/** Username */
	user_name?: string;
}

export interface Set_v3_4Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'manual' | 'raw';
	/** Duplicate Item */
	duplicateItem?: boolean;
	/** Duplicate Item Count */
	duplicateCount?: number;
	/** Item duplication is set in the node settings. This option will be ignored when the workflow runs automatically. */
	duplicateWarning?: unknown;
	/** JSON */
	jsonOutput?: string | object;
	/** Fields to Set */
	fields?: Record<string, unknown>;
	/** Fields to Set */
	assignments?: unknown;
	/** Include in Output */
	include?: 'all' | 'none' | 'selected' | 'except';
	/** Include Other Input Fields */
	includeOtherFields?: boolean;
	/** Fields to Include */
	includeFields?: string;
	/** Fields to Exclude */
	excludeFields?: string;
}

export interface Set_v2Parameters extends BaseNodeParams {
	/** Keep Only Set */
	keepOnlySet?: boolean;
	/** Values to Set */
	values?: Record<string, unknown>;
}

export interface ShopifyParameters extends BaseNodeParams {
	/** Shopify API Version: 2024-07 */
	apiVersion?: unknown;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2' | 'apiKey';
	/** Resource */
	resource?: 'order' | 'product' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Line Items */
	limeItemsUi?: Record<string, unknown>;
	/** Order ID */
	orderId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Product ID */
	productId?: string;
}

export interface ShopifyTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2' | 'apiKey';
	/** Trigger On */
	topic?:
		| 'app/uninstalled'
		| 'carts/create'
		| 'carts/update'
		| 'checkouts/create'
		| 'checkouts/delete'
		| 'checkouts/update'
		| 'collections/create'
		| 'collections/delete'
		| 'collection_listings/add'
		| 'collection_listings/remove'
		| 'collection_listings/update'
		| 'collections/update'
		| 'customers/create'
		| 'customers/delete'
		| 'customers/disable'
		| 'customers/enable'
		| 'customer_groups/create'
		| 'customer_groups/delete'
		| 'customer_groups/update'
		| 'customers/update'
		| 'draft_orders/create'
		| 'draft_orders/delete'
		| 'draft_orders/update'
		| 'fulfillments/create'
		| 'fulfillment_events/create'
		| 'fulfillment_events/delete'
		| 'fulfillments/update'
		| 'inventory_items/create'
		| 'inventory_items/delete'
		| 'inventory_items/update'
		| 'inventory_levels/connect'
		| 'inventory_levels/disconnect'
		| 'inventory_levels/update'
		| 'locales/create'
		| 'locales/update'
		| 'locations/create'
		| 'locations/delete'
		| 'locations/update'
		| 'orders/cancelled'
		| 'orders/create'
		| 'orders/fulfilled'
		| 'orders/paid'
		| 'orders/partially_fulfilled'
		| 'order_transactions/create'
		| 'orders/updated'
		| 'orders/delete'
		| 'products/create'
		| 'products/delete'
		| 'product_listings/add'
		| 'product_listings/remove'
		| 'product_listings/update'
		| 'products/update'
		| 'refunds/create'
		| 'shop/update'
		| 'tender_transactions/create'
		| 'themes/create'
		| 'themes/delete'
		| 'themes/publish'
		| 'themes/update';
}

export interface Signl4Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'alert';
	/** Operation */
	operation?: 'send' | 'resolve';
	/** Message */
	message?: string;
	/** External ID */
	externalId?: string;
}

export interface SimulateParameters extends BaseNodeParams {
	/** Icon to Display on Canvas */
	icon?: string;
	/** Subtitle */
	subtitle?: string;
	/** Output */
	output?: 'all' | 'specify' | 'custom';
	/** Number of Items */
	numberOfItems?: number;
	/** JSON */
	jsonOutput?: string | object;
	/** Execution Duration (MS) */
	executionDuration?: number;
}

export interface SimulateTriggerParameters extends BaseNodeParams {
	/** Icon to Display on Canvas */
	icon?: string;
	/** Subtitle */
	subtitle?: string;
	/** Output (JSON) */
	jsonOutput?: string | object;
	/** Execution Duration (MS) */
	executionDuration?: number;
}

export interface Slack_v2_3Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'channel' | 'file' | 'message' | 'reaction' | 'star' | 'user' | 'userGroup';
	/** Operation */
	operation?:
		| 'archive'
		| 'close'
		| 'create'
		| 'get'
		| 'getAll'
		| 'history'
		| 'invite'
		| 'join'
		| 'kick'
		| 'leave'
		| 'member'
		| 'open'
		| 'rename'
		| 'replies'
		| 'setPurpose'
		| 'setTopic'
		| 'unarchive';
	/** Channel */
	channelId?: unknown;
	/** Channel Visibility */
	channelVisibility?: 'public' | 'private';
	/** User Names or IDs */
	userIds?: unknown;
	/** User Name or ID */
	userId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Resolve Data */
	resolveData?: boolean;
	/** Name */
	name?: string;
	/** Message Timestamp */
	ts?: number;
	/** Purpose */
	purpose?: string;
	/** Topic */
	topic?: string;
	/** Message Timestamp */
	timestamp?: number;
	/** Send Message To */
	select?: 'channel' | 'user';
	/** User */
	user?: unknown;
	/** Message Type */
	messageType?: 'text' | 'block' | 'attachment';
	/** Message Text */
	text?: string;
	/** Blocks */
	blocksUi?: string;
	/** This is a legacy Slack feature. Slack advises to instead use Blocks. */
	noticeAttachments?: unknown;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Options */
	otherOptions?: Record<string, unknown>;
	/** Search Query */
	query?: string;
	/** Sort By */
	sort?: 'desc' | 'asc' | 'relevance';
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Item to Add Star */
	target?: 'message' | 'file';
	/** File ID */
	fileId?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** File Property */
	binaryPropertyName?: string;
	/** Options */
	Options?: Record<string, unknown>;
	/** User Group ID */
	userGroupId?: string;
	/** Options */
	option?: Record<string, unknown>;
}

export interface Slack_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'channel'
		| 'file'
		| 'message'
		| 'reaction'
		| 'star'
		| 'user'
		| 'userGroup'
		| 'userProfile';
	/** Operation */
	operation?:
		| 'archive'
		| 'close'
		| 'create'
		| 'get'
		| 'getAll'
		| 'history'
		| 'invite'
		| 'join'
		| 'kick'
		| 'leave'
		| 'member'
		| 'open'
		| 'rename'
		| 'replies'
		| 'setPurpose'
		| 'setTopic'
		| 'unarchive';
	/** Channel Name or ID */
	channelId?: string;
	/** User Names or IDs */
	userIds?: unknown;
	/** User Name or ID */
	userId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Resolve Data */
	resolveData?: boolean;
	/** Name */
	name?: string;
	/** TS */
	ts?: string;
	/** Purpose */
	purpose?: string;
	/** Topic */
	topic?: string;
	/** Timestamp */
	timestamp?: string;
	/** Channel */
	channel?: string;
	/** User */
	user?: string;
	/** Text */
	text?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Options */
	otherOptions?: Record<string, unknown>;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Attachments */
	attachmentsJson?: string | object;
	/** Blocks */
	blocksJson?: string | object;
	/** Blocks */
	blocksUi?: Record<string, unknown>;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File ID */
	fileId?: string;
	/** User Group ID */
	userGroupId?: string;
}

export interface SlackTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: unknown;
	/** Set up a webhook in your Slack app to enable this node. <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#configure-a-webhook-in-slack" target="_blank">More info</a>. We also recommend setting up a <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook" target="_blank">signing secret</a> to ensure the authenticity of requests. */
	notice?: unknown;
	/** Trigger On */
	trigger?: unknown;
	/** Watch Whole Workspace */
	watchWorkspace?: boolean;
	/** Channel to Watch */
	channelId?: unknown;
	/** Download Files */
	downloadFiles?: boolean;
}

export interface Sms77Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'sms' | 'voice' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
}

export interface SnowflakeParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
}

export interface SplitInBatches_v3Parameters extends BaseNodeParams {
	/** You may not need this node — n8n nodes automatically run once for each input item. <a href="https://docs.n8n.io/getting-started/key-concepts/looping.html#using-loops-in-n8n" target="_blank">More info</a> */
	splitInBatchesNotice?: unknown;
	/** Batch Size */
	batchSize?: number;
}

export interface SplitInBatches_v2Parameters extends BaseNodeParams {
	/** You may not need this node — n8n nodes automatically run once for each input item. <a href="https://docs.n8n.io/getting-started/key-concepts/looping.html#using-loops-in-n8n" target="_blank">More info</a> */
	splitInBatchesNotice?: unknown;
	/** Batch Size */
	batchSize?: number;
}

export interface SplitInBatches_v1Parameters extends BaseNodeParams {
	/** You may not need this node — n8n nodes automatically run once for each input item. <a href="https://docs.n8n.io/getting-started/key-concepts/looping.html#using-loops-in-n8n" target="_blank">More info</a> */
	splitInBatchesNotice?: unknown;
	/** Batch Size */
	batchSize?: number;
}

export interface Splunk_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'alert' | 'report' | 'search' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getReport' | 'getMetrics' | '__CUSTOM_API_CALL__';
	/** Search Job */
	searchJobId?: unknown;
	/** Name */
	name?: string;
	/** Report */
	reportId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Query */
	search?: string;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Roles */
	roles?: unknown;
	/** Password */
	password?: string;
	/** User */
	userId?: unknown;
}

export interface Splunk_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Resource */
	resource?: 'firedAlert' | 'searchConfiguration' | 'searchJob' | 'searchResult' | 'user';
	/** Operation */
	operation?: 'getReport';
	/** Search Configuration ID */
	searchConfigurationId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Query */
	search?: string;
	/** Search ID */
	searchJobId?: string;
	/** Name */
	name?: string;
	/** Role Names or IDs */
	roles?: unknown;
	/** Password */
	password?: string;
	/** User ID */
	userId?: string;
}

export interface SpontitParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'push';
	/** Operation */
	operation?: 'create';
	/** Content */
	content?: string;
}

export interface SpotifyParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'album'
		| 'artist'
		| 'library'
		| 'myData'
		| 'player'
		| 'playlist'
		| 'track'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addSongToQueue'
		| 'currentlyPlaying'
		| 'nextSong'
		| 'pause'
		| 'previousSong'
		| 'recentlyPlayed'
		| 'resume'
		| 'volume'
		| 'startMusic'
		| '__CUSTOM_API_CALL__';
	/** Resource ID */
	id?: string;
	/** Search Keyword */
	query?: string;
	/** Country */
	country?: string;
	/** Name */
	name?: string;
	/** Track ID */
	trackID?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Volume */
	volumePercent?: number;
}

export interface SpreadsheetFile_v2Parameters extends BaseNodeParams {
	/** Operation */
	operation?: 'fromFile' | 'toFile';
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File Format */
	fileFormat?: 'autodetect' | 'csv' | 'html' | 'ods' | 'rtf' | 'xls' | 'xlsx';
}

export interface SpreadsheetFile_v1Parameters extends BaseNodeParams {
	/** <strong>New node version available:</strong> get the latest version with added features from the nodes panel. */
	oldVersionNotice?: unknown;
	/** Operation */
	operation?: 'fromFile' | 'toFile';
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File Format */
	fileFormat?: 'csv' | 'html' | 'ods' | 'rtf' | 'xls' | 'xlsx';
}

export interface SseTriggerParameters extends BaseNodeParams {
	/** URL */
	url?: string;
}

export interface SshParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'password' | 'privateKey';
	/** Resource */
	resource?: 'command' | 'file';
	/** Operation */
	operation?: 'execute';
	/** Command */
	command?: string;
	/** Working Directory */
	cwd?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Target Directory */
	path?: string;
}

export interface StackbyParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'append' | 'delete' | 'list' | 'read';
	/** Stack ID */
	stackId?: string;
	/** Table */
	table?: string;
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Columns */
	columns?: string;
}

export interface StartParameters extends BaseNodeParams {
	/** This node is where a manual workflow execution starts. To make one, go back to the canvas and click ‘execute workflow’ */
	notice?: unknown;
}

export interface StopAndErrorParameters extends BaseNodeParams {
	/** Error Type */
	errorType?: 'errorMessage' | 'errorObject';
	/** Error Message */
	errorMessage?: string;
	/** Error Object */
	errorObject?: string | object;
}

export interface StoryblokParameters extends BaseNodeParams {
	/** Source */
	source?: 'contentApi' | 'managementApi';
	/** Resource */
	resource?: 'story';
	/** Operation */
	operation?: 'get' | 'getAll';
	/** Identifier */
	identifier?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Space Name or ID */
	space?: string;
	/** Story ID */
	storyId?: string;
}

export interface StrapiParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'password' | 'token';
	/** Resource */
	resource?: 'entry' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Content Type */
	contentType?: string;
	/** Columns */
	columns?: string;
	/** Entry ID */
	entryId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Update Key */
	updateKey?: string;
}

export interface StravaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'activity' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'get'
		| 'getComments'
		| 'getKudos'
		| 'getLaps'
		| 'getAll'
		| 'getStreams'
		| 'getZones'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Type */
	type?: string;
	/** Sport Type */
	sport_type?:
		| 'AlpineSki'
		| 'BackcountrySki'
		| 'Badminton'
		| 'Canoeing'
		| 'Crossfit'
		| 'EBikeRide'
		| 'Elliptical'
		| 'EMountainBikeRide'
		| 'Golf'
		| 'GravelRide'
		| 'Handcycle'
		| 'HighIntensityIntervalTraining'
		| 'Hike'
		| 'IceSkate'
		| 'InlineSkate'
		| 'Kayaking'
		| 'Kitesurf'
		| 'MountainBikeRide'
		| 'NordicSki'
		| 'Pickleball'
		| 'Pilates'
		| 'Racquetball'
		| 'Ride'
		| 'RockClimbing'
		| 'RollerSki'
		| 'Rowing'
		| 'Run'
		| 'Sail'
		| 'Skateboard'
		| 'Snowboard'
		| 'Snowshoe'
		| 'Soccer'
		| 'Squash'
		| 'StairStepper'
		| 'StandUpPaddling'
		| 'Surfing'
		| 'Swim'
		| 'TableTennis'
		| 'Tennis'
		| 'TrailRun'
		| 'Velomobile'
		| 'VirtualRide'
		| 'VirtualRow'
		| 'VirtualRun'
		| 'Walk'
		| 'WeightTraining'
		| 'Wheelchair'
		| 'Windsurf'
		| 'Workout'
		| 'Yoga';
	/** Start Date */
	startDate?: string;
	/** Elapsed Time (Seconds) */
	elapsedTime?: number;
	/** Activity ID */
	activityId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Keys */
	keys?: unknown;
}

export interface StravaTriggerParameters extends BaseNodeParams {
	/** Object */
	object?: '*' | 'activity' | 'athlete';
	/** Event */
	event?: '*' | 'create' | 'delete' | 'update';
	/** Resolve Data */
	resolveData?: boolean;
}

export interface StripeParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'balance'
		| 'charge'
		| 'coupon'
		| 'customer'
		| 'customerCard'
		| 'source'
		| 'token'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | '__CUSTOM_API_CALL__';
	/** Customer ID */
	customerId?: string;
	/** Card Token */
	token?: string;
	/** Card ID */
	cardId?: string;
	/** Source ID */
	sourceId?: string;
	/** Amount */
	amount?: number;
	/** Currency Name or ID */
	currency?: string;
	/** Source ID */
	source?: string;
	/** Charge ID */
	chargeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Apply */
	duration?: 'forever' | 'once';
	/** Discount Type */
	type?: 'fixedAmount' | 'percent';
	/** Amount Off */
	amountOff?: number;
	/** Percent Off */
	percentOff?: number;
	/** Name */
	name?: string;
	/** Card Number */
	number?: string;
	/** CVC */
	cvc?: string;
	/** Expiration Month */
	expirationMonth?: string;
	/** Expiration Year */
	expirationYear?: string;
}

export interface StripeTriggerParameters extends BaseNodeParams {
	/** Events */
	events?: unknown;
	/** API Version */
	apiVersion?: string;
}

export interface SupabaseParameters extends BaseNodeParams {
	/** Use Custom Schema */
	useCustomSchema?: boolean;
	/** Schema */
	schema?: string;
	/** Resource */
	resource?: 'row' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Table Name or ID */
	tableId?: string;
	/** Select Type */
	filterType?: 'manual' | 'string';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering" target="_blank">PostgREST guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (String) */
	filterString?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface SurveyMonkeyTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Type */
	objectType?: 'collector' | 'survey';
	/** Event */
	event?:
		| 'collector_created'
		| 'collector_deleted'
		| 'collector_updated'
		| 'response_completed'
		| 'response_created'
		| 'response_deleted'
		| 'response_disqualified'
		| 'response_overquota'
		| 'response_updated'
		| 'survey_created'
		| 'survey_deleted'
		| 'survey_updated';
	/** Survey Names or IDs */
	surveyIds?: unknown;
	/** Survey Name or ID */
	surveyId?: string;
	/** Collector Names or IDs */
	collectorIds?: unknown;
	/** Resolve Data */
	resolveData?: boolean;
	/** Only Answers */
	onlyAnswers?: boolean;
}

export interface Switch_v3_3Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'rules' | 'expression';
	/** Number of Outputs */
	numberOutputs?: number;
	/** Output Index */
	output?: number;
	/** Routing Rules */
	rules?: Record<string, unknown>;
	/** Convert types where required */
	looseTypeValidation?: boolean;
}

export interface Switch_v2Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'expression' | 'rules';
	/** Output */
	output?: string;
	/** Outputs Amount */
	outputsAmount?: number;
	/** Data Type */
	dataType?: 'boolean' | 'dateTime' | 'number' | 'string';
	/** Value 1 */
	value1?: boolean;
	/** Routing Rules */
	rules?: Record<string, unknown>;
	/** Fallback Output Name or ID */
	fallbackOutput?: string;
}

export interface Switch_v1Parameters extends BaseNodeParams {
	/** Mode */
	mode?: 'expression' | 'rules';
	/** Output */
	output?: number;
	/** Data Type */
	dataType?: 'boolean' | 'dateTime' | 'number' | 'string';
	/** Value 1 */
	value1?: boolean;
	/** Routing Rules */
	rules?: Record<string, unknown>;
	/** Fallback Output */
	fallbackOutput?: -1 | 0 | 1 | 2 | 3;
}

export interface SyncroMspParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'customer' | 'rmm' | 'ticket';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Cutomer ID */
	customerId?: string;
	/** Email */
	email?: string;
	/** Subject */
	subject?: string;
	/** Ticket ID */
	ticketId?: string;
	/** Contact ID */
	contactId?: string;
	/** RMM Alert ID */
	alertId?: string;
	/** Asset ID */
	assetId?: string;
	/** Description */
	description?: string;
	/** Mute Period */
	muteFor?: '1-hour' | '1-day' | '2-days' | '1-week' | '2-weeks' | '1-month' | 'forever';
}

export interface TaigaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'epic' | 'issue' | 'task' | 'userStory';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Project Name or ID */
	projectId?: string;
	/** Subject */
	subject?: string;
	/** Epic ID */
	epicId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Issue ID */
	issueId?: string;
	/** Task ID */
	taskId?: string;
	/** User Story ID */
	userStoryId?: string;
}

export interface TaigaTriggerParameters extends BaseNodeParams {
	/** Project Name or ID */
	projectId?: string;
	/** Resources */
	resources?: unknown;
	/** Operations */
	operations?: unknown;
}

export interface TapfiliateParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'affiliate' | 'affiliateMetadata' | 'programAffiliate';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll';
	/** Email */
	email?: string;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Affiliate ID */
	affiliateId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Metadata */
	metadataUi?: Record<string, unknown>;
	/** Key */
	key?: string;
	/** Value */
	value?: string;
	/** Program Name or ID */
	programId?: string;
}

export interface TelegramParameters extends BaseNodeParams {
	/** Interact with Telegram using our pre-built */
	preBuiltAgentsCalloutTelegram?: unknown;
	/** Resource */
	resource?: 'chat' | 'callback' | 'file' | 'message';
	/** Operation */
	operation?: 'get' | 'administrators' | 'member' | 'leave' | 'setDescription' | 'setTitle';
	/** Chat ID */
	chatId?: string;
	/** Message ID */
	messageId?: string;
	/** User ID */
	userId?: string;
	/** Description */
	description?: string;
	/** Title */
	title?: string;
	/** Query ID */
	queryId?: string;
	/** Results */
	results?: string;
	/** File ID */
	fileId?: string;
	/** Download */
	download?: boolean;
	/** Message Type */
	messageType?: 'inlineMessage' | 'message';
	/** Binary File */
	binaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Inline Message ID */
	inlineMessageId?: string;
	/** Reply Markup */
	replyMarkup?: 'none' | 'inlineKeyboard';
	/** Animation */
	file?: string;
	/** Action */
	action?:
		| 'find_location'
		| 'record_audio'
		| 'record_video'
		| 'record_video_note'
		| 'typing'
		| 'upload_audio'
		| 'upload_document'
		| 'upload_photo'
		| 'upload_video'
		| 'upload_video_note';
	/** Latitude */
	latitude?: number;
	/** Longitude */
	longitude?: number;
	/** Media */
	media?: Record<string, unknown>;
	/** Text */
	text?: string;
	/** Force Reply */
	forceReply?: Record<string, unknown>;
	/** Inline Keyboard */
	inlineKeyboard?: Record<string, unknown>;
	/** Reply Keyboard */
	replyKeyboard?: Record<string, unknown>;
	/** Reply Keyboard Options */
	replyKeyboardOptions?: Record<string, unknown>;
	/** Reply Keyboard Remove */
	replyKeyboardRemove?: Record<string, unknown>;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface TelegramTriggerParameters extends BaseNodeParams {
	/** Due to Telegram API limitations, you can use just one Telegram trigger for each bot at a time */
	telegramTriggerNotice?: unknown;
	/** Trigger On */
	updates?: unknown;
	/** Every uploaded attachment, even if sent in a group, will trigger a separate event. You can identify that an attachment belongs to a certain group by <code>media_group_id</code> . */
	attachmentNotice?: unknown;
}

export interface TheHiveProjectParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'alert'
		| 'case'
		| 'comment'
		| 'observable'
		| 'page'
		| 'query'
		| 'task'
		| 'log'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'deleteAlert'
		| 'executeResponder'
		| 'get'
		| 'merge'
		| 'promote'
		| 'search'
		| 'update'
		| 'status'
		| '__CUSTOM_API_CALL__';
	/** Fields */
	alertFields?: unknown;
	/** Observables */
	observableUi?: Record<string, unknown>;
	/** Alert */
	alertId?: unknown;
	/** Alert */
	id?: unknown;
	/** Responder Name or ID */
	responder?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Status Name or ID */
	status?: string;
	/** Case */
	caseId?: unknown;
	/** Fields */
	alertUpdateFields?: unknown;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
	/** Fields */
	caseFields?: unknown;
	/** Attachment Name or ID */
	attachmentId?: string;
	/** Fields */
	caseUpdateFields?: unknown;
	/** Add to */
	addTo?: 'alert' | 'case';
	/** Message */
	message?: string;
	/** Comment */
	commentId?: unknown;
	/** Search in */
	searchIn?: 'all' | 'alert' | 'case';
	/** Task Log */
	logId?: unknown;
	/** Task */
	taskId?: unknown;
	/** Fields */
	logFields?: unknown;
	/** Search in All Tasks */
	allTasks?: boolean;
	/** Create in */
	createIn?: 'case' | 'alert';
	/** Data Type */
	dataType?: string;
	/** Data */
	data?: string;
	/** Fields */
	observableFields?: unknown;
	/** Observable */
	observableId?: unknown;
	/** Analyzer Names or IDs */
	analyzers?: unknown;
	/** Fields */
	observableUpdateFields?: unknown;
	/** Create in */
	location?: 'case' | 'knowledgeBase';
	/** Title */
	title?: string;
	/** Category */
	category?: string;
	/** Content */
	content?: string;
	/** Page */
	pageId?: unknown;
	/** Search in Knowledge Base */
	searchInKnowledgeBase?: boolean;
	/** Query */
	queryJson?: string | object;
	/** Fields */
	taskFields?: unknown;
	/** Search in All Cases */
	allCases?: boolean;
	/** Fields */
	taskUpdateFields?: unknown;
}

export interface TheHiveProjectTriggerParameters extends BaseNodeParams {
	/** You must set up the webhook in TheHive — instructions <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.thehive5trigger/#configure-a-webhook-in-thehive" target="_blank">here</a> */
	notice?: unknown;
	/** Events */
	events?: unknown;
}

export interface TheHiveParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'alert' | 'case' | 'log' | 'observable' | 'task' | '__CUSTOM_API_CALL__';
	/** Operation Name or ID */
	operation?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Alert ID */
	id?: string;
	/** Case ID */
	caseId?: string;
	/** Title */
	title?: string;
	/** Description */
	description?: string;
	/** Severity */
	severity?: 1 | 2 | 3;
	/** Date */
	date?: string;
	/** Tags */
	tags?: string;
	/** TLP */
	tlp?: 0 | 1 | 2 | 3;
	/** Status */
	status?: 'New' | 'Updated' | 'Ignored' | 'Imported';
	/** Type */
	type?: string;
	/** Source */
	source?: string;
	/** SourceRef */
	sourceRef?: string;
	/** Follow */
	follow?: boolean;
	/** Artifacts */
	artifactUi?: Record<string, unknown>;
	/** Responder Name or ID */
	responder?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Data Type Name or ID */
	dataType?: string;
	/** Data */
	data?: string;
	/** Input Binary Field */
	binaryProperty?: string;
	/** Message */
	message?: string;
	/** Start Date */
	startDate?: string;
	/** IOC */
	ioc?: boolean;
	/** Sighted */
	sighted?: boolean;
	/** Analyzer Names or IDs */
	analyzers?: unknown;
	/** Owner */
	owner?: string;
	/** Flag */
	flag?: boolean;
	/** Task ID */
	taskId?: string;
}

export interface TheHiveTriggerParameters extends BaseNodeParams {
	/** You must set up the webhook in TheHive — instructions <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.thehivetrigger/#configure-a-webhook-in-thehive" target="_blank">here</a> */
	notice?: unknown;
	/** Events */
	events?: unknown;
}

export interface TimescaleDbParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Schema */
	schema?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface Todoist_v2_1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'task' | 'project' | 'section' | 'comment' | 'label' | 'reminder';
	/** Operation */
	operation?:
		| 'close'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'move'
		| 'quickAdd'
		| 'reopen'
		| 'update';
	/** Task ID */
	taskId?: string;
	/** Project Name or ID */
	project?: unknown;
	/** Section Name or ID */
	section?: string;
	/** Label Names */
	labels?: unknown;
	/** Content */
	content?: string;
	/** Text */
	text?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Project ID */
	projectId?: string;
	/** Name */
	name?: string;
	/** Additional Fields */
	projectOptions?: Record<string, unknown>;
	/** Update Fields */
	projectUpdateFields?: Record<string, unknown>;
	/** Section ID */
	sectionId?: string;
	/** Project Name or ID */
	sectionProject?: unknown;
	/** Name */
	sectionName?: string;
	/** Additional Fields */
	sectionOptions?: Record<string, unknown>;
	/** Update Fields */
	sectionUpdateFields?: Record<string, unknown>;
	/** Filters */
	sectionFilters?: Record<string, unknown>;
	/** Comment ID */
	commentId?: string;
	/** Task ID */
	commentTaskId?: string;
	/** Content */
	commentContent?: string;
	/** Update Fields */
	commentUpdateFields?: Record<string, unknown>;
	/** Filters */
	commentFilters?: Record<string, unknown>;
	/** Label ID */
	labelId?: string;
	/** Name */
	labelName?: string;
	/** Additional Fields */
	labelOptions?: Record<string, unknown>;
	/** Update Fields */
	labelUpdateFields?: Record<string, unknown>;
	/** Reminder ID */
	reminderId?: string;
	/** Task ID */
	itemId?: string;
	/** Due Date Type */
	dueDateType?: 'natural_language' | 'full_day' | 'floating_time' | 'fixed_timezone';
	/** Natural Language Representation */
	natural_language_representation?: string;
	/** Date */
	date?: string;
	/** Date Time */
	datetime?: string;
	/** Timezone */
	timezone?: string;
	/** Additional Fields */
	reminderOptions?: Record<string, unknown>;
	/** Update Fields */
	reminderUpdateFields?: Record<string, unknown>;
}

export interface Todoist_v1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'task';
	/** Operation */
	operation?: 'close' | 'create' | 'delete' | 'get' | 'getAll' | 'move' | 'reopen' | 'update';
	/** Task ID */
	taskId?: string;
	/** Project Name or ID */
	project?: unknown;
	/** Section Name or ID */
	section?: string;
	/** Label Names or IDs */
	labels?: unknown;
	/** Content */
	content?: string;
	/** Sync Commands */
	commands?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface TogglTriggerParameters extends BaseNodeParams {
	/** Poll Times */
	pollTimes?: Record<string, unknown>;
	/** Event */
	event?: 'newTimeEntry';
}

export interface TotpParameters extends BaseNodeParams {
	/** Operation */
	operation?: 'generateSecret';
}

export interface TravisCiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'build';
	/** Operation */
	operation?: 'cancel' | 'get' | 'getAll' | 'restart' | 'trigger';
	/** Build ID */
	buildId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Slug */
	slug?: string;
	/** Branch */
	branch?: string;
}

export interface TrelloParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'attachment'
		| 'board'
		| 'boardMember'
		| 'card'
		| 'cardComment'
		| 'checklist'
		| 'label'
		| 'list'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Card ID */
	cardId?: unknown;
	/** Source URL */
	url?: string;
	/** Attachment ID */
	id?: string;
	/** Name */
	name?: string;
	/** Description */
	description?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Member ID */
	idMember?: string;
	/** Type */
	type?: 'normal' | 'admin' | 'observer';
	/** Email */
	email?: string;
	/** List ID */
	listId?: string;
	/** Text */
	text?: string;
	/** Comment ID */
	commentId?: string;
	/** Checklist ID */
	checklistId?: string;
	/** CheckItem ID */
	checkItemId?: string;
	/** Board */
	boardId?: unknown;
	/** Color */
	color?:
		| 'black'
		| 'blue'
		| 'green'
		| 'lime'
		| 'null'
		| 'orange'
		| 'pink'
		| 'purple'
		| 'red'
		| 'sky'
		| 'yellow';
	/** Archive */
	archive?: boolean;
	/** Board ID */
	idBoard?: string;
}

export interface TrelloTriggerParameters extends BaseNodeParams {
	/** Model ID */
	id?: string;
}

export interface TwakeParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'message' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** Channel Name or ID */
	channelId?: string;
	/** Content */
	content?: string;
}

export interface TwilioParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'call' | 'sms' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** To Whatsapp */
	toWhatsapp?: boolean;
	/** Message */
	message?: string;
	/** Use TwiML */
	twiml?: boolean;
}

export interface TwilioTriggerParameters extends BaseNodeParams {
	/** Trigger On */
	updates?: unknown;
	/** The 'New Call' event may take up to thirty minutes to be triggered */
	callTriggerNotice?: unknown;
}

export interface TwistParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'channel' | 'comment' | 'messageConversation' | 'thread' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'archive'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'unarchive'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Name */
	name?: string;
	/** Channel ID */
	channelId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Thread ID */
	threadId?: string;
	/** Content */
	content?: string;
	/** Comment ID */
	commentId?: string;
	/** Conversation Name or ID */
	conversationId?: string;
	/** Message ID */
	id?: string;
	/** Title */
	title?: string;
}

export interface Twitter_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'directMessage' | 'list' | 'tweet' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** User */
	user?: unknown;
	/** Text */
	text?: string;
	/** List */
	list?: unknown;
	/** Locations are not supported due to Twitter V2 API limitations */
	noticeLocation?: unknown;
	/** Attachements are not supported due to Twitter V2 API limitations */
	noticeAttachments?: unknown;
	/** Tweet */
	tweetDeleteId?: unknown;
	/** Tweet */
	tweetId?: unknown;
	/** Search Term */
	searchText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Me */
	me?: boolean;
}

export interface Twitter_v1Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'directMessage' | 'tweet';
	/** Operation */
	operation?: 'create';
	/** User ID */
	userId?: string;
	/** Text */
	text?: string;
	/** Tweet ID */
	tweetId?: string;
	/** Search Text */
	searchText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface TypeformTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Form Name or ID */
	formId?: string;
	/** Simplify Answers */
	simplifyAnswers?: boolean;
	/** Only Answers */
	onlyAnswers?: boolean;
}

export interface UnleashedSoftwareParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'salesOrder' | 'stockOnHand';
	/** Operation */
	operation?: 'getAll';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Product ID */
	productId?: string;
}

export interface UpleadParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'company' | 'person';
	/** Operation */
	operation?: 'enrich';
	/** Company */
	company?: string;
	/** Domain */
	domain?: string;
	/** Email */
	email?: string;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
}

export interface UprocParameters extends BaseNodeParams {
	/** Resource */
	group?:
		| 'audio'
		| 'communication'
		| 'company'
		| 'finance'
		| 'geographic'
		| 'image'
		| 'internet'
		| 'personal'
		| 'product'
		| 'security'
		| 'text';
	/** Operation */
	tool?: 'getAudioAdvancedSpeechByText' | 'getAudioSpeechByText';
	/** Credit card */
	credit_card?: string;
	/** Address */
	address?: string;
	/** Country */
	country?: string;
	/** Coordinates */
	coordinates?: string;
	/** Date */
	date?: string;
	/** Years1 */
	years1?: number;
	/** Years2 */
	years2?: number;
	/** Years */
	years?: number;
	/** Ean */
	ean?: string;
	/** Asin */
	asin?: string;
	/** Text */
	text?: string;
	/** Gender */
	gender?: 'female' | 'male';
	/** Language */
	language?:
		| 'american'
		| 'arabic'
		| 'bengali'
		| 'british'
		| 'czech'
		| 'danish'
		| 'dutch'
		| 'filipino'
		| 'finnish'
		| 'french'
		| 'german'
		| 'greek'
		| 'gujurati'
		| 'hindi'
		| 'hungarian'
		| 'indonesian'
		| 'italian'
		| 'japanese'
		| 'kannada'
		| 'korean'
		| 'malayalam'
		| 'mandarin'
		| 'norwegian'
		| 'polish'
		| 'portuguese'
		| 'russian'
		| 'slovak'
		| 'spanish'
		| 'tamil'
		| 'telugu'
		| 'thai'
		| 'turkish'
		| 'ukranian'
		| 'vietnamese';
	/** Account */
	account?: string;
	/** Bic */
	bic?: string;
	/** Isocode */
	isocode?: string;
	/** Iban */
	iban?: string;
	/** Swift */
	swift?: string;
	/** Bcid */
	bcid?:
		| 'auspost'
		| 'azteccode'
		| 'azteccodecompact'
		| 'aztecrune'
		| 'bc412'
		| 'channelcode'
		| 'codablockf'
		| 'code11'
		| 'code128'
		| 'code16k'
		| 'code2of5'
		| 'code32'
		| 'code39'
		| 'code39ext'
		| 'code49'
		| 'code93'
		| 'code93ext'
		| 'codeone'
		| 'coop2of5'
		| 'daft'
		| 'databarexpanded'
		| 'databarexpandedcomposite'
		| 'databarexpandedstacked'
		| 'databarexpandedstackedcomposite'
		| 'databarlimited'
		| 'databarlimitedcomposite'
		| 'databaromni'
		| 'databaromnicomposite'
		| 'databarstacked'
		| 'databarstackedcomposite'
		| 'databarstackedomni'
		| 'databarstackedomnicomposite'
		| 'databartruncated'
		| 'databartruncatedcomposite'
		| 'datalogic2of5'
		| 'datamatrix'
		| 'datamatrixrectangular'
		| 'dotcode'
		| 'ean13'
		| 'ean13composite'
		| 'ean14'
		| 'ean2'
		| 'ean5'
		| 'ean8'
		| 'ean8composite'
		| 'flattermarken'
		| 'gs1-128'
		| 'gs1-128composite'
		| 'gs1-cc'
		| 'gs1datamatrix'
		| 'gs1datamatrixrectangular'
		| 'gs1northamericancoupon'
		| 'hanxin'
		| 'hibcazteccode'
		| 'hibccodablockf'
		| 'hibccode128'
		| 'hibccode39'
		| 'hibcdatamatrix'
		| 'hibcdatamatrixrectangular'
		| 'hibcmicropdf417'
		| 'hibcpdf417'
		| 'iata2of5'
		| 'identcode'
		| 'industrial2of5'
		| 'interleaved2of5'
		| 'isbn'
		| 'ismn'
		| 'issn'
		| 'itf14'
		| 'japanpost'
		| 'kix'
		| 'leitcode'
		| 'matrix2of5'
		| 'maxicode'
		| 'micropdf417'
		| 'msi'
		| 'onecode'
		| 'pdf417'
		| 'pdf417compact'
		| 'pharmacode'
		| 'pharmacode2'
		| 'planet'
		| 'plessey'
		| 'posicode'
		| 'postnet'
		| 'pzn'
		| 'rationalizedCodabar'
		| 'raw'
		| 'royalmail'
		| 'sscc18'
		| 'symbol'
		| 'telepen'
		| 'telepennumeric'
		| 'ultracode'
		| 'upca'
		| 'upcacomposite'
		| 'upce'
		| 'upcecomposite';
	/** Author */
	author?: string;
	/** Category */
	category?: string;
	/** Isbn */
	isbn?: string;
	/** Publisher */
	publisher?: string;
	/** Title */
	title?: string;
	/** Dni */
	dni?: string;
	/** Cif */
	cif?: string;
	/** Nie */
	nie?: string;
	/** Nif */
	nif?: string;
	/** Ip */
	ip?: string;
	/** City */
	city?: string;
	/** Phone */
	phone?: string;
	/** Zipcode */
	zipcode?: string;
	/** Upc */
	upc?: string;
	/** Isin */
	isin?: string;
	/** Number */
	number?: string;
	/** Uuid */
	uuid?: string;
	/** Domain */
	domain?: string;
	/** Duns */
	duns?: string;
	/** Email */
	email?: string;
	/** Name */
	name?: string;
	/** Url */
	url?: string;
	/** Profile */
	profile?: string;
	/** Role */
	role?: string;
	/** Taxid */
	taxid?: string;
	/** Company */
	company?: string;
	/** Area */
	area?:
		| 'Communications'
		| 'Consulting'
		| 'Customer service'
		| 'Education'
		| 'Engineering'
		| 'Finance'
		| 'Health professional'
		| 'Human resources'
		| 'Information technology'
		| 'Legal'
		| 'Marketing'
		| 'Operations'
		| 'Owner'
		| 'President'
		| 'Product'
		| 'Public relations'
		| 'Real estate'
		| 'Recruiting'
		| 'Research'
		| 'Sales';
	/** Clevel */
	clevel?: 'No' | 'Yes';
	/** Location */
	location?: string;
	/** Keyword */
	keyword?: string;
	/** Message */
	message?: string;
	/** Message1 */
	message1?: string;
	/** Message2 */
	message2?: string;
	/** Seniority */
	seniority?: 'Apprentice' | 'Director' | 'Executive' | 'Intermediate' | 'Manager';
	/** Address1 */
	address1?: string;
	/** Address2 */
	address2?: string;
	/** Fuel consumption */
	fuel_consumption?: string;
	/** Price liter */
	price_liter?: string;
	/** Coordinates1 */
	coordinates1?: string;
	/** Coordinates2 */
	coordinates2?: string;
	/** Ip1 */
	ip1?: string;
	/** Ip2 */
	ip2?: string;
	/** Phone1 */
	phone1?: string;
	/** Phone2 */
	phone2?: string;
	/** Zipcode1 */
	zipcode1?: string;
	/** Zipcode2 */
	zipcode2?: string;
	/** Distance */
	distance?: string;
	/** Coin */
	coin?:
		| '0x'
		| 'Aave Coin'
		| 'Algorand'
		| 'Aragon'
		| 'Augur'
		| 'AugurV2'
		| 'AuroraCoin'
		| 'BTU Protocol'
		| 'Bancor'
		| 'Bankex'
		| 'Basic Attention Token'
		| 'BeaverCoin'
		| 'BioCoin'
		| 'Bitcoin'
		| 'Bitcoin SV'
		| 'BitcoinCash'
		| 'BitcoinGold'
		| 'BitcoinPrivate'
		| 'BitcoinZ'
		| 'BlockTrade'
		| 'CUSD'
		| 'Callisto'
		| 'Cardano'
		| 'Chainlink'
		| 'Civic'
		| 'Compound'
		| 'Cred'
		| 'Crypto.com Coin'
		| 'Dash'
		| 'Decentraland'
		| 'Decred'
		| 'DigiByte'
		| 'District0x'
		| 'DogeCoin'
		| 'EOS'
		| 'Enjin Coin'
		| 'EtherZero'
		| 'Ethereum'
		| 'EthereumClassic'
		| 'Expanse'
		| 'FirmaChain'
		| 'FreiCoin'
		| 'GameCredits'
		| 'GarliCoin'
		| 'Gnosis'
		| 'Golem'
		| 'Golem (GNT)'
		| 'HedgeTrade'
		| 'Hush'
		| 'HyperSpace'
		| 'Komodo'
		| 'LBRY Credits'
		| 'Lisk'
		| 'LiteCoin'
		| 'Loom Network'
		| 'Maker'
		| 'Matchpool'
		| 'Matic'
		| 'MegaCoin'
		| 'Melon'
		| 'Metal'
		| 'MonaCoin'
		| 'Monero'
		| 'Multi-collateral DAI'
		| 'NameCoin'
		| 'Nano'
		| 'Nem'
		| 'Neo'
		| 'NeoGas'
		| 'Numeraire'
		| 'Ocean Protocol'
		| 'Odyssey'
		| 'OmiseGO'
		| 'PIVX'
		| 'Paxos'
		| 'PeerCoin'
		| 'Polkadot'
		| 'Polymath'
		| 'PrimeCoin'
		| 'ProtoShares'
		| 'Qtum'
		| 'Quant'
		| 'Quantum Resistant Ledger'
		| 'RaiBlocks'
		| 'Ripio Credit Network'
		| 'Ripple'
		| 'SOLVE'
		| 'Salt'
		| 'Serve'
		| 'Siacoin'
		| 'SnowGem'
		| 'SolarCoin'
		| 'Spendcoin'
		| 'Status'
		| 'Stellar'
		| 'Storj'
		| 'Storm'
		| 'StormX'
		| 'Swarm City'
		| 'Synthetix Network'
		| 'TEMCO'
		| 'Tap'
		| 'TenX'
		| 'Tether'
		| 'Tezos'
		| 'Tron'
		| 'TrueUSD'
		| 'USD Coin'
		| 'Uniswap Coin'
		| 'VeChain'
		| 'VertCoin'
		| 'Viberate'
		| 'VoteCoin'
		| 'Waves'
		| 'Wings'
		| 'ZCash'
		| 'ZClassic'
		| 'ZenCash'
		| 'iExec RLC'
		| 'loki';
	/** Country code */
	country_code?: string;
	/** Amount */
	amount?: string;
	/** Isocode1 */
	isocode1?:
		| 'AUD'
		| 'BGN'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HRK'
		| 'HUF'
		| 'IDR'
		| 'ILS'
		| 'INR'
		| 'ISK'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'MYR'
		| 'NOK'
		| 'NZD'
		| 'PHP'
		| 'PLN'
		| 'RON'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TRY'
		| 'USD'
		| 'ZAR';
	/** Isocode2 */
	isocode2?:
		| 'AUD'
		| 'BGN'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HRK'
		| 'HUF'
		| 'IDR'
		| 'ILS'
		| 'INR'
		| 'ISK'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'MYR'
		| 'NOK'
		| 'NZD'
		| 'PHP'
		| 'PLN'
		| 'RON'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TRY'
		| 'USD'
		| 'ZAR';
	/** Date1 */
	date1?: string;
	/** Date2 */
	date2?: string;
	/** Date3 */
	date3?: string;
	/** Period */
	period?: 'days' | 'hours' | 'minutes' | 'seconds';
	/** Useragent */
	useragent?: string;
	/** Type */
	type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT';
	/** Width */
	width?: '1024' | '160' | '320' | '640' | '800';
	/** Fullpage */
	fullpage?: 'no' | 'yes';
	/** Selector */
	selector?: string;
	/** Delay */
	delay?: string;
	/** Viewport */
	viewport?: string;
	/** Email from */
	email_from?: string;
	/** Email to */
	email_to?: string;
	/** Subject */
	subject?: string;
	/** Body */
	body?: string;
	/** Page */
	page?: number;
	/** Firstname */
	firstname?: string;
	/** Lastname */
	lastname?: string;
	/** Mode */
	mode?: 'guess' | 'only_verify' | 'verify';
	/** Fullname */
	fullname?: string;
	/** Mobile */
	mobile?: string;
	/** Url dlr */
	url_dlr?: string;
	/** Source */
	source?: string;
	/** Destination */
	destination?: string;
	/** Size */
	size?: string;
	/** List */
	list?: string;
	/** Keywords */
	keywords?: string;
	/** Current company */
	current_company?: string;
	/** Current title */
	current_title?: string;
	/** Included companies */
	included_companies?: string;
	/** Excluded companies */
	excluded_companies?: string;
	/** Included titles */
	included_titles?: string;
	/** Excluded titles */
	excluded_titles?: string;
	/** Included keywords */
	included_keywords?: string;
	/** Excluded keywords */
	excluded_keywords?: string;
	/** Length1 */
	length1?: number;
	/** Length2 */
	length2?: number;
	/** Length */
	length?: number;
	/** Separator */
	separator?: string;
	/** Latitude */
	latitude?: string;
	/** Longitude */
	longitude?: string;
	/** Radius */
	radius?: string;
	/** Imei */
	imei?: string;
	/** Regex */
	regex?: string;
	/** Host */
	host?: string;
	/** Port */
	port?: string;
	/** Table */
	table?: string;
	/** Number1 */
	number1?: string;
	/** Number2 */
	number2?: string;
	/** Number3 */
	number3?: string;
	/** Luhn */
	luhn?: string;
	/** Mod */
	mod?: string;
	/** Rest */
	rest?: string;
	/** Password */
	password?: string;
	/** Locality */
	locality?:
		| 'Australia (English)'
		| 'Australia Ocker (English)'
		| 'Azerbaijani'
		| 'Bork (English)'
		| 'Canada (English)'
		| 'Canada (French)'
		| 'Chinese'
		| 'Chinese (Taiwan)'
		| 'Czech'
		| 'Dutch'
		| 'English'
		| 'Farsi'
		| 'French'
		| 'Georgian'
		| 'German'
		| 'German (Austria)'
		| 'German (Switzerland)'
		| 'Great Britain (English)'
		| 'India (English)'
		| 'Indonesia'
		| 'Ireland (English)'
		| 'Italian'
		| 'Japanese'
		| 'Korean'
		| 'Nepalese'
		| 'Norwegian'
		| 'Polish'
		| 'Portuguese (Brazil)'
		| 'Russian'
		| 'Slovakian'
		| 'Spanish'
		| 'Spanish Mexico'
		| 'Swedish'
		| 'Turkish'
		| 'Ukrainian'
		| 'United States (English)'
		| 'Vietnamese';
	/** Surname */
	surname?: string;
	/** Province */
	province?: string;
	/** Format */
	format?: string;
	/** Text1 */
	text1?: string;
	/** Text2 */
	text2?: string;
	/** Glue */
	glue?: string;
	/** Field */
	field?:
		| 'alphabetic'
		| 'alphanumeric'
		| 'cif'
		| 'city'
		| 'country'
		| 'date'
		| 'decimal'
		| 'dni'
		| 'domain'
		| 'email'
		| 'gender'
		| 'integer'
		| 'ip'
		| 'mobile'
		| 'name'
		| 'nie'
		| 'nif'
		| 'phone'
		| 'province'
		| 'zipcode';
	/** Find */
	find?: string;
	/** Replace */
	replace?: string;
	/** Texts */
	texts?: string;
	/** Html */
	html?: string;
	/** Tin */
	tin?: string;
	/** Vin */
	vin?: string;
	/** Count1 */
	count1?: string;
	/** Count2 */
	count2?: string;
	/** Count */
	count?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
}

export interface UptimeRobotParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'account' | 'alertContact' | 'maintenanceWindow' | 'monitor' | 'publicStatusPage';
	/** Operation */
	operation?: 'get';
	/** Friendly Name */
	friendlyName?: string;
	/** Type */
	type?: 5 | 1 | 2 | 3 | 4;
	/** URL */
	url?: string;
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Value */
	value?: string;
	/** Duration (Minutes) */
	duration?: number;
	/** Week Day */
	weekDay?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	/** Month Day */
	monthDay?: number;
	/** Start Time */
	start_time?: string;
	/** Monitor IDs */
	monitors?: string;
}

export interface UrlScanIoParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'scan' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'perform' | '__CUSTOM_API_CALL__';
	/** Scan ID */
	scanId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** URL */
	url?: string;
}

export interface VeroParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'user' | 'event';
	/** Operation */
	operation?:
		| 'addTags'
		| 'alias'
		| 'create'
		| 'delete'
		| 'resubscribe'
		| 'removeTags'
		| 'unsubscribe';
	/** ID */
	id?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Data */
	dataAttributesUi?: Record<string, unknown>;
	/** Data */
	dataAttributesJson?: string | object;
	/** New ID */
	newId?: string;
	/** Tags */
	tags?: string;
	/** Email */
	email?: string;
	/** Event Name */
	eventName?: string;
	/** Extra */
	extraAttributesUi?: Record<string, unknown>;
	/** Extra */
	extraAttributesJson?: string | object;
}

export interface VenafiTlsProtectCloudParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'certificate' | 'certificateRequest' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'download' | 'get' | 'getMany' | 'renew' | '__CUSTOM_API_CALL__';
	/** Certificate ID */
	certificateId?: string;
	/** Download Item */
	downloadItem?: 'certificate' | 'keystore';
	/** Keystore Type */
	keystoreType?: 'JKS' | 'PKCS12' | 'PEM';
	/** Certificate Label */
	certificateLabel?: string;
	/** Private Key Passphrase */
	privateKeyPassphrase?: string;
	/** Keystore Passphrase */
	keystorePassphrase?: string;
	/** Input Data Field Name */
	binaryProperty?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Application Name or ID */
	applicationId?: string;
	/** Existing Certificate ID */
	existingCertificateId?: string;
	/** Certificate Issuing Template Name or ID */
	certificateIssuingTemplateId?: string;
	/** Certificate Signing Request */
	certificateSigningRequest?: string;
	/** Generate CSR */
	generateCsr?: boolean;
	/** Common Name */
	commonName?: string;
	/** Certificate Request ID */
	certificateRequestId?: string;
}

export interface VenafiTlsProtectCloudTriggerParameters extends BaseNodeParams {
	/** Resource */
	resource?: string;
	/** Trigger On */
	triggerOn?: unknown;
}

export interface VenafiTlsProtectDatacenterParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'certificate' | 'policy' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'delete'
		| 'download'
		| 'get'
		| 'getMany'
		| 'renew'
		| '__CUSTOM_API_CALL__';
	/** Policy DN */
	PolicyDN?: string;
	/** Subject */
	Subject?: string;
	/** Certificate DN */
	certificateDn?: string;
	/** Include Private Key */
	includePrivateKey?: boolean;
	/** Password */
	password?: string;
	/** Input Data Field Name */
	binaryProperty?: string;
	/** Certificate GUID */
	certificateId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Certificate DN */
	certificateDN?: string;
	/** Policy DN */
	policyDn?: string;
}

export interface VonageParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'sms';
	/** Operation */
	operation?: 'send';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
}

export interface WaitParameters extends BaseNodeParams {
	/** Resume */
	resume?: 'timeInterval' | 'specificTime' | 'webhook' | 'form';
	/** Authentication */
	incomingAuthentication?: 'basicAuth' | 'none';
	/** Date and Time */
	dateTime?: string;
	/** Wait Amount */
	amount?: number;
	/** Wait Unit */
	unit?: 'seconds' | 'minutes' | 'hours' | 'days';
	/** The webhook URL will be generated at run time. It can be referenced with the <strong>$execution.resumeUrl</strong> variable. Send it somewhere before getting to this node. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">More info</a> */
	webhookNotice?: unknown;
	/** The form url will be generated at run time. It can be referenced with the <strong>$execution.resumeFormUrl</strong> variable. Send it somewhere before getting to this node. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">More info</a> */
	formNotice?: unknown;
	/** Form Title */
	formTitle?: string;
	/** Form Description */
	formDescription?: string;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Respond When */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
	/** HTTP Method */
	httpMethod?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
	/** Response Code */
	responseCode?: number;
	/** Response Data */
	responseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
	/** Property Name */
	responseBinaryPropertyName?: string;
	/** Limit Wait Time */
	limitWaitTime?: boolean;
	/** Limit Type */
	limitType?: 'afterTimeInterval' | 'atSpecifiedTime';
	/** Amount */
	resumeAmount?: number;
	/** Unit */
	resumeUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
	/** Max Date and Time */
	maxDateAndTime?: string;
}

export interface Webflow_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'item';
	/** Operation */
	operation?: 'create' | 'deleteItem' | 'get' | 'getAll' | 'update';
	/** Site Name or ID */
	siteId?: string;
	/** Collection Name or ID */
	collectionId?: string;
	/** Live */
	live?: boolean;
	/** Fields */
	fieldsUi?: Record<string, unknown>;
	/** Item ID */
	itemId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface Webflow_v1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'item';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Site Name or ID */
	siteId?: string;
	/** Collection Name or ID */
	collectionId?: string;
	/** Live */
	live?: boolean;
	/** Fields */
	fieldsUi?: Record<string, unknown>;
	/** Item ID */
	itemId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface WebflowTrigger_v2Parameters extends BaseNodeParams {
	/** Site Name or ID */
	site?: string;
	/** Event */
	event?:
		| 'collection_item_created'
		| 'collection_item_deleted'
		| 'collection_item_changed'
		| 'ecomm_inventory_changed'
		| 'ecomm_new_order'
		| 'ecomm_order_changed'
		| 'form_submission'
		| 'site_publish';
}

export interface WebflowTrigger_v1Parameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Site Name or ID */
	site?: string;
	/** Event */
	event?:
		| 'collection_item_created'
		| 'collection_item_deleted'
		| 'collection_item_changed'
		| 'ecomm_inventory_changed'
		| 'ecomm_new_order'
		| 'ecomm_order_changed'
		| 'form_submission'
		| 'site_publish';
}

export interface WebhookParameters extends BaseNodeParams {
	/** Allow Multiple HTTP Methods */
	multipleMethods?: boolean;
	/** HTTP Method */
	httpMethod?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
	/** Path */
	path?: string;
	/** Authentication */
	authentication?: 'basicAuth' | 'headerAuth' | 'jwtAuth' | 'none';
	/** Respond */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
	/** Insert a 'Respond to Webhook' node to control when and how you respond. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details</a> */
	webhookNotice?: unknown;
	/** Insert a node that supports streaming (e.g. 'AI Agent') and enable streaming to stream directly to the response while the workflow is executed. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details</a> */
	webhookStreamingNotice?: unknown;
	/** Response Code */
	responseCode?: number;
	/** Response Data */
	responseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
	/** Property Name */
	responseBinaryPropertyName?: string;
	/** If you are sending back a response, add a "Content-Type" response header with the appropriate value to avoid unexpected behavior */
	contentTypeNotice?: unknown;
}

export interface WekanParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'board'
		| 'card'
		| 'cardComment'
		| 'checklist'
		| 'checklistItem'
		| 'list'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Owner Name or ID */
	owner?: string;
	/** Board ID */
	boardId?: string;
	/** User Name or ID */
	IdUser?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** List Name or ID */
	listId?: string;
	/** Swimlane Name or ID */
	swimlaneId?: string;
	/** Author Name or ID */
	authorId?: string;
	/** Card Name or ID */
	cardId?: string;
	/** From Object */
	fromObject?: 'list' | 'swimlane';
	/** Comment */
	comment?: string;
	/** Comment Name or ID */
	commentId?: string;
	/** Items */
	items?: string;
	/** Checklist Name or ID */
	checklistId?: string;
	/** Checklist Item Name or ID */
	checklistItemId?: string;
}

export interface WhatsAppTriggerParameters extends BaseNodeParams {
	/** Due to Facebook API limitations, you can use just one WhatsApp trigger for each Facebook App */
	whatsAppNotice?: unknown;
	/** Trigger On */
	updates?: unknown;
}

export interface WhatsAppParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'message' | 'media';
	/** Operation */
	operation?: 'send' | 'sendAndWait' | 'sendTemplate';
	/** Messaging Product */
	messagingProduct?: unknown;
	/** Sender Phone Number (or ID) */
	phoneNumberId?: string;
	/** Recipient's Phone Number */
	recipientPhoneNumber?: string;
	/** MessageType */
	messageType?: 'audio' | 'contacts' | 'document' | 'image' | 'location' | 'text' | 'video';
	/** Name */
	name?: Record<string, unknown>;
	/** Longitude */
	longitude?: number;
	/** Latitude */
	latitude?: number;
	/** Text Body */
	textBody?: string;
	/** Take Audio From */
	mediaPath?: 'useMediaLink' | 'useMediaId' | 'useMedian8n';
	/** Link */
	mediaLink?: string;
	/** ID */
	mediaId?: string;
	/** Input Data Field Name */
	mediaPropertyName?: string;
	/** Filename */
	mediaFilename?: string;
	/** Template */
	template?: string;
	/** Components */
	components?: Record<string, unknown>;
	/** Media ID */
	mediaGetId?: string;
	/** Media ID */
	mediaDeleteId?: string;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface WiseParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'account' | 'exchangeRate' | 'profile' | 'quote' | 'recipient' | 'transfer';
	/** Operation */
	operation?: 'getBalances' | 'getCurrencies' | 'getStatement';
	/** Profile Name or ID */
	profileId?: string;
	/** Borderless Account Name or ID */
	borderlessAccountId?: string;
	/** Currency */
	currency?: string;
	/** Format */
	format?: 'json' | 'csv' | 'pdf' | 'xml';
	/** Put Output File in Field */
	binaryProperty?: string;
	/** File Name */
	fileName?: string;
	/** Source Currency */
	source?: string;
	/** Target Currency */
	target?: string;
	/** Target Account Name or ID */
	targetAccountId?: string;
	/** Amount Type */
	amountType?: 'source' | 'target';
	/** Amount */
	amount?: number;
	/** Source Currency */
	sourceCurrency?: string;
	/** Target Currency */
	targetCurrency?: string;
	/** Quote ID */
	quoteId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Transfer ID */
	transferId?: string;
	/** Download Receipt */
	downloadReceipt?: boolean;
}

export interface WiseTriggerParameters extends BaseNodeParams {
	/** Profile Name or ID */
	profileId?: string;
	/** Event */
	event?: 'balanceCredit' | 'balanceUpdate' | 'transferActiveCases' | 'tranferStateChange';
}

export interface WooCommerceParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'customer' | 'order' | 'product' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** Customer ID */
	customerId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Dimensions */
	dimensionsUi?: Record<string, unknown>;
	/** Images */
	imagesUi?: Record<string, unknown>;
	/** Metadata */
	metadataUi?: Record<string, unknown>;
	/** Product ID */
	productId?: string;
	/** Billing */
	billingUi?: Record<string, unknown>;
	/** Coupon Lines */
	couponLinesUi?: Record<string, unknown>;
	/** Fee Lines */
	feeLinesUi?: Record<string, unknown>;
	/** Line Items */
	lineItemsUi?: Record<string, unknown>;
	/** Shipping */
	shippingUi?: Record<string, unknown>;
	/** Shipping Lines */
	shippingLinesUi?: Record<string, unknown>;
	/** Order ID */
	orderId?: string;
}

export interface WooCommerceTriggerParameters extends BaseNodeParams {
	/** Event */
	event?:
		| 'coupon.created'
		| 'coupon.deleted'
		| 'coupon.updated'
		| 'customer.created'
		| 'customer.deleted'
		| 'customer.updated'
		| 'order.created'
		| 'order.deleted'
		| 'order.updated'
		| 'product.created'
		| 'product.deleted'
		| 'product.updated';
}

export interface WordpressParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'post' | 'page' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Post ID */
	postId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Page ID */
	pageId?: string;
	/** Username */
	username?: string;
	/** Name */
	name?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Email */
	email?: string;
	/** Password */
	password?: string;
	/** User ID */
	userId?: string;
	/** Reassign */
	reassign?: string;
}

export interface WorkableTriggerParameters extends BaseNodeParams {
	/** Trigger On */
	triggerOn?: 'candidateCreated' | 'candidateMoved';
}

export interface WorkflowTriggerParameters extends BaseNodeParams {
	/** This node is deprecated and would not be updated in the future. Please use 'n8n Trigger' node instead. */
	oldVersionNotice?: unknown;
	/** Events */
	events?: unknown;
}

export interface WriteBinaryFileParameters extends BaseNodeParams {
	/** File Name */
	fileName?: string;
	/** Property Name */
	dataPropertyName?: string;
}

export interface WufooTriggerParameters extends BaseNodeParams {
	/** Forms Name or ID */
	form?: string;
	/** Only Answers */
	onlyAnswers?: boolean;
}

export interface XeroParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'contact' | 'invoice' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Organization Name or ID */
	organizationId?: string;
	/** Name */
	name?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Type */
	type?: 'ACCPAY' | 'ACCREC';
	/** Line Items */
	lineItemsUi?: Record<string, unknown>;
	/** Invoice ID */
	invoiceId?: string;
}

export interface XmlParameters extends BaseNodeParams {
	/** Mode */
	mode?: 'jsonToxml' | 'xmlToJson';
	/** If your XML is inside a binary file, use the 'Extract from File' node to convert it to text first */
	xmlNotice?: unknown;
	/** Property Name */
	dataPropertyName?: string;
}

export interface YourlsParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'url';
	/** Operation */
	operation?: 'expand' | 'shorten' | 'stats';
	/** URL */
	url?: string;
	/** Short URL */
	shortUrl?: string;
}

export interface ZammadParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'basicAuth' | 'tokenAuth';
	/** Resource */
	resource?: 'group' | 'organization' | 'ticket' | 'user';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Group Name */
	name?: string;
	/** Group ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Group Name or ID */
	group?: string;
	/** Customer Email Name or ID */
	customer?: string;
	/** Article */
	article?: Record<string, unknown>;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Query */
	query?: string;
}

export interface ZendeskParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'ticket' | 'ticketField' | 'user' | 'organization' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'recover' | 'update' | '__CUSTOM_API_CALL__';
	/** Description */
	description?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Ticket ID */
	id?: string;
	/** Update Fields */
	updateFieldsJson?: string | object;
	/** Ticket Type */
	ticketType?: 'regular' | 'suspended';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Ticket Field ID */
	ticketFieldId?: string;
	/** Name */
	name?: string;
}

export interface ZendeskTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Service */
	service?: 'support';
	/** Conditions */
	conditions?: Record<string, unknown>;
}

export interface ZohoCrmParameters extends BaseNodeParams {
	/** Resource */
	resource?:
		| 'account'
		| 'contact'
		| 'deal'
		| 'invoice'
		| 'lead'
		| 'product'
		| 'purchaseOrder'
		| 'quote'
		| 'salesOrder'
		| 'vendor'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'upsert' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Account Name */
	accountName?: string;
	/** Account ID */
	accountId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Last Name */
	lastName?: string;
	/** Contact ID */
	contactId?: string;
	/** Deal Name */
	dealName?: string;
	/** Stage Name or ID */
	stage?: string;
	/** Deal ID */
	dealId?: string;
	/** Subject */
	subject?: string;
	/** Products */
	Product_Details?: Record<string, unknown>;
	/** Invoice ID */
	invoiceId?: string;
	/** Company */
	Company?: string;
	/** Lead ID */
	leadId?: string;
	/** Product Name */
	productName?: string;
	/** Product ID */
	productId?: string;
	/** Vendor Name or ID */
	vendorId?: string;
	/** Purchase Order ID */
	purchaseOrderId?: string;
	/** Quote ID */
	quoteId?: string;
	/** Sales Order ID */
	salesOrderId?: string;
	/** Vendor Name */
	vendorName?: string;
}

export interface ZoomParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'meeting' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Topic */
	topic?: string;
	/** ID */
	meetingId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface ZulipParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'message' | 'stream' | 'user';
	/** Operation */
	operation?: 'delete' | 'get' | 'sendPrivate' | 'sendStream' | 'update' | 'updateFile';
	/** To */
	to?: unknown;
	/** Content */
	content?: string;
	/** Stream Name or ID */
	stream?: string;
	/** Topic Name or ID */
	topic?: string;
	/** Message ID */
	messageId?: string;
	/** Put Output File in Field */
	dataBinaryProperty?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Subscriptions */
	subscriptions?: Record<string, unknown>;
	/** Stream ID */
	streamId?: string;
	/** Email */
	email?: string;
	/** Full Name */
	fullName?: string;
	/** Password */
	password?: string;
	/** Short Name */
	shortName?: string;
	/** User ID */
	userId?: string;
}

export interface AggregateParameters extends BaseNodeParams {
	/** Aggregate */
	aggregate?: 'aggregateIndividualFields' | 'aggregateAllItemData';
	/** Fields To Aggregate */
	fieldsToAggregate?: Record<string, unknown>;
	/** Put Output in Field */
	destinationFieldName?: string;
	/** Include */
	include?: 'allFields' | 'specifiedFields' | 'allFieldsExcept';
	/** Fields To Exclude */
	fieldsToExclude?: string;
	/** Fields To Include */
	fieldsToInclude?: string;
}

export interface LimitParameters extends BaseNodeParams {
	/** Max Items */
	maxItems?: number;
	/** Keep */
	keep?: 'firstItems' | 'lastItems';
}

export interface RemoveDuplicates_v1_1Parameters extends BaseNodeParams {
	/** Compare */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields';
	/** Fields To Exclude */
	fieldsToExclude?: string;
	/** Fields To Compare */
	fieldsToCompare?: string;
}

export interface RemoveDuplicates_v2Parameters extends BaseNodeParams {
	/** Operation */
	operation?:
		| 'removeDuplicateInputItems'
		| 'removeItemsSeenInPreviousExecutions'
		| 'clearDeduplicationHistory';
	/** Compare */
	compare?: 'allFields' | 'allFieldsExcept' | 'selectedFields';
	/** Fields To Exclude */
	fieldsToExclude?: string;
	/** Fields To Compare */
	fieldsToCompare?: string;
	/** Keep Items Where */
	logic?:
		| 'removeItemsWithAlreadySeenKeyValues'
		| 'removeItemsUpToStoredIncrementalKey'
		| 'removeItemsUpToStoredDate';
	/** Value to Dedupe On */
	dedupeValue?: string;
	/** Value to Dedupe On */
	incrementalDedupeValue?: number;
	/** Value to Dedupe On */
	dateDedupeValue?: string;
	/** Mode */
	mode?: 'cleanDatabase';
}

export interface SplitOutParameters extends BaseNodeParams {
	/** Fields To Split Out */
	fieldToSplitOut?: string;
	/** Include */
	include?: 'noOtherFields' | 'allOtherFields' | 'selectedOtherFields';
	/** Fields To Include */
	fieldsToInclude?: string;
}

export interface SortParameters extends BaseNodeParams {
	/** Type */
	type?: 'simple' | 'random' | 'code';
	/** Fields To Sort By */
	sortFieldsUi?: Record<string, unknown>;
	/** Code */
	code?: string;
}

export interface SummarizeParameters extends BaseNodeParams {
	/** Fields to Summarize */
	fieldsToSummarize?: Record<string, unknown>;
	/** Fields to Split By */
	fieldsToSplitBy?: string;
}

export interface AnthropicParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'document' | 'file' | 'image' | 'prompt' | 'text' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | '__CUSTOM_API_CALL__';
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'url' | 'binary';
	/** URL(s) */
	documentUrls?: string;
	/** Input Data Field Name(s) */
	binaryPropertyName?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** File ID */
	fileId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** URL */
	fileUrl?: string;
	/** URL(s) */
	imageUrls?: string;
	/** The <a href="https://docs.anthropic.com/en/api/prompt-tools-generate">prompt tools APIs</a> are in a closed research preview. Your organization must request access to use them. */
	experimentalNotice?: unknown;
	/** Task */
	task?: string;
	/** Messages */
	messages?: Record<string, unknown>;
	/** Add Attachments */
	addAttachments?: boolean;
	/** Attachments Input Type */
	attachmentsInputType?: 'url' | 'binary';
	/** Attachment URL(s) */
	attachmentsUrls?: string;
}

export interface GoogleGeminiParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'audio' | 'document' | 'file' | 'image' | 'text' | 'video' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | 'transcribe' | '__CUSTOM_API_CALL__';
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'url' | 'binary';
	/** URL(s) */
	audioUrls?: string;
	/** Input Data Field Name(s) */
	binaryPropertyName?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** URL(s) */
	documentUrls?: string;
	/** URL */
	fileUrl?: string;
	/** URL(s) */
	imageUrls?: string;
	/** Prompt */
	prompt?: string;
	/** Images */
	images?: Record<string, unknown>;
	/** Messages */
	messages?: Record<string, unknown>;
	/** Output Content as JSON */
	jsonOutput?: boolean;
	/** URL(s) */
	videoUrls?: string;
	/** URL */
	url?: string;
	/** Return As */
	returnAs?: 'video' | 'url';
}

export interface OllamaParameters extends BaseNodeParams {
	/** Resource */
	resource?: 'image' | 'text' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | '__CUSTOM_API_CALL__';
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'binary' | 'url';
	/** Input Data Field Name(s) */
	binaryPropertyName?: string;
	/** URL(s) */
	imageUrls?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** Messages */
	messages?: Record<string, unknown>;
}

export interface OpenAi_v1_8Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'assistant' | 'text' | 'image' | 'audio' | 'file';
	/** Operation */
	operation?: 'create' | 'deleteAssistant' | 'list' | 'message' | 'update';
	/** Model */
	modelId?: unknown;
	/** Name */
	name?: string;
	/** Description */
	description?: string;
	/** Instructions */
	instructions?: string;
	/** Code Interpreter */
	codeInterpreter?: boolean;
	/** Knowledge Retrieval */
	knowledgeRetrieval?: boolean;
	/** Files */
	file_ids?: unknown;
	/** Add custom n8n tools when you <i>message</i> your assistant (rather than when creating it) */
	noticeTools?: unknown;
	/** Assistant */
	assistantId?: unknown;
	/** Source for Prompt (User Message) */
	prompt?: 'auto' | 'define';
	/** Prompt (User Message) */
	text?: string;
	/** Memory */
	memory?: 'connector' | 'threadId';
	/** Thread ID */
	threadId?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** OpenAI API limits the size of the audio file to 25 MB */
	fileSizeLimitNotice?: unknown;
	/** Model */
	model?: 'tts-1' | 'tts-1-hd';
	/** Text Input */
	input?: string;
	/** Voice */
	voice?: 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** File */
	fileId?: unknown;
	/** Input Type */
	inputType?: 'url' | 'base64';
	/** URL(s) */
	imageUrls?: string;
	/** Messages */
	messages?: Record<string, unknown>;
	/** Output Content as JSON */
	jsonOutput?: boolean;
	/** Hide Tools */
	hideTools?: unknown;
}

export interface OpenAi_v2Parameters extends BaseNodeParams {
	/** Resource */
	resource?: 'text' | 'image' | 'audio' | 'file' | 'conversation' | 'video';
	/** Operation */
	operation?: 'generate' | 'transcribe' | 'translate';
	/** OpenAI API limits the size of the audio file to 25 MB */
	fileSizeLimitNotice?: unknown;
	/** Model */
	model?: 'tts-1' | 'tts-1-hd';
	/** Text Input */
	input?: string;
	/** Voice */
	voice?: 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** File */
	fileId?: unknown;
	/** Prompt */
	prompt?: string;
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'url' | 'base64';
	/** URL(s) */
	imageUrls?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** Images */
	images?: Record<string, unknown>;
	/** Number of Images */
	n?: number;
	/** Size */
	size?: '256x256' | '512x512' | '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
	/** Quality */
	quality?: 'auto' | 'high' | 'medium' | 'low' | 'standard';
	/** Response Format */
	responseFormat?: 'url' | 'b64_json';
	/** Output Format */
	outputFormat?: 'png' | 'jpeg' | 'webp';
	/** Output Compression */
	outputCompression?: number;
	/** Messages */
	responses?: Record<string, unknown>;
	/** Hide Tools */
	hideTools?: unknown;
	/** Connect your own custom n8n tools to this node on the canvas */
	noticeTools?: unknown;
	/** Built-in Tools */
	builtInTools?: Record<string, unknown>;
	/** Messages */
	messages?: Record<string, unknown>;
	/** Conversation ID */
	conversationId?: string;
	/** Metadata */
	metadata?: string | object;
	/** Seconds */
	seconds?: number;
}

export interface Agent_v2_2Parameters extends BaseNodeParams {
	/** Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/workflows/templates/1954" target="_blank">example</a> of how this node works */
	aiAgentStarterCallout?: unknown;
	/** Get started faster with our */
	preBuiltAgentsCallout?: unknown;
	/** Source for Prompt (User Message) */
	promptType?: 'auto' | 'define';
	/** Prompt (User Message) */
	text?: string;
	/** Require Specific Output Format */
	hasOutputParser?: boolean;
	/** Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_outputParser'>output parser</a> on the canvas to specify the output format you require */
	notice?: unknown;
	/** Enable Fallback Model */
	needsFallback?: boolean;
	/** Connect an additional language model on the canvas to use it as a fallback if the main model fails */
	fallbackNotice?: unknown;
}

export interface Agent_v1_9Parameters extends BaseNodeParams {
	/** Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/templates/1954" target="_blank">example</a> of how this node works */
	aiAgentStarterCallout?: unknown;
	/** Get started faster with our */
	preBuiltAgentsCallout?: unknown;
	/** This node is using Agent that has been deprecated. Please switch to using 'Tools Agent' instead. */
	deprecated?: unknown;
	/** Agent */
	agent?:
		| 'conversationalAgent'
		| 'openAiFunctionsAgent'
		| 'planAndExecuteAgent'
		| 'reActAgent'
		| 'sqlAgent';
	/** Source for Prompt (User Message) */
	promptType?: 'auto' | 'define';
	/** Prompt (User Message) */
	text?: string;
	/** For more reliable structured output parsing, consider using the Tools agent */
	notice?: unknown;
	/** Require Specific Output Format */
	hasOutputParser?: boolean;
	/** Data Source */
	dataSource?: 'mysql' | 'postgres' | 'sqlite';
	/** Credentials */
	credentials?: unknown;
	/** Pass the SQLite database into this node as binary data, e.g. by inserting a 'Read/Write Files from Disk' node beforehand */
	sqLiteFileNotice?: unknown;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Prompt */
	input?: string;
}

export interface Agent_v3Parameters extends BaseNodeParams {
	/** Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/workflows/templates/1954" target="_blank">example</a> of how this node works */
	aiAgentStarterCallout?: unknown;
	/** Source for Prompt (User Message) */
	promptType?: 'auto' | 'define';
	/** Prompt (User Message) */
	text?: string;
	/** Require Specific Output Format */
	hasOutputParser?: boolean;
	/** Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_outputParser'>output parser</a> on the canvas to specify the output format you require */
	notice?: unknown;
	/** Enable Fallback Model */
	needsFallback?: boolean;
	/** Connect an additional language model on the canvas to use it as a fallback if the main model fails */
	fallbackNotice?: unknown;
}

export interface AgentToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Prompt (User Message) */
	text?: string;
	/** Require Specific Output Format */
	hasOutputParser?: boolean;
	/** Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_outputParser'>output parser</a> on the canvas to specify the output format you require */
	notice?: unknown;
	/** Enable Fallback Model */
	needsFallback?: boolean;
	/** Connect an additional language model on the canvas to use it as a fallback if the main model fails */
	fallbackNotice?: unknown;
}

export interface OpenAiAssistantParameters extends BaseNodeParams {
	/** Operation */
	mode?: 'new' | 'existing';
	/** Name */
	name?: string;
	/** Instructions */
	instructions?: string;
	/** Model */
	model?: string;
	/** Assistant */
	assistantId?: string;
	/** Text */
	text?: string;
	/** OpenAI Tools */
	nativeTools?: unknown;
	/** Connect your own custom tools to this node on the canvas */
	noticeTools?: unknown;
}

export interface ChainSummarization_v2_1Parameters extends BaseNodeParams {
	/** Save time with an <a href="/templates/1951" target="_blank">example</a> of how this node works */
	notice?: unknown;
	/** Data to Summarize */
	operationMode?: 'nodeInputJson' | 'nodeInputBinary' | 'documentLoader';
	/** Chunking Strategy */
	chunkingMode?: 'simple' | 'advanced';
	/** Characters Per Chunk */
	chunkSize?: number;
	/** Chunk Overlap (Characters) */
	chunkOverlap?: number;
}

export interface ChainSummarization_v1Parameters extends BaseNodeParams {
	/** Save time with an <a href="/templates/1951" target="_blank">example</a> of how this node works */
	notice?: unknown;
	/** Type */
	type?: 'map_reduce' | 'refine' | 'stuff';
}

export interface ChainLlmParameters extends BaseNodeParams {
	/** Save time with an <a href="/templates/1978" target="_blank">example</a> of how this node works */
	notice?: unknown;
	/** Prompt */
	prompt?: string;
	/** Source for Prompt (User Message) */
	promptType?: 'auto' | 'define';
	/** Prompt (User Message) */
	text?: string;
	/** Require Specific Output Format */
	hasOutputParser?: boolean;
	/** Enable Fallback Model */
	needsFallback?: boolean;
	/** Chat Messages (if Using a Chat Model) */
	messages?: Record<string, unknown>;
	/** Batch Processing */
	batching?: Record<string, unknown>;
	/** Connect an additional language model on the canvas to use it as a fallback if the main model fails */
	fallbackNotice?: unknown;
}

export interface ChainRetrievalQaParameters extends BaseNodeParams {
	/** Save time with an <a href="/templates/1960" target="_blank">example</a> of how this node works */
	notice?: unknown;
	/** Query */
	query?: string;
	/** Source for Prompt (User Message) */
	promptType?: 'auto' | 'define';
	/** Prompt (User Message) */
	text?: string;
}

export interface SentimentAnalysisParameters extends BaseNodeParams {
	/** Text to Analyze */
	inputText?: string;
	/** Sentiment scores are LLM-generated estimates, not statistically rigorous measurements. They may be inconsistent across runs and should be used as rough indicators only. */
	detailedResultsNotice?: unknown;
}

export interface InformationExtractorParameters extends BaseNodeParams {
	/** Text */
	text?: string;
	/** Schema Type */
	schemaType?: 'fromAttributes' | 'fromJson' | 'manual';
	/** JSON Example */
	jsonSchemaExample?: string | object;
	/** All properties will be required. To make them optional, use the 'JSON Schema' schema type instead */
	notice?: unknown;
	/** Input Schema */
	inputSchema?: string | object;
	/** Attributes */
	attributes?: Record<string, unknown>;
}

export interface TextClassifierParameters extends BaseNodeParams {
	/** Text to Classify */
	inputText?: string;
	/** Categories */
	categories?: Record<string, unknown>;
}

export interface Code_v1Parameters extends BaseNodeParams {
	/** Code */
	code?: Record<string, unknown>;
	/** You can import LangChain and use all available functionality. Debug by using <code>console.log()</code> statements and viewing their output in the browser console. */
	notice?: unknown;
	/** Inputs */
	inputs?: Record<string, unknown>;
	/** Outputs */
	outputs?: Record<string, unknown>;
}

export interface DocumentDefaultDataLoaderParameters extends BaseNodeParams {
	/** This will load data from a previous step in the workflow. <a href="/templates/1962" target="_blank">Example</a> */
	notice?: unknown;
	/** Type of Data */
	dataType?: 'json' | 'binary';
	/** Mode */
	jsonMode?: 'allInputData' | 'expressionData';
	/** Mode */
	binaryMode?: 'allInputData' | 'specificField';
	/** Data Format */
	loader?:
		| 'auto'
		| 'csvLoader'
		| 'docxLoader'
		| 'epubLoader'
		| 'jsonLoader'
		| 'pdfLoader'
		| 'textLoader';
	/** Data */
	jsonData?: string;
	/** Input Data Field Name */
	binaryDataKey?: string;
	/** Text Splitting */
	textSplittingMode?: 'simple' | 'custom';
}

export interface DocumentBinaryInputLoaderParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Loader Type */
	loader?: 'csvLoader' | 'docxLoader' | 'epubLoader' | 'jsonLoader' | 'pdfLoader' | 'textLoader';
	/** Binary Data Key */
	binaryDataKey?: string;
	/** Split Pages */
	splitPages?: boolean;
	/** Column */
	column?: string;
	/** Separator */
	separator?: string;
	/** Pointers */
	pointers?: string;
}

export interface DocumentGithubLoaderParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Repository Link */
	repository?: string;
	/** Branch */
	branch?: string;
	/** Text Splitting */
	textSplittingMode?: 'simple' | 'custom';
	/** Options */
	additionalOptions?: Record<string, unknown>;
}

export interface DocumentJsonInputLoaderParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Pointers */
	pointers?: string;
}

export interface EmbeddingsCohereParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	modelName?:
		| 'embed-english-light-v2.0'
		| 'embed-english-light-v3.0'
		| 'embed-english-v2.0'
		| 'embed-english-v3.0'
		| 'embed-multilingual-light-v3.0'
		| 'embed-multilingual-v2.0'
		| 'embed-multilingual-v3.0';
}

export interface EmbeddingsAwsBedrockParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface EmbeddingsAzureOpenAiParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model (Deployment) Name */
	model?: string;
}

export interface EmbeddingsGoogleGeminiParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	modelName?: string;
}

export interface EmbeddingsGoogleVertexParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Project ID */
	projectId?: unknown;
	/** Model Name */
	modelName?: string;
}

export interface EmbeddingsHuggingFaceInferenceParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model Name */
	modelName?: string;
}

export interface EmbeddingsMistralCloudParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface EmbeddingsOpenAiParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface EmbeddingsLemonadeParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface EmbeddingsOllamaParameters extends BaseNodeParams {
	/** This node must be connected to a vector store. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_vectorStore'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatAnthropicParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?:
		| 'claude-3-5-sonnet-20241022'
		| 'claude-3-opus-20240229'
		| 'claude-3-5-sonnet-20240620'
		| 'claude-3-sonnet-20240229'
		| 'claude-3-5-haiku-20241022'
		| 'claude-3-haiku-20240307'
		| 'claude-2'
		| 'claude-2.1'
		| 'claude-instant-1.2'
		| 'claude-instant-1';
}

export interface LmChatAzureOpenAiParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'azureOpenAiApi' | 'azureEntraCognitiveServicesOAuth2Api';
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model (Deployment) Name */
	model?: string;
}

export interface LmChatAwsBedrockParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model Source */
	modelSource?: 'onDemand' | 'inferenceProfile';
	/** Model */
	model?: string;
}

export interface LmChatCohereParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatDeepSeekParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatGoogleGeminiParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	modelName?: string;
}

export interface LmChatGoogleVertexParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Project ID */
	projectId?: unknown;
	/** Model Name */
	modelName?: string;
}

export interface LmChatGroqParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatMistralCloudParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatLemonadeParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatOllamaParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatOpenRouterParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatVercelAiGatewayParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatXAiGrokParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmChatOpenAiParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmOpenAiParameters extends BaseNodeParams {
	/** This node is using OpenAI completions which are now deprecated. Please use the OpenAI Chat Model node instead. */
	deprecated?: unknown;
	/** Model */
	model?: unknown;
	/** When using non OpenAI models via Base URL override, not all models might be chat-compatible or support other features, like tools calling or JSON response format. */
	notice?: unknown;
}

export interface LmCohereParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface LmLemonadeParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmOllamaParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface LmOpenHuggingFaceInferenceParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Model */
	model?: string;
}

export interface McpClientToolParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** SSE Endpoint */
	sseEndpoint?: string;
	/** Endpoint */
	endpointUrl?: string;
	/** Server Transport */
	serverTransport?: 'httpStreamable' | 'sse';
	/** Authentication */
	authentication?: 'bearerAuth' | 'headerAuth' | 'none';
	/** Credentials */
	credentials?: unknown;
	/** Tools to Include */
	include?: 'all' | 'selected' | 'except';
	/** Tools to Include */
	includeTools?: unknown;
	/** Tools to Exclude */
	excludeTools?: unknown;
}

export interface McpTriggerParameters extends BaseNodeParams {
	/** Authentication */
	authentication?: 'none' | 'bearerAuth' | 'headerAuth';
	/** Path */
	path?: string;
}

export interface MemoryBufferWindowParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Session Key */
	sessionKey?: string;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Context Window Length */
	contextWindowLength?: number;
}

export interface MemoryMotorheadParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Session ID */
	sessionId?: string;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Session Key From Previous Node */
	sessionKey?: string;
}

export interface MemoryPostgresChatParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Session Key From Previous Node */
	sessionKey?: string;
	/** Table Name */
	tableName?: string;
	/** Context Window Length */
	contextWindowLength?: number;
}

export interface MemoryMongoDbChatParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Session Key From Previous Node */
	sessionKey?: string;
	/** Collection Name */
	collectionName?: string;
	/** Database Name */
	databaseName?: string;
	/** Context Window Length */
	contextWindowLength?: number;
}

export interface MemoryRedisChatParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Session Key */
	sessionKey?: string;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Session Time To Live */
	sessionTTL?: number;
	/** Context Window Length */
	contextWindowLength?: number;
}

export interface MemoryManagerParameters extends BaseNodeParams {
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'delete';
	/** Insert Mode */
	insertMode?: 'insert' | 'override';
	/** Delete Mode */
	deleteMode?: 'lastN' | 'all';
	/** Chat Messages */
	messages?: Record<string, unknown>;
	/** Messages Count */
	lastMessagesCount?: number;
	/** Simplify Output */
	simplifyOutput?: boolean;
}

export interface MemoryChatRetrieverParameters extends BaseNodeParams {
	/** This node is deprecated. Use 'Chat Memory Manager' node instead. */
	deprecatedNotice?: unknown;
	/** Simplify Output */
	simplifyOutput?: boolean;
}

export interface MemoryXataParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Session ID */
	sessionId?: string;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Key */
	sessionKey?: string;
	/** Context Window Length */
	contextWindowLength?: number;
}

export interface MemoryZepParameters extends BaseNodeParams {
	/** This Zep integration is deprecated and will be removed in a future version. */
	deprecationNotice?: unknown;
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Only works with Zep Cloud and Community edition <= v0.27.2 */
	supportedVersions?: unknown;
	/** Session ID */
	sessionId?: string;
	/** Session ID */
	sessionIdType?: 'fromInput' | 'customKey';
	/** Session Key From Previous Node */
	sessionKey?: string;
}

export interface OutputParserAutofixingParameters extends BaseNodeParams {
	/** This node wraps another output parser. If the first one fails it calls an LLM to fix the format */
	info?: unknown;
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface OutputParserItemListParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface OutputParserStructuredParameters extends BaseNodeParams {
	/** This node must be connected to an AI chain. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Schema Type */
	schemaType?: 'fromJson' | 'manual';
	/** JSON Example */
	jsonSchemaExample?: string | object;
	/** Input Schema */
	inputSchema?: string | object;
	/** JSON Schema */
	jsonSchema?: string | object;
	/** Auto-Fix Format */
	autoFix?: boolean;
	/** Customize Retry Prompt */
	customizeRetryPrompt?: boolean;
	/** Custom Prompt */
	prompt?: string;
}

export interface RerankerCohereParameters extends BaseNodeParams {
	/** Model */
	modelName?: 'rerank-v3.5' | 'rerank-english-v3.0' | 'rerank-multilingual-v3.0';
	/** Top N */
	topN?: number;
}

export interface RetrieverVectorStoreParameters extends BaseNodeParams {
	/** Limit */
	topK?: number;
}

export type RetrieverMultiQueryParameters = BaseNodeParams;

export interface RetrieverWorkflowParameters extends BaseNodeParams {
	/** The workflow will receive "query" as input and the output of the last node will be returned and converted to Documents */
	executeNotice?: unknown;
	/** Source */
	source?: 'database' | 'parameter';
	/** Workflow ID */
	workflowId?: string;
	/** Workflow JSON */
	workflowJson?: string | object;
	/** Workflow Values */
	fields?: Record<string, unknown>;
}

export interface TextSplitterCharacterTextSplitterParameters extends BaseNodeParams {
	/** This node must be connected to a document loader. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_document'>Insert one</a> */
	notice?: unknown;
	/** Separator */
	separator?: string;
	/** Chunk Size */
	chunkSize?: number;
	/** Chunk Overlap */
	chunkOverlap?: number;
}

export interface TextSplitterRecursiveCharacterTextSplitterParameters extends BaseNodeParams {
	/** This node must be connected to a document loader. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_document'>Insert one</a> */
	notice?: unknown;
	/** Chunk Size */
	chunkSize?: number;
	/** Chunk Overlap */
	chunkOverlap?: number;
}

export interface TextSplitterTokenSplitterParameters extends BaseNodeParams {
	/** This node must be connected to a document loader. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_document'>Insert one</a> */
	notice?: unknown;
	/** Chunk Size */
	chunkSize?: number;
	/** Chunk Overlap */
	chunkOverlap?: number;
}

export interface ToolCalculatorParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface ToolCodeParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** See an example of a conversational agent with custom tool written in JavaScript <a href="/templates/1963" target="_blank">here</a>. */
	noticeTemplateExample?: unknown;
	/** Name */
	name?: string;
	/** Description */
	description?: string;
	/** Language */
	language?: 'javaScript' | 'python';
	/** JavaScript */
	jsCode?: string;
	/** Python */
	pythonCode?: string;
	/** Specify Input Schema */
	specifyInputSchema?: boolean;
	/** Schema Type */
	schemaType?: 'fromJson' | 'manual';
	/** JSON Example */
	jsonSchemaExample?: string | object;
	/** Input Schema */
	inputSchema?: string | object;
}

export interface ToolHttpRequestParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Description */
	toolDescription?: string;
	/** Method */
	method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
	/** Tip: You can use a {placeholder} for any part of the request to be filled by the model. Provide more context about them in the placeholders section */
	placeholderNotice?: unknown;
	/** URL */
	url?: string;
	/** Authentication */
	authentication?: 'none' | 'predefinedCredentialType' | 'genericCredentialType';
	/** Credential Type */
	nodeCredentialType?: unknown;
	/** Make sure you have specified the scope(s) for the Service Account in the credential */
	googleApiWarning?: unknown;
	/** Generic Auth Type */
	genericAuthType?: unknown;
	/** Send Query Parameters */
	sendQuery?: boolean;
	/** Specify Query Parameters */
	specifyQuery?: 'keypair' | 'json' | 'model';
	/** Query Parameters */
	parametersQuery?: Record<string, unknown>;
	/** JSON */
	jsonQuery?: string;
	/** Send Headers */
	sendHeaders?: boolean;
	/** Specify Headers */
	specifyHeaders?: 'keypair' | 'json' | 'model';
	/** Header Parameters */
	parametersHeaders?: Record<string, unknown>;
	/** JSON */
	jsonHeaders?: string;
	/** Send Body */
	sendBody?: boolean;
	/** Specify Body */
	specifyBody?: 'keypair' | 'json' | 'model';
	/** Body Parameters */
	parametersBody?: Record<string, unknown>;
	/** JSON */
	jsonBody?: string;
	/** Placeholder Definitions */
	placeholderDefinitions?: Record<string, unknown>;
	/** Optimize Response */
	optimizeResponse?: boolean;
	/** Expected Response Type */
	responseType?: 'json' | 'html' | 'text';
	/** Field Containing Data */
	dataField?: string;
	/** Include Fields */
	fieldsToInclude?: 'all' | 'selected' | 'except';
	/** Fields */
	fields?: string;
	/** Selector (CSS) */
	cssSelector?: string;
	/** Return Only Content */
	onlyContent?: boolean;
	/** Elements To Omit */
	elementsToOmit?: string;
	/** Truncate Response */
	truncateResponse?: boolean;
	/** Max Response Characters */
	maxLength?: number;
}

export interface ToolSearXngParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface ToolSerpApiParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface ToolThinkParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Think Tool Description */
	description?: string;
}

export interface ToolVectorStoreParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** Data Name */
	name?: string;
	/** Description of Data */
	description?: string;
	/** Limit */
	topK?: number;
}

export interface ToolWikipediaParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface ToolWolframAlphaParameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
}

export interface ToolWorkflow_v2_2Parameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** See an example of a workflow to suggest meeting slots using AI <a href="/templates/1953" target="_blank">here</a>. */
	noticeTemplateExample?: unknown;
	/** Name */
	name?: string;
	/** Description */
	description?: string;
	/** This tool will call the workflow you define below, and look in the last node for the response. The workflow needs to start with an Execute Workflow trigger */
	executeNotice?: unknown;
	/** Source */
	source?: 'database' | 'parameter';
	/** Workflow */
	workflowId?: unknown;
	/** Workflow Inputs */
	workflowInputs?: unknown;
	/** Workflow JSON */
	workflowJson?: string | object;
}

export interface ToolWorkflow_v1_3Parameters extends BaseNodeParams {
	/** This node must be connected to an AI agent. <a data-action='openSelectiveNodeCreator' data-action-parameter-creatorview='AI'>Insert one</a> */
	notice?: unknown;
	/** See an example of a workflow to suggest meeting slots using AI <a href="/templates/1953" target="_blank">here</a>. */
	noticeTemplateExample?: unknown;
	/** Name */
	name?: string;
	/** Description */
	description?: string;
	/** This tool will call the workflow you define below, and look in the last node for the response. The workflow needs to start with an Execute Workflow trigger */
	executeNotice?: unknown;
	/** Source */
	source?: 'database' | 'parameter';
	/** Workflow ID */
	workflowId?: string;
	/** Workflow JSON */
	workflowJson?: string | object;
	/** Field to Return */
	responsePropertyName?: string;
	/** Extra Workflow Inputs */
	fields?: Record<string, unknown>;
	/** Specify Input Schema */
	specifyInputSchema?: boolean;
	/** Schema Type */
	schemaType?: 'fromJson' | 'manual';
	/** JSON Example */
	jsonSchemaExample?: string | object;
	/** Input Schema */
	inputSchema?: string | object;
}

export interface ManualChatTriggerParameters extends BaseNodeParams {
	/** This node is where a manual chat workflow execution starts. To make one, go back to the canvas and click ‘Chat’ */
	notice?: unknown;
	/** Chat and execute workflow */
	openChat?: unknown;
}

export interface ChatTriggerParameters extends BaseNodeParams {
	/** Make Chat Publicly Available */
	public?: boolean;
	/** Mode */
	mode?: 'hostedChat' | 'webhook';
	/** Chat will be live at the URL above once you activate this workflow. Live executions will show up in the ‘executions’ tab */
	hostedChatNotice?: unknown;
	/** Follow the instructions <a href="https://www.npmjs.com/package/@n8n/chat" target="_blank">here</a> to embed chat in a webpage (or just call the webhook URL at the top of this section). Chat will be live once you activate this workflow */
	embeddedChatNotice?: unknown;
	/** Authentication */
	authentication?: 'basicAuth' | 'n8nUserAuth' | 'none';
	/** Initial Message(s) */
	initialMessages?: string;
}

export interface ChatParameters extends BaseNodeParams {
	/** Verify you're using a chat trigger with the 'Response Mode' option set to 'Using Response Nodes' */
	generalNotice?: unknown;
	/** Message */
	message?: string;
	/** Wait for User Reply */
	waitUserReply?: boolean;
}

export interface VectorStoreInMemoryParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Memory Key */
	memoryKey?: string;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Clear Store */
	clearStore?: boolean;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreInMemoryInsertParameters extends BaseNodeParams {
	/** The embbded data are stored in the server memory, so they will be lost when the server is restarted. Additionally, if the amount of data is too large, it may cause the server to crash due to insufficient memory. */
	notice?: unknown;
	/** Clear Store */
	clearStore?: boolean;
	/** Memory Key */
	memoryKey?: string;
}

export interface VectorStoreInMemoryLoadParameters extends BaseNodeParams {
	/** Memory Key */
	memoryKey?: string;
}

export interface VectorStoreMilvusParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Milvus Collection */
	milvusCollection?: unknown;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreMongoDBAtlasParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool' | 'update';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** MongoDB Collection */
	mongoCollection?: unknown;
	/** Embedding */
	embedding?: string;
	/** Metadata Field */
	metadata_field?: string;
	/** Vector Index Name */
	vectorIndexName?: string;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStorePGVectorParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Table Name */
	tableName?: string;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStorePineconeParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool' | 'update';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Pinecone Index */
	pineconeIndex?: unknown;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStorePineconeInsertParameters extends BaseNodeParams {
	/** Pinecone Index */
	pineconeIndex?: unknown;
	/** Pinecone Namespace */
	pineconeNamespace?: string;
	/** Specify the document to load in the document loader sub-node */
	notice?: unknown;
	/** Clear Namespace */
	clearNamespace?: boolean;
}

export interface VectorStorePineconeLoadParameters extends BaseNodeParams {
	/** Pinecone Index */
	pineconeIndex?: unknown;
	/** Pinecone Namespace */
	pineconeNamespace?: string;
}

export interface VectorStoreRedisParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool' | 'update';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Redis Index */
	redisIndex?: unknown;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreQdrantParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Qdrant Collection */
	qdrantCollection?: unknown;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreSupabaseParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool' | 'update';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Table Name */
	tableName?: unknown;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreSupabaseInsertParameters extends BaseNodeParams {
	/** Please refer to the <a href="https://supabase.com/docs/guides/ai/langchain" target="_blank">Supabase documentation</a> for more information on how to setup your database as a Vector Store. */
	setupNotice?: unknown;
	/** Table Name */
	tableName?: unknown;
	/** Query Name */
	queryName?: string;
	/** Specify the document to load in the document loader sub-node */
	notice?: unknown;
}

export interface VectorStoreSupabaseLoadParameters extends BaseNodeParams {
	/** Table Name */
	tableName?: unknown;
	/** Query Name */
	queryName?: string;
}

export interface VectorStoreWeaviateParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** Weaviate Collection */
	weaviateCollection?: unknown;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreZepParameters extends BaseNodeParams {
	/** Tip: Get a feel for vector stores in n8n with our */
	ragStarterCallout?: unknown;
	/** Operation Mode */
	mode?: 'load' | 'insert' | 'retrieve' | 'retrieve-as-tool';
	/** This node must be connected to a vector store retriever. <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_retriever'>Insert one</a> */
	notice?: unknown;
	/** Name */
	toolName?: string;
	/** Description */
	toolDescription?: string;
	/** This Zep integration is deprecated and will be removed in a future version. */
	deprecationNotice?: unknown;
	/** Collection Name */
	collectionName?: string;
	/** Embedding Batch Size */
	embeddingBatchSize?: number;
	/** Prompt */
	prompt?: string;
	/** Limit */
	topK?: number;
	/** Include Metadata */
	includeDocumentMetadata?: boolean;
	/** Rerank Results */
	useReranker?: boolean;
	/** ID */
	id?: string;
}

export interface VectorStoreZepInsertParameters extends BaseNodeParams {
	/** This Zep integration is deprecated and will be removed in a future version. */
	deprecationNotice?: unknown;
	/** Collection Name */
	collectionName?: string;
	/** Specify the document to load in the document loader sub-node */
	notice?: unknown;
}

export interface VectorStoreZepLoadParameters extends BaseNodeParams {
	/** This Zep integration is deprecated and will be removed in a future version. */
	deprecationNotice?: unknown;
	/** Collection Name */
	collectionName?: string;
}

export interface ToolExecutorParameters extends BaseNodeParams {
	/** Query */
	query?: string | object;
	/** Tool Name */
	toolName?: string;
}

export interface ModelSelectorParameters extends BaseNodeParams {
	/** Number of Inputs */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
	/** Rules */
	rules?: Record<string, unknown>;
}

export interface ActionNetworkToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'attendance'
		| 'event'
		| 'person'
		| 'personTag'
		| 'petition'
		| 'signature'
		| 'tag'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Person ID */
	personId?: string;
	/** Event ID */
	eventId?: string;
	/** Simplify */
	simple?: boolean;
	/** Attendance ID */
	attendanceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Origin System */
	originSystem?: string;
	/** Title */
	title?: string;
	/** Email Address */
	email_addresses?: Record<string, unknown>;
	/** Petition ID */
	petitionId?: string;
	/** Signature ID */
	signatureId?: string;
	/** Name */
	name?: string;
	/** Tag ID */
	tagId?: string;
	/** Tagging Name or ID */
	taggingId?: string;
}

export interface ActiveCampaignToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'account'
		| 'accountContact'
		| 'connection'
		| 'contact'
		| 'contactList'
		| 'contactTag'
		| 'deal'
		| 'ecommerceCustomer'
		| 'ecommerceOrder'
		| 'ecommerceOrderProducts'
		| 'list'
		| 'tag'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Type */
	tagType?: 'contact' | 'template';
	/** Name */
	name?: string;
	/** Tag ID */
	tagId?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
	/** Contact ID */
	contactId?: number;
	/** Contact Tag ID */
	contactTagId?: number;
	/** List ID */
	listId?: number;
	/** Account ID */
	accountId?: number;
	/** Account ID */
	account?: number;
	/** Contact ID */
	contact?: number;
	/** Account Contact ID */
	accountContactId?: number;
	/** Email */
	email?: string;
	/** Update if Exists */
	updateIfExists?: boolean;
	/** Title */
	title?: string;
	/** Deal Value */
	value?: number;
	/** Currency */
	currency?:
		| 'eur'
		| 'usd'
		| 'gbp'
		| 'chf'
		| 'cny'
		| ''
		| 'aed'
		| 'afn'
		| 'all'
		| 'amd'
		| 'ang'
		| 'aoa'
		| 'ars'
		| 'aud'
		| 'awg'
		| 'azn'
		| 'bam'
		| 'bbd'
		| 'bdt'
		| 'bgn'
		| 'bhd'
		| 'bif'
		| 'bmd'
		| 'bnd'
		| 'bob'
		| 'brl'
		| 'bsd'
		| 'btc'
		| 'btn'
		| 'bwp'
		| 'byn'
		| 'bzd'
		| 'cad'
		| 'cdf'
		| 'clf'
		| 'clp'
		| 'cnh'
		| 'cop'
		| 'crc'
		| 'cuc'
		| 'cup'
		| 'cve'
		| 'czk'
		| 'djf'
		| 'dkk'
		| 'dop'
		| 'dzd'
		| 'egp'
		| 'ern'
		| 'etb'
		| 'fjd'
		| 'fkp'
		| 'gel'
		| 'ggp'
		| 'ghs'
		| 'gip'
		| 'gmd'
		| 'gnf'
		| 'gtq'
		| 'gyd'
		| 'hkd'
		| 'hnl'
		| 'hrk'
		| 'htg'
		| 'huf'
		| 'idr'
		| 'ils'
		| 'imp'
		| 'inr'
		| 'iqd'
		| 'irr'
		| 'isk'
		| 'jep'
		| 'jmd'
		| 'jod'
		| 'jpy'
		| 'kes'
		| 'kgs'
		| 'khr'
		| 'kmf'
		| 'kpw'
		| 'krw'
		| 'kwd'
		| 'kyd'
		| 'kzt'
		| 'lak'
		| 'lbp'
		| 'lkr'
		| 'lrd'
		| 'lsl'
		| 'lyd'
		| 'mad'
		| 'mdl'
		| 'mga'
		| 'mkd'
		| 'mmk'
		| 'mnt'
		| 'mop'
		| 'mro'
		| 'mru'
		| 'mur'
		| 'mvr'
		| 'mwk'
		| 'mxn'
		| 'myr'
		| 'mzn'
		| 'nad'
		| 'ngn'
		| 'nio'
		| 'nok'
		| 'npr'
		| 'nzd'
		| 'omr'
		| 'pab'
		| 'pen'
		| 'pgk'
		| 'php'
		| 'pkr'
		| 'pln'
		| 'pyg'
		| 'qar'
		| 'ron'
		| 'rsd'
		| 'rub'
		| 'rwf'
		| 'sar'
		| 'sbd'
		| 'scr'
		| 'sdg'
		| 'sek'
		| 'sgd'
		| 'shp'
		| 'sll'
		| 'sos'
		| 'srd'
		| 'ssp'
		| 'std'
		| 'stn'
		| 'svc'
		| 'syp'
		| 'szl'
		| 'thb'
		| 'tjs'
		| 'tmt'
		| 'tnd'
		| 'top'
		| 'try'
		| 'ttd'
		| 'twd'
		| 'tzs'
		| 'uah'
		| 'ugx'
		| 'uyu'
		| 'uzs'
		| 'vef'
		| 'vnd'
		| 'vuv'
		| 'wst'
		| 'xaf'
		| 'xag'
		| 'xau'
		| 'xcd'
		| 'xdr'
		| 'xof'
		| 'xpd'
		| 'xpf'
		| 'xpt'
		| 'yer'
		| 'zar'
		| 'zmw'
		| 'zwl';
	/** Deal Pipeline ID */
	group?: string;
	/** Deal Stage ID */
	stage?: string;
	/** Deal Owner ID */
	owner?: string;
	/** Deal ID */
	dealId?: number;
	/** Deal Note */
	dealNote?: string;
	/** Deal Note ID */
	dealNoteId?: number;
	/** Service */
	service?: string;
	/** External Account ID */
	externalid?: string;
	/** Logo URL */
	logoUrl?: string;
	/** Link URL */
	linkUrl?: string;
	/** Connection ID */
	connectionId?: number;
	/** External Checkout ID */
	externalcheckoutid?: string;
	/** Order Source */
	source?: number;
	/** Total Price */
	totalPrice?: number;
	/** Connection ID */
	connectionid?: number;
	/** Customer ID */
	customerid?: number;
	/** Creation Date */
	externalCreatedDate?: string;
	/** Abandoning Date */
	abandonedDate?: string;
	/** Products */
	orderProducts?: Record<string, unknown>;
	/** Order ID */
	orderId?: number;
	/** Customer ID */
	ecommerceCustomerId?: number;
	/** Product ID */
	procuctId?: number;
}

export interface AdaloToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'collection' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Collection ID */
	collectionId?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface AffinityToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'list' | 'listEntry' | 'organization' | 'person';
	/** Operation */
	operation?: 'get' | 'getAll';
	/** List ID */
	listId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Entity ID */
	entityId?: string;
	/** List Entry ID */
	listEntryId?: string;
	/** Name */
	name?: string;
	/** Domain */
	domain?: string;
	/** Organization ID */
	organizationId?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Emails */
	emails?: string;
	/** Person ID */
	personId?: string;
}

export interface AgileCrmToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'company' | 'contact' | 'deal';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** Simplify */
	simple?: boolean;
	/** See <a href="https://github.com/agilecrm/rest-api#121-get-contacts-by-dynamic-filter" target="_blank">Agile CRM guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Company ID */
	companyId?: string;
	/** Deal ID */
	dealId?: string;
	/** Close Date */
	closeDate?: string;
	/** Expected Value */
	expectedValue?: number;
	/** Milestone */
	milestone?: string;
	/** Name */
	name?: string;
	/** Probability */
	probability?: number;
}

export interface AirtableToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'airtableTokenApi' | 'airtableOAuth2Api';
	/** Resource */
	resource?: 'base' | 'record';
	/** Operation */
	operation?: 'create' | 'upsert' | 'deleteRecord' | 'get' | 'search' | 'update';
	/** Base */
	base?: unknown;
	/** Table */
	table?: unknown;
	/** Columns */
	columns?: unknown;
	/** Record ID */
	id?: string;
	/** Filter By Formula */
	filterByFormula?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
}

export interface AirtopToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'extraction' | 'file' | 'interaction' | 'session' | 'window';
	/** Operation */
	operation?: 'create' | 'save' | 'terminate' | 'waitForDownload';
	/** Profile Name */
	profileName?: string;
	/** Save Profile */
	saveProfileOnTermination?: boolean;
	/** Idle Timeout */
	timeoutMinutes?: number;
	/** Proxy */
	proxy?: 'none' | 'integrated' | 'proxyUrl';
	/** Proxy Configuration */
	proxyConfig?: Record<string, unknown>;
	/** Proxy URL */
	proxyUrl?: string;
	/** Note: This operation is not needed if you enabled 'Save Profile' in the 'Create Session' operation */
	notice?: unknown;
	/** Session ID */
	sessionId?: string;
	/** Window ID */
	windowId?: string;
	/** URL */
	url?: string;
	/** Get Live View */
	getLiveView?: boolean;
	/** Include Navigation Bar */
	includeNavigationBar?: boolean;
	/** Screen Resolution */
	screenResolution?: string;
	/** Disable Resize */
	disableResize?: boolean;
	/** Output Binary Image */
	outputImageAsBinary?: boolean;
	/** File ID */
	fileId?: string;
	/** Output Binary File */
	outputBinaryFile?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Session IDs */
	sessionIds?: string;
	/** Output Files in Single Item */
	outputSingleItem?: boolean;
	/** Element Description */
	elementDescription?: string;
	/** Include Hidden Elements */
	includeHiddenElements?: boolean;
	/** File Name */
	fileName?: string;
	/** File Type */
	fileType?: 'browser_download' | 'screenshot' | 'video' | 'customer_upload';
	/** Source */
	source?: 'url' | 'binary';
	/** Binary Property */
	binaryPropertyName?: string;
	/** Trigger File Input */
	triggerFileInputParameter?: boolean;
	/** Session Mode */
	sessionMode?: 'new' | 'existing';
	/** Auto-Terminate Session */
	autoTerminateSession?: boolean;
	/** Prompt */
	prompt?: string;
	/** Click Type */
	clickType?: 'click' | 'doubleClick' | 'rightClick';
	/** Form Data */
	formData?: string;
	/** Scroll Mode */
	scrollingMode?: 'automatic' | 'manual';
	/** Element Description */
	scrollToElement?: string;
	/** Scroll To Edge */
	scrollToEdge?: Record<string, unknown>;
	/** Scroll By */
	scrollBy?: Record<string, unknown>;
	/** Scrollable Area */
	scrollWithin?: string;
	/** Text */
	text?: string;
	/** Press Enter Key */
	pressEnterKey?: boolean;
}

export interface AmqpToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Queue / Topic */
	sink?: string;
	/** Headers */
	headerParametersJson?: string | object;
}

export interface ApiTemplateIoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'account' | 'image' | 'pdf' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Template Name or ID */
	imageTemplateId?: string;
	/** Template Name or ID */
	pdfTemplateId?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
	/** Overrides (JSON) */
	overridesJson?: string | object;
	/** Properties (JSON) */
	propertiesJson?: string | object;
	/** Overrides */
	overridesUi?: Record<string, unknown>;
	/** Properties */
	propertiesUi?: Record<string, unknown>;
}

export interface AsanaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'project'
		| 'subtask'
		| 'task'
		| 'taskComment'
		| 'taskProject'
		| 'taskTag'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Parent Task ID */
	taskId?: string;
	/** Name */
	name?: string;
	/** Additional Fields */
	otherProperties?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Workspace Name or ID */
	workspace?: string;
	/** Task ID */
	id?: string;
	/** Project Name or ID */
	projectId?: string;
	/** Section Name or ID */
	section?: string;
	/** Filters */
	searchTaskProperties?: Record<string, unknown>;
	/** Is Text HTML */
	isTextHtml?: boolean;
	/** Text */
	text?: string;
	/** Project Name or ID */
	project?: string;
	/** Tags Name or ID */
	tag?: string;
	/** User ID */
	userId?: string;
	/** Team Name or ID */
	team?: string;
}

export interface AutopilotToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'contactJourney' | 'contactList' | 'list';
	/** Operation */
	operation?: 'upsert' | 'delete' | 'get' | 'getAll';
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Trigger Name or ID */
	triggerId?: string;
	/** List Name or ID */
	listId?: string;
	/** Name */
	name?: string;
}

export interface AwsLambdaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'invoke' | '__CUSTOM_API_CALL__';
	/** Function Name or ID */
	function?: string;
	/** Qualifier */
	qualifier?: string;
	/** Invocation Type */
	invocationType?: 'RequestResponse' | 'Event';
	/** JSON Input */
	payload?: string;
}

export interface AwsSnsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'create' | 'delete' | 'publish' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Topic */
	topic?: unknown;
	/** Subject */
	subject?: string;
	/** Message */
	message?: string;
}

export interface AwsS3ToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'bucket' | 'file' | 'folder' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'search' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Bucket Name */
	bucketName?: string;
	/** Folder Name */
	folderName?: string;
	/** Folder Key */
	folderKey?: string;
	/** Source Path */
	sourcePath?: string;
	/** Destination Path */
	destinationPath?: string;
	/** File Name */
	fileName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** File Key */
	fileKey?: string;
}

export interface AwsSesToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'customVerificationEmail' | 'email' | 'template' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'send' | 'update' | '__CUSTOM_API_CALL__';
	/** From Email */
	fromEmailAddress?: string;
	/** Template Name */
	templateName?: string;
	/** Template Content */
	templateContent?: string;
	/** Template Subject */
	templateSubject?: string;
	/** Success Redirection URL */
	successRedirectionURL?: string;
	/** Failure Redirection URL */
	failureRedirectionURL?: string;
	/** Email */
	email?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Is Body HTML */
	isBodyHtml?: boolean;
	/** Subject */
	subject?: string;
	/** Body */
	body?: string;
	/** From Email */
	fromEmail?: string;
	/** To Addresses */
	toAddresses?: string;
	/** Template Data */
	templateDataUi?: Record<string, unknown>;
	/** Subject Part */
	subjectPart?: string;
	/** Html Part */
	htmlPart?: string;
}

export interface AwsTextractToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'analyzeExpense' | '__CUSTOM_API_CALL__';
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** Simplify */
	simple?: boolean;
}

export interface AwsTranscribeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'transcriptionJob' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Job Name */
	transcriptionJobName?: string;
	/** Media File URI */
	mediaFileUri?: string;
	/** Detect Language */
	detectLanguage?: boolean;
	/** Language */
	languageCode?: 'en-US' | 'en-GB' | 'de-DE' | 'en-IN' | 'en-IE' | 'ru-RU' | 'es-ES';
	/** Return Transcript */
	returnTranscript?: boolean;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface BambooHrToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'companyReport' | 'employee' | 'employeeDocument' | 'file';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** Synced with Trax Payroll */
	synced?: boolean;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Address */
	address?: Record<string, unknown>;
	/** Date of Birth */
	dateOfBirth?: string;
	/** Department Name or ID */
	department?: string;
	/** Division Name or ID */
	division?: string;
	/** Employee Number */
	employeeNumber?: string;
	/** FLSA Overtime Status */
	exempt?: 'exempt' | 'non-exempt';
	/** Gender */
	gender?: 'female' | 'male';
	/** Hire Date */
	hireDate?: string;
	/** Location Name or ID */
	location?: string;
	/** Marital Status */
	maritalStatus?: 'single' | 'married' | 'domesticPartnership';
	/** Mobile Phone */
	mobilePhone?: string;
	/** Pay Per */
	paidPer?: 'hour' | 'day' | 'week' | 'month' | 'quater' | 'year';
	/** Pay Rate */
	payRate?: Record<string, unknown>;
	/** Pay Type */
	payType?:
		| 'commission'
		| 'contract'
		| 'daily'
		| 'exceptionHourly'
		| 'hourly'
		| 'monthly'
		| 'pieceRate'
		| 'proRata'
		| 'salary'
		| 'weekly';
	/** Preferred Name */
	preferredName?: string;
	/** Social Security Number */
	ssn?: string;
	/** Employee ID */
	employeeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Address */
	addasasress?: Record<string, unknown>;
	/** File ID */
	fileId?: string;
	/** Put Output In Field */
	output?: string;
	/** Simplify */
	simplifyOutput?: boolean;
	/** Employee Document Category ID */
	categoryId?: string;
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** Report ID */
	reportId?: string;
	/** Format */
	format?: 'CSV' | 'JSON' | 'PDF' | 'XLS' | 'XML';
}

export interface BaserowToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'row';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Database Name or ID */
	databaseId?: string;
	/** Table Name or ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Options */
	additionalOptions?: Record<string, unknown>;
}

export interface BeeminderToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'charge' | 'datapoint' | 'goal' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Goal Name or ID */
	goalName?: string;
	/** Amount */
	amount?: number;
	/** Datapoints */
	datapoints?: string | object;
	/** Goal Slug */
	slug?: string;
	/** Goal Title */
	title?: string;
	/** Goal Type */
	goal_type?: 'hustler' | 'biker' | 'fatloser' | 'gainer' | 'inboxer' | 'drinker' | 'custom';
	/** Goal Units */
	gunits?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Value */
	value?: number;
	/** Datapoint ID */
	datapointId?: string;
}

export interface BitlyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'link' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'update' | '__CUSTOM_API_CALL__';
	/** Long URL */
	longUrl?: string;
	/** Deeplinks */
	deeplink?: Record<string, unknown>;
	/** Bitlink */
	id?: string;
}

export interface BitwardenToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'collection' | 'event' | 'group' | 'member';
	/** Operation */
	operation?: 'delete' | 'get' | 'getAll' | 'update';
	/** Collection ID */
	collectionId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Group ID */
	groupId?: string;
	/** Name */
	name?: string;
	/** Access All */
	accessAll?: boolean;
	/** Member IDs */
	memberIds?: string;
	/** Member ID */
	memberId?: string;
	/** Type */
	type?: 0 | 1 | 2 | 3;
	/** Email */
	email?: string;
	/** Group IDs */
	groupIds?: string;
}

export interface BrandfetchToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'color' | 'company' | 'font' | 'industry' | 'logo' | '__CUSTOM_API_CALL__';
	/** Domain */
	domain?: string;
	/** Download */
	download?: boolean;
	/** Image Type */
	imageTypes?: unknown;
	/** Image Format */
	imageFormats?: unknown;
}

export interface BubbleToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'object';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Type Name */
	typeName?: string;
	/** Properties */
	properties?: Record<string, unknown>;
	/** Object ID */
	objectId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
}

export interface ChargebeeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'customer' | 'invoice' | 'subscription';
	/** Operation */
	operation?: 'create';
	/** Properties */
	properties?: Record<string, unknown>;
	/** Max Results */
	maxResults?: number;
	/** Invoice ID */
	invoiceId?: string;
	/** Subscription ID */
	subscriptionId?: string;
	/** Schedule End of Term */
	endOfTerm?: boolean;
}

export interface CircleCiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'pipeline';
	/** Operation */
	operation?: 'get' | 'getAll' | 'trigger';
	/** Provider */
	vcs?: 'bitbucket' | 'github';
	/** Project Slug */
	projectSlug?: string;
	/** Pipeline Number */
	pipelineNumber?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface CiscoWebexToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'meeting' | 'message' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Start */
	start?: string;
	/** End */
	end?: string;
	/** Meeting ID */
	meetingId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Destination */
	destination?: 'room' | 'person';
	/** Room Name or ID */
	roomId?: string;
	/** Specify Person By */
	specifyPersonBy?: 'email' | 'id';
	/** Person ID */
	toPersonId?: string;
	/** Person Email */
	toPersonEmail?: string;
	/** Text */
	text?: string;
	/** Message ID */
	messageId?: string;
	/** Is Markdown */
	markdown?: boolean;
	/** Markdown */
	markdownText?: string;
}

export interface CloudflareToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'zoneCertificate' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getMany' | 'upload' | '__CUSTOM_API_CALL__';
	/** Zone Name or ID */
	zoneId?: string;
	/** Certificate Content */
	certificate?: string;
	/** Private Key */
	privateKey?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Certificate ID */
	certificateId?: string;
}

export interface ClearbitToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'company' | 'person';
	/** Operation */
	operation?: 'autocomplete' | 'enrich';
	/** Domain */
	domain?: string;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
}

export interface ClickUpToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'checklist'
		| 'checklistItem'
		| 'comment'
		| 'folder'
		| 'goal'
		| 'goalKeyResult'
		| 'list'
		| 'spaceTag'
		| 'task'
		| 'taskDependency'
		| 'taskList'
		| 'taskTag'
		| 'timeEntry'
		| 'timeEntryTag'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'update' | '__CUSTOM_API_CALL__';
	/** Task ID */
	task?: string;
	/** Name */
	name?: string;
	/** Checklist ID */
	checklist?: string;
	/** Checklist Item ID */
	checklistItem?: string;
	/** Comment On */
	commentOn?: 'list' | 'task' | 'view';
	/** ID */
	id?: string;
	/** Comment Text */
	commentText?: string;
	/** Comment ID */
	comment?: string;
	/** Comments On */
	commentsOn?: 'list' | 'task' | 'view';
	/** Limit */
	limit?: number;
	/** Team Name or ID */
	team?: string;
	/** Space Name or ID */
	space?: string;
	/** Folder Name or ID */
	folder?: string;
	/** Goal ID */
	goal?: string;
	/** Type */
	type?: 'automatic' | 'boolean' | 'currency' | 'number' | 'percentage';
	/** Key Result ID */
	keyResult?: string;
	/** Task ID */
	taskId?: string;
	/** Tag Name */
	tagName?: string;
	/** List ID */
	listId?: string;
	/** New Name */
	newName?: string;
	/** Foreground Color */
	foregroundColor?: unknown;
	/** Background Color */
	backgroundColor?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Folderless List */
	folderless?: boolean;
	/** List Name or ID */
	list?: string;
	/** Include Subtasks */
	includeSubtasks?: boolean;
	/** Include Markdown Description */
	includeMarkdownDescription?: boolean;
	/** Field ID */
	field?: string;
	/** Value Is JSON */
	jsonParse?: boolean;
	/** Value */
	value?: string;
	/** Depends On Task ID */
	dependsOnTask?: string;
	/** Running */
	running?: boolean;
	/** Time Entry ID */
	timeEntry?: string;
	/** Start */
	start?: string;
	/** Duration (Minutes) */
	duration?: number;
	/** Archived */
	archived?: boolean;
	/** Time Entry IDs */
	timeEntryIds?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** Tag Names or IDs */
	tagNames?: unknown;
}

export interface ClockifyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'client'
		| 'project'
		| 'tag'
		| 'task'
		| 'timeEntry'
		| 'user'
		| 'workspace'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Client Name */
	name?: string;
	/** Client ID */
	clientId?: string;
	/** Project ID */
	projectId?: string;
	/** Tag ID */
	tagId?: string;
	/** Task ID */
	taskId?: string;
	/** Start */
	start?: string;
	/** Time Entry ID */
	timeEntryId?: string;
}

export interface CockpitToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'collection' | 'form' | 'singleton';
	/** Operation */
	operation?: 'create' | 'getAll' | 'update';
	/** Collection Name or ID */
	collection?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Entry ID */
	id?: string;
	/** JSON Data Fields */
	jsonDataFields?: boolean;
	/** Entry Data */
	dataFieldsJson?: string | object;
	/** Entry Data */
	dataFieldsUi?: Record<string, unknown>;
	/** Form */
	form?: string;
	/** Singleton Name or ID */
	singleton?: string;
}

export interface CodaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'control' | 'formula' | 'table' | 'view';
	/** Operation */
	operation?:
		| 'createRow'
		| 'deleteRow'
		| 'getAllColumns'
		| 'getAllRows'
		| 'getColumn'
		| 'getRow'
		| 'pushButton';
	/** Doc Name or ID */
	docId?: string;
	/** Table Name or ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Column Name or ID */
	columnId?: string;
	/** Formula ID */
	formulaId?: string;
	/** Control ID */
	controlId?: string;
	/** View ID */
	viewId?: string;
	/** Key Name */
	keyName?: string;
}

export interface CoinGeckoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'coin' | 'event';
	/** Operation */
	operation?:
		| 'candlestick'
		| 'get'
		| 'getAll'
		| 'history'
		| 'market'
		| 'marketChart'
		| 'price'
		| 'ticker';
	/** Search By */
	searchBy?: 'coinId' | 'contractAddress';
	/** Coin Name or ID */
	coinId?: string;
	/** Base Currency Name or ID */
	baseCurrency?: string;
	/** Base Currency Names or IDs */
	baseCurrencies?: unknown;
	/** Platform ID */
	platformId?: 'ethereum';
	/** Contract Address */
	contractAddress?: string;
	/** Contract Addresses */
	contractAddresses?: string;
	/** Quote Currency Name or ID */
	quoteCurrency?: string;
	/** Quote Currency Names or IDs */
	quoteCurrencies?: unknown;
	/** Range (Days) */
	days?: '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max';
	/** Date */
	date?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface CompressionToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'compress' | 'decompress';
	/** Input Binary Field(s) */
	binaryPropertyName?: string;
	/** Output Format */
	outputFormat?: 'gzip' | 'zip';
	/** File Name */
	fileName?: string;
	/** Put Output File in Field */
	binaryPropertyOutput?: string;
	/** Output File Prefix */
	outputPrefix?: string;
}

export interface ContentfulToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Source */
	source?: 'deliveryApi' | 'previewApi';
	/** Resource */
	resource?: 'asset' | 'contentType' | 'entry' | 'locale' | 'space';
	/** Operation */
	operation?: 'get';
	/** Environment ID */
	environmentId?: string;
	/** Content Type ID */
	contentTypeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Entry ID */
	entryId?: string;
	/** Asset ID */
	assetId?: string;
}

export interface ConvertKitToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'customField' | 'form' | 'sequence' | 'tag' | 'tagSubscriber';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update';
	/** Field ID */
	id?: string;
	/** Label */
	label?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Email */
	email?: string;
	/** Name */
	name?: string;
	/** Tag Name or ID */
	tagId?: string;
}

export interface CopperToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'company'
		| 'customerSource'
		| 'lead'
		| 'opportunity'
		| 'person'
		| 'project'
		| 'task'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Company ID */
	companyId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	filterFields?: Record<string, unknown>;
	/** Lead ID */
	leadId?: string;
	/** Customer Source ID */
	customerSourceId?: string;
	/** Primary Contact ID */
	primaryContactId?: string;
	/** Opportunity ID */
	opportunityId?: string;
	/** Person ID */
	personId?: string;
	/** Project ID */
	projectId?: string;
	/** Task ID */
	taskId?: string;
}

export interface CrateDbToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Schema */
	schema?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface CrowdDevToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'activity'
		| 'automation'
		| 'member'
		| 'note'
		| 'organization'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'createWithMember' | 'createForMember' | '__CUSTOM_API_CALL__';
	/** Username */
	username?: Record<string, unknown>;
	/** displayName */
	displayName?: string;
	/** Emails */
	emails?: Record<string, unknown>;
	/** Joined At */
	joinedAt?: string;
	/** Member */
	member?: string;
	/** Type */
	type?: string;
	/** Timestamp */
	timestamp?: string;
	/** Platform */
	platform?: string;
	/** Source ID */
	sourceId?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** ID */
	id?: string;
	/** Body */
	body?: string;
	/** Name */
	name?: string;
	/** Trigger */
	trigger?: 'new_activity' | 'new_member';
	/** URL */
	url?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface CryptoToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Action */
	action?: 'generate' | 'hash' | 'hmac' | 'sign';
	/** Type */
	type?: 'MD5' | 'SHA256' | 'SHA3-256' | 'SHA3-384' | 'SHA3-512' | 'SHA384' | 'SHA512';
	/** Binary File */
	binaryData?: boolean;
	/** Binary Property Name */
	binaryPropertyName?: string;
	/** Value */
	value?: string;
	/** Property Name */
	dataPropertyName?: string;
	/** Encoding */
	encoding?: 'base64' | 'hex';
	/** Secret */
	secret?: string;
	/** Algorithm Name or ID */
	algorithm?:
		| 'RSA-MD5'
		| 'RSA-RIPEMD160'
		| 'RSA-SHA1'
		| 'RSA-SHA1-2'
		| 'RSA-SHA224'
		| 'RSA-SHA256'
		| 'RSA-SHA3-224'
		| 'RSA-SHA3-256'
		| 'RSA-SHA3-384'
		| 'RSA-SHA3-512'
		| 'RSA-SHA384'
		| 'RSA-SHA512'
		| 'RSA-SHA512/224'
		| 'RSA-SHA512/256'
		| 'RSA-SM3'
		| 'blake2b512'
		| 'blake2s256'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-224'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-256'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-384'
		| 'id-rsassa-pkcs1-v1_5-with-sha3-512'
		| 'md5'
		| 'md5-sha1'
		| 'md5WithRSAEncryption'
		| 'ripemd'
		| 'ripemd160'
		| 'ripemd160WithRSA'
		| 'rmd160'
		| 'sha1'
		| 'sha1WithRSAEncryption'
		| 'sha224'
		| 'sha224WithRSAEncryption'
		| 'sha256'
		| 'sha256WithRSAEncryption'
		| 'sha3-224'
		| 'sha3-256'
		| 'sha3-384'
		| 'sha3-512'
		| 'sha384'
		| 'sha384WithRSAEncryption'
		| 'sha512'
		| 'sha512-224'
		| 'sha512-224WithRSAEncryption'
		| 'sha512-256'
		| 'sha512-256WithRSAEncryption'
		| 'sha512WithRSAEncryption'
		| 'shake128'
		| 'shake256'
		| 'sm3'
		| 'sm3WithRSAEncryption'
		| 'ssl3-md5'
		| 'ssl3-sha1';
	/** Private Key */
	privateKey?: string;
	/** Type */
	encodingType?: 'ascii' | 'base64' | 'hex' | 'uuid';
	/** Length */
	stringLength?: number;
}

export interface CustomerIoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'customer' | 'event' | 'campaign' | 'segment' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'getMetrics' | '__CUSTOM_API_CALL__';
	/** Campaign ID */
	campaignId?: number;
	/** Period */
	period?: 'hours' | 'days' | 'weeks' | 'months';
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** ID */
	id?: string;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Customer ID */
	customerId?: string;
	/** Event Name */
	eventName?: string;
	/** Segment ID */
	segmentId?: number;
	/** Customer IDs */
	customerIds?: string;
}

export interface DataTableToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'row';
	/** Operation */
	operation?: 'deleteRows' | 'get' | 'rowExists' | 'rowNotExists' | 'insert' | 'update' | 'upsert';
	/** Data table */
	dataTableId?: unknown;
	/** Must Match */
	matchType?: 'anyCondition' | 'allConditions';
	/** Columns */
	columns?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface DateTimeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?:
		| 'addToDate'
		| 'extractDate'
		| 'formatDate'
		| 'getCurrentDate'
		| 'getTimeBetweenDates'
		| 'roundDate'
		| 'subtractFromDate';
	/** You can also refer to the current date in n8n expressions by using <code>{{$now}}</code> or <code>{{$today}}</code>. <a target="_blank" href="https://docs.n8n.io/code/cookbook/luxon/">More info</a> */
	notice?: unknown;
	/** Include Current Time */
	includeTime?: boolean;
	/** Output Field Name */
	outputFieldName?: string;
	/** Date to Add To */
	magnitude?: string;
	/** Time Unit to Add */
	timeUnit?:
		| 'years'
		| 'quarters'
		| 'months'
		| 'weeks'
		| 'days'
		| 'hours'
		| 'minutes'
		| 'seconds'
		| 'milliseconds';
	/** Duration */
	duration?: number;
	/** Date */
	date?: string;
	/** Format */
	format?:
		| 'custom'
		| 'MM/dd/yyyy'
		| 'yyyy/MM/dd'
		| 'MMMM dd yyyy'
		| 'MM-dd-yyyy'
		| 'yyyy-MM-dd'
		| 'X'
		| 'x';
	/** Custom Format */
	customFormat?: string;
	/** Mode */
	mode?: 'roundDown' | 'roundUp';
	/** To Nearest */
	toNearest?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
	/** To */
	to?: 'month';
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Units */
	units?: unknown;
	/** Part */
	part?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
}

export interface DeepLToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'language' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'translate' | '__CUSTOM_API_CALL__';
	/** Text */
	text?: string;
	/** Target Language Name or ID */
	translateTo?: string;
}

export interface DemioToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'event' | 'report';
	/** Operation */
	operation?: 'get' | 'getAll' | 'register';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Event ID */
	eventId?: string;
	/** First Name */
	firstName?: string;
	/** Email */
	email?: string;
	/** Session Name or ID */
	dateId?: string;
}

export interface DhlToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'get';
	/** Tracking Number */
	trackingNumber?: string;
}

export interface DiscordToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Connection Type */
	authentication?: 'botToken' | 'oAuth2' | 'webhook';
	/** Resource */
	resource?: 'channel' | 'message' | 'member' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'deleteMessage'
		| 'get'
		| 'getAll'
		| 'react'
		| 'send'
		| 'sendAndWait'
		| '__CUSTOM_API_CALL__';
	/** Server */
	guildId?: unknown;
	/** Channel */
	channelId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Message ID */
	messageId?: string;
	/** Emoji */
	emoji?: string;
	/** Send To */
	sendTo?: 'user' | 'channel';
	/** User */
	userId?: unknown;
	/** Message */
	content?: string;
	/** Embeds */
	embeds?: Record<string, unknown>;
	/** Files */
	files?: Record<string, unknown>;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Name */
	name?: string;
	/** Type */
	type?: '0' | '2' | '4';
	/** After */
	after?: string;
	/** Role */
	role?: unknown;
}

export interface DiscourseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'category' | 'group' | 'post' | 'user' | 'userGroup' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Color */
	color?: unknown;
	/** Text Color */
	textColor?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Category ID */
	categoryId?: string;
	/** Group ID */
	groupId?: string;
	/** Title */
	title?: string;
	/** Content */
	content?: string;
	/** Post ID */
	postId?: string;
	/** Email */
	email?: string;
	/** Username */
	username?: string;
	/** Password */
	password?: string;
	/** By */
	by?: 'username' | 'externalId';
	/** SSO External ID */
	externalId?: string;
	/** Flag */
	flag?: 'active' | 'blocked' | 'new' | 'staff' | 'suspect' | 'suspended';
	/** Usernames */
	usernames?: string;
}

export interface DriftToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'getCustomAttributes'
		| 'delete'
		| 'get'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
}

export interface DropboxToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'file' | 'folder' | 'search' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'move' | 'upload' | '__CUSTOM_API_CALL__';
	/** From Path */
	path?: string;
	/** To Path */
	toPath?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Query */
	query?: string;
	/** File Status */
	fileStatus?: 'active' | 'deleted';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
}

export interface DropcontactToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'enrich' | 'fetchRequest' | '__CUSTOM_API_CALL__';
	/** Request ID */
	requestId?: string;
	/** Email */
	email?: string;
	/** Simplify Output (Faster) */
	simplify?: boolean;
}

export interface EgoiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** List Name or ID */
	list?: string;
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** By */
	by?: 'id' | 'email';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
}

export interface ElasticsearchToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'document' | 'index' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Index ID */
	indexId?: string;
	/** Document ID */
	documentId?: string;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** By default, you cannot page through more than 10,000 hits. To page through more hits, add "Sort" from options. */
	paginateNotice?: unknown;
	/** Limit */
	limit?: number;
	/** Data to Send */
	dataToSend?: 'defineBelow' | 'autoMapInputData';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
}

export interface ElasticSecurityToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'case' | 'caseComment' | 'caseTag' | 'connector' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'getStatus'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Connector Name or ID */
	connectorId?: string;
	/** Connector Type */
	connectorType?: '.resilient' | '.jira' | '.servicenow';
	/** Issue Type */
	issueType?: string;
	/** Priority */
	priority?: string;
	/** Urgency */
	urgency?: 1 | 2 | 3;
	/** Severity */
	severity?: 1 | 2 | 3;
	/** Impact */
	impact?: 1 | 2 | 3;
	/** Category */
	category?: string;
	/** Issue Types */
	issueTypes?: string;
	/** Severity Code */
	severityCode?: number;
	/** Case ID */
	caseId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sortOptions?: Record<string, unknown>;
	/** Comment */
	comment?: string;
	/** Simplify */
	simple?: boolean;
	/** Comment ID */
	commentId?: string;
	/** Tag Name or ID */
	tag?: string;
	/** Connector Name */
	name?: string;
	/** API URL */
	apiUrl?: string;
	/** Email */
	email?: string;
	/** API Token */
	apiToken?: string;
	/** Project Key */
	projectKey?: string;
	/** Username */
	username?: string;
	/** Password */
	password?: string;
	/** API Key ID */
	apiKeyId?: string;
	/** API Key Secret */
	apiKeySecret?: string;
	/** Organization ID */
	orgId?: string;
}

export interface EmailReadImapToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Mailbox Name */
	mailbox?: string;
	/** Action */
	postProcessAction?: 'read' | 'nothing';
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Format */
	format?: 'raw' | 'resolved' | 'simple';
	/** Property Prefix Name */
	dataPropertyAttachmentsPrefixName?: string;
}

export interface EmailSendToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'send' | 'sendAndWait';
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** Subject */
	subject?: string;
	/** Email Format */
	emailFormat?: 'text' | 'html' | 'both';
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface EmeliaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'campaign' | 'contactList';
	/** Operation */
	operation?: 'addContact' | 'create' | 'duplicate' | 'get' | 'getAll' | 'pause' | 'start';
	/** Campaign Name or ID */
	campaignId?: string;
	/** Contact Email */
	contactEmail?: string;
	/** Campaign Name */
	campaignName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Contact List Name or ID */
	contactListId?: string;
}

export interface ErpNextToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** DocType Name or ID */
	docType?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Properties */
	properties?: Record<string, unknown>;
	/** Document Name */
	documentName?: string;
}

export interface ExecuteCommandToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Execute Once */
	executeOnce?: boolean;
	/** Command */
	command?: string;
}

export interface FacebookGraphApiToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Host URL */
	hostUrl?: 'graph.facebook.com' | 'graph-video.facebook.com';
	/** HTTP Request Method */
	httpRequestMethod?: 'GET' | 'POST' | 'DELETE';
	/** Graph API Version */
	graphApiVersion?:
		| ''
		| 'v23.0'
		| 'v22.0'
		| 'v21.0'
		| 'v20.0'
		| 'v19.0'
		| 'v18.0'
		| 'v17.0'
		| 'v16.0'
		| 'v15.0'
		| 'v14.0'
		| 'v13.0'
		| 'v12.0'
		| 'v11.0'
		| 'v10.0'
		| 'v9.0'
		| 'v8.0'
		| 'v7.0'
		| 'v6.0'
		| 'v5.0'
		| 'v4.0'
		| 'v3.3'
		| 'v3.2'
		| 'v3.1'
		| 'v3.0';
	/** Node */
	node?: string;
	/** Edge */
	edge?: string;
	/** Ignore SSL Issues (Insecure) */
	allowUnauthorizedCerts?: boolean;
	/** Send Binary File */
	sendBinaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
}

export interface FilemakerToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Action */
	action?:
		| 'create'
		| 'delete'
		| 'duplicate'
		| 'edit'
		| 'find'
		| 'records'
		| 'record'
		| 'performscript';
	/** Layout Name or ID */
	layout?: string;
	/** Record ID */
	recid?: number;
	/** Offset */
	offset?: number;
	/** Limit */
	limit?: number;
	/** Get Portals */
	getPortals?: boolean;
	/** Portals Name or ID */
	portals?: string;
	/** Response Layout Name or ID */
	responseLayout?: string;
	/** Queries */
	queries?: Record<string, unknown>;
	/** Sort Data? */
	setSort?: boolean;
	/** Sort */
	sortParametersUi?: Record<string, unknown>;
	/** Before Find Script */
	setScriptBefore?: boolean;
	/** Script Name or ID */
	scriptBefore?: string;
	/** Script Parameter */
	scriptBeforeParam?: string;
	/** Before Sort Script */
	setScriptSort?: boolean;
	/** Script Name or ID */
	scriptSort?: string;
	/** Script Parameter */
	scriptSortParam?: string;
	/** After Sort Script */
	setScriptAfter?: boolean;
	/** Script Name or ID */
	scriptAfter?: string;
	/** Script Parameter */
	scriptAfterParam?: string;
	/** Mod ID */
	modId?: number;
	/** Fields */
	fieldsParametersUi?: Record<string, unknown>;
	/** Script Name or ID */
	script?: string;
	/** Script Parameter */
	scriptParam?: string;
}

export interface FreshdeskToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'ticket';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Requester Identification */
	requester?: 'email' | 'facebookId' | 'phone' | 'requesterId' | 'twitterId' | 'uniqueExternalId';
	/** Value */
	requesterIdentificationValue?: string;
	/** Status */
	status?: 'closed' | 'open' | 'pending' | 'resolved';
	/** Priority */
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	/** Source */
	source?:
		| 'chat'
		| 'email'
		| 'feedbackWidget'
		| 'mobileHelp'
		| 'OutboundEmail'
		| 'phone'
		| 'portal';
	/** Ticket ID */
	ticketId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
	/** Contact ID */
	contactId?: string;
}

export interface FreshserviceToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'agent'
		| 'agentGroup'
		| 'agentRole'
		| 'announcement'
		| 'assetType'
		| 'change'
		| 'department'
		| 'location'
		| 'problem'
		| 'product'
		| 'release'
		| 'requester'
		| 'requesterGroup'
		| 'software'
		| 'ticket';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Email */
	email?: string;
	/** First Name */
	firstName?: string;
	/** Roles */
	roles?: Record<string, unknown>;
	/** Agent ID */
	agentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Agent Group ID */
	agentGroupId?: string;
	/** Agent Role ID */
	agentRoleId?: string;
	/** Title */
	title?: string;
	/** Body */
	bodyHtml?: string;
	/** Visibility */
	visibility?: 'agents_only' | 'grouped_visibility' | 'everyone';
	/** Visible From */
	visibleFrom?: string;
	/** Announcement ID */
	announcementId?: string;
	/** Asset Type ID */
	assetTypeId?: string;
	/** Requester Name or ID */
	requesterId?: string;
	/** Subject */
	subject?: string;
	/** Planned Start Date */
	plannedStartDate?: string;
	/** Planned End Date */
	plannedEndDate?: string;
	/** Change ID */
	changeId?: string;
	/** Department ID */
	departmentId?: string;
	/** Location ID */
	locationId?: string;
	/** Due By */
	dueBy?: string;
	/** Problem ID */
	problemId?: string;
	/** Product ID */
	productId?: string;
	/** Release Type */
	releaseType?: 1 | 2 | 3 | 4;
	/** Priority */
	priority?: 1 | 2 | 3 | 4;
	/** Status */
	status?: 1 | 2 | 3 | 4 | 5;
	/** Release ID */
	releaseId?: string;
	/** Primary Email */
	primaryEmail?: string;
	/** Requester Group ID */
	requesterGroupId?: string;
	/** Application Type */
	applicationType?: 'desktop' | 'mobile' | 'saas';
	/** Software ID */
	softwareId?: string;
	/** Description */
	description?: string;
	/** Ticket ID */
	ticketId?: string;
}

export interface FreshworksCrmToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'account'
		| 'appointment'
		| 'contact'
		| 'deal'
		| 'note'
		| 'salesActivity'
		| 'search'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Account ID */
	accountId?: string;
	/** View Name or ID */
	view?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Start Date */
	fromDate?: string;
	/** End Date */
	endDate?: string;
	/** Attendees */
	attendees?: Record<string, unknown>;
	/** Appointment ID */
	appointmentId?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Email Address */
	emails?: string;
	/** Contact ID */
	contactId?: string;
	/** Amount */
	amount?: number;
	/** Deal ID */
	dealId?: string;
	/** Content */
	description?: string;
	/** Target Type */
	targetableType?: 'Contact' | 'Deal' | 'SalesAccount';
	/** Target ID */
	targetable_id?: string;
	/** Note ID */
	noteId?: string;
	/** Sales Activity Type Name or ID */
	sales_activity_type_id?: string;
	/** Owner Name or ID */
	ownerId?: string;
	/** Start Date */
	from_date?: string;
	/** End Date */
	end_date?: string;
	/** Sales Activity ID */
	salesActivityId?: string;
	/** Search Term */
	query?: string;
	/** Search on Entities */
	entities?: unknown;
	/** Search Field */
	searchField?: 'email' | 'name' | 'customField';
	/** Custom Field Name */
	customFieldName?: string;
	/** Custom Field Value */
	customFieldValue?: string;
	/** Field Value */
	fieldValue?: string;
	/** Due Date */
	dueDate?: string;
	/** Task ID */
	taskId?: string;
}

export interface GetResponseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GhostToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Source */
	source?: 'adminApi' | 'contentApi';
	/** Resource */
	resource?: 'post' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Content Format */
	contentFormat?: 'html' | 'mobileDoc' | 'lexical';
	/** Content */
	content?: string;
	/** Post ID */
	postId?: string;
	/** By */
	by?: 'id' | 'slug';
	/** Identifier */
	identifier?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GitToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'gitPassword' | 'none';
	/** Operation */
	operation?:
		| 'add'
		| 'addConfig'
		| 'clone'
		| 'commit'
		| 'fetch'
		| 'listConfig'
		| 'log'
		| 'pull'
		| 'push'
		| 'pushTags'
		| 'status'
		| 'switchBranch'
		| 'tag'
		| 'userSetup';
	/** Repository Path */
	repositoryPath?: string;
	/** Paths to Add */
	pathsToAdd?: string;
	/** Key */
	key?: string;
	/** Value */
	value?: string;
	/** Source Repository */
	sourceRepository?: string;
	/** Message */
	message?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Branch Name */
	branchName?: string;
	/** Name */
	name?: string;
}

export interface GithubToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'file'
		| 'issue'
		| 'organization'
		| 'release'
		| 'repository'
		| 'review'
		| 'user'
		| 'workflow'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getRepositories' | '__CUSTOM_API_CALL__';
	/** Your execution will pause until a webhook is called. This URL will be generated at runtime and passed to your Github workflow as a resumeUrl input. */
	webhookNotice?: unknown;
	/** Repository Owner */
	owner?: unknown;
	/** Repository Name */
	repository?: unknown;
	/** Workflow */
	workflowId?: unknown;
	/** Ref */
	ref?: string;
	/** Inputs */
	inputs?: string | object;
	/** File Path */
	filePath?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Commit Message */
	commitMessage?: string;
	/** Additional Parameters */
	additionalParameters?: Record<string, unknown>;
	/** As Binary Property */
	asBinaryProperty?: boolean;
	/** Title */
	title?: string;
	/** Body */
	body?: string;
	/** Labels */
	labels?: Record<string, unknown>;
	/** Assignees */
	assignees?: Record<string, unknown>;
	/** Issue Number */
	issueNumber?: number;
	/** Edit Fields */
	editFields?: Record<string, unknown>;
	/** Lock Reason */
	lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam';
	/** Tag */
	releaseTag?: string;
	/** Release ID */
	release_id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	getRepositoryIssuesFilters?: Record<string, unknown>;
	/** Filters */
	getRepositoryPullRequestsFilters?: Record<string, unknown>;
	/** PR Number */
	pullRequestNumber?: number;
	/** Review ID */
	reviewId?: string;
	/** Event */
	event?: 'approve' | 'requestChanges' | 'comment' | 'pending';
	/** Organization */
	organization?: string;
	/** Email */
	email?: string;
	/** Filters */
	getUserIssuesFilters?: Record<string, unknown>;
}

export interface GitlabToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'file' | 'issue' | 'release' | 'repository' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'createComment' | 'edit' | 'get' | 'lock' | '__CUSTOM_API_CALL__';
	/** Project Owner */
	owner?: string;
	/** Project Name */
	repository?: string;
	/** Title */
	title?: string;
	/** Body */
	body?: string;
	/** Due Date */
	due_date?: string;
	/** Labels */
	labels?: Record<string, unknown>;
	/** Assignees */
	assignee_ids?: Record<string, unknown>;
	/** Issue Number */
	issueNumber?: number;
	/** Edit Fields */
	editFields?: Record<string, unknown>;
	/** Lock Reason */
	lockReason?: 'off-topic' | 'too heated' | 'resolved' | 'spam';
	/** Tag */
	releaseTag?: string;
	/** Project ID */
	projectId?: string;
	/** Tag Name */
	tag_name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	getRepositoryIssuesFilters?: Record<string, unknown>;
	/** File Path */
	filePath?: string;
	/** Page */
	page?: number;
	/** Additional Parameters */
	additionalParameters?: Record<string, unknown>;
	/** As Binary Property */
	asBinaryProperty?: boolean;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Commit Message */
	commitMessage?: string;
	/** Branch */
	branch?: string;
}

export interface GongToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'call' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Call to Get */
	call?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** User to Get */
	user?: unknown;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleAdsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'campaign' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getAll' | 'get' | '__CUSTOM_API_CALL__';
	/** Divide field names expressed with <i>micros</i> by 1,000,000 to get the actual value */
	campaigsNotice?: unknown;
	/** Manager Customer ID */
	managerCustomerId?: string;
	/** Client Customer ID */
	clientCustomerId?: string;
	/** Campaign ID */
	campaignId?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleAnalyticsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'report' | 'userActivity' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | '__CUSTOM_API_CALL__';
	/** Property Type */
	propertyType?: 'ga4' | 'universal';
	/** Property */
	propertyId?: unknown;
	/** Date Range */
	dateRange?:
		| 'last7days'
		| 'last30days'
		| 'today'
		| 'yesterday'
		| 'lastCalendarWeek'
		| 'lastCalendarMonth'
		| 'custom';
	/** Start */
	startDate?: string;
	/** End */
	endDate?: string;
	/** Metrics */
	metricsGA4?: Record<string, unknown>;
	/** Dimensions to split by */
	dimensionsGA4?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify Output */
	simple?: boolean;
	/** View */
	viewId?: unknown;
	/** Metrics */
	metricsUA?: Record<string, unknown>;
	/** Dimensions to split by */
	dimensionsUA?: Record<string, unknown>;
	/** User ID */
	userId?: string;
}

export interface GoogleBigQueryToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Operation */
	operation?: 'executeQuery' | 'insert';
	/** Project */
	projectId?: unknown;
	/** Dataset */
	datasetId?: unknown;
	/** Table */
	tableId?: unknown;
	/** SQL Query */
	sqlQuery?: string;
	/** Data Mode */
	dataMode?: 'autoMap' | 'define';
	/** In this mode, make sure the incoming data fields are named the same as the columns in BigQuery. (Use an 'Edit Fields' node before this node to change them if required.) */
	info?: unknown;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
}

export interface GoogleBooksToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'bookshelf' | 'bookshelfVolume' | 'volume' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** My Library */
	myLibrary?: boolean;
	/** Search Query */
	searchQuery?: string;
	/** User ID */
	userId?: string;
	/** Bookshelf ID */
	shelfId?: string;
	/** Volume ID */
	volumeId?: string;
	/** Volume Position */
	volumePosition?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GoogleCalendarToolParameters extends BaseNodeParams {
	/** Interact with your Google Calendar using our pre-built */
	preBuiltAgentsCalloutGoogleCalendar?: unknown;
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'calendar' | 'event' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'availability' | '__CUSTOM_API_CALL__';
	/** Calendar */
	calendar?: unknown;
	/** Start Time */
	timeMin?: string;
	/** End Time */
	timeMax?: string;
	/** Start */
	start?: string;
	/** End */
	end?: string;
	/** Use Default Reminders */
	useDefaultReminders?: boolean;
	/** Reminders */
	remindersUi?: Record<string, unknown>;
	/** Event ID */
	eventId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Modify */
	modifyTarget?: 'instance' | 'event';
	/** This node will use the time zone set in n8n’s settings, but you can override this in the workflow settings */
	useN8nTimeZone?: unknown;
}

export interface GoogleChatToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'member' | 'message' | 'space' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Member ID */
	memberId?: string;
	/** Space Name or ID */
	spaceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Message */
	messageUi?: Record<string, unknown>;
	/** See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat Guide</a> To Creating Messages */
	jsonNotice?: unknown;
	/** Message (JSON) */
	messageJson?: string | object;
	/** Message ID */
	messageId?: string;
	/** Update Fields */
	updateFieldsUi?: Record<string, unknown>;
	/** Update Fields (JSON) */
	updateFieldsJson?: string | object;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface GoogleCloudNaturalLanguageToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyzeSentiment' | '__CUSTOM_API_CALL__';
	/** Source */
	source?: 'content' | 'gcsContentUri';
	/** Content */
	content?: string;
	/** Google Cloud Storage URI */
	gcsContentUri?: string;
}

export interface GoogleCloudStorageToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'bucket' | 'object' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Project ID */
	projectId?: string;
	/** Bucket Name */
	bucketName?: string;
	/** Prefix */
	prefix?: string;
	/** Projection */
	projection?: 'full' | 'noAcl';
	/** Return All */
	returnAll?: boolean;
	/** Filters */
	getFilters?: Record<string, unknown>;
	/** Predefined Access Control */
	createAcl?: Record<string, unknown>;
	/** Additional Parameters */
	createBody?: Record<string, unknown>;
	/** Object Name */
	objectName?: string;
	/** Projection */
	updateProjection?: 'full' | 'noAcl';
	/** Return Data */
	alt?: 'json' | 'media';
	/** Use Input Binary Field */
	createFromBinary?: boolean;
	/** Input Binary Field */
	createBinaryPropertyName?: string;
	/** File Content */
	createContent?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Limit */
	maxResults?: number;
	/** Create Fields */
	createData?: Record<string, unknown>;
	/** Update Fields */
	updateData?: Record<string, unknown>;
	/** Additional Parameters */
	createQuery?: Record<string, unknown>;
	/** Additional Parameters */
	getParameters?: Record<string, unknown>;
	/** Additional Parameters */
	metagenAndAclQuery?: Record<string, unknown>;
	/** Encryption Headers */
	encryptionHeaders?: Record<string, unknown>;
	/** Additional Parameters */
	listFilters?: Record<string, unknown>;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GoogleContactsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Family Name */
	familyName?: string;
	/** Given Name */
	givenName?: string;
	/** Contact ID */
	contactId?: string;
	/** Fields */
	fields?: unknown;
	/** RAW Data */
	rawData?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Use Query */
	useQuery?: boolean;
	/** Query */
	query?: string;
}

export interface GoogleDocsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'update' | '__CUSTOM_API_CALL__';
	/** Drive Name or ID */
	driveId?: string;
	/** Folder Name or ID */
	folderId?: string;
	/** Title */
	title?: string;
	/** Doc ID or URL */
	documentURL?: string;
	/** Simplify */
	simple?: boolean;
	/** Actions */
	actionsUi?: Record<string, unknown>;
}

export interface GoogleDriveToolParameters extends BaseNodeParams {
	/** Retrieve, analyze, and answer questions using your Google Drive documents with our pre-built */
	preBuiltAgentsCalloutGoogleDrive?: unknown;
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'file' | 'fileFolder' | 'folder' | 'drive' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'deleteDrive' | 'get' | 'list' | 'update' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Shared Drive */
	driveId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** File */
	fileId?: unknown;
	/** Copy In The Same Folder */
	sameFolder?: boolean;
	/** Parent Folder */
	folderId?: unknown;
	/** File Content */
	content?: string;
	/** Permissions */
	permissionsUi?: Record<string, unknown>;
	/** Change File Content */
	changeFileContent?: boolean;
	/** Input Data Field Name */
	inputDataFieldName?: string;
	/** New Updated File Name */
	newUpdatedFileName?: string;
	/** Search Method */
	searchMethod?: 'name' | 'query';
	/** Search Query */
	queryString?: string;
	/** Filter */
	filter?: Record<string, unknown>;
	/** Folder */
	folderNoRootId?: unknown;
}

export interface GoogleFirebaseCloudFirestoreToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'googleFirebaseCloudFirestoreOAuth2Api' | 'serviceAccount';
	/** Resource */
	resource?: 'document' | 'collection' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'upsert' | 'delete' | 'get' | 'getAll' | 'query' | '__CUSTOM_API_CALL__';
	/** Project Name or ID */
	projectId?: string;
	/** Database */
	database?: string;
	/** Collection */
	collection?: string;
	/** Document ID */
	documentId?: string;
	/** Columns / Attributes */
	columns?: string;
	/** Simplify */
	simple?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Update Key */
	updateKey?: string;
	/** Query JSON */
	query?: string;
}

export interface GoogleFirebaseRealtimeDatabaseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Project Name or ID */
	projectId?: string;
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'push' | 'update' | '__CUSTOM_API_CALL__';
	/** Object Path */
	path?: string;
	/** Columns / Attributes */
	attributes?: string;
}

export interface GmailToolParameters extends BaseNodeParams {
	/** Sort your Gmail inbox using our pre-built */
	preBuiltAgentsCalloutGmail?: unknown;
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'message' | 'label' | 'draft' | 'thread';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll';
	/** Draft ID */
	messageId?: string;
	/** Subject */
	subject?: string;
	/** To reply to an existing thread, specify the exact subject title of that thread. */
	threadNotice?: unknown;
	/** Email Type */
	emailType?: 'html' | 'text';
	/** Message */
	message?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Label ID */
	labelId?: string;
	/** To */
	sendTo?: string;
	/** Simplify */
	simple?: boolean;
	/** Fetching a lot of messages may take a long time. Consider using filters to speed things up */
	filtersNotice?: unknown;
	/** Label Names or IDs */
	labelIds?: unknown;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Thread ID */
	threadId?: string;
}

export interface GSuiteAdminToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'device' | 'group' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'update' | 'changeStatus' | '__CUSTOM_API_CALL__';
	/** Device */
	deviceId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Output */
	projection?: 'basic' | 'full';
	/** Include Children */
	includeChildOrgunits?: boolean;
	/** Filter */
	filter?: Record<string, unknown>;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Update Fields */
	updateOptions?: Record<string, unknown>;
	/** Status */
	action?: 'reenable' | 'disable';
	/** Group */
	groupId?: unknown;
	/** Group Name */
	name?: string;
	/** Group Email */
	email?: string;
	/** User */
	userId?: unknown;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Password */
	password?: string;
	/** Username */
	username?: string;
	/** Domain Name or ID */
	domain?: string;
	/** Output */
	output?: 'simplified' | 'raw' | 'select';
	/** Fields */
	fields?: unknown;
	/** Custom Schema Names or IDs */
	customFieldMask?: unknown;
}

export interface GoogleBusinessProfileToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'post' | 'review' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Account */
	account?: unknown;
	/** Location */
	location?: unknown;
	/** Post Type */
	postType?: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
	/** Summary */
	summary?: string;
	/** Title */
	title?: string;
	/** Start Date and Time */
	startDateTime?: string;
	/** End Date and Time */
	endDateTime?: string;
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Alert Type */
	alertType?: 'COVID_19';
	/** Options */
	additionalOptions?: Record<string, unknown>;
	/** Post */
	post?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Make sure that the updated options are supported by the post type. <a target='_blank' href='https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts#resource:-localpost'>More info</a>. */
	notice?: unknown;
	/** Review */
	review?: unknown;
	/** Reply */
	reply?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface GooglePerspectiveToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'analyzeComment' | '__CUSTOM_API_CALL__';
	/** Text */
	text?: string;
	/** Attributes to Analyze */
	requestedAttributesUi?: Record<string, unknown>;
}

export interface GoogleSheetsToolParameters extends BaseNodeParams {
	/** Manage tasks in Google Sheets using our pre-built */
	preBuiltAgentsCalloutGoogleSheets?: unknown;
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'spreadsheet' | 'sheet';
	/** Operation */
	operation?:
		| 'appendOrUpdate'
		| 'append'
		| 'clear'
		| 'create'
		| 'remove'
		| 'delete'
		| 'read'
		| 'update';
	/** Document */
	documentId?: unknown;
	/** Sheet */
	sheetName?: unknown;
	/** Data Mode */
	dataMode?: 'autoMapInputData' | 'defineBelow' | 'nothing';
	/** In this mode, make sure the incoming data is named the same as the columns in your Sheet. (Use an 'Edit Fields' node before this node to change it if required.) */
	autoMapNotice?: unknown;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Columns */
	columns?: unknown;
	/** Clear */
	clear?: 'wholeSheet' | 'specificRows' | 'specificColumns' | 'specificRange';
	/** Keep First Row */
	keepFirstRow?: boolean;
	/** Start Row Number */
	startIndex?: number;
	/** Number of Rows to Delete */
	rowsToDelete?: number;
	/** Number of Columns to Delete */
	columnsToDelete?: number;
	/** Range */
	range?: string;
	/** Title */
	title?: string;
	/** To Delete */
	toDelete?: 'rows' | 'columns';
	/** Number of Rows to Delete */
	numberToDelete?: number;
	/** Filters */
	filtersUI?: Record<string, unknown>;
	/** Combine Filters */
	combineFilters?: 'AND' | 'OR';
	/** Column to match on */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
	/** Sheets */
	sheetsUi?: Record<string, unknown>;
}

export interface GoogleSlidesToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'oAuth2' | 'serviceAccount';
	/** Resource */
	resource?: 'page' | 'presentation' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getSlides' | 'replaceText' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Presentation ID */
	presentationId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Page Object ID */
	pageObjectId?: string;
	/** Texts To Replace */
	textUi?: Record<string, unknown>;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
}

export interface GoogleTasksToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'task' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** TaskList Name or ID */
	task?: string;
	/** Title */
	title?: string;
	/** Task ID */
	taskId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GoogleTranslateToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'serviceAccount' | 'oAuth2';
	/** Resource */
	resource?: 'language' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'translate' | '__CUSTOM_API_CALL__';
	/** Text */
	text?: string;
	/** Translate To */
	translateTo?: string;
}

export interface YouTubeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'channel'
		| 'playlist'
		| 'playlistItem'
		| 'video'
		| 'videoCategory'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'update' | 'uploadBanner' | '__CUSTOM_API_CALL__';
	/** Fields */
	part?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Channel ID */
	channelId?: string;
	/** Input Binary Field */
	binaryProperty?: string;
	/** Title */
	title?: string;
	/** Playlist ID */
	playlistId?: string;
	/** Video ID */
	videoId?: string;
	/** Playlist Item ID */
	playlistItemId?: string;
	/** Region Code */
	regionCode?: string;
	/** Category Name or ID */
	categoryId?: string;
	/** Rating */
	rating?: 'dislike' | 'like' | 'none';
}

export interface GotifyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'message';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll';
	/** Message */
	message?: string;
	/** Message ID */
	messageId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface GoToWebinarToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'attendee'
		| 'coorganizer'
		| 'panelist'
		| 'registrant'
		| 'session'
		| 'webinar'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'getDetails' | '__CUSTOM_API_CALL__';
	/** Webinar Key Name or ID */
	webinarKey?: string;
	/** Session Key Name or ID */
	sessionKey?: string;
	/** Registrant Key */
	registrantKey?: string;
	/** Details */
	details?: 'polls' | 'questions' | 'surveyAnswers';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Is External */
	isExternal?: boolean;
	/** Organizer Key */
	organizerKey?: string;
	/** Given Name */
	givenName?: string;
	/** Email */
	email?: string;
	/** Co-Organizer Key */
	coorganizerKey?: string;
	/** Name */
	name?: string;
	/** Panelist Key */
	panelistKey?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Subject */
	subject?: string;
	/** Time Range */
	times?: Record<string, unknown>;
	/** Notify Participants */
	notifyParticipants?: boolean;
}

export interface GrafanaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'dashboard' | 'team' | 'teamMember' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Dashboard UID or URL */
	dashboardUidOrUrl?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Team ID */
	teamId?: string;
	/** User Name or ID */
	userId?: string;
	/** User Name or ID */
	memberId?: string;
}

export interface GraphqlToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?:
		| 'basicAuth'
		| 'customAuth'
		| 'digestAuth'
		| 'headerAuth'
		| 'none'
		| 'oAuth1'
		| 'oAuth2'
		| 'queryAuth';
	/** HTTP Request Method */
	requestMethod?: 'GET' | 'POST';
	/** Endpoint */
	endpoint?: string;
	/** Ignore SSL Issues (Insecure) */
	allowUnauthorizedCerts?: boolean;
	/** Request Format */
	requestFormat?: 'graphql' | 'json';
	/** Query */
	query?: string;
	/** Variables */
	variables?: string | object;
	/** Operation Name */
	operationName?: string;
	/** Response Format */
	responseFormat?: 'json' | 'string';
	/** Response Data Property Name */
	dataPropertyName?: string;
	/** Headers */
	headerParametersUi?: Record<string, unknown>;
}

export interface GristToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update';
	/** Document ID */
	docId?: string;
	/** Table ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
	/** Data to Send */
	dataToSend?: 'autoMapInputs' | 'defineInNode';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsToSend?: Record<string, unknown>;
}

export interface HackerNewsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'all' | 'article' | 'user';
	/** Operation */
	operation?: 'getAll';
	/** Article ID */
	articleId?: string;
	/** Username */
	username?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface HaloPSAToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'client' | 'site' | 'ticket' | 'user';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	clientName?: string;
	/** Client ID */
	clientId?: string;
	/** Simplify */
	simplify?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Ticket Type Name or ID */
	ticketType?: string;
	/** Summary */
	summary?: string;
	/** Details */
	details?: string;
	/** Ticket ID */
	ticketId?: string;
	/** Name */
	siteName?: string;
	/** Select Client by ID */
	selectOption?: boolean;
	/** Site ID */
	siteId?: string;
	/** Name */
	userName?: string;
	/** User ID */
	userId?: string;
}

export interface HarvestToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'client'
		| 'company'
		| 'contact'
		| 'estimate'
		| 'expense'
		| 'invoice'
		| 'project'
		| 'task'
		| 'timeEntry'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Account Name or ID */
	accountId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Client ID */
	id?: string;
	/** Name */
	name?: string;
	/** First Name */
	firstName?: string;
	/** Client ID */
	clientId?: string;
	/** Project ID */
	projectId?: string;
	/** Expense Category ID */
	expenseCategoryId?: string;
	/** Spent Date */
	spentDate?: string;
	/** Is Billable */
	isBillable?: boolean;
	/** Bill By */
	billBy?: 'none' | 'People' | 'Project' | 'Tasks';
	/** Budget By */
	budgetBy?: string;
	/** Task ID */
	taskId?: string;
	/** Last Name */
	lastName?: string;
	/** Email */
	email?: string;
}

export interface HelpScoutToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'conversation' | 'customer' | 'mailbox' | 'thread' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Mailbox Name or ID */
	mailboxId?: string;
	/** Status */
	status?: 'active' | 'closed' | 'pending';
	/** Subject */
	subject?: string;
	/** Type */
	type?: 'chat' | 'email' | 'phone';
	/** Resolve Data */
	resolveData?: boolean;
	/** Threads */
	threadsUi?: Record<string, unknown>;
	/** Conversation ID */
	conversationId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Address */
	addressUi?: Record<string, unknown>;
	/** Chat Handles */
	chatsUi?: Record<string, unknown>;
	/** Emails */
	emailsUi?: Record<string, unknown>;
	/** Phones */
	phonesUi?: Record<string, unknown>;
	/** Social Profiles */
	socialProfilesUi?: Record<string, unknown>;
	/** Websites */
	websitesUi?: Record<string, unknown>;
	/** Customer ID */
	customerId?: string;
	/** Text */
	text?: string;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
}

export interface HighLevelToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'opportunity' | 'task' | 'calendar' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Create a new contact or update an existing one if email or phone matches (upsert) */
	contactCreateNotice?: unknown;
	/** Email */
	email?: string;
	/** Phone */
	phone?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Pipeline Name or ID */
	pipelineId?: string;
	/** Name */
	name?: string;
	/** Status */
	status?: 'open' | 'won' | 'lost' | 'abandoned';
	/** Opportunity ID */
	opportunityId?: string;
	/** Title */
	title?: string;
	/** Due Date */
	dueDate?: string;
	/** Completed */
	completed?: boolean;
	/** Task ID */
	taskId?: string;
	/** Calendar ID */
	calendarId?: string;
	/** Location ID */
	locationId?: string;
	/** Start Time */
	startTime?: string;
	/** Start Date */
	startDate?: number;
	/** End Date */
	endDate?: number;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface HomeAssistantToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'cameraProxy' | 'config' | 'event' | 'log' | 'service' | 'state' | 'template';
	/** Operation */
	operation?: 'getScreenshot';
	/** Camera Entity Name or ID */
	cameraEntityId?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Event Type */
	eventType?: string;
	/** Event Attributes */
	eventAttributes?: Record<string, unknown>;
	/** Domain Name or ID */
	domain?: string;
	/** Service Name or ID */
	service?: string;
	/** Service Attributes */
	serviceAttributes?: Record<string, unknown>;
	/** Entity Name or ID */
	entityId?: string;
	/** State */
	state?: string;
	/** State Attributes */
	stateAttributes?: Record<string, unknown>;
	/** Template */
	template?: string;
}

export interface HttpRequestToolParameters extends BaseNodeParams {
	/** Try the HTTP request tool with our pre-built */
	preBuiltAgentsCalloutHttpRequest?: unknown;
	/** Description */
	toolDescription?: string;
	curlImport?: unknown;
	/** Method */
	method?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
	/** URL */
	url?: string;
	/** Authentication */
	authentication?: 'none' | 'predefinedCredentialType' | 'genericCredentialType';
	/** Credential Type */
	nodeCredentialType?: unknown;
	/** Make sure you have specified the scope(s) for the Service Account in the credential */
	googleApiWarning?: unknown;
	/** Generic Auth Type */
	genericAuthType?: unknown;
	/** SSL Certificates */
	provideSslCertificates?: boolean;
	/** Provide certificates in node's 'Credential for SSL Certificates' parameter */
	provideSslCertificatesNotice?: unknown;
	/** SSL Certificate */
	sslCertificate?: unknown;
	/** Send Query Parameters */
	sendQuery?: boolean;
	/** Specify Query Parameters */
	specifyQuery?: 'keypair' | 'json';
	/** Query Parameters */
	queryParameters?: Record<string, unknown>;
	/** JSON */
	jsonQuery?: string | object;
	/** Send Headers */
	sendHeaders?: boolean;
	/** Specify Headers */
	specifyHeaders?: 'keypair' | 'json';
	/** Header Parameters */
	headerParameters?: Record<string, unknown>;
	/** JSON */
	jsonHeaders?: string | object;
	/** Send Body */
	sendBody?: boolean;
	/** Body Content Type */
	contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'binaryData' | 'raw';
	/** Specify Body */
	specifyBody?: 'keypair' | 'json';
	/** Body Parameters */
	bodyParameters?: Record<string, unknown>;
	/** JSON */
	jsonBody?: string | object;
	/** Body */
	body?: string;
	/** Input Data Field Name */
	inputDataFieldName?: string;
	/** Content Type */
	rawContentType?: string;
	/** Optimize Response */
	optimizeResponse?: boolean;
	/** Expected Response Type */
	responseType?: 'json' | 'html' | 'text';
	/** Field Containing Data */
	dataField?: string;
	/** Include Fields */
	fieldsToInclude?: 'all' | 'selected' | 'except';
	/** Fields */
	fields?: string;
	/** Selector (CSS) */
	cssSelector?: string;
	/** Return Only Content */
	onlyContent?: boolean;
	/** Elements To Omit */
	elementsToOmit?: string;
	/** Truncate Response */
	truncateResponse?: boolean;
	/** Max Response Characters */
	maxLength?: number;
	/** You can view the raw requests this node makes in your browser's developer console */
	infoMessage?: unknown;
}

export interface HubspotToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiKey' | 'appToken' | 'oAuth2';
	/** Resource */
	resource?: 'company' | 'contact' | 'contactList' | 'deal' | 'engagement' | 'ticket';
	/** Operation */
	operation?: 'upsert' | 'delete' | 'get' | 'getAll' | 'getRecentlyCreatedUpdated' | 'search';
	/** Email */
	email?: string;
	/** Contact to Get */
	contactId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter Groups */
	filterGroupsUi?: Record<string, unknown>;
	/** By */
	by?: 'id' | 'email';
	/** Contact to Add */
	id?: number;
	/** List to Add To */
	listId?: number;
	/** Name */
	name?: string;
	/** Company to Update */
	companyId?: unknown;
	/** Domain */
	domain?: string;
	/** Deal Stage Name or ID */
	stage?: string;
	/** Deal to Update */
	dealId?: unknown;
	/** Type */
	type?: 'call' | 'email' | 'meeting' | 'task';
	/** Due Date */
	dueDate?: string;
	/** Metadata */
	metadata?: Record<string, unknown>;
	/** Engagement to Get */
	engagementId?: unknown;
	/** Pipeline Name or ID */
	pipelineId?: string;
	/** Stage Name or ID */
	stageId?: string;
	/** Ticket Name */
	ticketName?: string;
	/** Ticket to Update */
	ticketId?: unknown;
}

export interface HumanticAiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'profile';
	/** Operation */
	operation?: 'create' | 'get' | 'update';
	/** User ID */
	userId?: string;
	/** Send Resume */
	sendResume?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Text */
	text?: string;
}

export interface HunterToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'domainSearch' | 'emailFinder' | 'emailVerifier';
	/** Domain */
	domain?: string;
	/** Only Emails */
	onlyEmails?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Email */
	email?: string;
}

export interface IntercomToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'company' | 'lead' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Select By */
	selectBy?: 'id' | 'userId';
	/** Value */
	value?: string;
	/** Update By */
	updateBy?: 'id' | 'email' | 'userId';
	/** Identifier Type */
	identifierType?: 'userId' | 'email';
	/** Value */
	idValue?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Custom Attributes */
	customAttributesJson?: string | object;
	/** Custom Attributes */
	customAttributesUi?: Record<string, unknown>;
	/** Delete By */
	deleteBy?: 'id' | 'userId';
	/** Email */
	email?: string;
	/** List By */
	listBy?: 'id' | 'companyId';
	/** Company ID */
	companyId?: string;
}

export interface InvoiceNinjaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** API Version */
	apiVersion?: 'v4' | 'v5';
	/** Resource */
	resource?:
		| 'bank_transaction'
		| 'client'
		| 'expense'
		| 'invoice'
		| 'payment'
		| 'quote'
		| 'task'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Billing Address */
	billingAddressUi?: Record<string, unknown>;
	/** Contacts */
	contactsUi?: Record<string, unknown>;
	/** Shipping Address */
	shippingAddressUi?: Record<string, unknown>;
	/** Client ID */
	clientId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Invoice Items */
	invoiceItemsUi?: Record<string, unknown>;
	/** Invoice ID */
	invoiceId?: string;
	/** Time Logs */
	timeLogsUi?: Record<string, unknown>;
	/** Task ID */
	taskId?: string;
	/** Invoice Name or ID */
	invoice?: string;
	/** Amount */
	amount?: number;
	/** Payment ID */
	paymentId?: string;
	/** Expense ID */
	expenseId?: string;
	/** Quote ID */
	quoteId?: string;
	/** Bank Transaction ID */
	bankTransactionId?: string;
}

export interface IterableToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'event' | 'user' | 'userList' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'track' | '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Identifier */
	identifier?: 'email' | 'userId';
	/** Value */
	value?: string;
	/** Create If Doesn't Exist */
	preferUserId?: boolean;
	/** By */
	by?: 'email' | 'userId';
	/** User ID */
	userId?: string;
	/** Email */
	email?: string;
	/** List Name or ID */
	listId?: string;
}

export interface JenkinsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'build' | 'instance' | 'job';
	/** Operation */
	operation?: 'copy' | 'create' | 'trigger' | 'triggerParams';
	/** Make sure the job is setup to support triggering with parameters. <a href="https://wiki.jenkins.io/display/JENKINS/Parameterized+Build" target="_blank">More info</a> */
	triggerParamsNotice?: unknown;
	/** Job Name or ID */
	job?: string;
	/** Parameters */
	param?: Record<string, unknown>;
	/** New Job Name */
	newJob?: string;
	/** XML */
	xml?: string;
	/** To get the XML of an existing job, add ‘config.xml’ to the end of the job URL */
	createNotice?: unknown;
	/** Reason */
	reason?: string;
	/** Instance operation can shutdown Jenkins instance and make it unresponsive. Some commands may not be available depending on instance implementation. */
	instanceNotice?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface JinaAiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'reader' | 'research' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'read' | 'search' | '__CUSTOM_API_CALL__';
	/** URL */
	url?: string;
	/** Simplify */
	simplify?: boolean;
	/** Search Query */
	searchQuery?: string;
	/** Research Query */
	researchQuery?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface JiraToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Jira Version */
	jiraVersion?: 'cloud' | 'server' | 'serverPat';
	/** Resource */
	resource?: 'issue' | 'issueAttachment' | 'issueComment' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'changelog'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'notify'
		| 'transitions'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Project */
	project?: unknown;
	/** Issue Type */
	issueType?: unknown;
	/** Summary */
	summary?: string;
	/** Issue Key */
	issueKey?: string;
	/** Delete Subtasks */
	deleteSubtasks?: boolean;
	/** Simplify */
	simplifyOutput?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Notification Recipients */
	notificationRecipientsUi?: Record<string, unknown>;
	/** Notification Recipients */
	notificationRecipientsJson?: string | object;
	/** Notification Recipients Restrictions */
	notificationRecipientsRestrictionsUi?: Record<string, unknown>;
	/** Notification Recipients Restrictions */
	notificationRecipientsRestrictionsJson?: string | object;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
	/** Comment */
	comment?: string;
	/** Document Format (JSON) */
	commentJson?: string | object;
	/** Comment ID */
	commentId?: string;
	/** Username */
	username?: string;
	/** Email Address */
	emailAddress?: string;
	/** Display Name */
	displayName?: string;
	/** Account ID */
	accountId?: string;
}

export interface JwtToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'decode' | 'sign' | 'verify';
	/** Use JSON to Build Payload */
	useJson?: boolean;
	/** Payload Claims */
	claims?: Record<string, unknown>;
	/** Payload Claims (JSON) */
	claimsJson?: string | object;
	/** Token */
	token?: string;
}

export interface KafkaToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Topic */
	topic?: string;
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Use Schema Registry */
	useSchemaRegistry?: boolean;
	/** Schema Registry URL */
	schemaRegistryUrl?: string;
	/** Use Key */
	useKey?: boolean;
	/** Key */
	key?: string;
	/** Event Name */
	eventName?: string;
	/** Headers */
	headersUi?: Record<string, unknown>;
	/** Headers (JSON) */
	headerParametersJson?: string | object;
}

export interface KeapToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'company'
		| 'contact'
		| 'contactNote'
		| 'contactTag'
		| 'ecommerceOrder'
		| 'ecommerceProduct'
		| 'email'
		| 'file'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Company Name */
	companyName?: string;
	/** Addresses */
	addressesUi?: Record<string, unknown>;
	/** Faxes */
	faxesUi?: Record<string, unknown>;
	/** Phones */
	phonesUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Duplicate Option */
	duplicateOption?: 'email' | 'emailAndName';
	/** Emails */
	emailsUi?: Record<string, unknown>;
	/** Social Accounts */
	socialAccountsUi?: Record<string, unknown>;
	/** Contact ID */
	contactId?: string;
	/** User Name or ID */
	userId?: string;
	/** Note ID */
	noteId?: string;
	/** Tag Names or IDs */
	tagIds?: unknown;
	/** Order Date */
	orderDate?: string;
	/** Order Title */
	orderTitle?: string;
	/** Order Type */
	orderType?: 'offline' | 'online';
	/** Shipping Address */
	addressUi?: Record<string, unknown>;
	/** Order Items */
	orderItemsUi?: Record<string, unknown>;
	/** Order ID */
	orderId?: string;
	/** Product Name */
	productName?: string;
	/** Product ID */
	productId?: string;
	/** Sent To Address */
	sentToAddress?: string;
	/** Sent From Address */
	sentFromAddress?: string;
	/** Contact IDs */
	contactIds?: string;
	/** Subject */
	subject?: string;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
	/** Binary File */
	binaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File Association */
	fileAssociation?: 'company' | 'contact' | 'user';
	/** File Name */
	fileName?: string;
	/** File Data */
	fileData?: string;
	/** Is Public */
	isPublic?: boolean;
	/** File ID */
	fileId?: string;
}

export interface KitemakerToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'organization' | 'space' | 'user' | 'workItem';
	/** Operation */
	operation?: 'get';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Space Name or ID */
	spaceId?: string;
	/** Status Name or ID */
	statusId?: string;
	/** Work Item ID */
	workItemId?: string;
}

export interface KoBoToolboxToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'file' | 'form' | 'hook' | 'submission' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'redeploy' | '__CUSTOM_API_CALL__';
	/** Form Name or ID */
	formId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Hook ID */
	hookId?: string;
	/** Hook Log ID */
	logId?: string;
	/** Log Status */
	status?: '' | '0' | '1' | '2';
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Submission ID */
	submissionId?: string;
	/** Validation Status */
	validationStatus?:
		| 'validation_status_approved'
		| 'validation_status_not_approved'
		| 'validation_status_on_hold';
	/** Filter */
	filterType?: 'none' | 'json';
	/** See <a href="https://github.com/SEL-Columbia/formhub/wiki/Formhub-Access-Points-(API)#api-parameters" target="_blank">Formhub API docs</a> to creating filters, using the MongoDB JSON format - e.g. {"_submission_time":{"$lt":"2021-10-01T01:02:03"}} */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** File ID */
	fileId?: string;
	/** Property Name */
	binaryPropertyName?: string;
	/** Download File Content */
	download?: boolean;
	/** File Upload Mode */
	fileMode?: 'binary' | 'url';
	/** File URL */
	fileUrl?: string;
}

export interface LdapToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'compare' | 'create' | 'delete' | 'rename' | 'search' | 'update';
	/** Debug */
	nodeDebug?: boolean;
	/** DN */
	dn?: string;
	/** Attribute ID */
	id?: string;
	/** Value */
	value?: string;
	/** New DN */
	targetDn?: string;
	/** Attributes */
	attributes?: Record<string, unknown>;
	/** Base DN */
	baseDN?: string;
	/** Search For */
	searchFor?: string;
	/** Custom Filter */
	customFilter?: string;
	/** Attribute */
	attribute?: string;
	/** Search Text */
	searchText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface LemlistToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'activity'
		| 'campaign'
		| 'enrich'
		| 'lead'
		| 'team'
		| 'unsubscribe'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getAll' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Start Date */
	startDate?: string;
	/** End Date */
	endDate?: string;
	/** Timezone */
	timezone?: string;
	/** Enrichment ID */
	enrichId?: string;
	/** Lead ID */
	leadId?: string;
	/** Find Email */
	findEmail?: boolean;
	/** Verify Email */
	verifyEmail?: boolean;
	/** LinkedIn Enrichment */
	linkedinEnrichment?: boolean;
	/** Find Phone */
	findPhone?: boolean;
	/** Email */
	email?: string;
}

export interface LineToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** End of service: LINE Notify will be discontinued from April 1st 2025, You can find more information <a href="https://notify-bot.line.me/closing-announce" target="_blank">here</a> */
	notice?: unknown;
	/** Resource */
	resource?: 'notification' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** Message */
	message?: string;
}

export interface LinearToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'comment' | 'issue' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'addComment' | '__CUSTOM_API_CALL__';
	/** Issue ID */
	issueId?: string;
	/** Comment */
	comment?: string;
	/** Team Name or ID */
	teamId?: string;
	/** Title */
	title?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Link */
	link?: string;
}

export interface LingvaNexToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'translate';
	/** Text */
	text?: string;
	/** Translate To */
	translateTo?: string;
}

export interface LinkedInToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'standard' | 'communityManagement';
	/** Resource */
	resource?: 'post' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Post As */
	postAs?: 'person' | 'organization';
	/** Person Name or ID */
	person?: string;
	/** Organization URN */
	organization?: string;
	/** Text */
	text?: string;
	/** Media Category */
	shareMediaCategory?: 'NONE' | 'ARTICLE' | 'IMAGE';
	/** Input Binary Field */
	binaryPropertyName?: string;
}

export interface LoneScaleToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'list' | 'item' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Type */
	type?: 'COMPANY' | 'PEOPLE';
	/** List Name or ID */
	list?: string;
	/** First Name */
	first_name?: string;
	/** Last Name */
	last_name?: string;
	/** Company Name */
	company_name?: string;
	/** Additional Fields */
	peopleAdditionalFields?: Record<string, unknown>;
	/** Additional Fields */
	companyAdditionalFields?: Record<string, unknown>;
	/** Name */
	name?: string;
}

export interface Magento2ToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'customer' | 'invoice' | 'order' | 'product' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Customer ID */
	customerId?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Website Name or ID */
	website_id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://devdocs.magento.com/guides/v2.4/rest/performing-searches.html" target="_blank">Magento guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** Order ID */
	orderId?: string;
	/** SKU */
	sku?: string;
	/** Name */
	name?: string;
	/** Attribute Set Name or ID */
	attributeSetId?: string;
	/** Price */
	price?: number;
}

export interface MailcheckToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'email';
	/** Operation */
	operation?: 'check';
	/** Email */
	email?: string;
}

export interface MailchimpToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'campaign' | 'listGroup' | 'member' | 'memberTag' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** List Name or ID */
	list?: string;
	/** Email */
	email?: string;
	/** Status */
	status?: 'cleaned' | 'pending' | 'subscribed' | 'transactional' | 'unsubscribed';
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Location */
	locationFieldsUi?: Record<string, unknown>;
	/** Merge Fields */
	mergeFieldsUi?: Record<string, unknown>;
	/** Merge Fields */
	mergeFieldsJson?: string | object;
	/** Location */
	locationJson?: string | object;
	/** Interest Groups */
	groupsUi?: Record<string, unknown>;
	/** Interest Groups */
	groupJson?: string | object;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Tags */
	tags?: string;
	/** Group Category Name or ID */
	groupCategory?: string;
	/** Campaign ID */
	campaignId?: string;
}

export interface MailerLiteToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'subscriber';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update';
	/** Email */
	email?: string;
	/** Subscriber Email */
	subscriberId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface MailgunToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** Cc Email */
	ccEmail?: string;
	/** Bcc Email */
	bccEmail?: string;
	/** Subject */
	subject?: string;
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** Attachments */
	attachments?: string;
}

export interface MailjetToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'email' | 'sms' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | 'sendTemplate' | '__CUSTOM_API_CALL__';
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** Subject */
	subject?: string;
	/** Text */
	text?: string;
	/** HTML */
	html?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Variables (JSON) */
	variablesJson?: string;
	/** Variables */
	variablesUi?: Record<string, unknown>;
	/** Template Name or ID */
	templateId?: string;
	/** From */
	from?: string;
	/** To */
	to?: string;
}

export interface MandrillToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'message';
	/** Operation */
	operation?: 'sendTemplate' | 'sendHtml';
	/** Template Name or ID */
	template?: string;
	/** From Email */
	fromEmail?: string;
	/** To Email */
	toEmail?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Merge Vars */
	mergeVarsJson?: string | object;
	/** Merge Vars */
	mergeVarsUi?: Record<string, unknown>;
	/** Metadata */
	metadataUi?: Record<string, unknown>;
	/** Metadata */
	metadataJson?: string | object;
	/** Attachments */
	attachmentsJson?: string | object;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
	/** Headers */
	headersJson?: string | object;
	/** Headers */
	headersUi?: Record<string, unknown>;
}

export interface MarketstackToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'endOfDayData' | 'exchange' | 'ticker';
	/** Operation */
	operation?: 'getAll';
	/** Ticker */
	symbols?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Exchange */
	exchange?: string;
	/** Ticker */
	symbol?: string;
}

export interface MatrixToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'account' | 'event' | 'media' | 'message' | 'room' | 'roomMember';
	/** Operation */
	operation?: 'me';
	/** Room ID */
	roomId?: string;
	/** Event ID */
	eventId?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Media Type */
	mediaType?: 'file' | 'image' | 'audio' | 'video';
	/** Text */
	text?: string;
	/** Message Type */
	messageType?: 'm.emote' | 'm.notice' | 'm.text';
	/** Message Format */
	messageFormat?: 'plain' | 'org.matrix.custom.html';
	/** Fallback Text */
	fallbackText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Other Options */
	otherOptions?: Record<string, unknown>;
	/** Room Name */
	roomName?: string;
	/** Preset */
	preset?: 'private_chat' | 'public_chat';
	/** Room Alias */
	roomAlias?: string;
	/** Room ID or Alias */
	roomIdOrAlias?: string;
	/** User ID */
	userId?: string;
	/** Reason */
	reason?: string;
}

export interface MattermostToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'channel' | 'message' | 'reaction' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addUser'
		| 'create'
		| 'delete'
		| 'members'
		| 'restore'
		| 'search'
		| 'statistics'
		| '__CUSTOM_API_CALL__';
	/** Team Name or ID */
	teamId?: string;
	/** Display Name */
	displayName?: string;
	/** Name */
	channel?: string;
	/** Type */
	type?: 'private' | 'public';
	/** Channel Name or ID */
	channelId?: string;
	/** Resolve Data */
	resolveData?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** User Name or ID */
	userId?: string;
	/** Search Term */
	term?: string;
	/** Post ID */
	postId?: string;
	/** Message */
	message?: string;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Other Options */
	otherOptions?: Record<string, unknown>;
	/** Emoji Name */
	emojiName?: string;
	/** Username */
	username?: string;
	/** Auth Service */
	authService?: 'email' | 'gitlab' | 'google' | 'ldap' | 'office365' | 'saml';
	/** Auth Data */
	authData?: string;
	/** Email */
	email?: string;
	/** Password */
	password?: string;
	/** User IDs */
	userIds?: string;
	/** Emails */
	emails?: string;
}

export interface MauticToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'credentials' | 'oAuth2';
	/** Resource */
	resource?:
		| 'campaignContact'
		| 'company'
		| 'companyContact'
		| 'contact'
		| 'contactSegment'
		| 'segmentEmail'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Company Name */
	name?: string;
	/** Simplify */
	simple?: boolean;
	/** Company ID */
	companyId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Email */
	email?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Primary Company Name or ID */
	company?: string;
	/** Position */
	position?: string;
	/** Title */
	title?: string;
	/** Body */
	bodyJson?: string | object;
	/** Contact ID */
	contactId?: string;
	/** Action */
	action?: 'add' | 'remove';
	/** Channel */
	channel?: 'email' | 'sms';
	/** Points */
	points?: number;
	/** Campaign Email Name or ID */
	campaignEmailId?: string;
	/** Segment Name or ID */
	segmentId?: string;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Segment Email Name or ID */
	segmentEmailId?: string;
}

export interface MediumToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'post' | 'publication' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** Publication */
	publication?: boolean;
	/** Publication Name or ID */
	publicationId?: string;
	/** Title */
	title?: string;
	/** Content Format */
	contentFormat?: 'html' | 'markdown';
	/** Content */
	content?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface MessageBirdToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'sms' | 'balance';
	/** Operation */
	operation?: 'send';
	/** From */
	originator?: string;
	/** To */
	recipients?: string;
	/** Message */
	message?: string;
}

export interface MetabaseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'alerts' | 'databases' | 'metrics' | 'questions' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'resultData' | '__CUSTOM_API_CALL__';
	/** Question ID */
	questionId?: string;
	/** Format */
	format?: 'csv' | 'json' | 'xlsx';
	/** Metric ID */
	metricId?: string;
	/** Database ID */
	databaseId?: string;
	/** Engine */
	engine?: 'h2' | 'mongo' | 'mysql' | 'postgres' | 'redshift' | 'sqlite';
	/** Host */
	host?: string;
	/** Name */
	name?: string;
	/** Port */
	port?: number;
	/** User */
	user?: string;
	/** Password */
	password?: string;
	/** Database Name */
	dbName?: string;
	/** File Path */
	filePath?: string;
	/** Full Sync */
	fullSync?: boolean;
	/** Simplify */
	simple?: boolean;
	/** Alert ID */
	alertId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftDynamicsCrmToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'account';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	name?: string;
	/** Account ID */
	accountId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface MicrosoftEntraToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'group' | 'user';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Group Type */
	groupType?: 'Unified' | '';
	/** Group Name */
	displayName?: string;
	/** Group Email Address */
	mailNickname?: string;
	/** Mail Enabled */
	mailEnabled?: boolean;
	/** Membership Type */
	membershipType?: '' | 'DynamicMembership';
	/** Security Enabled */
	securityEnabled?: boolean;
	/** Group to Delete */
	group?: unknown;
	/** Output */
	output?: 'simple' | 'raw' | 'fields';
	/** Fields */
	fields?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filter */
	filter?: string;
	/** User to Add */
	user?: unknown;
	/** Account Enabled */
	accountEnabled?: boolean;
	/** User Principal Name */
	userPrincipalName?: string;
	/** Password */
	password?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftExcelToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** This node connects to the Microsoft 365 cloud platform. Use the 'Extract from File' and 'Convert to File' nodes to directly manipulate spreadsheet files (.xls, .csv, etc). <a href="https://n8n.io/workflows/890-read-in-an-excel-spreadsheet-file/" target="_blank">More info</a>. */
	notice?: unknown;
	/** Resource */
	resource?: 'table' | 'workbook' | 'worksheet';
	/** Operation */
	operation?:
		| 'append'
		| 'convertToRange'
		| 'addTable'
		| 'deleteTable'
		| 'getColumns'
		| 'getRows'
		| 'lookup';
	/** Workbook */
	workbook?: unknown;
	/** Sheet */
	worksheet?: unknown;
	/** Table */
	table?: unknown;
	/** Data Mode */
	dataMode?: 'autoMap' | 'define' | 'raw';
	/** Data */
	data?: string | object;
	/** Values to Send */
	fieldsUi?: Record<string, unknown>;
	/** Select Range */
	selectRange?: 'auto' | 'manual';
	/** Range */
	range?: string;
	/** Has Headers */
	hasHeaders?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** RAW Data */
	rawData?: boolean;
	/** Data Property */
	dataProperty?: string;
	/** Lookup Column */
	lookupColumn?: string;
	/** Lookup Value */
	lookupValue?: string;
	/** Apply To */
	applyTo?: 'All' | 'Formats' | 'Contents';
	/** Select a Range */
	useRange?: boolean;
	/** Header Row */
	keyRow?: number;
	/** First Data Row */
	dataStartRow?: number;
	/** Column to match on */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
}

export interface MicrosoftGraphSecurityToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'secureScore' | 'secureScoreControlProfile';
	/** Operation */
	operation?: 'get' | 'getAll';
	/** Secure Score ID */
	secureScoreId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Secure Score Control Profile ID */
	secureScoreControlProfileId?: string;
	/** Provider */
	provider?: string;
	/** Vendor */
	vendor?: string;
}

export interface MicrosoftOneDriveToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'file' | 'folder';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'get' | 'rename' | 'search' | 'share' | 'upload';
	/** File ID */
	fileId?: string;
	/** Parent Reference */
	parentReference?: Record<string, unknown>;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Item ID */
	itemId?: string;
	/** New Name */
	newName?: string;
	/** Query */
	query?: string;
	/** Type */
	type?: 'view' | 'edit' | 'embed';
	/** Scope */
	scope?: 'anonymous' | 'organization';
	/** File Name */
	fileName?: string;
	/** Parent ID */
	parentId?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Name */
	name?: string;
	/** Folder ID */
	folderId?: string;
}

export interface MicrosoftOutlookToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'calendar'
		| 'contact'
		| 'draft'
		| 'event'
		| 'folder'
		| 'folderMessage'
		| 'message'
		| 'messageAttachment';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	name?: string;
	/** Calendar */
	calendarId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** First Name */
	givenName?: string;
	/** Last Name */
	surname?: string;
	/** Contact */
	contactId?: unknown;
	/** Output */
	output?: 'simple' | 'raw' | 'fields';
	/** Fields */
	fields?: unknown;
	/** Subject */
	subject?: string;
	/** Message */
	bodyContent?: string;
	/** Draft */
	draftId?: unknown;
	/** To */
	to?: string;
	/** Start */
	startDateTime?: string;
	/** End */
	endDateTime?: string;
	/** Event */
	eventId?: unknown;
	/** From All Calendars */
	fromAllCalendars?: boolean;
	/** Name */
	displayName?: string;
	/** Folder */
	folderId?: unknown;
	/** Fetching a lot of messages may take a long time. Consider using filters to speed things up */
	filtersNotice?: unknown;
	/** Filters */
	filtersUI?: Record<string, unknown>;
	/** Message */
	messageId?: unknown;
	/** Reply to Sender Only */
	replyToSenderOnly?: boolean;
	/** Message */
	message?: string;
	/** To */
	toRecipients?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Input Data Field Name */
	binaryPropertyName?: string;
	/** Attachment */
	attachmentId?: unknown;
}

export interface MicrosoftSharePointToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'file' | 'item' | 'list';
	/** Operation */
	operation?: 'download' | 'update' | 'upload';
	/** Site */
	site?: unknown;
	/** Parent Folder */
	folder?: unknown;
	/** File */
	file?: unknown;
	/** Updated File Name */
	fileName?: string;
	/** Change File Content */
	changeFileContent?: boolean;
	/** Updated File Contents */
	fileContents?: string;
	/** List */
	list?: unknown;
	/** Due to API restrictions, the following column types cannot be updated: Hyperlink, Location, Metadata */
	noticeUnsupportedFields?: unknown;
	/** Columns */
	columns?: unknown;
	/** Item */
	item?: unknown;
	/** Simplify */
	simplify?: boolean;
	/** Filter by Formula */
	filter?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface MicrosoftSqlToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update' | 'delete';
	/** Query */
	query?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Delete Key */
	deleteKey?: string;
}

export interface MicrosoftTeamsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'channel' | 'channelMessage' | 'chatMessage' | 'task';
	/** Operation */
	operation?: 'create' | 'deleteChannel' | 'get' | 'getAll' | 'update';
	/** Team */
	teamId?: unknown;
	/** New Channel Name */
	name?: string;
	/** Channel */
	channelId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Content Type */
	contentType?: 'text' | 'html';
	/** Message */
	message?: string;
	/** Chat */
	chatId?: unknown;
	/** Message ID */
	messageId?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Team */
	groupId?: unknown;
	/** Plan */
	planId?: unknown;
	/** Bucket */
	bucketId?: unknown;
	/** Title */
	title?: string;
	/** Task ID */
	taskId?: string;
	/** Tasks For */
	tasksFor?: 'member' | 'plan';
}

export interface MicrosoftToDoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'linkedResource' | 'list' | 'task';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Task List Name or ID */
	taskListId?: string;
	/** Task ID */
	taskId?: string;
	/** Name */
	displayName?: string;
	/** Application Name */
	applicationName?: string;
	/** Linked Resource ID */
	linkedResourceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Subject */
	title?: string;
	/** List ID */
	listId?: string;
}

export interface MispToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'attribute'
		| 'event'
		| 'eventTag'
		| 'feed'
		| 'galaxy'
		| 'noticelist'
		| 'object'
		| 'organisation'
		| 'tag'
		| 'user'
		| 'warninglist'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'search' | 'update' | '__CUSTOM_API_CALL__';
	/** Event UUID */
	eventId?: string;
	/** Type */
	type?: 'text' | 'url' | 'comment';
	/** Value */
	value?: string;
	/** Attribute ID */
	attributeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Use JSON to Specify Fields */
	useJson?: boolean;
	/** JSON */
	jsonOutput?: string | object;
	/** Organization Name or ID */
	org_id?: string;
	/** Information */
	information?: string;
	/** Tag Name or ID */
	tagId?: string;
	/** Name */
	name?: string;
	/** Provider */
	provider?: string;
	/** URL */
	url?: string;
	/** Feed ID */
	feedId?: string;
	/** Galaxy ID */
	galaxyId?: string;
	/** Noticelist ID */
	noticelistId?: string;
	/** Organisation ID */
	organisationId?: string;
	/** Email */
	email?: string;
	/** Role ID */
	role_id?: string;
	/** User ID */
	userId?: string;
	/** Warninglist ID */
	warninglistId?: string;
}

export interface MistralAiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'document' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'extractText' | '__CUSTOM_API_CALL__';
	/** Model */
	model?: 'mistral-ocr-latest';
	/** Document Type */
	documentType?: 'document_url' | 'image_url';
	/** Input Type */
	inputType?: 'binary' | 'url';
	/** Input Binary Field */
	binaryProperty?: string;
	/** URL */
	url?: string;
}

export interface MoceanToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'sms' | 'voice';
	/** Operation */
	operation?: 'send';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Language */
	language?: 'cmn-CN' | 'en-GB' | 'en-US' | 'ja-JP' | 'ko-KR';
	/** Message */
	message?: string;
}

export interface MondayComToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'board' | 'boardColumn' | 'boardGroup' | 'boardItem' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'archive' | 'create' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Board Name or ID */
	boardId?: string;
	/** Name */
	name?: string;
	/** Kind */
	kind?: 'share' | 'public' | 'private';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Column Type */
	columnType?:
		| 'checkbox'
		| 'country'
		| 'date'
		| 'dropdown'
		| 'email'
		| 'hour'
		| 'Link'
		| 'longText'
		| 'numbers'
		| 'people'
		| 'person'
		| 'phone'
		| 'rating'
		| 'status'
		| 'tags'
		| 'team'
		| 'text'
		| 'timeline'
		| 'timezone'
		| 'week'
		| 'worldClock';
	/** Group Name or ID */
	groupId?: string;
	/** Item ID */
	itemId?: string;
	/** Update Text */
	value?: string;
	/** Column Name or ID */
	columnId?: string;
	/** Column Values */
	columnValues?: string | object;
	/** Column Value */
	columnValue?: string;
}

export interface MongoDbToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'searchIndexes' | 'document';
	/** Operation */
	operation?:
		| 'aggregate'
		| 'delete'
		| 'find'
		| 'findOneAndReplace'
		| 'findOneAndUpdate'
		| 'insert'
		| 'update';
	/** Collection */
	collection?: string;
	/** Query */
	query?: string | object;
	/** Fields */
	fields?: string;
	/** Update Key */
	updateKey?: string;
	/** Upsert */
	upsert?: boolean;
	/** Index Name */
	indexName?: string;
	/** Index Name */
	indexNameRequired?: string;
	/** Index Definition */
	indexDefinition?: string | object;
	/** Index Type */
	indexType?: 'vectorSearch' | 'search';
}

export interface MonicaCrmToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'activity'
		| 'call'
		| 'contact'
		| 'contactField'
		| 'contactTag'
		| 'conversation'
		| 'conversationMessage'
		| 'journalEntry'
		| 'note'
		| 'reminder'
		| 'tag'
		| 'task';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Activity Type Name or ID */
	activityTypeId?: string;
	/** Contacts */
	contacts?: string;
	/** Happened At */
	happenedAt?: string;
	/** Summary */
	summary?: string;
	/** Activity ID */
	activityId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Contact ID */
	contactId?: string;
	/** Called At */
	calledAt?: string;
	/** Description */
	content?: string;
	/** Call ID */
	callId?: string;
	/** First Name */
	firstName?: string;
	/** Gender Name or ID */
	genderId?: string;
	/** Contact Field Type Name or ID */
	contactFieldTypeId?: string;
	/** Content */
	data?: string;
	/** Contact Field ID */
	contactFieldId?: string;
	/** Tag Names or IDs */
	tagsToAdd?: unknown;
	/** Tag Names or IDs */
	tagsToRemove?: unknown;
	/** Conversation ID */
	conversationId?: string;
	/** Written At */
	writtenAt?: string;
	/** Written By */
	writtenByMe?: true | false;
	/** Message ID */
	messageId?: string;
	/** Title */
	title?: string;
	/** Content */
	post?: string;
	/** Journal Entry ID */
	journalId?: string;
	/** Body */
	body?: string;
	/** Note ID */
	noteId?: string;
	/** Frequency Type */
	frequencyType?: 'one_time' | 'week' | 'month' | 'year';
	/** Recurring Interval */
	frequencyNumber?: number;
	/** Initial Date */
	initialDate?: string;
	/** Reminder ID */
	reminderId?: string;
	/** Name */
	name?: string;
	/** Tag ID */
	tagId?: string;
	/** Task ID */
	taskId?: string;
}

export interface MqttToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Topic */
	topic?: string;
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
}

export interface Msg91ToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'sms';
	/** Operation */
	operation?: 'send';
	/** Sender ID */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
}

export interface MySqlToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'deleteTable' | 'executeQuery' | 'insert' | 'upsert' | 'select' | 'update';
	/** Table */
	table?: unknown;
	/** Command */
	deleteCommand?: 'truncate' | 'delete' | 'drop';
	/** Select Rows */
	where?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
	/** Query */
	query?: string;
	/** Data Mode */
	dataMode?: 'autoMapInputData' | 'defineBelow';
	/** 
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		 */
	notice?: unknown;
	/** Values to Send */
	valuesToSend?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Column to Match On */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
}

export interface NasaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'asteroidNeoBrowse'
		| 'asteroidNeoFeed'
		| 'asteroidNeoLookup'
		| 'astronomyPictureOfTheDay'
		| 'donkiCoronalMassEjection'
		| 'donkiHighSpeedStream'
		| 'donkiInterplanetaryShock'
		| 'donkiMagnetopauseCrossing'
		| 'donkiNotifications'
		| 'donkiRadiationBeltEnhancement'
		| 'donkiSolarEnergeticParticle'
		| 'donkiSolarFlare'
		| 'donkiWsaEnlilSimulation'
		| 'earthAssets'
		| 'earthImagery';
	/** Operation */
	operation?: 'get';
	/** Asteroid ID */
	asteroidId?: string;
	/** Download Image */
	download?: boolean;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Latitude */
	lat?: number;
	/** Longitude */
	lon?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface NetlifyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'deploy' | 'site' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'cancel' | 'create' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Site Name or ID */
	siteId?: string;
	/** Deploy ID */
	deployId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface NextCloudToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'file' | 'folder' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'copy' | 'delete' | 'download' | 'move' | 'share' | 'upload' | '__CUSTOM_API_CALL__';
	/** From Path */
	path?: string;
	/** To Path */
	toPath?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
	/** Binary File */
	binaryDataUpload?: boolean;
	/** File Content */
	fileContent?: string;
	/** Share Type */
	shareType?: 7 | 4 | 1 | 3 | 0;
	/** Circle ID */
	circleId?: string;
	/** Email */
	email?: string;
	/** Group ID */
	groupId?: string;
	/** User */
	user?: string;
	/** Username */
	userId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface NocoDbToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'nocoDbApiToken' | 'nocoDb';
	/** API Version */
	version?: 1 | 2 | 3;
	/** Resource */
	resource?: 'row' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Base Name or ID */
	projectId?: string;
	/** Table Name or ID */
	table?: string;
	/** Primary Key Type */
	primaryKey?: 'id' | 'ncRecordId' | 'custom';
	/** Field Name */
	customPrimaryKey?: string;
	/** Row ID Value */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Download Attachments */
	downloadAttachments?: boolean;
	/** Download Fields */
	downloadFieldNames?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** In this mode, make sure the incoming data fields are named the same as the columns in NocoDB. (Use an 'Edit Fields' node before this node to change them if required.) */
	info?: unknown;
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
}

export interface SendInBlueToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'attribute' | 'email' | 'sender' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'update' | 'delete' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Category */
	attributeCategory?: 'calculated' | 'category' | 'global' | 'normal' | 'transactional';
	/** Name */
	attributeName?: string;
	/** Type */
	attributeType?: 'boolean' | 'date' | 'float' | 'text';
	/** Value */
	attributeValue?: string;
	/** Contact Attribute List */
	attributeCategoryList?: Record<string, unknown>;
	/** Category */
	updateAttributeCategory?: 'calculated' | 'category' | 'global';
	/** Name */
	updateAttributeName?: string;
	/** Value */
	updateAttributeValue?: string;
	/** Update Fields */
	updateAttributeCategoryList?: Record<string, unknown>;
	/** Category */
	deleteAttributeCategory?: 'calculated' | 'category' | 'global' | 'normal' | 'transactional';
	/** Name */
	deleteAttributeName?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
	/** Sender ID */
	id?: string;
	/** Contact Attributes */
	createContactAttributes?: Record<string, unknown>;
	/** Contact Identifier */
	identifier?: string;
	/** Attributes */
	updateAttributes?: Record<string, unknown>;
	/** Contact Attributes */
	upsertAttributes?: Record<string, unknown>;
	/** Send HTML */
	sendHTML?: boolean;
	/** Subject */
	subject?: string;
	/** Text Content */
	textContent?: string;
	/** HTML Content */
	htmlContent?: string;
	/** Sender */
	sender?: string;
	/** Receipients */
	receipients?: string;
	/** Template ID */
	templateId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface OnfleetToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'admin'
		| 'container'
		| 'destination'
		| 'hub'
		| 'organization'
		| 'recipient'
		| 'task'
		| 'team'
		| 'worker';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update';
	/** Admin ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Email */
	email?: string;
	/** Container Type */
	containerType?: 'organizations' | 'teams' | 'workers';
	/** Container ID */
	containerId?: string;
	/** Insert Type */
	type?: -1 | 0 | 1;
	/** Index */
	index?: number;
	/** Task IDs */
	tasks?: string;
	/** Unparsed Address */
	unparsed?: boolean;
	/** Destination Address */
	address?: string;
	/** Number */
	addressNumber?: string;
	/** Street */
	addressStreet?: string;
	/** City */
	addressCity?: string;
	/** Country */
	addressCountry?: string;
	/** Destination */
	destination?: Record<string, unknown>;
	/** Get By */
	getBy?: 'id' | 'phone' | 'name';
	/** Phone */
	phone?: string;
	/** Recipient Name */
	recipientName?: string;
	/** Recipient Phone */
	recipientPhone?: string;
	/** Complete as a Success */
	success?: boolean;
	/** Override Fields */
	overrideFields?: Record<string, unknown>;
	/** Worker Names or IDs */
	workers?: unknown;
	/** Administrator Names or IDs */
	managers?: unknown;
	/** Search by Location */
	byLocation?: boolean;
	/** Team Names or IDs */
	teams?: unknown;
	/** Longitude */
	longitude?: number;
	/** Latitude */
	latitude?: number;
	/** Schedule */
	schedule?: Record<string, unknown>;
}

export interface NotionToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access. */
	notionNotice?: unknown;
	Credentials?: unknown;
	/** Resource */
	resource?: 'block' | 'database' | 'databasePage' | 'page' | 'user';
	/** Operation */
	operation?: 'append' | 'getAll';
	/** Block */
	blockId?: unknown;
	/** Blocks */
	blockUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Also Fetch Nested Blocks */
	fetchNestedBlocks?: boolean;
	/** Simplify Output */
	simplifyOutput?: boolean;
	/** Database */
	databaseId?: unknown;
	/** Simplify */
	simple?: boolean;
	/** Search Text */
	text?: string;
	/** Title */
	title?: string;
	/** Properties */
	propertiesUi?: Record<string, unknown>;
	/** Database Page */
	pageId?: unknown;
	/** Filter */
	filterType?: 'none' | 'manual' | 'json';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://developers.notion.com/reference/post-database-query#post-database-query-filter" target="_blank">Notion guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (JSON) */
	filterJson?: string;
	/** User ID */
	userId?: string;
}

export interface NpmToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'package' | 'distTag' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getMetadata' | 'getVersions' | 'search' | '__CUSTOM_API_CALL__';
	/** Package Name */
	packageName?: string;
	/** Package Version */
	packageVersion?: string;
	/** Query */
	query?: string;
	/** Limit */
	limit?: number;
	/** Offset */
	offset?: number;
	/** Distribution Tag Name */
	distTagName?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface OdooToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'custom' | 'note' | 'opportunity';
	/** Custom Resource Name or ID */
	customResource?: string;
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Fields */
	fieldsToCreateOrUpdate?: Record<string, unknown>;
	/** Custom Resource ID */
	customResourceId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Filters */
	filterRequest?: Record<string, unknown>;
	/** Name */
	opportunityName?: string;
	/** Opportunity ID */
	opportunityId?: string;
	/** Name */
	contactName?: string;
	/** Contact ID */
	contactId?: string;
	/** Memo */
	memo?: string;
	/** Note ID */
	noteId?: string;
}

export interface OktaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** User */
	userId?: unknown;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Username */
	login?: string;
	/** Email */
	email?: string;
	/** Activate */
	activate?: boolean;
	/** Fields */
	getCreateFields?: Record<string, unknown>;
	/** Fields */
	getUpdateFields?: Record<string, unknown>;
	/** Search Query */
	searchQuery?: string;
	/** Limit */
	limit?: number;
	/** Return All */
	returnAll?: boolean;
	/** Simplify */
	simplify?: boolean;
	/** Send Email */
	sendEmail?: boolean;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface OneSimpleApiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'information' | 'socialProfile' | 'utility' | 'website';
	/** Operation */
	operation?: 'pdf' | 'seo' | 'screenshot';
	/** Webpage URL */
	link?: string;
	/** Download PDF? */
	download?: boolean;
	/** Put Output In Field */
	output?: string;
	/** QR Content */
	message?: string;
	/** Profile Name */
	profileName?: string;
	/** Artist Name */
	artistName?: string;
	/** Value */
	value?: string;
	/** From Currency */
	fromCurrency?: string;
	/** To Currency */
	toCurrency?: string;
	/** Email Address */
	emailAddress?: string;
}

export interface OpenThesaurusToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'getSynonyms';
	/** Text */
	text?: string;
}

export interface OpenWeatherMapToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'currentWeather' | '5DayForecast' | '__CUSTOM_API_CALL__';
	/** Format */
	format?: 'imperial' | 'metric' | 'standard';
	/** Location Selection */
	locationSelection?: 'cityName' | 'cityId' | 'coordinates' | 'zipCode';
	/** City */
	cityName?: string;
	/** City ID */
	cityId?: number;
	/** Latitude */
	latitude?: string;
	/** Longitude */
	longitude?: string;
	/** Zip Code */
	zipCode?: string;
	/** Language */
	language?: string;
}

export interface OracleDatabaseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'deleteTable' | 'execute' | 'insert' | 'upsert' | 'select' | 'update';
	/** Schema */
	schema?: unknown;
	/** Table */
	table?: unknown;
	/** Command */
	deleteCommand?: 'truncate' | 'delete' | 'drop';
	/** Select Rows */
	where?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
	/** Important: Single Statement mode works only for the first item */
	stmtBatchingNotice?: unknown;
	/** Statement */
	query?: string;
	/** Columns */
	columns?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
}

export interface OuraToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'profile' | 'summary' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface PaddleToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'coupon' | 'payment' | 'plan' | 'product' | 'user';
	/** Operation */
	operation?: 'create' | 'getAll' | 'update';
	/** Coupon Type */
	couponType?: 'checkout' | 'product';
	/** Product Names or IDs */
	productIds?: unknown;
	/** Discount Type */
	discountType?: 'flat' | 'percentage';
	/** Discount Amount Currency */
	discountAmount?: number;
	/** Currency */
	currency?:
		| 'ARS'
		| 'AUD'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HUF'
		| 'INR'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'NOK'
		| 'NZD'
		| 'PLN'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TWD'
		| 'USD'
		| 'ZAR';
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Product ID */
	productId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Update By */
	updateBy?: 'couponCode' | 'group';
	/** Coupon Code */
	couponCode?: string;
	/** Group */
	group?: string;
	/** Payment Name or ID */
	paymentId?: string;
	/** Date */
	date?: string;
	/** Plan ID */
	planId?: string;
}

export interface PagerDutyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'incident' | 'incidentNote' | 'logEntry' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Service Name or ID */
	serviceId?: string;
	/** Email */
	email?: string;
	/** Conference Bridge */
	conferenceBridgeUi?: Record<string, unknown>;
	/** Incident ID */
	incidentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Content */
	content?: string;
	/** Log Entry ID */
	logEntryId?: string;
	/** User ID */
	userId?: string;
}

export interface PeekalinkToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'isAvailable' | 'preview';
	/** URL */
	url?: string;
}

export interface PerplexityToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'complete' | '__CUSTOM_API_CALL__';
	/** Model */
	model?: 'sonar' | 'sonar-deep-research' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro';
	/** Messages */
	messages?: Record<string, unknown>;
	/** Simplify Output */
	simplify?: boolean;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface PhantombusterToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'agent' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getAll' | 'getOutput' | 'launch' | '__CUSTOM_API_CALL__';
	/** Agent Name or ID */
	agentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Resolve Data */
	resolveData?: boolean;
	/** JSON Parameters */
	jsonParameters?: boolean;
}

export interface PhilipsHueToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'light' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Light ID */
	lightId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** On */
	on?: boolean;
}

export interface PipedriveToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?:
		| 'activity'
		| 'deal'
		| 'dealActivity'
		| 'dealProduct'
		| 'file'
		| 'lead'
		| 'note'
		| 'organization'
		| 'person'
		| 'product'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Subject */
	subject?: string;
	/** Done */
	done?: '0' | '1';
	/** Type */
	type?: string;
	/** Activity ID */
	activityId?: number;
	/** Title */
	title?: string;
	/** Associate With */
	associateWith?: 'organization' | 'person';
	/** Organization ID */
	org_id?: number;
	/** Person ID */
	person_id?: number;
	/** Deal ID */
	dealId?: number;
	/** Product Name or ID */
	productId?: string;
	/** Item Price */
	item_price?: number;
	/** Quantity */
	quantity?: number;
	/** Product Attachment Name or ID */
	productAttachmentId?: string;
	/** Term */
	term?: string;
	/** Exact Match */
	exactMatch?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** File ID */
	fileId?: number;
	/** Organization ID */
	organization_id?: number;
	/** Lead ID */
	leadId?: string;
	/** Content */
	content?: string;
	/** Note ID */
	noteId?: number;
	/** Name */
	name?: string;
	/** Organization ID */
	organizationId?: number;
	/** Person ID */
	personId?: number;
	/** Resolve Properties */
	resolveProperties?: boolean;
	/** Encode Properties */
	encodeProperties?: boolean;
}

export interface PlivoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'call' | 'mms' | 'sms';
	/** Operation */
	operation?: 'send';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
	/** Media URLs */
	media_urls?: string;
	/** Answer Method */
	answer_method?: 'GET' | 'POST';
	/** Answer URL */
	answer_url?: string;
}

export interface PostBinToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'bin' | 'request';
	/** Operation */
	operation?: 'create' | 'get' | 'delete';
	/** Bin ID */
	binId?: string;
	/** Bin Content */
	binContent?: string;
	/** Request ID */
	requestId?: string;
	/** Request Options */
	requestOptions?: Record<string, unknown>;
}

export interface PostgresToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'deleteTable' | 'executeQuery' | 'insert' | 'upsert' | 'select' | 'update';
	/** Schema */
	schema?: unknown;
	/** Table */
	table?: unknown;
	/** Command */
	deleteCommand?: 'truncate' | 'delete' | 'drop';
	/** Restart Sequences */
	restartSequences?: boolean;
	/** Select Rows */
	where?: Record<string, unknown>;
	/** Combine Conditions */
	combineConditions?: 'AND' | 'OR';
	/** Query */
	query?: string;
	/** Data Mode */
	dataMode?: 'autoMapInputData' | 'defineBelow';
	/** 
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		 */
	notice?: unknown;
	/** Values to Send */
	valuesToSend?: Record<string, unknown>;
	/** Columns */
	columns?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Column to Match On */
	columnToMatchOn?: string;
	/** Value of Column to Match On */
	valueToMatchOn?: string;
}

export interface PostHogToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'alias' | 'event' | 'identity' | 'track';
	/** Operation */
	operation?: 'create';
	/** Alias */
	alias?: string;
	/** Distinct ID */
	distinctId?: string;
	/** Event */
	eventName?: string;
	/** Name */
	name?: string;
}

export interface ProfitWellToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'company' | 'metric';
	/** Operation */
	operation?: 'getSetting';
	/** Type */
	type?: 'daily' | 'monthly';
	/** Month */
	month?: string;
	/** Simplify */
	simple?: boolean;
}

export interface PushbulletToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'push' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Type */
	type?: 'file' | 'link' | 'note';
	/** Title */
	title?: string;
	/** Body */
	body?: string;
	/** URL */
	url?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Target */
	target?: 'channel_tag' | 'default' | 'device_iden' | 'email';
	/** Value */
	value?: string;
	/** Push ID */
	pushId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Dismissed */
	dismissed?: boolean;
}

export interface PushcutToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'notification';
	/** Operation */
	operation?: 'send';
	/** Notification Name or ID */
	notificationName?: string;
}

export interface PushoverToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'message' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'push' | '__CUSTOM_API_CALL__';
	/** User Key */
	userKey?: string;
	/** Message */
	message?: string;
	/** Priority */
	priority?: -2 | -1 | 0 | 1 | 2;
	/** Retry (Seconds) */
	retry?: number;
	/** Expire (Seconds) */
	expire?: number;
}

export interface QuestDbToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'executeQuery' | 'insert';
	/** Query */
	query?: string;
	/** Schema */
	schema?: unknown;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface QuickbaseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'field' | 'file' | 'record' | 'report';
	/** Operation */
	operation?: 'getAll';
	/** Table ID */
	tableId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Record ID */
	recordId?: string;
	/** Field ID */
	fieldId?: string;
	/** Version Number */
	versionNumber?: number;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Columns */
	columns?: string;
	/** Simplify */
	simple?: boolean;
	/** Where */
	where?: string;
	/** Update Key */
	updateKey?: string;
	/** Merge Field Name or ID */
	mergeFieldId?: string;
	/** Report ID */
	reportId?: string;
}

export interface QuickbooksToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'bill'
		| 'customer'
		| 'employee'
		| 'estimate'
		| 'invoice'
		| 'item'
		| 'payment'
		| 'purchase'
		| 'transaction'
		| 'vendor'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** For Vendor Name or ID */
	VendorRef?: string;
	/** Line */
	Line?: Record<string, unknown>;
	/** Bill ID */
	billId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Display Name */
	displayName?: string;
	/** Customer ID */
	customerId?: string;
	/** Family Name */
	FamilyName?: string;
	/** Given Name */
	GivenName?: string;
	/** Employee ID */
	employeeId?: string;
	/** For Customer Name or ID */
	CustomerRef?: string;
	/** Estimate ID */
	estimateId?: string;
	/** Download */
	download?: boolean;
	/** Put Output File in Field */
	binaryProperty?: string;
	/** File Name */
	fileName?: string;
	/** Email */
	email?: string;
	/** Invoice ID */
	invoiceId?: string;
	/** Item ID */
	itemId?: string;
	/** Total Amount */
	TotalAmt?: number;
	/** Payment ID */
	paymentId?: string;
	/** Purchase ID */
	purchaseId?: string;
	/** Simplify */
	simple?: boolean;
	/** Vendor ID */
	vendorId?: string;
}

export interface QuickChartToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Chart Type */
	chartType?: 'bar' | 'doughnut' | 'line' | 'pie' | 'polarArea';
	/** Add Labels */
	labelsMode?: 'manually' | 'array';
	/** Labels */
	labelsUi?: Record<string, unknown>;
	/** Labels Array */
	labelsArray?: string;
	/** Data */
	data?: string | object;
	/** Put Output In Field */
	output?: string;
	/** Chart Options */
	chartOptions?: Record<string, unknown>;
	/** Dataset Options */
	datasetOptions?: Record<string, unknown>;
}

export interface RabbitmqToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Will delete an item from the queue triggered earlier in the workflow by a RabbitMQ Trigger node */
	deleteMessage?: unknown;
	/** Mode */
	mode?: 'queue' | 'exchange';
	/** Queue / Topic */
	queue?: string;
	/** Exchange */
	exchange?: string;
	/** Type */
	exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout';
	/** Routing Key */
	routingKey?: string;
	/** Send Input Data */
	sendInputData?: boolean;
	/** Message */
	message?: string;
}

export interface RaindropToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'bookmark' | 'collection' | 'tag' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Collection Name or ID */
	collectionId?: string;
	/** Link */
	link?: string;
	/** Bookmark ID */
	bookmarkId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Type */
	type?: 'parent' | 'children';
	/** Tags */
	tags?: string;
	/** Self */
	self?: boolean;
	/** User ID */
	userId?: string;
}

export interface RedditToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'post' | 'postComment' | 'profile' | 'subreddit' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'getAll' | 'delete' | 'reply' | '__CUSTOM_API_CALL__';
	/** Post ID */
	postId?: string;
	/** Comment Text */
	commentText?: string;
	/** Subreddit */
	subreddit?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Comment ID */
	commentId?: string;
	/** Reply Text */
	replyText?: string;
	/** Details */
	details?: 'blockedUsers' | 'friends' | 'identity' | 'karma' | 'prefs' | 'saved' | 'trophies';
	/** Content */
	content?: 'about' | 'rules';
	/** Kind */
	kind?: 'self' | 'link' | 'image';
	/** Title */
	title?: string;
	/** URL */
	url?: string;
	/** Text */
	text?: string;
	/** Resubmit */
	resubmit?: boolean;
	/** Location */
	location?: 'allReddit' | 'subreddit';
	/** Keyword */
	keyword?: string;
	/** Username */
	username?: string;
}

export interface RedisToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'delete' | 'get' | 'incr' | 'info' | 'keys' | 'pop' | 'publish' | 'push' | 'set';
	/** Key */
	key?: string;
	/** Name */
	propertyName?: string;
	/** Key Type */
	keyType?: 'automatic' | 'hash' | 'list' | 'sets' | 'string';
	/** Expire */
	expire?: boolean;
	/** TTL */
	ttl?: number;
	/** Key Pattern */
	keyPattern?: string;
	/** Get Values */
	getValues?: boolean;
	/** Value */
	value?: string;
	/** Value Is JSON */
	valueIsJSON?: boolean;
	/** Channel */
	channel?: string;
	/** Data */
	messageData?: string;
	/** List */
	list?: string;
	/** Tail */
	tail?: boolean;
}

export interface RocketchatToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'chat' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'postMessage' | '__CUSTOM_API_CALL__';
	/** Channel */
	channel?: string;
	/** Text */
	text?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Attachments */
	attachmentsJson?: string | object;
}

export interface RssFeedReadToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** URL */
	url?: string;
}

export interface RundeckToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'job' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'execute' | 'getMetadata' | '__CUSTOM_API_CALL__';
	/** Job ID */
	jobid?: string;
	/** Arguments */
	arguments?: Record<string, unknown>;
	/** Filter */
	filter?: string;
}

export interface S3ToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** This node is for services that use the S3 standard, e.g. Minio or Digital Ocean Spaces. For AWS S3 use the 'AWS S3' node. */
	s3StandardNotice?: unknown;
	/** Resource */
	resource?: 'bucket' | 'file' | 'folder';
	/** Operation */
	operation?: 'create' | 'delete' | 'getAll' | 'search';
	/** Name */
	name?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Bucket Name */
	bucketName?: string;
	/** Folder Name */
	folderName?: string;
	/** Folder Key */
	folderKey?: string;
	/** Source Path */
	sourcePath?: string;
	/** Destination Path */
	destinationPath?: string;
	/** File Name */
	fileName?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Tags */
	tagsUi?: Record<string, unknown>;
	/** File Key */
	fileKey?: string;
}

export interface SalesforceToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'oAuth2' | 'jwt';
	/** Resource */
	resource?:
		| 'account'
		| 'attachment'
		| 'case'
		| 'contact'
		| 'customObject'
		| 'document'
		| 'flow'
		| 'lead'
		| 'opportunity'
		| 'search'
		| 'task'
		| 'user'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addToCampaign'
		| 'addNote'
		| 'create'
		| 'upsert'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'getSummary'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Match Against */
	externalId?: string;
	/** Value to Match */
	externalIdValue?: string;
	/** Company */
	company?: string;
	/** Last Name */
	lastname?: string;
	/** Lead ID */
	leadId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Campaign Name or ID */
	campaignId?: string;
	/** Title */
	title?: string;
	/** Contact ID */
	contactId?: string;
	/** Custom Object Name or ID */
	customObject?: string;
	/** Fields */
	customFieldsUi?: Record<string, unknown>;
	/** Record ID */
	recordId?: string;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Name */
	name?: string;
	/** Close Date */
	closeDate?: string;
	/** Stage Name or ID */
	stageName?: string;
	/** Opportunity ID */
	opportunityId?: string;
	/** Account ID */
	accountId?: string;
	/** Query */
	query?: string;
	/** Type Name or ID */
	type?: string;
	/** Case ID */
	caseId?: string;
	/** Status Name or ID */
	status?: string;
	/** Task ID */
	taskId?: string;
	/** Parent ID */
	parentId?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** User ID */
	userId?: string;
	/** API Name */
	apiName?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Variables */
	variablesJson?: string | object;
	/** Variables */
	variablesUi?: Record<string, unknown>;
}

export interface SalesmateToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'activity' | 'company' | 'deal';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Name */
	name?: string;
	/** Owner Name or ID */
	owner?: string;
	/** RAW Data */
	rawData?: boolean;
	/** Company ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Filters */
	filtersJson?: string | object;
	/** Title */
	title?: string;
	/** Type */
	type?: string;
	/** Primary Contact Name or ID */
	primaryContact?: string;
	/** Pipeline */
	pipeline?: 'Sales';
	/** Status */
	status?: 'Open' | 'Close' | 'Lost';
	/** Stage */
	stage?: 'New (Untouched)' | 'Contacted' | 'Qualified' | 'In Negotiation' | 'Proposal Presented';
	/** Currency */
	currency?: string;
}

export interface SeaTableTool_v2Parameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'row' | 'base' | 'link' | 'asset';
	/** Operation */
	operation?: 'create' | 'remove' | 'get' | 'list' | 'lock' | 'search' | 'unlock' | 'update';
	/** Table Name */
	tableName?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	fieldsToSend?: 'autoMapInputData' | 'defineBelow';
	/** Apply Column Default Values */
	apply_default?: boolean;
	/** In this mode, make sure the incoming data fields are named the same as the columns in SeaTable. (Use an "Edit Fields" node before this node to change them if required.) */
	notice?: unknown;
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Columns to Send */
	columnsUi?: Record<string, unknown>;
	/** Save to "Big Data" Backend */
	bigdata?: boolean;
	/** View Name */
	viewName?: string;
	/** Column Name or ID */
	searchColumn?: string;
	/** Search Term */
	searchTerm?: string;
	/** Name or email of the collaborator */
	searchString?: string;
	/** Link Column */
	linkColumn?: string;
	/** Row ID From the Source Table */
	linkColumnSourceId?: string;
	/** Row ID From the Target */
	linkColumnTargetId?: string;
	/** Column Name */
	uploadColumn?: string;
	/** Property Name */
	dataPropertyName?: string;
	/** Asset Path */
	assetPath?: string;
}

export interface SeaTableTool_v1Parameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'row';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Table Name */
	tableName?: string;
	/** Table ID */
	tableId?: string;
	/** Row ID */
	rowId?: string;
	/** Data to Send */
	fieldsToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Columns to Send */
	columnsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface SecurityScorecardToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'company' | 'industry' | 'invite' | 'portfolio' | 'portfolioCompany' | 'report';
	/** Operation */
	operation?:
		| 'getFactor'
		| 'getFactorHistorical'
		| 'getHistoricalScore'
		| 'getScorecard'
		| 'getScorePlan';
	/** Scorecard Identifier */
	scorecardIdentifier?: string;
	/** Score */
	score?: number;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Simplify */
	simple?: boolean;
	/** Industry */
	industry?: 'food' | 'healthcare' | 'manofacturing' | 'retail' | 'technology';
	/** Email */
	email?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Message */
	message?: string;
	/** Portfolio ID */
	portfolioId?: string;
	/** Portfolio Name */
	name?: string;
	/** Description */
	description?: string;
	/** Privacy */
	privacy?: 'private' | 'shared' | 'team';
	/** Domain */
	domain?: string;
	/** Report */
	report?:
		| 'detailed'
		| 'events-json'
		| 'issues'
		| 'partnership'
		| 'summary'
		| 'full-scorecard-json'
		| 'portfolio'
		| 'scorecard-footprint';
	/** Branding */
	branding?: 'securityscorecard' | 'company_and_securityscorecard' | 'company';
	/** Date */
	date?: string;
	/** Report URL */
	url?: string;
	/** Put Output File in Field */
	binaryPropertyName?: string;
}

export interface SegmentToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'group' | 'identify' | 'track' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'add' | '__CUSTOM_API_CALL__';
	/** User ID */
	userId?: string;
	/** Group ID */
	groupId?: string;
	/** Traits */
	traits?: Record<string, unknown>;
	/** Context */
	context?: Record<string, unknown>;
	/** Integration */
	integrations?: Record<string, unknown>;
	/** Event */
	event?: string;
	/** Properties */
	properties?: Record<string, unknown>;
	/** Name */
	name?: string;
}

export interface SendGridToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'list' | 'mail' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** List ID */
	listId?: string;
	/** Delete Contacts */
	deleteContacts?: boolean;
	/** Contact Sample */
	contactSample?: boolean;
	/** Email */
	email?: string;
	/** Contact IDs */
	ids?: string;
	/** Delete All */
	deleteAll?: boolean;
	/** By */
	by?: 'id' | 'email';
	/** Contact ID */
	contactId?: string;
	/** Sender Email */
	fromEmail?: string;
	/** Sender Name */
	fromName?: string;
	/** Recipient Email */
	toEmail?: string;
	/** Subject */
	subject?: string;
	/** Dynamic Template */
	dynamicTemplate?: boolean;
	/** MIME Type */
	contentType?: 'text/plain' | 'text/html';
	/** Message Body */
	contentValue?: string;
	/** Template Name or ID */
	templateId?: string;
	/** Dynamic Template Fields */
	dynamicTemplateFields?: Record<string, unknown>;
}

export interface SendyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'campaign' | 'subscriber';
	/** Operation */
	operation?: 'create';
	/** From Name */
	fromName?: string;
	/** From Email */
	fromEmail?: string;
	/** Reply To */
	replyTo?: string;
	/** Title */
	title?: string;
	/** Subject */
	subject?: string;
	/** HTML Text */
	htmlText?: string;
	/** Send Campaign */
	sendCampaign?: boolean;
	/** Brand ID */
	brandId?: string;
	/** Email */
	email?: string;
	/** List ID */
	listId?: string;
}

export interface SentryIoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2' | 'accessTokenServer';
	/** Resource */
	resource?:
		| 'event'
		| 'issue'
		| 'organization'
		| 'project'
		| 'release'
		| 'team'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Organization Slug Name or ID */
	organizationSlug?: string;
	/** Project Slug Name or ID */
	projectSlug?: string;
	/** Full */
	full?: boolean;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Event ID */
	eventId?: string;
	/** Issue ID */
	issueId?: string;
	/** Name */
	name?: string;
	/** Agree to Terms */
	agreeTerms?: boolean;
	/** Slug Name or ID */
	organization_slug?: string;
	/** Team Slug Name or ID */
	teamSlug?: string;
	/** Version */
	version?: string;
	/** URL */
	url?: string;
	/** Project Names or IDs */
	projects?: unknown;
}

export interface ServiceNowToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'basicAuth' | 'oAuth2';
	/** Resource */
	resource?:
		| 'attachment'
		| 'businessService'
		| 'configurationItems'
		| 'department'
		| 'dictionary'
		| 'incident'
		| 'tableRecord'
		| 'user'
		| 'userGroup'
		| 'userRole'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'upload' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Table Name or ID */
	tableName?: string;
	/** Table Record ID */
	id?: string;
	/** Input Data Field Name */
	inputDataFieldName?: string;
	/** Attachment ID */
	attachmentId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Download Attachments */
	download?: boolean;
	/** Output Field */
	outputField?: string;
	/** Short Description */
	short_description?: string;
	/** Data to Send */
	dataToSend?: 'mapInput' | 'columns' | 'nothing';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsToSend?: Record<string, unknown>;
	/** Retrieve Identifier */
	getOption?: 'id' | 'user_name';
	/** Username */
	user_name?: string;
}

export interface ShopifyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Shopify API Version: 2024-07 */
	apiVersion?: unknown;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2' | 'apiKey';
	/** Resource */
	resource?: 'order' | 'product' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Line Items */
	limeItemsUi?: Record<string, unknown>;
	/** Order ID */
	orderId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Product ID */
	productId?: string;
}

export interface Signl4ToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'alert';
	/** Operation */
	operation?: 'send' | 'resolve';
	/** Message */
	message?: string;
	/** External ID */
	externalId?: string;
}

export interface SlackToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'channel' | 'file' | 'message' | 'reaction' | 'star' | 'user' | 'userGroup';
	/** Operation */
	operation?:
		| 'archive'
		| 'close'
		| 'create'
		| 'get'
		| 'getAll'
		| 'history'
		| 'invite'
		| 'join'
		| 'kick'
		| 'leave'
		| 'member'
		| 'open'
		| 'rename'
		| 'replies'
		| 'setPurpose'
		| 'setTopic'
		| 'unarchive';
	/** Channel */
	channelId?: unknown;
	/** Channel Visibility */
	channelVisibility?: 'public' | 'private';
	/** User Names or IDs */
	userIds?: unknown;
	/** User Name or ID */
	userId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Resolve Data */
	resolveData?: boolean;
	/** Name */
	name?: string;
	/** Message Timestamp */
	ts?: number;
	/** Purpose */
	purpose?: string;
	/** Topic */
	topic?: string;
	/** Message Timestamp */
	timestamp?: number;
	/** Send Message To */
	select?: 'channel' | 'user';
	/** User */
	user?: unknown;
	/** Message Type */
	messageType?: 'text' | 'block' | 'attachment';
	/** Message Text */
	text?: string;
	/** Blocks */
	blocksUi?: string;
	/** This is a legacy Slack feature. Slack advises to instead use Blocks. */
	noticeAttachments?: unknown;
	/** Attachments */
	attachments?: Record<string, unknown>;
	/** Options */
	otherOptions?: Record<string, unknown>;
	/** Search Query */
	query?: string;
	/** Sort By */
	sort?: 'desc' | 'asc' | 'relevance';
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
	/** Item to Add Star */
	target?: 'message' | 'file';
	/** File ID */
	fileId?: string;
	/** Binary File */
	binaryData?: boolean;
	/** File Content */
	fileContent?: string;
	/** File Property */
	binaryPropertyName?: string;
	/** Options */
	Options?: Record<string, unknown>;
	/** User Group ID */
	userGroupId?: string;
	/** Options */
	option?: Record<string, unknown>;
}

export interface Sms77ToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'sms' | 'voice' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
}

export interface SnowflakeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
}

export interface SplunkToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'alert' | 'report' | 'search' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'getReport' | 'getMetrics' | '__CUSTOM_API_CALL__';
	/** Search Job */
	searchJobId?: unknown;
	/** Name */
	name?: string;
	/** Report */
	reportId?: unknown;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Query */
	search?: string;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Roles */
	roles?: unknown;
	/** Password */
	password?: string;
	/** User */
	userId?: unknown;
}

export interface SpontitToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'push';
	/** Operation */
	operation?: 'create';
	/** Content */
	content?: string;
}

export interface SpotifyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'album'
		| 'artist'
		| 'library'
		| 'myData'
		| 'player'
		| 'playlist'
		| 'track'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'addSongToQueue'
		| 'currentlyPlaying'
		| 'nextSong'
		| 'pause'
		| 'previousSong'
		| 'recentlyPlayed'
		| 'resume'
		| 'volume'
		| 'startMusic'
		| '__CUSTOM_API_CALL__';
	/** Resource ID */
	id?: string;
	/** Search Keyword */
	query?: string;
	/** Country */
	country?: string;
	/** Name */
	name?: string;
	/** Track ID */
	trackID?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Volume */
	volumePercent?: number;
}

export interface StackbyToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'append' | 'delete' | 'list' | 'read';
	/** Stack ID */
	stackId?: string;
	/** Table */
	table?: string;
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Columns */
	columns?: string;
}

export interface StoryblokToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Source */
	source?: 'contentApi' | 'managementApi';
	/** Resource */
	resource?: 'story';
	/** Operation */
	operation?: 'get' | 'getAll';
	/** Identifier */
	identifier?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Space Name or ID */
	space?: string;
	/** Story ID */
	storyId?: string;
}

export interface StrapiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'password' | 'token';
	/** Resource */
	resource?: 'entry' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Content Type */
	contentType?: string;
	/** Columns */
	columns?: string;
	/** Entry ID */
	entryId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Update Key */
	updateKey?: string;
}

export interface StravaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'activity' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'get'
		| 'getComments'
		| 'getKudos'
		| 'getLaps'
		| 'getAll'
		| 'getStreams'
		| 'getZones'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Name */
	name?: string;
	/** Type */
	type?: string;
	/** Sport Type */
	sport_type?:
		| 'AlpineSki'
		| 'BackcountrySki'
		| 'Badminton'
		| 'Canoeing'
		| 'Crossfit'
		| 'EBikeRide'
		| 'Elliptical'
		| 'EMountainBikeRide'
		| 'Golf'
		| 'GravelRide'
		| 'Handcycle'
		| 'HighIntensityIntervalTraining'
		| 'Hike'
		| 'IceSkate'
		| 'InlineSkate'
		| 'Kayaking'
		| 'Kitesurf'
		| 'MountainBikeRide'
		| 'NordicSki'
		| 'Pickleball'
		| 'Pilates'
		| 'Racquetball'
		| 'Ride'
		| 'RockClimbing'
		| 'RollerSki'
		| 'Rowing'
		| 'Run'
		| 'Sail'
		| 'Skateboard'
		| 'Snowboard'
		| 'Snowshoe'
		| 'Soccer'
		| 'Squash'
		| 'StairStepper'
		| 'StandUpPaddling'
		| 'Surfing'
		| 'Swim'
		| 'TableTennis'
		| 'Tennis'
		| 'TrailRun'
		| 'Velomobile'
		| 'VirtualRide'
		| 'VirtualRow'
		| 'VirtualRun'
		| 'Walk'
		| 'WeightTraining'
		| 'Wheelchair'
		| 'Windsurf'
		| 'Workout'
		| 'Yoga';
	/** Start Date */
	startDate?: string;
	/** Elapsed Time (Seconds) */
	elapsedTime?: number;
	/** Activity ID */
	activityId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Keys */
	keys?: unknown;
}

export interface StripeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'balance'
		| 'charge'
		| 'coupon'
		| 'customer'
		| 'customerCard'
		| 'source'
		| 'token'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | '__CUSTOM_API_CALL__';
	/** Customer ID */
	customerId?: string;
	/** Card Token */
	token?: string;
	/** Card ID */
	cardId?: string;
	/** Source ID */
	sourceId?: string;
	/** Amount */
	amount?: number;
	/** Currency Name or ID */
	currency?: string;
	/** Source ID */
	source?: string;
	/** Charge ID */
	chargeId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Apply */
	duration?: 'forever' | 'once';
	/** Discount Type */
	type?: 'fixedAmount' | 'percent';
	/** Amount Off */
	amountOff?: number;
	/** Percent Off */
	percentOff?: number;
	/** Name */
	name?: string;
	/** Card Number */
	number?: string;
	/** CVC */
	cvc?: string;
	/** Expiration Month */
	expirationMonth?: string;
	/** Expiration Year */
	expirationYear?: string;
}

export interface SupabaseToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Use Custom Schema */
	useCustomSchema?: boolean;
	/** Schema */
	schema?: string;
	/** Resource */
	resource?: 'row' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Table Name or ID */
	tableId?: string;
	/** Select Type */
	filterType?: 'manual' | 'string';
	/** Must Match */
	matchType?: 'anyFilter' | 'allFilters';
	/** See <a href="https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering" target="_blank">PostgREST guide</a> to creating filters */
	jsonNotice?: unknown;
	/** Filters (String) */
	filterString?: string;
	/** Data to Send */
	dataToSend?: 'autoMapInputData' | 'defineBelow';
	/** Inputs to Ignore */
	inputsToIgnore?: string;
	/** Fields to Send */
	fieldsUi?: Record<string, unknown>;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface SyncroMspToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'customer' | 'rmm' | 'ticket';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Cutomer ID */
	customerId?: string;
	/** Email */
	email?: string;
	/** Subject */
	subject?: string;
	/** Ticket ID */
	ticketId?: string;
	/** Contact ID */
	contactId?: string;
	/** RMM Alert ID */
	alertId?: string;
	/** Asset ID */
	assetId?: string;
	/** Description */
	description?: string;
	/** Mute Period */
	muteFor?: '1-hour' | '1-day' | '2-days' | '1-week' | '2-weeks' | '1-month' | 'forever';
}

export interface TaigaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'epic' | 'issue' | 'task' | 'userStory';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Project Name or ID */
	projectId?: string;
	/** Subject */
	subject?: string;
	/** Epic ID */
	epicId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Issue ID */
	issueId?: string;
	/** Task ID */
	taskId?: string;
	/** User Story ID */
	userStoryId?: string;
}

export interface TapfiliateToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'affiliate' | 'affiliateMetadata' | 'programAffiliate';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll';
	/** Email */
	email?: string;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Affiliate ID */
	affiliateId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Metadata */
	metadataUi?: Record<string, unknown>;
	/** Key */
	key?: string;
	/** Value */
	value?: string;
	/** Program Name or ID */
	programId?: string;
}

export interface TelegramToolParameters extends BaseNodeParams {
	/** Interact with Telegram using our pre-built */
	preBuiltAgentsCalloutTelegram?: unknown;
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'chat' | 'callback' | 'file' | 'message';
	/** Operation */
	operation?: 'get' | 'administrators' | 'member' | 'leave' | 'setDescription' | 'setTitle';
	/** Chat ID */
	chatId?: string;
	/** Message ID */
	messageId?: string;
	/** User ID */
	userId?: string;
	/** Description */
	description?: string;
	/** Title */
	title?: string;
	/** Query ID */
	queryId?: string;
	/** Results */
	results?: string;
	/** File ID */
	fileId?: string;
	/** Download */
	download?: boolean;
	/** Message Type */
	messageType?: 'inlineMessage' | 'message';
	/** Binary File */
	binaryData?: boolean;
	/** Input Binary Field */
	binaryPropertyName?: string;
	/** Inline Message ID */
	inlineMessageId?: string;
	/** Reply Markup */
	replyMarkup?: 'none' | 'inlineKeyboard';
	/** Animation */
	file?: string;
	/** Action */
	action?:
		| 'find_location'
		| 'record_audio'
		| 'record_video'
		| 'record_video_note'
		| 'typing'
		| 'upload_audio'
		| 'upload_document'
		| 'upload_photo'
		| 'upload_video'
		| 'upload_video_note';
	/** Latitude */
	latitude?: number;
	/** Longitude */
	longitude?: number;
	/** Media */
	media?: Record<string, unknown>;
	/** Text */
	text?: string;
	/** Force Reply */
	forceReply?: Record<string, unknown>;
	/** Inline Keyboard */
	inlineKeyboard?: Record<string, unknown>;
	/** Reply Keyboard */
	replyKeyboard?: Record<string, unknown>;
	/** Reply Keyboard Options */
	replyKeyboardOptions?: Record<string, unknown>;
	/** Reply Keyboard Remove */
	replyKeyboardRemove?: Record<string, unknown>;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface TheHiveProjectToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'alert'
		| 'case'
		| 'comment'
		| 'observable'
		| 'page'
		| 'query'
		| 'task'
		| 'log'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'deleteAlert'
		| 'executeResponder'
		| 'get'
		| 'merge'
		| 'promote'
		| 'search'
		| 'update'
		| 'status'
		| '__CUSTOM_API_CALL__';
	/** Fields */
	alertFields?: unknown;
	/** Observables */
	observableUi?: Record<string, unknown>;
	/** Alert */
	alertId?: unknown;
	/** Alert */
	id?: unknown;
	/** Responder Name or ID */
	responder?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Sort */
	sort?: Record<string, unknown>;
	/** Status Name or ID */
	status?: string;
	/** Case */
	caseId?: unknown;
	/** Fields */
	alertUpdateFields?: unknown;
	/** Attachments */
	attachmentsUi?: Record<string, unknown>;
	/** Fields */
	caseFields?: unknown;
	/** Attachment Name or ID */
	attachmentId?: string;
	/** Fields */
	caseUpdateFields?: unknown;
	/** Add to */
	addTo?: 'alert' | 'case';
	/** Message */
	message?: string;
	/** Comment */
	commentId?: unknown;
	/** Search in */
	searchIn?: 'all' | 'alert' | 'case';
	/** Task Log */
	logId?: unknown;
	/** Task */
	taskId?: unknown;
	/** Fields */
	logFields?: unknown;
	/** Search in All Tasks */
	allTasks?: boolean;
	/** Create in */
	createIn?: 'case' | 'alert';
	/** Data Type */
	dataType?: string;
	/** Data */
	data?: string;
	/** Fields */
	observableFields?: unknown;
	/** Observable */
	observableId?: unknown;
	/** Analyzer Names or IDs */
	analyzers?: unknown;
	/** Fields */
	observableUpdateFields?: unknown;
	/** Create in */
	location?: 'case' | 'knowledgeBase';
	/** Title */
	title?: string;
	/** Category */
	category?: string;
	/** Content */
	content?: string;
	/** Page */
	pageId?: unknown;
	/** Search in Knowledge Base */
	searchInKnowledgeBase?: boolean;
	/** Query */
	queryJson?: string | object;
	/** Fields */
	taskFields?: unknown;
	/** Search in All Cases */
	allCases?: boolean;
	/** Fields */
	taskUpdateFields?: unknown;
}

export interface TheHiveToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'alert' | 'case' | 'log' | 'observable' | 'task' | '__CUSTOM_API_CALL__';
	/** Operation Name or ID */
	operation?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Alert ID */
	id?: string;
	/** Case ID */
	caseId?: string;
	/** Title */
	title?: string;
	/** Description */
	description?: string;
	/** Severity */
	severity?: 1 | 2 | 3;
	/** Date */
	date?: string;
	/** Tags */
	tags?: string;
	/** TLP */
	tlp?: 0 | 1 | 2 | 3;
	/** Status */
	status?: 'New' | 'Updated' | 'Ignored' | 'Imported';
	/** Type */
	type?: string;
	/** Source */
	source?: string;
	/** SourceRef */
	sourceRef?: string;
	/** Follow */
	follow?: boolean;
	/** Artifacts */
	artifactUi?: Record<string, unknown>;
	/** Responder Name or ID */
	responder?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Data Type Name or ID */
	dataType?: string;
	/** Data */
	data?: string;
	/** Input Binary Field */
	binaryProperty?: string;
	/** Message */
	message?: string;
	/** Start Date */
	startDate?: string;
	/** IOC */
	ioc?: boolean;
	/** Sighted */
	sighted?: boolean;
	/** Analyzer Names or IDs */
	analyzers?: unknown;
	/** Owner */
	owner?: string;
	/** Flag */
	flag?: boolean;
	/** Task ID */
	taskId?: string;
}

export interface TimescaleDbToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'executeQuery' | 'insert' | 'update';
	/** Query */
	query?: string;
	/** Schema */
	schema?: string;
	/** Table */
	table?: string;
	/** Columns */
	columns?: string;
	/** Update Key */
	updateKey?: string;
	/** Return Fields */
	returnFields?: string;
}

export interface TodoistToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiKey' | 'oAuth2';
	/** Resource */
	resource?: 'task' | 'project' | 'section' | 'comment' | 'label' | 'reminder';
	/** Operation */
	operation?:
		| 'close'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'move'
		| 'quickAdd'
		| 'reopen'
		| 'update';
	/** Task ID */
	taskId?: string;
	/** Project Name or ID */
	project?: unknown;
	/** Section Name or ID */
	section?: string;
	/** Label Names */
	labels?: unknown;
	/** Content */
	content?: string;
	/** Text */
	text?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Project ID */
	projectId?: string;
	/** Name */
	name?: string;
	/** Additional Fields */
	projectOptions?: Record<string, unknown>;
	/** Update Fields */
	projectUpdateFields?: Record<string, unknown>;
	/** Section ID */
	sectionId?: string;
	/** Project Name or ID */
	sectionProject?: unknown;
	/** Name */
	sectionName?: string;
	/** Additional Fields */
	sectionOptions?: Record<string, unknown>;
	/** Update Fields */
	sectionUpdateFields?: Record<string, unknown>;
	/** Filters */
	sectionFilters?: Record<string, unknown>;
	/** Comment ID */
	commentId?: string;
	/** Task ID */
	commentTaskId?: string;
	/** Content */
	commentContent?: string;
	/** Update Fields */
	commentUpdateFields?: Record<string, unknown>;
	/** Filters */
	commentFilters?: Record<string, unknown>;
	/** Label ID */
	labelId?: string;
	/** Name */
	labelName?: string;
	/** Additional Fields */
	labelOptions?: Record<string, unknown>;
	/** Update Fields */
	labelUpdateFields?: Record<string, unknown>;
	/** Reminder ID */
	reminderId?: string;
	/** Task ID */
	itemId?: string;
	/** Due Date Type */
	dueDateType?: 'natural_language' | 'full_day' | 'floating_time' | 'fixed_timezone';
	/** Natural Language Representation */
	natural_language_representation?: string;
	/** Date */
	date?: string;
	/** Date Time */
	datetime?: string;
	/** Timezone */
	timezone?: string;
	/** Additional Fields */
	reminderOptions?: Record<string, unknown>;
	/** Update Fields */
	reminderUpdateFields?: Record<string, unknown>;
}

export interface TotpToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Operation */
	operation?: 'generateSecret';
}

export interface TravisCiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'build';
	/** Operation */
	operation?: 'cancel' | 'get' | 'getAll' | 'restart' | 'trigger';
	/** Build ID */
	buildId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Slug */
	slug?: string;
	/** Branch */
	branch?: string;
}

export interface TrelloToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'attachment'
		| 'board'
		| 'boardMember'
		| 'card'
		| 'cardComment'
		| 'checklist'
		| 'label'
		| 'list'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Card ID */
	cardId?: unknown;
	/** Source URL */
	url?: string;
	/** Attachment ID */
	id?: string;
	/** Name */
	name?: string;
	/** Description */
	description?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Member ID */
	idMember?: string;
	/** Type */
	type?: 'normal' | 'admin' | 'observer';
	/** Email */
	email?: string;
	/** List ID */
	listId?: string;
	/** Text */
	text?: string;
	/** Comment ID */
	commentId?: string;
	/** Checklist ID */
	checklistId?: string;
	/** CheckItem ID */
	checkItemId?: string;
	/** Board */
	boardId?: unknown;
	/** Color */
	color?:
		| 'black'
		| 'blue'
		| 'green'
		| 'lime'
		| 'null'
		| 'orange'
		| 'pink'
		| 'purple'
		| 'red'
		| 'sky'
		| 'yellow';
	/** Archive */
	archive?: boolean;
	/** Board ID */
	idBoard?: string;
}

export interface TwakeToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'message' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** Channel Name or ID */
	channelId?: string;
	/** Content */
	content?: string;
}

export interface TwilioToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'call' | 'sms' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'send' | '__CUSTOM_API_CALL__';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** To Whatsapp */
	toWhatsapp?: boolean;
	/** Message */
	message?: string;
	/** Use TwiML */
	twiml?: boolean;
}

export interface TwistToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'channel' | 'comment' | 'messageConversation' | 'thread' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'archive'
		| 'create'
		| 'delete'
		| 'get'
		| 'getAll'
		| 'unarchive'
		| 'update'
		| '__CUSTOM_API_CALL__';
	/** Workspace Name or ID */
	workspaceId?: string;
	/** Name */
	name?: string;
	/** Channel ID */
	channelId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Thread ID */
	threadId?: string;
	/** Content */
	content?: string;
	/** Comment ID */
	commentId?: string;
	/** Conversation Name or ID */
	conversationId?: string;
	/** Message ID */
	id?: string;
	/** Title */
	title?: string;
}

export interface TwitterToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'directMessage' | 'list' | 'tweet' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | '__CUSTOM_API_CALL__';
	/** User */
	user?: unknown;
	/** Text */
	text?: string;
	/** List */
	list?: unknown;
	/** Locations are not supported due to Twitter V2 API limitations */
	noticeLocation?: unknown;
	/** Attachements are not supported due to Twitter V2 API limitations */
	noticeAttachments?: unknown;
	/** Tweet */
	tweetDeleteId?: unknown;
	/** Tweet */
	tweetId?: unknown;
	/** Search Term */
	searchText?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Me */
	me?: boolean;
}

export interface UnleashedSoftwareToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'salesOrder' | 'stockOnHand';
	/** Operation */
	operation?: 'getAll';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Product ID */
	productId?: string;
}

export interface UpleadToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'company' | 'person';
	/** Operation */
	operation?: 'enrich';
	/** Company */
	company?: string;
	/** Domain */
	domain?: string;
	/** Email */
	email?: string;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
}

export interface UprocToolParameters extends BaseNodeParams {
	/** Description */
	toolDescription?: string;
	/** Resource */
	group?:
		| 'audio'
		| 'communication'
		| 'company'
		| 'finance'
		| 'geographic'
		| 'image'
		| 'internet'
		| 'personal'
		| 'product'
		| 'security'
		| 'text';
	/** Operation */
	tool?: 'getAudioAdvancedSpeechByText' | 'getAudioSpeechByText';
	/** Credit card */
	credit_card?: string;
	/** Address */
	address?: string;
	/** Country */
	country?: string;
	/** Coordinates */
	coordinates?: string;
	/** Date */
	date?: string;
	/** Years1 */
	years1?: number;
	/** Years2 */
	years2?: number;
	/** Years */
	years?: number;
	/** Ean */
	ean?: string;
	/** Asin */
	asin?: string;
	/** Text */
	text?: string;
	/** Gender */
	gender?: 'female' | 'male';
	/** Language */
	language?:
		| 'american'
		| 'arabic'
		| 'bengali'
		| 'british'
		| 'czech'
		| 'danish'
		| 'dutch'
		| 'filipino'
		| 'finnish'
		| 'french'
		| 'german'
		| 'greek'
		| 'gujurati'
		| 'hindi'
		| 'hungarian'
		| 'indonesian'
		| 'italian'
		| 'japanese'
		| 'kannada'
		| 'korean'
		| 'malayalam'
		| 'mandarin'
		| 'norwegian'
		| 'polish'
		| 'portuguese'
		| 'russian'
		| 'slovak'
		| 'spanish'
		| 'tamil'
		| 'telugu'
		| 'thai'
		| 'turkish'
		| 'ukranian'
		| 'vietnamese';
	/** Account */
	account?: string;
	/** Bic */
	bic?: string;
	/** Isocode */
	isocode?: string;
	/** Iban */
	iban?: string;
	/** Swift */
	swift?: string;
	/** Bcid */
	bcid?:
		| 'auspost'
		| 'azteccode'
		| 'azteccodecompact'
		| 'aztecrune'
		| 'bc412'
		| 'channelcode'
		| 'codablockf'
		| 'code11'
		| 'code128'
		| 'code16k'
		| 'code2of5'
		| 'code32'
		| 'code39'
		| 'code39ext'
		| 'code49'
		| 'code93'
		| 'code93ext'
		| 'codeone'
		| 'coop2of5'
		| 'daft'
		| 'databarexpanded'
		| 'databarexpandedcomposite'
		| 'databarexpandedstacked'
		| 'databarexpandedstackedcomposite'
		| 'databarlimited'
		| 'databarlimitedcomposite'
		| 'databaromni'
		| 'databaromnicomposite'
		| 'databarstacked'
		| 'databarstackedcomposite'
		| 'databarstackedomni'
		| 'databarstackedomnicomposite'
		| 'databartruncated'
		| 'databartruncatedcomposite'
		| 'datalogic2of5'
		| 'datamatrix'
		| 'datamatrixrectangular'
		| 'dotcode'
		| 'ean13'
		| 'ean13composite'
		| 'ean14'
		| 'ean2'
		| 'ean5'
		| 'ean8'
		| 'ean8composite'
		| 'flattermarken'
		| 'gs1-128'
		| 'gs1-128composite'
		| 'gs1-cc'
		| 'gs1datamatrix'
		| 'gs1datamatrixrectangular'
		| 'gs1northamericancoupon'
		| 'hanxin'
		| 'hibcazteccode'
		| 'hibccodablockf'
		| 'hibccode128'
		| 'hibccode39'
		| 'hibcdatamatrix'
		| 'hibcdatamatrixrectangular'
		| 'hibcmicropdf417'
		| 'hibcpdf417'
		| 'iata2of5'
		| 'identcode'
		| 'industrial2of5'
		| 'interleaved2of5'
		| 'isbn'
		| 'ismn'
		| 'issn'
		| 'itf14'
		| 'japanpost'
		| 'kix'
		| 'leitcode'
		| 'matrix2of5'
		| 'maxicode'
		| 'micropdf417'
		| 'msi'
		| 'onecode'
		| 'pdf417'
		| 'pdf417compact'
		| 'pharmacode'
		| 'pharmacode2'
		| 'planet'
		| 'plessey'
		| 'posicode'
		| 'postnet'
		| 'pzn'
		| 'rationalizedCodabar'
		| 'raw'
		| 'royalmail'
		| 'sscc18'
		| 'symbol'
		| 'telepen'
		| 'telepennumeric'
		| 'ultracode'
		| 'upca'
		| 'upcacomposite'
		| 'upce'
		| 'upcecomposite';
	/** Author */
	author?: string;
	/** Category */
	category?: string;
	/** Isbn */
	isbn?: string;
	/** Publisher */
	publisher?: string;
	/** Title */
	title?: string;
	/** Dni */
	dni?: string;
	/** Cif */
	cif?: string;
	/** Nie */
	nie?: string;
	/** Nif */
	nif?: string;
	/** Ip */
	ip?: string;
	/** City */
	city?: string;
	/** Phone */
	phone?: string;
	/** Zipcode */
	zipcode?: string;
	/** Upc */
	upc?: string;
	/** Isin */
	isin?: string;
	/** Number */
	number?: string;
	/** Uuid */
	uuid?: string;
	/** Domain */
	domain?: string;
	/** Duns */
	duns?: string;
	/** Email */
	email?: string;
	/** Name */
	name?: string;
	/** Url */
	url?: string;
	/** Profile */
	profile?: string;
	/** Role */
	role?: string;
	/** Taxid */
	taxid?: string;
	/** Company */
	company?: string;
	/** Area */
	area?:
		| 'Communications'
		| 'Consulting'
		| 'Customer service'
		| 'Education'
		| 'Engineering'
		| 'Finance'
		| 'Health professional'
		| 'Human resources'
		| 'Information technology'
		| 'Legal'
		| 'Marketing'
		| 'Operations'
		| 'Owner'
		| 'President'
		| 'Product'
		| 'Public relations'
		| 'Real estate'
		| 'Recruiting'
		| 'Research'
		| 'Sales';
	/** Clevel */
	clevel?: 'No' | 'Yes';
	/** Location */
	location?: string;
	/** Keyword */
	keyword?: string;
	/** Message */
	message?: string;
	/** Message1 */
	message1?: string;
	/** Message2 */
	message2?: string;
	/** Seniority */
	seniority?: 'Apprentice' | 'Director' | 'Executive' | 'Intermediate' | 'Manager';
	/** Address1 */
	address1?: string;
	/** Address2 */
	address2?: string;
	/** Fuel consumption */
	fuel_consumption?: string;
	/** Price liter */
	price_liter?: string;
	/** Coordinates1 */
	coordinates1?: string;
	/** Coordinates2 */
	coordinates2?: string;
	/** Ip1 */
	ip1?: string;
	/** Ip2 */
	ip2?: string;
	/** Phone1 */
	phone1?: string;
	/** Phone2 */
	phone2?: string;
	/** Zipcode1 */
	zipcode1?: string;
	/** Zipcode2 */
	zipcode2?: string;
	/** Distance */
	distance?: string;
	/** Coin */
	coin?:
		| '0x'
		| 'Aave Coin'
		| 'Algorand'
		| 'Aragon'
		| 'Augur'
		| 'AugurV2'
		| 'AuroraCoin'
		| 'BTU Protocol'
		| 'Bancor'
		| 'Bankex'
		| 'Basic Attention Token'
		| 'BeaverCoin'
		| 'BioCoin'
		| 'Bitcoin'
		| 'Bitcoin SV'
		| 'BitcoinCash'
		| 'BitcoinGold'
		| 'BitcoinPrivate'
		| 'BitcoinZ'
		| 'BlockTrade'
		| 'CUSD'
		| 'Callisto'
		| 'Cardano'
		| 'Chainlink'
		| 'Civic'
		| 'Compound'
		| 'Cred'
		| 'Crypto.com Coin'
		| 'Dash'
		| 'Decentraland'
		| 'Decred'
		| 'DigiByte'
		| 'District0x'
		| 'DogeCoin'
		| 'EOS'
		| 'Enjin Coin'
		| 'EtherZero'
		| 'Ethereum'
		| 'EthereumClassic'
		| 'Expanse'
		| 'FirmaChain'
		| 'FreiCoin'
		| 'GameCredits'
		| 'GarliCoin'
		| 'Gnosis'
		| 'Golem'
		| 'Golem (GNT)'
		| 'HedgeTrade'
		| 'Hush'
		| 'HyperSpace'
		| 'Komodo'
		| 'LBRY Credits'
		| 'Lisk'
		| 'LiteCoin'
		| 'Loom Network'
		| 'Maker'
		| 'Matchpool'
		| 'Matic'
		| 'MegaCoin'
		| 'Melon'
		| 'Metal'
		| 'MonaCoin'
		| 'Monero'
		| 'Multi-collateral DAI'
		| 'NameCoin'
		| 'Nano'
		| 'Nem'
		| 'Neo'
		| 'NeoGas'
		| 'Numeraire'
		| 'Ocean Protocol'
		| 'Odyssey'
		| 'OmiseGO'
		| 'PIVX'
		| 'Paxos'
		| 'PeerCoin'
		| 'Polkadot'
		| 'Polymath'
		| 'PrimeCoin'
		| 'ProtoShares'
		| 'Qtum'
		| 'Quant'
		| 'Quantum Resistant Ledger'
		| 'RaiBlocks'
		| 'Ripio Credit Network'
		| 'Ripple'
		| 'SOLVE'
		| 'Salt'
		| 'Serve'
		| 'Siacoin'
		| 'SnowGem'
		| 'SolarCoin'
		| 'Spendcoin'
		| 'Status'
		| 'Stellar'
		| 'Storj'
		| 'Storm'
		| 'StormX'
		| 'Swarm City'
		| 'Synthetix Network'
		| 'TEMCO'
		| 'Tap'
		| 'TenX'
		| 'Tether'
		| 'Tezos'
		| 'Tron'
		| 'TrueUSD'
		| 'USD Coin'
		| 'Uniswap Coin'
		| 'VeChain'
		| 'VertCoin'
		| 'Viberate'
		| 'VoteCoin'
		| 'Waves'
		| 'Wings'
		| 'ZCash'
		| 'ZClassic'
		| 'ZenCash'
		| 'iExec RLC'
		| 'loki';
	/** Country code */
	country_code?: string;
	/** Amount */
	amount?: string;
	/** Isocode1 */
	isocode1?:
		| 'AUD'
		| 'BGN'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HRK'
		| 'HUF'
		| 'IDR'
		| 'ILS'
		| 'INR'
		| 'ISK'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'MYR'
		| 'NOK'
		| 'NZD'
		| 'PHP'
		| 'PLN'
		| 'RON'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TRY'
		| 'USD'
		| 'ZAR';
	/** Isocode2 */
	isocode2?:
		| 'AUD'
		| 'BGN'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HRK'
		| 'HUF'
		| 'IDR'
		| 'ILS'
		| 'INR'
		| 'ISK'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'MYR'
		| 'NOK'
		| 'NZD'
		| 'PHP'
		| 'PLN'
		| 'RON'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TRY'
		| 'USD'
		| 'ZAR';
	/** Date1 */
	date1?: string;
	/** Date2 */
	date2?: string;
	/** Date3 */
	date3?: string;
	/** Period */
	period?: 'days' | 'hours' | 'minutes' | 'seconds';
	/** Useragent */
	useragent?: string;
	/** Type */
	type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT';
	/** Width */
	width?: '1024' | '160' | '320' | '640' | '800';
	/** Fullpage */
	fullpage?: 'no' | 'yes';
	/** Selector */
	selector?: string;
	/** Delay */
	delay?: string;
	/** Viewport */
	viewport?: string;
	/** Email from */
	email_from?: string;
	/** Email to */
	email_to?: string;
	/** Subject */
	subject?: string;
	/** Body */
	body?: string;
	/** Page */
	page?: number;
	/** Firstname */
	firstname?: string;
	/** Lastname */
	lastname?: string;
	/** Mode */
	mode?: 'guess' | 'only_verify' | 'verify';
	/** Fullname */
	fullname?: string;
	/** Mobile */
	mobile?: string;
	/** Url dlr */
	url_dlr?: string;
	/** Source */
	source?: string;
	/** Destination */
	destination?: string;
	/** Size */
	size?: string;
	/** List */
	list?: string;
	/** Keywords */
	keywords?: string;
	/** Current company */
	current_company?: string;
	/** Current title */
	current_title?: string;
	/** Included companies */
	included_companies?: string;
	/** Excluded companies */
	excluded_companies?: string;
	/** Included titles */
	included_titles?: string;
	/** Excluded titles */
	excluded_titles?: string;
	/** Included keywords */
	included_keywords?: string;
	/** Excluded keywords */
	excluded_keywords?: string;
	/** Length1 */
	length1?: number;
	/** Length2 */
	length2?: number;
	/** Length */
	length?: number;
	/** Separator */
	separator?: string;
	/** Latitude */
	latitude?: string;
	/** Longitude */
	longitude?: string;
	/** Radius */
	radius?: string;
	/** Imei */
	imei?: string;
	/** Regex */
	regex?: string;
	/** Host */
	host?: string;
	/** Port */
	port?: string;
	/** Table */
	table?: string;
	/** Number1 */
	number1?: string;
	/** Number2 */
	number2?: string;
	/** Number3 */
	number3?: string;
	/** Luhn */
	luhn?: string;
	/** Mod */
	mod?: string;
	/** Rest */
	rest?: string;
	/** Password */
	password?: string;
	/** Locality */
	locality?:
		| 'Australia (English)'
		| 'Australia Ocker (English)'
		| 'Azerbaijani'
		| 'Bork (English)'
		| 'Canada (English)'
		| 'Canada (French)'
		| 'Chinese'
		| 'Chinese (Taiwan)'
		| 'Czech'
		| 'Dutch'
		| 'English'
		| 'Farsi'
		| 'French'
		| 'Georgian'
		| 'German'
		| 'German (Austria)'
		| 'German (Switzerland)'
		| 'Great Britain (English)'
		| 'India (English)'
		| 'Indonesia'
		| 'Ireland (English)'
		| 'Italian'
		| 'Japanese'
		| 'Korean'
		| 'Nepalese'
		| 'Norwegian'
		| 'Polish'
		| 'Portuguese (Brazil)'
		| 'Russian'
		| 'Slovakian'
		| 'Spanish'
		| 'Spanish Mexico'
		| 'Swedish'
		| 'Turkish'
		| 'Ukrainian'
		| 'United States (English)'
		| 'Vietnamese';
	/** Surname */
	surname?: string;
	/** Province */
	province?: string;
	/** Format */
	format?: string;
	/** Text1 */
	text1?: string;
	/** Text2 */
	text2?: string;
	/** Glue */
	glue?: string;
	/** Field */
	field?:
		| 'alphabetic'
		| 'alphanumeric'
		| 'cif'
		| 'city'
		| 'country'
		| 'date'
		| 'decimal'
		| 'dni'
		| 'domain'
		| 'email'
		| 'gender'
		| 'integer'
		| 'ip'
		| 'mobile'
		| 'name'
		| 'nie'
		| 'nif'
		| 'phone'
		| 'province'
		| 'zipcode';
	/** Find */
	find?: string;
	/** Replace */
	replace?: string;
	/** Texts */
	texts?: string;
	/** Html */
	html?: string;
	/** Tin */
	tin?: string;
	/** Vin */
	vin?: string;
	/** Count1 */
	count1?: string;
	/** Count2 */
	count2?: string;
	/** Count */
	count?: string;
	/** Additional Options */
	additionalOptions?: Record<string, unknown>;
}

export interface UptimeRobotToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'account' | 'alertContact' | 'maintenanceWindow' | 'monitor' | 'publicStatusPage';
	/** Operation */
	operation?: 'get';
	/** Friendly Name */
	friendlyName?: string;
	/** Type */
	type?: 5 | 1 | 2 | 3 | 4;
	/** URL */
	url?: string;
	/** ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Value */
	value?: string;
	/** Duration (Minutes) */
	duration?: number;
	/** Week Day */
	weekDay?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	/** Month Day */
	monthDay?: number;
	/** Start Time */
	start_time?: string;
	/** Monitor IDs */
	monitors?: string;
}

export interface UrlScanIoToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'scan' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'get' | 'getAll' | 'perform' | '__CUSTOM_API_CALL__';
	/** Scan ID */
	scanId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** URL */
	url?: string;
}

export interface VeroToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'user' | 'event';
	/** Operation */
	operation?:
		| 'addTags'
		| 'alias'
		| 'create'
		| 'delete'
		| 'resubscribe'
		| 'removeTags'
		| 'unsubscribe';
	/** ID */
	id?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Data */
	dataAttributesUi?: Record<string, unknown>;
	/** Data */
	dataAttributesJson?: string | object;
	/** New ID */
	newId?: string;
	/** Tags */
	tags?: string;
	/** Email */
	email?: string;
	/** Event Name */
	eventName?: string;
	/** Extra */
	extraAttributesUi?: Record<string, unknown>;
	/** Extra */
	extraAttributesJson?: string | object;
}

export interface VenafiTlsProtectCloudToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'certificate' | 'certificateRequest' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'delete' | 'download' | 'get' | 'getMany' | 'renew' | '__CUSTOM_API_CALL__';
	/** Certificate ID */
	certificateId?: string;
	/** Download Item */
	downloadItem?: 'certificate' | 'keystore';
	/** Keystore Type */
	keystoreType?: 'JKS' | 'PKCS12' | 'PEM';
	/** Certificate Label */
	certificateLabel?: string;
	/** Private Key Passphrase */
	privateKeyPassphrase?: string;
	/** Keystore Passphrase */
	keystorePassphrase?: string;
	/** Input Data Field Name */
	binaryProperty?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Application Name or ID */
	applicationId?: string;
	/** Existing Certificate ID */
	existingCertificateId?: string;
	/** Certificate Issuing Template Name or ID */
	certificateIssuingTemplateId?: string;
	/** Certificate Signing Request */
	certificateSigningRequest?: string;
	/** Generate CSR */
	generateCsr?: boolean;
	/** Common Name */
	commonName?: string;
	/** Certificate Request ID */
	certificateRequestId?: string;
}

export interface VenafiTlsProtectDatacenterToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'certificate' | 'policy' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?:
		| 'create'
		| 'delete'
		| 'download'
		| 'get'
		| 'getMany'
		| 'renew'
		| '__CUSTOM_API_CALL__';
	/** Policy DN */
	PolicyDN?: string;
	/** Subject */
	Subject?: string;
	/** Certificate DN */
	certificateDn?: string;
	/** Include Private Key */
	includePrivateKey?: boolean;
	/** Password */
	password?: string;
	/** Input Data Field Name */
	binaryProperty?: string;
	/** Certificate GUID */
	certificateId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Certificate DN */
	certificateDN?: string;
	/** Policy DN */
	policyDn?: string;
}

export interface VonageToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'sms';
	/** Operation */
	operation?: 'send';
	/** From */
	from?: string;
	/** To */
	to?: string;
	/** Message */
	message?: string;
}

export interface WebflowToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'item';
	/** Operation */
	operation?: 'create' | 'deleteItem' | 'get' | 'getAll' | 'update';
	/** Site Name or ID */
	siteId?: string;
	/** Collection Name or ID */
	collectionId?: string;
	/** Live */
	live?: boolean;
	/** Fields */
	fieldsUi?: Record<string, unknown>;
	/** Item ID */
	itemId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface WekanToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'board'
		| 'card'
		| 'cardComment'
		| 'checklist'
		| 'checklistItem'
		| 'list'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Owner Name or ID */
	owner?: string;
	/** Board ID */
	boardId?: string;
	/** User Name or ID */
	IdUser?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** List Name or ID */
	listId?: string;
	/** Swimlane Name or ID */
	swimlaneId?: string;
	/** Author Name or ID */
	authorId?: string;
	/** Card Name or ID */
	cardId?: string;
	/** From Object */
	fromObject?: 'list' | 'swimlane';
	/** Comment */
	comment?: string;
	/** Comment Name or ID */
	commentId?: string;
	/** Items */
	items?: string;
	/** Checklist Name or ID */
	checklistId?: string;
	/** Checklist Item Name or ID */
	checklistItemId?: string;
}

export interface WhatsAppToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'message' | 'media';
	/** Operation */
	operation?: 'send' | 'sendAndWait' | 'sendTemplate';
	/** Messaging Product */
	messagingProduct?: unknown;
	/** Sender Phone Number (or ID) */
	phoneNumberId?: string;
	/** Recipient's Phone Number */
	recipientPhoneNumber?: string;
	/** MessageType */
	messageType?: 'audio' | 'contacts' | 'document' | 'image' | 'location' | 'text' | 'video';
	/** Name */
	name?: Record<string, unknown>;
	/** Longitude */
	longitude?: number;
	/** Latitude */
	latitude?: number;
	/** Text Body */
	textBody?: string;
	/** Take Audio From */
	mediaPath?: 'useMediaLink' | 'useMediaId' | 'useMedian8n';
	/** Link */
	mediaLink?: string;
	/** ID */
	mediaId?: string;
	/** Input Data Field Name */
	mediaPropertyName?: string;
	/** Filename */
	mediaFilename?: string;
	/** Template */
	template?: string;
	/** Components */
	components?: Record<string, unknown>;
	/** Media ID */
	mediaGetId?: string;
	/** Media ID */
	mediaDeleteId?: string;
	/** Message */
	message?: string;
	/** Response Type */
	responseType?: 'approval' | 'freeText' | 'customForm';
	/** Define Form */
	defineForm?: 'fields' | 'json';
	/** Form Fields */
	jsonOutput?: string | object;
	/** Form Elements */
	formFields?: Record<string, unknown>;
	/** Approval Options */
	approvalOptions?: Record<string, unknown>;
}

export interface WooCommerceToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'customer' | 'order' | 'product' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Email */
	email?: string;
	/** Customer ID */
	customerId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Name */
	name?: string;
	/** Dimensions */
	dimensionsUi?: Record<string, unknown>;
	/** Images */
	imagesUi?: Record<string, unknown>;
	/** Metadata */
	metadataUi?: Record<string, unknown>;
	/** Product ID */
	productId?: string;
	/** Billing */
	billingUi?: Record<string, unknown>;
	/** Coupon Lines */
	couponLinesUi?: Record<string, unknown>;
	/** Fee Lines */
	feeLinesUi?: Record<string, unknown>;
	/** Line Items */
	lineItemsUi?: Record<string, unknown>;
	/** Shipping */
	shippingUi?: Record<string, unknown>;
	/** Shipping Lines */
	shippingLinesUi?: Record<string, unknown>;
	/** Order ID */
	orderId?: string;
}

export interface WordpressToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'post' | 'page' | 'user' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Title */
	title?: string;
	/** Post ID */
	postId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Page ID */
	pageId?: string;
	/** Username */
	username?: string;
	/** Name */
	name?: string;
	/** First Name */
	firstName?: string;
	/** Last Name */
	lastName?: string;
	/** Email */
	email?: string;
	/** Password */
	password?: string;
	/** User ID */
	userId?: string;
	/** Reassign */
	reassign?: string;
}

export interface XeroToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'contact' | 'invoice' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Organization Name or ID */
	organizationId?: string;
	/** Name */
	name?: string;
	/** Contact ID */
	contactId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Type */
	type?: 'ACCPAY' | 'ACCREC';
	/** Line Items */
	lineItemsUi?: Record<string, unknown>;
	/** Invoice ID */
	invoiceId?: string;
}

export interface YourlsToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'url';
	/** Operation */
	operation?: 'expand' | 'shorten' | 'stats';
	/** URL */
	url?: string;
	/** Short URL */
	shortUrl?: string;
}

export interface ZammadToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'basicAuth' | 'tokenAuth';
	/** Resource */
	resource?: 'group' | 'organization' | 'ticket' | 'user';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	/** Group Name */
	name?: string;
	/** Group ID */
	id?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Title */
	title?: string;
	/** Group Name or ID */
	group?: string;
	/** Customer Email Name or ID */
	customer?: string;
	/** Article */
	article?: Record<string, unknown>;
	/** First Name */
	firstname?: string;
	/** Last Name */
	lastname?: string;
	/** Query */
	query?: string;
}

export interface ZendeskToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'apiToken' | 'oAuth2';
	/** Resource */
	resource?: 'ticket' | 'ticketField' | 'user' | 'organization' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'recover' | 'update' | '__CUSTOM_API_CALL__';
	/** Description */
	description?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Ticket ID */
	id?: string;
	/** Update Fields */
	updateFieldsJson?: string | object;
	/** Ticket Type */
	ticketType?: 'regular' | 'suspended';
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Ticket Field ID */
	ticketFieldId?: string;
	/** Name */
	name?: string;
}

export interface ZohoCrmToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?:
		| 'account'
		| 'contact'
		| 'deal'
		| 'invoice'
		| 'lead'
		| 'product'
		| 'purchaseOrder'
		| 'quote'
		| 'salesOrder'
		| 'vendor'
		| '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'upsert' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Account Name */
	accountName?: string;
	/** Account ID */
	accountId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** Last Name */
	lastName?: string;
	/** Contact ID */
	contactId?: string;
	/** Deal Name */
	dealName?: string;
	/** Stage Name or ID */
	stage?: string;
	/** Deal ID */
	dealId?: string;
	/** Subject */
	subject?: string;
	/** Products */
	Product_Details?: Record<string, unknown>;
	/** Invoice ID */
	invoiceId?: string;
	/** Company */
	Company?: string;
	/** Lead ID */
	leadId?: string;
	/** Product Name */
	productName?: string;
	/** Product ID */
	productId?: string;
	/** Vendor Name or ID */
	vendorId?: string;
	/** Purchase Order ID */
	purchaseOrderId?: string;
	/** Quote ID */
	quoteId?: string;
	/** Sales Order ID */
	salesOrderId?: string;
	/** Vendor Name */
	vendorName?: string;
}

export interface ZoomToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Authentication */
	authentication?: 'accessToken' | 'oAuth2';
	/** Resource */
	resource?: 'meeting' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | '__CUSTOM_API_CALL__';
	/** Topic */
	topic?: string;
	/** ID */
	meetingId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
}

export interface ZulipToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'message' | 'stream' | 'user';
	/** Operation */
	operation?: 'delete' | 'get' | 'sendPrivate' | 'sendStream' | 'update' | 'updateFile';
	/** To */
	to?: unknown;
	/** Content */
	content?: string;
	/** Stream Name or ID */
	stream?: string;
	/** Topic Name or ID */
	topic?: string;
	/** Message ID */
	messageId?: string;
	/** Put Output File in Field */
	dataBinaryProperty?: string;
	/** JSON Parameters */
	jsonParameters?: boolean;
	/** Additional Fields */
	additionalFieldsJson?: string | object;
	/** Subscriptions */
	subscriptions?: Record<string, unknown>;
	/** Stream ID */
	streamId?: string;
	/** Email */
	email?: string;
	/** Full Name */
	fullName?: string;
	/** Password */
	password?: string;
	/** Short Name */
	shortName?: string;
	/** User ID */
	userId?: string;
}

export interface AnthropicToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'document' | 'file' | 'image' | 'prompt' | 'text' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | '__CUSTOM_API_CALL__';
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'url' | 'binary';
	/** URL(s) */
	documentUrls?: string;
	/** Input Data Field Name(s) */
	binaryPropertyName?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** File ID */
	fileId?: string;
	/** Return All */
	returnAll?: boolean;
	/** Limit */
	limit?: number;
	/** URL */
	fileUrl?: string;
	/** URL(s) */
	imageUrls?: string;
	/** The <a href="https://docs.anthropic.com/en/api/prompt-tools-generate">prompt tools APIs</a> are in a closed research preview. Your organization must request access to use them. */
	experimentalNotice?: unknown;
	/** Task */
	task?: string;
	/** Messages */
	messages?: Record<string, unknown>;
	/** Add Attachments */
	addAttachments?: boolean;
	/** Attachments Input Type */
	attachmentsInputType?: 'url' | 'binary';
	/** Attachment URL(s) */
	attachmentsUrls?: string;
}

export interface GoogleGeminiToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'audio' | 'document' | 'file' | 'image' | 'text' | 'video' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | 'transcribe' | '__CUSTOM_API_CALL__';
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'url' | 'binary';
	/** URL(s) */
	audioUrls?: string;
	/** Input Data Field Name(s) */
	binaryPropertyName?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** URL(s) */
	documentUrls?: string;
	/** URL */
	fileUrl?: string;
	/** URL(s) */
	imageUrls?: string;
	/** Prompt */
	prompt?: string;
	/** Images */
	images?: Record<string, unknown>;
	/** Messages */
	messages?: Record<string, unknown>;
	/** Output Content as JSON */
	jsonOutput?: boolean;
	/** URL(s) */
	videoUrls?: string;
	/** URL */
	url?: string;
	/** Return As */
	returnAs?: 'video' | 'url';
}

export interface OllamaToolParameters extends BaseNodeParams {
	/** Tool Description */
	descriptionType?: 'auto' | 'manual';
	/** Description */
	toolDescription?: string;
	/** Resource */
	resource?: 'image' | 'text' | '__CUSTOM_API_CALL__';
	/** Operation */
	operation?: 'analyze' | '__CUSTOM_API_CALL__';
	/** Model */
	modelId?: unknown;
	/** Text Input */
	text?: string;
	/** Input Type */
	inputType?: 'binary' | 'url';
	/** Input Data Field Name(s) */
	binaryPropertyName?: string;
	/** URL(s) */
	imageUrls?: string;
	/** Simplify Output */
	simplify?: boolean;
	/** Messages */
	messages?: Record<string, unknown>;
}

// ===== Node Parameters Map =====

/** Map of node types to their parameter interfaces */
export interface NodeParametersMap {
	'n8n-nodes-base.actionNetwork': ActionNetworkParameters;
	'n8n-nodes-base.activeCampaign': ActiveCampaignParameters;
	'n8n-nodes-base.activeCampaignTrigger': ActiveCampaignTriggerParameters;
	'n8n-nodes-base.acuitySchedulingTrigger': AcuitySchedulingTriggerParameters;
	'n8n-nodes-base.adalo': AdaloParameters;
	'n8n-nodes-base.affinity': AffinityParameters;
	'n8n-nodes-base.affinityTrigger': AffinityTriggerParameters;
	'n8n-nodes-base.agileCrm': AgileCrmParameters;
	'n8n-nodes-base.airtable': Airtable_v2_1Parameters;
	'n8n-nodes-base.airtableTrigger': AirtableTriggerParameters;
	'n8n-nodes-base.airtop': AirtopParameters;
	'n8n-nodes-base.aiTransform': AiTransformParameters;
	'n8n-nodes-base.amqp': AmqpParameters;
	'n8n-nodes-base.amqpTrigger': AmqpTriggerParameters;
	'n8n-nodes-base.apiTemplateIo': ApiTemplateIoParameters;
	'n8n-nodes-base.asana': AsanaParameters;
	'n8n-nodes-base.asanaTrigger': AsanaTriggerParameters;
	'n8n-nodes-base.automizy': AutomizyParameters;
	'n8n-nodes-base.autopilot': AutopilotParameters;
	'n8n-nodes-base.autopilotTrigger': AutopilotTriggerParameters;
	'n8n-nodes-base.awsLambda': AwsLambdaParameters;
	'n8n-nodes-base.awsSns': AwsSnsParameters;
	'n8n-nodes-base.awsSnsTrigger': AwsSnsTriggerParameters;
	'n8n-nodes-base.awsCertificateManager': AwsCertificateManagerParameters;
	'n8n-nodes-base.awsCognito': AwsCognitoParameters;
	'n8n-nodes-base.awsComprehend': AwsComprehendParameters;
	'n8n-nodes-base.awsDynamoDb': AwsDynamoDbParameters;
	'n8n-nodes-base.awsElb': AwsElbParameters;
	'n8n-nodes-base.awsIam': AwsIamParameters;
	'n8n-nodes-base.awsRekognition': AwsRekognitionParameters;
	'n8n-nodes-base.awsS3': AwsS3_v2Parameters;
	'n8n-nodes-base.awsSes': AwsSesParameters;
	'n8n-nodes-base.awsSqs': AwsSqsParameters;
	'n8n-nodes-base.awsTextract': AwsTextractParameters;
	'n8n-nodes-base.awsTranscribe': AwsTranscribeParameters;
	'n8n-nodes-base.bambooHr': BambooHrParameters;
	'n8n-nodes-base.bannerbear': BannerbearParameters;
	'n8n-nodes-base.baserow': BaserowParameters;
	'n8n-nodes-base.beeminder': BeeminderParameters;
	'n8n-nodes-base.bitbucketTrigger': BitbucketTriggerParameters;
	'n8n-nodes-base.bitly': BitlyParameters;
	'n8n-nodes-base.bitwarden': BitwardenParameters;
	'n8n-nodes-base.box': BoxParameters;
	'n8n-nodes-base.boxTrigger': BoxTriggerParameters;
	'n8n-nodes-base.Brandfetch': BrandfetchParameters;
	'n8n-nodes-base.bubble': BubbleParameters;
	'n8n-nodes-base.calTrigger': CalTriggerParameters;
	'n8n-nodes-base.calendlyTrigger': CalendlyTriggerParameters;
	'n8n-nodes-base.chargebee': ChargebeeParameters;
	'n8n-nodes-base.chargebeeTrigger': ChargebeeTriggerParameters;
	'n8n-nodes-base.circleCi': CircleCiParameters;
	'n8n-nodes-base.ciscoWebex': CiscoWebexParameters;
	'n8n-nodes-base.ciscoWebexTrigger': CiscoWebexTriggerParameters;
	'n8n-nodes-base.cloudflare': CloudflareParameters;
	'n8n-nodes-base.clearbit': ClearbitParameters;
	'n8n-nodes-base.clickUp': ClickUpParameters;
	'n8n-nodes-base.clickUpTrigger': ClickUpTriggerParameters;
	'n8n-nodes-base.clockify': ClockifyParameters;
	'n8n-nodes-base.clockifyTrigger': ClockifyTriggerParameters;
	'n8n-nodes-base.cockpit': CockpitParameters;
	'n8n-nodes-base.coda': CodaParameters;
	'n8n-nodes-base.code': Code_v2Parameters;
	'n8n-nodes-base.coinGecko': CoinGeckoParameters;
	'n8n-nodes-base.compareDatasets': CompareDatasetsParameters;
	'n8n-nodes-base.compression': CompressionParameters;
	'n8n-nodes-base.contentful': ContentfulParameters;
	'n8n-nodes-base.convertKit': ConvertKitParameters;
	'n8n-nodes-base.convertKitTrigger': ConvertKitTriggerParameters;
	'n8n-nodes-base.copper': CopperParameters;
	'n8n-nodes-base.copperTrigger': CopperTriggerParameters;
	'n8n-nodes-base.cortex': CortexParameters;
	'n8n-nodes-base.crateDb': CrateDbParameters;
	'n8n-nodes-base.cron': CronParameters;
	'n8n-nodes-base.crowdDev': CrowdDevParameters;
	'n8n-nodes-base.crowdDevTrigger': CrowdDevTriggerParameters;
	'n8n-nodes-base.crypto': CryptoParameters;
	'n8n-nodes-base.customerIo': CustomerIoParameters;
	'n8n-nodes-base.customerIoTrigger': CustomerIoTriggerParameters;
	'n8n-nodes-base.dataTable': DataTableParameters;
	'n8n-nodes-base.dateTime': DateTime_v2Parameters;
	'n8n-nodes-base.debugHelper': DebugHelperParameters;
	'n8n-nodes-base.deepL': DeepLParameters;
	'n8n-nodes-base.demio': DemioParameters;
	'n8n-nodes-base.dhl': DhlParameters;
	'n8n-nodes-base.discord': Discord_v2Parameters;
	'n8n-nodes-base.discourse': DiscourseParameters;
	'n8n-nodes-base.disqus': DisqusParameters;
	'n8n-nodes-base.drift': DriftParameters;
	'n8n-nodes-base.dropbox': DropboxParameters;
	'n8n-nodes-base.dropcontact': DropcontactParameters;
	'n8n-nodes-base.editImage': EditImageParameters;
	'n8n-nodes-base.egoi': EgoiParameters;
	'n8n-nodes-base.elasticsearch': ElasticsearchParameters;
	'n8n-nodes-base.elasticSecurity': ElasticSecurityParameters;
	'n8n-nodes-base.emailReadImap': EmailReadImap_v2_1Parameters;
	'n8n-nodes-base.emailSend': EmailSend_v2_1Parameters;
	'n8n-nodes-base.emelia': EmeliaParameters;
	'n8n-nodes-base.emeliaTrigger': EmeliaTriggerParameters;
	'n8n-nodes-base.erpNext': ErpNextParameters;
	'n8n-nodes-base.errorTrigger': ErrorTriggerParameters;
	'n8n-nodes-base.evaluationTrigger': EvaluationTriggerParameters;
	'n8n-nodes-base.evaluation': EvaluationParameters;
	'n8n-nodes-base.eventbriteTrigger': EventbriteTriggerParameters;
	'n8n-nodes-base.executeCommand': ExecuteCommandParameters;
	'n8n-nodes-base.executeWorkflow': ExecuteWorkflowParameters;
	'n8n-nodes-base.executeWorkflowTrigger': ExecuteWorkflowTriggerParameters;
	'n8n-nodes-base.executionData': ExecutionDataParameters;
	'n8n-nodes-base.facebookGraphApi': FacebookGraphApiParameters;
	'n8n-nodes-base.facebookTrigger': FacebookTriggerParameters;
	'n8n-nodes-base.facebookLeadAdsTrigger': FacebookLeadAdsTriggerParameters;
	'n8n-nodes-base.figmaTrigger': FigmaTriggerParameters;
	'n8n-nodes-base.filemaker': FilemakerParameters;
	'n8n-nodes-base.readWriteFile': ReadWriteFileParameters;
	'n8n-nodes-base.convertToFile': ConvertToFileParameters;
	'n8n-nodes-base.extractFromFile': ExtractFromFileParameters;
	'n8n-nodes-base.filter': Filter_v2_2Parameters;
	'n8n-nodes-base.flow': FlowParameters;
	'n8n-nodes-base.flowTrigger': FlowTriggerParameters;
	'n8n-nodes-base.form': FormParameters;
	'n8n-nodes-base.formTrigger': FormTrigger_v2_3Parameters;
	'n8n-nodes-base.formIoTrigger': FormIoTriggerParameters;
	'n8n-nodes-base.formstackTrigger': FormstackTriggerParameters;
	'n8n-nodes-base.freshdesk': FreshdeskParameters;
	'n8n-nodes-base.freshservice': FreshserviceParameters;
	'n8n-nodes-base.freshworksCrm': FreshworksCrmParameters;
	'n8n-nodes-base.ftp': FtpParameters;
	'n8n-nodes-base.function': FunctionParameters;
	'n8n-nodes-base.functionItem': FunctionItemParameters;
	'n8n-nodes-base.getResponse': GetResponseParameters;
	'n8n-nodes-base.getResponseTrigger': GetResponseTriggerParameters;
	'n8n-nodes-base.ghost': GhostParameters;
	'n8n-nodes-base.git': GitParameters;
	'n8n-nodes-base.github': GithubParameters;
	'n8n-nodes-base.githubTrigger': GithubTriggerParameters;
	'n8n-nodes-base.gitlab': GitlabParameters;
	'n8n-nodes-base.gitlabTrigger': GitlabTriggerParameters;
	'n8n-nodes-base.gong': GongParameters;
	'n8n-nodes-base.googleAds': GoogleAdsParameters;
	'n8n-nodes-base.googleAnalytics': GoogleAnalytics_v2Parameters;
	'n8n-nodes-base.googleBigQuery': GoogleBigQuery_v2_1Parameters;
	'n8n-nodes-base.googleBooks': GoogleBooksParameters;
	'n8n-nodes-base.googleCalendar': GoogleCalendarParameters;
	'n8n-nodes-base.googleCalendarTrigger': GoogleCalendarTriggerParameters;
	'n8n-nodes-base.googleChat': GoogleChatParameters;
	'n8n-nodes-base.googleCloudNaturalLanguage': GoogleCloudNaturalLanguageParameters;
	'n8n-nodes-base.googleCloudStorage': GoogleCloudStorageParameters;
	'n8n-nodes-base.googleContacts': GoogleContactsParameters;
	'n8n-nodes-base.googleDocs': GoogleDocsParameters;
	'n8n-nodes-base.googleDrive': GoogleDrive_v3Parameters;
	'n8n-nodes-base.googleDriveTrigger': GoogleDriveTriggerParameters;
	'n8n-nodes-base.googleFirebaseCloudFirestore': GoogleFirebaseCloudFirestoreParameters;
	'n8n-nodes-base.googleFirebaseRealtimeDatabase': GoogleFirebaseRealtimeDatabaseParameters;
	'n8n-nodes-base.gmail': Gmail_v2_1Parameters;
	'n8n-nodes-base.gmailTrigger': GmailTriggerParameters;
	'n8n-nodes-base.gSuiteAdmin': GSuiteAdminParameters;
	'n8n-nodes-base.googleBusinessProfile': GoogleBusinessProfileParameters;
	'n8n-nodes-base.googleBusinessProfileTrigger': GoogleBusinessProfileTriggerParameters;
	'n8n-nodes-base.googlePerspective': GooglePerspectiveParameters;
	'n8n-nodes-base.googleSheets': GoogleSheets_v4_7Parameters;
	'n8n-nodes-base.googleSheetsTrigger': GoogleSheetsTriggerParameters;
	'n8n-nodes-base.googleSlides': GoogleSlidesParameters;
	'n8n-nodes-base.googleTasks': GoogleTasksParameters;
	'n8n-nodes-base.googleTranslate': GoogleTranslateParameters;
	'n8n-nodes-base.youTube': YouTubeParameters;
	'n8n-nodes-base.gotify': GotifyParameters;
	'n8n-nodes-base.goToWebinar': GoToWebinarParameters;
	'n8n-nodes-base.grafana': GrafanaParameters;
	'n8n-nodes-base.graphql': GraphqlParameters;
	'n8n-nodes-base.grist': GristParameters;
	'n8n-nodes-base.gumroadTrigger': GumroadTriggerParameters;
	'n8n-nodes-base.hackerNews': HackerNewsParameters;
	'n8n-nodes-base.haloPSA': HaloPSAParameters;
	'n8n-nodes-base.harvest': HarvestParameters;
	'n8n-nodes-base.helpScout': HelpScoutParameters;
	'n8n-nodes-base.helpScoutTrigger': HelpScoutTriggerParameters;
	'n8n-nodes-base.highLevel': HighLevel_v2Parameters;
	'n8n-nodes-base.homeAssistant': HomeAssistantParameters;
	'n8n-nodes-base.htmlExtract': HtmlExtractParameters;
	'n8n-nodes-base.html': HtmlParameters;
	'n8n-nodes-base.httpRequest': HttpRequest_v4_3Parameters;
	'n8n-nodes-base.hubspot': Hubspot_v2_2Parameters;
	'n8n-nodes-base.hubspotTrigger': HubspotTriggerParameters;
	'n8n-nodes-base.humanticAi': HumanticAiParameters;
	'n8n-nodes-base.hunter': HunterParameters;
	'n8n-nodes-base.iCal': ICalParameters;
	'n8n-nodes-base.if': If_v2_2Parameters;
	'n8n-nodes-base.intercom': IntercomParameters;
	'n8n-nodes-base.interval': IntervalParameters;
	'n8n-nodes-base.invoiceNinja': InvoiceNinjaParameters;
	'n8n-nodes-base.invoiceNinjaTrigger': InvoiceNinjaTriggerParameters;
	'n8n-nodes-base.itemLists': ItemLists_v3_1Parameters;
	'n8n-nodes-base.iterable': IterableParameters;
	'n8n-nodes-base.jenkins': JenkinsParameters;
	'n8n-nodes-base.jinaAi': JinaAiParameters;
	'n8n-nodes-base.jira': JiraParameters;
	'n8n-nodes-base.jiraTrigger': JiraTriggerParameters;
	'n8n-nodes-base.jotFormTrigger': JotFormTriggerParameters;
	'n8n-nodes-base.jwt': JwtParameters;
	'n8n-nodes-base.kafka': KafkaParameters;
	'n8n-nodes-base.kafkaTrigger': KafkaTriggerParameters;
	'n8n-nodes-base.keap': KeapParameters;
	'n8n-nodes-base.keapTrigger': KeapTriggerParameters;
	'n8n-nodes-base.kitemaker': KitemakerParameters;
	'n8n-nodes-base.koBoToolbox': KoBoToolboxParameters;
	'n8n-nodes-base.koBoToolboxTrigger': KoBoToolboxTriggerParameters;
	'n8n-nodes-base.ldap': LdapParameters;
	'n8n-nodes-base.lemlist': Lemlist_v2Parameters;
	'n8n-nodes-base.lemlistTrigger': LemlistTriggerParameters;
	'n8n-nodes-base.line': LineParameters;
	'n8n-nodes-base.linear': LinearParameters;
	'n8n-nodes-base.linearTrigger': LinearTriggerParameters;
	'n8n-nodes-base.lingvaNex': LingvaNexParameters;
	'n8n-nodes-base.linkedIn': LinkedInParameters;
	'n8n-nodes-base.localFileTrigger': LocalFileTriggerParameters;
	'n8n-nodes-base.loneScaleTrigger': LoneScaleTriggerParameters;
	'n8n-nodes-base.loneScale': LoneScaleParameters;
	'n8n-nodes-base.magento2': Magento2Parameters;
	'n8n-nodes-base.mailcheck': MailcheckParameters;
	'n8n-nodes-base.mailchimp': MailchimpParameters;
	'n8n-nodes-base.mailchimpTrigger': MailchimpTriggerParameters;
	'n8n-nodes-base.mailerLite': MailerLite_v2Parameters;
	'n8n-nodes-base.mailerLiteTrigger': MailerLiteTrigger_v2Parameters;
	'n8n-nodes-base.mailgun': MailgunParameters;
	'n8n-nodes-base.mailjet': MailjetParameters;
	'n8n-nodes-base.mailjetTrigger': MailjetTriggerParameters;
	'n8n-nodes-base.mandrill': MandrillParameters;
	'n8n-nodes-base.manualTrigger': ManualTriggerParameters;
	'n8n-nodes-base.markdown': MarkdownParameters;
	'n8n-nodes-base.marketstack': MarketstackParameters;
	'n8n-nodes-base.matrix': MatrixParameters;
	'n8n-nodes-base.mattermost': MattermostParameters;
	'n8n-nodes-base.mautic': MauticParameters;
	'n8n-nodes-base.mauticTrigger': MauticTriggerParameters;
	'n8n-nodes-base.medium': MediumParameters;
	'n8n-nodes-base.merge': Merge_v3_2Parameters;
	'n8n-nodes-base.messageBird': MessageBirdParameters;
	'n8n-nodes-base.metabase': MetabaseParameters;
	'n8n-nodes-base.azureCosmosDb': AzureCosmosDbParameters;
	'n8n-nodes-base.microsoftDynamicsCrm': MicrosoftDynamicsCrmParameters;
	'n8n-nodes-base.microsoftEntra': MicrosoftEntraParameters;
	'n8n-nodes-base.microsoftExcel': MicrosoftExcel_v2_2Parameters;
	'n8n-nodes-base.microsoftGraphSecurity': MicrosoftGraphSecurityParameters;
	'n8n-nodes-base.microsoftOneDrive': MicrosoftOneDriveParameters;
	'n8n-nodes-base.microsoftOneDriveTrigger': MicrosoftOneDriveTriggerParameters;
	'n8n-nodes-base.microsoftOutlook': MicrosoftOutlook_v2Parameters;
	'n8n-nodes-base.microsoftOutlookTrigger': MicrosoftOutlookTriggerParameters;
	'n8n-nodes-base.microsoftSharePoint': MicrosoftSharePointParameters;
	'n8n-nodes-base.microsoftSql': MicrosoftSqlParameters;
	'n8n-nodes-base.azureStorage': AzureStorageParameters;
	'n8n-nodes-base.microsoftTeams': MicrosoftTeams_v1_1Parameters;
	'n8n-nodes-base.microsoftTeamsTrigger': MicrosoftTeamsTriggerParameters;
	'n8n-nodes-base.microsoftToDo': MicrosoftToDoParameters;
	'n8n-nodes-base.mindee': MindeeParameters;
	'n8n-nodes-base.misp': MispParameters;
	'n8n-nodes-base.mistralAi': MistralAiParameters;
	'n8n-nodes-base.mocean': MoceanParameters;
	'n8n-nodes-base.mondayCom': MondayComParameters;
	'n8n-nodes-base.mongoDb': MongoDbParameters;
	'n8n-nodes-base.monicaCrm': MonicaCrmParameters;
	'n8n-nodes-base.moveBinaryData': MoveBinaryDataParameters;
	'n8n-nodes-base.mqtt': MqttParameters;
	'n8n-nodes-base.mqttTrigger': MqttTriggerParameters;
	'n8n-nodes-base.msg91': Msg91Parameters;
	'n8n-nodes-base.mySql': MySql_v2_5Parameters;
	'n8n-nodes-base.n8n': N8nParameters;
	'n8n-nodes-base.n8nTrainingCustomerDatastore': N8nTrainingCustomerDatastoreParameters;
	'n8n-nodes-base.n8nTrainingCustomerMessenger': N8nTrainingCustomerMessengerParameters;
	'n8n-nodes-base.n8nTrigger': N8nTriggerParameters;
	'n8n-nodes-base.nasa': NasaParameters;
	'n8n-nodes-base.netlify': NetlifyParameters;
	'n8n-nodes-base.netlifyTrigger': NetlifyTriggerParameters;
	'n8n-nodes-base.nextCloud': NextCloudParameters;
	'n8n-nodes-base.nocoDb': NocoDbParameters;
	'n8n-nodes-base.sendInBlue': SendInBlueParameters;
	'n8n-nodes-base.sendInBlueTrigger': SendInBlueTriggerParameters;
	'n8n-nodes-base.stickyNote': StickyNoteParameters;
	'n8n-nodes-base.onfleet': OnfleetParameters;
	'n8n-nodes-base.onfleetTrigger': OnfleetTriggerParameters;
	'n8n-nodes-base.citrixAdc': CitrixAdcParameters;
	'n8n-nodes-base.notion': Notion_v2_2Parameters;
	'n8n-nodes-base.notionTrigger': NotionTriggerParameters;
	'n8n-nodes-base.npm': NpmParameters;
	'n8n-nodes-base.odoo': OdooParameters;
	'n8n-nodes-base.okta': OktaParameters;
	'n8n-nodes-base.oneSimpleApi': OneSimpleApiParameters;
	'n8n-nodes-base.openAi': OpenAi_v1_1Parameters;
	'n8n-nodes-base.openThesaurus': OpenThesaurusParameters;
	'n8n-nodes-base.openWeatherMap': OpenWeatherMapParameters;
	'n8n-nodes-base.oracleDatabase': OracleDatabaseParameters;
	'n8n-nodes-base.orbit': OrbitParameters;
	'n8n-nodes-base.oura': OuraParameters;
	'n8n-nodes-base.paddle': PaddleParameters;
	'n8n-nodes-base.pagerDuty': PagerDutyParameters;
	'n8n-nodes-base.payPal': PayPalParameters;
	'n8n-nodes-base.payPalTrigger': PayPalTriggerParameters;
	'n8n-nodes-base.peekalink': PeekalinkParameters;
	'n8n-nodes-base.perplexity': PerplexityParameters;
	'n8n-nodes-base.phantombuster': PhantombusterParameters;
	'n8n-nodes-base.philipsHue': PhilipsHueParameters;
	'n8n-nodes-base.pipedrive': PipedriveParameters;
	'n8n-nodes-base.pipedriveTrigger': PipedriveTriggerParameters;
	'n8n-nodes-base.plivo': PlivoParameters;
	'n8n-nodes-base.postBin': PostBinParameters;
	'n8n-nodes-base.postgres': Postgres_v2_6Parameters;
	'n8n-nodes-base.postgresTrigger': PostgresTriggerParameters;
	'n8n-nodes-base.postHog': PostHogParameters;
	'n8n-nodes-base.postmarkTrigger': PostmarkTriggerParameters;
	'n8n-nodes-base.profitWell': ProfitWellParameters;
	'n8n-nodes-base.pushbullet': PushbulletParameters;
	'n8n-nodes-base.pushcut': PushcutParameters;
	'n8n-nodes-base.pushcutTrigger': PushcutTriggerParameters;
	'n8n-nodes-base.pushover': PushoverParameters;
	'n8n-nodes-base.questDb': QuestDbParameters;
	'n8n-nodes-base.quickbase': QuickbaseParameters;
	'n8n-nodes-base.quickbooks': QuickbooksParameters;
	'n8n-nodes-base.quickChart': QuickChartParameters;
	'n8n-nodes-base.rabbitmq': RabbitmqParameters;
	'n8n-nodes-base.rabbitmqTrigger': RabbitmqTriggerParameters;
	'n8n-nodes-base.raindrop': RaindropParameters;
	'n8n-nodes-base.readBinaryFile': ReadBinaryFileParameters;
	'n8n-nodes-base.readBinaryFiles': ReadBinaryFilesParameters;
	'n8n-nodes-base.readPDF': ReadPDFParameters;
	'n8n-nodes-base.reddit': RedditParameters;
	'n8n-nodes-base.redis': RedisParameters;
	'n8n-nodes-base.redisTrigger': RedisTriggerParameters;
	'n8n-nodes-base.renameKeys': RenameKeysParameters;
	'n8n-nodes-base.respondToWebhook': RespondToWebhookParameters;
	'n8n-nodes-base.rocketchat': RocketchatParameters;
	'n8n-nodes-base.rssFeedRead': RssFeedReadParameters;
	'n8n-nodes-base.rssFeedReadTrigger': RssFeedReadTriggerParameters;
	'n8n-nodes-base.rundeck': RundeckParameters;
	'n8n-nodes-base.s3': S3Parameters;
	'n8n-nodes-base.salesforce': SalesforceParameters;
	'n8n-nodes-base.salesforceTrigger': SalesforceTriggerParameters;
	'n8n-nodes-base.salesmate': SalesmateParameters;
	'n8n-nodes-base.scheduleTrigger': ScheduleTriggerParameters;
	'n8n-nodes-base.seaTable': SeaTable_v2Parameters;
	'n8n-nodes-base.seaTableTrigger': SeaTableTrigger_v2Parameters;
	'n8n-nodes-base.securityScorecard': SecurityScorecardParameters;
	'n8n-nodes-base.segment': SegmentParameters;
	'n8n-nodes-base.sendGrid': SendGridParameters;
	'n8n-nodes-base.sendy': SendyParameters;
	'n8n-nodes-base.sentryIo': SentryIoParameters;
	'n8n-nodes-base.serviceNow': ServiceNowParameters;
	'n8n-nodes-base.set': Set_v3_4Parameters;
	'n8n-nodes-base.shopify': ShopifyParameters;
	'n8n-nodes-base.shopifyTrigger': ShopifyTriggerParameters;
	'n8n-nodes-base.signl4': Signl4Parameters;
	'n8n-nodes-base.simulate': SimulateParameters;
	'n8n-nodes-base.simulateTrigger': SimulateTriggerParameters;
	'n8n-nodes-base.slack': Slack_v2_3Parameters;
	'n8n-nodes-base.slackTrigger': SlackTriggerParameters;
	'n8n-nodes-base.sms77': Sms77Parameters;
	'n8n-nodes-base.snowflake': SnowflakeParameters;
	'n8n-nodes-base.splitInBatches': SplitInBatches_v3Parameters;
	'n8n-nodes-base.splunk': Splunk_v2Parameters;
	'n8n-nodes-base.spontit': SpontitParameters;
	'n8n-nodes-base.spotify': SpotifyParameters;
	'n8n-nodes-base.spreadsheetFile': SpreadsheetFile_v2Parameters;
	'n8n-nodes-base.sseTrigger': SseTriggerParameters;
	'n8n-nodes-base.ssh': SshParameters;
	'n8n-nodes-base.stackby': StackbyParameters;
	'n8n-nodes-base.start': StartParameters;
	'n8n-nodes-base.stopAndError': StopAndErrorParameters;
	'n8n-nodes-base.storyblok': StoryblokParameters;
	'n8n-nodes-base.strapi': StrapiParameters;
	'n8n-nodes-base.strava': StravaParameters;
	'n8n-nodes-base.stravaTrigger': StravaTriggerParameters;
	'n8n-nodes-base.stripe': StripeParameters;
	'n8n-nodes-base.stripeTrigger': StripeTriggerParameters;
	'n8n-nodes-base.supabase': SupabaseParameters;
	'n8n-nodes-base.surveyMonkeyTrigger': SurveyMonkeyTriggerParameters;
	'n8n-nodes-base.switch': Switch_v3_3Parameters;
	'n8n-nodes-base.syncroMsp': SyncroMspParameters;
	'n8n-nodes-base.taiga': TaigaParameters;
	'n8n-nodes-base.taigaTrigger': TaigaTriggerParameters;
	'n8n-nodes-base.tapfiliate': TapfiliateParameters;
	'n8n-nodes-base.telegram': TelegramParameters;
	'n8n-nodes-base.telegramTrigger': TelegramTriggerParameters;
	'n8n-nodes-base.theHiveProject': TheHiveProjectParameters;
	'n8n-nodes-base.theHiveProjectTrigger': TheHiveProjectTriggerParameters;
	'n8n-nodes-base.theHive': TheHiveParameters;
	'n8n-nodes-base.theHiveTrigger': TheHiveTriggerParameters;
	'n8n-nodes-base.timescaleDb': TimescaleDbParameters;
	'n8n-nodes-base.todoist': Todoist_v2_1Parameters;
	'n8n-nodes-base.togglTrigger': TogglTriggerParameters;
	'n8n-nodes-base.totp': TotpParameters;
	'n8n-nodes-base.travisCi': TravisCiParameters;
	'n8n-nodes-base.trello': TrelloParameters;
	'n8n-nodes-base.trelloTrigger': TrelloTriggerParameters;
	'n8n-nodes-base.twake': TwakeParameters;
	'n8n-nodes-base.twilio': TwilioParameters;
	'n8n-nodes-base.twilioTrigger': TwilioTriggerParameters;
	'n8n-nodes-base.twist': TwistParameters;
	'n8n-nodes-base.twitter': Twitter_v2Parameters;
	'n8n-nodes-base.typeformTrigger': TypeformTriggerParameters;
	'n8n-nodes-base.unleashedSoftware': UnleashedSoftwareParameters;
	'n8n-nodes-base.uplead': UpleadParameters;
	'n8n-nodes-base.uproc': UprocParameters;
	'n8n-nodes-base.uptimeRobot': UptimeRobotParameters;
	'n8n-nodes-base.urlScanIo': UrlScanIoParameters;
	'n8n-nodes-base.vero': VeroParameters;
	'n8n-nodes-base.venafiTlsProtectCloud': VenafiTlsProtectCloudParameters;
	'n8n-nodes-base.venafiTlsProtectCloudTrigger': VenafiTlsProtectCloudTriggerParameters;
	'n8n-nodes-base.venafiTlsProtectDatacenter': VenafiTlsProtectDatacenterParameters;
	'n8n-nodes-base.vonage': VonageParameters;
	'n8n-nodes-base.wait': WaitParameters;
	'n8n-nodes-base.webflow': Webflow_v2Parameters;
	'n8n-nodes-base.webflowTrigger': WebflowTrigger_v2Parameters;
	'n8n-nodes-base.webhook': WebhookParameters;
	'n8n-nodes-base.wekan': WekanParameters;
	'n8n-nodes-base.whatsAppTrigger': WhatsAppTriggerParameters;
	'n8n-nodes-base.whatsApp': WhatsAppParameters;
	'n8n-nodes-base.wise': WiseParameters;
	'n8n-nodes-base.wiseTrigger': WiseTriggerParameters;
	'n8n-nodes-base.wooCommerce': WooCommerceParameters;
	'n8n-nodes-base.wooCommerceTrigger': WooCommerceTriggerParameters;
	'n8n-nodes-base.wordpress': WordpressParameters;
	'n8n-nodes-base.workableTrigger': WorkableTriggerParameters;
	'n8n-nodes-base.workflowTrigger': WorkflowTriggerParameters;
	'n8n-nodes-base.writeBinaryFile': WriteBinaryFileParameters;
	'n8n-nodes-base.wufooTrigger': WufooTriggerParameters;
	'n8n-nodes-base.xero': XeroParameters;
	'n8n-nodes-base.xml': XmlParameters;
	'n8n-nodes-base.yourls': YourlsParameters;
	'n8n-nodes-base.zammad': ZammadParameters;
	'n8n-nodes-base.zendesk': ZendeskParameters;
	'n8n-nodes-base.zendeskTrigger': ZendeskTriggerParameters;
	'n8n-nodes-base.zohoCrm': ZohoCrmParameters;
	'n8n-nodes-base.zoom': ZoomParameters;
	'n8n-nodes-base.zulip': ZulipParameters;
	'n8n-nodes-base.aggregate': AggregateParameters;
	'n8n-nodes-base.limit': LimitParameters;
	'n8n-nodes-base.removeDuplicates': RemoveDuplicates_v1_1Parameters;
	'n8n-nodes-base.splitOut': SplitOutParameters;
	'n8n-nodes-base.sort': SortParameters;
	'n8n-nodes-base.summarize': SummarizeParameters;
	'@n8n/n8n-nodes-langchain.anthropic': AnthropicParameters;
	'@n8n/n8n-nodes-langchain.googleGemini': GoogleGeminiParameters;
	'@n8n/n8n-nodes-langchain.ollama': OllamaParameters;
	'@n8n/n8n-nodes-langchain.openAi': OpenAi_v1_8Parameters;
	'@n8n/n8n-nodes-langchain.agent': Agent_v2_2Parameters;
	'@n8n/n8n-nodes-langchain.agentTool': AgentToolParameters;
	'@n8n/n8n-nodes-langchain.openAiAssistant': OpenAiAssistantParameters;
	'@n8n/n8n-nodes-langchain.chainSummarization': ChainSummarization_v2_1Parameters;
	'@n8n/n8n-nodes-langchain.chainLlm': ChainLlmParameters;
	'@n8n/n8n-nodes-langchain.chainRetrievalQa': ChainRetrievalQaParameters;
	'@n8n/n8n-nodes-langchain.sentimentAnalysis': SentimentAnalysisParameters;
	'@n8n/n8n-nodes-langchain.informationExtractor': InformationExtractorParameters;
	'@n8n/n8n-nodes-langchain.textClassifier': TextClassifierParameters;
	'@n8n/n8n-nodes-langchain.code': Code_v1Parameters;
	'@n8n/n8n-nodes-langchain.documentDefaultDataLoader': DocumentDefaultDataLoaderParameters;
	'@n8n/n8n-nodes-langchain.documentBinaryInputLoader': DocumentBinaryInputLoaderParameters;
	'@n8n/n8n-nodes-langchain.documentGithubLoader': DocumentGithubLoaderParameters;
	'@n8n/n8n-nodes-langchain.documentJsonInputLoader': DocumentJsonInputLoaderParameters;
	'@n8n/n8n-nodes-langchain.embeddingsCohere': EmbeddingsCohereParameters;
	'@n8n/n8n-nodes-langchain.embeddingsAwsBedrock': EmbeddingsAwsBedrockParameters;
	'@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi': EmbeddingsAzureOpenAiParameters;
	'@n8n/n8n-nodes-langchain.embeddingsGoogleGemini': EmbeddingsGoogleGeminiParameters;
	'@n8n/n8n-nodes-langchain.embeddingsGoogleVertex': EmbeddingsGoogleVertexParameters;
	'@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference': EmbeddingsHuggingFaceInferenceParameters;
	'@n8n/n8n-nodes-langchain.embeddingsMistralCloud': EmbeddingsMistralCloudParameters;
	'@n8n/n8n-nodes-langchain.embeddingsOpenAi': EmbeddingsOpenAiParameters;
	'@n8n/n8n-nodes-langchain.embeddingsLemonade': EmbeddingsLemonadeParameters;
	'@n8n/n8n-nodes-langchain.embeddingsOllama': EmbeddingsOllamaParameters;
	'@n8n/n8n-nodes-langchain.lmChatAnthropic': LmChatAnthropicParameters;
	'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi': LmChatAzureOpenAiParameters;
	'@n8n/n8n-nodes-langchain.lmChatAwsBedrock': LmChatAwsBedrockParameters;
	'@n8n/n8n-nodes-langchain.lmChatCohere': LmChatCohereParameters;
	'@n8n/n8n-nodes-langchain.lmChatDeepSeek': LmChatDeepSeekParameters;
	'@n8n/n8n-nodes-langchain.lmChatGoogleGemini': LmChatGoogleGeminiParameters;
	'@n8n/n8n-nodes-langchain.lmChatGoogleVertex': LmChatGoogleVertexParameters;
	'@n8n/n8n-nodes-langchain.lmChatGroq': LmChatGroqParameters;
	'@n8n/n8n-nodes-langchain.lmChatMistralCloud': LmChatMistralCloudParameters;
	'@n8n/n8n-nodes-langchain.lmChatLemonade': LmChatLemonadeParameters;
	'@n8n/n8n-nodes-langchain.lmChatOllama': LmChatOllamaParameters;
	'@n8n/n8n-nodes-langchain.lmChatOpenRouter': LmChatOpenRouterParameters;
	'@n8n/n8n-nodes-langchain.lmChatVercelAiGateway': LmChatVercelAiGatewayParameters;
	'@n8n/n8n-nodes-langchain.lmChatXAiGrok': LmChatXAiGrokParameters;
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': LmChatOpenAiParameters;
	'@n8n/n8n-nodes-langchain.lmOpenAi': LmOpenAiParameters;
	'@n8n/n8n-nodes-langchain.lmCohere': LmCohereParameters;
	'@n8n/n8n-nodes-langchain.lmLemonade': LmLemonadeParameters;
	'@n8n/n8n-nodes-langchain.lmOllama': LmOllamaParameters;
	'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference': LmOpenHuggingFaceInferenceParameters;
	'@n8n/n8n-nodes-langchain.mcpClientTool': McpClientToolParameters;
	'@n8n/n8n-nodes-langchain.mcpTrigger': McpTriggerParameters;
	'@n8n/n8n-nodes-langchain.memoryBufferWindow': MemoryBufferWindowParameters;
	'@n8n/n8n-nodes-langchain.memoryMotorhead': MemoryMotorheadParameters;
	'@n8n/n8n-nodes-langchain.memoryPostgresChat': MemoryPostgresChatParameters;
	'@n8n/n8n-nodes-langchain.memoryMongoDbChat': MemoryMongoDbChatParameters;
	'@n8n/n8n-nodes-langchain.memoryRedisChat': MemoryRedisChatParameters;
	'@n8n/n8n-nodes-langchain.memoryManager': MemoryManagerParameters;
	'@n8n/n8n-nodes-langchain.memoryChatRetriever': MemoryChatRetrieverParameters;
	'@n8n/n8n-nodes-langchain.memoryXata': MemoryXataParameters;
	'@n8n/n8n-nodes-langchain.memoryZep': MemoryZepParameters;
	'@n8n/n8n-nodes-langchain.outputParserAutofixing': OutputParserAutofixingParameters;
	'@n8n/n8n-nodes-langchain.outputParserItemList': OutputParserItemListParameters;
	'@n8n/n8n-nodes-langchain.outputParserStructured': OutputParserStructuredParameters;
	'@n8n/n8n-nodes-langchain.rerankerCohere': RerankerCohereParameters;
	'@n8n/n8n-nodes-langchain.retrieverVectorStore': RetrieverVectorStoreParameters;
	'@n8n/n8n-nodes-langchain.retrieverMultiQuery': RetrieverMultiQueryParameters;
	'@n8n/n8n-nodes-langchain.retrieverWorkflow': RetrieverWorkflowParameters;
	'@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter': TextSplitterCharacterTextSplitterParameters;
	'@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter': TextSplitterRecursiveCharacterTextSplitterParameters;
	'@n8n/n8n-nodes-langchain.textSplitterTokenSplitter': TextSplitterTokenSplitterParameters;
	'@n8n/n8n-nodes-langchain.toolCalculator': ToolCalculatorParameters;
	'@n8n/n8n-nodes-langchain.toolCode': ToolCodeParameters;
	'@n8n/n8n-nodes-langchain.toolHttpRequest': ToolHttpRequestParameters;
	'@n8n/n8n-nodes-langchain.toolSearXng': ToolSearXngParameters;
	'@n8n/n8n-nodes-langchain.toolSerpApi': ToolSerpApiParameters;
	'@n8n/n8n-nodes-langchain.toolThink': ToolThinkParameters;
	'@n8n/n8n-nodes-langchain.toolVectorStore': ToolVectorStoreParameters;
	'@n8n/n8n-nodes-langchain.toolWikipedia': ToolWikipediaParameters;
	'@n8n/n8n-nodes-langchain.toolWolframAlpha': ToolWolframAlphaParameters;
	'@n8n/n8n-nodes-langchain.toolWorkflow': ToolWorkflow_v2_2Parameters;
	'@n8n/n8n-nodes-langchain.manualChatTrigger': ManualChatTriggerParameters;
	'@n8n/n8n-nodes-langchain.chatTrigger': ChatTriggerParameters;
	'@n8n/n8n-nodes-langchain.chat': ChatParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory': VectorStoreInMemoryParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreInMemoryInsert': VectorStoreInMemoryInsertParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreInMemoryLoad': VectorStoreInMemoryLoadParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreMilvus': VectorStoreMilvusParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas': VectorStoreMongoDBAtlasParameters;
	'@n8n/n8n-nodes-langchain.vectorStorePGVector': VectorStorePGVectorParameters;
	'@n8n/n8n-nodes-langchain.vectorStorePinecone': VectorStorePineconeParameters;
	'@n8n/n8n-nodes-langchain.vectorStorePineconeInsert': VectorStorePineconeInsertParameters;
	'@n8n/n8n-nodes-langchain.vectorStorePineconeLoad': VectorStorePineconeLoadParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreRedis': VectorStoreRedisParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreQdrant': VectorStoreQdrantParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreSupabase': VectorStoreSupabaseParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreSupabaseInsert': VectorStoreSupabaseInsertParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreSupabaseLoad': VectorStoreSupabaseLoadParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreWeaviate': VectorStoreWeaviateParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreZep': VectorStoreZepParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreZepInsert': VectorStoreZepInsertParameters;
	'@n8n/n8n-nodes-langchain.vectorStoreZepLoad': VectorStoreZepLoadParameters;
	'@n8n/n8n-nodes-langchain.toolExecutor': ToolExecutorParameters;
	'@n8n/n8n-nodes-langchain.modelSelector': ModelSelectorParameters;
	'n8n-nodes-base.actionNetworkTool': ActionNetworkToolParameters;
	'n8n-nodes-base.activeCampaignTool': ActiveCampaignToolParameters;
	'n8n-nodes-base.adaloTool': AdaloToolParameters;
	'n8n-nodes-base.affinityTool': AffinityToolParameters;
	'n8n-nodes-base.agileCrmTool': AgileCrmToolParameters;
	'n8n-nodes-base.airtableTool': AirtableToolParameters;
	'n8n-nodes-base.airtopTool': AirtopToolParameters;
	'n8n-nodes-base.amqpTool': AmqpToolParameters;
	'n8n-nodes-base.apiTemplateIoTool': ApiTemplateIoToolParameters;
	'n8n-nodes-base.asanaTool': AsanaToolParameters;
	'n8n-nodes-base.autopilotTool': AutopilotToolParameters;
	'n8n-nodes-base.awsLambdaTool': AwsLambdaToolParameters;
	'n8n-nodes-base.awsSnsTool': AwsSnsToolParameters;
	'n8n-nodes-base.awsS3Tool': AwsS3ToolParameters;
	'n8n-nodes-base.awsSesTool': AwsSesToolParameters;
	'n8n-nodes-base.awsTextractTool': AwsTextractToolParameters;
	'n8n-nodes-base.awsTranscribeTool': AwsTranscribeToolParameters;
	'n8n-nodes-base.bambooHrTool': BambooHrToolParameters;
	'n8n-nodes-base.baserowTool': BaserowToolParameters;
	'n8n-nodes-base.beeminderTool': BeeminderToolParameters;
	'n8n-nodes-base.bitlyTool': BitlyToolParameters;
	'n8n-nodes-base.bitwardenTool': BitwardenToolParameters;
	'n8n-nodes-base.BrandfetchTool': BrandfetchToolParameters;
	'n8n-nodes-base.bubbleTool': BubbleToolParameters;
	'n8n-nodes-base.chargebeeTool': ChargebeeToolParameters;
	'n8n-nodes-base.circleCiTool': CircleCiToolParameters;
	'n8n-nodes-base.ciscoWebexTool': CiscoWebexToolParameters;
	'n8n-nodes-base.cloudflareTool': CloudflareToolParameters;
	'n8n-nodes-base.clearbitTool': ClearbitToolParameters;
	'n8n-nodes-base.clickUpTool': ClickUpToolParameters;
	'n8n-nodes-base.clockifyTool': ClockifyToolParameters;
	'n8n-nodes-base.cockpitTool': CockpitToolParameters;
	'n8n-nodes-base.codaTool': CodaToolParameters;
	'n8n-nodes-base.coinGeckoTool': CoinGeckoToolParameters;
	'n8n-nodes-base.compressionTool': CompressionToolParameters;
	'n8n-nodes-base.contentfulTool': ContentfulToolParameters;
	'n8n-nodes-base.convertKitTool': ConvertKitToolParameters;
	'n8n-nodes-base.copperTool': CopperToolParameters;
	'n8n-nodes-base.crateDbTool': CrateDbToolParameters;
	'n8n-nodes-base.crowdDevTool': CrowdDevToolParameters;
	'n8n-nodes-base.cryptoTool': CryptoToolParameters;
	'n8n-nodes-base.customerIoTool': CustomerIoToolParameters;
	'n8n-nodes-base.dataTableTool': DataTableToolParameters;
	'n8n-nodes-base.dateTimeTool': DateTimeToolParameters;
	'n8n-nodes-base.deepLTool': DeepLToolParameters;
	'n8n-nodes-base.demioTool': DemioToolParameters;
	'n8n-nodes-base.dhlTool': DhlToolParameters;
	'n8n-nodes-base.discordTool': DiscordToolParameters;
	'n8n-nodes-base.discourseTool': DiscourseToolParameters;
	'n8n-nodes-base.driftTool': DriftToolParameters;
	'n8n-nodes-base.dropboxTool': DropboxToolParameters;
	'n8n-nodes-base.dropcontactTool': DropcontactToolParameters;
	'n8n-nodes-base.egoiTool': EgoiToolParameters;
	'n8n-nodes-base.elasticsearchTool': ElasticsearchToolParameters;
	'n8n-nodes-base.elasticSecurityTool': ElasticSecurityToolParameters;
	'n8n-nodes-base.emailReadImapTool': EmailReadImapToolParameters;
	'n8n-nodes-base.emailSendTool': EmailSendToolParameters;
	'n8n-nodes-base.emeliaTool': EmeliaToolParameters;
	'n8n-nodes-base.erpNextTool': ErpNextToolParameters;
	'n8n-nodes-base.executeCommandTool': ExecuteCommandToolParameters;
	'n8n-nodes-base.facebookGraphApiTool': FacebookGraphApiToolParameters;
	'n8n-nodes-base.filemakerTool': FilemakerToolParameters;
	'n8n-nodes-base.freshdeskTool': FreshdeskToolParameters;
	'n8n-nodes-base.freshserviceTool': FreshserviceToolParameters;
	'n8n-nodes-base.freshworksCrmTool': FreshworksCrmToolParameters;
	'n8n-nodes-base.getResponseTool': GetResponseToolParameters;
	'n8n-nodes-base.ghostTool': GhostToolParameters;
	'n8n-nodes-base.gitTool': GitToolParameters;
	'n8n-nodes-base.githubTool': GithubToolParameters;
	'n8n-nodes-base.gitlabTool': GitlabToolParameters;
	'n8n-nodes-base.gongTool': GongToolParameters;
	'n8n-nodes-base.googleAdsTool': GoogleAdsToolParameters;
	'n8n-nodes-base.googleAnalyticsTool': GoogleAnalyticsToolParameters;
	'n8n-nodes-base.googleBigQueryTool': GoogleBigQueryToolParameters;
	'n8n-nodes-base.googleBooksTool': GoogleBooksToolParameters;
	'n8n-nodes-base.googleCalendarTool': GoogleCalendarToolParameters;
	'n8n-nodes-base.googleChatTool': GoogleChatToolParameters;
	'n8n-nodes-base.googleCloudNaturalLanguageTool': GoogleCloudNaturalLanguageToolParameters;
	'n8n-nodes-base.googleCloudStorageTool': GoogleCloudStorageToolParameters;
	'n8n-nodes-base.googleContactsTool': GoogleContactsToolParameters;
	'n8n-nodes-base.googleDocsTool': GoogleDocsToolParameters;
	'n8n-nodes-base.googleDriveTool': GoogleDriveToolParameters;
	'n8n-nodes-base.googleFirebaseCloudFirestoreTool': GoogleFirebaseCloudFirestoreToolParameters;
	'n8n-nodes-base.googleFirebaseRealtimeDatabaseTool': GoogleFirebaseRealtimeDatabaseToolParameters;
	'n8n-nodes-base.gmailTool': GmailToolParameters;
	'n8n-nodes-base.gSuiteAdminTool': GSuiteAdminToolParameters;
	'n8n-nodes-base.googleBusinessProfileTool': GoogleBusinessProfileToolParameters;
	'n8n-nodes-base.googlePerspectiveTool': GooglePerspectiveToolParameters;
	'n8n-nodes-base.googleSheetsTool': GoogleSheetsToolParameters;
	'n8n-nodes-base.googleSlidesTool': GoogleSlidesToolParameters;
	'n8n-nodes-base.googleTasksTool': GoogleTasksToolParameters;
	'n8n-nodes-base.googleTranslateTool': GoogleTranslateToolParameters;
	'n8n-nodes-base.youTubeTool': YouTubeToolParameters;
	'n8n-nodes-base.gotifyTool': GotifyToolParameters;
	'n8n-nodes-base.goToWebinarTool': GoToWebinarToolParameters;
	'n8n-nodes-base.grafanaTool': GrafanaToolParameters;
	'n8n-nodes-base.graphqlTool': GraphqlToolParameters;
	'n8n-nodes-base.gristTool': GristToolParameters;
	'n8n-nodes-base.hackerNewsTool': HackerNewsToolParameters;
	'n8n-nodes-base.haloPSATool': HaloPSAToolParameters;
	'n8n-nodes-base.harvestTool': HarvestToolParameters;
	'n8n-nodes-base.helpScoutTool': HelpScoutToolParameters;
	'n8n-nodes-base.highLevelTool': HighLevelToolParameters;
	'n8n-nodes-base.homeAssistantTool': HomeAssistantToolParameters;
	'n8n-nodes-base.httpRequestTool': HttpRequestToolParameters;
	'n8n-nodes-base.hubspotTool': HubspotToolParameters;
	'n8n-nodes-base.humanticAiTool': HumanticAiToolParameters;
	'n8n-nodes-base.hunterTool': HunterToolParameters;
	'n8n-nodes-base.intercomTool': IntercomToolParameters;
	'n8n-nodes-base.invoiceNinjaTool': InvoiceNinjaToolParameters;
	'n8n-nodes-base.iterableTool': IterableToolParameters;
	'n8n-nodes-base.jenkinsTool': JenkinsToolParameters;
	'n8n-nodes-base.jinaAiTool': JinaAiToolParameters;
	'n8n-nodes-base.jiraTool': JiraToolParameters;
	'n8n-nodes-base.jwtTool': JwtToolParameters;
	'n8n-nodes-base.kafkaTool': KafkaToolParameters;
	'n8n-nodes-base.keapTool': KeapToolParameters;
	'n8n-nodes-base.kitemakerTool': KitemakerToolParameters;
	'n8n-nodes-base.koBoToolboxTool': KoBoToolboxToolParameters;
	'n8n-nodes-base.ldapTool': LdapToolParameters;
	'n8n-nodes-base.lemlistTool': LemlistToolParameters;
	'n8n-nodes-base.lineTool': LineToolParameters;
	'n8n-nodes-base.linearTool': LinearToolParameters;
	'n8n-nodes-base.lingvaNexTool': LingvaNexToolParameters;
	'n8n-nodes-base.linkedInTool': LinkedInToolParameters;
	'n8n-nodes-base.loneScaleTool': LoneScaleToolParameters;
	'n8n-nodes-base.magento2Tool': Magento2ToolParameters;
	'n8n-nodes-base.mailcheckTool': MailcheckToolParameters;
	'n8n-nodes-base.mailchimpTool': MailchimpToolParameters;
	'n8n-nodes-base.mailerLiteTool': MailerLiteToolParameters;
	'n8n-nodes-base.mailgunTool': MailgunToolParameters;
	'n8n-nodes-base.mailjetTool': MailjetToolParameters;
	'n8n-nodes-base.mandrillTool': MandrillToolParameters;
	'n8n-nodes-base.marketstackTool': MarketstackToolParameters;
	'n8n-nodes-base.matrixTool': MatrixToolParameters;
	'n8n-nodes-base.mattermostTool': MattermostToolParameters;
	'n8n-nodes-base.mauticTool': MauticToolParameters;
	'n8n-nodes-base.mediumTool': MediumToolParameters;
	'n8n-nodes-base.messageBirdTool': MessageBirdToolParameters;
	'n8n-nodes-base.metabaseTool': MetabaseToolParameters;
	'n8n-nodes-base.microsoftDynamicsCrmTool': MicrosoftDynamicsCrmToolParameters;
	'n8n-nodes-base.microsoftEntraTool': MicrosoftEntraToolParameters;
	'n8n-nodes-base.microsoftExcelTool': MicrosoftExcelToolParameters;
	'n8n-nodes-base.microsoftGraphSecurityTool': MicrosoftGraphSecurityToolParameters;
	'n8n-nodes-base.microsoftOneDriveTool': MicrosoftOneDriveToolParameters;
	'n8n-nodes-base.microsoftOutlookTool': MicrosoftOutlookToolParameters;
	'n8n-nodes-base.microsoftSharePointTool': MicrosoftSharePointToolParameters;
	'n8n-nodes-base.microsoftSqlTool': MicrosoftSqlToolParameters;
	'n8n-nodes-base.microsoftTeamsTool': MicrosoftTeamsToolParameters;
	'n8n-nodes-base.microsoftToDoTool': MicrosoftToDoToolParameters;
	'n8n-nodes-base.mispTool': MispToolParameters;
	'n8n-nodes-base.mistralAiTool': MistralAiToolParameters;
	'n8n-nodes-base.moceanTool': MoceanToolParameters;
	'n8n-nodes-base.mondayComTool': MondayComToolParameters;
	'n8n-nodes-base.mongoDbTool': MongoDbToolParameters;
	'n8n-nodes-base.monicaCrmTool': MonicaCrmToolParameters;
	'n8n-nodes-base.mqttTool': MqttToolParameters;
	'n8n-nodes-base.msg91Tool': Msg91ToolParameters;
	'n8n-nodes-base.mySqlTool': MySqlToolParameters;
	'n8n-nodes-base.nasaTool': NasaToolParameters;
	'n8n-nodes-base.netlifyTool': NetlifyToolParameters;
	'n8n-nodes-base.nextCloudTool': NextCloudToolParameters;
	'n8n-nodes-base.nocoDbTool': NocoDbToolParameters;
	'n8n-nodes-base.sendInBlueTool': SendInBlueToolParameters;
	'n8n-nodes-base.onfleetTool': OnfleetToolParameters;
	'n8n-nodes-base.notionTool': NotionToolParameters;
	'n8n-nodes-base.npmTool': NpmToolParameters;
	'n8n-nodes-base.odooTool': OdooToolParameters;
	'n8n-nodes-base.oktaTool': OktaToolParameters;
	'n8n-nodes-base.oneSimpleApiTool': OneSimpleApiToolParameters;
	'n8n-nodes-base.openThesaurusTool': OpenThesaurusToolParameters;
	'n8n-nodes-base.openWeatherMapTool': OpenWeatherMapToolParameters;
	'n8n-nodes-base.oracleDatabaseTool': OracleDatabaseToolParameters;
	'n8n-nodes-base.ouraTool': OuraToolParameters;
	'n8n-nodes-base.paddleTool': PaddleToolParameters;
	'n8n-nodes-base.pagerDutyTool': PagerDutyToolParameters;
	'n8n-nodes-base.peekalinkTool': PeekalinkToolParameters;
	'n8n-nodes-base.perplexityTool': PerplexityToolParameters;
	'n8n-nodes-base.phantombusterTool': PhantombusterToolParameters;
	'n8n-nodes-base.philipsHueTool': PhilipsHueToolParameters;
	'n8n-nodes-base.pipedriveTool': PipedriveToolParameters;
	'n8n-nodes-base.plivoTool': PlivoToolParameters;
	'n8n-nodes-base.postBinTool': PostBinToolParameters;
	'n8n-nodes-base.postgresTool': PostgresToolParameters;
	'n8n-nodes-base.postHogTool': PostHogToolParameters;
	'n8n-nodes-base.profitWellTool': ProfitWellToolParameters;
	'n8n-nodes-base.pushbulletTool': PushbulletToolParameters;
	'n8n-nodes-base.pushcutTool': PushcutToolParameters;
	'n8n-nodes-base.pushoverTool': PushoverToolParameters;
	'n8n-nodes-base.questDbTool': QuestDbToolParameters;
	'n8n-nodes-base.quickbaseTool': QuickbaseToolParameters;
	'n8n-nodes-base.quickbooksTool': QuickbooksToolParameters;
	'n8n-nodes-base.quickChartTool': QuickChartToolParameters;
	'n8n-nodes-base.rabbitmqTool': RabbitmqToolParameters;
	'n8n-nodes-base.raindropTool': RaindropToolParameters;
	'n8n-nodes-base.redditTool': RedditToolParameters;
	'n8n-nodes-base.redisTool': RedisToolParameters;
	'n8n-nodes-base.rocketchatTool': RocketchatToolParameters;
	'n8n-nodes-base.rssFeedReadTool': RssFeedReadToolParameters;
	'n8n-nodes-base.rundeckTool': RundeckToolParameters;
	'n8n-nodes-base.s3Tool': S3ToolParameters;
	'n8n-nodes-base.salesforceTool': SalesforceToolParameters;
	'n8n-nodes-base.salesmateTool': SalesmateToolParameters;
	'n8n-nodes-base.seaTableTool': SeaTableTool_v2Parameters;
	'n8n-nodes-base.securityScorecardTool': SecurityScorecardToolParameters;
	'n8n-nodes-base.segmentTool': SegmentToolParameters;
	'n8n-nodes-base.sendGridTool': SendGridToolParameters;
	'n8n-nodes-base.sendyTool': SendyToolParameters;
	'n8n-nodes-base.sentryIoTool': SentryIoToolParameters;
	'n8n-nodes-base.serviceNowTool': ServiceNowToolParameters;
	'n8n-nodes-base.shopifyTool': ShopifyToolParameters;
	'n8n-nodes-base.signl4Tool': Signl4ToolParameters;
	'n8n-nodes-base.slackTool': SlackToolParameters;
	'n8n-nodes-base.sms77Tool': Sms77ToolParameters;
	'n8n-nodes-base.snowflakeTool': SnowflakeToolParameters;
	'n8n-nodes-base.splunkTool': SplunkToolParameters;
	'n8n-nodes-base.spontitTool': SpontitToolParameters;
	'n8n-nodes-base.spotifyTool': SpotifyToolParameters;
	'n8n-nodes-base.stackbyTool': StackbyToolParameters;
	'n8n-nodes-base.storyblokTool': StoryblokToolParameters;
	'n8n-nodes-base.strapiTool': StrapiToolParameters;
	'n8n-nodes-base.stravaTool': StravaToolParameters;
	'n8n-nodes-base.stripeTool': StripeToolParameters;
	'n8n-nodes-base.supabaseTool': SupabaseToolParameters;
	'n8n-nodes-base.syncroMspTool': SyncroMspToolParameters;
	'n8n-nodes-base.taigaTool': TaigaToolParameters;
	'n8n-nodes-base.tapfiliateTool': TapfiliateToolParameters;
	'n8n-nodes-base.telegramTool': TelegramToolParameters;
	'n8n-nodes-base.theHiveProjectTool': TheHiveProjectToolParameters;
	'n8n-nodes-base.theHiveTool': TheHiveToolParameters;
	'n8n-nodes-base.timescaleDbTool': TimescaleDbToolParameters;
	'n8n-nodes-base.todoistTool': TodoistToolParameters;
	'n8n-nodes-base.totpTool': TotpToolParameters;
	'n8n-nodes-base.travisCiTool': TravisCiToolParameters;
	'n8n-nodes-base.trelloTool': TrelloToolParameters;
	'n8n-nodes-base.twakeTool': TwakeToolParameters;
	'n8n-nodes-base.twilioTool': TwilioToolParameters;
	'n8n-nodes-base.twistTool': TwistToolParameters;
	'n8n-nodes-base.twitterTool': TwitterToolParameters;
	'n8n-nodes-base.unleashedSoftwareTool': UnleashedSoftwareToolParameters;
	'n8n-nodes-base.upleadTool': UpleadToolParameters;
	'n8n-nodes-base.uprocTool': UprocToolParameters;
	'n8n-nodes-base.uptimeRobotTool': UptimeRobotToolParameters;
	'n8n-nodes-base.urlScanIoTool': UrlScanIoToolParameters;
	'n8n-nodes-base.veroTool': VeroToolParameters;
	'n8n-nodes-base.venafiTlsProtectCloudTool': VenafiTlsProtectCloudToolParameters;
	'n8n-nodes-base.venafiTlsProtectDatacenterTool': VenafiTlsProtectDatacenterToolParameters;
	'n8n-nodes-base.vonageTool': VonageToolParameters;
	'n8n-nodes-base.webflowTool': WebflowToolParameters;
	'n8n-nodes-base.wekanTool': WekanToolParameters;
	'n8n-nodes-base.whatsAppTool': WhatsAppToolParameters;
	'n8n-nodes-base.wooCommerceTool': WooCommerceToolParameters;
	'n8n-nodes-base.wordpressTool': WordpressToolParameters;
	'n8n-nodes-base.xeroTool': XeroToolParameters;
	'n8n-nodes-base.yourlsTool': YourlsToolParameters;
	'n8n-nodes-base.zammadTool': ZammadToolParameters;
	'n8n-nodes-base.zendeskTool': ZendeskToolParameters;
	'n8n-nodes-base.zohoCrmTool': ZohoCrmToolParameters;
	'n8n-nodes-base.zoomTool': ZoomToolParameters;
	'n8n-nodes-base.zulipTool': ZulipToolParameters;
	'@n8n/n8n-nodes-langchain.anthropicTool': AnthropicToolParameters;
	'@n8n/n8n-nodes-langchain.googleGeminiTool': GoogleGeminiToolParameters;
	'@n8n/n8n-nodes-langchain.ollamaTool': OllamaToolParameters;
}

// ===== Helper Types =====

/** Extract the value types from NodeTypes */
export type NodeTypeValue = (typeof NodeTypes)[keyof typeof NodeTypes];

/** Get parameters for a specific node type */
export type GetNodeParameters<T extends NodeType> = T extends keyof NodeParametersMap
	? NodeParametersMap[T]
	: BaseNodeParams;

/** Generic node parameters type - use GetNodeParameters<T> for specific node types */
export type NodeParameters<T extends NodeType = NodeType> = T extends keyof NodeParametersMap
	? NodeParametersMap[T]
	: BaseNodeParams;

// ===== Usage Examples =====

/*
 * USAGE:
 *
 * 1. Type-safe node type strings:
 *    // For nodes with multiple versions, use the versioned key:
 *    const nodeType = NodeTypes.GoogleSheets_v4_7; // "n8n-nodes-base.googleSheets"
 *    const simple = NodeTypes.ActionNetwork; // Single version nodes have no suffix
 *
 * 2. Function accepting any node type:
 *    function processNode(type: NodeType) { ... }
 *    processNode(NodeTypes.Slack_v2_3); // Type-safe with version
 *    processNode("n8n-nodes-base.slack"); // Or use string literal directly
 *
 * 3. Get display name for a node:
 *    const nodeType = NodeTypes.GoogleSheets_v4_7;
 *    const displayName = NodeDisplayNames[nodeType]; // "Google Sheets"
 *
 * 4. Type node parameters:
 *    const params: NodeParameters = {
 *      resource: "sheet",
 *      operation: "read",
 *      returnAll: false,
 *      limit: 100
 *    };
 *
 * 5. Check if string is valid node type:
 *    function isNodeType(str: string): str is NodeType {
 *      return str in NodeDisplayNames;
 *    }
 */
