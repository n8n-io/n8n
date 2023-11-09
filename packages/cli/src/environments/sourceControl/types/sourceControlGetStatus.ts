import { IsBoolean, IsOptional, IsString } from 'class-validator';

function booleanFromString(value: string | boolean): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	return value === 'true';
}

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

	constructor(values: {
		direction: 'push' | 'pull';
		preferLocalVersion: string | boolean;
		verbose: string | boolean;
	}) {
		this.direction = values.direction || 'push';
		this.preferLocalVersion = booleanFromString(values.preferLocalVersion) || true;
		this.verbose = booleanFromString(values.verbose) || false;
	}
}
