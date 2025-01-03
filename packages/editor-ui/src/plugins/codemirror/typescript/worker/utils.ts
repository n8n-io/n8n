import { type CodeExecutionMode } from 'n8n-workflow';

export const fnPrefix = (mode: CodeExecutionMode) => `(
/**
 * @returns {${returnTypeForMode(mode)}}
*/
() => {\n`;

export function wrapInFunction(script: string, mode: CodeExecutionMode): string {
	return `${fnPrefix(mode)}${script}\n})()`;
}

export function globalTypeDefinition(types: string) {
	return `export {};
declare global {
	${types}
}`;
}

export function returnTypeForMode(mode: CodeExecutionMode): string {
	return mode === 'runOnceForAllItems' ? 'N8nOutputItems' : 'N8nOutputItem';
}
