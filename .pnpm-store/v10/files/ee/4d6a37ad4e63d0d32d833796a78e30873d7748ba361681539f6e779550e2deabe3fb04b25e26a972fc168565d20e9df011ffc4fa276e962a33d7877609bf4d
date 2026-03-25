import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { DynamicBeanName, ProcessParamsFunc } from '../../context/context';
import type { Module } from '../../interfaces/iModule';
import type { IconName, IconValue } from '../../utils/icon';
import type { AgComponentSelector, ComponentSelector } from '../../widgets/component';
export declare class Registry extends BeanStub implements NamedBean {
    beanName: "registry";
    private agGridDefaults;
    private agGridDefaultOverrides;
    private jsComps;
    private dynamicBeans;
    private selectors;
    private icons;
    postConstruct(): void;
    registerModule(module: Module): void;
    getUserComponent(propertyName: string, name: string): {
        componentFromFramework: boolean;
        component: any;
        params?: any;
        processParams?: ProcessParamsFunc;
    } | null;
    createDynamicBean<T>(name: DynamicBeanName, mandatory: boolean, ...args: any[]): T | undefined;
    getSelector(name: AgComponentSelector): ComponentSelector | undefined;
    getIcon(name: IconName): IconValue | undefined;
}
