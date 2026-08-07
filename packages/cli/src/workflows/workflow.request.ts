import type {
	ManualRunPayload as ManualRunPayloadDto,
	FullManualExecutionFromKnownTriggerPayload as FullManualExecutionFromKnownTriggerDto,
	FullManualExecutionFromUnknownTriggerPayload as FullManualExecutionFromUnknownTriggerDto,
	PartialManualExecutionToDestinationPayload as PartialManualExecutionToDestinationDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { INode, IConnections, IWorkflowSettings } from 'n8n-workflow';

import type { ListQuery } from '@/requests';

export declare namespace WorkflowRequest {
	type CreateUpdatePayload = Partial<{
		id: string; // deleted if sent
		name: string;
		description: string | null;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
		hash: string;
		meta: Record<string, unknown>;
		projectId: string;
		parentFolderId?: string;
		uiContext?: string;
		expectedChecksum?: string;
		aiBuilderAssisted?: boolean;
		autosaved?: boolean;
	}>;

	// The three cases the manual-run endpoint serves. The shapes are defined
	// and validated by ManualRunDto in @n8n/api-types; the type guards in
	// workflow-execution.service.ts re-narrow to them at runtime.
	// TODO: Use a discriminator when CAT-1809 lands
	type FullManualExecutionFromKnownTriggerPayload = FullManualExecutionFromKnownTriggerDto;
	type FullManualExecutionFromUnknownTriggerPayload = FullManualExecutionFromUnknownTriggerDto;
	type PartialManualExecutionToDestinationPayload = PartialManualExecutionToDestinationDto;

	type ManualRunPayload = ManualRunPayloadDto;

	type Create = AuthenticatedRequest<{}, {}, CreateUpdatePayload>;

	type Get = AuthenticatedRequest<{ workflowId: string }>;

	type GetMany = AuthenticatedRequest<
		{},
		{},
		{},
		ListQuery.Params & {
			includeScopes?: string;
			includeFolders?: string;
			onlySharedWithMe?: string;
			availableInMCP?: string;
		}
	> & {
		listQueryOptions: ListQuery.Options;
	};

	type Update = AuthenticatedRequest<
		{ workflowId: string },
		{},
		CreateUpdatePayload,
		{ forceSave?: string }
	>;

	type NewName = AuthenticatedRequest<{}, {}, {}, { name?: string; projectId: string }>;

	type ManualRun = AuthenticatedRequest<{ workflowId: string }>;

	type Share = AuthenticatedRequest<{ workflowId: string }, {}, { shareWithIds: string[] }>;

	type Activate = AuthenticatedRequest<
		{ workflowId: string },
		{},
		{ versionId: string; name?: string; description?: string; expectedChecksum?: string }
	>;

	type Deactivate = AuthenticatedRequest<{ workflowId: string }>;
}
