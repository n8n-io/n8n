import { IsString, IsArray, IsOptional, IsEmail, IsEnum } from 'class-validator';

export class PersonalizationSurveyAnswersV4 {
	@IsEnum(['v4'])
	version: 'v4';

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	automationGoalDevops?: string[] | null;

	@IsOptional()
	@IsString()
	automationGoalDevopsOther?: string | null;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	companyIndustryExtended?: string[] | null;

	@IsOptional()
	@IsString()
	otherCompanyIndustryExtended?: string[] | null;

	@IsOptional()
	@IsString()
	companySize?: string | null;

	@IsOptional()
	@IsString()
	companyType?: string | null;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	automationGoalSm?: string[] | null;

	@IsOptional()
	@IsString()
	automationGoalSmOther?: string | null;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	usageModes?: string[] | null;

	@IsOptional()
	@IsEmail()
	email?: string | null;

	@IsOptional()
	@IsString()
	role?: string | null;

	@IsOptional()
	@IsString()
	roleOther?: string | null;

	@IsOptional()
	@IsString()
	reportedSource?: string | null;

	@IsOptional()
	@IsString()
	reportedSourceOther?: string | null;
}
