import { isRecord } from '@n8n/utils/is-record';

type SuspendCardPayload = {
	title?: string;
	components: Array<{ type: string; [key: string]: unknown }>;
};

interface ApprovalSuspendPayload {
	type: 'approval';
	toolName: string;
	displayName?: string;
}

export function isIntegrationActionSuspendPayload(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		value.type === 'integration_action'
	);
}

export function isApprovalSuspendPayload(value: unknown): value is ApprovalSuspendPayload {
	return (
		isRecord(value) &&
		value.type === 'approval' &&
		typeof value.toolName === 'string' &&
		value.toolName.length > 0
	);
}

function isSuspendCardComponent(value: unknown): value is SuspendCardPayload['components'][number] {
	return isRecord(value) && typeof value.type === 'string' && value.type.length > 0;
}

function isSuspendCardPayload(value: unknown): value is SuspendCardPayload {
	if (!isRecord(value) || !Array.isArray(value.components) || value.components.length === 0) {
		return false;
	}

	return value.components.every(isSuspendCardComponent);
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

export function buildSuspendCardPayload(payload: unknown): SuspendCardPayload | undefined {
	if (isIntegrationActionSuspendPayload(payload)) {
		return undefined;
	}

	if (isApprovalSuspendPayload(payload)) {
		return buildApprovalCardPayload(payload);
	}

	if (isSuspendCardPayload(payload)) {
		return payload;
	}

	const message =
		isRecord(payload) && 'message' in payload
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
