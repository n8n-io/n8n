export function formatTraceLabel(value: string): string {
	return value
		.trim()
		.replace(/[._\s]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function formatAgentRoleLabel(role: string): string {
	return formatTraceLabel(role.replace(/^instance-ai[._-]?/, ''));
}

export function formatResumeReasonLabel(reason: unknown): string {
	if (typeof reason !== 'string' || reason.trim().length === 0) {
		return 'checkpoint';
	}

	return reason
		.trim()
		.replace(/[._-]+/g, ' ')
		.replace(/\s+/g, ' ');
}

export function formatInternalOperationLabel(operationName: string): string {
	return formatAgentRoleLabel(operationName);
}

export function formatTelemetryFunctionId(agentRole: string): string {
	if (agentRole.startsWith('instance-ai.')) {
		return agentRole;
	}

	return `instance-ai.${agentRole.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')}`;
}
