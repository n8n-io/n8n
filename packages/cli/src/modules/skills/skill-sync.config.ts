import { Config, Env } from '@n8n/config';
import { z } from 'zod';

/** Skill Sync settings. */
@Config
export class SkillSyncConfig {
	/** How often n8n checks each skill source for updates, in seconds. At least one minute. */
	@Env('N8N_SKILL_SYNC_CHECK_INTERVAL_SECONDS', z.number({ coerce: true }).int().min(60))
	checkIntervalSeconds: number = 3600;
}
