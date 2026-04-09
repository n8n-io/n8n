import React, { ReactNode, FC, Component, ReactElement } from 'react';
import { Channel, Listener as Listener$1 } from '@storybook/core/channels';
export { Listener as ChannelListener } from '@storybook/core/channels';
import { RouterData, NavigateOptions } from '@storybook/core/router';
import { Addon_Types, Addon_TypesEnum, Addon_Collection, Addon_TypesMapping, Addon_BaseType, Addon_SidebarTopType, Addon_SidebarBottomType, Addon_TestProviderType, Addon_PageType, Addon_WrapperType, Addon_Config, API_ProviderData, API_StateMerger, API_Provider, StoryId, Globals, GlobalTypes, API_Layout, API_UI, API_PanelPositions, API_Notification, API_IframeRenderer, API_Refs, API_ComposedRef, API_SetRefData, API_ComposedRefUpdate, API_Settings, API_LoadedRefData, API_PreparedStoryIndex, API_ViewMode, API_StatusState, API_FilterFunction, API_HashEntry, API_LeafEntry, API_StoryEntry, Args, API_IndexHash, API_StatusObject, API_StatusUpdate, API_DocsEntry, API_Versions, API_UnknownEntries, API_Version, API_OptionsData, Parameters, ArgTypes } from '@storybook/core/types';
export { Addon_Type as Addon, API_ComponentEntry as ComponentEntry, API_ComposedRef as ComposedRef, API_DocsEntry as DocsEntry, API_GroupEntry as GroupEntry, API_HashEntry as HashEntry, API_IndexHash as IndexHash, API_LeafEntry as LeafEntry, API_Refs as Refs, API_RootEntry as RootEntry, API_IndexHash as StoriesHash, API_StoryEntry as StoryEntry } from '@storybook/core/types';
import { TestProviders, TestProviderState, TestProviderId, WhatsNewData } from '@storybook/core/core-events';
import { ThemeVars } from '@storybook/core/theming';
import { toId } from '@storybook/core/csf';

declare function mockChannel(): Channel;

declare class AddonStore {
    constructor();
    private loaders;
    private elements;
    private config;
    private channel;
    private promise;
    private resolve;
    getChannel: () => Channel;
    ready: () => Promise<Channel>;
    hasChannel: () => boolean;
    setChannel: (channel: Channel) => void;
    getElements<T extends Addon_Types | Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_SIDEBAR_BOTTOM | Addon_TypesEnum.experimental_SIDEBAR_TOP | Addon_TypesEnum.experimental_TEST_PROVIDER>(type: T): Addon_Collection<Addon_TypesMapping[T]> | any;
    /**
     * Adds an addon to the addon store.
     *
     * @param {string} id - The id of the addon.
     * @param {Addon_Type} addon - The addon to add.
     * @returns {void}
     */
    add(id: string, addon: Addon_BaseType | Omit<Addon_SidebarTopType, 'id'> | Omit<Addon_SidebarBottomType, 'id'> | Omit<Addon_TestProviderType, 'id'> | Omit<Addon_PageType, 'id'> | Omit<Addon_WrapperType, 'id'>): void;
    setConfig: (value: Addon_Config) => void;
    getConfig: () => Addon_Config;
    /**
     * Registers an addon loader function.
     *
     * @param {string} id - The id of the addon loader.
     * @param {(api: API) => void} callback - The function that will be called to register the addon.
     * @returns {void}
     */
    register: (id: string, callback: (api: API) => void) => void;
    loadAddons: (api: any) => void;
    experimental_getRegisteredAddons(): string[];
}
declare const addons: AddonStore;

type GetState = () => State;
type SetState = (a: any, b: any) => any;
interface Upstream {
    getState: GetState;
    setState: SetState;
}
type Patch = Partial<State>;
type InputFnPatch = (s: State) => Patch;
type InputPatch = Patch | InputFnPatch;
interface Options {
    persistence: 'none' | 'session' | string;
}
type CallBack = (s: State) => void;
declare class Store {
    upstreamGetState: GetState;
    upstreamSetState: SetState;
    constructor({ setState, getState }: Upstream);
    getInitialState(base: State): any;
    getState(): State;
    setState(inputPatch: InputPatch, options?: Options): Promise<State>;
    setState(inputPatch: InputPatch, callback?: CallBack, options?: Options): Promise<State>;
}

type ModuleFn<APIType = unknown, StateType = unknown> = (m: ModuleArgs, options?: any) => {
    init?: () => void | Promise<void>;
    api: APIType;
    state: StateType;
};
type ModuleArgs = RouterData & API_ProviderData<API> & {
    mode?: 'production' | 'development';
    state: State;
    fullAPI: API;
    store: Store;
};

interface SubAPI$d {
    /**
     * Returns a collection of elements of a specific type.
     *
     * @template T - The type of the elements in the collection.
     * @param {Addon_Types | Addon_TypesEnum.experimental_PAGE} type - The type of the elements to
     *   retrieve.
     * @returns {Addon_Collection<T>} - A collection of elements of the specified type.
     * @protected This is used internally in storybook's manager.
     */
    getElements: <T extends Addon_Types | Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_SIDEBAR_BOTTOM | Addon_TypesEnum.experimental_TEST_PROVIDER | Addon_TypesEnum.experimental_SIDEBAR_TOP = Addon_Types>(type: T) => Addon_Collection<Addon_TypesMapping[T]>;
    /**
     * Returns the id of the currently selected panel.
     *
     * @returns {string} - The ID of the currently selected panel.
     */
    getSelectedPanel: () => string;
    /**
     * Sets the currently selected panel via it's ID.
     *
     * @param {string} panelName - The ID of the panel to select.
     * @returns {void}
     */
    setSelectedPanel: (panelName: string) => void;
    /**
     * Sets the state of an addon with the given ID.
     *
     * @deprecated This API might get dropped, if you are using this, please file an issue.
     * @template S - The type of the addon state.
     * @param {string} addonId - The ID of the addon to set the state for.
     * @param {S | API_StateMerger<S>} newStateOrMerger - The new state to set, or a function which
     *   receives the current state and returns the new state.
     * @param {Options} [options] - Optional options for the state update.
     * @returns {Promise<S>} - A promise that resolves with the new state after it has been set.
     */
    setAddonState<S>(addonId: string, newStateOrMerger: S | API_StateMerger<S>, options?: Options): Promise<S>;
    /**
     * Returns the state of an addon with the given ID.
     *
     * @deprecated This API might get dropped, if you are using this, please file an issue.
     * @template S - The type of the addon state.
     * @param {string} addonId - The ID of the addon to get the state for.
     * @returns {S} - The state of the addon with the given ID.
     */
    getAddonState<S>(addonId: string): S;
}

interface SubAPI$c {
    /**
     * Returns the channel object.
     *
     * @protected Please do not use, it's for internal use only.
     */
    getChannel: () => API_Provider<API>['channel'];
    /**
     * Adds a listener to the channel for the given event type. Returns a function that can be called
     * to remove the listener.
     *
     * @param type - The event type to listen for. If using a core event, import it from
     *   `@storybook/core-events`.
     * @param handler - The callback function to be called when the event is emitted.
     * @returns A function that can be called to remove the listener.
     */
    on: (type: string, handler: Listener$1) => () => void;
    /**
     * Removes a listener from the channel for the given event type.
     *
     * @param type - The event type to remove the listener from. If using a core event, import it from
     *   `@storybook/core-events`.
     * @param handler - The callback function to be removed.
     */
    off: (type: string, handler: Listener$1) => void;
    /**
     * Emits an event on the channel for the given event type.
     *
     * @param type - The event type to emit. If using a core event, import it from
     *   `@storybook/core-events`.
     * @param args - The arguments to pass to the event listener.
     */
    emit: (type: string, ...args: any[]) => void;
    /**
     * Adds a one-time listener to the channel for the given event type.
     *
     * @param type - The event type to listen for. If using a core event, import it from
     *   `@storybook/core-events`.
     * @param handler - The callback function to be called when the event is emitted.
     */
    once: (type: string, handler: Listener$1) => void;
}

type SubState$a = {
    testProviders: TestProviders;
};
interface RunOptions {
    entryId?: StoryId;
}
type SubAPI$b = {
    getTestProviderState(id: string): TestProviderState | undefined;
    updateTestProviderState(id: TestProviderId, update: Partial<TestProviderState>): void;
    clearTestProviderState(id: TestProviderId): void;
    runTestProvider(id: TestProviderId, options?: RunOptions): () => void;
    cancelTestProvider(id: TestProviderId): void;
};

interface SubState$9 {
    globals?: Globals;
    userGlobals?: Globals;
    storyGlobals?: Globals;
    globalTypes?: GlobalTypes;
}
interface SubAPI$a {
    /**
     * Returns the current globals, which is the user globals overlaid with the story globals
     *
     * @returns {Globals} The current globals.
     */
    getGlobals: () => Globals;
    /**
     * Returns the current globals, as set by the user (a story may have override values)
     *
     * @returns {Globals} The current user globals.
     */
    getUserGlobals: () => Globals /**
     * /** Returns the current globals, as set by the story
     *
     * @returns {Globals} The current story globals.
     */;
    getStoryGlobals: () => Globals /**
     * Returns the globalTypes, as defined at the project level.
     *
     * @returns {GlobalTypes} The globalTypes.
     */;
    getGlobalTypes: () => GlobalTypes;
    /**
     * Updates the current globals with the provided new globals.
     *
     * @param {Globals} newGlobals - The new globals to update with.
     * @returns {void}
     */
    updateGlobals: (newGlobals: Globals) => void;
}

interface SubState$8 {
    layout: API_Layout;
    ui: API_UI;
    selectedPanel: string | undefined;
    theme: ThemeVars;
}
interface SubAPI$9 {
    /**
     * Toggles the fullscreen mode of the Storybook UI.
     *
     * @param toggled - Optional boolean value to set the fullscreen mode to. If not provided, it will
     *   toggle the current state.
     */
    toggleFullscreen: (toggled?: boolean) => void;
    /**
     * Toggles the visibility of the panel in the Storybook UI.
     *
     * @param toggled - Optional boolean value to set the panel visibility to. If not provided, it
     *   will toggle the current state.
     */
    togglePanel: (toggled?: boolean) => void;
    /**
     * Toggles the position of the panel in the Storybook UI.
     *
     * @param position - Optional string value to set the panel position to. If not provided, it will
     *   toggle between 'bottom' and 'right'.
     */
    togglePanelPosition: (position?: API_PanelPositions) => void;
    /**
     * Toggles the visibility of the navigation bar in the Storybook UI.
     *
     * @param toggled - Optional boolean value to set the navigation bar visibility to. If not
     *   provided, it will toggle the current state.
     */
    toggleNav: (toggled?: boolean) => void;
    /**
     * Toggles the visibility of the toolbar in the Storybook UI.
     *
     * @param toggled - Optional boolean value to set the toolbar visibility to. If not provided, it
     *   will toggle the current state.
     */
    toggleToolbar: (toggled?: boolean) => void;
    /**
     * Sets the options for the Storybook UI.
     *
     * @param options - An object containing the options to set.
     */
    setOptions: (options: any) => void;
    /** Sets the sizes of the resizable elements in the layout. */
    setSizes: (options: Partial<Pick<API_Layout, 'navSize' | 'bottomPanelHeight' | 'rightPanelWidth'>>) => void;
    /** GetIsFullscreen - Returns the current fullscreen mode of the Storybook UI. */
    getIsFullscreen: () => boolean;
    /** GetIsPanelShown - Returns the current visibility of the panel in the Storybook UI. */
    getIsPanelShown: () => boolean;
    /** GetIsNavShown - Returns the current visibility of the navigation bar in the Storybook UI. */
    getIsNavShown: () => boolean;
}

interface SubState$7 {
    notifications: API_Notification[];
}
/** The API for managing notifications. */
interface SubAPI$8 {
    /**
     * Adds a new notification to the list of notifications. If a notification with the same ID
     * already exists, it will be replaced.
     *
     * @param notification - The notification to add.
     */
    addNotification: (notification: API_Notification) => void;
    /**
     * Removes a notification from the list of notifications and calls the onClear callback.
     *
     * @param id - The ID of the notification to remove.
     */
    clearNotification: (id: string) => void;
}

interface SubAPI$7 {
    renderPreview?: API_IframeRenderer;
}

interface SubState$6 {
    refs: API_Refs;
}
interface SubAPI$6 {
    /**
     * Finds a composed ref by its source.
     *
     * @param {string} source - The source/URL of the composed ref.
     * @returns {API_ComposedRef} - The composed ref object.
     */
    findRef: (source: string) => API_ComposedRef;
    /**
     * Sets a composed ref by its ID and data.
     *
     * @param {string} id - The ID of the composed ref.
     * @param {API_SetRefData} data - The data to set for the composed ref.
     * @param {boolean} [ready] - Whether the composed ref is ready.
     */
    setRef: (id: string, data: API_SetRefData, ready?: boolean) => void;
    /**
     * Updates a composed ref by its ID and update object.
     *
     * @param {string} id - The ID of the composed ref.
     * @param {API_ComposedRefUpdate} ref - The update object for the composed ref.
     */
    updateRef: (id: string, ref: API_ComposedRefUpdate) => Promise<void>;
    /**
     * Gets all composed refs.
     *
     * @returns {API_Refs} - The composed refs object.
     */
    getRefs: () => API_Refs;
    /**
     * Checks if a composed ref is valid.
     *
     * @param {API_SetRefData} ref - The composed ref to check.
     * @returns {Promise<void>} - A promise that resolves when the check is complete.
     */
    checkRef: (ref: API_SetRefData) => Promise<void>;
    /**
     * Changes the version of a composed ref by its ID and URL.
     *
     * @param {string} id - The ID of the composed ref.
     * @param {string} url - The new URL for the composed ref.
     */
    changeRefVersion: (id: string, url: string) => Promise<void>;
    /**
     * Changes the state of a composed ref by its ID and previewInitialized flag.
     *
     * @param {string} id - The ID of the composed ref.
     * @param {boolean} previewInitialized - The new previewInitialized flag for the composed ref.
     */
    changeRefState: (id: string, previewInitialized: boolean) => void;
}

interface SubAPI$5 {
    storeSelection: () => void;
    retrieveSelection: () => StoryId;
    /**
     * Changes the active settings tab.
     *
     * @example
     *
     * ```ts
     * changeSettingsTab(`about`);
     * ```
     *
     * @param path - The path of the settings page to navigate to. The path NOT should include the
     *   `/settings` prefix.
     */
    changeSettingsTab: (path: string) => void;
    /** Closes the settings screen and returns to the last tracked story or the first story. */
    closeSettings: () => void;
    /**
     * Checks if the settings screen is currently active.
     *
     * @returns A boolean indicating whether the settings screen is active.
     */
    isSettingsScreenActive: () => boolean;
}
interface SubState$5 {
    settings: API_Settings;
}

declare const isMacLike: () => boolean;
declare const controlOrMetaSymbol: () => "⌘" | "ctrl";
declare const controlOrMetaKey: () => "control" | "meta";
declare const optionOrAltSymbol: () => "⌥" | "alt";
declare const isShortcutTaken: (arr1: string[], arr2: string[]) => boolean;
type KeyboardEventLike = Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'key' | 'code' | 'keyCode' | 'preventDefault'>;
declare const eventToShortcut: (e: KeyboardEventLike) => (string | string[])[] | null;
declare const shortcutMatchesShortcut: (inputShortcut: (string | string[])[], shortcut: API_KeyCollection) => boolean;
declare const eventMatchesShortcut: (e: KeyboardEventLike, shortcut: API_KeyCollection) => boolean;
declare const keyToSymbol: (key: string) => string;
declare const shortcutToHumanString: (shortcut: API_KeyCollection) => string;

interface SubState$4 {
    shortcuts: API_Shortcuts;
}
interface SubAPI$4 {
    /** Returns the current shortcuts. */
    getShortcutKeys(): API_Shortcuts;
    /** Returns the default shortcuts. */
    getDefaultShortcuts(): API_Shortcuts | API_AddonShortcutDefaults;
    /** Returns the shortcuts for addons. */
    getAddonsShortcuts(): API_AddonShortcuts;
    /** Returns the labels for addon shortcuts. */
    getAddonsShortcutLabels(): API_AddonShortcutLabels;
    /** Returns the default shortcuts for addons. */
    getAddonsShortcutDefaults(): API_AddonShortcutDefaults;
    /**
     * Sets the shortcuts to the given value.
     *
     * @param shortcuts The new shortcuts to set.
     * @returns A promise that resolves to the new shortcuts.
     */
    setShortcuts(shortcuts: API_Shortcuts): Promise<API_Shortcuts>;
    /**
     * Sets the shortcut for the given action to the given value.
     *
     * @param action The action to set the shortcut for.
     * @param value The new shortcut to set.
     * @returns A promise that resolves to the new shortcut.
     */
    setShortcut(action: API_Action, value: API_KeyCollection): Promise<API_KeyCollection>;
    /**
     * Sets the shortcut for the given addon to the given value.
     *
     * @param addon The addon to set the shortcut for.
     * @param shortcut The new shortcut to set.
     * @returns A promise that resolves to the new addon shortcut.
     */
    setAddonShortcut(addon: string, shortcut: API_AddonShortcut): Promise<API_AddonShortcut>;
    /**
     * Restores all default shortcuts.
     *
     * @returns A promise that resolves to the new shortcuts.
     */
    restoreAllDefaultShortcuts(): Promise<API_Shortcuts>;
    /**
     * Restores the default shortcut for the given action.
     *
     * @param action The action to restore the default shortcut for.
     * @returns A promise that resolves to the new shortcut.
     */
    restoreDefaultShortcut(action: API_Action): Promise<API_KeyCollection>;
    /**
     * Handles a keydown event.
     *
     * @param event The event to handle.
     */
    handleKeydownEvent(event: KeyboardEventLike): void;
    /**
     * Handles a shortcut feature.
     *
     * @param feature The feature to handle.
     * @param event The event to handle.
     */
    handleShortcutFeature(feature: API_Action, event: KeyboardEventLike): void;
}
type API_KeyCollection = string[];
interface API_Shortcuts {
    fullScreen: API_KeyCollection;
    togglePanel: API_KeyCollection;
    panelPosition: API_KeyCollection;
    toggleNav: API_KeyCollection;
    toolbar: API_KeyCollection;
    search: API_KeyCollection;
    focusNav: API_KeyCollection;
    focusIframe: API_KeyCollection;
    focusPanel: API_KeyCollection;
    prevComponent: API_KeyCollection;
    nextComponent: API_KeyCollection;
    prevStory: API_KeyCollection;
    nextStory: API_KeyCollection;
    shortcutsPage: API_KeyCollection;
    aboutPage: API_KeyCollection;
    escape: API_KeyCollection;
    collapseAll: API_KeyCollection;
    expandAll: API_KeyCollection;
    remount: API_KeyCollection;
}
type API_Action = keyof API_Shortcuts;
interface API_AddonShortcut {
    label: string;
    defaultShortcut: API_KeyCollection;
    actionName: string;
    showInMenu?: boolean;
    action: (...args: any[]) => any;
}
type API_AddonShortcuts = Record<string, API_AddonShortcut>;
type API_AddonShortcutLabels = Record<string, string>;
type API_AddonShortcutDefaults = Record<string, API_KeyCollection>;

type Direction = -1 | 1;
type ParameterName = string;
type StoryUpdate = Partial<Pick<API_StoryEntry, 'prepared' | 'parameters' | 'initialArgs' | 'argTypes' | 'args'>>;
type DocsUpdate = Partial<Pick<API_DocsEntry, 'prepared' | 'parameters'>>;
interface SubState$3 extends API_LoadedRefData {
    storyId: StoryId;
    internal_index?: API_PreparedStoryIndex;
    viewMode: API_ViewMode;
    status: API_StatusState;
    filters: Record<string, API_FilterFunction>;
}
interface SubAPI$3 {
    /**
     * The `storyId` method is a reference to the `toId` function from `@storybook/csf`, which is used
     * to generate a unique ID for a story. This ID is used to identify a specific story in the
     * Storybook index.
     *
     * @type {typeof toId}
     */
    storyId: typeof toId;
    /**
     * Resolves a story, docs, component or group ID to its corresponding hash entry in the index.
     *
     * @param {StoryId} storyId - The ID of the story to resolve.
     * @param {string} [refsId] - The ID of the refs to use for resolving the story.
     * @returns {API_HashEntry} - The hash entry corresponding to the given story ID.
     */
    resolveStory: (storyId: StoryId, refsId?: string) => API_HashEntry | undefined;
    /**
     * Selects the first story to display in the Storybook UI.
     *
     * @returns {void}
     */
    selectFirstStory: () => void;
    /**
     * Selects a story to display in the Storybook UI.
     *
     * @param {string} [kindOrId] - The kind or ID of the story to select.
     * @param {StoryId} [story] - The ID of the story to select.
     * @param {Object} [obj] - An optional object containing additional options.
     * @param {string} [obj.ref] - The ref ID of the story to select.
     * @param {API_ViewMode} [obj.viewMode] - The view mode to display the story in.
     * @returns {void}
     */
    selectStory: (kindOrId?: string, story?: StoryId, obj?: {
        ref?: string;
        viewMode?: API_ViewMode;
    }) => void;
    /**
     * Returns the current story's data, including its ID, kind, name, and parameters.
     *
     * @returns {API_LeafEntry} The current story's data.
     */
    getCurrentStoryData: () => API_LeafEntry;
    /**
     * Sets the prepared story index to the given value.
     *
     * @param {API_PreparedStoryIndex} index - The prepared story index to set.
     * @returns {Promise<void>} A promise that resolves when the prepared story index has been set.
     */
    setIndex: (index: API_PreparedStoryIndex) => Promise<void>;
    /**
     * Jumps to the next or previous component in the index.
     *
     * @param {Direction} direction - The direction to jump. Use -1 to jump to the previous component,
     *   and 1 to jump to the next component.
     * @returns {void}
     */
    jumpToComponent: (direction: Direction) => void;
    /**
     * Jumps to the next or previous story in the story index.
     *
     * @param {Direction} direction - The direction to jump. Use -1 to jump to the previous story, and
     *   1 to jump to the next story.
     * @returns {void}
     */
    jumpToStory: (direction: Direction) => void;
    /**
     * Returns the data for the given story ID and optional ref ID.
     *
     * @param {StoryId} storyId - The ID of the story to retrieve data for.
     * @param {string} [refId] - The ID of the ref to retrieve data for. If not provided, retrieves
     *   data for the default ref.
     * @returns {API_LeafEntry} The data for the given story ID and optional ref ID.
     */
    getData: (storyId: StoryId, refId?: string) => API_LeafEntry;
    /**
     * Returns a boolean indicating whether the given story ID and optional ref ID have been prepared.
     *
     * @param {StoryId} storyId - The ID of the story to check.
     * @param {string} [refId] - The ID of the ref to check. If not provided, checks all refs for the
     *   given story ID.
     * @returns {boolean} A boolean indicating whether the given story ID and optional ref ID have
     *   been prepared.
     */
    isPrepared: (storyId: StoryId, refId?: string) => boolean;
    /**
     * Returns the parameters for the given story ID and optional ref ID.
     *
     * @param {StoryId | { storyId: StoryId; refId: string }} storyId - The ID of the story to
     *   retrieve parameters for, or an object containing the story ID and ref ID.
     * @param {ParameterName} [parameterName] - The name of the parameter to retrieve. If not
     *   provided, returns all parameters.
     * @returns {API_StoryEntry['parameters'] | any} The parameters for the given story ID and
     *   optional ref ID.
     */
    getParameters: (storyId: StoryId | {
        storyId: StoryId;
        refId: string;
    }, parameterName?: ParameterName) => API_StoryEntry['parameters'] | any;
    /**
     * Returns the current value of the specified parameter for the currently selected story.
     *
     * @template S - The type of the parameter value.
     * @param {ParameterName} [parameterName] - The name of the parameter to retrieve. If not
     *   provided, returns all parameters.
     * @returns {S} The value of the specified parameter for the currently selected story.
     */
    getCurrentParameter<S>(parameterName?: ParameterName): S;
    /**
     * Updates the arguments for the given story with the provided new arguments.
     *
     * @param {API_StoryEntry} story - The story to update the arguments for.
     * @param {Args} newArgs - The new arguments to set for the story.
     * @returns {void}
     */
    updateStoryArgs(story: API_StoryEntry, newArgs: Args): void;
    /**
     * Resets the arguments for the given story to their initial values.
     *
     * @param {API_StoryEntry} story - The story to reset the arguments for.
     * @param {string[]} [argNames] - An optional array of argument names to reset. If not provided,
     *   all arguments will be reset.
     * @returns {void}
     */
    resetStoryArgs: (story: API_StoryEntry, argNames?: string[]) => void;
    /**
     * Finds the leaf entry for the given story ID in the given story index.
     *
     * @param {API_IndexHash} index - The story index to search for the leaf entry in.
     * @param {StoryId} storyId - The ID of the story to find the leaf entry for.
     * @returns {API_LeafEntry} The leaf entry for the given story ID, or null if no leaf entry was
     *   found.
     */
    findLeafEntry(index: API_IndexHash, storyId: StoryId): API_LeafEntry;
    /**
     * Finds the leaf story ID for the given component or group ID in the given index.
     *
     * @param {API_IndexHash} index - The story index to search for the leaf story ID in.
     * @param {StoryId} storyId - The ID of the story to find the leaf story ID for.
     * @returns {StoryId} The ID of the leaf story, or null if no leaf story was found.
     */
    findLeafStoryId(index: API_IndexHash, storyId: StoryId): StoryId;
    /**
     * Finds the ID of the sibling story in the given direction for the given story ID in the given
     * story index.
     *
     * @param {StoryId} storyId - The ID of the story to find the sibling of.
     * @param {API_IndexHash} index - The story index to search for the sibling in.
     * @param {Direction} direction - The direction to search for the sibling in.
     * @param {boolean} toSiblingGroup - When true, skips over leafs within the same group.
     * @returns {StoryId} The ID of the sibling story, or null if no sibling was found.
     */
    findSiblingStoryId(storyId: StoryId, index: API_IndexHash, direction: Direction, toSiblingGroup: boolean): StoryId;
    /**
     * Fetches the story index from the server.
     *
     * @returns {Promise<void>} A promise that resolves when the index has been fetched.
     */
    fetchIndex: () => Promise<void>;
    /**
     * Updates the story with the given ID with the provided update object.
     *
     * @param {StoryId} storyId - The ID of the story to update.
     * @param {StoryUpdate} update - An object containing the updated story information.
     * @param {API_ComposedRef} [ref] - The composed ref of the story to update.
     * @returns {Promise<void>} A promise that resolves when the story has been updated.
     */
    updateStory: (storyId: StoryId, update: StoryUpdate, ref?: API_ComposedRef) => Promise<void>;
    /**
     * Updates the documentation for the given story ID with the given update object.
     *
     * @param {StoryId} storyId - The ID of the story to update.
     * @param {DocsUpdate} update - An object containing the updated documentation information.
     * @param {API_ComposedRef} [ref] - The composed ref of the story to update.
     * @returns {Promise<void>} A promise that resolves when the documentation has been updated.
     */
    updateDocs: (storyId: StoryId, update: DocsUpdate, ref?: API_ComposedRef) => Promise<void>;
    /**
     * Sets the preview as initialized.
     *
     * @param {ComposedRef} [ref] - The composed ref of the story to set as initialized.
     * @returns {Promise<void>} A promise that resolves when the preview has been set as initialized.
     */
    setPreviewInitialized: (ref?: API_ComposedRef) => Promise<void>;
    /**
     * Returns the current status of the stories.
     *
     * @returns {API_StatusState} The current status of the stories.
     */
    getCurrentStoryStatus: () => Record<string, API_StatusObject>;
    /**
     * Updates the status of a collection of stories.
     *
     * @param {string} addonId - The ID of the addon to update.
     * @param {StatusUpdate} update - An object containing the updated status information.
     * @returns {Promise<void>} A promise that resolves when the status has been updated.
     */
    experimental_updateStatus: (addonId: string, update: API_StatusUpdate | ((state: API_StatusState) => API_StatusUpdate)) => Promise<void>;
    /**
     * Updates the filtering of the index.
     *
     * @param {string} addonId - The ID of the addon to update.
     * @param {API_FilterFunction} filterFunction - A function that returns a boolean based on the
     *   story, index and status.
     * @returns {Promise<void>} A promise that resolves when the state has been updated.
     */
    experimental_setFilter: (addonId: string, filterFunction: API_FilterFunction) => Promise<void>;
}

interface SubState$2 {
    customQueryParams: QueryParams;
}
interface QueryParams {
    [key: string]: string | undefined;
}
/** SubAPI for managing URL navigation and state. */
interface SubAPI$2 {
    /**
     * Navigate to a new URL.
     *
     * @param {string} url - The URL to navigate to.
     * @param {NavigateOptions} options - Options for the navigation.
     * @returns {void}
     */
    navigateUrl: (url: string, options: NavigateOptions) => void;
    /**
     * Get the value of a query parameter from the current URL.
     *
     * @param {string} key - The key of the query parameter to get.
     * @returns {string | undefined} The value of the query parameter, or undefined if it does not
     *   exist.
     */
    getQueryParam: (key: string) => string | undefined;
    /**
     * Returns an object containing the current state of the URL.
     *
     * @returns {{
     *   queryParams: QueryParams;
     *   path: string;
     *   viewMode?: string;
     *   storyId?: string;
     *   url: string;
     * }}
     *   An object containing the current state of the URL.
     */
    getUrlState: () => {
        queryParams: QueryParams;
        path: string;
        hash: string;
        viewMode?: string;
        storyId?: string;
        url: string;
    };
    /**
     * Set the query parameters for the current URL.
     *
     * @param {QueryParams} input - An object containing the query parameters to set.
     * @returns {void}
     */
    setQueryParams: (input: QueryParams) => void;
    /**
     * Set the query parameters for the current URL & navigates.
     *
     * @param {QueryParams} input - An object containing the query parameters to set.
     * @param {NavigateOptions} options - Options for the navigation.
     * @returns {void}
     */
    applyQueryParams: (input: QueryParams, options?: NavigateOptions) => void;
}

interface SubState$1 {
    versions: API_Versions & API_UnknownEntries;
    lastVersionCheck: number;
    dismissedVersionNotification: undefined | string;
}
interface SubAPI$1 {
    /**
     * Returns the current version of the Storybook Manager.
     *
     * @returns {API_Version} The current version of the Storybook Manager.
     */
    getCurrentVersion: () => API_Version;
    /**
     * Returns the latest version of the Storybook Manager.
     *
     * @returns {API_Version} The latest version of the Storybook Manager.
     */
    getLatestVersion: () => API_Version;
    /**
     * Returns the URL of the Storybook documentation for the current version.
     *
     * @returns {string} The URL of the Storybook Manager documentation.
     */
    getDocsUrl: (options: {
        subpath?: string;
        versioned?: boolean;
        renderer?: boolean;
    }) => string;
    /**
     * Checks if an update is available for the Storybook Manager.
     *
     * @returns {boolean} True if an update is available, false otherwise.
     */
    versionUpdateAvailable: () => boolean;
}

type SubState = {
    whatsNewData?: WhatsNewData;
};
type SubAPI = {
    isWhatsNewUnread(): boolean;
    whatsNewHasBeenRead(): void;
    toggleWhatsNewNotifications(): void;
};

declare class RequestResponseError<Payload extends Record<string, any> | void> extends Error {
    payload: Payload | undefined;
    constructor(message: string, payload?: Payload);
}
declare const experimental_requestResponse: <RequestPayload, ResponsePayload = void, CreateNewStoryErrorPayload extends Record<string, any> | void = void>(channel: Channel, requestEvent: string, responseEvent: string, payload: RequestPayload, timeout?: number) => Promise<ResponsePayload>;

declare const _default: <TObj = any>(a: TObj, ...b: Partial<TObj>[]) => TObj;

type EnvironmentType = (typeof UniversalStore.Environment)[keyof typeof UniversalStore.Environment];
type StatusType = (typeof UniversalStore.Status)[keyof typeof UniversalStore.Status];
type StateUpdater<TState> = (prevState: TState) => TState;
type Actor = {
    id: string;
    type: (typeof UniversalStore.ActorType)[keyof typeof UniversalStore.ActorType];
    environment: EnvironmentType;
};
type EventInfo = {
    actor: Actor;
    forwardingActor?: Actor;
};
type Listener<TEvent> = (event: TEvent, eventInfo: EventInfo) => void;
type BaseEvent = {
    type: string;
    payload?: any;
};
interface SetStateEvent<TState> extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.SET_STATE;
    payload: {
        state: TState;
        previousState: TState;
    };
}
interface ExistingStateRequestEvent extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.EXISTING_STATE_REQUEST;
    payload: never;
}
interface ExistingStateResponseEvent<TState> extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE;
    payload: TState;
}
interface LeaderCreatedEvent extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.LEADER_CREATED;
    payload: never;
}
interface FollowerCreatedEvent extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.FOLLOWER_CREATED;
    payload: never;
}
type InternalEvent<TState> = SetStateEvent<TState> | ExistingStateRequestEvent | ExistingStateResponseEvent<TState> | FollowerCreatedEvent | LeaderCreatedEvent;
type Event<TState, TEvent extends BaseEvent> = TEvent | InternalEvent<TState>;
type ChannelLike = Pick<Channel, 'on' | 'off' | 'emit'>;
type StoreOptions<TState> = {
    id: string;
    leader?: boolean;
    initialState?: TState;
    debug?: boolean;
};
type EnvironmentOverrides = {
    channel: ChannelLike;
    environment: EnvironmentType;
};

/**
 * A universal store implementation that synchronizes state across different environments using a
 * channel-based communication.
 *
 * The store follows a leader-follower pattern where:
 *
 * - Leader: The main store instance that owns and manages the state
 * - Follower: Store instances that mirror the leader's state
 *
 * Features:
 *
 * - State synchronization across environments
 * - Event-based communication
 * - Type-safe state and custom events
 * - Subscription system for state changes and custom events
 *
 * @remarks
 * - The store must be created using the static `create()` method, not the constructor
 * - Follower stores will automatically sync with their leader's state. If they have initial state, it
 *   will be replaced immediately when it has synced with the leader.
 *
 * @example
 *
 * ```typescript
 * interface MyState {
 *   count: number;
 * }
 * interface MyCustomEvent {
 *   type: 'INCREMENT';
 *   payload: number;
 * }
 *
 * // Create a leader store
 * const leaderStore = UniversalStore.create<MyState, MyCustomEvent>({
 *   id: 'my-store',
 *   leader: true,
 *   initialState: { count: 0 },
 * });
 *
 * // Create a follower store
 * const followerStore = UniversalStore.create<MyState, MyCustomEvent>({
 *   id: 'my-store',
 *   leader: false,
 * });
 * ```
 *
 * @template State - The type of state managed by the store
 * @template CustomEvent - Custom events that can be sent through the store. Must have a `type`
 *   string and optional `payload`
 * @throws {Error} If constructed directly instead of using `create()`
 * @throws {Error} If created without setting a channel first
 * @throws {Error} If a follower is created with initial state
 * @throws {Error} If a follower cannot find its leader within 1 second
 */
declare class UniversalStore<State, CustomEvent extends {
    type: string;
    payload?: any;
} = {
    type: string;
    payload?: any;
}> {
    /**
     * Defines the possible actor types in the store system
     *
     * @readonly
     */
    static readonly ActorType: {
        readonly LEADER: "LEADER";
        readonly FOLLOWER: "FOLLOWER";
    };
    /**
     * Defines the possible environments the store can run in
     *
     * @readonly
     */
    static readonly Environment: {
        readonly SERVER: "SERVER";
        readonly MANAGER: "MANAGER";
        readonly PREVIEW: "PREVIEW";
        readonly UNKNOWN: "UNKNOWN";
        readonly MOCK: "MOCK";
    };
    /**
     * Internal event types used for store synchronization
     *
     * @readonly
     */
    static readonly InternalEventType: {
        readonly EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST";
        readonly EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE";
        readonly SET_STATE: "__SET_STATE";
        readonly LEADER_CREATED: "__LEADER_CREATED";
        readonly FOLLOWER_CREATED: "__FOLLOWER_CREATED";
    };
    static readonly Status: {
        readonly UNPREPARED: "UNPREPARED";
        readonly SYNCING: "SYNCING";
        readonly READY: "READY";
        readonly ERROR: "ERROR";
    };
    protected static isInternalConstructing: boolean;
    /**
     * The preparation construct is used to keep track of all store's preparation state the promise is
     * resolved when the store is prepared with the static __prepare() method which will also change
     * the state from PENDING to RESOLVED
     */
    private static preparation;
    private static setupPreparationPromise;
    /** Enable debug logs for this store */
    debugging: boolean;
    /** The actor object representing the store instance with a unique ID and a type */
    get actor(): Actor;
    /**
     * The current state of the store, that signals both if the store is prepared by Storybook and
     * also - in the case of a follower - if the state has been synced with the leader's state.
     */
    get status(): StatusType;
    /**
     * A promise that resolves when the store is fully ready. A leader will be ready when the store
     * has been prepared by Storybook, which is almost instantly.
     *
     * A follower will be ready when the state has been synced with the leader's state, within a few
     * hundred milliseconds.
     */
    untilReady(): Promise<[{
        channel: ChannelLike;
        environment: EnvironmentType;
    }, void | undefined]>;
    /**
     * The syncing construct is used to keep track of if the instance's state has been synced with the
     * other instances. A leader will immediately have the promise resolved. A follower will initially
     * be in a PENDING state, and resolve the the leader has sent the existing state, or reject if no
     * leader has responded before the timeout.
     */
    private syncing?;
    private channelEventName;
    private state;
    private channel?;
    private environment?;
    private listeners;
    private id;
    private actorId;
    private actorType;
    protected constructor(options: StoreOptions<State>, environmentOverrides?: EnvironmentOverrides);
    /** Creates a new instance of UniversalStore */
    static create<State = any, CustomEvent extends {
        type: string;
        payload?: any;
    } = {
        type: string;
        payload?: any;
    }>(options: StoreOptions<State>): UniversalStore<State, CustomEvent>;
    /** Gets the current state */
    getState: () => State;
    /**
     * Updates the store's state
     *
     * Either a new state or a state updater function can be passed to the method.
     */
    setState(updater: State | StateUpdater<State>): void;
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    subscribe: {
        (listener: Listener<Event<State, CustomEvent>>): () => void;
        <EventType extends Event<State, CustomEvent>['type']>(eventType: EventType, listener: Listener<Extract<Event<State, CustomEvent>, {
            type: EventType;
        }>>): () => void;
    };
    /**
     * Subscribes to state changes
     *
     * @returns Unsubscribe function
     */
    onStateChange(listener: (state: State, previousState: State, eventInfo: EventInfo) => void): () => void;
    /** Sends a custom event to the other stores */
    send: (event: CustomEvent) => void;
    private emitToChannel;
    private prepareThis;
    private emitToListeners;
    private handleChannelEvents;
    private debug;
}

/**
 * A hook to use a UniversalStore in the manager UI (eg. in an addon panel). This hook will react to
 * changes in the store state and re-render when the store changes.
 *
 * @param universalStore The UniversalStore instance to use.
 * @param selector An optional selector function to select a subset of the store state.
 * @remark This hook is intended for use in the manager UI. For use in the preview, import from
 * `storybook/internal/preview-api` instead.
 */
declare const useUniversalStore: {
    <TUniversalStore extends UniversalStore<TState, any>, TState = TUniversalStore extends UniversalStore<infer S, any> ? S : never>(universalStore: TUniversalStore): [TState, TUniversalStore['setState']];
    <TUniversalStore extends UniversalStore<any, any>, TSelectedState, TState = TUniversalStore extends UniversalStore<infer S, any> ? S : never>(universalStore: TUniversalStore, selector: (state: TState) => TSelectedState): [TSelectedState, TUniversalStore['setState']];
};

/**
 * A mock universal store that can be used when testing code that relies on a universal store. It
 * functions exactly like a normal universal store, with a few exceptions:
 *
 * - It is fully isolated, meaning that it doesn't interact with any channel, and it is always a
 *   leader.
 *
 * If the second testUtils argument is provided, all the public methods are spied on, so they can be
 * asserted.
 *
 * When a mock store is re-used across tests (eg. in stories), you manually need to reset the state
 * after each test.
 *
 * @example
 *
 * ```ts
 * import * as testUtils from '@storybook/test'; // in stories
 * import { vi as testUtils } from 'vitest'; // ... or in Vitest tests
 *
 * const initialState = { ... };
 * const store = new MockUniversalStore({ initialState }, testUtils);
 *
 * export default {
 *   title: 'My story',
 *   beforeEach: () => {
 *     return () => {
 *       store.setState(initialState);
 *     };
 *   }
 * }
 * ```
 */
declare class MockUniversalStore<State, CustomEvent extends {
    type: string;
    payload?: any;
} = {
    type: string;
    payload?: any;
}> extends UniversalStore<State, CustomEvent> {
    private testUtils;
    constructor(options: StoreOptions<State>, testUtils?: any);
    /** Create a mock universal store. This is just an alias for the constructor */
    static create<State = any, CustomEvent extends {
        type: string;
        payload?: any;
    } = {
        type: string;
        payload?: any;
    }>(options: StoreOptions<State>, testUtils?: any): MockUniversalStore<State, CustomEvent>;
    unsubscribeAll(): void;
}

declare const ActiveTabs: {
    SIDEBAR: "sidebar";
    CANVAS: "canvas";
    ADDONS: "addons";
};

declare const ManagerContext: React.Context<{
    api: API;
    state: State;
}>;
type State = SubState$8 & SubState$3 & SubState$6 & SubState$7 & SubState$a & SubState$1 & SubState$2 & SubState$4 & SubState$5 & SubState$9 & SubState & RouterData & API_OptionsData & DeprecatedState & Other;
type API = SubAPI$d & SubAPI$c & SubAPI$7 & SubAPI$3 & SubAPI$6 & SubAPI$a & SubAPI$9 & SubAPI$8 & SubAPI$b & SubAPI$4 & SubAPI$5 & SubAPI$1 & SubAPI$2 & SubAPI & Other;
interface DeprecatedState {
    /** @deprecated Use index */
    storiesHash: API_IndexHash;
    /** @deprecated Use previewInitialized */
    storiesConfigured: boolean;
    /** @deprecated Use indexError */
    storiesFailed?: Error;
}
interface Other {
    [key: string]: any;
}
interface Combo {
    api: API;
    state: State;
}
type ManagerProviderProps = RouterData & API_ProviderData<API> & {
    children: ReactNode | FC<Combo>;
};
declare const combineParameters: (...parameterSets: Parameters[]) => {};
declare class ManagerProvider extends Component<ManagerProviderProps, State> {
    api: API;
    modules: ReturnType<ModuleFn>[];
    static displayName: string;
    constructor(props: ManagerProviderProps);
    static getDerivedStateFromProps(props: ManagerProviderProps, state: State): State;
    shouldComponentUpdate(nextProps: ManagerProviderProps, nextState: State): boolean;
    initModules: () => void;
    render(): React.JSX.Element;
}
interface ManagerConsumerProps<P = unknown> {
    filter?: (combo: Combo) => P;
    children: FC<P> | ReactNode;
}
declare function ManagerConsumer<P = Combo>({ filter, children, }: ManagerConsumerProps<P>): ReactElement;
declare function useStorybookState(): State;
declare function useStorybookApi(): API;

interface API_EventMap {
    [eventId: string]: Listener$1;
}
declare const useChannel: (eventMap: API_EventMap, deps?: any[]) => (type: string, ...args: any[]) => void;
declare function useStoryPrepared(storyId?: StoryId): boolean;
declare function useParameter<S>(parameterKey: string, defaultValue?: S): S;
declare function useSharedState<S>(stateId: string, defaultState?: S): [S, (newStateOrMerger: S | API_StateMerger<S>, options?: Options) => void];
declare function useAddonState<S>(addonId: string, defaultState?: S): [S, (newStateOrMerger: S | API_StateMerger<S>, options?: Options) => void];
declare function useArgs(): [Args, (newArgs: Args) => void, (argNames?: string[]) => void, Args];
declare function useGlobals(): [
    globals: Globals,
    updateGlobals: (newGlobals: Globals) => void,
    storyGlobals: Globals,
    userGlobals: Globals
];
declare function useGlobalTypes(): ArgTypes;
declare function useArgTypes(): ArgTypes;

declare const typesX: typeof Addon_TypesEnum;

export { type API, type API_EventMap, ActiveTabs, AddonStore, type Combo, ManagerConsumer as Consumer, type KeyboardEventLike, ManagerContext, type ManagerProviderProps, ManagerProvider as Provider, RequestResponseError, type State, type Options as StoreOptions, addons, combineParameters, controlOrMetaKey, controlOrMetaSymbol, eventMatchesShortcut, eventToShortcut, MockUniversalStore as experimental_MockUniversalStore, UniversalStore as experimental_UniversalStore, experimental_requestResponse, useUniversalStore as experimental_useUniversalStore, isMacLike, isShortcutTaken, keyToSymbol, _default as merge, mockChannel, optionOrAltSymbol, shortcutMatchesShortcut, shortcutToHumanString, typesX as types, useAddonState, useArgTypes, useArgs, useChannel, useGlobalTypes, useGlobals, useParameter, useSharedState, useStoryPrepared, useStorybookApi, useStorybookState };
