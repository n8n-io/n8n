type ComponentType<T> = any;
declare const hType: any;
import { FeedbackInternalOptions, FeedbackModalIntegration } from '@sentry/core';
// replaced import from preact
import * as Hooks from 'preact/hooks';
interface FactoryParams {
    h: typeof hType;
    hooks: typeof Hooks;
    /**
     * A ref to a Canvas Element that serves as our "value" or image output.
     */
    outputBuffer: HTMLCanvasElement;
    /**
     * A reference to the whole dialog (the parent of this component) so that we
     * can show/hide it and take a clean screenshot of the webpage.
     */
    dialog: ReturnType<FeedbackModalIntegration['createDialog']>;
    /**
     * The whole options object.
     *
     * Needed to set nonce and id values for editor specific styles
     */
    options: FeedbackInternalOptions;
}
interface Props {
    onError: (error: Error) => void;
}
export declare function ScreenshotEditorFactory({ h, hooks, outputBuffer, dialog, options, }: FactoryParams): ComponentType<Props>;
export {};
//# sourceMappingURL=ScreenshotEditor.d.ts.map
