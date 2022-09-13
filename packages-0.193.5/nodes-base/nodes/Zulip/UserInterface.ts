export interface IUser {
	client_gravatar?: boolean;
	include_custom_profile_fields?: boolean;
	full_name?: string;
	is_admin?: boolean;
	is_guest?: boolean;
	profile_data?: [{}];
	email?: string;
	password?: string;
	short_name?: string;
	role?: number;
}
