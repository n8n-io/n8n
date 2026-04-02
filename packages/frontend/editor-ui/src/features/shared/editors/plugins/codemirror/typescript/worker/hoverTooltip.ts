import type * as tsvfs from '@typescript/vfs';

export function getHoverTooltip({
	pos,
	fileName,
	env,
}: { pos: number; fileName: string; env: tsvfs.VirtualTypeScriptEnvironment }) {
	const quickInfo = env.languageService.getQuickInfoAtPosition(fileName, pos);

	if (!quickInfo) return null;

	const start = quickInfo.textSpan.start;

	const typeDef =
		env.languageService.getTypeDefinitionAtPosition(fileName, pos) ??
		env.languageService.getDefinitionAtPosition(fileName, pos);

	return {
		start,
		end: start + quickInfo.textSpan.length,
		typeDef,
		quickInfo,
	};
}
