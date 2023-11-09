import { IsString } from 'class-validator';

export class SourceControlCommit {
	@IsString()
	message: string;
}
