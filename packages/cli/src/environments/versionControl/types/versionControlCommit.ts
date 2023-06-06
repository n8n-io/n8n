import { IsString } from 'class-validator';

export class VersionControlCommit {
	@IsString()
	message: string;
}
