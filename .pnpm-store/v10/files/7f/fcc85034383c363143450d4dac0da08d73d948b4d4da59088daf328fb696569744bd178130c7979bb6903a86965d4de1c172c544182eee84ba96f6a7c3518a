import type { ComponentDevtoolsOptions, ComponentInstance, ComponentTreeNode, InspectedComponentData } from './component.js';
import type { App } from './app.js';
import type { CustomInspectorNode, CustomInspectorState, TimelineEvent } from './api.js';
export declare const enum Hooks {
    TRANSFORM_CALL = "transformCall",
    GET_APP_RECORD_NAME = "getAppRecordName",
    GET_APP_ROOT_INSTANCE = "getAppRootInstance",
    REGISTER_APPLICATION = "registerApplication",
    WALK_COMPONENT_TREE = "walkComponentTree",
    VISIT_COMPONENT_TREE = "visitComponentTree",
    WALK_COMPONENT_PARENTS = "walkComponentParents",
    INSPECT_COMPONENT = "inspectComponent",
    GET_COMPONENT_BOUNDS = "getComponentBounds",
    GET_COMPONENT_NAME = "getComponentName",
    GET_COMPONENT_INSTANCES = "getComponentInstances",
    GET_ELEMENT_COMPONENT = "getElementComponent",
    GET_COMPONENT_ROOT_ELEMENTS = "getComponentRootElements",
    EDIT_COMPONENT_STATE = "editComponentState",
    GET_COMPONENT_DEVTOOLS_OPTIONS = "getAppDevtoolsOptions",
    GET_COMPONENT_RENDER_CODE = "getComponentRenderCode",
    INSPECT_TIMELINE_EVENT = "inspectTimelineEvent",
    TIMELINE_CLEARED = "timelineCleared",
    GET_INSPECTOR_TREE = "getInspectorTree",
    GET_INSPECTOR_STATE = "getInspectorState",
    EDIT_INSPECTOR_STATE = "editInspectorState",
    SET_PLUGIN_SETTINGS = "setPluginSettings"
}
export interface ComponentBounds {
    left: number;
    top: number;
    width: number;
    height: number;
}
export interface HookPayloads {
    [Hooks.TRANSFORM_CALL]: {
        callName: string;
        inArgs: any[];
        outArgs: any[];
    };
    [Hooks.GET_APP_RECORD_NAME]: {
        app: App;
        name: string;
    };
    [Hooks.GET_APP_ROOT_INSTANCE]: {
        app: App;
        root: ComponentInstance;
    };
    [Hooks.REGISTER_APPLICATION]: {
        app: App;
    };
    [Hooks.WALK_COMPONENT_TREE]: {
        componentInstance: ComponentInstance;
        componentTreeData: ComponentTreeNode[];
        maxDepth: number;
        filter: string;
        recursively: boolean;
    };
    [Hooks.VISIT_COMPONENT_TREE]: {
        app: App;
        componentInstance: ComponentInstance;
        treeNode: ComponentTreeNode;
        filter: string;
    };
    [Hooks.WALK_COMPONENT_PARENTS]: {
        componentInstance: ComponentInstance;
        parentInstances: ComponentInstance[];
    };
    [Hooks.INSPECT_COMPONENT]: {
        app: App;
        componentInstance: ComponentInstance;
        instanceData: InspectedComponentData;
    };
    [Hooks.GET_COMPONENT_BOUNDS]: {
        componentInstance: ComponentInstance;
        bounds: ComponentBounds;
    };
    [Hooks.GET_COMPONENT_NAME]: {
        componentInstance: ComponentInstance;
        name: string;
    };
    [Hooks.GET_COMPONENT_INSTANCES]: {
        app: App;
        componentInstances: ComponentInstance[];
    };
    [Hooks.GET_ELEMENT_COMPONENT]: {
        element: HTMLElement | any;
        componentInstance: ComponentInstance;
    };
    [Hooks.GET_COMPONENT_ROOT_ELEMENTS]: {
        componentInstance: ComponentInstance;
        rootElements: (HTMLElement | any)[];
    };
    [Hooks.EDIT_COMPONENT_STATE]: {
        app: App;
        componentInstance: ComponentInstance;
        path: string[];
        type: string;
        state: EditStatePayload;
        set: (object: any, path?: string | (string[]), value?: any, cb?: (object: any, field: string, value: any) => void) => void;
    };
    [Hooks.GET_COMPONENT_DEVTOOLS_OPTIONS]: {
        componentInstance: ComponentInstance;
        options: ComponentDevtoolsOptions;
    };
    [Hooks.GET_COMPONENT_RENDER_CODE]: {
        componentInstance: ComponentInstance;
        code: string;
    };
    [Hooks.INSPECT_TIMELINE_EVENT]: {
        app: App;
        layerId: string;
        event: TimelineEvent;
        all?: boolean;
        data: any;
    };
    [Hooks.TIMELINE_CLEARED]: Record<string, never>;
    [Hooks.GET_INSPECTOR_TREE]: {
        app: App;
        inspectorId: string;
        filter: string;
        rootNodes: CustomInspectorNode[];
    };
    [Hooks.GET_INSPECTOR_STATE]: {
        app: App;
        inspectorId: string;
        nodeId: string;
        state: CustomInspectorState;
    };
    [Hooks.EDIT_INSPECTOR_STATE]: {
        app: App;
        inspectorId: string;
        nodeId: string;
        path: string[];
        type: string;
        state: EditStatePayload;
        set: (object: any, path?: string | (string[]), value?: any, cb?: (object: any, field: string, value: any) => void) => void;
    };
    [Hooks.SET_PLUGIN_SETTINGS]: {
        app: App;
        pluginId: string;
        key: string;
        newValue: any;
        oldValue: any;
        settings: any;
    };
}
export type EditStatePayload = {
    value: any;
    newKey?: string | null;
    remove?: undefined | false;
} | {
    value?: undefined;
    newKey?: undefined;
    remove: true;
};
export type HookHandler<TPayload, TContext> = (payload: TPayload, ctx: TContext) => void | Promise<void>;
export interface Hookable<TContext> {
    transformCall: (handler: HookHandler<HookPayloads[Hooks.TRANSFORM_CALL], TContext>) => any;
    getAppRecordName: (handler: HookHandler<HookPayloads[Hooks.GET_APP_RECORD_NAME], TContext>) => any;
    getAppRootInstance: (handler: HookHandler<HookPayloads[Hooks.GET_APP_ROOT_INSTANCE], TContext>) => any;
    registerApplication: (handler: HookHandler<HookPayloads[Hooks.REGISTER_APPLICATION], TContext>) => any;
    walkComponentTree: (handler: HookHandler<HookPayloads[Hooks.WALK_COMPONENT_TREE], TContext>) => any;
    visitComponentTree: (handler: HookHandler<HookPayloads[Hooks.VISIT_COMPONENT_TREE], TContext>) => any;
    walkComponentParents: (handler: HookHandler<HookPayloads[Hooks.WALK_COMPONENT_PARENTS], TContext>) => any;
    inspectComponent: (handler: HookHandler<HookPayloads[Hooks.INSPECT_COMPONENT], TContext>) => any;
    getComponentBounds: (handler: HookHandler<HookPayloads[Hooks.GET_COMPONENT_BOUNDS], TContext>) => any;
    getComponentName: (handler: HookHandler<HookPayloads[Hooks.GET_COMPONENT_NAME], TContext>) => any;
    getComponentInstances: (handler: HookHandler<HookPayloads[Hooks.GET_COMPONENT_INSTANCES], TContext>) => any;
    getElementComponent: (handler: HookHandler<HookPayloads[Hooks.GET_ELEMENT_COMPONENT], TContext>) => any;
    getComponentRootElements: (handler: HookHandler<HookPayloads[Hooks.GET_COMPONENT_ROOT_ELEMENTS], TContext>) => any;
    editComponentState: (handler: HookHandler<HookPayloads[Hooks.EDIT_COMPONENT_STATE], TContext>) => any;
    getComponentDevtoolsOptions: (handler: HookHandler<HookPayloads[Hooks.GET_COMPONENT_DEVTOOLS_OPTIONS], TContext>) => any;
    getComponentRenderCode: (handler: HookHandler<HookPayloads[Hooks.GET_COMPONENT_RENDER_CODE], TContext>) => any;
    inspectTimelineEvent: (handler: HookHandler<HookPayloads[Hooks.INSPECT_TIMELINE_EVENT], TContext>) => any;
    timelineCleared: (handler: HookHandler<HookPayloads[Hooks.TIMELINE_CLEARED], TContext>) => any;
    getInspectorTree: (handler: HookHandler<HookPayloads[Hooks.GET_INSPECTOR_TREE], TContext>) => any;
    getInspectorState: (handler: HookHandler<HookPayloads[Hooks.GET_INSPECTOR_STATE], TContext>) => any;
    editInspectorState: (handler: HookHandler<HookPayloads[Hooks.EDIT_INSPECTOR_STATE], TContext>) => any;
    setPluginSettings: (handler: HookHandler<HookPayloads[Hooks.SET_PLUGIN_SETTINGS], TContext>) => any;
}
