import { MoveAgentSkillsToProjects1793116772027 as BaseMigration } from '../common/1793116772027-MoveAgentSkillsToProjects';

/**
 * On SQLite, dropping the CHECK and the `agentId` column recreate the whole `skill` table.
 * `skill_version`, `agent_skill_dependency` and `agent_version_skill_dependency` reference
 * it with ON DELETE CASCADE, so the recreate's DROP would delete their rows. Disable
 * foreign keys for the migration so the drop stays local to `skill`.
 */
export class MoveAgentSkillsToProjects1793116772027 extends BaseMigration {
	withFKsDisabled = true as const;
}
