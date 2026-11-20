/** Add transport status to displayed errors without changing the SDK exception. */
export async function withMcpHttpStatus(error: unknown, message: string): Promise<string> {
	if (!(error instanceof Error)) return message;

	const [{ StreamableHTTPError }, { SseError }] = await Promise.all([
		import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
		import('@modelcontextprotocol/sdk/client/sse.js'),
	]);
	if (!(error instanceof StreamableHTTPError || error instanceof SseError)) return message;

	const status = error.code;
	return typeof status === 'number' && Number.isInteger(status) && status >= 300 && status <= 599
		? `HTTP ${status}: ${message}`
		: message;
}
