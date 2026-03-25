import { BeanStub } from '../context/beanStub';
export interface LayoutView {
    updateLayoutClasses(layoutClass: string, params: UpdateLayoutClassesParams): void;
}
export declare const LayoutCssClasses: {
    readonly AUTO_HEIGHT: "ag-layout-auto-height";
    readonly NORMAL: "ag-layout-normal";
    readonly PRINT: "ag-layout-print";
};
export interface UpdateLayoutClassesParams {
    autoHeight: boolean;
    normal: boolean;
    print: boolean;
}
export declare class LayoutFeature extends BeanStub {
    private view;
    constructor(view: LayoutView);
    postConstruct(): void;
    private updateLayoutClasses;
}
