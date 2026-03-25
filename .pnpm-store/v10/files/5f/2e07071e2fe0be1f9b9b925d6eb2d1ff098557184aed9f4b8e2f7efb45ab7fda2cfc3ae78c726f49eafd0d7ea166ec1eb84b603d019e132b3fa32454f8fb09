import type { AddEventResult, RecordingEvent, ReplayContainer } from '../types';
/**
 * Add an event to the event buffer.
 * In contrast to `addEvent`, this does not return a promise & does not wait for the adding of the event to succeed/fail.
 * Instead this returns `true` if we tried to add the event, else false.
 * It returns `false` e.g. if we are paused, disabled, or out of the max replay duration.
 *
 * `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
 */
export declare function addEventSync(replay: ReplayContainer, event: RecordingEvent, isCheckout?: boolean): boolean;
/**
 * Add an event to the event buffer.
 * Resolves to `null` if no event was added, else to `void`.
 *
 * `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
 */
export declare function addEvent(replay: ReplayContainer, event: RecordingEvent, isCheckout?: boolean): Promise<AddEventResult | null>;
/** Exported only for tests. */
export declare function shouldAddEvent(replay: ReplayContainer, event: RecordingEvent): boolean;
//# sourceMappingURL=addEvent.d.ts.map