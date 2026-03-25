/// <reference types="node" />
import { EventEmitter } from 'events';
import { EventNames, EventListenerParameters, AbortSignal } from './types';
export interface OnceOptions {
    signal?: AbortSignal;
}
export default function once<Emitter extends EventEmitter, Event extends EventNames<Emitter>>(emitter: Emitter, name: Event, { signal }?: OnceOptions): Promise<EventListenerParameters<Emitter, Event>>;
