import type { GenericBean } from './genericBean';
type BeanComparator<TBeanName extends string, TBeanCollection extends {
    [key in TBeanName]?: any;
}> = (bean1: GenericBean<TBeanName, TBeanCollection>, bean2: GenericBean<TBeanName, TBeanCollection>) => number;
export interface GenericContextParams<TBeanName extends string, TBeanCollection extends {
    [key in TBeanName]?: any;
}> {
    providedBeanInstances: Partial<{
        [key in TBeanName]: GenericBean<TBeanName, TBeanCollection>;
    }>;
    beanClasses: GenericSingletonBean<TBeanName, TBeanCollection>[];
    derivedBeans?: ((context: GenericContext<TBeanName, TBeanCollection>) => {
        beanName: TBeanName;
        bean: TBeanCollection[TBeanName];
    })[];
    beanInitComparator?: BeanComparator<TBeanName, TBeanCollection>;
    beanDestroyComparator?: BeanComparator<TBeanName, TBeanCollection>;
}
export interface GenericSingletonBean<TBeanName extends string, TBeanCollection extends {
    [key in TBeanName]?: any;
}> {
    new (): GenericBean<TBeanName, TBeanCollection>;
}
export interface ComponentBean {
    preConstruct(): void;
}
/**
 * The BaseBean can be used to avoid having to call super.wireBeans() in every subclass of a shared base bean, .i.e BeanStub, Component
 * It is used to pre-wire beans before the wireBeans() method is called which is equivalent to calling super.wireBeans() in a sub class
 */
export interface BaseBean<TBeanCollection> {
    preWireBeans?(beans: TBeanCollection): void;
}
export declare class GenericContext<TBeanName extends string, TBeanCollection extends {
    [key in TBeanName]?: any;
}> {
    protected beans: TBeanCollection;
    private createdBeans;
    private beanDestroyComparator?;
    private destroyed;
    constructor(params: GenericContextParams<TBeanName, TBeanCollection>);
    protected init(params: GenericContextParams<TBeanName, TBeanCollection>): void;
    private getBeanInstances;
    createBean<T extends GenericBean<TBeanName, TBeanCollection>>(bean: T, afterPreCreateCallback?: (bean: GenericBean<TBeanName, TBeanCollection>) => void): T;
    private initBeans;
    getBeans(): TBeanCollection;
    getBean<T extends TBeanName>(name: T): TBeanCollection[T];
    destroy(): void;
    /**
     * Destroys a bean and returns undefined to support destruction and clean up in a single line.
     * this.dateComp = this.context.destroyBean(this.dateComp);
     */
    destroyBean(bean: GenericBean<TBeanName, TBeanCollection> | null | undefined): undefined;
    /**
     * Destroys an array of beans and returns an empty array to support destruction and clean up in a single line.
     * this.dateComps = this.context.destroyBeans(this.dateComps);
     */
    destroyBeans(beans: (GenericBean<TBeanName, TBeanCollection> | null | undefined)[]): [];
    isDestroyed(): boolean;
}
export {};
