/**
 * Manage the SVGs drawn on top of the page canvas.
 * It's important to have them directly on top of the canvas because we want to
 * be able to use mix-blend-mode for some of them.
 */
export class DrawLayer {
    static "__#33@#id": number;
    static get _svgFactory(): any;
    static "__#33@#setBox"(element: any, [x, y, width, height]: [any, any, any, any]): void;
    constructor({ pageIndex }: {
        pageIndex: any;
    });
    pageIndex: any;
    setParent(parent: any): void;
    draw(properties: any, isPathUpdatable?: boolean, hasClip?: boolean): {
        id: number;
        clipPathId: string;
    };
    drawOutline(properties: any, mustRemoveSelfIntersections: any): number;
    finalizeDraw(id: any, properties: any): void;
    updateProperties(elementOrId: any, properties: any): void;
    updateParent(id: any, layer: any): void;
    remove(id: any): void;
    destroy(): void;
    #private;
}
