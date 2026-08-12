import { v4 as uuidv4 } from 'uuid';

/**
 * Resolve the project's persistent quick-help thread id.
 *
 * Stub for INS-1159: currently mints a fresh id every call. That ticket will
 * replace this with a `localStorage` `projectId -> threadId` map so offers in
 * the same project land in one conversation.
 */
export async function resolveQuickHelpThreadId(_projectId: string): Promise<string> {
	return uuidv4();
}
