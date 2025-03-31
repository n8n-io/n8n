import type { IDataObject } from 'n8n-workflow';

export type User = {
	Arn: string;
	CreateDate: number;
	PasswordLastUsed?: number;
	Path?: string;
	PermissionsBoundary?: string;
	Tags: Array<{ Key: string; Value: string }>;
	UserId: string;
	UserName: string;
};

export type GetUserResponseBody = {
	GetUserResponse: {
		GetUserResult: {
			User: IDataObject;
		};
	};
};

export type GetGroupResponseBody = {
	GetGroupResponse: {
		GetGroupResult: {
			Group: IDataObject;
			Users?: IDataObject[];
		};
	};
};

export type GetAllUsersResponseBody = {
	ListUsersResponse: {
		ListUsersResult: {
			Users: IDataObject[];
			IsTruncated: boolean;
			Marker: string;
		};
	};
};

export type GetAllGroupsResponseBody = {
	ListGroupsResponse: {
		ListGroupsResult: {
			Groups: IDataObject[];
			IsTruncated: boolean;
			Marker: string;
		};
	};
};

export type Tags = {
	tags: IDataObject[];
};
