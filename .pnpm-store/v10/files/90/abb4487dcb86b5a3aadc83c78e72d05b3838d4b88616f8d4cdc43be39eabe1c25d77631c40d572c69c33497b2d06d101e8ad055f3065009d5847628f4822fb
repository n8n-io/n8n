import {
  ADDON_ID,
  ADDON_ID2,
  DOCUMENTATION_FATAL_ERROR_LINK,
  FULL_RUN_TRIGGERS,
  PANEL_ID,
  PANEL_ID2,
  STATUS_TYPE_ID_A11Y,
  STATUS_TYPE_ID_COMPONENT_TEST,
  STORYBOOK_ADDON_TEST_CHANNEL,
  TEST_PROVIDER_ID,
  storeOptions
} from "./_browser-chunks/chunk-TJXI7EIW.js";

// src/manager.tsx
import React5, { useState as useState3 } from "react";
import { Addon_TypesEnum, SupportedBuilder } from "storybook/internal/types";

// src/manager-store.ts
import {
  experimental_UniversalStore,
  experimental_getStatusStore,
  experimental_getTestProviderStore
} from "storybook/manager-api";
var store = experimental_UniversalStore.create({
  ...storeOptions,
  leader: globalThis.CONFIG_TYPE === "PRODUCTION"
}), componentTestStatusStore = experimental_getStatusStore(STATUS_TYPE_ID_COMPONENT_TEST), a11yStatusStore = experimental_getStatusStore(STATUS_TYPE_ID_A11Y), testProviderStore = experimental_getTestProviderStore(ADDON_ID2);

// src/manager.tsx
import { addons as addons2 } from "storybook/manager-api";

// src/components/GlobalErrorModal.tsx
import React, { useContext } from "react";
import { Button, Modal } from "storybook/internal/components";
import { SyncIcon } from "@storybook/icons";
import { useStorybookApi } from "storybook/manager-api";
import { styled } from "storybook/theming";
var ModalBar = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 6px 6px 20px"
}), ModalActionBar = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
}), ModalTitle = styled(Modal.Title)(({ theme: { typography } }) => ({
  fontSize: typography.size.s2,
  fontWeight: typography.weight.bold
})), ModalStackTrace = styled.pre(({ theme }) => ({
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  overflow: "auto",
  maxHeight: "60vh",
  margin: 0,
  padding: "20px",
  fontFamily: theme.typography.fonts.mono,
  fontSize: "12px",
  borderTop: `1px solid ${theme.appBorderColor}`,
  borderRadius: 0
})), TroubleshootLink = styled.a(({ theme }) => ({
  color: theme.color.defaultText
})), GlobalErrorContext = React.createContext({
  isModalOpen: !1,
  setModalOpen: void 0
});
function ErrorCause({ error }) {
  return error ? React.createElement("div", null, React.createElement("h4", null, "Caused by: ", error.name || "Error", ": ", error.message), error.stack && React.createElement("pre", null, error.stack), error.cause && React.createElement(ErrorCause, { error: error.cause })) : null;
}
function GlobalErrorModal({ onRerun, storeState }) {
  let api = useStorybookApi(), { isModalOpen, setModalOpen } = useContext(GlobalErrorContext), troubleshootURL = api.getDocsUrl({
    subpath: DOCUMENTATION_FATAL_ERROR_LINK,
    versioned: !0,
    renderer: !0
  }), {
    fatalError,
    currentRun: { unhandledErrors }
  } = storeState, content = fatalError ? React.createElement(React.Fragment, null, React.createElement("p", null, fatalError.error.name || "Error"), fatalError.message && React.createElement("p", null, fatalError.message), fatalError.error.message && React.createElement("p", null, fatalError.error.message), fatalError.error.stack && React.createElement("p", null, fatalError.error.stack), fatalError.error.cause && React.createElement(ErrorCause, { error: fatalError.error.cause })) : unhandledErrors.length > 0 ? React.createElement("ol", null, unhandledErrors.map((error) => React.createElement("li", { key: error.name + error.message }, React.createElement("p", null, error.name, ": ", error.message), error.VITEST_TEST_PATH && React.createElement("p", null, 'This error originated in "', React.createElement("b", null, error.VITEST_TEST_PATH), `". It doesn't mean the error was thrown inside the file itself, but while it was running.`), error.VITEST_TEST_NAME && React.createElement(React.Fragment, null, React.createElement("p", null, `The latest test that might've caused the error is "`, React.createElement("b", null, error.VITEST_TEST_NAME), '". It might mean one of the following:'), React.createElement("ul", null, React.createElement("li", null, "The error was thrown, while Vitest was running this test."), React.createElement("li", null, "If the error occurred after the test had been completed, this was the last documented test before it was thrown."))), error.stacks && React.createElement(React.Fragment, null, React.createElement("p", null, React.createElement("b", null, "Stacks:")), React.createElement("ul", null, error.stacks.map((stack) => React.createElement("li", { key: stack.file + stack.line + stack.column }, stack.file, ":", stack.line, ":", stack.column, " - ", stack.method || "unknown method")))), error.stack && React.createElement("p", null, error.stack), error.cause ? React.createElement(ErrorCause, { error: error.cause }) : null))) : null;
  return React.createElement(Modal, { ariaLabel: "Storybook Tests error details", onOpenChange: setModalOpen, open: isModalOpen }, React.createElement(ModalBar, null, React.createElement(ModalTitle, null, "Storybook Tests error details"), React.createElement(ModalActionBar, null, React.createElement(Button, { onClick: onRerun, variant: "ghost", ariaLabel: !1 }, React.createElement(SyncIcon, null), "Rerun"), React.createElement(Button, { variant: "ghost", ariaLabel: !1, asChild: !0 }, React.createElement("a", { target: "_blank", href: troubleshootURL, rel: "noreferrer" }, "Troubleshoot")), React.createElement(Modal.Close, null))), React.createElement(ModalStackTrace, null, content, React.createElement("br", null), React.createElement("br", null), "Troubleshoot:", " ", React.createElement(TroubleshootLink, { target: "_blank", href: troubleshootURL }, troubleshootURL)));
}

// src/components/SidebarContextMenu.tsx
import React4 from "react";

// src/use-test-provider-state.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ../../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function isPlainObject(value) {
  if (!value || typeof value != "object")
    return !1;
  let proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null ? Object.prototype.toString.call(value) === "[object Object]" : !1;
}

// ../../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function getSymbols(object) {
  return Object.getOwnPropertySymbols(object).filter((symbol) => Object.prototype.propertyIsEnumerable.call(object, symbol));
}

// ../../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function getTag(value) {
  return value == null ? value === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value);
}

// ../../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var regexpTag = "[object RegExp]", stringTag = "[object String]", numberTag = "[object Number]", booleanTag = "[object Boolean]", argumentsTag = "[object Arguments]", symbolTag = "[object Symbol]", dateTag = "[object Date]", mapTag = "[object Map]", setTag = "[object Set]", arrayTag = "[object Array]", functionTag = "[object Function]", arrayBufferTag = "[object ArrayBuffer]", objectTag = "[object Object]", errorTag = "[object Error]", dataViewTag = "[object DataView]", uint8ArrayTag = "[object Uint8Array]", uint8ClampedArrayTag = "[object Uint8ClampedArray]", uint16ArrayTag = "[object Uint16Array]", uint32ArrayTag = "[object Uint32Array]", bigUint64ArrayTag = "[object BigUint64Array]", int8ArrayTag = "[object Int8Array]", int16ArrayTag = "[object Int16Array]", int32ArrayTag = "[object Int32Array]", bigInt64ArrayTag = "[object BigInt64Array]", float32ArrayTag = "[object Float32Array]", float64ArrayTag = "[object Float64Array]";

// ../../node_modules/es-toolkit/dist/compat/util/eq.mjs
function eq(value, other) {
  return value === other || Number.isNaN(value) && Number.isNaN(other);
}

// ../../node_modules/es-toolkit/dist/predicate/isEqualWith.mjs
function isEqualWith(a, b, areValuesEqual) {
  return isEqualWithImpl(a, b, void 0, void 0, void 0, void 0, areValuesEqual);
}
function isEqualWithImpl(a, b, property, aParent, bParent, stack, areValuesEqual) {
  let result = areValuesEqual(a, b, property, aParent, bParent, stack);
  if (result !== void 0)
    return result;
  if (typeof a == typeof b)
    switch (typeof a) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return a === b;
      case "number":
        return a === b || Object.is(a, b);
      case "function":
        return a === b;
      case "object":
        return areObjectsEqual(a, b, stack, areValuesEqual);
    }
  return areObjectsEqual(a, b, stack, areValuesEqual);
}
function areObjectsEqual(a, b, stack, areValuesEqual) {
  if (Object.is(a, b))
    return !0;
  let aTag = getTag(a), bTag = getTag(b);
  if (aTag === argumentsTag && (aTag = objectTag), bTag === argumentsTag && (bTag = objectTag), aTag !== bTag)
    return !1;
  switch (aTag) {
    case stringTag:
      return a.toString() === b.toString();
    case numberTag: {
      let x = a.valueOf(), y = b.valueOf();
      return eq(x, y);
    }
    case booleanTag:
    case dateTag:
    case symbolTag:
      return Object.is(a.valueOf(), b.valueOf());
    case regexpTag:
      return a.source === b.source && a.flags === b.flags;
    case functionTag:
      return a === b;
  }
  stack = stack ?? /* @__PURE__ */ new Map();
  let aStack = stack.get(a), bStack = stack.get(b);
  if (aStack != null && bStack != null)
    return aStack === b;
  stack.set(a, b), stack.set(b, a);
  try {
    switch (aTag) {
      case mapTag: {
        if (a.size !== b.size)
          return !1;
        for (let [key, value] of a.entries())
          if (!b.has(key) || !isEqualWithImpl(value, b.get(key), key, a, b, stack, areValuesEqual))
            return !1;
        return !0;
      }
      case setTag: {
        if (a.size !== b.size)
          return !1;
        let aValues = Array.from(a.values()), bValues = Array.from(b.values());
        for (let i = 0; i < aValues.length; i++) {
          let aValue = aValues[i], index = bValues.findIndex((bValue) => isEqualWithImpl(aValue, bValue, void 0, a, b, stack, areValuesEqual));
          if (index === -1)
            return !1;
          bValues.splice(index, 1);
        }
        return !0;
      }
      case arrayTag:
      case uint8ArrayTag:
      case uint8ClampedArrayTag:
      case uint16ArrayTag:
      case uint32ArrayTag:
      case bigUint64ArrayTag:
      case int8ArrayTag:
      case int16ArrayTag:
      case int32ArrayTag:
      case bigInt64ArrayTag:
      case float32ArrayTag:
      case float64ArrayTag: {
        if (typeof Buffer < "u" && Buffer.isBuffer(a) !== Buffer.isBuffer(b) || a.length !== b.length)
          return !1;
        for (let i = 0; i < a.length; i++)
          if (!isEqualWithImpl(a[i], b[i], i, a, b, stack, areValuesEqual))
            return !1;
        return !0;
      }
      case arrayBufferTag:
        return a.byteLength !== b.byteLength ? !1 : areObjectsEqual(new Uint8Array(a), new Uint8Array(b), stack, areValuesEqual);
      case dataViewTag:
        return a.byteLength !== b.byteLength || a.byteOffset !== b.byteOffset ? !1 : areObjectsEqual(new Uint8Array(a), new Uint8Array(b), stack, areValuesEqual);
      case errorTag:
        return a.name === b.name && a.message === b.message;
      case objectTag: {
        if (!(areObjectsEqual(a.constructor, b.constructor, stack, areValuesEqual) || isPlainObject(a) && isPlainObject(b)))
          return !1;
        let aKeys = [...Object.keys(a), ...getSymbols(a)], bKeys = [...Object.keys(b), ...getSymbols(b)];
        if (aKeys.length !== bKeys.length)
          return !1;
        for (let i = 0; i < aKeys.length; i++) {
          let propKey = aKeys[i], aProp = a[propKey];
          if (!Object.hasOwn(b, propKey))
            return !1;
          let bProp = b[propKey];
          if (!isEqualWithImpl(aProp, bProp, propKey, a, b, stack, areValuesEqual))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    stack.delete(a), stack.delete(b);
  }
}

// ../../node_modules/es-toolkit/dist/function/noop.mjs
function noop() {
}

// ../../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function isEqual(a, b) {
  return isEqualWith(a, b, noop);
}

// src/use-test-provider-state.ts
import {
  experimental_useStatusStore,
  experimental_useTestProviderStore,
  experimental_useUniversalStore
} from "storybook/manager-api";
var statusValueToStoryIds = (allStatuses, typeId, storyIds) => {
  let statusValueToStoryIdsMap = {
    "status-value:pending": [],
    "status-value:success": [],
    "status-value:error": [],
    "status-value:warning": [],
    "status-value:unknown": []
  };
  return (storyIds ? storyIds.map((storyId) => allStatuses[storyId]).filter(Boolean) : Object.values(allStatuses)).forEach((statusByTypeId) => {
    let status = statusByTypeId[typeId];
    status && statusValueToStoryIdsMap[status.value].push(status.storyId);
  }), statusValueToStoryIdsMap;
}, useTestProvider = (api, entryId) => {
  let testProviderState = experimental_useTestProviderStore((s) => s[ADDON_ID2]), [storeState, setStoreState] = experimental_useUniversalStore(store), [isSettingsUpdated, setIsSettingsUpdated] = useState(!1), settingsUpdatedTimeoutRef = useRef();
  useEffect(() => {
    let unsubscribe = store.onStateChange((state, previousState) => {
      isEqual(state.config, previousState.config) || (testProviderStore.settingsChanged(), setIsSettingsUpdated(!0), clearTimeout(settingsUpdatedTimeoutRef.current), settingsUpdatedTimeoutRef.current = setTimeout(() => {
        setIsSettingsUpdated(!1);
      }, 1e3));
    });
    return () => {
      unsubscribe(), clearTimeout(settingsUpdatedTimeoutRef.current);
    };
  }, []);
  let storyIds = useMemo(
    () => entryId ? api.findAllLeafStoryIds(entryId) : void 0,
    [entryId, api]
  ), componentTestStatusSelector = useCallback(
    (allStatuses) => statusValueToStoryIds(allStatuses, STATUS_TYPE_ID_COMPONENT_TEST, storyIds),
    [storyIds]
  ), componentTestStatusValueToStoryIds = experimental_useStatusStore(
    componentTestStatusSelector
  ), a11yStatusValueToStoryIdsSelector = useCallback(
    (allStatuses) => statusValueToStoryIds(allStatuses, STATUS_TYPE_ID_A11Y, storyIds),
    [storyIds]
  ), a11yStatusValueToStoryIds = experimental_useStatusStore(a11yStatusValueToStoryIdsSelector);
  return {
    storeState,
    setStoreState,
    testProviderState,
    componentTestStatusValueToStoryIds,
    a11yStatusValueToStoryIds,
    isSettingsUpdated
  };
};

// src/components/TestProviderRender.tsx
import React3 from "react";
import {
  ActionList,
  Button as Button2,
  Form,
  ProgressSpinner,
  ToggleButton
} from "storybook/internal/components";
import { EyeIcon, InfoIcon, PlayHollowIcon, StopAltIcon } from "@storybook/icons";
import { addons } from "storybook/manager-api";
import { styled as styled4 } from "storybook/theming";

// src/components/Description.tsx
import React2 from "react";
import { Link as LinkComponent } from "storybook/internal/components";
import { styled as styled2 } from "storybook/theming";

// src/components/RelativeTime.tsx
import { useEffect as useEffect2, useState as useState2 } from "react";
var RelativeTime = ({ timestamp }) => {
  let [timeAgo, setTimeAgo] = useState2(null);
  if (useEffect2(() => {
    if (timestamp) {
      setTimeAgo(Date.now() - timestamp);
      let interval = setInterval(() => setTimeAgo(Date.now() - timestamp), 1e4);
      return () => clearInterval(interval);
    }
  }, [timestamp]), timeAgo === null)
    return null;
  let seconds = Math.round(timeAgo / 1e3);
  if (seconds < 60)
    return "just now";
  let minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return minutes === 1 ? "a minute ago" : `${minutes} minutes ago`;
  let hours = Math.floor(minutes / 60);
  if (hours < 24)
    return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  let days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
};

// src/components/Description.tsx
var Wrapper = styled2.div(({ theme }) => ({
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  fontSize: theme.typography.size.s1,
  color: theme.textMutedColor
})), PositiveText = styled2.span(({ theme }) => ({
  color: theme.color.positiveText
}));
function Description({
  entryId,
  storeState,
  testProviderState,
  isSettingsUpdated,
  ...props
}) {
  let { setModalOpen } = React2.useContext(GlobalErrorContext), { componentTestCount, totalTestCount, unhandledErrors, finishedAt } = storeState.currentRun, finishedTestCount = componentTestCount.success + componentTestCount.error, description = "Not run";
  if (!entryId && isSettingsUpdated)
    description = React2.createElement(PositiveText, null, "Settings updated");
  else if (testProviderState === "test-provider-state:running")
    description = (finishedTestCount ?? 0) === 0 ? "Starting..." : `Testing... ${finishedTestCount}/${totalTestCount}`;
  else if (!entryId && testProviderState === "test-provider-state:crashed")
    description = setModalOpen ? React2.createElement(LinkComponent, { isButton: !0, onClick: () => setModalOpen(!0) }, "View full error") : "Crashed";
  else if (!entryId && unhandledErrors.length > 0) {
    let unhandledErrorDescription = `View ${unhandledErrors.length} unhandled error${unhandledErrors?.length > 1 ? "s" : ""}`;
    description = setModalOpen ? React2.createElement(LinkComponent, { isButton: !0, onClick: () => setModalOpen(!0) }, unhandledErrorDescription) : unhandledErrorDescription;
  } else entryId && totalTestCount ? description = `Ran ${totalTestCount} ${totalTestCount === 1 ? "test" : "tests"}` : finishedAt ? description = React2.createElement(React2.Fragment, null, "Ran ", totalTestCount, " ", totalTestCount === 1 ? "test" : "tests", " ", React2.createElement(RelativeTime, { timestamp: finishedAt })) : storeState.watching && (description = "Watching for file changes");
  return React2.createElement(Wrapper, { ...props }, description);
}

// src/components/TestStatusIcon.tsx
import { styled as styled3 } from "storybook/theming";
var TestStatusIcon = styled3.div(
  ({ percentage }) => ({
    width: percentage ? 12 : 6,
    height: percentage ? 12 : 6,
    margin: percentage ? 1 : 4,
    background: percentage ? `conic-gradient(var(--status-color) ${percentage}%, var(--status-background) ${percentage + 1}%)` : "var(--status-color)",
    borderRadius: "50%"
  }),
  ({ isRunning, theme }) => isRunning && {
    animation: `${theme.animation.glow} 1.5s ease-in-out infinite`
  },
  ({ status, theme }) => status === "positive" && {
    "--status-color": theme.color.positive,
    "--status-background": `${theme.color.positive}66`
  },
  ({ status, theme }) => status === "warning" && {
    "--status-color": theme.color.gold,
    "--status-background": `${theme.color.gold}66`
  },
  ({ status, theme }) => status === "negative" && {
    "--status-color": theme.color.negative,
    "--status-background": `${theme.color.negative}66`
  },
  ({ status, theme }) => status === "critical" && {
    "--status-color": theme.color.defaultText,
    "--status-background": `${theme.color.defaultText}66`
  },
  ({ status, theme }) => status === "unknown" && {
    "--status-color": theme.textMutedColor,
    "--status-background": `${theme.textMutedColor}66`
  }
);

// src/components/TestProviderRender.tsx
var Container = styled4.div(({ inContextMenu }) => ({
  display: "flex",
  flexDirection: "column",
  paddingBottom: inContextMenu ? 0 : 1
})), Heading = styled4.div({
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  gap: 12
}), Info = styled4.div({
  display: "flex",
  flexDirection: "column",
  marginLeft: 8,
  minWidth: 0
}), Title = styled4.div(({ crashed, theme }) => ({
  fontSize: theme.typography.size.s1,
  fontWeight: crashed ? "bold" : "normal",
  color: crashed ? theme.color.negativeText : theme.color.defaultText
})), Actions = styled4.div({
  display: "flex",
  gap: 4
}), StyledActionList = styled4(ActionList)({
  padding: 0
}), Muted = styled4.span(({ theme }) => ({
  color: theme.textMutedColor
})), Progress = styled4(ProgressSpinner)({
  margin: 4
}), StopIcon = styled4(StopAltIcon)({
  width: 10
}), openPanel = ({ api, panelId, entryId }) => {
  let story = entryId ? api.findAllLeafStoryIds(entryId)[0] : void 0;
  story && api.selectStory(story), api.setSelectedPanel(panelId), api.togglePanel(!0);
}, TestProviderRender = ({
  api,
  entry,
  testProviderState,
  storeState,
  setStoreState,
  componentTestStatusValueToStoryIds,
  a11yStatusValueToStoryIds,
  isSettingsUpdated,
  ...props
}) => {
  let { config, watching, cancelling, currentRun, fatalError } = storeState, finishedTestCount = currentRun.componentTestCount.success + currentRun.componentTestCount.error, hasA11yAddon = addons.experimental_getRegisteredAddons().includes(ADDON_ID), isRunning = testProviderState === "test-provider-state:running", isStarting = isRunning && finishedTestCount === 0, [componentTestStatusIcon, componentTestStatusLabel] = fatalError ? ["critical", "Component tests crashed"] : componentTestStatusValueToStoryIds["status-value:error"].length > 0 ? ["negative", "Component tests failed"] : isRunning ? ["unknown", "Testing in progress"] : componentTestStatusValueToStoryIds["status-value:success"].length > 0 ? ["positive", "Component tests passed"] : ["unknown", "Run tests to see results"], [a11yStatusIcon, a11yStatusLabel] = fatalError ? ["critical", "Component tests crashed"] : a11yStatusValueToStoryIds["status-value:error"].length > 0 ? ["negative", "Accessibility tests failed"] : a11yStatusValueToStoryIds["status-value:warning"].length > 0 ? ["warning", "Accessibility tests failed"] : isRunning ? ["unknown", "Testing in progress"] : a11yStatusValueToStoryIds["status-value:success"].length > 0 ? ["positive", "Accessibility tests passed"] : ["unknown", "Run tests to see accessibility results"];
  return React3.createElement(Container, { ...props, inContextMenu: !!entry }, React3.createElement(Heading, null, React3.createElement(Info, null, entry ? React3.createElement(Title, { id: "testing-module-title" }, "Run component tests") : React3.createElement(
    Title,
    {
      id: "testing-module-title",
      crashed: testProviderState === "test-provider-state:crashed" || fatalError !== void 0 || currentRun.unhandledErrors.length > 0
    },
    currentRun.unhandledErrors.length === 1 ? "Component tests completed with an error" : currentRun.unhandledErrors.length > 1 ? "Component tests completed with errors" : fatalError ? "Component tests didn\u2019t complete" : "Run component tests"
  ), React3.createElement(
    Description,
    {
      id: "testing-module-description",
      storeState,
      testProviderState,
      entryId: entry?.id,
      isSettingsUpdated
    }
  )), React3.createElement(Actions, null, !entry && React3.createElement(
    ToggleButton,
    {
      ariaLabel: isRunning ? "Watch mode (cannot toggle while running)" : "Watch mode",
      tooltip: isRunning ? "Watch mode unavailable while running" : `Watch mode is ${watching ? "enabled" : "disabled"}`,
      padding: "small",
      size: "medium",
      variant: "ghost",
      pressed: watching,
      onClick: () => store.send({
        type: "TOGGLE_WATCHING",
        payload: {
          to: !watching
        }
      }),
      disabled: isRunning
    },
    React3.createElement(EyeIcon, null)
  ), isRunning ? React3.createElement(
    Button2,
    {
      ariaLabel: cancelling ? "Stop test run (already stopping...)" : "Stop test run",
      padding: "none",
      size: "medium",
      variant: "ghost",
      onClick: () => store.send({
        type: "CANCEL_RUN"
      }),
      disabled: cancelling || isStarting
    },
    React3.createElement(
      Progress,
      {
        percentage: finishedTestCount && storeState.currentRun.totalTestCount ? finishedTestCount / storeState.currentRun.totalTestCount * 100 : void 0
      },
      React3.createElement(StopIcon, null)
    )
  ) : React3.createElement(
    Button2,
    {
      ariaLabel: "Start test run",
      padding: "small",
      size: "medium",
      variant: "ghost",
      onClick: () => {
        let storyIds;
        entry && (storyIds = entry.type === "story" ? [entry.id] : api.findAllLeafStoryIds(entry.id)), store.send({
          type: "TRIGGER_RUN",
          payload: { storyIds, triggeredBy: entry?.type ?? "global" }
        });
      }
    },
    React3.createElement(PlayHollowIcon, null)
  ))), React3.createElement(StyledActionList, null, React3.createElement(ActionList.Item, null, entry ? React3.createElement(ActionList.Text, null, "Interactions") : React3.createElement(ActionList.Action, { as: "label", readOnly: !0 }, React3.createElement(ActionList.Icon, null, React3.createElement(Form.Checkbox, { name: "Interactions", checked: !0, disabled: !0 })), React3.createElement(ActionList.Text, null, "Interactions")), React3.createElement(
    ActionList.Button,
    {
      ariaLabel: `${componentTestStatusLabel}${componentTestStatusValueToStoryIds["status-value:error"].length + componentTestStatusValueToStoryIds["status-value:warning"].length > 0 ? ` (${componentTestStatusValueToStoryIds["status-value:error"].length + componentTestStatusValueToStoryIds["status-value:warning"].length} errors or warnings so far)` : ""}`,
      tooltip: componentTestStatusLabel,
      disabled: componentTestStatusValueToStoryIds["status-value:error"].length === 0 && componentTestStatusValueToStoryIds["status-value:warning"].length === 0 && componentTestStatusValueToStoryIds["status-value:success"].length === 0,
      onClick: () => {
        openPanel({
          api,
          panelId: PANEL_ID,
          entryId: componentTestStatusValueToStoryIds["status-value:error"][0] ?? componentTestStatusValueToStoryIds["status-value:warning"][0] ?? componentTestStatusValueToStoryIds["status-value:success"][0] ?? entry?.id
        });
      }
    },
    React3.createElement(TestStatusIcon, { status: componentTestStatusIcon, isRunning }),
    componentTestStatusValueToStoryIds["status-value:error"].length + componentTestStatusValueToStoryIds["status-value:warning"].length || null
  )), !entry && React3.createElement(ActionList.Item, null, React3.createElement(ActionList.Action, { as: "label", readOnly: isRunning, ariaLabel: !1 }, React3.createElement(ActionList.Icon, null, React3.createElement(
    Form.Checkbox,
    {
      name: "Coverage",
      checked: config.coverage,
      disabled: isRunning,
      onChange: () => setStoreState((s) => ({
        ...s,
        config: { ...s.config, coverage: !config.coverage }
      }))
    }
  )), React3.createElement(ActionList.Text, null, watching ? React3.createElement(Muted, null, "Coverage (unavailable)") : "Coverage")), watching || currentRun.triggeredBy && !FULL_RUN_TRIGGERS.includes(currentRun.triggeredBy) ? React3.createElement(
    ActionList.Button,
    {
      disabled: !0,
      ariaLabel: watching ? "Coverage unavailable in watch mode" : "Coverage only available after running all tests"
    },
    React3.createElement(InfoIcon, null)
  ) : currentRun.coverageSummary ? React3.createElement(
    ActionList.Button,
    {
      asChild: !0,
      ariaLabel: isRunning ? "Open coverage report (testing still in progress)" : `Open coverage report (${currentRun.coverageSummary.percentage}% coverage)`
    },
    React3.createElement("a", { href: "/coverage/index.html", target: "_blank" }, React3.createElement(
      TestStatusIcon,
      {
        isRunning,
        percentage: currentRun.coverageSummary.percentage,
        status: currentRun.coverageSummary.status
      }
    ), currentRun.coverageSummary.percentage, "%")
  ) : React3.createElement(
    ActionList.Button,
    {
      disabled: !0,
      ariaLabel: isRunning ? "Coverage unavailable, testing still in progress" : fatalError ? "Coverage unavailable, component tests crashed" : "Coverage unavailable, run tests first"
    },
    React3.createElement(
      TestStatusIcon,
      {
        isRunning,
        status: fatalError ? "critical" : "unknown"
      }
    )
  )), hasA11yAddon && React3.createElement(ActionList.Item, null, entry ? React3.createElement(ActionList.Text, null, "Accessibility") : React3.createElement(ActionList.Action, { as: "label", readOnly: isRunning, ariaLabel: !1 }, React3.createElement(ActionList.Icon, null, React3.createElement(
    Form.Checkbox,
    {
      name: "Accessibility",
      checked: config.a11y,
      disabled: isRunning,
      onChange: () => setStoreState((s) => ({
        ...s,
        config: { ...s.config, a11y: !config.a11y }
      }))
    }
  )), React3.createElement(ActionList.Text, null, "Accessibility")), React3.createElement(
    ActionList.Button,
    {
      ariaLabel: a11yStatusLabel,
      disabled: a11yStatusValueToStoryIds["status-value:error"].length === 0 && a11yStatusValueToStoryIds["status-value:warning"].length === 0 && a11yStatusValueToStoryIds["status-value:success"].length === 0,
      onClick: () => {
        openPanel({
          api,
          entryId: a11yStatusValueToStoryIds["status-value:error"][0] ?? a11yStatusValueToStoryIds["status-value:warning"][0] ?? a11yStatusValueToStoryIds["status-value:success"][0] ?? entry?.id,
          panelId: PANEL_ID2
        });
      }
    },
    React3.createElement(TestStatusIcon, { status: a11yStatusIcon, isRunning }),
    a11yStatusValueToStoryIds["status-value:error"].length + a11yStatusValueToStoryIds["status-value:warning"].length || null
  ))));
};

// src/components/SidebarContextMenu.tsx
var SidebarContextMenu = ({ context, api }) => {
  let {
    testProviderState,
    componentTestStatusValueToStoryIds,
    a11yStatusValueToStoryIds,
    storeState,
    setStoreState
  } = useTestProvider(api, context.id);
  return React4.createElement(
    TestProviderRender,
    {
      api,
      entry: context,
      style: { minWidth: 240 },
      testProviderState,
      componentTestStatusValueToStoryIds,
      a11yStatusValueToStoryIds,
      storeState,
      setStoreState,
      isSettingsUpdated: !1
    }
  );
};

// src/manager.tsx
addons2.register(ADDON_ID2, (api) => {
  if (globalThis.STORYBOOK_BUILDER === SupportedBuilder.VITE) {
    let openPanel2 = (panelId) => {
      api.setSelectedPanel(panelId), api.togglePanel(!0);
    };
    componentTestStatusStore.onSelect(() => {
      openPanel2(PANEL_ID);
    }), a11yStatusStore.onSelect(() => {
      openPanel2(PANEL_ID2);
    }), testProviderStore.onRunAll(() => {
      store.send({
        type: "TRIGGER_RUN",
        payload: {
          triggeredBy: "run-all"
        }
      });
    }), store.untilReady().then(() => {
      store.setState((state) => ({
        ...state,
        indexUrl: new URL("index.json", window.location.href).toString()
      })), store.subscribe("TEST_RUN_COMPLETED", ({ payload }) => {
        api.emit(STORYBOOK_ADDON_TEST_CHANNEL, { type: "test-run-completed", payload });
      });
    }), addons2.add(TEST_PROVIDER_ID, {
      type: Addon_TypesEnum.experimental_TEST_PROVIDER,
      render: () => {
        let [isModalOpen, setModalOpen] = useState3(!1), {
          storeState,
          setStoreState,
          testProviderState,
          componentTestStatusValueToStoryIds,
          a11yStatusValueToStoryIds,
          isSettingsUpdated
        } = useTestProvider(api);
        return React5.createElement(GlobalErrorContext.Provider, { value: { isModalOpen, setModalOpen } }, React5.createElement(
          TestProviderRender,
          {
            api,
            storeState,
            setStoreState,
            isSettingsUpdated,
            testProviderState,
            componentTestStatusValueToStoryIds,
            a11yStatusValueToStoryIds
          }
        ), React5.createElement(
          GlobalErrorModal,
          {
            storeState,
            onRerun: () => {
              setModalOpen(!1), store.send({
                type: "TRIGGER_RUN",
                payload: {
                  triggeredBy: "global"
                }
              });
            }
          }
        ));
      },
      sidebarContextMenu: ({ context }) => context.type === "docs" || context.type === "story" && !context.tags.includes("test") ? null : React5.createElement(SidebarContextMenu, { context, api })
    });
  }
});
