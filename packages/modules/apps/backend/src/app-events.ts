import type { AppVisibility } from '@n8n/api-types';
import '@n8n/backend-services';

export type AppActor = { userId?: string; threadId?: string };

export type AppChangeSource = 'initial' | 'chat' | 'restore' | 'retry' | 'bindings';

/** Who saved a bindings change: the n8n Assistant, or a user in Configure mode or the API. */
export type AppBindingsChangeSource = 'assistant' | 'user';

/** Data table reads are not counted. */
export type AppInteractionType = 'workflow_run' | 'data_table_write' | 'agent_message';

export type AppBuildOrigin = AppActor & { changeSource?: AppChangeSource };

export interface AppEventMap {
	'app-created': AppActor & { appId: string; projectId: string; visibility: AppVisibility };
	'app-visibility-changed': AppActor & {
		appId: string;
		from: AppVisibility;
		to: AppVisibility;
	};
	'app-deleted': AppActor & { appId: string; wasPublished: boolean };
	'app-published': AppActor & {
		appId: string;
		versionId: string;
		visibility: AppVisibility;
		isFirstPublish: boolean;
	};
	'app-unpublished': AppActor & { appId: string };
	'app-build-finished': AppActor & {
		appId: string;
		versionId: string;
		changeSource: AppChangeSource;
		status: 'succeeded' | 'failed';
		attempts: number;
		durationMs: number;
	};
	'app-opened': { appId: string; versionId: string; userId: string; isPreview: boolean };
	'app-bindings-changed': {
		appId: string;
		projectId: string;
		versionId: string;
		userId: string;
		threadId?: string;
		source: AppBindingsChangeSource;
		workflowCount: number;
		dataTableCount: number;
		agentCount: number;
		addedCount: number;
		removedCount: number;
	};
	'app-interacted': {
		appId: string;
		versionId: string;
		userId: string;
		interactionType: AppInteractionType;
		isPreview: boolean;
	};
}

declare module '@n8n/backend-services' {
	interface EventMap extends AppEventMap {}
}
