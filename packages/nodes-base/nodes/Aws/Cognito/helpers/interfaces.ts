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
	Attributes: IUserAttribute[];
}

export interface IListUsersResponse {
	Users: IUser[];
	NextToken?: string;
}

export interface IUserAttributeInput {
	attributeType?: string;
	standardName?: string;
	customName?: string;
	Value?: string;
}

export interface IUserPool {
	UserPool: {
		UsernameAttributes: string[];
	};
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
