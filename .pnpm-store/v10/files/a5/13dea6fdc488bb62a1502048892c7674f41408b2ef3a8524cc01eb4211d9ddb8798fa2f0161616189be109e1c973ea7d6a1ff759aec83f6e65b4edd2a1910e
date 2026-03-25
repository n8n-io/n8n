import type { WrappableInterface } from 'ag-grid-community';
import { BaseComponentWrapper } from 'ag-grid-community';
interface VueWrappableInterface extends WrappableInterface {
    processMethod(methodName: string, args: IArguments): any;
}
export declare class VueFrameworkComponentWrapper extends BaseComponentWrapper<WrappableInterface> {
    private parent;
    private provides;
    constructor(parent: any, provides?: any);
    protected createWrapper(component: any): WrappableInterface;
    createComponent(component: any, params: any): any;
    protected createMethodProxy(wrapper: VueWrappableInterface, methodName: string, mandatory: boolean): () => any;
    protected destroy(): void;
}
export {};
