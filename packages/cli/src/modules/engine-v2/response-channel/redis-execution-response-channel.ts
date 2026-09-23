export function getRedisExecutionResponseChannel(
	channelPrefix: string,
	executionId: string,
): string {
	return `${channelPrefix}:${executionId}`;
}
