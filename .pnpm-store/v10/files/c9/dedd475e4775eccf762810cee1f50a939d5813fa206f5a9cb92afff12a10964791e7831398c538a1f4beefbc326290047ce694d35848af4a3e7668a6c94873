/**
 * Created by user on 2020/6/6.
 */

export type IOptions<T> = {

	checker?(element: T[keyof T], array: T[keyof T], arr_new?: T, arr_old?: T): boolean,
	checker?<R>(element: R[keyof R], array: R[keyof R], arr_new?: R, arr_old?: R): boolean,

	overwrite?: boolean,

	filter?(v: T[keyof T]): boolean,
	filter?<R>(v: R[keyof R]): boolean,

	removeFromFirst?: boolean,
};
