import { NoXss } from '@n8n/db';
import { Expose } from 'class-transformer';
import { IsString, IsArray, IsOptional, IsEmail, IsEnum } from 'class-validator';
import type { IPersonalizationSurveyAnswersV4 } from 'n8n-workflow';

export class PersonalizationSurveyAnswersV4 implements IPersonalizationSurveyAnswersV4 {
	@NoXss()
	@Expose()
	@IsEnum(['v4'])
	version: 'v4';

	@NoXss()
	@Expose()
	@IsString()
	personalization_survey_submitted_at: string;

	@NoXss()
	@Expose()
	@IsString()
	personalization_survey_n8n_version: string;

	@Expose()
	@IsOptional()
	@IsArray()
	@NoXss({ each: true })
	@IsString({ each: true })
	automationGoalDevops?: string[] | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	automationGoalDevopsOther?: string | null;

	@NoXss({ each: true })
	@Expose()
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	companyIndustryExtended?: string[] | null;

	@NoXss({ each: true })
	@Expose()
	@IsOptional()
	@IsString({ each: true })
	otherCompanyIndustryExtended?: string[] | null;

	@IsEnum(['<20', '20-99', '100-499', '500-999', '1000+', 'personalUser'])
	@Expose()
	@IsOptional()
	@IsString()
	companySize?: string | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	companyType?: string | null;

	@NoXss({ each: true })
	@Expose()
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	automationGoalSm?: string[] | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	automationGoalSmOther?: string | null;

	@NoXss({ each: true })
	@Expose()
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	usageModes?: string[] | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsEmail()
	email?: string | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	role?: string | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	roleOther?: string | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	reportedSource?: string | null;

	@NoXss()
	@Expose()
	@IsOptional()
	@IsString()
	reportedSourceOther?: string | null;
}
