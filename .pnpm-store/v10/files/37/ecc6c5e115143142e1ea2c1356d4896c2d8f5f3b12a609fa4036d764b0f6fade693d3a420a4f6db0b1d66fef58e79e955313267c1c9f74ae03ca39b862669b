import { AgComponentStub } from '../core/agComponentStub';
import type { AgComponent } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPopupComponent } from '../interfaces/iPopupComponent';
import type { IPropertiesService } from '../interfaces/iProperties';
export declare class AgPopupComponent<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string> extends AgComponentStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TComponentSelectorType> implements IPopupComponent<any> {
    isPopup(): boolean;
    setParentComponent(container: AgComponent<TBeanCollection, TProperties, TGlobalEvents, any>): void;
    destroy(): void;
}
