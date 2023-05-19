import { IsBoolean } from 'class-validator';

export class VersionControlSetReadOnly {
	@IsBoolean()
	branchReadOnly: boolean;
}
