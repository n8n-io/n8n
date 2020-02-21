import { IMembershipDto } from './CommonDtos';

enum UserStatusEnum {
	ACTIVE, PENDING_EMAIL_VERIFICATION, DELETED
}

interface IUserSettingsDto {
}

export interface ICurrentUserDto {
	activeWorkspace: string;
	defaultWorkspace: string;
	email: string;
	id: string;
	memberships:  IMembershipDto [];
	name: string;
	profilePicture: string;
	settings: IUserSettingsDto;
	status: UserStatusEnum;
}
