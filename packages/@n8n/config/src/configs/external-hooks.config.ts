import { Config, Env } from '../decorators';

@Config
export class ExternalHooksConfig {
	/** Separator character for EXTERNAL_HOOK_FILES. Defaults to ':'. Use ';' on Windows. */
	@Env('EXTERNAL_HOOK_FILES_SEPARATOR')
	separator: string = ':';

	/** Paths to files that define external lifecycle hooks. */
	@Env('EXTERNAL_HOOK_FILES', (value: string, self: ExternalHooksConfig) =>
		value ? value.split(self.separator).filter((f) => f.length > 0) : [],
	)
	files: string[] = [];
}
