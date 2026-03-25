import { INode } from '@sentry-internal/rrweb-snapshot';
/** Get the closest interactive parent element, or else return the given element. */
export declare function getClosestInteractive(element: Element): Element;
/**
 * For clicks, we check if the target is inside of a button or link
 * If so, we use this as the target instead
 * This is useful because if you click on the image in <button><img></button>,
 * The target will be the image, not the button, which we don't want here
 */
export declare function getClickTargetNode(event: Event | MouseEvent | Node): Node | INode | null;
/** Get the event target node. */
export declare function getTargetNode(event: Node | {
    target: EventTarget | null;
}): Node | INode | null;
//# sourceMappingURL=domUtils.d.ts.map
