import type { InjectionKey, MaybeRef } from 'vue';

export const aiActivityStepGroupContext: InjectionKey<MaybeRef<boolean>> = Symbol(
	'aiActivityStepGroupContext',
);
