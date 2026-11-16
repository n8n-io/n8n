import { sha256 } from '@n8n/utils/sha256';

/** The same unreadable SKILL.md stays hidden until its parse error changes. */
export async function unreadableSkillHash(message: string): Promise<string> {
	return await sha256(`unreadable\n${message}`);
}
