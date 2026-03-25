import { AnnotationsMap, CreateObservableOptions } from "../internal";
type NoInfer<T> = [T][T extends any ? 0 : never];
type MakeObservableOptions = Omit<CreateObservableOptions, "proxy">;
export declare function makeObservable<T extends object, AdditionalKeys extends PropertyKey = never>(target: T, annotations?: AnnotationsMap<T, NoInfer<AdditionalKeys>>, options?: MakeObservableOptions): T;
export declare function makeAutoObservable<T extends object, AdditionalKeys extends PropertyKey = never>(target: T, overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>, options?: MakeObservableOptions): T;
export {};
