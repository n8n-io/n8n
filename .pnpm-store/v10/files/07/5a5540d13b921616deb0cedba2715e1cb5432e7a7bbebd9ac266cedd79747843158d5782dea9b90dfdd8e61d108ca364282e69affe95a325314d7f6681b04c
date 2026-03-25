import { ObservableObjectAdministration } from "../internal";
export declare const enum MakeResult {
    Cancel = 0,
    Break = 1,
    Continue = 2
}
export type Annotation = {
    annotationType_: string;
    make_(adm: ObservableObjectAdministration, key: PropertyKey, descriptor: PropertyDescriptor, source: object): MakeResult;
    extend_(adm: ObservableObjectAdministration, key: PropertyKey, descriptor: PropertyDescriptor, proxyTrap: boolean): boolean | null;
    decorate_20223_(value: any, context: DecoratorContext): any;
    options_?: any;
};
export type AnnotationMapEntry = Annotation | true | false;
export type AnnotationsMap<T, AdditionalFields extends PropertyKey> = {
    [P in Exclude<keyof T, "toString">]?: AnnotationMapEntry;
} & Record<AdditionalFields, AnnotationMapEntry>;
export declare function isAnnotation(thing: any): boolean;
export declare function isAnnotationMapEntry(thing: any): boolean;
