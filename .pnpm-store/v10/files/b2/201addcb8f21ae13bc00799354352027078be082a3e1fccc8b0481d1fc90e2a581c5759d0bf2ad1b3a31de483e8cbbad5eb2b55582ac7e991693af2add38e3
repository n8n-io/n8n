import type { IComponent } from '../agStack/interfaces/iComponent';
import type { AgPromise } from '../agStack/utils/promise';
export interface UserCompDetails<TComp extends IComponent<any> = any> {
    componentClass: any;
    componentFromFramework: boolean;
    params: any;
    type: ComponentType;
    popupFromSelector?: boolean;
    popupPositionFromSelector?: 'over' | 'under';
    newAgStackInstance: () => AgPromise<TComp>;
}
export interface ComponentType<TComp = any> {
    name: string;
    cellRenderer?: boolean;
    mandatoryMethods?: (keyof TComp & string)[];
    optionalMethods?: (keyof TComp & string)[];
}
