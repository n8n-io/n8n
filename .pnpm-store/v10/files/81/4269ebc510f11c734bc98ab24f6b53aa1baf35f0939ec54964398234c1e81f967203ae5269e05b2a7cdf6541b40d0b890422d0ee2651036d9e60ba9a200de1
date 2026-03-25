import type { ComponentBounds, Hookable } from './hooks.js';
import type { Context } from './context.js';
import type { ComponentInstance, ComponentState, StateBase } from './component.js';
import type { App } from './app.js';
import type { ID } from './util.js';
export interface DevtoolsPluginApi<TSettings> {
    on: Hookable<Context>;
    notifyComponentUpdate: (instance?: ComponentInstance) => void;
    addTimelineLayer: (options: TimelineLayerOptions) => void;
    addTimelineEvent: (options: TimelineEventOptions) => void;
    addInspector: (options: CustomInspectorOptions) => void;
    sendInspectorTree: (inspectorId: string) => void;
    sendInspectorState: (inspectorId: string) => void;
    selectInspectorNode: (inspectorId: string, nodeId: string) => void;
    getComponentBounds: (instance: ComponentInstance) => Promise<ComponentBounds>;
    getComponentName: (instance: ComponentInstance) => Promise<string>;
    getComponentInstances: (app: App) => Promise<ComponentInstance[]>;
    highlightElement: (instance: ComponentInstance) => void;
    unhighlightElement: () => void;
    getSettings: (pluginId?: string) => TSettings;
    now: () => number;
    /**
     * @private
     */
    setSettings: (values: TSettings) => void;
}
export interface AppRecord {
    id: string;
    name: string;
    instanceMap: Map<string, ComponentInstance>;
    rootInstance: ComponentInstance;
}
export interface TimelineLayerOptions<TData = any, TMeta = any> {
    id: string;
    label: string;
    color: number;
    skipScreenshots?: boolean;
    groupsOnly?: boolean;
    ignoreNoDurationGroups?: boolean;
    screenshotOverlayRender?: (event: TimelineEvent<TData, TMeta> & ScreenshotOverlayEvent, ctx: ScreenshotOverlayRenderContext) => ScreenshotOverlayRenderResult | Promise<ScreenshotOverlayRenderResult>;
}
export interface ScreenshotOverlayEvent {
    layerId: string;
    renderMeta: any;
}
export interface ScreenshotOverlayRenderContext<TData = any, TMeta = any> {
    screenshot: ScreenshotData;
    events: (TimelineEvent<TData, TMeta> & ScreenshotOverlayEvent)[];
    index: number;
}
export type ScreenshotOverlayRenderResult = HTMLElement | string | false;
export interface ScreenshotData {
    time: number;
}
export interface TimelineEventOptions {
    layerId: string;
    event: TimelineEvent;
    all?: boolean;
}
export interface TimelineEvent<TData = any, TMeta = any> {
    time: number;
    data: TData;
    logType?: 'default' | 'warning' | 'error';
    meta?: TMeta;
    groupId?: ID;
    title?: string;
    subtitle?: string;
}
export interface TimelineMarkerOptions {
    id: string;
    time: number;
    color: number;
    label: string;
    all?: boolean;
}
export interface CustomInspectorOptions {
    id: string;
    label: string;
    icon?: string;
    treeFilterPlaceholder?: string;
    stateFilterPlaceholder?: string;
    noSelectionText?: string;
    actions?: {
        icon: string;
        tooltip?: string;
        action: () => void | Promise<void>;
    }[];
    nodeActions?: {
        icon: string;
        tooltip?: string;
        action: (nodeId: string) => void | Promise<void>;
    }[];
}
export interface CustomInspectorNode {
    id: string;
    label: string;
    children?: CustomInspectorNode[];
    tags?: InspectorNodeTag[];
}
export interface InspectorNodeTag {
    label: string;
    textColor: number;
    backgroundColor: number;
    tooltip?: string;
}
export interface CustomInspectorState {
    [key: string]: (StateBase | Omit<ComponentState, 'type'>)[];
}
