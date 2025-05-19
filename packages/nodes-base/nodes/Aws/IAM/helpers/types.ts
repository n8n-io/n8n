export type Group = {
	Arn: string;
	CreateDate: number;
	GroupId: string;
	GroupName: string;
	Path?: string;
};

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

export type Tags = {
	tags: Array<{ key: string; value: string }>;
};

export type GetUserResponseBody = {
	GetUserResponse: {
		GetUserResult: {
			User: User;
		};
	};
};

export type GetGroupResponseBody = {
	GetGroupResponse: {
		GetGroupResult: {
			Group: Group;
			Users?: User[];
		};
	};
};

export type GetAllUsersResponseBody = {
	ListUsersResponse: {
		ListUsersResult: {
			Users: User[];
			IsTruncated: boolean;
			Marker: string;
		};
	};
};

export type GetAllGroupsResponseBody = {
	ListGroupsResponse: {
		ListGroupsResult: {
			Groups: Group[];
			IsTruncated: boolean;
			Marker: string;
		};
	};
};

export type AwsError = {
	Code: string;
	Message: string;
};

export type ErrorResponse = {
	Error: {
		Code: string;
		Message: string;
	};
};

export type ErrorMessage = {
	message: string;
	description: string;
};
