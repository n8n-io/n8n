import type { INodeTypeData, INodeTypeDescription, IN8nUISettings } from 'n8n-workflow';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import nodeTypesJson from '../../../nodes-base/dist/types/nodes.json';
import aiNodeTypesJson from '../../../@n8n/nodes-langchain/dist/types/nodes.json';

const allNodeTypes = [...nodeTypesJson, ...aiNodeTypesJson];

function findNodeWithName(name: string): INodeTypeDescription {
	return allNodeTypes.find((node) => node.name === name) as INodeTypeDescription;
}

export const testingNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: findNodeWithName(MANUAL_TRIGGER_NODE_TYPE),
		},
	},
	[CHAT_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: findNodeWithName(CHAT_TRIGGER_NODE_TYPE),
		},
	},
	[AGENT_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: findNodeWithName(AGENT_NODE_TYPE),
		},
	},
};

export const defaultMockNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: testingNodeTypes[MANUAL_TRIGGER_NODE_TYPE],
};

export function mockNodeTypesToArray(nodeTypes: INodeTypeData): INodeTypeDescription[] {
	return Object.values(nodeTypes).map(
		(nodeType) => nodeType.type.description as INodeTypeDescription,
	);
}

export const defaultMockNodeTypesArray: INodeTypeDescription[] =
	mockNodeTypesToArray(defaultMockNodeTypes);

export const defaultSettings: IN8nUISettings = {
	allowedModules: {},
	communityNodesEnabled: false,
	defaultLocale: '',
	endpointForm: '',
	endpointFormTest: '',
	endpointFormWaiting: '',
	endpointWebhook: '',
	endpointWebhookTest: '',
	enterprise: {
		sharing: false,
		ldap: false,
		saml: false,
		logStreaming: false,
		debugInEditor: false,
		advancedExecutionFilters: false,
		variables: true,
		sourceControl: false,
		auditLogs: false,
		showNonProdBanner: false,
		workflowHistory: false,
		binaryDataS3: false,
		externalSecrets: false,
		workerView: false,
		advancedPermissions: false,
	},
	expressions: {
		evaluator: 'tournament',
	},
	executionMode: 'regular',
	executionTimeout: 0,
	hideUsagePage: false,
	hiringBannerEnabled: false,
	instanceId: '',
	isNpmAvailable: false,
	license: { environment: 'development' },
	logLevel: 'info',
	maxExecutionTimeout: 0,
	oauthCallbackUrls: { oauth1: '', oauth2: '' },
	onboardingCallPromptEnabled: false,
	personalizationSurveyEnabled: false,
	releaseChannel: 'stable',
	posthog: {
		apiHost: '',
		apiKey: '',
		autocapture: false,
		debug: false,
		disableSessionRecording: false,
		enabled: false,
	},
	publicApi: { enabled: false, latestVersion: 0, path: '', swaggerUi: { enabled: false } },
	pushBackend: 'websocket',
	saveDataErrorExecution: 'DEFAULT',
	saveDataSuccessExecution: 'DEFAULT',
	saveManualExecutions: false,
	sso: {
		ldap: { loginEnabled: false, loginLabel: '' },
		saml: { loginEnabled: false, loginLabel: '' },
	},
	telemetry: {
		enabled: false,
	},
	templates: { enabled: false, host: '' },
	timezone: '',
	urlBaseEditor: '',
	urlBaseWebhook: '',
	authCookie: {
		secure: false,
	},
	userManagement: {
		showSetupOnFirstLoad: false,
		smtpSetup: true,
		authenticationMethod: 'email',
		quota: 10,
	},
	versionCli: '',
	versionNotifications: {
		enabled: true,
		endpoint: '',
		infoUrl: '',
	},
	workflowCallerPolicyDefaultOption: 'any',
	workflowTagsDisabled: false,
	variables: {
		limit: -1,
	},
	deployment: {
		type: 'default',
	},
	banners: {
		dismissed: [],
	},
	binaryDataMode: 'default',
	previewMode: false,
	mfa: {
		enabled: false,
	},
	ai: {
		enabled: false,
		provider: '',
	},
	workflowHistory: {
		pruneTime: 0,
		licensePruneTime: 0,
	},
};
