import type { AgBaseBean } from './agBaseBean';
import type { IContext } from './iContext';
export interface AgSingletonBean<TBeanCollection> extends AgBaseBean<TBeanCollection> {
    /** AG Grid internal - do not use */
    beanName?: keyof TBeanCollection & string;
}
/** Includes bean creation and destruction logic */
export interface AgCoreBean<TBeanCollection> extends AgBaseBean<TBeanCollection> {
    isAlive(): boolean;
    addDestroyFunc(func: () => void): void;
    /** doesn't throw an error if `bean` is undefined */
    createOptionalManagedBean<T extends AgBaseBean<TBeanCollection> | null | undefined>(bean: T, context?: IContext<TBeanCollection>): T | undefined;
    createManagedBean<T extends AgBaseBean<TBeanCollection>>(bean: T, context?: IContext<TBeanCollection>): T;
    createBean<T extends AgBaseBean<TBeanCollection>>(bean: T, context?: IContext<TBeanCollection> | null, afterPreCreateCallback?: (bean: AgBaseBean<TBeanCollection>) => void): T;
    /**
     * Destroys a bean and returns undefined to support destruction and clean up in a single line.
     * this.dateComp = this.context.destroyBean(this.dateComp);
     */
    destroyBean<T extends AgBaseBean<TBeanCollection> | null | undefined>(bean: T, context?: IContext<TBeanCollection>): undefined;
}
