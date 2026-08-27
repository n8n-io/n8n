/**
 * Whether the agent can see and address n8n FOLDERS: each listed workflow's
 * containing folder, and `folderPath`/`folderId` on `workflows(action="list")`.
 *
 * Gated so both arms of a measurement run off one binary — with it off, a folder
 * request has to fall back to a workflow-name guess, which is the behaviour being
 * compared against. Defaults to ON: once the capability is there, hiding it
 * behind an unset variable would leave the guess as the shipped path.
 */
export function isFolderContextEnabled(): boolean {
	return process.env.N8N_INSTANCE_AI_FOLDER_CONTEXT_ENABLED !== 'false';
}
