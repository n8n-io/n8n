/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Endpoint } from "./protocol";
export interface NodeEndpoint {
    postMessage(message: any, transfer?: any[]): void;
    on(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
    off(type: string, listener: EventListenerOrEventListenerObject, options?: {}): void;
    start?: () => void;
}
export default function nodeEndpoint(nep: NodeEndpoint): Endpoint;
