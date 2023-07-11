import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SourceControlGetStatus {
	@IsString()
	@IsOptional()
	direction: 'push' | 'pull';

	@IsBoolean()
	@IsOptional()
	preferLocalVersion: boolean;

	@IsBoolean()
	@IsOptional()
	verbose: boolean;

	constructor(sourceControlGetStatus?: SourceControlGetStatus) {
		if (sourceControlGetStatus) {
			this.direction = sourceControlGetStatus.direction || 'push';
			this.preferLocalVersion = sourceControlGetStatus.preferLocalVersion || true;
			this.verbose = sourceControlGetStatus.verbose || false;
		}
	}
}
