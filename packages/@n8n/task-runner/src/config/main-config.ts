import { Config, Nested } from '@n8n/config';

import { BaseRunnerConfig } from './base-runner-config';
import { JsRunnerConfig } from './js-runner-config';

@Config
export class MainConfig {
	@Nested
	baseRunnerConfig!: BaseRunnerConfig;

	@Nested
	jsRunnerConfig!: JsRunnerConfig;
}
