import clsx, { type ClassValue } from 'clsx';

/** NOTE (@heymynameisrob): This function is used to merge class names */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}
