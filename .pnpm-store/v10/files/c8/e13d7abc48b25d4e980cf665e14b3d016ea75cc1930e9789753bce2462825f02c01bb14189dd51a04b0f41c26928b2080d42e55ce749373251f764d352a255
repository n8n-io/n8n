import { BaseRegistry } from '../../agStack/core/baseRegistry';
import type { AgBaseComponent } from '../../agStack/interfaces/agComponent';
import type { NamedBean } from '../../context/bean';
import type { BeanCollection, DynamicBeanName, ProcessParamsFunc } from '../../context/context';
import type { AgEventTypeParams } from '../../events';
import type { GridOptionsWithDefaults } from '../../gridOptionsDefault';
import type { GridOptionsService } from '../../gridOptionsService';
import type { AgGridCommon } from '../../interfaces/iCommon';
import type { Module } from '../../interfaces/iModule';
import type { IconName, IconValue } from '../../utils/icon';
import type { AgComponentSelectorType, ComponentSelector } from '../../widgets/component';
export declare class Registry extends BaseRegistry<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, DynamicBeanName> implements NamedBean {
    private agGridDefaults;
    private agGridDefaultOverrides;
    private jsComps;
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
    getSelector<TComponent extends AgBaseComponent<BeanCollection>>(name: AgComponentSelectorType): ComponentSelector<TComponent> | undefined;
    getIcon(name: IconName): IconValue | undefined;
    protected getDynamicError(name: DynamicBeanName, init: boolean): string;
}
