declare const assignmentCompatibilityHack: unique symbol;
export declare type MatchingKeys<TRecord, TMatch, K extends keyof TRecord = keyof TRecord> = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;
export declare type VoidKeys<Record> = MatchingKeys<Record, void>;
export interface TypeRecord<T, U, V> {
    ' _emitterType'?: T;
    ' _eventsType'?: U;
    ' _emitType'?: V;
}
export declare type ReturnTypeOfMethod<T> = T extends (...args: any[]) => any ? ReturnType<T> : void;
export declare type ReturnTypeOfMethodIfExists<T, S extends string> = S extends keyof T ? ReturnTypeOfMethod<T[S]> : void;
export declare type InnerEEMethodReturnType<T, TValue, FValue> = T extends (...args: any[]) => any ? ReturnType<T> extends void | undefined ? FValue : TValue : FValue;
export declare type EEMethodReturnType<T, S extends string, TValue, FValue = void> = S extends keyof T ? InnerEEMethodReturnType<T[S], TValue, FValue> : FValue;
declare type ListenerType<T> = [T] extends [(...args: infer U) => any] ? U : [T] extends [void] ? [] : [T];
export declare type OverriddenMethods<TEmitter, TEventRecord, TEmitRecord = TEventRecord> = {
    on<P extends keyof TEventRecord, T>(this: T, event: P, listener: (...args: ListenerType<TEventRecord[P]>) => void): EEMethodReturnType<TEmitter, 'on', T>;
    on(event: typeof assignmentCompatibilityHack, listener: (...args: any[]) => any): void;
    addListener<P extends keyof TEventRecord, T>(this: T, event: P, listener: (...args: ListenerType<TEventRecord[P]>) => void): EEMethodReturnType<TEmitter, 'addListener', T>;
    addListener(event: typeof assignmentCompatibilityHack, listener: (...args: any[]) => any): void;
    addEventListener<P extends keyof TEventRecord, T>(this: T, event: P, listener: (...args: ListenerType<TEventRecord[P]>) => void): EEMethodReturnType<TEmitter, 'addEventListener', T>;
    addEventListener(event: typeof assignmentCompatibilityHack, listener: (...args: any[]) => any): void;
    removeListener<P extends keyof TEventRecord, T>(this: T, event: P, listener: (...args: any[]) => any): EEMethodReturnType<TEmitter, 'removeListener', T>;
    removeListener(event: typeof assignmentCompatibilityHack, listener: (...args: any[]) => any): void;
    removeEventListener<P extends keyof TEventRecord, T>(this: T, event: P, listener: (...args: any[]) => any): EEMethodReturnType<TEmitter, 'removeEventListener', T>;
    removeEventListener(event: typeof assignmentCompatibilityHack, listener: (...args: any[]) => any): void;
    once<P extends keyof TEventRecord, T>(this: T, event: P, listener: (...args: ListenerType<TEventRecord[P]>) => void): EEMethodReturnType<TEmitter, 'once', T>;
    once(event: typeof assignmentCompatibilityHack, listener: (...args: any[]) => any): void;
    emit<P extends keyof TEmitRecord, T>(this: T, event: P, ...args: ListenerType<TEmitRecord[P]>): EEMethodReturnType<TEmitter, 'emit', T>;
    emit(event: typeof assignmentCompatibilityHack, ...args: any[]): void;
};
export declare type OverriddenKeys = keyof OverriddenMethods<any, any, any>;
export declare type StrictEventEmitter<TEmitterType, TEventRecord, TEmitRecord = TEventRecord, UnneededMethods extends Exclude<OverriddenKeys, keyof TEmitterType> = Exclude<OverriddenKeys, keyof TEmitterType>, NeededMethods extends Exclude<OverriddenKeys, UnneededMethods> = Exclude<OverriddenKeys, UnneededMethods>> = TypeRecord<TEmitterType, TEventRecord, TEmitRecord> & Pick<TEmitterType, Exclude<keyof TEmitterType, OverriddenKeys>> & Pick<OverriddenMethods<TEmitterType, TEventRecord, TEmitRecord>, NeededMethods>;
export default StrictEventEmitter;
export declare type NoUndefined<T> = T extends undefined ? never : T;
export declare type StrictBroadcast<TEmitter extends TypeRecord<any, any, any>, TEmitRecord extends NoUndefined<TEmitter[' _emitType']> = NoUndefined<TEmitter[' _emitType']>, VK extends VoidKeys<TEmitRecord> = VoidKeys<TEmitRecord>, NVK extends Exclude<keyof TEmitRecord, VK> = Exclude<keyof TEmitRecord, VK>> = {
    <E extends NVK>(event: E, request: TEmitRecord[E]): any;
    <E extends VK>(event: E): any;
};
export declare type EventNames<TEmitter extends TypeRecord<any, any, any>, TEventRecord extends NoUndefined<TEmitter[' _eventsType']> = NoUndefined<TEmitter[' _eventsType']>, TEmitRecord extends NoUndefined<TEmitter[' _emitType']> = NoUndefined<TEmitter[' _emitType']>> = keyof TEmitRecord | keyof TEventRecord;
export declare type OnEventNames<TEmitter extends TypeRecord<any, any, any>, TEventRecord extends NoUndefined<TEmitter[' _eventsType']> = NoUndefined<TEmitter[' _eventsType']>, TEmitRecord extends NoUndefined<TEmitter[' _emitType']> = NoUndefined<TEmitter[' _emitType']>> = keyof TEventRecord;
export declare type EmitEventNames<TEmitter extends TypeRecord<any, any, any>, TEventRecord extends NoUndefined<TEmitter[' _eventsType']> = NoUndefined<TEmitter[' _eventsType']>, TEmitRecord extends NoUndefined<TEmitter[' _emitType']> = NoUndefined<TEmitter[' _emitType']>> = keyof TEmitRecord;
