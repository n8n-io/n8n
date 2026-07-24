import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { isValidGitBranchName } from '../../utils/git-branch-name';
import { Z } from '../../zod-class';

export class PushWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
	commitMessage: z.string().optional(),
	fileNames: z.array(SourceControlledFileSchema),
	branch: z
		.string()
		.refine(isValidGitBranchName, { message: 'Invalid git branch name' })
		.optional(),
	createBranch: z.boolean().optional(),
}) {}
