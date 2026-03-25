import type { Toggleable } from '../series/cartesian/commonOptions';
import type { ToolbarButton } from './buttonOptions';
export interface AgRangesOptions extends Toggleable {
    buttons?: AgRangesButton[];
}
export interface AgRangesButton extends ToolbarButton {
    /** Timestamp range on which to focus the chart, as either a single start time, a pair of times or a function that returns a pair of times. */
    value: AgRangesButtonValue;
}
export type AgRangesButtonValue = number | AgRangesButtonValuePair | AgRangesButtonValueFunction | undefined;
export type AgRangesButtonValuePair = [Date | number, Date | number];
export type AgRangesButtonValueFunction = (start: Date | number, end: Date | number) => [Date | number, Date | number];
