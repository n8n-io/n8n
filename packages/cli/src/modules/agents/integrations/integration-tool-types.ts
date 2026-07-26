import type { AgentIntegrationConfig, N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { z } from 'zod';

import type { IntegrationErrorCode } from './integration-error-codes';

export type IntegrationMessageTarget =
	| {
			type: 'thread';
			threadId: string;
			channelId?: string;
			userId?: string;
	  }
	| {
			type: 'channel';
			channelId: string;
			threadId?: string;
	  }
	| {
			type: 'dm';
			userId: string;
			threadId?: string;
	  };

export interface IntegrationMessageContext {
	integrationConnectionId: string;
	platform: string;
	target: IntegrationMessageTarget;
	messageId?: string;
	interactingUserId?: string;
	agentUserId?: string;
	subject?: IntegrationMessageSubject;
	updatedAt: string;
}

export interface IntegrationMessageSubject {
	type: string;
	id: string;
	title?: string;
	description?: string;
	url?: string;
	status?: string;
	labels?: string[];
	assignee?: IntegrationSubjectPerson;
	author?: IntegrationSubjectPerson;
}

export interface IntegrationSubjectPerson {
	id: string;
	name: string;
}

/**
 * Source of a tool connection: a persisted credential integration, or the
 * implicit credential-less in-app chat channel (injected per-run, never
 * stored on the agent).
 */
export type IntegrationToolConnectionSource =
	| AgentIntegrationConfig
	| { type: typeof N8N_CHAT_INTEGRATION_TYPE; credentialId?: undefined };

export type IntegrationContextQuery =
	| 'get_current_message_context'
	| 'get_current_subject'
	| 'get_current_user'
	| 'get_current_channel_info'
	| 'get_user'
	| 'get_channel_info'
	| 'search_users'
	| 'search_channels'
	| 'get_team'
	| 'search_teams'
	| 'get_project'
	| 'search_projects'
	| 'search_labels'
	| 'search_issue_states'
	| 'get_issue'
	| 'search_issues';

export type IntegrationAction =
	| 'respond'
	| 'send_dm'
	| 'send_channel_message'
	| 'add_reaction'
	| 'create_issue'
	| 'update_issue'
	| 'create_comment';

export interface IntegrationToolOperationDefinition<Name extends string = string> {
	name: Name;
	inputSchema: z.ZodType;
	description: string;
}

export type IntegrationContextQueryDefinition =
	IntegrationToolOperationDefinition<IntegrationContextQuery>;

export type IntegrationActionDefinition = IntegrationToolOperationDefinition<IntegrationAction>;

export interface IntegrationToolConnectionDescriptor {
	agentId?: string;
	integration: IntegrationToolConnectionSource;
	integrationConnectionId: string;
	contextToolName: string;
	actionToolName: string;
	contextQueries: IntegrationContextQuery[];
	actions: IntegrationAction[];
	contextToolDefinitions: IntegrationContextQueryDefinition[];
	actionToolDefinitions: IntegrationActionDefinition[];
	contextToolGuidance?: string[];
	actionToolGuidance?: string[];
}

export interface IntegrationMessageContextStore {
	getLatest(threadId: string): Promise<IntegrationMessageContext | null>;
	setLatest(
		threadId: string,
		resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void>;
}

export interface IntegrationContextQueryExecutor {
	execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown>;
}

export interface IntegrationActionExecutor {
	execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		action: IntegrationAction;
		input: Record<string, unknown>;
		awaitResponse: boolean;
		runId?: string;
		toolCallId?: string;
		currentMessageContext?: IntegrationMessageContext;
	}): Promise<IntegrationActionResult>;
}

export type IntegrationActionResult =
	| {
			ok: true;
			messageContext?: IntegrationMessageContext;
			[key: string]: unknown;
	  }
	| {
			ok: false;
			error: {
				code: IntegrationErrorCode;
				message: string;
			};
	  };
