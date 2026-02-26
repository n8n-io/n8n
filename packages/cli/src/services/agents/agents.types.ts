import type { User } from '@n8n/db';

export const LLM_BASE_URL = process.env.N8N_AGENT_LLM_BASE_URL ?? 'https://api.anthropic.com';
export const LLM_MODEL = process.env.N8N_AGENT_LLM_MODEL ?? 'claude-sonnet-4-5-20250929';
export const MAX_ITERATIONS = 15;
export const EXECUTION_TIMEOUT_MS = 120_000;
export const EXTERNAL_AGENT_TIMEOUT_MS = 30_000;

export interface ExternalAgentConfig {
	name: string;
	description?: string;
	url: string;
	apiKey: string;
}

export interface LlmConfig {
	apiKey: string;
	baseUrl: string;
	model: string;
}

export interface LlmMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface TaskStep {
	action: string;
	workflowName?: string;
	toAgent?: string;
	result?: string;
}

export interface IterationBudget {
	remaining: number;
}

export type StepCallback = (event: Record<string, unknown>) => void;

export interface AgentDto {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatar: string | null;
	description: string | null;
	agentAccessLevel: string | null;
	apiKey?: string;
}

export interface AgentTaskResult {
	status: string;
	summary?: string;
	steps: TaskStep[];
	message?: string;
}

export function sseWrite(
	res: { write: (chunk: string) => void; flush?: () => void },
	event: Record<string, unknown>,
) {
	res.write(`data: ${JSON.stringify(event)}\n\n`);
	res.flush?.();
}

export function toAgentDto(user: User): AgentDto {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		avatar: user.avatar,
		description: user.description,
		agentAccessLevel: user.agentAccessLevel,
	};
}
