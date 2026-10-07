import { z } from 'zod';
import { Z } from '../zod-class';

export const AgentCodingConfigSchema = z.object({
	repositoryUrl: z
		.string()
		.url()
		.refine((value) => {
			const url = new URL(value);
			return url.protocol === 'https:' && !url.username && !url.password;
		}, 'Use an HTTPS repository URL without credentials'),
	branch: z.string().max(255).default(''),
	credentialId: z.string().optional(),
	setupCommand: z.string().max(10_000).default(''),
	runCommand: z.string().max(10_000).default(''),
	checkCommand: z.string().max(10_000).default(''),
	port: z.number().int().min(1).max(65535).default(3000),
});

export type AgentCodingConfig = z.infer<typeof AgentCodingConfigSchema>;

export const AgentCodingActionSchema = z.object({
	action: z.enum(['prepare', 'start', 'stop', 'check', 'undo', 'commit', 'push']),
	sessionId: z.string().uuid().optional(),
	path: z.string().max(4096).optional(),
	message: z.string().min(1).max(1000).optional(),
});

export type AgentCodingAction = z.infer<typeof AgentCodingActionSchema>;

export class AgentCodingActionDto extends Z.class(AgentCodingActionSchema.shape) {}

export class AgentCodingPathDto extends Z.class({
	sessionId: z.string().uuid().optional(),
	path: z.string().max(4096).default(''),
	search: z.string().max(255).default(''),
}) {}

export class AgentCodingLogDto extends Z.class({
	sessionId: z.string().uuid().optional(),
	stream: z.enum(['setup', 'app', 'check']).default('app'),
}) {}

export class AgentCodingSessionQueryDto extends Z.class({
	sessionId: z.string().uuid().optional(),
}) {}

export const AgentCodingCreateSessionSchema = z.object({
	id: z.string().uuid().optional(),
	name: z.string().trim().min(1).max(100),
	baseBranch: z.string().trim().max(255).default(''),
	branch: z.string().trim().max(255).default(''),
	original: z.boolean().default(false),
});
export type AgentCodingCreateSession = z.infer<typeof AgentCodingCreateSessionSchema>;
export class AgentCodingCreateSessionDto extends Z.class(AgentCodingCreateSessionSchema.shape) {}

export class AgentCodingArchiveSessionDto extends Z.class({
	sessionId: z.string().uuid(),
	archived: z.boolean(),
}) {}

export class AgentCodingCreateChatDto extends Z.class({
	sessionId: z.string().uuid(),
}) {}

export const AgentCodingSessionSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	branch: z.string(),
	baseBranch: z.string(),
	baseCommit: z.string().regex(/^[a-f0-9]{40,64}$/),
	original: z.boolean(),
	createdAt: z.string(),
	archivedAt: z.string().nullable(),
	hasConversation: z.boolean().default(false),
	chatIds: z.array(z.string().uuid()).default([]),
});
export type AgentCodingSession = z.infer<typeof AgentCodingSessionSchema>;

export const AgentCodingStatusSchema = z.object({
	phase: z.enum(['not_started', 'cloning', 'installing', 'ready', 'error']),
	branch: z.string(),
	changes: z.array(
		z.object({
			path: z.string(),
			status: z.string(),
			additions: z.number().default(0),
			deletions: z.number().default(0),
		}),
	),
	uncommittedChanges: z.number().default(0),
	uncommittedPaths: z.array(z.string()).default([]),
	app: z.enum(['stopped', 'starting', 'running', 'error']),
	check: z.enum(['not_started', 'running', 'passed', 'failed']),
	setupExitCode: z.number().nullable(),
	checkExitCode: z.number().nullable(),
});

export type AgentCodingStatus = z.infer<typeof AgentCodingStatusSchema>;

export interface AgentCodingChat {
	id: string;
	title?: string;
	hasConversation: boolean;
}

export interface AgentCodingSessionSummary extends AgentCodingSession {
	status: AgentCodingStatus;
	activity: 'idle' | 'running' | 'waiting' | 'completed' | 'error';
	chats: AgentCodingChat[];
}

export interface AgentCodingSessions {
	sessions: AgentCodingSessionSummary[];
	branches: string[];
}

export interface AgentCodingFile {
	name: string;
	path: string;
	type: 'file' | 'directory';
}

export interface AgentCodingFileContent {
	path: string;
	content: string;
}

export interface AgentCodingDiffContent extends AgentCodingFileContent {
	revision: string;
}

export interface AgentCodingPreview {
	url: string;
}

export const N8N_CODING_DEFAULTS = {
	setupCommand:
		'pnpm agent:setup install --mem 3072 && pnpm agent:setup build --mem 3072 --concurrency 1',
	runCommand:
		'pnpm --filter n8n exec concurrently --kill-others "pnpm --workspace-root dev:be" "pnpm --workspace-root dev:fe:editor"',
	checkCommand: 'pnpm agent:typecheck',
	port: 8080,
};
