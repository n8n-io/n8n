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
