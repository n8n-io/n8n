import { TinyColor } from './index.js';
export interface RandomOptions {
    seed?: number;
    hue?: number | string | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'monochrome';
    luminosity?: 'random' | 'bright' | 'dark' | 'light';
    alpha?: number;
}
export interface RandomCountOptions extends RandomOptions {
    count?: number | null;
}
export declare function random(options?: RandomOptions): TinyColor;
export declare function random(options?: RandomCountOptions): TinyColor[];
/**
 * @hidden
 */
export interface ColorBound {
    name: string;
    hueRange: [number, number] | null;
    lowerBounds: Array<[number, number]>;
}
/**
 * @hidden
 */
export declare const bounds: ColorBound[];
