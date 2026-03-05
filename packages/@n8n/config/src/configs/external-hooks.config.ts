import { ColonSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

@Config
export class ExternalHooksConfig {
	/** Paths to files that define external lifecycle hooks. Colon-separated for multiple files. */
	@Env('EXTERNAL_HOOK_FILES')
	files: ColonSeparatedStringArray = [];
}
