import { z } from 'zod';
import type { IDataObject } from 'n8n-workflow';

// ============================================================================
// Telemetry Event Types
// ============================================================================

export interface TelemetryEventDto {
	id: string;
	eventName: string;
	properties: IDataObject;
	userId: string | null;
	sessionId: string | null;
	workflowId: string | null;
	createdAt: Date;
	source: 'frontend' | 'backend';
	instanceId: string | null;
	workspaceId: string | null;
	tenantId: string | null;
}

export interface TelemetryEventsResponse {
	events: TelemetryEventDto[];
	total: number;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface TelemetryStatsOverview {
	totalEvents: number;
	activeUsers: number;
	topEvents: Array<{
		event_name: string;
		count: number;
	}>;
}

export interface TelemetryTopEvent {
	event_name: string;
	count: number;
}

export interface TelemetryActiveUserStat {
	date: string;
	active_users: number;
}

// ============================================================================
// Request/Query DTOs
// ============================================================================

export const TelemetryEventsQuerySchema = z.object({
	event_name: z.string().optional(),
	user_id: z.string().optional(),
	workflow_id: z.string().optional(),
	workspace_id: z.string().optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	limit: z.coerce.number().min(1).max(1000).optional(),
	offset: z.coerce.number().min(0).optional(),
});

export type TelemetryEventsQueryDto = z.infer<typeof TelemetryEventsQuerySchema>;

export const TelemetryStatsQuerySchema = z.object({
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	workspace_id: z.string().optional(),
});

export type TelemetryStatsQueryDto = z.infer<typeof TelemetryStatsQuerySchema>;

export const TelemetryTopEventsQuerySchema = z.object({
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional(),
});

export type TelemetryTopEventsQueryDto = z.infer<typeof TelemetryTopEventsQuerySchema>;
