export interface PointerCapture {
    eElement: HTMLElement | null;
    pointerId: number;
    onLost: ((event: PointerEvent) => void) | null;
}
export declare const capturePointer: (eElement: HTMLElement, mouseEvent: Event | Touch) => PointerCapture | null;
export declare const releasePointerCapture: (capture: PointerCapture | null) => void;
