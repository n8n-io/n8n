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
	const returnItem = '{ json: { [key: string]: unknown } } | { [key: string]: unknown }';
	if (mode === 'runOnceForAllItems') {
		return `Promise<Array<${returnItem}>> | Array<${returnItem}>`;
	}

	return `Promise<${returnItem}> | ${returnItem}`;
}
