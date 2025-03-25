import { ColonSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

@Config
export class ExternalHooksConfig {
	/** Files containing external hooks. Multiple files can be separated by colon (":") */
	@Env('EXTERNAL_HOOK_FILES')
	files: ColonSeparatedStringArray = [];
}
