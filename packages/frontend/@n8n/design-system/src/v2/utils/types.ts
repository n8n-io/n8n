import type { AcceptableValue as _AcceptableValue } from 'reka-ui';
import type { VNode } from 'vue';

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] | undefined;
};

export type DynamicSlotsKeys<
	Name extends string | undefined,
	Suffix extends string | undefined = undefined,
> = Name extends string ? (Suffix extends string ? Name | `${Name}-${Suffix}` : Name) : never;
export type DynamicSlots<
	T extends { slot?: string },
	Suffix extends string | undefined = undefined,
	ExtraProps extends object = {},
> = {
	[K in DynamicSlotsKeys<T['slot'], Suffix>]: (
		props: {
			item: Extract<T, { slot: K extends `${infer Base}-${Suffix}` ? Base : K }>;
		} & ExtraProps,
	) => unknown;
};

export type GetObjectField<MaybeObject, Key extends string> = MaybeObject extends Record<
	string,
	unknown
>
	? MaybeObject[Key]
	: never;

// NOTE: `Boolean` could potentially cause casting issues, but have been safe so far.
// https://vuejs.org/guide/components/props.html#boolean-casting
export type AcceptableValue = Exclude<_AcceptableValue, Record<string, unknown>> | boolean;
export type ArrayOrNested<T> = T[] | T[][];
export type NestedItem<T> = T extends Array<infer I> ? NestedItem<I> : T;
type AllKeys<T> = T extends unknown ? keyof T : never;
type NonCommonKeys<T extends object> = Exclude<AllKeys<T>, keyof T>;
type PickTypeOf<T, K extends string | number | symbol> = K extends AllKeys<T>
	? T extends { [k in K]?: unknown }
		? T[K]
		: undefined
	: never;
export type MergeTypes<T extends object> = {
	[k in keyof T]: PickTypeOf<T, k>;
} & {
	[k in NonCommonKeys<T>]?: PickTypeOf<T, k>;
};

type DotPathKeys<T> = T extends unknown[]
	? never
	: T extends object
		? {
				[K in keyof T & string]: T[K] extends Record<string, unknown>
					? K | `${K}.${DotPathKeys<T[K]>}`
					: K;
			}[keyof T & string]
		: never;

type DotPathValue<
	T,
	P extends DotPathKeys<T> | (string & {}),
> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? DotPathValue<T[K], Rest>
		: never
	: P extends keyof T
		? T[P]
		: never;

export type GetItemKeys<I> =
	| keyof Extract<NestedItem<I>, object>
	| DotPathKeys<Extract<NestedItem<I>, object>>;

export type GetItemValue<
	I,
	VK extends GetItemKeys<I> | undefined,
	T extends NestedItem<I> = NestedItem<I>,
> = T extends object
	? VK extends undefined
		? T
		: VK extends DotPathKeys<T>
			? DotPathValue<T, VK>
			: never
	: T;

export type GetModelValue<
	T,
	VK extends GetItemKeys<T> | undefined,
	M extends boolean,
> = M extends true ? Array<GetItemValue<T, VK>> : GetItemValue<T, VK>;

export type GetModelValueEmits<T, VK extends GetItemKeys<T> | undefined, M extends boolean> = {
	/** Event handler called when the value changes. */
	'update:modelValue': [value: GetModelValue<T, VK, M>];
};

export type StringOrVNode = string | VNode | (() => VNode);

export type EmitsToProps<T> = {
	[K in keyof T as `on${Capitalize<string & K>}`]: T[K] extends [...args: infer Args]
		? (...args: Args) => void
		: never;
};
