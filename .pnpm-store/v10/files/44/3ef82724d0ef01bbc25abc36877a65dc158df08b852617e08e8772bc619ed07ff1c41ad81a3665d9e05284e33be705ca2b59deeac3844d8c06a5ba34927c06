import type { AgPropertyChangedSource } from '../agStack/interfaces/iProperties';
import type { ApiFunction, ApiFunctionName } from '../api/iApiFunction';
import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection, DynamicBeanName, UserComponentName } from '../context/context';
import type { ColDef, ColGroupDef } from '../entities/colDef';
import type { GridOptions } from '../entities/gridOptions';
import type { RowNodeEventType } from '../interfaces/iRowNode';
import type { IconName } from '../utils/icon';
export declare class ValidationService extends BeanStub implements NamedBean {
    beanName: "validation";
    private gridOptions;
    wireBeans(beans: BeanCollection): void;
    warnOnInitialPropertyUpdate(source: AgPropertyChangedSource, key: string): void;
    processGridOptions(options: GridOptions): void;
    validateApiFunction<TFunctionName extends ApiFunctionName>(functionName: TFunctionName, apiFunction: ApiFunction<TFunctionName>): ApiFunction<TFunctionName>;
    missingUserComponent(propertyName: string, componentName: string, agGridDefaults: {
        [key in UserComponentName]?: any;
    }, jsComps: {
        [key: string]: any;
    }): void;
    missingDynamicBean(beanName: DynamicBeanName): string | undefined;
    checkRowEvents(eventType: RowNodeEventType): void;
    validateIcon(iconName: IconName): void;
    isProvidedUserComp(compName: string): boolean;
    /** Should only be called via the GridOptionsService */
    validateColDef(colDef: ColDef | ColGroupDef): void;
    private processOptions;
    private checkForRequiredDependencies;
    private checkProperties;
}
