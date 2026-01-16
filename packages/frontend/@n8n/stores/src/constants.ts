export const STORES = {
	COMMUNITY_NODES: 'communityNodes',
	ROOT: 'root',
	SETTINGS: 'settings',
	UI: 'ui',
	USERS: 'users',
	WORKFLOWS: 'workflows',
	WORKFLOWS_V2: 'workflowsV2',
	WORKFLOWS_EE: 'workflowsEE',
	EXECUTIONS: 'executions',
	NDV: 'ndv',
	TEMPLATES: 'templates',
	NODE_TYPES: 'nodeTypes',
	CREDENTIALS: 'credentials',
	TAGS: 'tags',
	ANNOTATION_TAGS: 'annotationTags',
	VERSIONS: 'versions',
	NODE_CREATOR: 'nodeCreator',
	WEBHOOKS: 'webhooks',
	HISTORY: 'history',
	CLOUD_PLAN: 'cloudPlan',
	RBAC: 'rbac',
	PUSH: 'push',
	COLLABORATION: 'collaboration',
	ASSISTANT: 'assistant',
	BUILDER: 'builder',
	CHAT_PANEL: 'chatPanel',
	CHAT_PANEL_STATE: 'chatPanelState',
	BECOME_TEMPLATE_CREATOR: 'becomeTemplateCreator',
	PROJECTS: 'projects',
	API_KEYS: 'apiKeys',
	EVALUATION: 'evaluation',
	FOLDERS: 'folders',
	MODULES: 'modules',
	FOCUS_PANEL: 'focusPanel',
	WORKFLOW_STATE: 'workflowState',
	AI_TEMPLATES_STARTER_COLLECTION: 'aiTemplatesStarterCollection',
	PERSONALIZED_TEMPLATES: 'personalizedTemplates',
	EXPERIMENT_READY_TO_RUN_WORKFLOWS: 'readyToRunWorkflows',
	EXPERIMENT_READY_TO_RUN_WORKFLOWS_V2: 'readyToRunWorkflowsV2',
	EXPERIMENT_TEMPLATE_RECO_V2: 'templateRecoV2',
	PERSONALIZED_TEMPLATES_V3: 'personalizedTemplatesV3',
	READY_TO_RUN: 'readyToRun',
	TEMPLATES_DATA_QUALITY: 'templatesDataQuality',
	BANNERS: 'banners',
	CONSENT: 'consent',
	CHAT_HUB: 'chatHub',
} as const;

export const INSECURE_CONNECTION_WARNING = `
<body style="margin-top: 20px; font-family: 'Open Sans', sans-serif; text-align: center;">
<h1 style="font-size: 40px">&#x1F6AB;</h1>
<h2>Your n8n server is configured to use a secure cookie, <br/>however you are either visiting this via an insecure URL, or using Safari.
</h2>
<br/>
<div style="font-size: 18px; max-width: 640px; text-align: left; margin: 10px auto">
	To fix this, please consider the following options:
	<ul>
		<li>Setup TLS/HTTPS (<strong>recommended</strong>), or</li>
		<li>If you are running this locally, and not using Safari, try using <a href="http://localhost:5678">localhost</a> instead</li>
		<li>If you prefer to disable this security feature (<strong>not recommended</strong>), set the environment variable <code>N8N_SECURE_COOKIE</code> to <code>false</code></li>
	</ul>
</div>
</body>`;
