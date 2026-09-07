import type { DropdownMenuAlign, DropdownMenuSide } from './DropdownMenu.types';

const VALID_SIDES: DropdownMenuSide[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: DropdownMenuAlign[] = ['start', 'end', 'center'];

export const isSide = (value: string): value is DropdownMenuSide =>
	VALID_SIDES.includes(value as DropdownMenuSide);
export const isAlign = (value: string): value is DropdownMenuAlign =>
	VALID_ALIGNS.includes(value as DropdownMenuAlign);
