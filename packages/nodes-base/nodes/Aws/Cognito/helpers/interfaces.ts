import type { IDataObject } from 'n8n-workflow';

export interface IUserAttribute {
	Name: string;
	Value: string;
}

export interface IUser {
	Username: string;
	Enabled: boolean;
	UserCreateDate: string;
	UserLastModifiedDate: string;
	UserStatus: string;
	Attributes?: IUserAttribute[];
}

export interface IGroup {
	GroupName: string;
}

export interface IListUsersResponse {
	Users: IUser[];
	NextToken?: string;
}

export interface IListGroupsResponse {
	Groups: IGroup[];
	NextToken?: string;
}

export interface IGroupWithUserResponse extends IGroup {
	Users: IUser[];
}

export interface IUserAttributeInput {
	attributeType: string;
	standardName: string;
	customName: string;
	value: string;
}

export interface IUserPool {
	Id: string;
	Name: string;
	UsernameAttributes?: string[];
	AccountRecoverySetting?: IDataObject;
	AdminCreateUserConfig?: IDataObject;
	EmailConfiguration?: IDataObject;
	LambdaConfig?: IDataObject;
	Policies?: IDataObject;
	SchemaAttributes?: IDataObject;
	UserAttributeUpdateSettings?: IDataObject;
	UserPoolTags?: IDataObject;
	UserPoolTier?: string;
	VerificationMessageTemplate?: IDataObject;
}

export interface Filters {
	filter?: {
		attribute?: string;
		value?: string;
	};
}

export interface AwsError {
	__type?: string;
	message?: string;
}

export interface ErrorMessage {
	message: string;
	description: string;
}
