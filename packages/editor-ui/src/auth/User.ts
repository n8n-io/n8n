import decodeJwt from 'jwt-decode';

export type UserDetails = {
	namespace?: string;
	tenantId?: string;
};

export class User {
	sub?: string;
	provider?: string;
	id?: string;
	tenantId?: string;
	token: any; // tslint:disable-line:no-any
	payload: any;  // tslint:disable-line:no-any

	constructor(userDetails: UserDetails, token: any) { // tslint:disable-line:no-any
		if (!token) return;
		try {
			this.payload = decodeJwt(token) as any; // tslint:disable-line:no-any
		} catch (err) {
			console.warn('Invalid token', err);
			return;
		}
		this.token = token;
		this.sub = this.payload.sub as string;
		this.provider = this.sub.split('|')[0];
		this.id = this.sub.split('|')[1];
		if (userDetails.namespace) {
			for (const [k, v] of Object.entries(this.payload[userDetails.namespace] as object)) {
				if (userDetails.tenantId === k) this.tenantId = v;
			}
		}
	}
}
