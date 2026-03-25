import type { JSX } from '../base';
type UpdateStateFunction<T> = (newState: T | ((currentState: T) => T)) => void;
export declare const STASH_EFFECT = 1;
export type EffectData = [
    readonly unknown[] | undefined,
    // deps
    (() => void | (() => void)) | undefined,
    // layout effect
    (() => void) | undefined,
    // cleanup
    (() => void) | undefined,
    // effect
    (() => void) | undefined
];
export declare const startViewTransition: (callback: () => void) => void;
export declare const useViewTransition: () => [boolean, (callback: () => void) => void];
export declare const startTransition: (callback: () => void) => void;
export declare const useTransition: () => [boolean, (callback: () => void | Promise<void>) => void];
type UseDeferredValue = <T>(value: T, initialValue?: T) => T;
export declare const useDeferredValue: UseDeferredValue;
type UseStateType = {
    <T>(initialState: T | (() => T)): [T, UpdateStateFunction<T>];
    <T = undefined>(): [T | undefined, UpdateStateFunction<T | undefined>];
};
export declare const useState: UseStateType;
export declare const useReducer: <T, A>(reducer: (state: T, action: A) => T, initialArg: T, init?: (initialState: T) => T) => [T, (action: A) => void];
export declare const useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
export declare const useLayoutEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
export declare const useInsertionEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
export declare const useCallback: <T extends Function>(callback: T, deps: readonly unknown[]) => T;
export type RefObject<T> = {
    current: T | null;
};
export declare const useRef: <T>(initialValue: T | null) => RefObject<T>;
export declare const use: <T>(promise: Promise<T>) => T;
export declare const useMemo: <T>(factory: () => T, deps: readonly unknown[]) => T;
export declare const useId: () => string;
export declare const useDebugValue: (_value: unknown, _formatter?: (value: unknown) => string) => void;
export declare const createRef: <T>() => RefObject<T>;
export declare const forwardRef: <T, P = {}>(Component: (props: P, ref?: RefObject<T>) => JSX.Element) => ((props: P & {
    ref?: RefObject<T>;
}) => JSX.Element);
export declare const useImperativeHandle: <T>(ref: RefObject<T>, createHandle: () => T, deps: readonly unknown[]) => void;
export declare const useSyncExternalStore: <T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T) => T;
export {};
