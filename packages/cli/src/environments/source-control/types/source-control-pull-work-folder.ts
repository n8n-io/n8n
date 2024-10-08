import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class SourceControlPullWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsBoolean()
	@IsOptional()
	importAfterPull?: boolean = true;

	@IsObject()
	@IsOptional()
	variables?: { [key: string]: string };
}

export class SourceControllPullOptions {
	/** ID of user performing a source control pull. */
	userId: string;

	force?: boolean;

	variables?: { [key: string]: string };
}
