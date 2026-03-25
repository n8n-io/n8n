import { COLOR } from '../models/common';
export type ColorMap = {
    [key in COLOR]?: string;
};
export declare const DEFAULT_COLOR_MAP: ColorMap;
export default class ColoredConsoleLine {
    text: string;
    colorMap: ColorMap;
    constructor(colorMap?: ColorMap);
    addCharsWithColor(color: COLOR, text: string): void;
    renderConsole(): string;
}
