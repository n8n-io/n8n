import { Post, RestController, GlobalScope, Body } from '@n8n/decorators';
import { SettingsRepository } from '@n8n/db';
import { GlobalConfig } from '@n8n/config';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

interface ConfigurationUpdateRequest {
	allowPersonalProjectWorkflowActivation: boolean;
}

@RestController('/configuration')
export class ConfigurationController {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Update configuration settings
	 */
	@Post('/')
	@GlobalScope('banner:dismiss')
	async updateConfiguration(@Body payload: ConfigurationUpdateRequest) {
		const { allowPersonalProjectWorkflowActivation } = payload;

		if (typeof allowPersonalProjectWorkflowActivation !== 'boolean') {
			throw new BadRequestError('allowPersonalProjectWorkflowActivation must be a boolean');
		}

		// Save to database for persistence
		await this.settingsRepository.save(
			{
				key: 'workflows.allowPersonalProjectWorkflowActivation',
				value: String(allowPersonalProjectWorkflowActivation),
				loadOnStartup: true,
			},
			{ transaction: false },
		);

		// Update the runtime configuration
		this.globalConfig.workflows.allowPersonalProjectWorkflowActivation =
			allowPersonalProjectWorkflowActivation;

		return {
			allowPersonalProjectWorkflowActivation,
		};
	}
}
