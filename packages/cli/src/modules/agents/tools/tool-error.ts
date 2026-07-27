export interface ToolErrorOutput {
	error: string;
	errorType: string;
}

function formatToolError(error: unknown): ToolErrorOutput {
	if (error instanceof Error) {
		return { error: error.message, errorType: error.name };
	}

	return { error: String(error), errorType: typeof error };
}

export async function runToolOperation<T>(
	operation: () => Promise<T>,
): Promise<T | ToolErrorOutput> {
	try {
		return await operation();
	} catch (error) {
		return formatToolError(error);
	}
}
