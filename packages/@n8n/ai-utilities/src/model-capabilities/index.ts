export function anthropicModelRequiresAdaptiveThinking(modelId: string): boolean {
	const match = /^(?:anthropic\/)?claude-opus-(\d+)(?:-(\d{1,3}))?(?:-\d{8})?$/.exec(modelId);
	if (!match) return false;

	const majorVersion = Number(match[1]);
	const minorVersion = Number(match[2] ?? 0);
	return majorVersion > 4 || (majorVersion === 4 && minorVersion >= 7);
}
