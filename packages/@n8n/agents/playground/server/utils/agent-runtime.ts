import type { Agent, BuiltEval } from '@n8n/agents';

// The compile endpoint stores an Agent instance (not a BuiltAgent) because
// user code exports the builder before .build() is called. The Agent class
// lazy-builds on first use and exposes the same methods.
let currentAgent: Agent | undefined;
let currentEvals: BuiltEval[] = [];

export function getActiveAgent(): Agent | undefined {
	return currentAgent;
}

export function setActiveAgent(agent: Agent): void {
	currentAgent = agent;
}

export function getActiveEvals(): BuiltEval[] {
	return currentEvals;
}

export function setActiveEvals(evalList: BuiltEval[]): void {
	currentEvals = evalList;
}

export function clearAgent(): void {
	currentAgent = undefined;
	currentEvals = [];
}
