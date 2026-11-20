export function extractDefinedCustomProperties(scss: string): string[] {
	const deprecatedIndex = scss.indexOf('/* deprecated */');
	const source = deprecatedIndex === -1 ? scss : scss.slice(0, deprecatedIndex);
	const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '\n').replace(/\/\/.*$/gm, '');

	const names: string[] = [];
	const seen = new Set<string>();

	for (const match of withoutComments.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
		const name = match[1];
		if (name !== undefined && !seen.has(name)) {
			seen.add(name);
			names.push(name);
		}
	}

	return names;
}

const isColorChannelToken = (name: string) =>
	name.endsWith('--h') || name.endsWith('--s') || name.endsWith('--l');

export const isLikelyColorTokenName = (name: string) => {
	if (isColorChannelToken(name)) {
		return false;
	}

	return (
		name.includes('color') ||
		name.includes('background') ||
		name.includes('fill') ||
		name.includes('stroke')
	);
};

export function getColorTokenNames(source: string): string[] {
	return extractDefinedCustomProperties(source).filter(isLikelyColorTokenName);
}
