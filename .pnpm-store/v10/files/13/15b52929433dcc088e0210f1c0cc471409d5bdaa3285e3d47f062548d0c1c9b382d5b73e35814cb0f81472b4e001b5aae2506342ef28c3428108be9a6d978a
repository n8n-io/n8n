import { API_HashEntry, StoryIndex, PreviewAnnotation, Status, StoryId } from 'storybook/internal/types';

type A11yReport = any;
interface VitestError extends Error {
    VITEST_TEST_PATH?: string;
    VITEST_TEST_NAME?: string;
    stacks?: Array<{
        line: number;
        column: number;
        file: string;
        method: string;
    }>;
}
type ErrorLike = {
    message: string;
    name?: string;
    stack?: string;
    cause?: ErrorLike;
};
type RunTrigger = 'run-all' | 'global' | 'watch' | Extract<API_HashEntry['type'], string> | `external:${string}`;
type CurrentRun = {
    triggeredBy: RunTrigger | undefined;
    config: StoreState['config'];
    componentTestStatuses: Status[];
    a11yStatuses: Status[];
    componentTestCount: {
        success: number;
        error: number;
    };
    a11yCount: {
        success: number;
        warning: number;
        error: number;
    };
    a11yReports: Record<StoryId, A11yReport[]>;
    totalTestCount: number | undefined;
    storyIds: StoryId[] | undefined;
    startedAt: number | undefined;
    finishedAt: number | undefined;
    unhandledErrors: VitestError[];
    coverageSummary: {
        status: 'positive' | 'warning' | 'negative' | 'unknown';
        percentage: number;
    } | undefined;
};
type StoreState = {
    config: {
        coverage: boolean;
        a11y: boolean;
    };
    watching: boolean;
    cancelling: boolean;
    index: StoryIndex;
    previewAnnotations: PreviewAnnotation[];
    fatalError: {
        message: string | undefined;
        error: ErrorLike;
    } | undefined;
    currentRun: CurrentRun;
};

declare const PANEL_ID$1 = "storybook/interactions/panel";

declare const ADDON_ID$1 = "storybook/a11y";
declare const PANEL_ID = "storybook/a11y/panel";

declare const ADDON_ID = "storybook/test";
declare const TEST_PROVIDER_ID = "storybook/test/test-provider";
declare const STORYBOOK_ADDON_TEST_CHANNEL = "storybook/test/channel";
declare const TUTORIAL_VIDEO_LINK = "https://youtu.be/Waht9qq7AoA";
declare const DOCUMENTATION_LINK = "writing-tests/integrations/vitest-addon";
declare const DOCUMENTATION_FATAL_ERROR_LINK = "writing-tests/integrations/vitest-addon#what-happens-if-vitest-itself-has-an-error";
declare const COVERAGE_DIRECTORY = "coverage";
declare const storeOptions: {
    id: string;
    initialState: {
        config: {
            coverage: false;
            a11y: false;
        };
        watching: false;
        cancelling: false;
        fatalError: undefined;
        index: {
            entries: {};
            v: number;
        };
        previewAnnotations: never[];
        currentRun: {
            triggeredBy: undefined;
            config: {
                coverage: false;
                a11y: false;
            };
            componentTestStatuses: never[];
            a11yStatuses: never[];
            a11yReports: {};
            componentTestCount: {
                success: number;
                error: number;
            };
            a11yCount: {
                success: number;
                warning: number;
                error: number;
            };
            storyIds: undefined;
            totalTestCount: undefined;
            startedAt: undefined;
            finishedAt: undefined;
            unhandledErrors: never[];
            coverageSummary: undefined;
        };
    };
};
declare const FULL_RUN_TRIGGERS: RunTrigger[];
declare const STORE_CHANNEL_EVENT_NAME: string;
declare const STATUS_STORE_CHANNEL_EVENT_NAME = "UNIVERSAL_STORE:storybook/status";
declare const TEST_PROVIDER_STORE_CHANNEL_EVENT_NAME = "UNIVERSAL_STORE:storybook/test-provider";
declare const STATUS_TYPE_ID_COMPONENT_TEST = "storybook/component-test";
declare const STATUS_TYPE_ID_A11Y = "storybook/a11y";
declare const TRIGGER_TEST_RUN_REQUEST = "storybook/test/trigger-test-run-request";
declare const TRIGGER_TEST_RUN_RESPONSE = "storybook/test/trigger-test-run-response";
type TriggerTestRunRequestPayload = {
    requestId: string;
    actor: string;
    storyIds?: string[];
    config?: Partial<StoreState['config']>;
};
type TestRunResult = CurrentRun;
type TriggerTestRunResponsePayload = {
    requestId: string;
    status: 'completed' | 'error' | 'cancelled';
    result?: TestRunResult;
    error?: {
        message: string;
        error?: ErrorLike;
    };
};

export { ADDON_ID$1 as A11Y_ADDON_ID, PANEL_ID as A11Y_PANEL_ID, ADDON_ID, PANEL_ID$1 as COMPONENT_TESTING_PANEL_ID, COVERAGE_DIRECTORY, DOCUMENTATION_FATAL_ERROR_LINK, DOCUMENTATION_LINK, FULL_RUN_TRIGGERS, STATUS_STORE_CHANNEL_EVENT_NAME, STATUS_TYPE_ID_A11Y, STATUS_TYPE_ID_COMPONENT_TEST, STORE_CHANNEL_EVENT_NAME, STORYBOOK_ADDON_TEST_CHANNEL, TEST_PROVIDER_ID, TEST_PROVIDER_STORE_CHANNEL_EVENT_NAME, TRIGGER_TEST_RUN_REQUEST, TRIGGER_TEST_RUN_RESPONSE, TUTORIAL_VIDEO_LINK, type TestRunResult, type TriggerTestRunRequestPayload, type TriggerTestRunResponsePayload, storeOptions };
