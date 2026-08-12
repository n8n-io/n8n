export interface ICreateMemberBody {
	base: {
		email?: string;
		first_name?: string;
		last_name?: string;
		cellphone?: string;
		birth_date?: string;
		subscription_status?: string;
	};
	extra: [];
}
