import type { SafeContextValue } from '../../errors/secrets-provider-errors';

export type GcpSecretsManagerLogContext = {
	projectId?: string;
	secretName?: string;
	errorCode?: SafeContextValue;
	failedCount?: number;
	errorCodes?: Record<string, number>;
	sampleSecretNames?: string[];
};

export function getGcpErrorCode(error: unknown): number | string | undefined {
	if (typeof error === 'object' && error !== null && 'code' in error) {
		const { code } = error;
		if (typeof code === 'number' || typeof code === 'string') {
			return code;
		}
	}

	if (error instanceof Error) {
		return error.name;
	}

	return undefined;
}

export function gcpErrorContext(error: unknown): Pick<GcpSecretsManagerLogContext, 'errorCode'> {
	const errorCode = getGcpErrorCode(error);
	return errorCode !== undefined ? { errorCode } : {};
}
