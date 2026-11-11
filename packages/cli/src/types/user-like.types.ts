/** The user fields an event or a policy actor carries. Only `id` is guaranteed. */
export type UserLike = {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	role?: {
		slug: string;
	};
};
