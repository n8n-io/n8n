import type { InjectionKey, Ref } from 'vue';

export type ParameterFieldLayout = 'stacked' | 'horizontal' | 'auto';

export const parameterFieldLayoutKey: InjectionKey<Readonly<Ref<ParameterFieldLayout>>> =
	Symbol('parameter-field-layout');
