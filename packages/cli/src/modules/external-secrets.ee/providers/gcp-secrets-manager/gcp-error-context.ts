type SafeContextValue = string | number | boolean | undefined;

export type GcpSecretsManagerLogContext = {
	projectId?: string;
	secretName?: string;
	errorCode?: SafeContextValue;
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
