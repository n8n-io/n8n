export class BaseCanvasFactory {
    constructor({ enableHWA }: {
        enableHWA?: boolean | undefined;
    });
    create(width: any, height: any): {
        canvas: void;
        context: any;
    };
    reset(canvasAndContext: any, width: any, height: any): void;
    destroy(canvasAndContext: any): void;
    /**
     * @ignore
     */
    _createCanvas(width: any, height: any): void;
    #private;
}
export class DOMCanvasFactory extends BaseCanvasFactory {
    constructor({ ownerDocument, enableHWA }: {
        ownerDocument?: Document | undefined;
        enableHWA?: boolean | undefined;
    });
    _document: Document;
    /**
     * @ignore
     */
    _createCanvas(width: any, height: any): HTMLCanvasElement;
}
