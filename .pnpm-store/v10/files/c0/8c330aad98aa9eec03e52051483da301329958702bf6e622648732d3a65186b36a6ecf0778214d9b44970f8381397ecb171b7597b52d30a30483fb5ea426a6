import type { Integration, IntegrationFn } from '@sentry/core';
import type { CanvasManagerInterface, CanvasManagerOptions } from '@sentry-internal/replay';
interface SnapshotOptions {
    skipRequestAnimationFrame?: boolean;
}
interface ReplayCanvasIntegration extends Integration {
    snapshot: (canvasElement?: HTMLCanvasElement, options?: SnapshotOptions) => Promise<void>;
}
interface ReplayCanvasOptions {
    enableManualSnapshot?: boolean;
    maxCanvasSize?: [width: number, height: number];
    quality: 'low' | 'medium' | 'high';
}
type GetCanvasManager = (options: CanvasManagerOptions) => CanvasManagerInterface;
export interface ReplayCanvasIntegrationOptions {
    enableManualSnapshot?: boolean;
    maxCanvasSize?: number;
    recordCanvas: true;
    getCanvasManager: GetCanvasManager;
    sampling: {
        canvas: number;
    };
    dataURLOptions: {
        type: string;
        quality: number;
    };
}
/** Exported only for type safe tests. */
export declare const _replayCanvasIntegration: (options?: Partial<ReplayCanvasOptions>) => {
    name: string;
    getOptions(): ReplayCanvasIntegrationOptions;
    snapshot(canvasElement?: HTMLCanvasElement, options?: SnapshotOptions): Promise<void>;
};
/**
 * Add this in addition to `replayIntegration()` to enable canvas recording.
 */
export declare const replayCanvasIntegration: IntegrationFn<ReplayCanvasIntegration>;
export {};
//# sourceMappingURL=canvas.d.ts.map