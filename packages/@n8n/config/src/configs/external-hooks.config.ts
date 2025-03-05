import { Config, Env } from '../decorators';

class ColonSeparatedStringArray<T extends string = string> extends Array<T> {
	constructor(str: string) {
		super();
		const parsed = str.split(':') as this;
		const filtered = parsed.filter((i) => typeof i === 'string' && i.length);
		return filtered.length ? filtered : [];
	}
}

@Config
export class ExternalHooksConfig {
	/** Files containing external hooks. Multiple files can be separated by colon (":") */
	@Env('EXTERNAL_HOOK_FILES')
	files: ColonSeparatedStringArray = [];
}
