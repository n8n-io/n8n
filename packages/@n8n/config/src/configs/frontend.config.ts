import { Config, Env } from '../decorators';
import { StringArray } from '../utils';

export type FrontendBetaFeatures = 'canvas_v2';

@Config
export class FrontendConfig {
	/** Which UI experiments to enable. Separate multiple values with a comma `,` */
	@Env('N8N_UI_BETA_FEATURES')
	betaFeatures: StringArray<FrontendBetaFeatures> = [];
}
