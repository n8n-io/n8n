export interface IHourlyRateDto {
	amount: number;
	currency: string;
}

enum MembershipStatusEnum {
	PENDING = 'PENDING',
	ACTIVE = 'ACTIVE',
	DECLINED = 'DECLINED',
	INACTIVE = 'INACTIVE'
}

export interface IMembershipDto {
	hourlyRate: IHourlyRateDto;
	membershipStatus: MembershipStatusEnum;
	membershipType: string;
	targetId: string;
	userId: string;
}

export interface ITagDto {
	id: string;
	name: any; // tslint:disable-line:no-any
	workspaceId: string;
	archived: boolean;
}

export interface ITimeIntervalDto {
	duration: string;
	end: string;
	start: string;
}
