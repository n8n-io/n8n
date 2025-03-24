export interface IUserAttribute {
	Name: string;
	Value: string;
}

export interface IUser {
	Username: string;
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
	UsernameAttributes: string[];
}

export interface Filters {
	filter?: {
		attribute?: string;
		value?: string;
	};
}
