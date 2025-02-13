import { Config, Env } from '../decorators';
@Config
export class ColorConfig {
	/*
		Change color-primary hsl
	*/
	@Env('N8N_COLOR_THEME')
	primary: string = '#ff6f5c'; // [ria] here! good!
}

console.log('[ria]:', process.env.N8N_COLOR_THEME);
