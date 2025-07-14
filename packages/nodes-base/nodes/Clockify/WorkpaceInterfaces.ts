import type { IHourlyRateDto, IMembershipDto } from './CommonDtos';

export const AdminOnlyPages = {
	PROJECT: 'PROJECT',
	TEAM: 'TEAM',
	REPORTS: 'REPORTS',
} as const;

export type AdminOnlyPagesEnum = (typeof AdminOnlyPages)[keyof typeof AdminOnlyPages];

export const DaysOfWeek = {
	MONDAY: 'MONDAY',
	TUESDAY: 'TUESDAY',
	WEDNESDAY: 'WEDNESDAY',
	THURSDAY: 'THURSDAY',
	FRIDAY: 'FRIDAY',
	SATURDAY: 'SATURDAY',
	SUNDAY: 'SUNDAY',
} as const;

export type DaysOfWeekEnum = (typeof DaysOfWeek)[keyof typeof DaysOfWeek];

export const DatePeriods = {
	DAYS: 'DAYS',
	WEEKS: 'WEEKS',
	MONTHS: 'MONTHS',
} as const;

export type DatePeriodEnum = (typeof DatePeriods)[keyof typeof DatePeriods];

export const AutomaticLockTypes = {
	WEEKLY: 'WEEKLY',
	MONTHLY: 'MONTHLY',
	OLDER_THAN: 'OLDER_THAN',
} as const;

export type AutomaticLockTypeEnum = (typeof AutomaticLockTypes)[keyof typeof AutomaticLockTypes];

interface IAutomaticLockDto {
	changeDay: DaysOfWeekEnum;
	dayOfMonth: number;
	firstDay: DaysOfWeekEnum;
	olderThanPeriod: DatePeriodEnum;
	olderThanValue: number;
	type: AutomaticLockTypeEnum;
}

interface IRound {
	minutes: string;
	round: string;
}

interface IWorkspaceSettingsDto {
	adminOnlyPages: AdminOnlyPagesEnum[];
	automaticLock: IAutomaticLockDto;
	canSeeTimeSheet: boolean;
	defaultBillableProjects: boolean;
	forceDescription: boolean;
	forceProjects: boolean;
	forceTags: boolean;
	forceTasks: boolean;
	lockTimeEntries: string;
	onlyAdminsCreateProject: boolean;
	onlyAdminsCreateTag: boolean;
	onlyAdminsSeeAllTimeEntries: boolean;
	onlyAdminsSeeBillableRates: boolean;
	onlyAdminsSeeDashboard: boolean;
	onlyAdminsSeePublicProjectsEntries: boolean;
	projectFavorites: boolean;
	projectGroupingLabel: string;
	projectPickerSpecialFilter: boolean;
	round: IRound;
	timeRoundingInReports: boolean;
	trackTimeDownToSecond: boolean;
}

export interface IWorkspaceDto {
	hourlyRate: IHourlyRateDto;
	id: string;
	imageUrl: string;
	memberships: IMembershipDto[];
	name: string;
	workspaceSettings: IWorkspaceSettingsDto;
}

export interface IClientDto {
	id: string;
	name: string;
	workspaceId: string;
}
