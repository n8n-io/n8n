export type IPersonalizationSurveyAnswersV1 = {
	codingSkill?: string | null;
	companyIndustry?: string[] | null;
	companySize?: string | null;
	otherCompanyIndustry?: string | null;
	otherWorkArea?: string | null;
	workArea?: string[] | string | null;
};

export type IPersonalizationSurveyAnswersV2 = {
	version: 'v2';
	automationGoal?: string | null;
	codingSkill?: string | null;
	companyIndustryExtended?: string[] | null;
	companySize?: string | null;
	companyType?: string | null;
	mspFocus?: string[] | null;
	mspFocusOther?: string | null;
	otherAutomationGoal?: string | null;
	otherCompanyIndustryExtended?: string[] | null;
};

export type IRole = 'default' | 'owner' | 'member';

export interface IUserResponse {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	globalRole?: {
		name: IRole;
		id: string;
	};
	personalizationAnswers?: IPersonalizationSurveyAnswersV1 | IPersonalizationSurveyAnswersV2 | null;
	isPending: boolean;
}

export interface IUser extends IUserResponse {
	isDefaultUser: boolean;
	isPendingUser: boolean;
	isOwner: boolean;
	fullName?: string;
}
