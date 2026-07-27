import type { INodeProperties } from 'n8n-workflow';

/** Advanced HITL parameters on the Slack node, hidden when the experiment is off. */
export const SLACK_HITL_PARAMETER_NAMES = new Set(['captureResponder', 'approvers']);

/** Removes the advanced HITL parameters from a Slack node's rendered parameter list. */
export function filterSlackHitlParameters(parameters: INodeProperties[]): INodeProperties[] {
	return parameters.filter((parameter) => !SLACK_HITL_PARAMETER_NAMES.has(parameter.name));
}
