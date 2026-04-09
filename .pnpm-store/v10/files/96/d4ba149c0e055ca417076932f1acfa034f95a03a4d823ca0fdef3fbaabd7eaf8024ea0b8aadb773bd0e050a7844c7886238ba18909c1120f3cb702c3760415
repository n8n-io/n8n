import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { ClassImp } from '../interfaces/iContext';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { IRegistry } from '../interfaces/iRegistry';
import { AgBeanStub } from './agBeanStub';
export declare abstract class BaseRegistry<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TDynamicBeanName extends string> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService> implements IRegistry<TBeanCollection, TDynamicBeanName> {
    beanName: "registry";
    private dynamicBeans;
    protected registerDynamicBeans(dynamicBeans?: Partial<Record<TDynamicBeanName, ClassImp>>): void;
    createDynamicBean<T>(name: TDynamicBeanName, mandatory: boolean, ...args: any[]): T | undefined;
    protected abstract getDynamicError(name: TDynamicBeanName, init: boolean): string;
}
