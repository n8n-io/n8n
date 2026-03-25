import type { VNode } from 'vue';
import type { NotificationOptions, Notify } from './notification';
/**
 * This function gets called when user click `x` button or press `esc` or the time reached its limitation.
 * Emitted by transition@before-leave event so that we can fetch the current notification.offsetHeight, if this was called
 * by @after-leave the DOM element will be removed from the page thus we can no longer fetch the offsetHeight.
 * @param {String} id notification id to be closed
 * @param {Position} position the positioning strategy
 * @param {Function} userOnClose the callback called when close passed by user
 */
export declare function close(id: string, position: NotificationOptions['position'], userOnClose?: (vm: VNode) => void): void;
export declare function closeAll(): void;
declare const _default: Notify;
export default _default;
