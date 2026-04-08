export interface IHourlyRateDto {
	amount: number;
	currency: string;
}

const MembershipStatuses = {
	PENDING: 'PENDING',
	ACTIVE: 'ACTIVE',
	DECLINED: 'DECLINED',
	INACTIVE: 'INACTIVE',
} as const;

type MembershipStatusEnum = (typeof MembershipStatuses)[keyof typeof MembershipStatuses];

const TaskStatuses = {
	ACTIVE: 'ACTIVE',
	DONE: 'DONE',
} as const;

type TaskStatusEnum = (typeof TaskStatuses)[keyof typeof TaskStatuses];

export interface IMembershipDto {
	hourlyRate: IHourlyRateDto;
	membershipStatus: MembershipStatusEnum;
	membershipType: string;
	targetId: string;
	userId: string;
}

export interface ITagDto {
	id: string;
	name: any;
	workspaceId: string;
	archived: boolean;
}

export interface ITaskDto {
	assigneeIds: object;
	estimate: string;
	id: string;
	name: any;
	workspaceId: string;
	projectId: string;
	'is-active': boolean;
	status: TaskStatusEnum;
}

export interface ITimeIntervalDto {
	duration: string;
	end: string;
	start: string;
}
