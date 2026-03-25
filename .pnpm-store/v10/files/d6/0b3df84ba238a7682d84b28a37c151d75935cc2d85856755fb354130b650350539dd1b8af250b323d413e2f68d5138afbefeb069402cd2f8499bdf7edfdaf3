export interface RTLAdapter {
    x(x: number): number;
    setWidth(w: number): void;
    textAlign(align: 'center' | 'left' | 'right'): 'center' | 'left' | 'right';
    xPlus(x: number, value: number): number;
    leftForLtr(x: number, itemWidth: number): number;
}
export declare function getRtlAdapter(rtl: boolean, rectX: number, width: number): RTLAdapter;
export declare function overrideTextDirection(ctx: CanvasRenderingContext2D, direction: 'ltr' | 'rtl'): void;
export declare function restoreTextDirection(ctx: CanvasRenderingContext2D, original?: [string, string]): void;
