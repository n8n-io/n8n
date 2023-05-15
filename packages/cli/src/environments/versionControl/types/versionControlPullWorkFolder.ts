import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class VersionControlPullWorkFolder {
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

export class VersionControllPullOptions {
	userId: string;

	force?: boolean;

	variables?: { [key: string]: string };

	importAfterPull?: boolean = true;
}
