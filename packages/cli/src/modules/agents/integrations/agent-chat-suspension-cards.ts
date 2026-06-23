import { isRecord } from '@n8n/utils';

import type { RichSuspendPayload } from '../types';

const APPROVAL_INPUT_MAX_LENGTH = 1500;

interface ApprovalSuspendPayload {
	type: 'approval';
	toolName: string;
	displayName?: string;
	args?: unknown;
}

export function isIntegrationActionSuspendPayload(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		value.type === 'integration_action'
	);
}

function isApprovalSuspendPayload(value: unknown): value is ApprovalSuspendPayload {
	return (
		isRecord(value) &&
		value.type === 'approval' &&
		typeof value.toolName === 'string' &&
		value.toolName.length > 0
	);
}

function truncateApprovalInput(value: string): string {
	if (value.length <= APPROVAL_INPUT_MAX_LENGTH) return value;
	return `${value.slice(0, APPROVAL_INPUT_MAX_LENGTH)}...`;
}

function stringifyApprovalInput(value: unknown): string | undefined {
	if (value === undefined) return undefined;

	if (typeof value === 'string') {
		return truncateApprovalInput(value);
	}

	try {
		const serialized = JSON.stringify(value, null, 2);
		return truncateApprovalInput(serialized ?? String(value));
	} catch {
		return truncateApprovalInput(String(value));
	}
}

function getApprovalToolLabel(payload: ApprovalSuspendPayload): string {
	return typeof payload.displayName === 'string' && payload.displayName.length > 0
		? payload.displayName
		: payload.toolName;
}

function buildApprovalCardPayload(payload: ApprovalSuspendPayload): {
	title: string;
	components: Array<{ type: string; [key: string]: unknown }>;
} {
	const toolLabel = getApprovalToolLabel(payload);
	const fields: Array<{ label: string; value: string }> = [{ label: 'Tool', value: toolLabel }];
	const input = stringifyApprovalInput(payload.args);

	if (input) {
		fields.push({ label: 'Input', value: input });
	}

	return {
		title: 'Approval required',
		components: [
			{ type: 'section', text: `The agent wants to run this tool: ${toolLabel}` },
			{ type: 'fields', fields },
			{ type: 'button', label: 'Approve', value: 'true', style: 'primary' },
			{ type: 'button', label: 'Deny', value: 'false', style: 'danger' },
		],
	};
}

export function buildSuspendCardPayload(
	payload: RichSuspendPayload | Record<string, unknown> | undefined,
): { title?: string; components: Array<{ type: string; [key: string]: unknown }> } | undefined {
	if (isIntegrationActionSuspendPayload(payload)) {
		return undefined;
	}

	const hasComponents =
		payload &&
		'components' in payload &&
		Array.isArray(payload.components) &&
		payload.components.length > 0;

	if (isApprovalSuspendPayload(payload)) {
		return buildApprovalCardPayload(payload);
	}

	if (hasComponents) {
		return payload as RichSuspendPayload;
	}

	const message =
		payload && typeof payload === 'object' && 'message' in payload
			? String(payload.message)
			: 'Action required — approve or deny?';

	return {
		title: message,
		components: [
			{ type: 'button', label: 'Approve', value: 'true', style: 'primary' },
			{ type: 'button', label: 'Deny', value: 'false', style: 'danger' },
		],
	};
}
