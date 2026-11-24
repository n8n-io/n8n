import type { GymManifest } from '@n8n/ai-gym';
import { validateNodeCredentials } from 'n8n-workflow';
import type { INode, INodeTypes, IWorkflowBase } from 'n8n-workflow';

import type {
	MissingCredentialIssue,
	UnsupportedNodeInfo,
	WorkflowSupportCheckResult,
} from './types';

/**
 * Pure/local n8n nodes that do not make external vendor API calls and are always safe to run
 * inside a simulation-service simulation.
 */
const LOCAL_SAFE_NODE_TYPES = new Set<string>([
	// Triggers & entry points
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.errorTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
	// Flow control & data transformation
	'n8n-nodes-base.set',
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.aggregate',
	'n8n-nodes-base.itemLists',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.limit',
	'n8n-nodes-base.sort',
	'n8n-nodes-base.removeDuplicates',
	'n8n-nodes-base.compareDatasets',
	'n8n-nodes-base.summarize',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.stickyNote',
	'n8n-nodes-base.wait',
	'n8n-nodes-base.stopAndError',
	'n8n-nodes-base.respondToWebhook',
	'n8n-nodes-base.dateTime',
	'n8n-nodes-base.crypto',
	'n8n-nodes-base.html',
	'n8n-nodes-base.markdown',
	'n8n-nodes-base.xml',
	'n8n-nodes-base.convertToFile',
	'n8n-nodes-base.extractFromFile',
	'n8n-nodes-base.compression',
	'n8n-nodes-base.renameKeys',
	'n8n-nodes-base.editImage',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	// LangChain orchestration & memory/parser sub-nodes (no external vendor call on their own)
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainSummarization',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
	'@n8n/n8n-nodes-langchain.memoryBufferWindow',
	'@n8n/n8n-nodes-langchain.outputParserStructured',
	'@n8n/n8n-nodes-langchain.outputParserAutofixing',
	'@n8n/n8n-nodes-langchain.outputParserItemList',
	'@n8n/n8n-nodes-langchain.toolThink',
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolCode',
]);

/**
 * Maps n8n node types (including `Tool` variants) to the corresponding `@n8n/ai-gym` vendor slug.
 */
const NODE_TYPE_TO_VENDOR: Record<string, string> = {
	// Communication & messaging
	'n8n-nodes-base.slack': 'slack',
	'n8n-nodes-base.slackTool': 'slack',
	'n8n-nodes-base.slackTrigger': 'slack',
	'n8n-nodes-base.gmail': 'gmail',
	'n8n-nodes-base.gmailTool': 'gmail',
	'n8n-nodes-base.gmailTrigger': 'gmail',
	'n8n-nodes-base.microsoftOutlook': 'outlook',
	'n8n-nodes-base.microsoftOutlookTool': 'outlook',
	'n8n-nodes-base.telegram': 'telegram',
	'n8n-nodes-base.telegramTool': 'telegram',
	'n8n-nodes-base.telegramTrigger': 'telegram',
	'n8n-nodes-base.discord': 'discord',
	'n8n-nodes-base.discordTool': 'discord',
	'n8n-nodes-base.whatsApp': 'whatsapp',
	'n8n-nodes-base.whatsAppTool': 'whatsapp',
	'n8n-nodes-base.twilio': 'twilio',
	'n8n-nodes-base.twilioTool': 'twilio',
	'n8n-nodes-base.sendGrid': 'sendgrid',
	'n8n-nodes-base.sendGridTool': 'sendgrid',
	'n8n-nodes-base.sendInBlue': 'brevo',
	'n8n-nodes-base.sendInBlueTool': 'brevo',
	'n8n-nodes-base.customerIo': 'customerio',
	'n8n-nodes-base.line': 'line',

	// Productivity, docs, project management
	'n8n-nodes-base.notion': 'notion',
	'n8n-nodes-base.notionTool': 'notion',
	'n8n-nodes-base.airtable': 'airtable',
	'n8n-nodes-base.airtableTool': 'airtable',
	'n8n-nodes-base.googleSheets': 'google-sheets',
	'n8n-nodes-base.googleSheetsTool': 'google-sheets',
	'n8n-nodes-base.googleDrive': 'google-drive',
	'n8n-nodes-base.googleDriveTool': 'google-drive',
	'n8n-nodes-base.googleCalendar': 'google-calendar',
	'n8n-nodes-base.googleCalendarTool': 'google-calendar',
	'n8n-nodes-base.googleBigQuery': 'google-bigquery',
	'n8n-nodes-base.linear': 'linear',
	'n8n-nodes-base.linearTool': 'linear',
	'n8n-nodes-base.jira': 'jira',
	'n8n-nodes-base.jiraTool': 'jira',
	'n8n-nodes-base.asana': 'asana',
	'n8n-nodes-base.asanaTool': 'asana',
	'n8n-nodes-base.trello': 'trello',
	'n8n-nodes-base.trelloTool': 'trello',
	'n8n-nodes-base.clickUp': 'clickup',
	'n8n-nodes-base.clickUpTool': 'clickup',
	'n8n-nodes-base.mondayCom': 'mondaycom',
	'n8n-nodes-base.mondayComTool': 'mondaycom',
	'n8n-nodes-base.github': 'github',
	'n8n-nodes-base.githubTool': 'github',

	// CRM, commerce, support, finance, marketing
	'n8n-nodes-base.hubspot': 'hubspot',
	'n8n-nodes-base.hubspotTool': 'hubspot',
	'n8n-nodes-base.salesforce': 'salesforce',
	'n8n-nodes-base.salesforceTool': 'salesforce',
	'n8n-nodes-base.pipedrive': 'pipedrive',
	'n8n-nodes-base.pipedriveTool': 'pipedrive',
	'n8n-nodes-base.zohoCrm': 'zoho',
	'n8n-nodes-base.zohoCrmTool': 'zoho',
	'n8n-nodes-base.shopify': 'shopify',
	'n8n-nodes-base.shopifyTool': 'shopify',
	'n8n-nodes-base.stripe': 'stripe',
	'n8n-nodes-base.stripeTool': 'stripe',
	'n8n-nodes-base.zendesk': 'zendesk',
	'n8n-nodes-base.zendeskTool': 'zendesk',
	'n8n-nodes-base.quickbooks': 'quickbooks',
	'n8n-nodes-base.quickbooksTool': 'quickbooks',
	'n8n-nodes-base.wordpress': 'wordpress',
	'n8n-nodes-base.wordpressTool': 'wordpress',
	'n8n-nodes-base.linkedIn': 'linkedin',
	'n8n-nodes-base.facebookGraphApi': 'facebook',
	'n8n-nodes-base.rssFeedRead': 'rss',
	'n8n-nodes-base.awsS3': 's3',
	'n8n-nodes-base.s3': 's3',
	'n8n-nodes-base.snowflake': 'snowflake',

	// LLM & AI providers (routed via simulation-service's LLM provider translation)
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': 'openai',
	'@n8n/n8n-nodes-langchain.lmOpenAi': 'openai',
	'@n8n/n8n-nodes-langchain.openAi': 'openai',
	'@n8n/n8n-nodes-langchain.embeddingsOpenAi': 'openai',
	'n8n-nodes-base.openAi': 'openai',
	'@n8n/n8n-nodes-langchain.lmChatAnthropic': 'anthropic',
	'@n8n/n8n-nodes-langchain.anthropic': 'anthropic',
	'@n8n/n8n-nodes-langchain.lmChatGoogleGemini': 'gemini',
	'@n8n/n8n-nodes-langchain.googleGemini': 'gemini',
	'@n8n/n8n-nodes-langchain.embeddingsGoogleGemini': 'gemini',
	'@n8n/n8n-nodes-langchain.lmChatMistralCloud': 'mistral',
	'@n8n/n8n-nodes-langchain.lmChatCohere': 'cohere',
	'@n8n/n8n-nodes-langchain.lmChatOllama': 'ollama',
	'@n8n/n8n-nodes-langchain.lmOllama': 'ollama',
	'@n8n/n8n-nodes-langchain.lmChatAwsBedrock': 'bedrock',
	'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi': 'azure-openai',
	'@n8n/n8n-nodes-langchain.lmChatGroq': 'llm-compat',
	'@n8n/n8n-nodes-langchain.lmChatOpenRouter': 'llm-compat',
	'@n8n/n8n-nodes-langchain.lmChatDeepSeek': 'llm-compat',
	'@n8n/n8n-nodes-langchain.lmChatXAiGrok': 'llm-compat',
};

/**
 * Maps n8n credential type names to the corresponding simulation-service vendor slug for minting tokens.
 */
export const CREDENTIAL_TYPE_TO_VENDOR: Record<string, string> = {
	slackApi: 'slack',
	slackOAuth2Api: 'slack',
	gmailOAuth2: 'gmail',
	googleApi: 'google',
	googleSheetsOAuth2Api: 'google-sheets',
	googleDriveOAuth2Api: 'google-drive',
	googleCalendarOAuth2Api: 'google-calendar',
	googleBigQueryOAuth2Api: 'google-bigquery',
	microsoftOutlookOAuth2Api: 'outlook',
	telegramApi: 'telegram',
	discordBotApi: 'discord',
	discordOAuth2Api: 'discord',
	discordWebhookApi: 'discord',
	whatsAppApi: 'whatsapp',
	twilioApi: 'twilio',
	sendGridApi: 'sendgrid',
	sendInBlueApi: 'brevo',
	customerIoApi: 'customerio',
	notionApi: 'notion',
	notionOAuth2Api: 'notion',
	airtableTokenApi: 'airtable',
	airtableOAuth2Api: 'airtable',
	linearApi: 'linear',
	linearOAuth2Api: 'linear',
	jiraSoftwareCloudApi: 'jira',
	jiraSoftwareServerApi: 'jira',
	asanaApi: 'asana',
	asanaOAuth2Api: 'asana',
	trelloApi: 'trello',
	clickUpApi: 'clickup',
	clickUpOAuth2Api: 'clickup',
	mondayComApi: 'mondaycom',
	mondayComOAuth2Api: 'mondaycom',
	githubApi: 'github',
	githubOAuth2Api: 'github',
	hubspotApi: 'hubspot',
	hubspotAppToken: 'hubspot',
	hubspotOAuth2Api: 'hubspot',
	salesforceOAuth2Api: 'salesforce',
	pipedriveApi: 'pipedrive',
	pipedriveOAuth2Api: 'pipedrive',
	zohoOAuth2Api: 'zoho',
	shopifyApi: 'shopify',
	shopifyAccessTokenApi: 'shopify',
	shopifyOAuth2Api: 'shopify',
	stripeApi: 'stripe',
	zendeskApi: 'zendesk',
	zendeskOAuth2Api: 'zendesk',
	quickBooksOAuth2Api: 'quickbooks',
	wordpressApi: 'wordpress',
	linkedInOAuth2Api: 'linkedin',
	facebookGraphApi: 'facebook',
	aws: 's3',
	s3: 's3',
	snowflake: 'snowflake',
	openAiApi: 'openai',
	anthropicApi: 'anthropic',
	googlePalmApi: 'gemini',
	mistralCloudApi: 'mistral',
	cohereApi: 'cohere',
	ollamaApi: 'ollama',
	azureOpenAiApi: 'azure-openai',
	groqApi: 'llm-compat',
	openRouterApi: 'llm-compat',
	deepSeekApi: 'llm-compat',
	xAiApi: 'llm-compat',
};

/**
 * Checks whether a single host matches a manifest host pattern (exact or wildcard `*.example.com`).
 */
export function matchManifestHost(pattern: string, host: string): boolean {
	const normalizedHost = host.toLowerCase().split(':')[0] ?? '';
	const normalizedPattern = pattern.toLowerCase().split(':')[0] ?? '';
	if (!normalizedHost || !normalizedPattern) return false;
	if (normalizedPattern === normalizedHost) return true;
	if (normalizedPattern.startsWith('*.')) {
		const suffix = normalizedPattern.slice(1); // includes leading dot
		return normalizedHost.endsWith(suffix) && normalizedHost.length > suffix.length;
	}
	return false;
}

function findVendorForHttpNode(node: INode, manifest: GymManifest): string | undefined {
	const rawUrl = node.parameters?.url;
	if (typeof rawUrl !== 'string' || !rawUrl.trim()) return undefined;
	// Expressions like `={{ ... }}` cannot be statically resolved to a vendor host.
	if (rawUrl.includes('{{')) return undefined;
	try {
		const parsed = new URL(rawUrl);
		for (const vendor of manifest.vendors) {
			if (vendor.hosts.some((pattern) => matchManifestHost(pattern, parsed.host))) {
				return vendor.slug;
			}
		}
	} catch {
		return undefined;
	}
	return undefined;
}

/**
 * Validates that every enabled node in a workflow is supported by the compiled-in simulation-service manifest.
 * When `nodeTypes` is provided, also checks that every required credential on each enabled node
 * is configured so simulations never mask missing credentials.
 */
export function checkWorkflowSupport(
	workflow: Pick<IWorkflowBase, 'nodes'>,
	manifest: GymManifest,
	nodeTypes?: INodeTypes,
): WorkflowSupportCheckResult {
	const availableVendors = new Set(manifest.vendors.map((v) => v.slug));
	const unsupportedNodes: UnsupportedNodeInfo[] = [];
	const missingCredentials: MissingCredentialIssue[] = [];
	const requiredVendors = new Set<string>();

	for (const node of workflow.nodes) {
		if (node.disabled) continue;

		if (nodeTypes) {
			try {
				const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
				if (nodeType) {
					const credIssues = validateNodeCredentials(node, nodeType);
					for (const issue of credIssues) {
						missingCredentials.push({
							nodeName: node.name,
							nodeType: node.type,
							credentialType: issue.credentialName,
							credentialDisplayName: issue.displayName,
							reason: issue.type,
						});
					}
				}
			} catch {
				// Ignore unknown node types here; they are reported as unsupported below.
			}
		}

		if (LOCAL_SAFE_NODE_TYPES.has(node.type)) {
			continue;
		}

		// HTTP Request nodes are supported only if their static target URL matches a compiled-in vendor.
		if (
			node.type === 'n8n-nodes-base.httpRequest' ||
			node.type === 'n8n-nodes-base.httpRequestTool'
		) {
			const vendor = findVendorForHttpNode(node, manifest);
			if (vendor) {
				requiredVendors.add(vendor);
				continue;
			}
			unsupportedNodes.push({
				nodeName: node.name,
				nodeType: node.type,
				reason: 'HTTP Request target URL does not match any simulated vendor host',
			});
			continue;
		}

		const mappedVendor = NODE_TYPE_TO_VENDOR[node.type];
		if (mappedVendor && availableVendors.has(mappedVendor)) {
			requiredVendors.add(mappedVendor);
			continue;
		}

		unsupportedNodes.push({
			nodeName: node.name,
			nodeType: node.type,
			reason: mappedVendor
				? `simulation-service vendor "${mappedVendor}" is not available in this build`
				: 'No simulator is available for this node type',
		});
	}

	return {
		supported: unsupportedNodes.length === 0,
		unsupportedNodes,
		missingCredentials,
		requiredVendors: [...requiredVendors],
	};
}

export function resolveVendorForCredentialType(credentialType: string): string | undefined {
	return CREDENTIAL_TYPE_TO_VENDOR[credentialType];
}
