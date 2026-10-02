import { SettingsRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

const AGENTS_ENABLED_KEY = 'agents.enabled';

@Service()
export class AgentsSettingsService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getEnabled(ctx: OperationContext = {}): Promise<boolean> {
		// Read the saved value on admission so all processes use the same setting.
		const setting = await this.settingsRepository.findByKeyInContext(AGENTS_ENABLED_KEY, ctx);
		if (setting) return setting.value === 'true';

		return true;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsertByKey(AGENTS_ENABLED_KEY, String(enabled), true, {});
	}

	async assertEnabled(): Promise<void> {
		if (!(await this.getEnabled())) {
			throw new ForbiddenError(
				'Agents are disabled. Ask an instance admin to enable them in Settings > Agents.',
			);
		}
	}
}
