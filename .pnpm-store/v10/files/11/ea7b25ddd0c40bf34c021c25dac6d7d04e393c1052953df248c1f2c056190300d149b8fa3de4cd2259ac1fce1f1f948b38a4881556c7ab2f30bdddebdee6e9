import type { AgBaseBean } from '../interfaces/agBaseBean';
import type { AgSingletonBean } from '../interfaces/agCoreBean';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IContext } from '../interfaces/iContext';
import type { IPropertiesService } from '../interfaces/iProperties';
type BeanComparator<TBeanCollection> = (bean1: AgSingletonBean<TBeanCollection>, bean2: AgSingletonBean<TBeanCollection>) => number;
export interface AgContextParams<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>> {
    providedBeanInstances: Partial<TBeanCollection>;
    beanClasses: AgSingletonBeanClass<TBeanCollection>[];
    derivedBeans?: ((context: AgContext<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService>) => DerivedBean<TBeanCollection, keyof TBeanCollection>)[];
    beanInitComparator?: BeanComparator<TBeanCollection>;
    beanDestroyComparator?: BeanComparator<TBeanCollection>;
    id: string;
    destroyCallback?: () => void;
}
export interface AgSingletonBeanClass<TBeanCollection> {
    new (): AgSingletonBean<TBeanCollection>;
}
interface DerivedBean<TBeanCollection, K extends keyof TBeanCollection> {
    beanName: K;
    bean: TBeanCollection[K] & AgSingletonBean<TBeanCollection>;
}
export declare class AgContext<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>> implements IContext<TBeanCollection> {
    protected beans: TBeanCollection;
    private createdBeans;
    private readonly beanDestroyComparator?;
    private id;
    private destroyCallback?;
    private destroyed;
    readonly instanceId: number;
    constructor(params: AgContextParams<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService>);
    protected init(params: AgContextParams<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService>): void;
    private getBeanInstances;
    createBean<T extends AgBaseBean<TBeanCollection>>(bean: T, afterPreCreateCallback?: (bean: AgBaseBean<TBeanCollection>) => void): T;
    private initBeans;
    getBeans(): TBeanCollection;
    getBean<T extends keyof TBeanCollection>(name: T): TBeanCollection[T];
    getId(): string;
    destroy(): void;
    /**
     * Destroys a bean and returns undefined to support destruction and clean up in a single line.
     * this.dateComp = this.context.destroyBean(this.dateComp);
     */
    destroyBean(bean: AgBaseBean<TBeanCollection> | null | undefined): undefined;
    /**
     * Destroys an array of beans and returns an empty array to support destruction and clean up in a single line.
     * this.dateComps = this.context.destroyBeans(this.dateComps);
     */
    destroyBeans<T extends AgBaseBean<TBeanCollection>>(beans: (T | null | undefined)[]): T[];
    isDestroyed(): boolean;
}
export {};
