import type { ReusableObject, TestContext, OnSuccessObject, OnFailureObject, Parameter } from '../../types';
type ComponentType<T extends ReusableObject> = T['reference'] extends `$components.successActions${string}` ? OnSuccessObject : T['reference'] extends `$components.failureActions${string}` ? OnFailureObject : T['reference'] extends `$components.parameters${string}` ? Parameter : never;
export declare function resolveReusableObjectReference<T extends ReusableObject>(reusableObject: T, ctx: TestContext): ComponentType<T>;
export {};
//# sourceMappingURL=resolve-reusable-object-reference.d.ts.map