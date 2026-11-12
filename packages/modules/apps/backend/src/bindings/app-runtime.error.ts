import type {
	AppRuntimeCredentialConnection,
	AppRuntimeErrorBody,
	AppRuntimeErrorCode,
} from '@n8n/api-types';
import type { z } from 'zod';

/** A refusal of an app runtime call. Its message is shown to app visitors. */
export class AppRuntimeError extends Error {
	constructor(
		readonly status: number,
		readonly code: AppRuntimeErrorCode,
		message: string,
		readonly issues?: AppRuntimeErrorBody['issues'],
		readonly credentials?: AppRuntimeCredentialConnection[],
	) {
		super(message);
		this.name = 'AppRuntimeError';
	}

	toBody(): AppRuntimeErrorBody {
		return {
			code: this.code,
			message: this.message,
			...(this.issues !== undefined ? { issues: this.issues } : {}),
			...(this.credentials !== undefined ? { credentials: this.credentials } : {}),
		};
	}

	/** Keeps only the path and code of each issue, so private schema details stay on the server. */
	static invalidInput(message: string, error?: z.ZodError) {
		return new AppRuntimeError(
			400,
			'invalid_input',
			message,
			error?.issues.map(({ path, code }) => ({ path: path.map(String), code })),
		);
	}

	static credentialsRequired(credentials: AppRuntimeCredentialConnection[]) {
		return new AppRuntimeError(
			428,
			'credentials_required',
			'Connect your accounts to run this workflow.',
			undefined,
			credentials,
		);
	}
}
