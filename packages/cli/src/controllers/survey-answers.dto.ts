import { NoXss } from '@/validators/no-xss.validator';
import { IsString, IsArray, IsOptional, IsEmail, IsEnum } from 'class-validator';

export class PersonalizationSurveyAnswersV4 {
	@NoXss()
	@IsOptional()
	@IsEnum(['v4'])
	version: 'v4';

	@NoXss({ each: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	automationGoalDevops?: string[] | null;

	@NoXss()
	@IsOptional()
	@IsString()
	automationGoalDevopsOther?: string | null;

	@NoXss({ each: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	companyIndustryExtended?: string[] | null;

	@NoXss({ each: true })
	@IsOptional()
	@IsString()
	otherCompanyIndustryExtended?: string[] | null;

	@NoXss()
	@IsOptional()
	@IsString()
	companySize?: string | null;

	@NoXss()
	@IsOptional()
	@IsString()
	companyType?: string | null;

	@NoXss({ each: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	automationGoalSm?: string[] | null;

	@NoXss()
	@IsOptional()
	@IsString()
	automationGoalSmOther?: string | null;

	@NoXss({ each: true })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	usageModes?: string[] | null;

	@NoXss()
	@IsOptional()
	@IsEmail()
	email?: string | null;

	@NoXss()
	@IsOptional()
	@IsString()
	role?: string | null;

	@NoXss()
	@IsOptional()
	@IsString()
	roleOther?: string | null;

	@NoXss()
	@IsOptional()
	@IsString()
	reportedSource?: string | null;

	@NoXss()
	@IsOptional()
	@IsString()
	reportedSourceOther?: string | null;
}
