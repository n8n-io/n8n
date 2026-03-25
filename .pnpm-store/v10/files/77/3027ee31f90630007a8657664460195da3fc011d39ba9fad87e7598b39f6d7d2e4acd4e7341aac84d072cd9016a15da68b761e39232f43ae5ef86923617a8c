import {
  Source
} from "./_browser-chunks/chunk-DDRHE7EB.js";
import "./_browser-chunks/chunk-A242L54C.js";

// src/manager.tsx
import React, { useEffect, useState } from "react";
import { AddonPanel } from "storybook/internal/components";
import { addons, types, useChannel, useParameter } from "storybook/manager-api";
import { ignoreSsrWarning, styled, useTheme } from "storybook/theming";

// ../../core/src/docs-tools/shared.ts
var ADDON_ID = "storybook/docs", PANEL_ID = `${ADDON_ID}/panel`, PARAM_KEY = "docs", SNIPPET_RENDERED = `${ADDON_ID}/snippet-rendered`;

// src/manager.tsx
addons.register(ADDON_ID, (api) => {
  addons.add(PANEL_ID, {
    title: "Code",
    type: types.PANEL,
    paramKey: PARAM_KEY,
    /**
     * This code panel can be enabled by adding this parameter:
     *
     * @example
     *
     * ```ts
     *  parameters: {
     *    docs: {
     *      codePanel: true,
     *    },
     *  },
     * ```
     */
    disabled: (parameters) => !parameters?.docs?.codePanel,
    match: ({ viewMode }) => viewMode === "story",
    render: ({ active }) => {
      let channel = api.getChannel(), currentStory = api.getCurrentStoryData(), lastEvent = channel?.last(SNIPPET_RENDERED)?.[0], [codeSnippet, setSourceCode] = useState({
        source: lastEvent?.source,
        format: lastEvent?.format ?? void 0
      }), parameter = useParameter(PARAM_KEY, {
        source: { code: "" },
        theme: "dark"
      });
      useEffect(() => {
        setSourceCode({
          source: void 0,
          format: void 0
        });
      }, [currentStory?.id]), useChannel({
        [SNIPPET_RENDERED]: ({ source, format }) => {
          setSourceCode({ source, format });
        }
      });
      let isDark = useTheme().base !== "light";
      return React.createElement(AddonPanel, { active: !!active }, React.createElement(SourceStyles, null, React.createElement(
        Source,
        {
          ...parameter.source,
          code: parameter.source?.code || codeSnippet.source || parameter.source?.originalSource,
          format: codeSnippet.format,
          dark: isDark
        }
      )));
    }
  });
});
var SourceStyles = styled.div(() => ({
  height: "100%",
  [`> :first-child${ignoreSsrWarning}`]: {
    margin: 0,
    height: "100%",
    boxShadow: "none"
  }
}));
