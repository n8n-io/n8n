import { Report } from 'storybook/preview-api';

interface CreateNewStoryRequestPayload {
    componentFilePath: string;
    componentExportName: string;
    componentIsDefaultExport: boolean;
    componentExportCount: number;
}
interface CreateNewStoryResponsePayload {
    storyId: string;
    storyFilePath: string;
    exportedStoryName: string;
}
type CreateNewStoryErrorPayload = {
    type: 'STORY_FILE_EXISTS';
    kind: string;
};

interface FileComponentSearchRequestPayload {
}
interface FileComponentSearchResponsePayload {
    files: Array<{
        filepath: string;
        storyFileExists: boolean;
        exportedComponents: Array<{
            name: string;
            default: boolean;
        }> | null;
    }> | null;
}

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

interface SBBaseType {
    required?: boolean;
    raw?: string;
}
type SBScalarType = SBBaseType & {
    name: 'boolean' | 'string' | 'number' | 'function' | 'symbol';
};
type SBArrayType = SBBaseType & {
    name: 'array';
    value: SBType;
};
type SBObjectType = SBBaseType & {
    name: 'object';
    value: Record<string, SBType>;
};
type SBEnumType = SBBaseType & {
    name: 'enum';
    value: (string | number)[];
};
type SBIntersectionType = SBBaseType & {
    name: 'intersection';
    value: SBType[];
};
type SBUnionType = SBBaseType & {
    name: 'union';
    value: SBType[];
};
type SBOtherType = SBBaseType & {
    name: 'other';
    value: string;
};
type SBType = SBScalarType | SBEnumType | SBArrayType | SBObjectType | SBIntersectionType | SBUnionType | SBOtherType;

type ControlType = 'object' | 'boolean' | 'check' | 'inline-check' | 'radio' | 'inline-radio' | 'select' | 'multi-select' | 'number' | 'range' | 'file' | 'color' | 'date' | 'text';
type ConditionalTest = {
    truthy?: boolean;
} | {
    exists: boolean;
} | {
    eq: any;
} | {
    neq: any;
};
type ConditionalValue = {
    arg: string;
} | {
    global: string;
};
type Conditional = ConditionalValue & ConditionalTest;
interface ControlBase {
    [key: string]: any;
    /** @see https://storybook.js.org/docs/api/arg-types#controltype */
    type?: ControlType;
    disable?: boolean;
}
type Control = ControlType | false | (ControlBase & (ControlBase | {
    type: 'color';
    /** @see https://storybook.js.org/docs/api/arg-types#controlpresetcolors */
    presetColors?: string[];
} | {
    type: 'file';
    /** @see https://storybook.js.org/docs/api/arg-types#controlaccept */
    accept?: string;
} | {
    type: 'inline-check' | 'radio' | 'inline-radio' | 'select' | 'multi-select';
    /** @see https://storybook.js.org/docs/api/arg-types#controllabels */
    labels?: {
        [options: string]: string;
    };
} | {
    type: 'number' | 'range';
    /** @see https://storybook.js.org/docs/api/arg-types#controlmax */
    max?: number;
    /** @see https://storybook.js.org/docs/api/arg-types#controlmin */
    min?: number;
    /** @see https://storybook.js.org/docs/api/arg-types#controlstep */
    step?: number;
}));
interface InputType {
    /** @see https://storybook.js.org/docs/api/arg-types#control */
    control?: Control;
    /** @see https://storybook.js.org/docs/api/arg-types#description */
    description?: string;
    /** @see https://storybook.js.org/docs/api/arg-types#if */
    if?: Conditional;
    /** @see https://storybook.js.org/docs/api/arg-types#mapping */
    mapping?: {
        [key: string]: any;
    };
    /** @see https://storybook.js.org/docs/api/arg-types#name */
    name?: string;
    /** @see https://storybook.js.org/docs/api/arg-types#options */
    options?: readonly any[];
    /** @see https://storybook.js.org/docs/api/arg-types#table */
    table?: {
        [key: string]: unknown;
        /** @see https://storybook.js.org/docs/api/arg-types#tablecategory */
        category?: string;
        /** @see https://storybook.js.org/docs/api/arg-types#tabledefaultvalue */
        defaultValue?: {
            summary?: string;
            detail?: string;
        };
        /** @see https://storybook.js.org/docs/api/arg-types#tabledisable */
        disable?: boolean;
        /** @see https://storybook.js.org/docs/api/arg-types#tablesubcategory */
        subcategory?: string;
        /** @see https://storybook.js.org/docs/api/arg-types#tabletype */
        type?: {
            summary?: string;
            detail?: string;
        };
    };
    /** @see https://storybook.js.org/docs/api/arg-types#type */
    type?: SBType | SBScalarType['name'];
    /**
     * @deprecated Use `table.defaultValue.summary` instead.
     * @see https://storybook.js.org/docs/api/arg-types#defaultvalue
     */
    defaultValue?: any;
    [key: string]: any;
}
interface Args {
    [name: string]: any;
}
/** @see https://storybook.js.org/docs/api/arg-types#argtypes */
type ArgTypes<TArgs = Args> = {
    [name in keyof TArgs]: InputType;
};

interface ArgTypesRequestPayload {
    storyId: string;
}
interface ArgTypesResponsePayload {
    argTypes: ArgTypes;
}

type RequestData<Payload = void> = {
    id: string;
    payload: Payload;
};
type ResponseData<Payload = void, ErrorPayload extends Record<string, any> | void = void> = {
    id: string;
    success: true;
    error: null;
    payload: Payload;
} | {
    id: string;
    success: false;
    error: string;
    payload?: ErrorPayload;
};

interface SaveStoryRequestPayload {
    args: string | undefined;
    csfId: string;
    importPath: string;
    name?: string;
}
interface SaveStoryResponsePayload {
    csfId: string;
    newStoryId?: string;
    newStoryName?: string;
    newStoryExportName?: string;
    sourceFileContent?: string;
    sourceFileName?: string;
    sourceStoryName?: string;
    sourceStoryExportName?: string;
}

interface WhatsNewCache {
    lastDismissedPost?: string;
    lastReadPost?: string;
}
type WhatsNewData = {
    status: 'SUCCESS';
    title: string;
    url: string;
    blogUrl?: string;
    publishedAt: string;
    excerpt: string;
    postIsRead: boolean;
    showNotification: boolean;
    disableWhatsNewNotifications: boolean;
} | {
    status: 'ERROR';
};

interface StoryFinishedPayload {
    storyId: string;
    status: 'error' | 'success';
    reporters: Report[];
}

type OpenInEditorRequestPayload = {
    file: string;
    line?: number;
    column?: number;
};
type OpenInEditorResponsePayload = {
    file: string;
    line?: number;
    column?: number;
    error: string | null;
};

declare enum events {
    CHANNEL_WS_DISCONNECT = "channelWSDisconnect",
    CHANNEL_CREATED = "channelCreated",
    CONFIG_ERROR = "configError",
    STORY_INDEX_INVALIDATED = "storyIndexInvalidated",
    STORY_SPECIFIED = "storySpecified",
    SET_CONFIG = "setConfig",
    SET_STORIES = "setStories",
    SET_INDEX = "setIndex",
    SET_CURRENT_STORY = "setCurrentStory",
    CURRENT_STORY_WAS_SET = "currentStoryWasSet",
    FORCE_RE_RENDER = "forceReRender",
    FORCE_REMOUNT = "forceRemount",
    PRELOAD_ENTRIES = "preloadStories",
    STORY_PREPARED = "storyPrepared",
    DOCS_PREPARED = "docsPrepared",
    STORY_CHANGED = "storyChanged",
    STORY_UNCHANGED = "storyUnchanged",
    STORY_RENDERED = "storyRendered",
    STORY_FINISHED = "storyFinished",
    STORY_MISSING = "storyMissing",
    STORY_ERRORED = "storyErrored",
    STORY_THREW_EXCEPTION = "storyThrewException",
    STORY_RENDER_PHASE_CHANGED = "storyRenderPhaseChanged",
    STORY_HOT_UPDATED = "storyHotUpdated",
    PLAY_FUNCTION_THREW_EXCEPTION = "playFunctionThrewException",
    UNHANDLED_ERRORS_WHILE_PLAYING = "unhandledErrorsWhilePlaying",
    UPDATE_STORY_ARGS = "updateStoryArgs",
    STORY_ARGS_UPDATED = "storyArgsUpdated",
    RESET_STORY_ARGS = "resetStoryArgs",
    SET_FILTER = "setFilter",
    SET_GLOBALS = "setGlobals",
    UPDATE_GLOBALS = "updateGlobals",
    GLOBALS_UPDATED = "globalsUpdated",
    REGISTER_SUBSCRIPTION = "registerSubscription",
    PREVIEW_INITIALIZED = "previewInitialized",
    PREVIEW_KEYDOWN = "previewKeydown",
    PREVIEW_BUILDER_PROGRESS = "preview_builder_progress",
    SELECT_STORY = "selectStory",
    STORIES_COLLAPSE_ALL = "storiesCollapseAll",
    STORIES_EXPAND_ALL = "storiesExpandAll",
    DOCS_RENDERED = "docsRendered",
    SHARED_STATE_CHANGED = "sharedStateChanged",
    SHARED_STATE_SET = "sharedStateSet",
    NAVIGATE_URL = "navigateUrl",
    UPDATE_QUERY_PARAMS = "updateQueryParams",
    REQUEST_WHATS_NEW_DATA = "requestWhatsNewData",
    RESULT_WHATS_NEW_DATA = "resultWhatsNewData",
    SET_WHATS_NEW_CACHE = "setWhatsNewCache",
    TOGGLE_WHATS_NEW_NOTIFICATIONS = "toggleWhatsNewNotifications",
    TELEMETRY_ERROR = "telemetryError",
    FILE_COMPONENT_SEARCH_REQUEST = "fileComponentSearchRequest",
    FILE_COMPONENT_SEARCH_RESPONSE = "fileComponentSearchResponse",
    SAVE_STORY_REQUEST = "saveStoryRequest",
    SAVE_STORY_RESPONSE = "saveStoryResponse",
    ARGTYPES_INFO_REQUEST = "argtypesInfoRequest",
    ARGTYPES_INFO_RESPONSE = "argtypesInfoResponse",
    CREATE_NEW_STORYFILE_REQUEST = "createNewStoryfileRequest",
    CREATE_NEW_STORYFILE_RESPONSE = "createNewStoryfileResponse",
    OPEN_IN_EDITOR_REQUEST = "openInEditorRequest",
    OPEN_IN_EDITOR_RESPONSE = "openInEditorResponse",
    MANAGER_INERT_ATTRIBUTE_CHANGED = "managerInertAttributeChanged"
}

declare const CHANNEL_WS_DISCONNECT: events;
declare const CHANNEL_CREATED: events;
declare const CONFIG_ERROR: events;
declare const CREATE_NEW_STORYFILE_REQUEST: events;
declare const CREATE_NEW_STORYFILE_RESPONSE: events;
declare const CURRENT_STORY_WAS_SET: events;
declare const DOCS_PREPARED: events;
declare const DOCS_RENDERED: events;
declare const FILE_COMPONENT_SEARCH_REQUEST: events;
declare const FILE_COMPONENT_SEARCH_RESPONSE: events;
declare const FORCE_RE_RENDER: events;
declare const FORCE_REMOUNT: events;
declare const GLOBALS_UPDATED: events;
declare const NAVIGATE_URL: events;
declare const PLAY_FUNCTION_THREW_EXCEPTION: events;
declare const UNHANDLED_ERRORS_WHILE_PLAYING: events;
declare const PRELOAD_ENTRIES: events;
declare const PREVIEW_INITIALIZED: events;
declare const PREVIEW_BUILDER_PROGRESS: events;
declare const PREVIEW_KEYDOWN: events;
declare const REGISTER_SUBSCRIPTION: events;
declare const RESET_STORY_ARGS: events;
declare const SELECT_STORY: events;
declare const SET_CONFIG: events;
declare const SET_CURRENT_STORY: events;
declare const SET_FILTER: events;
declare const SET_GLOBALS: events;
declare const SET_INDEX: events;
declare const SET_STORIES: events;
declare const SHARED_STATE_CHANGED: events;
declare const SHARED_STATE_SET: events;
declare const STORIES_COLLAPSE_ALL: events;
declare const STORIES_EXPAND_ALL: events;
declare const STORY_ARGS_UPDATED: events;
declare const STORY_CHANGED: events;
declare const STORY_ERRORED: events;
declare const STORY_INDEX_INVALIDATED: events;
declare const STORY_MISSING: events;
declare const STORY_PREPARED: events;
declare const STORY_RENDER_PHASE_CHANGED: events;
declare const STORY_RENDERED: events;
declare const STORY_FINISHED: events;
declare const STORY_SPECIFIED: events;
declare const STORY_THREW_EXCEPTION: events;
declare const STORY_UNCHANGED: events;
declare const STORY_HOT_UPDATED: events;
declare const UPDATE_GLOBALS: events;
declare const UPDATE_QUERY_PARAMS: events;
declare const UPDATE_STORY_ARGS: events;
declare const REQUEST_WHATS_NEW_DATA: events;
declare const RESULT_WHATS_NEW_DATA: events;
declare const SET_WHATS_NEW_CACHE: events;
declare const TOGGLE_WHATS_NEW_NOTIFICATIONS: events;
declare const TELEMETRY_ERROR: events;
declare const SAVE_STORY_REQUEST: events;
declare const SAVE_STORY_RESPONSE: events;
declare const ARGTYPES_INFO_REQUEST: events;
declare const ARGTYPES_INFO_RESPONSE: events;
declare const OPEN_IN_EDITOR_REQUEST: events;
declare const OPEN_IN_EDITOR_RESPONSE: events;
declare const MANAGER_INERT_ATTRIBUTE_CHANGED: events;

export { ARGTYPES_INFO_REQUEST, ARGTYPES_INFO_RESPONSE, type ArgTypesRequestPayload, type ArgTypesResponsePayload, CHANNEL_CREATED, CHANNEL_WS_DISCONNECT, CONFIG_ERROR, CREATE_NEW_STORYFILE_REQUEST, CREATE_NEW_STORYFILE_RESPONSE, CURRENT_STORY_WAS_SET, type CreateNewStoryErrorPayload, type CreateNewStoryRequestPayload, type CreateNewStoryResponsePayload, DOCS_PREPARED, DOCS_RENDERED, FILE_COMPONENT_SEARCH_REQUEST, FILE_COMPONENT_SEARCH_RESPONSE, FORCE_REMOUNT, FORCE_RE_RENDER, type FileComponentSearchRequestPayload, type FileComponentSearchResponsePayload, GLOBALS_UPDATED, MANAGER_INERT_ATTRIBUTE_CHANGED, NAVIGATE_URL, OPEN_IN_EDITOR_REQUEST, OPEN_IN_EDITOR_RESPONSE, type OpenInEditorRequestPayload, type OpenInEditorResponsePayload, PLAY_FUNCTION_THREW_EXCEPTION, PRELOAD_ENTRIES, PREVIEW_BUILDER_PROGRESS, PREVIEW_INITIALIZED, PREVIEW_KEYDOWN, REGISTER_SUBSCRIPTION, REQUEST_WHATS_NEW_DATA, RESET_STORY_ARGS, RESULT_WHATS_NEW_DATA, type RequestData, type ResponseData, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, SELECT_STORY, SET_CONFIG, SET_CURRENT_STORY, SET_FILTER, SET_GLOBALS, SET_INDEX, SET_STORIES, SET_WHATS_NEW_CACHE, SHARED_STATE_CHANGED, SHARED_STATE_SET, STORIES_COLLAPSE_ALL, STORIES_EXPAND_ALL, STORY_ARGS_UPDATED, STORY_CHANGED, STORY_ERRORED, STORY_FINISHED, STORY_HOT_UPDATED, STORY_INDEX_INVALIDATED, STORY_MISSING, STORY_PREPARED, STORY_RENDERED, STORY_RENDER_PHASE_CHANGED, STORY_SPECIFIED, STORY_THREW_EXCEPTION, STORY_UNCHANGED, type SaveStoryRequestPayload, type SaveStoryResponsePayload, type StoryFinishedPayload, TELEMETRY_ERROR, TOGGLE_WHATS_NEW_NOTIFICATIONS, UNHANDLED_ERRORS_WHILE_PLAYING, UPDATE_GLOBALS, UPDATE_QUERY_PARAMS, UPDATE_STORY_ARGS, type WhatsNewCache, type WhatsNewData, events as default };
