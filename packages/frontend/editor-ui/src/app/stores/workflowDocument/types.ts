export const CHANGE_ACTION = {
	ADD: 'add',
	UPDATE: 'update',
	DELETE: 'delete',
} as const;

export type ChangeAction = (typeof CHANGE_ACTION)[keyof typeof CHANGE_ACTION];

/** Base type all composable change events must extend */
export interface ChangeEvent<T = unknown> {
	action: ChangeAction;
	payload: T;
}
