const VALID_AGENT_TOOL_NAME = /^[a-zA-Z0-9_-]{1,128}$/;

/** Converts a persisted display name into the name exposed to the model at runtime. */
export function sanitizeAgentToolName(name: string): string {
	if (VALID_AGENT_TOOL_NAME.test(name)) return name;

	const sanitizedName = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 128);

	return sanitizedName || 'tool';
}
