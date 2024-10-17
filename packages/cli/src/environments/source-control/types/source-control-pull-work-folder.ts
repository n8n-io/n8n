import { IsBoolean, IsOptional } from 'class-validator';

export class SourceControlPullWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;
}

export class SourceControllPullOptions {
	/** ID of user performing a source control pull. */
	userId: string;

	force?: boolean;
}
