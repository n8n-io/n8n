"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.code = void 0;
exports.code = `
export type ComponentType<T> =
	T extends new (...args: any) => {} ? 1 :
	T extends (...args: any) => any ? 2 :
	0;

export type ComponentProps<T> =
	T extends new (...args: any) => { $props: infer P; } ? NonNullable<P> :
	T extends (props: infer P, ...args: any) => any ? P :
	{};

export type ComponentSlots<T> =
	T extends new (...args: any) => { $slots: infer S; } ? NonNullable<S> :
	T extends (props: any, ctx: { slots: infer S; attrs: any; emit: any; }, ...args: any) => any ? NonNullable<S> :
	{};

export type ComponentEmit<T> =
	T extends new (...args: any) => { $emit: infer E; } ? NonNullable<E> :
	T extends (props: any, ctx: { slots: any; attrs: any; emit: infer E; }, ...args: any) => any ? NonNullable<E> :
	{};

export type ComponentExposed<T> =
	T extends new (...args: any) => infer E ? E :
	T extends (props: any, ctx: { expose(exposed: infer E): any; }, ...args: any) => any ? NonNullable<E> :
	{};
`.trim();
exports.default = exports.code;
//# sourceMappingURL=index.js.map