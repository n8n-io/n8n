/// <reference types="node" />
import { EventEmitter } from 'events';
import { OverloadedParameters } from './overloaded-parameters';
export declare type FirstParameter<T> = T extends [infer R, ...any[]] ? R : never;
export declare type EventListener<F, T extends string | symbol> = F extends [
    T,
    infer R,
    ...any[]
] ? R : never;
export declare type EventParameters<Emitter extends EventEmitter> = OverloadedParameters<Emitter['on']>;
export declare type EventNames<Emitter extends EventEmitter> = FirstParameter<EventParameters<Emitter>>;
export declare type EventListenerParameters<Emitter extends EventEmitter, Event extends EventNames<Emitter>> = WithDefault<Parameters<EventListener<EventParameters<Emitter>, Event>>, unknown[]>;
export declare type WithDefault<T, D> = [T] extends [never] ? D : T;
export interface AbortSignal {
    addEventListener: (name: string, listener: (...args: any[]) => any) => void;
    removeEventListener: (name: string, listener: (...args: any[]) => any) => void;
}
