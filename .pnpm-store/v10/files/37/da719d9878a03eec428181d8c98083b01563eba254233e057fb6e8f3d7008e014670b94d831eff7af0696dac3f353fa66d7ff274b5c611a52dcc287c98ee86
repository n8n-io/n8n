import type { Breadcrumb } from '@sentry/core';
import type { HistoryData, MemoryData, NavigationData, NetworkRequestData, PaintData, ResourceData, WebVitalData } from './performance';
import type { ReplayEventTypeCustom } from './rrweb';
type AnyRecord = Record<string, any>;
interface ReplayBaseBreadcrumbFrame {
    timestamp: number;
    /**
     * For compatibility reasons
     */
    type: string;
    category: string;
    data?: AnyRecord;
    message?: string;
}
interface ReplayBaseDomFrameData {
    nodeId?: number;
    node?: {
        id: number;
        tagName: string;
        textContent: string;
        attributes: AnyRecord;
    };
}
interface ReplayConsoleFrameData {
    logger: string;
    arguments?: unknown[];
}
interface ReplayConsoleFrame extends ReplayBaseBreadcrumbFrame {
    category: 'console';
    level: Breadcrumb['level'];
    message: string;
    data: ReplayConsoleFrameData;
}
type ReplayClickFrameData = ReplayBaseDomFrameData;
interface ReplayClickFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.click';
    message: string;
    data: ReplayClickFrameData;
}
interface ReplayInputFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.input';
    message: string;
}
interface ReplayMutationFrameData {
    count: number;
    limit: boolean;
}
interface ReplayMutationFrame extends ReplayBaseBreadcrumbFrame {
    category: 'replay.mutations';
    data: ReplayMutationFrameData;
}
interface ReplayHydrationErrorFrameData {
    url: string;
}
interface ReplayHydrationErrorFrame extends ReplayBaseBreadcrumbFrame {
    category: 'replay.hydrate-error';
    data: ReplayHydrationErrorFrameData;
}
interface ReplayKeyboardEventFrameData extends ReplayBaseDomFrameData {
    metaKey: boolean;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    key: string;
}
interface ReplayKeyboardEventFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.keyDown';
    data: ReplayKeyboardEventFrameData;
}
interface ReplayBlurFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.blur';
}
interface ReplayFocusFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.focus';
}
interface ReplaySlowClickFrameData extends ReplayClickFrameData {
    url: string;
    route?: string;
    timeAfterClickMs: number;
    endReason: string;
    clickCount?: number;
}
export interface ReplaySlowClickFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.slowClickDetected';
    data: ReplaySlowClickFrameData;
}
interface ReplayMultiClickFrameData extends ReplayClickFrameData {
    url: string;
    route?: string;
    clickCount: number;
    metric: true;
}
export interface ReplayMultiClickFrame extends ReplayBaseBreadcrumbFrame {
    category: 'ui.multiClick';
    data: ReplayMultiClickFrameData;
}
interface ReplayOptionFrame {
    blockAllMedia: boolean;
    errorSampleRate: number;
    maskAllInputs: boolean;
    maskAllText: boolean;
    networkCaptureBodies: boolean;
    networkDetailHasUrls: boolean;
    networkRequestHasHeaders: boolean;
    networkResponseHasHeaders: boolean;
    sessionSampleRate: number;
    shouldRecordCanvas: boolean;
    useCompression: boolean;
    useCompressionOption: boolean;
}
interface ReplayFeedbackFrameData {
    feedbackId: string;
}
interface ReplayFeedbackFrame extends ReplayBaseBreadcrumbFrame {
    category: 'sentry.feedback';
    data: ReplayFeedbackFrameData;
}
export type ReplayBreadcrumbFrame = ReplayConsoleFrame | ReplayClickFrame | ReplayInputFrame | ReplayKeyboardEventFrame | ReplayBlurFrame | ReplayFocusFrame | ReplaySlowClickFrame | ReplayMultiClickFrame | ReplayMutationFrame | ReplayHydrationErrorFrame | ReplayFeedbackFrame | ReplayBaseBreadcrumbFrame;
interface ReplayBaseSpanFrame {
    op: string;
    description: string;
    startTimestamp: number;
    endTimestamp: number;
    data?: undefined | AnyRecord;
}
interface ReplayHistoryFrame extends ReplayBaseSpanFrame {
    data: HistoryData;
    op: 'navigation.push';
}
interface ReplayWebVitalFrame extends ReplayBaseSpanFrame {
    data: WebVitalData;
    op: 'largest-contentful-paint' | 'cumulative-layout-shift' | 'interaction-to-next-paint';
}
interface ReplayMemoryFrame extends ReplayBaseSpanFrame {
    data: MemoryData;
    op: 'memory';
}
interface ReplayNavigationFrame extends ReplayBaseSpanFrame {
    data: NavigationData;
    op: 'navigation.navigate' | 'navigation.reload' | 'navigation.back_forward';
}
interface ReplayPaintFrame extends ReplayBaseSpanFrame {
    data: PaintData;
    op: 'paint';
}
interface ReplayRequestFrame extends ReplayBaseSpanFrame {
    data: NetworkRequestData;
    op: 'resource.fetch' | 'resource.xhr';
}
interface ReplayResourceFrame extends ReplayBaseSpanFrame {
    data: ResourceData;
    op: 'resource.css' | 'resource.iframe' | 'resource.img' | 'resource.link' | 'resource.other' | 'resource.script';
}
export type ReplaySpanFrame = ReplayBaseSpanFrame | ReplayHistoryFrame | ReplayRequestFrame | ReplayWebVitalFrame | ReplayMemoryFrame | ReplayNavigationFrame | ReplayPaintFrame | ReplayResourceFrame;
export type ReplayFrame = ReplayBreadcrumbFrame | ReplaySpanFrame;
interface RecordingCustomEvent {
    type: typeof ReplayEventTypeCustom;
    timestamp: number;
    data: {
        tag: string;
        payload: unknown;
    };
}
export interface ReplayBreadcrumbFrameEvent extends RecordingCustomEvent {
    data: {
        tag: 'breadcrumb';
        payload: ReplayBreadcrumbFrame;
        /**
         * This will indicate to backend to additionally log as a metric
         */
        metric?: boolean;
    };
}
export interface ReplaySpanFrameEvent extends RecordingCustomEvent {
    data: {
        tag: 'performanceSpan';
        payload: ReplaySpanFrame;
    };
}
export interface ReplayOptionFrameEvent extends RecordingCustomEvent {
    data: {
        tag: 'options';
        payload: ReplayOptionFrame;
    };
}
export type ReplayFrameEvent = ReplayBreadcrumbFrameEvent | ReplaySpanFrameEvent | ReplayOptionFrameEvent;
export {};
//# sourceMappingURL=replayFrame.d.ts.map