import type { INodeProperties } from 'n8n-workflow';

/** Advanced HITL parameters on the Telegram node, hidden when the experiment is off. */
export const TELEGRAM_HITL_PARAMETER_NAMES = new Set(['chatApproval', 'chatApprovalOptions']);

/** Removes the advanced HITL parameters from a Telegram node's rendered parameter list. */
export function filterTelegramHitlParameters(parameters: INodeProperties[]): INodeProperties[] {
	return parameters.filter((parameter) => !TELEGRAM_HITL_PARAMETER_NAMES.has(parameter.name));
}
