// ../../core/src/component-testing/constants.ts
var ADDON_ID = "storybook/interactions", PANEL_ID = `${ADDON_ID}/panel`, DOCUMENTATION_LINK = "writing-tests/integrations/vitest-addon", DOCUMENTATION_DISCREPANCY_LINK = `${DOCUMENTATION_LINK}#what-happens-when-there-are-different-test-results-in-multiple-environments`;

// ../a11y/src/constants.ts
var ADDON_ID2 = "storybook/a11y", PANEL_ID2 = `${ADDON_ID2}/panel`;
var UI_STATE_ID = `${ADDON_ID2}/ui`, RESULT = `${ADDON_ID2}/result`, REQUEST = `${ADDON_ID2}/request`, RUNNING = `${ADDON_ID2}/running`, ERROR = `${ADDON_ID2}/error`, MANUAL = `${ADDON_ID2}/manual`, SELECT = `${ADDON_ID2}/select`, DOCUMENTATION_LINK2 = "writing-tests/accessibility-testing", DOCUMENTATION_DISCREPANCY_LINK2 = `${DOCUMENTATION_LINK2}#why-are-my-tests-failing-in-different-environments`;

// src/constants.ts
var ADDON_ID3 = "storybook/test", TEST_PROVIDER_ID = `${ADDON_ID3}/test-provider`, STORYBOOK_ADDON_TEST_CHANNEL = `${ADDON_ID3}/channel`;
var DOCUMENTATION_LINK3 = "writing-tests/integrations/vitest-addon", DOCUMENTATION_FATAL_ERROR_LINK = `${DOCUMENTATION_LINK3}#what-happens-if-vitest-itself-has-an-error`;
var storeOptions = {
  id: ADDON_ID3,
  initialState: {
    config: {
      coverage: !1,
      a11y: !1
    },
    watching: !1,
    cancelling: !1,
    fatalError: void 0,
    indexUrl: void 0,
    previewAnnotations: [],
    currentRun: {
      triggeredBy: void 0,
      config: {
        coverage: !1,
        a11y: !1
      },
      componentTestCount: {
        success: 0,
        error: 0
      },
      a11yCount: {
        success: 0,
        warning: 0,
        error: 0
      },
      storyIds: void 0,
      totalTestCount: void 0,
      startedAt: void 0,
      finishedAt: void 0,
      unhandledErrors: [],
      coverageSummary: void 0
    }
  }
}, FULL_RUN_TRIGGERS = ["global", "run-all"], STORE_CHANNEL_EVENT_NAME = `UNIVERSAL_STORE:${storeOptions.id}`;
var STATUS_TYPE_ID_COMPONENT_TEST = "storybook/component-test", STATUS_TYPE_ID_A11Y = "storybook/a11y";

export {
  PANEL_ID,
  ADDON_ID2 as ADDON_ID,
  PANEL_ID2,
  ADDON_ID3 as ADDON_ID2,
  TEST_PROVIDER_ID,
  STORYBOOK_ADDON_TEST_CHANNEL,
  DOCUMENTATION_FATAL_ERROR_LINK,
  storeOptions,
  FULL_RUN_TRIGGERS,
  STATUS_TYPE_ID_COMPONENT_TEST,
  STATUS_TYPE_ID_A11Y
};
