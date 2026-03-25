import {
  ADDON_ID,
  DEFAULT_ADDON_STATE,
  DEFAULT_THEME_PARAMETERS,
  GLOBAL_KEY,
  PARAM_KEY,
  THEME_SWITCHER_ID,
  THEMING_EVENTS
} from "./_browser-chunks/chunk-DN7ZGZUH.js";

// src/manager.tsx
import { addons as addons2, types } from "storybook/manager-api";

// src/theme-switcher.tsx
import React from "react";
import { Button, Select } from "storybook/internal/components";
import { PaintBrushIcon } from "@storybook/icons";
import { addons, useAddonState, useChannel, useGlobals, useParameter } from "storybook/manager-api";
var hasMultipleThemes = (themesList) => themesList.length > 1, hasTwoThemes = (themesList) => themesList.length === 2, ThemeSwitcher = React.memo(function() {
  let { themeOverride, disable } = useParameter(
    PARAM_KEY,
    DEFAULT_THEME_PARAMETERS
  ), [{ theme: selected }, updateGlobals, storyGlobals] = useGlobals(), fromLast = addons.getChannel().last(THEMING_EVENTS.REGISTER_THEMES), initializeThemeState = Object.assign({}, DEFAULT_ADDON_STATE, {
    themesList: fromLast?.[0]?.themes || [],
    themeDefault: fromLast?.[0]?.defaultTheme || ""
  }), [{ themesList, themeDefault }, updateState] = useAddonState(
    THEME_SWITCHER_ID,
    initializeThemeState
  ), isLocked = GLOBAL_KEY in storyGlobals || !!themeOverride;
  useChannel({
    [THEMING_EVENTS.REGISTER_THEMES]: ({ themes, defaultTheme }) => {
      updateState((state) => ({
        ...state,
        themesList: themes,
        themeDefault: defaultTheme
      }));
    }
  });
  let currentTheme = selected || themeDefault, ariaLabel = "", label = "", tooltip = "";
  if (isLocked ? (label = "Story override", ariaLabel = "Theme set by story parameters", tooltip = "Theme set by story parameters") : currentTheme && (label = `${currentTheme} theme`, ariaLabel = "Theme", tooltip = "Change theme"), disable)
    return null;
  if (hasTwoThemes(themesList)) {
    let alternateTheme = themesList.find((theme) => theme !== currentTheme);
    return React.createElement(
      Button,
      {
        ariaLabel,
        tooltip,
        variant: "ghost",
        disabled: isLocked,
        key: THEME_SWITCHER_ID,
        onClick: () => {
          updateGlobals({ theme: alternateTheme });
        }
      },
      React.createElement(PaintBrushIcon, null),
      label
    );
  }
  return hasMultipleThemes(themesList) ? React.createElement(
    Select,
    {
      icon: React.createElement(PaintBrushIcon, null),
      ariaLabel,
      disabled: isLocked,
      key: THEME_SWITCHER_ID,
      defaultOptions: currentTheme,
      options: themesList.map((theme) => ({
        title: theme,
        value: theme
      })),
      onSelect: (selected2) => updateGlobals({ theme: selected2 })
    },
    label
  ) : null;
});

// src/manager.tsx
addons2.register(ADDON_ID, () => {
  addons2.add(THEME_SWITCHER_ID, {
    title: "Themes",
    type: types.TOOL,
    match: ({ viewMode, tabId }) => !!(viewMode && viewMode.match(/^(story|docs)$/)) && !tabId,
    render: ThemeSwitcher,
    paramKey: PARAM_KEY
  });
});
