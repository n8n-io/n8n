import { BeanStub } from '../context/beanStub';
import type { Context } from '../context/context';
/**
 * An EmptyBean can be used to manage the lifecycle of event handlers that are tied to a component instead of a controller.
 * Used in React to avoid duplicating listeners and setup logic while React is running in StrictMode where setComp will be called multiple times.
 * This is only required for the Components where the ctrl is managed by AG Grid and passed into the React component.
 * Both React and the Ctrl can decide to destroy the EmptyBean which will clean up listeners setup against it.
 */
export declare class EmptyBean extends BeanStub {
}
/**
 * Sets up the logic for managing the lifecycle of a compBean against a ctrl so that we always cleanup
 * our listeners and destroy the compBean when the ctrl is destroyed no matter which is destroyed first.
 * Closely related to React StrictMode as the compBean is provided from React so it can double render
 * and correctly cleanup listeners from the first render.
 * @param ctrl Ctrl that has setComp called against it
 * @param ctx  Context to use to destroy the compBean
 * @param compBean Optional compBean to use, if not provided, the ctrl will be used
 * @returns The compBean if provided, otherwise the ctrl
 */
export declare function setupCompBean(ctrl: BeanStub<any>, ctx: Context, compBean: BeanStub<any> | undefined): BeanStub<any>;
