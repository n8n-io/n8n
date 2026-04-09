import { ArgTypes } from '@storybook/core/csf';
import { Addon_TestProviderType, Addon_TestProviderState, NormalizedProjectAnnotations, ProjectAnnotations, ComposedStoryFn } from '@storybook/core/types';

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

type DateNow = number;
type TestProviderId = Addon_TestProviderType['id'];
type TestProviderConfig = Addon_TestProviderType;
type TestProviderState<Details extends {
    [key: string]: any;
} = NonNullable<unknown>> = Addon_TestProviderState<Details>;
type TestProviders = Record<TestProviderId, TestProviderConfig & TestProviderState>;
type TestingModuleRunRequestPayload = {
    providerId: TestProviderId;
    indexUrl: string;
    storyIds?: string[];
};
type TestingModuleProgressReportPayload = {
    providerId: TestProviderId;
    status: 'success' | 'pending' | 'cancelled';
    cancellable?: boolean;
    progress?: TestingModuleProgressReportProgress;
    details?: {
        [key: string]: any;
    };
} | {
    providerId: TestProviderId;
    status: 'failed';
    progress?: TestingModuleProgressReportProgress;
    details?: {
        [key: string]: any;
    };
    error: {
        name: string;
        message: string;
        stack?: string;
    };
} | {
    providerId: TestProviderId;
    details: {
        [key: string]: any;
    };
};
type TestingModuleCrashReportPayload = {
    providerId: TestProviderId;
    error: {
        message: string;
    };
};
type TestingModuleProgressReportProgress = {
    startedAt: DateNow;
    finishedAt?: DateNow;
    numTotalTests?: number;
    numPassedTests?: number;
    numFailedTests?: number;
    numPendingTests?: number;
    percentageCompleted?: number;
};
type Status = 'success' | 'failed' | 'pending';
type TestingModuleCancelTestRunRequestPayload = {
    providerId: TestProviderId;
};
type TestingModuleCancelTestRunResponsePayload = {
    status: 'success';
} | {
    status: 'failed';
    message: string;
};

declare global {
    var globalProjectAnnotations: NormalizedProjectAnnotations<any>;
    var defaultProjectAnnotations: ProjectAnnotations<any>;
}
type WrappedStoryRef = {
    __pw_type: 'jsx' | 'importRef';
};
type UnwrappedJSXStoryRef = {
    __pw_type: 'jsx';
    type: UnwrappedImportStoryRef;
};
type UnwrappedImportStoryRef = ComposedStoryFn;
declare global {
    function __pwUnwrapObject(storyRef: WrappedStoryRef): Promise<UnwrappedJSXStoryRef | UnwrappedImportStoryRef>;
}

interface Report<T = unknown> {
    type: string;
    version?: number;
    result: T;
    status: 'failed' | 'passed' | 'warning';
}

interface StoryFinishedPayload {
    storyId: string;
    status: 'error' | 'success';
    reporters: Report[];
}

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
    TESTING_MODULE_CRASH_REPORT = "testingModuleCrashReport",
    TESTING_MODULE_PROGRESS_REPORT = "testingModuleProgressReport",
    TESTING_MODULE_RUN_REQUEST = "testingModuleRunRequest",
    /** @deprecated Use TESTING_MODULE_RUN_REQUEST instead */
    TESTING_MODULE_RUN_ALL_REQUEST = "testingModuleRunAllRequest",
    TESTING_MODULE_CANCEL_TEST_RUN_REQUEST = "testingModuleCancelTestRunRequest",
    TESTING_MODULE_CANCEL_TEST_RUN_RESPONSE = "testingModuleCancelTestRunResponse"
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
declare const TESTING_MODULE_CRASH_REPORT: events;
declare const TESTING_MODULE_PROGRESS_REPORT: events;
declare const TESTING_MODULE_RUN_REQUEST: events;
declare const TESTING_MODULE_RUN_ALL_REQUEST: events;
declare const TESTING_MODULE_CANCEL_TEST_RUN_REQUEST: events;
declare const TESTING_MODULE_CANCEL_TEST_RUN_RESPONSE: events;

export { ARGTYPES_INFO_REQUEST, ARGTYPES_INFO_RESPONSE, type ArgTypesRequestPayload, type ArgTypesResponsePayload, CHANNEL_CREATED, CHANNEL_WS_DISCONNECT, CONFIG_ERROR, CREATE_NEW_STORYFILE_REQUEST, CREATE_NEW_STORYFILE_RESPONSE, CURRENT_STORY_WAS_SET, type CreateNewStoryErrorPayload, type CreateNewStoryRequestPayload, type CreateNewStoryResponsePayload, DOCS_PREPARED, DOCS_RENDERED, FILE_COMPONENT_SEARCH_REQUEST, FILE_COMPONENT_SEARCH_RESPONSE, FORCE_REMOUNT, FORCE_RE_RENDER, type FileComponentSearchRequestPayload, type FileComponentSearchResponsePayload, GLOBALS_UPDATED, NAVIGATE_URL, PLAY_FUNCTION_THREW_EXCEPTION, PRELOAD_ENTRIES, PREVIEW_BUILDER_PROGRESS, PREVIEW_KEYDOWN, REGISTER_SUBSCRIPTION, REQUEST_WHATS_NEW_DATA, RESET_STORY_ARGS, RESULT_WHATS_NEW_DATA, type RequestData, type ResponseData, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, SELECT_STORY, SET_CONFIG, SET_CURRENT_STORY, SET_FILTER, SET_GLOBALS, SET_INDEX, SET_STORIES, SET_WHATS_NEW_CACHE, SHARED_STATE_CHANGED, SHARED_STATE_SET, STORIES_COLLAPSE_ALL, STORIES_EXPAND_ALL, STORY_ARGS_UPDATED, STORY_CHANGED, STORY_ERRORED, STORY_FINISHED, STORY_INDEX_INVALIDATED, STORY_MISSING, STORY_PREPARED, STORY_RENDERED, STORY_RENDER_PHASE_CHANGED, STORY_SPECIFIED, STORY_THREW_EXCEPTION, STORY_UNCHANGED, type SaveStoryRequestPayload, type SaveStoryResponsePayload, type Status, type StoryFinishedPayload, TELEMETRY_ERROR, TESTING_MODULE_CANCEL_TEST_RUN_REQUEST, TESTING_MODULE_CANCEL_TEST_RUN_RESPONSE, TESTING_MODULE_CRASH_REPORT, TESTING_MODULE_PROGRESS_REPORT, TESTING_MODULE_RUN_ALL_REQUEST, TESTING_MODULE_RUN_REQUEST, TOGGLE_WHATS_NEW_NOTIFICATIONS, type TestProviderConfig, type TestProviderId, type TestProviderState, type TestProviders, type TestingModuleCancelTestRunRequestPayload, type TestingModuleCancelTestRunResponsePayload, type TestingModuleCrashReportPayload, type TestingModuleProgressReportPayload, type TestingModuleProgressReportProgress, type TestingModuleRunRequestPayload, UNHANDLED_ERRORS_WHILE_PLAYING, UPDATE_GLOBALS, UPDATE_QUERY_PARAMS, UPDATE_STORY_ARGS, type WhatsNewCache, type WhatsNewData, events as default };
