export function toolResult(data: Record<string, unknown>, isError = false) {
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(data) }],
		structuredContent: data,
		...(isError ? { isError: true } : {}),
	};
}
