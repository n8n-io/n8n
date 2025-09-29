export const DEFAULT_OPERATIONS = ['create', 'read', 'update', 'delete', 'list'] as const;

export const RESOURCES = {
	annotationTag: [...DEFAULT_OPERATIONS] as const,
	auditLogs: ['manage'] as const,
	banner: ['dismiss'] as const,
	community: ['register'] as const,
	communityPackage: ['install', 'uninstall', 'update', 'list', 'manage'] as const,
	credential: ['share', 'move', ...DEFAULT_OPERATIONS] as const,
	externalSecretsProvider: ['sync', ...DEFAULT_OPERATIONS] as const,
	externalSecret: ['list', 'use'] as const,
	eventBusDestination: ['test', ...DEFAULT_OPERATIONS] as const,
	ldap: ['sync', 'manage'] as const,
	license: ['manage'] as const,
	logStreaming: ['manage'] as const,
	orchestration: ['read', 'list'] as const,
	project: [...DEFAULT_OPERATIONS] as const,
	saml: ['manage'] as const,
	securityAudit: ['generate'] as const,
	sourceControl: ['pull', 'push', 'manage'] as const,
	tag: [...DEFAULT_OPERATIONS] as const,
	user: ['resetPassword', 'changeRole', 'enforceMfa', ...DEFAULT_OPERATIONS] as const,
	variable: [...DEFAULT_OPERATIONS] as const,
	workersView: ['manage'] as const,
	workflow: ['share', 'execute', 'move', 'activate', 'deactivate', ...DEFAULT_OPERATIONS] as const,
	folder: [...DEFAULT_OPERATIONS, 'move'] as const,
	insights: ['list'] as const,
	oidc: ['manage'] as const,
	dataStore: [...DEFAULT_OPERATIONS, 'readRow', 'writeRow', 'listProject'] as const,
	execution: ['delete', 'read', 'retry', 'list', 'get'] as const,
	workflowTags: ['update', 'list'] as const,
	role: ['manage'] as const,
} as const;

export const API_KEY_RESOURCES = {
	tag: [...DEFAULT_OPERATIONS] as const,
	workflow: [...DEFAULT_OPERATIONS, 'move', 'activate', 'deactivate'] as const,
	variable: ['create', 'update', 'delete', 'list'] as const,
	securityAudit: ['generate'] as const,
	project: ['create', 'update', 'delete', 'list'] as const,
	user: ['read', 'list', 'create', 'changeRole', 'delete', 'enforceMfa'] as const,
	execution: ['delete', 'read', 'retry', 'list', 'get'] as const,
	credential: ['create', 'move', 'delete'] as const,
	sourceControl: ['pull'] as const,
	workflowTags: ['update', 'list'] as const,
} as const;

export const PROJECT_OWNER_ROLE_SLUG = 'project:personalOwner';
export const PROJECT_ADMIN_ROLE_SLUG = 'project:admin';
export const PROJECT_EDITOR_ROLE_SLUG = 'project:editor';
export const PROJECT_VIEWER_ROLE_SLUG = 'project:viewer';
