import type { AgBaseBean } from './agBaseBean';
export type AgEventHandlers<TEventKey extends string, TEvent = any> = {
    [K in TEventKey]?: (event?: TEvent) => void;
};
export interface IContext<TBeanCollection> {
    createBean<T extends AgBaseBean<TBeanCollection>>(bean: T, afterPreCreateCallback?: (bean: AgBaseBean<TBeanCollection>) => void): T;
    getBean<T extends keyof TBeanCollection>(name: T): TBeanCollection[T];
    getBeans(): TBeanCollection;
    destroyBean(bean: AgBaseBean<TBeanCollection> | null | undefined): undefined;
    destroyBeans<T extends AgBaseBean<TBeanCollection>>(beans: (T | null | undefined)[]): T[];
    getId(): string;
    destroy(): void;
    isDestroyed(): boolean;
    readonly instanceId: number;
}
export type ClassImp = new (...args: []) => object;
