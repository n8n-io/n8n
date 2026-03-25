// https://dev.to/safareli/pick-omit-and-union-types-in-typescript-4nd9
// https://github.com/microsoft/TypeScript/issues/28339#issuecomment-467393437
/**
 * This allows omitting keys from objects inside unions, without merging the individual components of the union.
 */

type Omit_<T, K> = Omit<T, Extract<keyof T, K>>;

export type DistributiveOmit<T, K> = T extends unknown
	? keyof Omit_<T, K> extends never
		? never
		: { [P in keyof Omit_<T, K>]: Omit_<T, K>[P] }
	: never;
