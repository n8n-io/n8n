import { IsString } from 'class-validator';

export class SourceControlSetBranch {
	@IsString()
	branch: string;
}
