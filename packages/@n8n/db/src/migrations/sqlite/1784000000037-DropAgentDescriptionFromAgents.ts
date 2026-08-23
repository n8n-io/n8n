import { DropAgentDescriptionFromAgents1784000000037 as BaseMigration } from '../common/1784000000037-DropAgentDescriptionFromAgents';

/**
 * Dropping a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class DropAgentDescriptionFromAgents1784000000037 extends BaseMigration {
	withFKsDisabled = true as const;
}
