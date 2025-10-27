export function constructChatWebsocketUrl(
	url: string,
	executionId: string,
	sessionId: string,
	isPublic: boolean,
) {
	const baseUrl = new URL(url).origin;
	const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
	const wsUrl = baseUrl.replace(/^https?/, wsProtocol);
	return `${wsUrl}/chat?sessionId=${sessionId}&executionId=${executionId}${isPublic ? '&isPublic=true' : ''}`;
}
