/**
 * The modules that the code of a Code node can load with `require`.
 *
 * n8n reads them from `NODE_FUNCTION_ALLOW_BUILTIN` and `NODE_FUNCTION_ALLOW_EXTERNAL`, and
 * gives both to its task runner (`task-runner-process-js.ts`). The task runner allows a
 * module only when its list has the name, or is `*` alone. The default is no module.
 *
 * This is the one place that reads the two settings for the compiled engine: the converter
 * gets the built-in list (`ConvertOptions.codeModules`), and the fallback host gets both
 * (`WF_FALLBACK_CODE_ALLOW_BUILTIN`, `WF_FALLBACK_CODE_ALLOW_EXTERNAL`).
 */
export interface CodeNodeModules {
	builtin: string[];
	external: string[];
}

/** One list, as the task runner parses it: `*` alone is every module. */
function moduleList(text: string | undefined): string[] {
	if (text === undefined) return [];
	if (text === '*') return ['*'];
	return text
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name !== '' && name !== '*');
}

export function codeNodeModules(env: NodeJS.ProcessEnv = process.env): CodeNodeModules {
	return {
		builtin: moduleList(env.NODE_FUNCTION_ALLOW_BUILTIN),
		external: moduleList(env.NODE_FUNCTION_ALLOW_EXTERNAL),
	};
}

/** The two lists as the environment of the fallback host. */
export function hostCodeModules(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
	const { builtin, external } = codeNodeModules(env);
	return {
		WF_FALLBACK_CODE_ALLOW_BUILTIN: builtin.join(','),
		WF_FALLBACK_CODE_ALLOW_EXTERNAL: external.join(','),
	};
}
