/**
 * TEMPLATE: Types file
 *
 * Define TypeScript interfaces for all API response shapes, request bodies,
 * workflow static data, and any other typed structures. Import these in
 * GenericFunctions.ts, the node file, and test files.
 *
 * Rules:
 *   - NEVER use `any` — use proper types or `unknown`
 *   - Avoid `as` type casting — use type guards
 *   - Define interfaces for ALL API responses
 *
 * Replace __ServiceName__ with your service name.
 */
import type { IDataObject } from 'n8n-workflow';

// ---- API Response Types ----

export interface __ServiceName__Item {
	id: string;
	name: string;
	description?: string;
	status: 'active' | 'archived' | 'deleted';
	tags?: string[];
	created_at: string;
	updated_at: string;
	metadata?: IDataObject;
}

export interface __ServiceName__PaginatedResponse<T> {
	data: T[];
	total: number;
	offset: number;
	limit: number;
	has_more: boolean;
}

export interface __ServiceName__CursorResponse<T> {
	data: T[];
	next_cursor?: string;
	has_more: boolean;
}

export interface __ServiceName__User {
	id: string;
	email: string;
	name: string;
	role: 'admin' | 'member' | 'viewer';
	avatar_url?: string;
}

export interface __ServiceName__Webhook {
	id: string;
	url: string;
	events: string[];
	active: boolean;
	created_at: string;
}

// ---- Request Body Types ----

export interface CreateItemBody {
	name: string;
	description?: string;
	tags?: string[];
}

export interface UpdateItemBody {
	name?: string;
	description?: string;
	tags?: string[];
	status?: 'active' | 'archived';
}

// ---- Workflow Static Data Types ----

export interface __ServiceName__TriggerStaticData {
	lastTimestamp?: string;
	lastId?: string;
	possibleDuplicates?: string[];
	webhookId?: string;
}

// ---- Error Response Types ----

export interface __ServiceName__ErrorResponse {
	error: {
		code: string;
		message: string;
		details?: IDataObject;
	};
	status: number;
}
