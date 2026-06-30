type SafeContextValue = string | number | boolean | undefined;

export type AwsSecretsManagerLogContext = {
	region?: string;
	authMethod?: string;
	secretName?: string;
	errorCode?: SafeContextValue;
	statusCode?: number;
};

type AwsSdkErrorShape = {
	name?: string;
	Code?: string;
	code?: string | number;
	$metadata?: {
		httpStatusCode?: number;
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function getAwsErrorCode(error: unknown): string | number | undefined {
	if (isRecord(error)) {
		if ('Code' in error && typeof error.Code === 'string') {
			return error.Code;
		}

		if ('code' in error) {
			const { code } = error;
			if (typeof code === 'string' || typeof code === 'number') {
				return code;
			}
		}
	}

	if (error instanceof Error) {
		return error.name;
	}

	if (isRecord(error) && typeof error.name === 'string') {
		return error.name;
	}

	return undefined;
}

export function awsErrorContext(
	error: unknown,
): Pick<AwsSecretsManagerLogContext, 'errorCode' | 'statusCode'> {
	const context: Pick<AwsSecretsManagerLogContext, 'errorCode' | 'statusCode'> = {};

	const errorCode = getAwsErrorCode(error);
	if (errorCode !== undefined) {
		context.errorCode = errorCode;
	}

	if (isRecord(error) && '$metadata' in error) {
		const metadata = (error as AwsSdkErrorShape).$metadata;
		if (metadata?.httpStatusCode !== undefined) {
			context.statusCode = metadata.httpStatusCode;
		}
	}

	return context;
}
