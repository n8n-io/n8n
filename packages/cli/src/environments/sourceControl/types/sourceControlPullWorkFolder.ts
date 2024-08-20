import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class SourceControlPullWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsBoolean()
	@IsOptional()
	importAfterPull?: boolean = true;

	@IsString({ each: true })
	@IsOptional()
	files?: Set<string>;

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
