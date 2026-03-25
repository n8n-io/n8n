declare const flagSymbol: unique symbol;

declare function arg<T extends arg.Spec>(spec: T, options?: arg.Options): arg.Result<T>;

declare namespace arg {
	export function flag<T>(fn: T): T & { [flagSymbol]: true };

	export const COUNT: Handler<number> & { [flagSymbol]: true };

	export type Handler <T = any> = (value: string, name: string, previousValue?: T) => T;

	export interface Spec {
		[key: string]: string | Handler | [Handler];
	}

	export type Result<T extends Spec> = { _: string[] } & {
		[K in keyof T]?: T[K] extends Handler
			? ReturnType<T[K]>
			: T[K] extends [Handler]
			? Array<ReturnType<T[K][0]>>
			: never
	};

	export interface Options {
		argv?: string[];
		permissive?: boolean;
		stopAtPositional?: boolean;
	}
}

export = arg;
