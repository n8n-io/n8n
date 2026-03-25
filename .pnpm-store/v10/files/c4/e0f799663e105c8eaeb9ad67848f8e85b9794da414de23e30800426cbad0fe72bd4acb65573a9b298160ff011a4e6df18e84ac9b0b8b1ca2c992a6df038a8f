import * as Hooks from 'preact/hooks';
interface FactoryParams {
    hooks: typeof Hooks;
}
interface Props {
    onBeforeScreenshot: () => void;
    onScreenshot: (imageSource: HTMLVideoElement, dpi: number) => void;
    onAfterScreenshot: () => void;
    onError: (error: Error) => void;
}
type UseTakeScreenshot = ({ onBeforeScreenshot, onScreenshot, onAfterScreenshot, onError }: Props) => void;
export declare function useTakeScreenshotFactory({ hooks }: FactoryParams): UseTakeScreenshot;
export {};
//# sourceMappingURL=useTakeScreenshot.d.ts.map
