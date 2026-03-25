import type { InspectorNodeTag } from './api.js';
import type { ID } from './util.js';
export type ComponentInstance = any;
export interface ComponentTreeNode {
    uid: ID;
    id: string;
    name: string;
    renderKey: string | number;
    inactive: boolean;
    isFragment: boolean;
    hasChildren: boolean;
    children: ComponentTreeNode[];
    domOrder?: number[];
    consoleId?: string;
    isRouterView?: boolean;
    macthedRouteSegment?: string;
    tags: InspectorNodeTag[];
    autoOpen: boolean;
    meta?: any;
}
export interface InspectedComponentData {
    id: string;
    name: string;
    file: string;
    state: ComponentState[];
    functional?: boolean;
}
export interface StateBase {
    key: string;
    value: any;
    editable?: boolean;
    objectType?: 'ref' | 'reactive' | 'computed' | 'other';
    raw?: string;
}
export interface ComponentStateBase extends StateBase {
    type: string;
}
export interface ComponentPropState extends ComponentStateBase {
    meta?: {
        type: string;
        required: boolean;
        /** Vue 1 only */
        mode?: 'default' | 'sync' | 'once';
    };
}
export type ComponentBuiltinCustomStateTypes = 'function' | 'map' | 'set' | 'reference' | 'component' | 'component-definition' | 'router' | 'store';
export interface ComponentCustomState extends ComponentStateBase {
    value: CustomState;
}
export interface CustomState {
    _custom: {
        type: ComponentBuiltinCustomStateTypes | string;
        objectType?: string;
        display?: string;
        tooltip?: string;
        value?: any;
        abstract?: boolean;
        file?: string;
        uid?: number;
        readOnly?: boolean;
        /** Configure immediate child fields */
        fields?: {
            abstract?: boolean;
        };
        id?: any;
        actions?: {
            icon: string;
            tooltip?: string;
            action: () => void | Promise<void>;
        }[];
        /** internal */
        _reviveId?: number;
    };
}
export type ComponentState = ComponentStateBase | ComponentPropState | ComponentCustomState;
export interface ComponentDevtoolsOptions {
    hide?: boolean;
}
