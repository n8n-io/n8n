import { z } from 'zod';

export const agentComputerUseAffectedResourceSchema = z.object({
	toolGroup: z.enum(['filesystemRead', 'filesystemWrite', 'shell', 'process', 'browser']),
	resource: z.string(),
	description: z.string(),
	preview: z
		.object({
			kind: z.enum(['text', 'diff']),
			title: z.string().optional(),
			content: z.string(),
			truncated: z.boolean().optional(),
		})
		.optional(),
});

export const agentComputerUseApprovalInputSchema = z.object({
	type: z.literal('approval'),
	toolName: z.string(),
	args: z.unknown(),
	resources: z.array(agentComputerUseAffectedResourceSchema),
});

export const agentComputerUseApprovalResumeSchema = z.object({
	approved: z.boolean(),
});

export type AgentComputerUseAffectedResource = z.infer<
	typeof agentComputerUseAffectedResourceSchema
>;
export type AgentComputerUseApprovalInput = z.infer<typeof agentComputerUseApprovalInputSchema>;
export type AgentComputerUseApprovalResume = z.infer<typeof agentComputerUseApprovalResumeSchema>;

export interface AgentComputerUseStatusResponse {
	moduleEnabled: boolean;
	connected: boolean;
	connectedAt: string | null;
	directory: string | null;
	hostIdentifier: string | null;
	capabilities: {
		filesystem: {
			enabled: boolean;
			write: boolean;
		};
		shell: {
			enabled: boolean;
			processes: boolean;
		};
		browser: {
			enabled: boolean;
			permissionMode: 'deny' | 'ask' | 'allow' | null;
			ready: boolean;
		};
	};
	pairingCommand?: string;
	expiresAt?: string | null;
	ttlSeconds?: number | null;
}
