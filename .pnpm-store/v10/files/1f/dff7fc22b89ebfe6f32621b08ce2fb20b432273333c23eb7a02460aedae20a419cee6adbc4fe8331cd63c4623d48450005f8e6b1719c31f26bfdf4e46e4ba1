import { Subscription } from '../Subscription';
interface AnimationFrameProvider {
    schedule(callback: FrameRequestCallback): Subscription;
    requestAnimationFrame: typeof requestAnimationFrame;
    cancelAnimationFrame: typeof cancelAnimationFrame;
    delegate: {
        requestAnimationFrame: typeof requestAnimationFrame;
        cancelAnimationFrame: typeof cancelAnimationFrame;
    } | undefined;
}
export declare const animationFrameProvider: AnimationFrameProvider;
export {};
//# sourceMappingURL=animationFrameProvider.d.ts.map