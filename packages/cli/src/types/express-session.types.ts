// types/express-session.d.ts

import 'express-session';

declare module 'express-session' {
	interface SessionData {
		code_verifier?: string;
		user?: any;
		accessToken?: string;
		idToken?: string;
	}
}
