import { IsString } from 'class-validator';

export class VersionControlSetBranch {
	@IsString()
	branch: string;
}
