import type { IHourlyRateDto, IMembershipDto } from './CommonDtos';

const Estimates = {
	AUTO: 'AUTO',
	MANUAL: 'MANUAL',
} as const;

type EstimateEnum = (typeof Estimates)[keyof typeof Estimates];

interface IEstimateDto {
	estimate: string;
	type: EstimateEnum;
}

export interface IProjectDto {
	archived: boolean;
	billable: boolean;
	clientId: string;
	clientName: string | undefined;
	color: string;
	duration: string | undefined;
	estimate: IEstimateDto | undefined;
	hourlyRate: IHourlyRateDto | undefined;
	id: string;
	memberships: IMembershipDto[] | undefined;
	name: string;
	isPublic: boolean;
	workspaceId: string;
	note: string | undefined;
}

export interface IProjectRequest {
	name: string;
	clientId: string;
	isPublic: boolean;
	estimate: IEstimateDto;
	color: string;
	note: string;
	billable: boolean;
	hourlyRate: IHourlyRateDto;
	memberships: IMembershipDto;
	tasks: ITaskDto;
}

const TaskStatuses = {
	ACTIVE: 'ACTIVE',
	DONE: 'DONE',
} as const;

type TaskStatusEnum = (typeof TaskStatuses)[keyof typeof TaskStatuses];

export interface ITaskDto {
	assigneeIds: object;
	estimate: string;
	id: string;
	name: string;
	projectId: string;
	status: TaskStatusEnum;
	'is-active': boolean;
}
