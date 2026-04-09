import type { IComponent } from '../../agStack/interfaces/iComponent';
import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { BeanCollection, ProcessParamsFunc } from '../../context/context';
import type { AgGridCommon } from '../../interfaces/iCommon';
import type { IFrameworkOverrides } from '../../interfaces/iFrameworkOverrides';
import type { ComponentType, UserCompDetails } from '../../interfaces/iUserCompDetails';
export declare function _getUserCompKeys<TDefinition>(frameworkOverrides: IFrameworkOverrides, defObject: TDefinition, type: ComponentType, params?: any): {
    compName?: string;
    jsComp: any;
    fwComp: any;
    paramsFromSelector: any;
    popupFromSelector?: boolean;
    popupPositionFromSelector?: 'over' | 'under';
};
export declare class UserComponentFactory extends BeanStub implements NamedBean {
    beanName: "userCompFactory";
    private gridOptions;
    private agCompUtils?;
    private registry;
    private frameworkCompWrapper?;
    wireBeans(beans: BeanCollection): void;
    getCompDetailsFromGridOptions(type: ComponentType, defaultName: string | undefined, params: AgGridCommon<any, any>, mandatory?: boolean): UserCompDetails | undefined;
    getCompDetails<TDefinition, TComp extends IComponent<any>>(defObject: TDefinition, type: ComponentType, defaultName: string | undefined, params: AgGridCommon<any, any>, mandatory?: boolean): UserCompDetails<TComp> | undefined;
    private newAgStackInstance;
    /**
     * merges params with application provided params
     * used by Floating Filter
     */
    mergeParams<TDefinition>(defObject: TDefinition, type: ComponentType, paramsFromGrid: AgGridCommon<any, any>, paramsFromSelector?: any, defaultCompParams?: any, defaultCompProcessParams?: ProcessParamsFunc): any;
}
