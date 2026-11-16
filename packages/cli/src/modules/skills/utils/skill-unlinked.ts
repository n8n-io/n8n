import { sha256 } from '@n8n/utils/sha256';

/** Use the source file hash when parsing fails. */
export async function unreadableSkillHash(message: string, contentHash?: string): Promise<string> {
	return contentHash ?? (await sha256(`unreadable\n${message}`));
}
