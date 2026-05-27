export function normalizePlatformId(platform: string, id: string): string {
	return id.includes(':') ? id : `${platform}:${id}`;
}
