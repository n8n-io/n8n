import { UserError } from '@n8n/errors';

/** A link that no source client can read, for example not a GitHub URL. Reason `invalid_url`. */
export class SkillSourceUrlError extends UserError {}
