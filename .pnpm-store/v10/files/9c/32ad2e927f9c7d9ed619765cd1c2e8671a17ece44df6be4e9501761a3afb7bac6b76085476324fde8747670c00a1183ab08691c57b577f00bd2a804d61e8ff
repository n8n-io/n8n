export type ContainerType = 'columnMenu' | 'contextMenu' | 'toolPanel' | 'floatingFilter' | 'columnFilter' | 'newFiltersToolPanel';
export interface IAfterGuiAttachedParams {
    /** Where this component is attached to. */
    container?: ContainerType;
    /**
     * Call this to hide the popup.
     * i.e useful if your component has an action button and you want to hide the popup after it is pressed.
     */
    hidePopup?: () => void;
    /** Set to `true` to not have the component focus its default item. */
    suppressFocus?: boolean;
}
