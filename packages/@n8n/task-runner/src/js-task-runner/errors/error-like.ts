export interface ErrorLike {
	message: string;
	stack?: string;
}

export function isErrorLike(value: unknown): value is ErrorLike {
	if (typeof value !== 'object' || value === null) return false;

	const errorLike = value as ErrorLike;

	return typeof errorLike.message === 'string';
}
