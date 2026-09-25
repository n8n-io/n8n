import { z } from 'zod';

const FOLDER_PATH_FIELD_DESCRIPTION =
	'Restrict to one folder, named the way the user named it — "logsearch", "personal/logsearch", "Clients/Acme". This is the ONLY correct way to address a folder: folder membership is stored, not encoded in workflow names, so a `query` prefix both misses members named differently and picks up non-members that share the prefix. Matched case-insensitively on the full path, then on the folder name. If it does not resolve, the result says so and lists the real folders — never assume the returned set is the folder.';

const FOLDER_ID_FIELD_DESCRIPTION =
	'Folder ID, when a previous listing already gave you one (each workflow row carries its `folder`). Prefer `folderPath` when working from what the user said. When both are given, `folderId` wins.';

const RECURSIVE_FIELD_DESCRIPTION =
	'Whether a folder is read together with its nested subfolders. Defaults to true, which is what a user naming a folder means. Set false only to inspect one level.';

export const folderScopeFields = {
	folderPath: z.string().optional().describe(FOLDER_PATH_FIELD_DESCRIPTION),
	folderId: z.string().optional().describe(FOLDER_ID_FIELD_DESCRIPTION),
	recursive: z.boolean().optional().describe(RECURSIVE_FIELD_DESCRIPTION),
};
