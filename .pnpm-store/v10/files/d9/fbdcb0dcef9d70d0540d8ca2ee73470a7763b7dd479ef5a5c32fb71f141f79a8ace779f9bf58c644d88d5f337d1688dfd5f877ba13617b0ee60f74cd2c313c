import {
  preview_exports
} from "./_browser-chunks/chunk-R3GPJ3N7.js";
import {
  DEFAULT_THEME_PARAMETERS,
  GLOBAL_KEY,
  PARAM_KEY,
  THEMING_EVENTS,
  __export
} from "./_browser-chunks/chunk-DN7ZGZUH.js";

// src/index.ts
import { definePreviewAddon } from "storybook/internal/csf";

// src/decorators/class-name.decorator.tsx
import { useEffect } from "storybook/preview-api";

// src/decorators/helpers.ts
var helpers_exports = {};
__export(helpers_exports, {
  initializeThemeState: () => initializeThemeState,
  pluckThemeFromContext: () => pluckThemeFromContext,
  useThemeParameters: () => useThemeParameters
});
import { deprecate } from "storybook/internal/client-logger";
import { addons, useParameter } from "storybook/preview-api";
import { dedent } from "ts-dedent";
function pluckThemeFromContext({ globals }) {
  return globals[GLOBAL_KEY] || "";
}
function useThemeParameters(context) {
  return deprecate(
    dedent`The useThemeParameters function is deprecated. Please access parameters via the context directly instead e.g.
    - const { themeOverride } = context.parameters.themes ?? {};
    `
  ), context ? context.parameters[PARAM_KEY] ?? DEFAULT_THEME_PARAMETERS : useParameter(PARAM_KEY, DEFAULT_THEME_PARAMETERS);
}
function initializeThemeState(themeNames, defaultTheme) {
  addons.getChannel().emit(THEMING_EVENTS.REGISTER_THEMES, {
    defaultTheme,
    themes: themeNames
  });
}

// src/decorators/class-name.decorator.tsx
var DEFAULT_ELEMENT_SELECTOR = "html", classStringToArray = (classString) => classString.split(" ").filter(Boolean), withThemeByClassName = ({
  themes,
  defaultTheme,
  parentSelector = DEFAULT_ELEMENT_SELECTOR
}) => (initializeThemeState(Object.keys(themes), defaultTheme), (storyFn, context) => {
  let { themeOverride } = context.parameters[PARAM_KEY] ?? {}, selected = pluckThemeFromContext(context);
  return useEffect(() => {
    let selectedThemeName = themeOverride || selected || defaultTheme, parentElement = document.querySelector(parentSelector);
    if (!parentElement)
      return;
    Object.entries(themes).filter(([themeName]) => themeName !== selectedThemeName).forEach(([themeName, className]) => {
      let classes = classStringToArray(className);
      classes.length > 0 && parentElement.classList.remove(...classes);
    });
    let newThemeClasses = classStringToArray(themes[selectedThemeName]);
    newThemeClasses.length > 0 && parentElement.classList.add(...newThemeClasses);
  }, [themeOverride, selected]), storyFn();
});

// src/decorators/data-attribute.decorator.tsx
import { useEffect as useEffect2 } from "storybook/preview-api";
var DEFAULT_ELEMENT_SELECTOR2 = "html", DEFAULT_DATA_ATTRIBUTE = "data-theme", withThemeByDataAttribute = ({
  themes,
  defaultTheme,
  parentSelector = DEFAULT_ELEMENT_SELECTOR2,
  attributeName = DEFAULT_DATA_ATTRIBUTE
}) => (initializeThemeState(Object.keys(themes), defaultTheme), (storyFn, context) => {
  let { themeOverride } = context.parameters[PARAM_KEY] ?? {}, selected = pluckThemeFromContext(context);
  return useEffect2(() => {
    let parentElement = document.querySelector(parentSelector), themeKey = themeOverride || selected || defaultTheme;
    parentElement && parentElement.setAttribute(attributeName, themes[themeKey]);
  }, [themeOverride, selected]), storyFn();
});

// src/decorators/provider.decorator.tsx
import React from "react";
import { useMemo } from "storybook/preview-api";
var pluckThemeFromKeyPairTuple = ([_, themeConfig]) => themeConfig, withThemeFromJSXProvider = ({
  Provider,
  GlobalStyles,
  defaultTheme,
  themes = {}
}) => {
  let themeNames = Object.keys(themes), initialTheme = defaultTheme || themeNames[0];
  return initializeThemeState(themeNames, initialTheme), (storyFn, context) => {
    let { themeOverride } = context.parameters[PARAM_KEY] ?? {}, selected = pluckThemeFromContext(context), theme = useMemo(() => {
      let selectedThemeName = themeOverride || selected || initialTheme, pairs = Object.entries(themes);
      return pairs.length === 1 ? pluckThemeFromKeyPairTuple(pairs[0]) : themes[selectedThemeName];
    }, [selected, themeOverride]);
    return Provider ? React.createElement(Provider, { theme }, GlobalStyles && React.createElement(GlobalStyles, null), storyFn()) : React.createElement(React.Fragment, null, GlobalStyles && React.createElement(GlobalStyles, null), storyFn());
  };
};

// src/index.ts
var index_default = () => definePreviewAddon(preview_exports);
export {
  helpers_exports as DecoratorHelpers,
  index_default as default,
  withThemeByClassName,
  withThemeByDataAttribute,
  withThemeFromJSXProvider
};
