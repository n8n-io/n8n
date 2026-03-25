import { IDepTreeNode } from "../internal";
export declare function getAtom(thing: any, property?: PropertyKey): IDepTreeNode;
export declare function getAdministration(thing: any, property?: string): any;
export declare function getDebugName(thing: any, property?: string): string;
/**
 * Helper function for initializing observable structures, it applies:
 * 1. allowStateChanges so we don't violate enforceActions.
 * 2. untracked so we don't accidentaly subscribe to anything observable accessed during init in case the observable is created inside derivation.
 * 3. batch to avoid state version updates
 */
export declare function initObservable<T>(cb: () => T): T;
