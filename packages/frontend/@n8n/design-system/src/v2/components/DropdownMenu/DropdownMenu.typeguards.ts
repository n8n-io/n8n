import type { Align, Side } from './DropdownMenu.types';

const VALID_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: Align[] = ['start', 'end', 'center'];

export const isSide = (value: string): value is Side => VALID_SIDES.includes(value as Side);
export const isAlign = (value: string): value is Align => VALID_ALIGNS.includes(value as Align);
