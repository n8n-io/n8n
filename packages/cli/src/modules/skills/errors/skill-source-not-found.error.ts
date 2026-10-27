import { OperationalError } from '@n8n/errors';

/**
 * The source, or one skill in it, is not there any more: deleted, moved, or private for this
 * access. Reason `not_found`. A synced skill keeps its last version.
 */
export class SkillSourceNotFoundError extends OperationalError {}
