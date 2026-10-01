import { SDK_IMPORTABLE_FUNCTIONS } from '../codegen/emit-instance-ai';

const IMPORTABLE = new Set<string>(SDK_IMPORTABLE_FUNCTIONS);

// Bundled CommonJS names an import `(0 , import_workflow_sdk.code)`; native ESM
// reports that the module does not provide the export.
const UNKNOWN_FUNCTION_PATTERNS = [
	/import_workflow_sdk\d*\.([A-Za-z_$][\w$]*)\)? is not a function/g,
	/does not provide an export named '([A-Za-z_$][\w$]*)'/g,
];

/**
 * Explains a load failure caused by importing a function `@n8n/workflow-sdk`
 * does not export, such as `code()` or `agent()`. Returns undefined when the
 * error has another cause.
 */
export function explainUnknownSdkFunction(errorMessage: string): string | undefined {
	const unknown = new Set<string>();
	for (const pattern of UNKNOWN_FUNCTION_PATTERNS) {
		for (const match of errorMessage.matchAll(pattern)) {
			if (!IMPORTABLE.has(match[1])) unknown.add(match[1]);
		}
	}
	if (unknown.size === 0) return undefined;

	const names = [...unknown].map((name) => `\`${name}\``).join(', ');
	return (
		`${names} ${unknown.size === 1 ? 'is' : 'are'} not exported by @n8n/workflow-sdk. ` +
		`The SDK exports only: ${SDK_IMPORTABLE_FUNCTIONS.join(', ')}. ` +
		"Create every other node, such as Code, Filter, or AI Agent, with node({ type: 'n8n-nodes-base.code', version, config })."
	);
}
