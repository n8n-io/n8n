import { ColonSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

@Config
export class ExternalHooksConfig {
	/** Separator character for EXTERNAL_HOOK_FILES. Defaults to ':'. Use ';' on Windows. */
	@Env('EXTERNAL_HOOK_FILES_SEPARATOR')
	separator: string = ':';

	/** Paths to files that define external lifecycle hooks. Separated by EXTERNAL_HOOK_FILES_SEPARATOR. */
	@Env('EXTERNAL_HOOK_FILES')
	files: ColonSeparatedStringArray = [];

	sanitize() {
		if (this.separator === ':') return;

		const joined = this.files.join(':');
		this.files = joined.split(this.separator).filter((f) => f.length > 0);
	}
}
