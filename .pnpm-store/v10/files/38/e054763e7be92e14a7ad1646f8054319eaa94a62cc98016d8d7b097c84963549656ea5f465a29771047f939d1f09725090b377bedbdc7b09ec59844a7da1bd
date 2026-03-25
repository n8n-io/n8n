import type { IComponent } from './iComponent';
export interface IPopupComponent<T> extends IComponent<T> {
    /** Gets called once after initialised. If you return true, the component will appear in a popup, and it will be
     *  constrained to the boundaries of the popupParent. This is great if you want to, for example, provide you own
     * custom dropdown list for selection. Default is false (ie if you don't provide the method). */
    isPopup?(): boolean;
    /** Called when focus is within the component */
    focusIn?(): void;
    /** Called when focus is leaving the component */
    focusOut?(): void;
}
