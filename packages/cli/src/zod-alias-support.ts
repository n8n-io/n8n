import { z } from 'zod';

// Monkey-patch zod to support aliases
declare module 'zod' {
	interface ZodType {
		alias<T extends ZodType>(this: T, aliasName: string): T;
	}
	interface ZodTypeDef {
		_alias: string;
	}
}

z.ZodType.prototype.alias = function <T extends z.ZodType>(this: T, aliasName: string) {
	this._def._alias = aliasName;
	return this;
};
