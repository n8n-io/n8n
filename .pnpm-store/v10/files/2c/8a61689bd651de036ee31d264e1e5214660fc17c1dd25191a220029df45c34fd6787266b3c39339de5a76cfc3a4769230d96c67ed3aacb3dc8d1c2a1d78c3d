import { Breadcrumb } from '@sentry/core';
import { RecordingEvent, ReplayClickDetector, ReplayContainer, SlowClickConfig } from '../types';
import { addBreadcrumbEvent } from './util/addBreadcrumbEvent';
/** Handle a click. */
export declare function handleClick(clickDetector: ReplayClickDetector, clickBreadcrumb: Breadcrumb, node: HTMLElement): void;
/** A click detector class that can be used to detect slow or rage clicks on elements. */
export declare class ClickDetector implements ReplayClickDetector {
    protected _lastMutation: number;
    protected _lastScroll: number;
    private _clicks;
    private _teardown;
    private _threshold;
    private _scrollTimeout;
    private _timeout;
    private _ignoreSelector;
    private _replay;
    private _checkClickTimeout?;
    private _addBreadcrumbEvent;
    constructor(replay: ReplayContainer, slowClickConfig: SlowClickConfig, _addBreadcrumbEvent?: typeof addBreadcrumbEvent);
    /** Register click detection handlers on mutation or scroll. */
    addListeners(): void;
    /** Clean up listeners. */
    removeListeners(): void;
    /** @inheritDoc */
    handleClick(breadcrumb: Breadcrumb, node: HTMLElement): void;
    /** @inheritDoc */
    registerMutation(timestamp?: number): void;
    /** @inheritDoc */
    registerScroll(timestamp?: number): void;
    /** @inheritDoc */
    registerClick(element: HTMLElement): void;
    /** Count multiple clicks on elements. */
    private _handleMultiClick;
    /** Get all pending clicks for a given node. */
    private _getClicks;
    /** Check the clicks that happened. */
    private _checkClicks;
    /** Generate matching breadcrumb(s) for the click. */
    private _generateBreadcrumbs;
    /** Schedule to check current clicks. */
    private _scheduleCheckClicks;
}
/** exported for tests only */
export declare function ignoreElement(node: HTMLElement, ignoreSelector: string): boolean;
/** Update the click detector based on a recording event of rrweb. */
export declare function updateClickDetectorForRecordingEvent(clickDetector: ReplayClickDetector, event: RecordingEvent): void;
//# sourceMappingURL=handleClick.d.ts.map
