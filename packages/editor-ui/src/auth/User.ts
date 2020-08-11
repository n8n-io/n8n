import decodeJwt from 'jwt-decode';


export interface UserInfo {
  readonly token: any; // tslint:disable-line:no-any
  readonly payload: any; // tslint:disable-line:no-any
  readonly sub: string;
  readonly provider: string;
  readonly id: string;
  readonly tenantId?: string;
}

export class User {
	constructor(readonly info?: UserInfo) { }

	static forToken(token: any, namespace?: string, tenantId?: string): User { // tslint:disable-line:no-any
		if (!token) return new User();
		let payload;
		try {
			payload = decodeJwt(token) as any; // tslint:disable-line:no-any
		} catch (err) {
			console.warn('Invalid token', err);
			return new User();
		}
		const sub = payload.sub as string;
		const provider = sub.split('|')[0];
		const id = sub.split('|')[1];
		let tenant;
		if (namespace) {
			for (const [k, v] of Object.entries(payload[namespace] as object)) {
				if (tenantId === k) tenant = v;
			}
		}
		return new User({
			token,
			payload,
			sub,
			provider,
			id,
			tenantId: tenant,
		});
	}
}
