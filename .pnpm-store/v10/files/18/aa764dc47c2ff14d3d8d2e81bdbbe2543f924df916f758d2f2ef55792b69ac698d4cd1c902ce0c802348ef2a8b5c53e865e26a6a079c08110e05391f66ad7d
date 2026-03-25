import type { OptionsGeneric, Modifier, Instance, VirtualElement } from "./types";
import detectOverflow from "./utils/detectOverflow";
declare type PopperGeneratorArgs = {
    defaultModifiers?: Array<Modifier<any, any>>;
    defaultOptions?: Partial<OptionsGeneric<any>>;
};
export declare function popperGenerator(generatorOptions?: PopperGeneratorArgs): <TModifier extends Partial<Modifier<any, any>>>(reference: Element | VirtualElement, popper: HTMLElement, options?: Partial<OptionsGeneric<TModifier>>) => Instance;
export declare const createPopper: <TModifier extends Partial<Modifier<any, any>>>(reference: Element | VirtualElement, popper: HTMLElement, options?: Partial<OptionsGeneric<TModifier>>) => Instance;
export { detectOverflow };
