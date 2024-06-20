import { IsBoolean } from 'class-validator';

export class SourceControlSetReadOnly {
	@IsBoolean()
	branchReadOnly: boolean;
}
