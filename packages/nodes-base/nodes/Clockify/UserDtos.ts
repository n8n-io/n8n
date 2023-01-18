import { IDataObject } from 'n8n-workflow';
import { IMembershipDto } from './CommonDtos';

enum UserStatusEnum {
	ACTIVE,
	PENDING_EMAIL_VERIFICATION,
	DELETED,
}

export interface IUserDto {
	activeWorkspace: string;
	defaultWorkspace: string;
	email: string;
	id: string;
	memberships: IMembershipDto[];
	name: string;
	profilePicture: string;
	settings: IDataObject;
	status: UserStatusEnum;
}
