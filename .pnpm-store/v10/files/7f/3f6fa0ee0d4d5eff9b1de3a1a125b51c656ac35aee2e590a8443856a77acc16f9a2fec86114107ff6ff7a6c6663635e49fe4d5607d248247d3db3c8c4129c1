import type { IComponent } from '../../agStack/interfaces/iComponent';
import type { ComponentType } from '../../interfaces/iUserCompDetails';
/**
 * B the business interface (ie IHeader)
 * A the agGridComponent interface (ie IHeaderComp). The final object acceptable by ag-grid
 */
export interface FrameworkComponentWrapper {
    wrap<A extends IComponent<any>>(frameworkComponent: {
        new (): any;
    } | null, mandatoryMethods: string[] | undefined, optionalMethods: string[] | undefined, componentType: ComponentType): A;
}
export interface WrappableInterface {
    hasMethod(name: string): boolean;
    callMethod(name: string, args: IArguments): void;
    addMethod(name: string, callback: (...args: any[]) => any): void;
}
export declare abstract class BaseComponentWrapper<F extends WrappableInterface> implements FrameworkComponentWrapper {
    wrap<A extends IComponent<any>>(OriginalConstructor: {
        new (): any;
    }, mandatoryMethods: string[] | undefined, optionalMethods: string[] | undefined, componentType: ComponentType): A;
    protected abstract createWrapper(OriginalConstructor: {
        new (): any;
    }, componentType: ComponentType): F;
    private createMethod;
    protected createMethodProxy(wrapper: F, methodName: string, mandatory: boolean): (...args: any[]) => any;
}
