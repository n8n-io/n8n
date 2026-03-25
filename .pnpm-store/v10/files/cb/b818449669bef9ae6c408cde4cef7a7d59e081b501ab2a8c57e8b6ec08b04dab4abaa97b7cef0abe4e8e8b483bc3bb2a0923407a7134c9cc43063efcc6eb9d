/**
 * Provide hooks used only in jsx/dom
 */
import type { Context } from '../../context';
type FormStatus = {
    pending: false;
    data: null;
    method: null;
    action: null;
} | {
    pending: true;
    data: FormData;
    method: 'get' | 'post';
    action: string | ((formData: FormData) => void | Promise<void>);
};
export declare const FormContext: Context<FormStatus>;
export declare const registerAction: (action: Promise<unknown>) => void;
/**
 * This hook returns the current form status
 * @returns FormStatus
 */
export declare const useFormStatus: () => FormStatus;
/**
 * This hook returns the current state and a function to update the state optimistically
 * The current state is updated optimistically and then reverted to the original state when all actions are resolved
 * @param state
 * @param updateState
 * @returns [T, (action: N) => void]
 */
export declare const useOptimistic: <T, N>(state: T, updateState: (currentState: T, action: N) => T) => [T, (action: N) => void];
/**
 * This hook returns the current state and a function to update the state by form action
 * @param fn
 * @param initialState
 * @param permalink
 * @returns [T, (data: FormData) => void]
 */
export declare const useActionState: <T>(fn: Function, initialState: T, permalink?: string) => [T, Function];
export {};
