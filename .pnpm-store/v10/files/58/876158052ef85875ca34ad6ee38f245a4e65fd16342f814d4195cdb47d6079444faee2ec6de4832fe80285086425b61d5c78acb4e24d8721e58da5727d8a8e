export { ComponentType, ComponentProps, ComponentEmit, ComponentExposed, } from './index';
export type ComponentSlots<T> = T extends new (...args: any) => {
    $scopedSlots: infer S;
} ? NonNullable<S> : T extends (props: any, ctx: {
    slots: infer S;
    attrs: any;
    emit: any;
}, ...args: any) => any ? NonNullable<S> : {};
export declare const code: string;
export default code;
