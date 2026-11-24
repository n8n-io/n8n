export type PrincipalTypeV1 = 'person' | 'service';

export interface PrincipalV1 {
	id: string;
	type: PrincipalTypeV1;
	/** Absent for a service account, or when the person has no email. */
	email?: string;
	firstName?: string;
	lastName?: string;
}

export type AuthMethodV1 = 'session-cookie';

/** Who is calling, on whose authority, and how they proved it. Never carries a token. */
export interface SecurityContextV1 {
	subject: PrincipalV1;
	/** Set when the subject's authority is used by someone else. Absent on direct calls. */
	actor?: PrincipalV1;
	authMethod: AuthMethodV1;
}
