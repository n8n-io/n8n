import type { AgEvent } from './agEvent';
import type { BaseProperties } from './baseProperties';
import type { WithoutCommon } from './iEvent';
export type AgPropertyChangedSource = 'api' | 'optionsUpdated';
export interface AgPropertyChangeSet<TProperties extends BaseProperties> {
    /** Unique id which can be used to link changes of multiple properties that were updated together.
     * i.e a user updated multiple properties at the same time.
     */
    id: number;
    /** All the properties that have been updated in this change set */
    properties: (keyof TProperties)[];
}
export interface AgPropertyChangedEvent<TProperties extends BaseProperties> extends AgEvent {
    type: 'propertyChanged';
    changeSet: AgPropertyChangeSet<TProperties> | undefined;
    source: AgPropertyChangedSource;
}
export type AgPropertyKey<TProperties extends BaseProperties> = keyof TProperties & string;
export interface AgPropertyValueChangedEvent<TProperties extends BaseProperties, K extends AgPropertyKey<TProperties>> extends AgEvent {
    type: K;
    changeSet: AgPropertyChangeSet<TProperties> | undefined;
    currentValue: TProperties[K];
    previousValue: TProperties[K];
    source: AgPropertyChangedSource;
}
export type AgPropertyChangedListener<TProperties extends BaseProperties> = (event: AgPropertyChangedEvent<TProperties>) => void;
export type AgPropertyValueChangedListener<TProperties extends BaseProperties, K extends AgPropertyKey<TProperties>> = (event: AgPropertyValueChangedEvent<TProperties, K>) => void;
export interface IPropertiesService<TProperties extends BaseProperties, TCommon> {
    readonly beanName: 'gos';
    addPropertyEventListener<K extends keyof TProperties & string>(event: K, listener: AgPropertyValueChangedListener<TProperties, K>): void;
    removePropertyEventListener<K extends keyof TProperties & string>(event: K, listener: AgPropertyValueChangedListener<TProperties, K>): void;
    get<K extends AgPropertyKey<TProperties>>(property: K): TProperties[K];
    addCommon<T extends TCommon>(params: WithoutCommon<TCommon, T>): T;
    setInstanceDomData(element: HTMLElement): void;
    isElementInThisInstance(element: HTMLElement): boolean;
}
