import {
  ADDON_ID,
  DOCUMENTATION_DISCREPANCY_LINK,
  EVENTS,
  PANEL_ID,
  PARAM_KEY,
  STATUS_TYPE_ID_A11Y,
  STATUS_TYPE_ID_COMPONENT_TEST
} from "./_browser-chunks/chunk-3FKQRDK3.js";
import "./_browser-chunks/chunk-4BE7D4DS.js";

// src/manager.tsx
import React9 from "react";
import { Badge as Badge3 } from "storybook/internal/components";
import { addons, types, useAddonState as useAddonState2, useStorybookApi as useStorybookApi3 } from "storybook/manager-api";

// src/components/A11YPanel.tsx
import React6, { useMemo as useMemo3 } from "react";
import { Badge as Badge2, Button as Button4 } from "storybook/internal/components";
import { SyncIcon as SyncIcon2 } from "@storybook/icons";
import { styled as styled5 } from "storybook/theming";

// src/types.ts
var RuleType = {
  VIOLATION: "violations",
  PASS: "passes",
  INCOMPLETION: "incomplete"
};

// src/components/A11yContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  STORY_CHANGED,
  STORY_FINISHED,
  STORY_HOT_UPDATED,
  STORY_RENDER_PHASE_CHANGED
} from "storybook/internal/core-events";
import { HIGHLIGHT, REMOVE_HIGHLIGHT, SCROLL_INTO_VIEW } from "storybook/highlight";
import {
  experimental_getStatusStore,
  experimental_useStatusStore,
  useAddonState,
  useChannel,
  useGlobals,
  useParameter,
  useStorybookApi,
  useStorybookState
} from "storybook/manager-api";
import { convert, themes } from "storybook/theming";

// src/AccessibilityRuleMaps.ts
var axeRuleMapping_wcag_2_0_a_aa = {
  "area-alt": {
    title: "<area> alt text",
    axeSummary: "Ensure <area> elements of image maps have alternative text",
    friendlySummary: "Add alt text to all <area> elements of image maps."
  },
  "aria-allowed-attr": {
    title: "Supported ARIA attributes",
    axeSummary: "Ensure an element's role supports its ARIA attributes",
    friendlySummary: "Only use ARIA attributes that are permitted for the element's role."
  },
  "aria-braille-equivalent": {
    title: "Braille equivalent",
    axeSummary: "Ensure aria-braillelabel and aria-brailleroledescription have a non-braille equivalent",
    friendlySummary: "If you use braille ARIA labels, also provide a matching non-braille label."
  },
  "aria-command-name": {
    title: "ARIA command name",
    axeSummary: "Ensure every ARIA button, link and menuitem has an accessible name",
    friendlySummary: "Every ARIA button, link, or menuitem needs a label or accessible name."
  },
  "aria-conditional-attr": {
    title: "ARIA attribute valid for role",
    axeSummary: "Ensure ARIA attributes are used as described in the specification of the element's role",
    friendlySummary: "Follow the element role's specification when using ARIA attributes."
  },
  "aria-deprecated-role": {
    title: "Deprecated ARIA role",
    axeSummary: "Ensure elements do not use deprecated roles",
    friendlySummary: "Don't use deprecated ARIA roles on elements."
  },
  "aria-hidden-body": {
    title: "Hidden body",
    axeSummary: 'Ensure aria-hidden="true" is not present on the document <body>',
    friendlySummary: 'Never set aria-hidden="true" on the <body> element.'
  },
  "aria-hidden-focus": {
    title: "Hidden element focus",
    axeSummary: "Ensure aria-hidden elements are not focusable nor contain focusable elements",
    friendlySummary: "Elements marked hidden (aria-hidden) should not be focusable or contain focusable items."
  },
  "aria-input-field-name": {
    title: "ARIA input field name",
    axeSummary: "Ensure every ARIA input field has an accessible name",
    friendlySummary: "Give each ARIA text input or field a label or accessible name."
  },
  "aria-meter-name": {
    title: "ARIA meter name",
    axeSummary: "Ensure every ARIA meter node has an accessible name",
    friendlySummary: 'Give each element with role="meter" a label or accessible name.'
  },
  "aria-progressbar-name": {
    title: "ARIA progressbar name",
    axeSummary: "Ensure every ARIA progressbar node has an accessible name",
    friendlySummary: 'Give each element with role="progressbar" a label or accessible name.'
  },
  "aria-prohibited-attr": {
    title: "ARIA prohibited attributes",
    axeSummary: "Ensure ARIA attributes are not prohibited for an element's role",
    friendlySummary: "Don't use ARIA attributes that are forbidden for that element's role."
  },
  "aria-required-attr": {
    title: "ARIA required attributes",
    axeSummary: "Ensure elements with ARIA roles have all required ARIA attributes",
    friendlySummary: "Include all required ARIA attributes for elements with that ARIA role."
  },
  "aria-required-children": {
    title: "ARIA required children",
    axeSummary: "Ensure elements with an ARIA role that require child roles contain them",
    friendlySummary: "If an ARIA role requires specific child roles, include those child elements."
  },
  "aria-required-parent": {
    title: "ARIA required parent",
    axeSummary: "Ensure elements with an ARIA role that require parent roles are contained by them",
    friendlySummary: "Place elements with certain ARIA roles inside the required parent role element."
  },
  "aria-roles": {
    title: "ARIA role value",
    axeSummary: "Ensure all elements with a role attribute use a valid value",
    friendlySummary: "Use only valid values in the role attribute (no typos or invalid roles)."
  },
  "aria-toggle-field-name": {
    title: "ARIA toggle field name",
    axeSummary: "Ensure every ARIA toggle field has an accessible name",
    friendlySummary: "Every ARIA toggle field (elements with the checkbox, radio, or switch roles) needs an accessible name."
  },
  "aria-tooltip-name": {
    title: "ARIA tooltip name",
    axeSummary: "Ensure every ARIA tooltip node has an accessible name",
    friendlySummary: 'Give each element with role="tooltip" a descriptive accessible name.'
  },
  "aria-valid-attr-value": {
    title: "ARIA attribute values valid",
    axeSummary: "Ensure all ARIA attributes have valid values",
    friendlySummary: "Use only valid values for ARIA attributes (no typos or invalid values)."
  },
  "aria-valid-attr": {
    title: "ARIA attribute valid",
    axeSummary: "Ensure attributes that begin with aria- are valid ARIA attributes",
    friendlySummary: "Use only valid aria-* attributes (make sure the attribute name is correct)."
  },
  blink: {
    title: "<blink> element",
    axeSummary: "Ensure <blink> elements are not used",
    friendlySummary: "Don't use the deprecated <blink> element."
  },
  "button-name": {
    title: "Button name",
    axeSummary: "Ensure buttons have discernible text",
    friendlySummary: "Every <button> needs a visible label or accessible name."
  },
  bypass: {
    title: "Navigation bypass",
    axeSummary: "Ensure each page has at least one mechanism to bypass navigation and jump to content",
    friendlySummary: 'Provide a way to skip repetitive navigation (e.g. a "Skip to content" link).'
  },
  "color-contrast": {
    title: "Color contrast",
    axeSummary: "Ensure the contrast between foreground and background text meets WCAG 2 AA minimum thresholds",
    friendlySummary: "The color contrast between text and its background meets WCAG AA contrast ratio."
  },
  "definition-list": {
    title: "Definition list structure",
    axeSummary: "Ensure <dl> elements are structured correctly",
    friendlySummary: "Definition lists (<dl>) should directly contain <dt> and <dd> elements in order."
  },
  dlitem: {
    title: "Definition list items",
    axeSummary: "Ensure <dt> and <dd> elements are contained by a <dl>",
    friendlySummary: "Ensure <dt> and <dd> elements are contained by a <dl>"
  },
  "document-title": {
    title: "Document title",
    axeSummary: "Ensure each HTML document contains a non-empty <title> element",
    friendlySummary: "Include a non-empty <title> element for every page."
  },
  "duplicate-id-aria": {
    title: "Unique id",
    axeSummary: "Ensure every id attribute value used in ARIA and in labels is unique",
    friendlySummary: "Every id used for ARIA or form labels should be unique on the page."
  },
  "form-field-multiple-labels": {
    title: "Multiple form field labels",
    axeSummary: "Ensure a form field does not have multiple <label> elements",
    friendlySummary: "Don't give a single form field more than one <label>."
  },
  "frame-focusable-content": {
    title: "Focusable frames",
    axeSummary: 'Ensure <frame> and <iframe> with focusable content do not have tabindex="-1"',
    friendlySummary: `Don't set tabindex="-1" on a <frame> or <iframe> that contains focusable elements.`
  },
  "frame-title-unique": {
    title: "Unique frame title",
    axeSummary: "Ensure <iframe> and <frame> elements contain a unique title attribute",
    friendlySummary: "Use a unique title attribute for each <frame> or <iframe> on the page."
  },
  "frame-title": {
    title: "Frame title",
    axeSummary: "Ensure <iframe> and <frame> elements have an accessible name",
    friendlySummary: "Every <frame> and <iframe> needs a title or accessible name."
  },
  "html-has-lang": {
    title: "<html> has lang",
    axeSummary: "Ensure every HTML document has a lang attribute",
    friendlySummary: "Add a lang attribute to the <html> element."
  },
  "html-lang-valid": {
    title: "<html> lang valid",
    axeSummary: "Ensure the <html lang> attribute has a valid value",
    friendlySummary: "Use a valid language code in the <html lang> attribute."
  },
  "html-xml-lang-mismatch": {
    title: "HTML and XML lang mismatch",
    axeSummary: "Ensure that HTML elements with both lang and xml:lang agree on the page's language",
    friendlySummary: "If using both lang and xml:lang on <html>, make sure they are the same language."
  },
  "image-alt": {
    title: "Image alt text",
    axeSummary: "Ensure <img> elements have alternative text or a role of none/presentation",
    friendlySummary: 'Give every image alt text or mark it as decorative with alt="".'
  },
  "input-button-name": {
    title: "Input button name",
    axeSummary: "Ensure input buttons have discernible text",
    friendlySummary: 'Give each <input type="button"> or similar a clear label (text or aria-label).'
  },
  "input-image-alt": {
    title: "Input image alt",
    axeSummary: 'Ensure <input type="image"> elements have alternative text',
    friendlySummary: '<input type="image"> must have alt text describing its image.'
  },
  label: {
    title: "Form label",
    axeSummary: "Ensure every form element has a label",
    friendlySummary: "Every form field needs an associated label."
  },
  "link-in-text-block": {
    title: "Identifiable links",
    axeSummary: "Ensure links are distinguishable from surrounding text without relying on color",
    friendlySummary: "Make sure links are obviously identifiable without relying only on color."
  },
  "link-name": {
    title: "Link name",
    axeSummary: "Ensure links have discernible text",
    friendlySummary: "Give each link meaningful text or an aria-label so its purpose is clear."
  },
  list: {
    title: "List structure",
    axeSummary: "Ensure that lists are structured correctly",
    friendlySummary: "Use proper list structure. Only use <li> inside <ul> or <ol>."
  },
  listitem: {
    title: "List item",
    axeSummary: "Ensure <li> elements are used semantically",
    friendlySummary: "Only use <li> tags inside <ul> or <ol> lists."
  },
  marquee: {
    title: "<marquee> element",
    axeSummary: "Ensure <marquee> elements are not used",
    friendlySummary: "Don't use the deprecated <marquee> element."
  },
  "meta-refresh": {
    title: "<meta> refresh",
    axeSummary: 'Ensure <meta http-equiv="refresh"> is not used for delayed refresh',
    friendlySummary: 'Avoid auto-refreshing or redirecting pages using <meta http-equiv="refresh">.'
  },
  "meta-viewport": {
    title: "<meta> viewport scaling",
    axeSummary: 'Ensure <meta name="viewport"> does not disable text scaling and zooming',
    friendlySummary: `Don't disable user zooming in <meta name="viewport"> to allow scaling.`
  },
  "nested-interactive": {
    title: "Nested interactive controls",
    axeSummary: "Ensure interactive controls are not nested (nesting causes screen reader/focus issues)",
    friendlySummary: "Do not nest interactive elements; it can confuse screen readers and keyboard focus."
  },
  "no-autoplay-audio": {
    title: "Autoplaying video",
    axeSummary: "Ensure <video> or <audio> do not autoplay audio > 3 seconds without a control to stop/mute",
    friendlySummary: "Don't autoplay audio for more than 3 seconds without providing a way to stop or mute it."
  },
  "object-alt": {
    title: "<object> alt text",
    axeSummary: "Ensure <object> elements have alternative text",
    friendlySummary: "Provide alternative text or content for <object> elements."
  },
  "role-img-alt": {
    title: 'role="img" alt text',
    axeSummary: 'Ensure elements with role="img" have alternative text',
    friendlySummary: 'Any element with role="img" needs alt text.'
  },
  "scrollable-region-focusable": {
    title: "Scrollable element focusable",
    axeSummary: "Ensure elements with scrollable content are keyboard-accessible",
    friendlySummary: "If an area can scroll, ensure it can be focused and scrolled via keyboard."
  },
  "select-name": {
    title: "<select> name",
    axeSummary: "Ensure <select> elements have an accessible name",
    friendlySummary: "Give each <select> field a label or other accessible name."
  },
  "server-side-image-map": {
    title: "Server-side image map",
    axeSummary: "Ensure that server-side image maps are not used",
    friendlySummary: "Don't use server-side image maps."
  },
  "svg-img-alt": {
    title: "SVG image alt text",
    axeSummary: "Ensure <svg> images/graphics have accessible text",
    friendlySummary: 'SVG images with role="img" or similar need a text description.'
  },
  "td-headers-attr": {
    title: "Table headers attribute",
    axeSummary: "Ensure each cell in a table using headers only refers to <th> in that table",
    friendlySummary: "In tables using the headers attribute, only reference other cells in the same table."
  },
  "th-has-data-cells": {
    title: "<th> has data cell",
    axeSummary: "Ensure <th> (or header role) elements have data cells they describe",
    friendlySummary: "Every table header (<th> or header role) should correspond to at least one data cell."
  },
  "valid-lang": {
    title: "Valid lang",
    axeSummary: "Ensure lang attributes have valid values",
    friendlySummary: "Use valid language codes in all lang attributes."
  },
  "video-caption": {
    title: "<video> captions",
    axeSummary: "Ensure <video> elements have captions",
    friendlySummary: "Provide captions for all <video> content."
  }
}, axeRuleMapping_wcag_2_1_a_aa = {
  "autocomplete-valid": {
    title: "autocomplete attribute valid",
    axeSummary: "Ensure the autocomplete attribute is correct and suitable for the form field",
    friendlySummary: "Use valid autocomplete values that match the form field's purpose."
  },
  "avoid-inline-spacing": {
    title: "Forced inline spacing",
    axeSummary: "Ensure that text spacing set via inline styles can be adjusted with custom CSS",
    friendlySummary: "Don't lock in text spacing with forced (!important) inline styles\u2014allow user CSS to adjust text spacing."
  }
}, axeRuleMapping_wcag_2_2_a_aa = {
  "target-size": {
    title: "Touch target size",
    axeSummary: "Ensure touch targets have sufficient size and space",
    friendlySummary: "Make sure interactive elements are big enough and not too close together for touch."
  }
}, axeRuleMapping_best_practices = {
  accesskeys: {
    title: "Unique accesskey",
    axeSummary: "Ensure every accesskey attribute value is unique",
    friendlySummary: "Use unique values for all accesskey attributes."
  },
  "aria-allowed-role": {
    title: "Appropriate role value",
    axeSummary: "Ensure the role attribute has an appropriate value for the element",
    friendlySummary: "ARIA roles should have a valid value for the element."
  },
  "aria-dialog-name": {
    title: "ARIA dialog name",
    axeSummary: "Ensure every ARIA dialog and alertdialog has an accessible name",
    friendlySummary: "Give each ARIA dialog or alertdialog a title or accessible name."
  },
  "aria-text": {
    title: 'ARIA role="text"',
    axeSummary: 'Ensure role="text" is used on elements with no focusable descendants',
    friendlySummary: `Only use role="text" on elements that don't contain focusable elements.`
  },
  "aria-treeitem-name": {
    title: "ARIA treeitem name",
    axeSummary: "Ensure every ARIA treeitem node has an accessible name",
    friendlySummary: "Give each ARIA treeitem a label or accessible name."
  },
  "empty-heading": {
    title: "Empty heading",
    axeSummary: "Ensure headings have discernible text",
    friendlySummary: "Don't leave heading elements empty or hide them."
  },
  "empty-table-header": {
    title: "Empty table header",
    axeSummary: "Ensure table headers have discernible text",
    friendlySummary: "Make sure table header cells have visible text."
  },
  "frame-tested": {
    title: "Test all frames",
    axeSummary: "Ensure <iframe> and <frame> elements contain the axe-core script",
    friendlySummary: "Make sure axe-core is injected into all frames or iframes so they are tested."
  },
  "heading-order": {
    title: "Heading order",
    axeSummary: "Ensure the order of headings is semantically correct (no skipping levels)",
    friendlySummary: "Use proper heading order (don't skip heading levels)."
  },
  "image-redundant-alt": {
    title: "Redundant image alt text",
    axeSummary: "Ensure image alternative text is not repeated as nearby text",
    friendlySummary: "Avoid repeating the same information in both an image's alt text and nearby text."
  },
  "label-title-only": {
    title: "Visible form element label",
    axeSummary: "Ensure each form element has a visible label (not only title/ARIA)",
    friendlySummary: "Every form input needs a visible label (not only a title attribute or hidden text)."
  },
  "landmark-banner-is-top-level": {
    title: "Top-level landmark banner",
    axeSummary: "Ensure the banner landmark is at top level (not nested)",
    friendlySummary: "Use the banner landmark (e.g. site header) only at the top level of the page, not inside another landmark."
  },
  "landmark-complementary-is-top-level": {
    title: "Top-level <aside>",
    axeSummary: "Ensure the complementary landmark (<aside>) is top level",
    friendlySummary: 'The complementary landmark <aside> or role="complementary" should be a top-level region, not nested in another landmark.'
  },
  "landmark-contentinfo-is-top-level": {
    title: "Top-level contentinfo",
    axeSummary: "Ensure the contentinfo landmark (footer) is top level",
    friendlySummary: "Make sure the contentinfo landmark (footer) is at the top level of the page and not contained in another landmark."
  },
  "landmark-main-is-top-level": {
    title: "Top-level main",
    axeSummary: "Ensure the main landmark is at top level",
    friendlySummary: "The main landmark should be a top-level element and not nested inside another landmark."
  },
  "landmark-no-duplicate-banner": {
    title: "Duplicate banner landmark",
    axeSummary: "Ensure the document has at most one banner landmark",
    friendlySummary: 'Have only one role="banner" or <header> on a page.'
  },
  "landmark-no-duplicate-contentinfo": {
    title: "Duplicate contentinfo",
    axeSummary: "Ensure the document has at most one contentinfo landmark",
    friendlySummary: 'Have only one role="contentinfo" or <footer> on a page.'
  },
  "landmark-no-duplicate-main": {
    title: "Duplicate main",
    axeSummary: "Ensure the document has at most one main landmark",
    friendlySummary: 'Have only one role="main" or <main> on a page.'
  },
  "landmark-one-main": {
    title: "main landmark",
    axeSummary: "Ensure the document has a main landmark",
    friendlySummary: 'Include a main landmark on each page using a <main> region or role="main".'
  },
  "landmark-unique": {
    title: "Unique landmark",
    axeSummary: "Ensure landmarks have a unique role or role/label combination",
    friendlySummary: "If you use multiple landmarks of the same type, give them unique labels (names)."
  },
  "meta-viewport-large": {
    title: "Significant viewport scaling",
    axeSummary: 'Ensure <meta name="viewport"> can scale a significant amount (e.g. 500%)',
    friendlySummary: '<meta name="viewport"> should allow users to significantly scale content.'
  },
  "page-has-heading-one": {
    title: "Has <h1>",
    axeSummary: "Ensure the page (or at least one frame) contains a level-one heading",
    friendlySummary: "Every page or frame should have at least one <h1> heading."
  },
  "presentation-role-conflict": {
    title: "Presentational content",
    axeSummary: 'Ensure elements with role="presentation"/"none" have no ARIA or tabindex',
    friendlySummary: `Don't give elements with role="none"/"presentation" any ARIA attributes or a tabindex.`
  },
  region: {
    title: "Landmark regions",
    axeSummary: "Ensure all page content is contained by landmarks",
    friendlySummary: "Wrap all page content in appropriate landmark regions (<header>, <main>, <footer>, etc.)."
  },
  "scope-attr-valid": {
    title: "scope attribute",
    axeSummary: "Ensure the scope attribute is used correctly on tables",
    friendlySummary: "Use the scope attribute only on <th> elements, with proper values (col, row, etc.)."
  },
  "skip-link": {
    title: "Skip link",
    axeSummary: 'Ensure all "skip" links have a focusable target',
    friendlySummary: 'Make sure any "skip to content" link targets an existing, focusable element.'
  },
  tabindex: {
    title: "tabindex values",
    axeSummary: "Ensure tabindex attribute values are not greater than 0",
    friendlySummary: "Don't use tabindex values greater than 0."
  },
  "table-duplicate-name": {
    title: "Duplicate names for table",
    axeSummary: "Ensure the <caption> does not duplicate the summary attribute text",
    friendlySummary: "Don't use the same text in both a table's <caption> and its summary attribute."
  }
}, axeRuleMapping_wcag_2_x_aaa = {
  "color-contrast-enhanced": {
    title: "Enhanced color contrast",
    axeSummary: "Ensure contrast between text and background meets WCAG 2 AAA enhanced contrast thresholds",
    friendlySummary: "Use extra-high contrast for text and background to meet WCAG AAA level."
  },
  "identical-links-same-purpose": {
    title: "Same link name, same purpose",
    axeSummary: "Ensure links with the same accessible name serve a similar purpose",
    friendlySummary: "If two links have the same text, they should do the same thing (lead to the same content)."
  },
  "meta-refresh-no-exceptions": {
    title: 'No <meta http-equiv="refresh">',
    axeSummary: 'Ensure <meta http-equiv="refresh"> is not used for delayed refresh (no exceptions)',
    friendlySummary: `Don't auto-refresh or redirect pages using <meta http-equiv="refresh"> even with a delay.`
  }
}, axeRuleMapping_experimental = {
  "css-orientation-lock": {
    title: "CSS orientation lock",
    axeSummary: "Ensure content is not locked to a specific display orientation (works in all orientations)",
    friendlySummary: "Don't lock content to one screen orientation; support both portrait and landscape modes."
  },
  "focus-order-semantics": {
    title: "Focus order semantic role",
    axeSummary: "Ensure elements in the tab order have a role appropriate for interactive content",
    friendlySummary: "Ensure elements in the tab order have a role appropriate for interactive content"
  },
  "hidden-content": {
    title: "Hidden content",
    axeSummary: "Informs users about hidden content",
    friendlySummary: "Display hidden content on the page for test analysis."
  },
  "label-content-name-mismatch": {
    title: "Content name mismatch",
    axeSummary: "Ensure elements labeled by their content include that text in their accessible name",
    friendlySummary: "If an element's visible text serves as its label, include that text in its accessible name."
  },
  "p-as-heading": {
    title: "No <p> headings",
    axeSummary: "Ensure <p> elements aren't styled to look like headings (use real headings)",
    friendlySummary: "Don't just style a <p> to look like a heading \u2013 use an actual heading tag for headings."
  },
  "table-fake-caption": {
    title: "Table caption",
    axeSummary: "Ensure that tables with a caption use the <caption> element",
    friendlySummary: "Use a <caption> element for table captions instead of just styled text."
  },
  "td-has-header": {
    title: "<td> has header",
    axeSummary: "Ensure each non-empty data cell in large tables (3\xD73+) has one or more headers",
    friendlySummary: "Every data cell in large tables should be associated with at least one header cell."
  }
}, axeRuleMapping_deprecated = {
  "aria-roledescription": {
    title: "aria-roledescription",
    axeSummary: "Ensure aria-roledescription is only used on elements with an implicit or explicit role",
    friendlySummary: "Only use aria-roledescription on elements that already have a defined role."
  }
}, combinedRulesMap = {
  ...axeRuleMapping_wcag_2_0_a_aa,
  ...axeRuleMapping_wcag_2_1_a_aa,
  ...axeRuleMapping_wcag_2_2_a_aa,
  ...axeRuleMapping_wcag_2_x_aaa,
  ...axeRuleMapping_best_practices,
  ...axeRuleMapping_experimental,
  ...axeRuleMapping_deprecated
};

// src/axeRuleMappingHelper.ts
var getTitleForAxeResult = (axeResult) => combinedRulesMap[axeResult.id]?.title || axeResult.id, getFriendlySummaryForAxeResult = (axeResult) => combinedRulesMap[axeResult.id]?.friendlySummary || axeResult.description;

// src/components/A11yContext.tsx
var unhighlightedSelectors = ["html", "body", "main"], theme = convert(themes.light), colorsByType = {
  [RuleType.VIOLATION]: theme.color.negative,
  [RuleType.PASS]: theme.color.positive,
  [RuleType.INCOMPLETION]: theme.color.warning
}, A11yContext = createContext({
  parameters: {},
  results: void 0,
  highlighted: !1,
  toggleHighlight: () => {
  },
  tab: RuleType.VIOLATION,
  handleCopyLink: () => {
  },
  setTab: () => {
  },
  setStatus: () => {
  },
  status: "initial",
  error: void 0,
  handleManual: () => {
  },
  discrepancy: null,
  selectedItems: /* @__PURE__ */ new Map(),
  allExpanded: !1,
  toggleOpen: () => {
  },
  handleCollapseAll: () => {
  },
  handleExpandAll: () => {
  },
  handleJumpToElement: () => {
  },
  handleSelectionChange: () => {
  }
}), A11yContextProvider = (props) => {
  let parameters = useParameter("a11y", {}), [globals] = useGlobals() ?? [], api = useStorybookApi(), getInitialStatus = useCallback((manual2 = !1) => manual2 ? "manual" : "initial", []), manual = useMemo(() => globals?.a11y?.manual ?? !1, [globals?.a11y?.manual]), a11ySelection = useMemo(() => {
    let value = api.getQueryParam("a11ySelection");
    return value && api.setQueryParams({ a11ySelection: "" }), value;
  }, [api]), [state, setState] = useAddonState(ADDON_ID, {
    ui: {
      highlighted: !1,
      tab: RuleType.VIOLATION
    },
    results: void 0,
    error: void 0,
    status: getInitialStatus(manual)
  }), { ui, results, error, status } = state, { storyId } = useStorybookState(), currentStoryA11yStatusValue = experimental_useStatusStore(
    (allStatuses) => allStatuses[storyId]?.[STATUS_TYPE_ID_A11Y]?.value
  );
  useEffect(() => experimental_getStatusStore("storybook/component-test").onAllStatusChange(
    (statuses, previousStatuses) => {
      let current = statuses[storyId]?.[STATUS_TYPE_ID_COMPONENT_TEST], previous = previousStatuses[storyId]?.[STATUS_TYPE_ID_COMPONENT_TEST];
      current?.value === "status-value:error" && previous?.value !== "status-value:error" && setState((prev) => ({ ...prev, status: "component-test-error" }));
    }
  ), [setState, storyId]);
  let handleToggleHighlight = useCallback(() => {
    setState((prev) => ({ ...prev, ui: { ...prev.ui, highlighted: !prev.ui.highlighted } }));
  }, [setState]), [selectedItems, setSelectedItems] = useState(() => {
    let initialValue = /* @__PURE__ */ new Map();
    if (a11ySelection && /^[a-z]+.[a-z-]+.[0-9]+$/.test(a11ySelection)) {
      let [type, id] = a11ySelection.split(".");
      initialValue.set(`${type}.${id}`, a11ySelection);
    }
    return initialValue;
  }), allExpanded = useMemo(() => results?.[ui.tab]?.every((result) => selectedItems.has(`${ui.tab}.${result.id}`)) ?? !1, [results, selectedItems, ui.tab]), toggleOpen = useCallback(
    (event, type, item) => {
      event.stopPropagation();
      let key = `${type}.${item.id}`;
      setSelectedItems((prev) => new Map(prev.delete(key) ? prev : prev.set(key, `${key}.1`)));
    },
    []
  ), handleCollapseAll = useCallback(() => {
    setSelectedItems(/* @__PURE__ */ new Map());
  }, []), handleExpandAll = useCallback(() => {
    setSelectedItems(
      (prev) => new Map(
        results?.[ui.tab]?.map((result) => {
          let key = `${ui.tab}.${result.id}`;
          return [key, prev.get(key) ?? `${key}.1`];
        }) ?? []
      )
    );
  }, [results, ui.tab]), handleSelectionChange = useCallback((key) => {
    let [type, id] = key.split(".");
    setSelectedItems((prev) => new Map(prev.set(`${type}.${id}`, key)));
  }, []), handleError = useCallback(
    (err) => {
      setState((prev) => ({ ...prev, status: "error", error: err }));
    },
    [setState]
  ), handleResult = useCallback(
    (axeResults, id) => {
      storyId === id && (setState((prev) => ({ ...prev, status: "ran", results: axeResults })), setTimeout(() => {
        setState((prev) => prev.status === "ran" ? { ...prev, status: "ready" } : prev), setSelectedItems((prev) => {
          if (prev.size === 1) {
            let [key] = prev.values();
            document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return prev;
        });
      }, 900));
    },
    [storyId, setState, setSelectedItems]
  ), handleSelect = useCallback(
    (itemId, details) => {
      let [type, id] = itemId.split("."), { helpUrl, nodes } = results?.[type]?.find((r) => r.id === id) || {}, openedWindow = helpUrl && window.open(helpUrl, "_blank", "noopener,noreferrer");
      if (nodes && !openedWindow) {
        let index = nodes.findIndex((n) => details.selectors.some((s) => s === String(n.target))) ?? -1;
        if (index !== -1) {
          let key = `${type}.${id}.${index + 1}`;
          setSelectedItems(/* @__PURE__ */ new Map([[`${type}.${id}`, key]])), setTimeout(() => {
            document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }
      }
    },
    [results]
  ), handleReport = useCallback(
    ({ reporters }) => {
      let a11yReport = reporters.find((r) => r.type === "a11y");
      a11yReport && ("error" in a11yReport.result ? handleError(a11yReport.result.error) : handleResult(a11yReport.result, storyId));
    },
    [handleError, handleResult, storyId]
  ), handleReset = useCallback(
    ({ newPhase }) => {
      newPhase === "loading" ? setState((prev) => ({
        ...prev,
        results: void 0,
        status: manual ? "manual" : "initial"
      })) : newPhase === "afterEach" && !manual && setState((prev) => ({ ...prev, status: "running" }));
    },
    [manual, setState]
  ), emit = useChannel(
    {
      [EVENTS.RESULT]: handleResult,
      [EVENTS.ERROR]: handleError,
      [EVENTS.SELECT]: handleSelect,
      [STORY_CHANGED]: () => setSelectedItems(/* @__PURE__ */ new Map()),
      [STORY_RENDER_PHASE_CHANGED]: handleReset,
      [STORY_FINISHED]: handleReport,
      [STORY_HOT_UPDATED]: () => {
        setState((prev) => ({ ...prev, status: "running" })), emit(EVENTS.MANUAL, storyId, parameters);
      }
    },
    [handleReset, handleReport, handleSelect, handleError, handleResult, parameters, storyId]
  ), handleManual = useCallback(() => {
    setState((prev) => ({ ...prev, status: "running" })), emit(EVENTS.MANUAL, storyId, parameters);
  }, [emit, parameters, setState, storyId]), handleCopyLink = useCallback(async (linkPath) => {
    let { createCopyToClipboardFunction } = await import("storybook/internal/components");
    await createCopyToClipboardFunction()(`${window.location.origin}${linkPath}`);
  }, []), handleJumpToElement = useCallback(
    (target) => emit(SCROLL_INTO_VIEW, target),
    [emit]
  );
  useEffect(() => {
    setState((prev) => ({ ...prev, status: getInitialStatus(manual) }));
  }, [getInitialStatus, manual, setState]);
  let isInitial = status === "initial";
  useEffect(() => {
    a11ySelection && setState((prev) => {
      let update = { ...prev.ui, highlighted: !0 }, [type] = a11ySelection.split(".") ?? [];
      return type && Object.values(RuleType).includes(type) && (update.tab = type), { ...prev, ui: update };
    });
  }, [a11ySelection]), useEffect(() => {
    if (emit(REMOVE_HIGHLIGHT, `${ADDON_ID}/selected`), emit(REMOVE_HIGHLIGHT, `${ADDON_ID}/others`), !ui.highlighted || isInitial)
      return;
    let selected = Array.from(selectedItems.values()).flatMap((key) => {
      let [type, id, number] = key.split(".");
      if (type !== ui.tab)
        return [];
      let target = results?.[type]?.find((r) => r.id === id)?.nodes[Number(number) - 1]?.target;
      return target ? [String(target)] : [];
    });
    selected.length && emit(HIGHLIGHT, {
      id: `${ADDON_ID}/selected`,
      priority: 1,
      selectors: selected,
      styles: {
        outline: `1px solid color-mix(in srgb, ${colorsByType[ui.tab]}, transparent 30%)`,
        backgroundColor: "transparent"
      },
      hoverStyles: {
        outlineWidth: "2px"
      },
      focusStyles: {
        backgroundColor: "transparent"
      },
      menu: results?.[ui.tab].map((result) => {
        let selectors = result.nodes.flatMap((n) => n.target).map(String).filter((e) => selected.includes(e));
        return [
          {
            id: `${ui.tab}.${result.id}:info`,
            title: getTitleForAxeResult(result),
            description: getFriendlySummaryForAxeResult(result),
            selectors
          },
          {
            id: `${ui.tab}.${result.id}`,
            iconLeft: "info",
            iconRight: "shareAlt",
            title: "Learn how to resolve this violation",
            clickEvent: EVENTS.SELECT,
            selectors
          }
        ];
      })
    });
    let others = results?.[ui.tab].flatMap((r) => r.nodes.flatMap((n) => n.target).map(String)).filter((e) => ![...unhighlightedSelectors, ...selected].includes(e));
    others?.length && emit(HIGHLIGHT, {
      id: `${ADDON_ID}/others`,
      selectors: others,
      styles: {
        outline: `1px solid color-mix(in srgb, ${colorsByType[ui.tab]}, transparent 30%)`,
        backgroundColor: `color-mix(in srgb, ${colorsByType[ui.tab]}, transparent 60%)`
      },
      hoverStyles: {
        outlineWidth: "2px"
      },
      focusStyles: {
        backgroundColor: "transparent"
      },
      menu: results?.[ui.tab].map((result) => {
        let selectors = result.nodes.flatMap((n) => n.target).map(String).filter((e) => !selected.includes(e));
        return [
          {
            id: `${ui.tab}.${result.id}:info`,
            title: getTitleForAxeResult(result),
            description: getFriendlySummaryForAxeResult(result),
            selectors
          },
          {
            id: `${ui.tab}.${result.id}`,
            iconLeft: "info",
            iconRight: "shareAlt",
            title: "Learn how to resolve this violation",
            clickEvent: EVENTS.SELECT,
            selectors
          }
        ];
      })
    });
  }, [isInitial, emit, ui.highlighted, results, ui.tab, selectedItems]);
  let discrepancy = useMemo(() => {
    if (!currentStoryA11yStatusValue)
      return null;
    if (currentStoryA11yStatusValue === "status-value:success" && results?.violations.length)
      return "cliPassedBrowserFailed";
    if (currentStoryA11yStatusValue === "status-value:error" && !results?.violations.length) {
      if (status === "ready" || status === "ran")
        return "browserPassedCliFailed";
      if (status === "manual")
        return "cliFailedButModeManual";
    }
    return null;
  }, [results?.violations.length, status, currentStoryA11yStatusValue]);
  return React.createElement(
    A11yContext.Provider,
    {
      value: {
        parameters,
        results,
        highlighted: ui.highlighted,
        toggleHighlight: handleToggleHighlight,
        tab: ui.tab,
        setTab: useCallback(
          (type) => setState((prev) => ({ ...prev, ui: { ...prev.ui, tab: type } })),
          [setState]
        ),
        handleCopyLink,
        status,
        setStatus: useCallback(
          (status2) => setState((prev) => ({ ...prev, status: status2 })),
          [setState]
        ),
        error,
        handleManual,
        discrepancy,
        selectedItems,
        toggleOpen,
        allExpanded,
        handleCollapseAll,
        handleExpandAll,
        handleJumpToElement,
        handleSelectionChange
      },
      ...props
    }
  );
}, useA11yContext = () => useContext(A11yContext);

// src/components/Report/Report.tsx
import React3 from "react";
import { Badge, Button as Button2, EmptyTabContent } from "storybook/internal/components";
import { ChevronSmallDownIcon } from "@storybook/icons";
import { styled as styled2 } from "storybook/theming";

// src/components/Report/Details.tsx
import React2, { Fragment, useCallback as useCallback2, useState as useState3 } from "react";
import { Button, Link, SyntaxHighlighter } from "storybook/internal/components";
import { CheckIcon, CopyIcon, LocationIcon } from "@storybook/icons";

// ../../node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}

// ../../node_modules/@radix-ui/react-tabs/dist/index.mjs
import { forwardRef as $1IHzk$forwardRef, createElement as $1IHzk$createElement, useRef as $1IHzk$useRef, useEffect as $1IHzk$useEffect } from "react";

// ../../node_modules/@radix-ui/primitive/dist/index.mjs
function $e42e1063c40fb3ef$export$b9ecd428b558ff10(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = !0 } = {}) {
  return function(event) {
    if (originalEventHandler?.(event), checkForDefaultPrevented === !1 || !event.defaultPrevented) return ourEventHandler?.(event);
  };
}

// ../../node_modules/@radix-ui/react-context/dist/index.mjs
import { createContext as $3bkAK$createContext, useMemo as $3bkAK$useMemo, createElement as $3bkAK$createElement, useContext as $3bkAK$useContext } from "react";
function $c512c27ab02ef895$export$50c7b4e9d9f19c1(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function $c512c27ab02ef895$export$fd42f52fd3ae1109(rootComponentName, defaultContext) {
    let BaseContext = $3bkAK$createContext(defaultContext), index = defaultContexts.length;
    defaultContexts = [
      ...defaultContexts,
      defaultContext
    ];
    function Provider(props) {
      let { scope, children, ...context } = props, Context = scope?.[scopeName][index] || BaseContext, value = $3bkAK$useMemo(
        () => context,
        Object.values(context)
      );
      return $3bkAK$createElement(Context.Provider, {
        value
      }, children);
    }
    function useContext2(consumerName, scope) {
      let Context = scope?.[scopeName][index] || BaseContext, context = $3bkAK$useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return Provider.displayName = rootComponentName + "Provider", [
      Provider,
      useContext2
    ];
  }
  let createScope = () => {
    let scopeContexts = defaultContexts.map((defaultContext) => $3bkAK$createContext(defaultContext));
    return function(scope) {
      let contexts = scope?.[scopeName] || scopeContexts;
      return $3bkAK$useMemo(
        () => ({
          [`__scope${scopeName}`]: {
            ...scope,
            [scopeName]: contexts
          }
        }),
        [
          scope,
          contexts
        ]
      );
    };
  };
  return createScope.scopeName = scopeName, [
    $c512c27ab02ef895$export$fd42f52fd3ae1109,
    $c512c27ab02ef895$var$composeContextScopes(createScope, ...createContextScopeDeps)
  ];
}
function $c512c27ab02ef895$var$composeContextScopes(...scopes) {
  let baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  let createScope1 = () => {
    let scopeHooks = scopes.map(
      (createScope) => ({
        useScope: createScope(),
        scopeName: createScope.scopeName
      })
    );
    return function(overrideScopes) {
      let nextScopes1 = scopeHooks.reduce((nextScopes, { useScope, scopeName }) => {
        let currentScope = useScope(overrideScopes)[`__scope${scopeName}`];
        return {
          ...nextScopes,
          ...currentScope
        };
      }, {});
      return $3bkAK$useMemo(
        () => ({
          [`__scope${baseScope.scopeName}`]: nextScopes1
        }),
        [
          nextScopes1
        ]
      );
    };
  };
  return createScope1.scopeName = baseScope.scopeName, createScope1;
}

// ../../node_modules/@radix-ui/react-roving-focus/dist/index.mjs
import { forwardRef as $98Iye$forwardRef, createElement as $98Iye$createElement, useRef as $98Iye$useRef, useState as $98Iye$useState, useEffect as $98Iye$useEffect, useCallback as $98Iye$useCallback } from "react";

// ../../node_modules/@radix-ui/react-collection/dist/index.mjs
import $6vYhU$react from "react";

// ../../node_modules/@radix-ui/react-compose-refs/dist/index.mjs
import { useCallback as $3vqmr$useCallback } from "react";
function $6ed0406888f73fc4$var$setRef(ref, value) {
  typeof ref == "function" ? ref(value) : ref != null && (ref.current = value);
}
function $6ed0406888f73fc4$export$43e446d32b3d21af(...refs) {
  return (node) => refs.forEach(
    (ref) => $6ed0406888f73fc4$var$setRef(ref, node)
  );
}
function $6ed0406888f73fc4$export$c7b2cbe3552a0d05(...refs) {
  return $3vqmr$useCallback($6ed0406888f73fc4$export$43e446d32b3d21af(...refs), refs);
}

// ../../node_modules/@radix-ui/react-collection/node_modules/@radix-ui/react-slot/dist/index.mjs
import { forwardRef as $9IrjX$forwardRef, Children as $9IrjX$Children, isValidElement as $9IrjX$isValidElement, createElement as $9IrjX$createElement, cloneElement as $9IrjX$cloneElement, Fragment as $9IrjX$Fragment } from "react";
var $5e63c961fc1ce211$export$8c6ed5c666ac1360 = $9IrjX$forwardRef((props, forwardedRef) => {
  let { children, ...slotProps } = props, childrenArray = $9IrjX$Children.toArray(children), slottable = childrenArray.find($5e63c961fc1ce211$var$isSlottable);
  if (slottable) {
    let newElement = slottable.props.children, newChildren = childrenArray.map((child) => child === slottable ? $9IrjX$Children.count(newElement) > 1 ? $9IrjX$Children.only(null) : $9IrjX$isValidElement(newElement) ? newElement.props.children : null : child);
    return $9IrjX$createElement($5e63c961fc1ce211$var$SlotClone, _extends({}, slotProps, {
      ref: forwardedRef
    }), $9IrjX$isValidElement(newElement) ? $9IrjX$cloneElement(newElement, void 0, newChildren) : null);
  }
  return $9IrjX$createElement($5e63c961fc1ce211$var$SlotClone, _extends({}, slotProps, {
    ref: forwardedRef
  }), children);
});
$5e63c961fc1ce211$export$8c6ed5c666ac1360.displayName = "Slot";
var $5e63c961fc1ce211$var$SlotClone = $9IrjX$forwardRef((props, forwardedRef) => {
  let { children, ...slotProps } = props;
  return $9IrjX$isValidElement(children) ? $9IrjX$cloneElement(children, {
    ...$5e63c961fc1ce211$var$mergeProps(slotProps, children.props),
    ref: forwardedRef ? $6ed0406888f73fc4$export$43e446d32b3d21af(forwardedRef, children.ref) : children.ref
  }) : $9IrjX$Children.count(children) > 1 ? $9IrjX$Children.only(null) : null;
});
$5e63c961fc1ce211$var$SlotClone.displayName = "SlotClone";
var $5e63c961fc1ce211$export$d9f1ccf0bdb05d45 = ({ children }) => $9IrjX$createElement($9IrjX$Fragment, null, children);
function $5e63c961fc1ce211$var$isSlottable(child) {
  return $9IrjX$isValidElement(child) && child.type === $5e63c961fc1ce211$export$d9f1ccf0bdb05d45;
}
function $5e63c961fc1ce211$var$mergeProps(slotProps, childProps) {
  let overrideProps = {
    ...childProps
  };
  for (let propName in childProps) {
    let slotPropValue = slotProps[propName], childPropValue = childProps[propName];
    /^on[A-Z]/.test(propName) ? slotPropValue && childPropValue ? overrideProps[propName] = (...args) => {
      childPropValue(...args), slotPropValue(...args);
    } : slotPropValue && (overrideProps[propName] = slotPropValue) : propName === "style" ? overrideProps[propName] = {
      ...slotPropValue,
      ...childPropValue
    } : propName === "className" && (overrideProps[propName] = [
      slotPropValue,
      childPropValue
    ].filter(Boolean).join(" "));
  }
  return {
    ...slotProps,
    ...overrideProps
  };
}

// ../../node_modules/@radix-ui/react-collection/dist/index.mjs
function $e02a7d9cb1dc128c$export$c74125a8e3af6bb2(name) {
  let PROVIDER_NAME = name + "CollectionProvider", [createCollectionContext, createCollectionScope] = $c512c27ab02ef895$export$50c7b4e9d9f19c1(PROVIDER_NAME), [CollectionProviderImpl, useCollectionContext] = createCollectionContext(PROVIDER_NAME, {
    collectionRef: {
      current: null
    },
    itemMap: /* @__PURE__ */ new Map()
  }), CollectionProvider = (props) => {
    let { scope, children } = props, ref = $6vYhU$react.useRef(null), itemMap = $6vYhU$react.useRef(/* @__PURE__ */ new Map()).current;
    return $6vYhU$react.createElement(CollectionProviderImpl, {
      scope,
      itemMap,
      collectionRef: ref
    }, children);
  };
  Object.assign(CollectionProvider, {
    displayName: PROVIDER_NAME
  });
  let COLLECTION_SLOT_NAME = name + "CollectionSlot", CollectionSlot = $6vYhU$react.forwardRef((props, forwardedRef) => {
    let { scope, children } = props, context = useCollectionContext(COLLECTION_SLOT_NAME, scope), composedRefs = $6ed0406888f73fc4$export$c7b2cbe3552a0d05(forwardedRef, context.collectionRef);
    return $6vYhU$react.createElement($5e63c961fc1ce211$export$8c6ed5c666ac1360, {
      ref: composedRefs
    }, children);
  });
  Object.assign(CollectionSlot, {
    displayName: COLLECTION_SLOT_NAME
  });
  let ITEM_SLOT_NAME = name + "CollectionItemSlot", ITEM_DATA_ATTR = "data-radix-collection-item", CollectionItemSlot = $6vYhU$react.forwardRef((props, forwardedRef) => {
    let { scope, children, ...itemData } = props, ref = $6vYhU$react.useRef(null), composedRefs = $6ed0406888f73fc4$export$c7b2cbe3552a0d05(forwardedRef, ref), context = useCollectionContext(ITEM_SLOT_NAME, scope);
    return $6vYhU$react.useEffect(() => (context.itemMap.set(ref, {
      ref,
      ...itemData
    }), () => void context.itemMap.delete(ref))), $6vYhU$react.createElement($5e63c961fc1ce211$export$8c6ed5c666ac1360, {
      [ITEM_DATA_ATTR]: "",
      ref: composedRefs
    }, children);
  });
  Object.assign(CollectionItemSlot, {
    displayName: ITEM_SLOT_NAME
  });
  function useCollection(scope) {
    let context = useCollectionContext(name + "CollectionConsumer", scope);
    return $6vYhU$react.useCallback(() => {
      let collectionNode = context.collectionRef.current;
      if (!collectionNode) return [];
      let orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
      return Array.from(context.itemMap.values()).sort(
        (a, b) => orderedNodes.indexOf(a.ref.current) - orderedNodes.indexOf(b.ref.current)
      );
    }, [
      context.collectionRef,
      context.itemMap
    ]);
  }
  return [
    {
      Provider: CollectionProvider,
      Slot: CollectionSlot,
      ItemSlot: CollectionItemSlot
    },
    useCollection,
    createCollectionScope
  ];
}

// ../../node_modules/@radix-ui/react-id/dist/index.mjs
import * as $2AODx$react from "react";

// ../../node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
import { useLayoutEffect as $dxlwH$useLayoutEffect } from "react";
var $9f79659886946c16$export$e5c5a5f917a5871c = globalThis?.document ? $dxlwH$useLayoutEffect : () => {
};

// ../../node_modules/@radix-ui/react-id/dist/index.mjs
var $1746a345f3d73bb7$var$useReactId = $2AODx$react.useId || (() => {
}), $1746a345f3d73bb7$var$count = 0;
function $1746a345f3d73bb7$export$f680877a34711e37(deterministicId) {
  let [id, setId] = $2AODx$react.useState($1746a345f3d73bb7$var$useReactId());
  return $9f79659886946c16$export$e5c5a5f917a5871c(() => {
    deterministicId || setId(
      (reactId) => reactId ?? String($1746a345f3d73bb7$var$count++)
    );
  }, [
    deterministicId
  ]), deterministicId || (id ? `radix-${id}` : "");
}

// ../../node_modules/@radix-ui/react-primitive/dist/index.mjs
import { forwardRef as $4q5Fq$forwardRef, useEffect as $4q5Fq$useEffect, createElement as $4q5Fq$createElement } from "react";
import { flushSync as $4q5Fq$flushSync } from "react-dom";

// ../../node_modules/@radix-ui/react-primitive/node_modules/@radix-ui/react-slot/dist/index.mjs
import { forwardRef as $9IrjX$forwardRef2, Children as $9IrjX$Children2, isValidElement as $9IrjX$isValidElement2, createElement as $9IrjX$createElement2, cloneElement as $9IrjX$cloneElement2, Fragment as $9IrjX$Fragment2 } from "react";
var $5e63c961fc1ce211$export$8c6ed5c666ac13602 = $9IrjX$forwardRef2((props, forwardedRef) => {
  let { children, ...slotProps } = props, childrenArray = $9IrjX$Children2.toArray(children), slottable = childrenArray.find($5e63c961fc1ce211$var$isSlottable2);
  if (slottable) {
    let newElement = slottable.props.children, newChildren = childrenArray.map((child) => child === slottable ? $9IrjX$Children2.count(newElement) > 1 ? $9IrjX$Children2.only(null) : $9IrjX$isValidElement2(newElement) ? newElement.props.children : null : child);
    return $9IrjX$createElement2($5e63c961fc1ce211$var$SlotClone2, _extends({}, slotProps, {
      ref: forwardedRef
    }), $9IrjX$isValidElement2(newElement) ? $9IrjX$cloneElement2(newElement, void 0, newChildren) : null);
  }
  return $9IrjX$createElement2($5e63c961fc1ce211$var$SlotClone2, _extends({}, slotProps, {
    ref: forwardedRef
  }), children);
});
$5e63c961fc1ce211$export$8c6ed5c666ac13602.displayName = "Slot";
var $5e63c961fc1ce211$var$SlotClone2 = $9IrjX$forwardRef2((props, forwardedRef) => {
  let { children, ...slotProps } = props;
  return $9IrjX$isValidElement2(children) ? $9IrjX$cloneElement2(children, {
    ...$5e63c961fc1ce211$var$mergeProps2(slotProps, children.props),
    ref: forwardedRef ? $6ed0406888f73fc4$export$43e446d32b3d21af(forwardedRef, children.ref) : children.ref
  }) : $9IrjX$Children2.count(children) > 1 ? $9IrjX$Children2.only(null) : null;
});
$5e63c961fc1ce211$var$SlotClone2.displayName = "SlotClone";
var $5e63c961fc1ce211$export$d9f1ccf0bdb05d452 = ({ children }) => $9IrjX$createElement2($9IrjX$Fragment2, null, children);
function $5e63c961fc1ce211$var$isSlottable2(child) {
  return $9IrjX$isValidElement2(child) && child.type === $5e63c961fc1ce211$export$d9f1ccf0bdb05d452;
}
function $5e63c961fc1ce211$var$mergeProps2(slotProps, childProps) {
  let overrideProps = {
    ...childProps
  };
  for (let propName in childProps) {
    let slotPropValue = slotProps[propName], childPropValue = childProps[propName];
    /^on[A-Z]/.test(propName) ? slotPropValue && childPropValue ? overrideProps[propName] = (...args) => {
      childPropValue(...args), slotPropValue(...args);
    } : slotPropValue && (overrideProps[propName] = slotPropValue) : propName === "style" ? overrideProps[propName] = {
      ...slotPropValue,
      ...childPropValue
    } : propName === "className" && (overrideProps[propName] = [
      slotPropValue,
      childPropValue
    ].filter(Boolean).join(" "));
  }
  return {
    ...slotProps,
    ...overrideProps
  };
}

// ../../node_modules/@radix-ui/react-primitive/dist/index.mjs
var $8927f6f2acc4f386$var$NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "span",
  "svg",
  "ul"
], $8927f6f2acc4f386$export$250ffa63cdc0d034 = $8927f6f2acc4f386$var$NODES.reduce((primitive, node) => {
  let Node = $4q5Fq$forwardRef((props, forwardedRef) => {
    let { asChild, ...primitiveProps } = props, Comp = asChild ? $5e63c961fc1ce211$export$8c6ed5c666ac13602 : node;
    return $4q5Fq$useEffect(() => {
      window[Symbol.for("radix-ui")] = !0;
    }, []), $4q5Fq$createElement(Comp, _extends({}, primitiveProps, {
      ref: forwardedRef
    }));
  });
  return Node.displayName = `Primitive.${node}`, {
    ...primitive,
    [node]: Node
  };
}, {});

// ../../node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
import { useRef as $lwiWj$useRef, useEffect as $lwiWj$useEffect, useMemo as $lwiWj$useMemo } from "react";
function $b1b2314f5f9a1d84$export$25bec8c6f54ee79a(callback) {
  let callbackRef = $lwiWj$useRef(callback);
  return $lwiWj$useEffect(() => {
    callbackRef.current = callback;
  }), $lwiWj$useMemo(
    () => (...args) => {
      var _callbackRef$current;
      return (_callbackRef$current = callbackRef.current) === null || _callbackRef$current === void 0 ? void 0 : _callbackRef$current.call(callbackRef, ...args);
    },
    []
  );
}

// ../../node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
import { useCallback as $bnPw9$useCallback, useState as $bnPw9$useState, useRef as $bnPw9$useRef, useEffect as $bnPw9$useEffect } from "react";
function $71cd76cc60e0454e$export$6f32135080cb4c3({ prop, defaultProp, onChange = () => {
} }) {
  let [uncontrolledProp, setUncontrolledProp] = $71cd76cc60e0454e$var$useUncontrolledState({
    defaultProp,
    onChange
  }), isControlled = prop !== void 0, value1 = isControlled ? prop : uncontrolledProp, handleChange = $b1b2314f5f9a1d84$export$25bec8c6f54ee79a(onChange), setValue = $bnPw9$useCallback((nextValue) => {
    if (isControlled) {
      let value = typeof nextValue == "function" ? nextValue(prop) : nextValue;
      value !== prop && handleChange(value);
    } else setUncontrolledProp(nextValue);
  }, [
    isControlled,
    prop,
    setUncontrolledProp,
    handleChange
  ]);
  return [
    value1,
    setValue
  ];
}
function $71cd76cc60e0454e$var$useUncontrolledState({ defaultProp, onChange }) {
  let uncontrolledState = $bnPw9$useState(defaultProp), [value] = uncontrolledState, prevValueRef = $bnPw9$useRef(value), handleChange = $b1b2314f5f9a1d84$export$25bec8c6f54ee79a(onChange);
  return $bnPw9$useEffect(() => {
    prevValueRef.current !== value && (handleChange(value), prevValueRef.current = value);
  }, [
    value,
    prevValueRef,
    handleChange
  ]), uncontrolledState;
}

// ../../node_modules/@radix-ui/react-direction/dist/index.mjs
import { createContext as $7Gjcd$createContext, createElement as $7Gjcd$createElement, useContext as $7Gjcd$useContext } from "react";
var $f631663db3294ace$var$DirectionContext = $7Gjcd$createContext(void 0);
function $f631663db3294ace$export$b39126d51d94e6f3(localDir) {
  let globalDir = $7Gjcd$useContext($f631663db3294ace$var$DirectionContext);
  return localDir || globalDir || "ltr";
}

// ../../node_modules/@radix-ui/react-roving-focus/dist/index.mjs
var $d7bdfb9eb0fdf311$var$ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus", $d7bdfb9eb0fdf311$var$EVENT_OPTIONS = {
  bubbles: !1,
  cancelable: !0
}, $d7bdfb9eb0fdf311$var$GROUP_NAME = "RovingFocusGroup", [$d7bdfb9eb0fdf311$var$Collection, $d7bdfb9eb0fdf311$var$useCollection, $d7bdfb9eb0fdf311$var$createCollectionScope] = $e02a7d9cb1dc128c$export$c74125a8e3af6bb2($d7bdfb9eb0fdf311$var$GROUP_NAME), [$d7bdfb9eb0fdf311$var$createRovingFocusGroupContext, $d7bdfb9eb0fdf311$export$c7109489551a4f4] = $c512c27ab02ef895$export$50c7b4e9d9f19c1($d7bdfb9eb0fdf311$var$GROUP_NAME, [
  $d7bdfb9eb0fdf311$var$createCollectionScope
]), [$d7bdfb9eb0fdf311$var$RovingFocusProvider, $d7bdfb9eb0fdf311$var$useRovingFocusContext] = $d7bdfb9eb0fdf311$var$createRovingFocusGroupContext($d7bdfb9eb0fdf311$var$GROUP_NAME), $d7bdfb9eb0fdf311$export$8699f7c8af148338 = $98Iye$forwardRef((props, forwardedRef) => $98Iye$createElement($d7bdfb9eb0fdf311$var$Collection.Provider, {
  scope: props.__scopeRovingFocusGroup
}, $98Iye$createElement($d7bdfb9eb0fdf311$var$Collection.Slot, {
  scope: props.__scopeRovingFocusGroup
}, $98Iye$createElement($d7bdfb9eb0fdf311$var$RovingFocusGroupImpl, _extends({}, props, {
  ref: forwardedRef
})))));
Object.assign($d7bdfb9eb0fdf311$export$8699f7c8af148338, {
  displayName: $d7bdfb9eb0fdf311$var$GROUP_NAME
});
var $d7bdfb9eb0fdf311$var$RovingFocusGroupImpl = $98Iye$forwardRef((props, forwardedRef) => {
  let { __scopeRovingFocusGroup, orientation, loop = !1, dir, currentTabStopId: currentTabStopIdProp, defaultCurrentTabStopId, onCurrentTabStopIdChange, onEntryFocus, ...groupProps } = props, ref = $98Iye$useRef(null), composedRefs = $6ed0406888f73fc4$export$c7b2cbe3552a0d05(forwardedRef, ref), direction = $f631663db3294ace$export$b39126d51d94e6f3(dir), [currentTabStopId = null, setCurrentTabStopId] = $71cd76cc60e0454e$export$6f32135080cb4c3({
    prop: currentTabStopIdProp,
    defaultProp: defaultCurrentTabStopId,
    onChange: onCurrentTabStopIdChange
  }), [isTabbingBackOut, setIsTabbingBackOut] = $98Iye$useState(!1), handleEntryFocus = $b1b2314f5f9a1d84$export$25bec8c6f54ee79a(onEntryFocus), getItems = $d7bdfb9eb0fdf311$var$useCollection(__scopeRovingFocusGroup), isClickFocusRef = $98Iye$useRef(!1), [focusableItemsCount, setFocusableItemsCount] = $98Iye$useState(0);
  return $98Iye$useEffect(() => {
    let node = ref.current;
    if (node)
      return node.addEventListener($d7bdfb9eb0fdf311$var$ENTRY_FOCUS, handleEntryFocus), () => node.removeEventListener($d7bdfb9eb0fdf311$var$ENTRY_FOCUS, handleEntryFocus);
  }, [
    handleEntryFocus
  ]), $98Iye$createElement($d7bdfb9eb0fdf311$var$RovingFocusProvider, {
    scope: __scopeRovingFocusGroup,
    orientation,
    dir: direction,
    loop,
    currentTabStopId,
    onItemFocus: $98Iye$useCallback(
      (tabStopId) => setCurrentTabStopId(tabStopId),
      [
        setCurrentTabStopId
      ]
    ),
    onItemShiftTab: $98Iye$useCallback(
      () => setIsTabbingBackOut(!0),
      []
    ),
    onFocusableItemAdd: $98Iye$useCallback(
      () => setFocusableItemsCount(
        (prevCount) => prevCount + 1
      ),
      []
    ),
    onFocusableItemRemove: $98Iye$useCallback(
      () => setFocusableItemsCount(
        (prevCount) => prevCount - 1
      ),
      []
    )
  }, $98Iye$createElement($8927f6f2acc4f386$export$250ffa63cdc0d034.div, _extends({
    tabIndex: isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0,
    "data-orientation": orientation
  }, groupProps, {
    ref: composedRefs,
    style: {
      outline: "none",
      ...props.style
    },
    onMouseDown: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onMouseDown, () => {
      isClickFocusRef.current = !0;
    }),
    onFocus: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onFocus, (event) => {
      let isKeyboardFocus = !isClickFocusRef.current;
      if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
        let entryFocusEvent = new CustomEvent($d7bdfb9eb0fdf311$var$ENTRY_FOCUS, $d7bdfb9eb0fdf311$var$EVENT_OPTIONS);
        if (event.currentTarget.dispatchEvent(entryFocusEvent), !entryFocusEvent.defaultPrevented) {
          let items = getItems().filter(
            (item) => item.focusable
          ), activeItem = items.find(
            (item) => item.active
          ), currentItem = items.find(
            (item) => item.id === currentTabStopId
          ), candidateNodes = [
            activeItem,
            currentItem,
            ...items
          ].filter(Boolean).map(
            (item) => item.ref.current
          );
          $d7bdfb9eb0fdf311$var$focusFirst(candidateNodes);
        }
      }
      isClickFocusRef.current = !1;
    }),
    onBlur: $e42e1063c40fb3ef$export$b9ecd428b558ff10(
      props.onBlur,
      () => setIsTabbingBackOut(!1)
    )
  })));
}), $d7bdfb9eb0fdf311$var$ITEM_NAME = "RovingFocusGroupItem", $d7bdfb9eb0fdf311$export$ab9df7c53fe8454 = $98Iye$forwardRef((props, forwardedRef) => {
  let { __scopeRovingFocusGroup, focusable = !0, active = !1, tabStopId, ...itemProps } = props, autoId = $1746a345f3d73bb7$export$f680877a34711e37(), id = tabStopId || autoId, context = $d7bdfb9eb0fdf311$var$useRovingFocusContext($d7bdfb9eb0fdf311$var$ITEM_NAME, __scopeRovingFocusGroup), isCurrentTabStop = context.currentTabStopId === id, getItems = $d7bdfb9eb0fdf311$var$useCollection(__scopeRovingFocusGroup), { onFocusableItemAdd, onFocusableItemRemove } = context;
  return $98Iye$useEffect(() => {
    if (focusable)
      return onFocusableItemAdd(), () => onFocusableItemRemove();
  }, [
    focusable,
    onFocusableItemAdd,
    onFocusableItemRemove
  ]), $98Iye$createElement($d7bdfb9eb0fdf311$var$Collection.ItemSlot, {
    scope: __scopeRovingFocusGroup,
    id,
    focusable,
    active
  }, $98Iye$createElement($8927f6f2acc4f386$export$250ffa63cdc0d034.span, _extends({
    tabIndex: isCurrentTabStop ? 0 : -1,
    "data-orientation": context.orientation
  }, itemProps, {
    ref: forwardedRef,
    onMouseDown: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onMouseDown, (event) => {
      focusable ? context.onItemFocus(id) : event.preventDefault();
    }),
    onFocus: $e42e1063c40fb3ef$export$b9ecd428b558ff10(
      props.onFocus,
      () => context.onItemFocus(id)
    ),
    onKeyDown: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onKeyDown, (event) => {
      if (event.key === "Tab" && event.shiftKey) {
        context.onItemShiftTab();
        return;
      }
      if (event.target !== event.currentTarget) return;
      let focusIntent = $d7bdfb9eb0fdf311$var$getFocusIntent(event, context.orientation, context.dir);
      if (focusIntent !== void 0) {
        event.preventDefault();
        let candidateNodes = getItems().filter(
          (item) => item.focusable
        ).map(
          (item) => item.ref.current
        );
        if (focusIntent === "last") candidateNodes.reverse();
        else if (focusIntent === "prev" || focusIntent === "next") {
          focusIntent === "prev" && candidateNodes.reverse();
          let currentIndex = candidateNodes.indexOf(event.currentTarget);
          candidateNodes = context.loop ? $d7bdfb9eb0fdf311$var$wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
        }
        setTimeout(
          () => $d7bdfb9eb0fdf311$var$focusFirst(candidateNodes)
        );
      }
    })
  })));
});
Object.assign($d7bdfb9eb0fdf311$export$ab9df7c53fe8454, {
  displayName: $d7bdfb9eb0fdf311$var$ITEM_NAME
});
var $d7bdfb9eb0fdf311$var$MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function $d7bdfb9eb0fdf311$var$getDirectionAwareKey(key, dir) {
  return dir !== "rtl" ? key : key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
function $d7bdfb9eb0fdf311$var$getFocusIntent(event, orientation, dir) {
  let key = $d7bdfb9eb0fdf311$var$getDirectionAwareKey(event.key, dir);
  if (!(orientation === "vertical" && [
    "ArrowLeft",
    "ArrowRight"
  ].includes(key)) && !(orientation === "horizontal" && [
    "ArrowUp",
    "ArrowDown"
  ].includes(key)))
    return $d7bdfb9eb0fdf311$var$MAP_KEY_TO_FOCUS_INTENT[key];
}
function $d7bdfb9eb0fdf311$var$focusFirst(candidates) {
  let PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (let candidate of candidates)
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT || (candidate.focus(), document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT)) return;
}
function $d7bdfb9eb0fdf311$var$wrapArray(array, startIndex) {
  return array.map(
    (_, index) => array[(startIndex + index) % array.length]
  );
}
var $d7bdfb9eb0fdf311$export$be92b6f5f03c0fe9 = $d7bdfb9eb0fdf311$export$8699f7c8af148338, $d7bdfb9eb0fdf311$export$6d08773d2e66f8f2 = $d7bdfb9eb0fdf311$export$ab9df7c53fe8454;

// ../../node_modules/@radix-ui/react-presence/dist/index.mjs
import { Children as $iqq3r$Children, cloneElement as $iqq3r$cloneElement, useState as $iqq3r$useState, useRef as $iqq3r$useRef, useEffect as $iqq3r$useEffect, useCallback as $iqq3r$useCallback, useReducer as $iqq3r$useReducer } from "react";
import { flushSync as $iqq3r$flushSync } from "react-dom";
function $fe963b355347cc68$export$3e6543de14f8614f(initialState, machine) {
  return $iqq3r$useReducer((state, event) => {
    let nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
var $921a889cee6df7e8$export$99c2b779aa4e8b8b = (props) => {
  let { present, children } = props, presence = $921a889cee6df7e8$var$usePresence(present), child = typeof children == "function" ? children({
    present: presence.isPresent
  }) : $iqq3r$Children.only(children), ref = $6ed0406888f73fc4$export$c7b2cbe3552a0d05(presence.ref, child.ref);
  return typeof children == "function" || presence.isPresent ? $iqq3r$cloneElement(child, {
    ref
  }) : null;
};
$921a889cee6df7e8$export$99c2b779aa4e8b8b.displayName = "Presence";
function $921a889cee6df7e8$var$usePresence(present) {
  let [node1, setNode] = $iqq3r$useState(), stylesRef = $iqq3r$useRef({}), prevPresentRef = $iqq3r$useRef(present), prevAnimationNameRef = $iqq3r$useRef("none"), initialState = present ? "mounted" : "unmounted", [state, send] = $fe963b355347cc68$export$3e6543de14f8614f(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return $iqq3r$useEffect(() => {
    let currentAnimationName = $921a889cee6df7e8$var$getAnimationName(stylesRef.current);
    prevAnimationNameRef.current = state === "mounted" ? currentAnimationName : "none";
  }, [
    state
  ]), $9f79659886946c16$export$e5c5a5f917a5871c(() => {
    let styles = stylesRef.current, wasPresent = prevPresentRef.current;
    if (wasPresent !== present) {
      let prevAnimationName = prevAnimationNameRef.current, currentAnimationName = $921a889cee6df7e8$var$getAnimationName(styles);
      present ? send("MOUNT") : currentAnimationName === "none" || styles?.display === "none" ? send("UNMOUNT") : send(wasPresent && prevAnimationName !== currentAnimationName ? "ANIMATION_OUT" : "UNMOUNT"), prevPresentRef.current = present;
    }
  }, [
    present,
    send
  ]), $9f79659886946c16$export$e5c5a5f917a5871c(() => {
    if (node1) {
      let handleAnimationEnd = (event) => {
        let isCurrentAnimation = $921a889cee6df7e8$var$getAnimationName(stylesRef.current).includes(event.animationName);
        event.target === node1 && isCurrentAnimation && $iqq3r$flushSync(
          () => send("ANIMATION_END")
        );
      }, handleAnimationStart = (event) => {
        event.target === node1 && (prevAnimationNameRef.current = $921a889cee6df7e8$var$getAnimationName(stylesRef.current));
      };
      return node1.addEventListener("animationstart", handleAnimationStart), node1.addEventListener("animationcancel", handleAnimationEnd), node1.addEventListener("animationend", handleAnimationEnd), () => {
        node1.removeEventListener("animationstart", handleAnimationStart), node1.removeEventListener("animationcancel", handleAnimationEnd), node1.removeEventListener("animationend", handleAnimationEnd);
      };
    } else
      send("ANIMATION_END");
  }, [
    node1,
    send
  ]), {
    isPresent: [
      "mounted",
      "unmountSuspended"
    ].includes(state),
    ref: $iqq3r$useCallback((node) => {
      node && (stylesRef.current = getComputedStyle(node)), setNode(node);
    }, [])
  };
}
function $921a889cee6df7e8$var$getAnimationName(styles) {
  return styles?.animationName || "none";
}

// ../../node_modules/@radix-ui/react-tabs/dist/index.mjs
var $69cb30bb0017df05$var$TABS_NAME = "Tabs", [$69cb30bb0017df05$var$createTabsContext, $69cb30bb0017df05$export$355f5bd209d7b13a] = $c512c27ab02ef895$export$50c7b4e9d9f19c1($69cb30bb0017df05$var$TABS_NAME, [
  $d7bdfb9eb0fdf311$export$c7109489551a4f4
]), $69cb30bb0017df05$var$useRovingFocusGroupScope = $d7bdfb9eb0fdf311$export$c7109489551a4f4(), [$69cb30bb0017df05$var$TabsProvider, $69cb30bb0017df05$var$useTabsContext] = $69cb30bb0017df05$var$createTabsContext($69cb30bb0017df05$var$TABS_NAME), $69cb30bb0017df05$export$b2539bed5023c21c = $1IHzk$forwardRef((props, forwardedRef) => {
  let { __scopeTabs, value: valueProp, onValueChange, defaultValue, orientation = "horizontal", dir, activationMode = "automatic", ...tabsProps } = props, direction = $f631663db3294ace$export$b39126d51d94e6f3(dir), [value, setValue] = $71cd76cc60e0454e$export$6f32135080cb4c3({
    prop: valueProp,
    onChange: onValueChange,
    defaultProp: defaultValue
  });
  return $1IHzk$createElement($69cb30bb0017df05$var$TabsProvider, {
    scope: __scopeTabs,
    baseId: $1746a345f3d73bb7$export$f680877a34711e37(),
    value,
    onValueChange: setValue,
    orientation,
    dir: direction,
    activationMode
  }, $1IHzk$createElement($8927f6f2acc4f386$export$250ffa63cdc0d034.div, _extends({
    dir: direction,
    "data-orientation": orientation
  }, tabsProps, {
    ref: forwardedRef
  })));
});
Object.assign($69cb30bb0017df05$export$b2539bed5023c21c, {
  displayName: $69cb30bb0017df05$var$TABS_NAME
});
var $69cb30bb0017df05$var$TAB_LIST_NAME = "TabsList", $69cb30bb0017df05$export$9712d22edc0d78c1 = $1IHzk$forwardRef((props, forwardedRef) => {
  let { __scopeTabs, loop = !0, ...listProps } = props, context = $69cb30bb0017df05$var$useTabsContext($69cb30bb0017df05$var$TAB_LIST_NAME, __scopeTabs), rovingFocusGroupScope = $69cb30bb0017df05$var$useRovingFocusGroupScope(__scopeTabs);
  return $1IHzk$createElement($d7bdfb9eb0fdf311$export$be92b6f5f03c0fe9, _extends({
    asChild: !0
  }, rovingFocusGroupScope, {
    orientation: context.orientation,
    dir: context.dir,
    loop
  }), $1IHzk$createElement($8927f6f2acc4f386$export$250ffa63cdc0d034.div, _extends({
    role: "tablist",
    "aria-orientation": context.orientation
  }, listProps, {
    ref: forwardedRef
  })));
});
Object.assign($69cb30bb0017df05$export$9712d22edc0d78c1, {
  displayName: $69cb30bb0017df05$var$TAB_LIST_NAME
});
var $69cb30bb0017df05$var$TRIGGER_NAME = "TabsTrigger", $69cb30bb0017df05$export$8114b9fdfdf9f3ba = $1IHzk$forwardRef((props, forwardedRef) => {
  let { __scopeTabs, value, disabled = !1, ...triggerProps } = props, context = $69cb30bb0017df05$var$useTabsContext($69cb30bb0017df05$var$TRIGGER_NAME, __scopeTabs), rovingFocusGroupScope = $69cb30bb0017df05$var$useRovingFocusGroupScope(__scopeTabs), triggerId = $69cb30bb0017df05$var$makeTriggerId(context.baseId, value), contentId = $69cb30bb0017df05$var$makeContentId(context.baseId, value), isSelected = value === context.value;
  return $1IHzk$createElement($d7bdfb9eb0fdf311$export$6d08773d2e66f8f2, _extends({
    asChild: !0
  }, rovingFocusGroupScope, {
    focusable: !disabled,
    active: isSelected
  }), $1IHzk$createElement($8927f6f2acc4f386$export$250ffa63cdc0d034.button, _extends({
    type: "button",
    role: "tab",
    "aria-selected": isSelected,
    "aria-controls": contentId,
    "data-state": isSelected ? "active" : "inactive",
    "data-disabled": disabled ? "" : void 0,
    disabled,
    id: triggerId
  }, triggerProps, {
    ref: forwardedRef,
    onMouseDown: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onMouseDown, (event) => {
      !disabled && event.button === 0 && event.ctrlKey === !1 ? context.onValueChange(value) : event.preventDefault();
    }),
    onKeyDown: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onKeyDown, (event) => {
      [
        " ",
        "Enter"
      ].includes(event.key) && context.onValueChange(value);
    }),
    onFocus: $e42e1063c40fb3ef$export$b9ecd428b558ff10(props.onFocus, () => {
      let isAutomaticActivation = context.activationMode !== "manual";
      !isSelected && !disabled && isAutomaticActivation && context.onValueChange(value);
    })
  })));
});
Object.assign($69cb30bb0017df05$export$8114b9fdfdf9f3ba, {
  displayName: $69cb30bb0017df05$var$TRIGGER_NAME
});
var $69cb30bb0017df05$var$CONTENT_NAME = "TabsContent", $69cb30bb0017df05$export$bd905d70e8fd2ebb = $1IHzk$forwardRef((props, forwardedRef) => {
  let { __scopeTabs, value, forceMount, children, ...contentProps } = props, context = $69cb30bb0017df05$var$useTabsContext($69cb30bb0017df05$var$CONTENT_NAME, __scopeTabs), triggerId = $69cb30bb0017df05$var$makeTriggerId(context.baseId, value), contentId = $69cb30bb0017df05$var$makeContentId(context.baseId, value), isSelected = value === context.value, isMountAnimationPreventedRef = $1IHzk$useRef(isSelected);
  return $1IHzk$useEffect(() => {
    let rAF = requestAnimationFrame(
      () => isMountAnimationPreventedRef.current = !1
    );
    return () => cancelAnimationFrame(rAF);
  }, []), $1IHzk$createElement(
    $921a889cee6df7e8$export$99c2b779aa4e8b8b,
    {
      present: forceMount || isSelected
    },
    ({ present }) => $1IHzk$createElement($8927f6f2acc4f386$export$250ffa63cdc0d034.div, _extends({
      "data-state": isSelected ? "active" : "inactive",
      "data-orientation": context.orientation,
      role: "tabpanel",
      "aria-labelledby": triggerId,
      hidden: !present,
      id: contentId,
      tabIndex: 0
    }, contentProps, {
      ref: forwardedRef,
      style: {
        ...props.style,
        animationDuration: isMountAnimationPreventedRef.current ? "0s" : void 0
      }
    }), present && children)
  );
});
Object.assign($69cb30bb0017df05$export$bd905d70e8fd2ebb, {
  displayName: $69cb30bb0017df05$var$CONTENT_NAME
});
function $69cb30bb0017df05$var$makeTriggerId(baseId, value) {
  return `${baseId}-trigger-${value}`;
}
function $69cb30bb0017df05$var$makeContentId(baseId, value) {
  return `${baseId}-content-${value}`;
}
var $69cb30bb0017df05$export$be92b6f5f03c0fe9 = $69cb30bb0017df05$export$b2539bed5023c21c, $69cb30bb0017df05$export$54c2e3dc7acea9f5 = $69cb30bb0017df05$export$9712d22edc0d78c1, $69cb30bb0017df05$export$41fb9f06171c75f4 = $69cb30bb0017df05$export$8114b9fdfdf9f3ba, $69cb30bb0017df05$export$7c6e2c02157bb7d2 = $69cb30bb0017df05$export$bd905d70e8fd2ebb;

// src/components/Report/Details.tsx
import { styled } from "storybook/theming";
var StyledSyntaxHighlighter = styled(SyntaxHighlighter)(
  ({ theme: theme2 }) => ({
    fontSize: theme2.typography.size.s1
  }),
  ({ language }) => (
    // We appended ' {}' to the selector in order to get proper syntax highlighting. This rule hides the last 3 spans
    // (one character each) in the displayed output. Only siblings of .selector (the actual CSS selector characters)
    // are targeted so that the code comment line isn't affected.
    language === "css" && {
      ".selector ~ span:nth-last-of-type(-n+3)": {
        display: "none"
      }
    }
  )
), Info = styled.div({
  display: "flex",
  flexDirection: "column"
}), RuleId = styled.div(({ theme: theme2 }) => ({
  display: "block",
  color: theme2.textMutedColor,
  fontFamily: theme2.typography.fonts.mono,
  fontSize: theme2.typography.size.s1,
  marginTop: -8,
  marginBottom: 12,
  "@container (min-width: 800px)": {
    display: "none"
  }
})), Description = styled.p({
  margin: 0
}), Wrapper = styled.div({
  display: "flex",
  flexDirection: "column",
  padding: "0 15px 20px 15px",
  gap: 20
}), Columns = styled.div({
  gap: 15,
  "@container (min-width: 800px)": {
    display: "grid",
    gridTemplateColumns: "50% 50%"
  }
}), Content = styled.div(({ theme: theme2, side }) => ({
  display: side === "left" ? "flex" : "none",
  flexDirection: "column",
  gap: 15,
  margin: side === "left" ? "15px 0" : 0,
  padding: side === "left" ? "0 15px" : 0,
  borderLeft: side === "left" ? `1px solid ${theme2.color.border}` : "none",
  "&:focus-visible": {
    outline: "none",
    borderRadius: 4,
    boxShadow: `0 0 0 1px inset ${theme2.color.secondary}`
  },
  "@container (min-width: 800px)": {
    display: side === "left" ? "none" : "flex"
  }
})), Item = styled(Button)(({ theme: theme2 }) => ({
  fontFamily: theme2.typography.fonts.mono,
  fontWeight: theme2.typography.weight.regular,
  color: theme2.textMutedColor,
  height: 40,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "0 12px",
  '&[data-state="active"]': {
    color: theme2.color.secondary,
    backgroundColor: theme2.background.hoverable
  }
})), Messages = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 10
}), Actions = styled.div({
  display: "flex",
  gap: 10
}), CopyButton = ({ onClick }) => {
  let [copied, setCopied] = useState3(!1), handleClick = useCallback2(() => {
    onClick(), setCopied(!0);
    let timeout = setTimeout(() => setCopied(!1), 2e3);
    return () => clearTimeout(timeout);
  }, [onClick]);
  return React2.createElement(Button, { ariaLabel: !1, onClick: handleClick }, copied ? React2.createElement(CheckIcon, null) : React2.createElement(CopyIcon, null), " ", copied ? "Copied" : "Copy link");
}, Details = ({ id, item, type, selection, handleSelectionChange }) => React2.createElement(Wrapper, { id }, React2.createElement(Info, null, React2.createElement(RuleId, null, item.id), React2.createElement(Description, null, getFriendlySummaryForAxeResult(item), " ", React2.createElement(Link, { href: item.helpUrl, target: "_blank", rel: "noopener noreferrer", withArrow: !0 }, "Learn how to resolve this violation"))), React2.createElement(
  $69cb30bb0017df05$export$be92b6f5f03c0fe9,
  {
    defaultValue: selection,
    orientation: "vertical",
    value: selection,
    onValueChange: handleSelectionChange,
    asChild: !0
  },
  React2.createElement(Columns, null, React2.createElement($69cb30bb0017df05$export$54c2e3dc7acea9f5, { "aria-label": type }, item.nodes.map((node, index) => {
    let key = `${type}.${item.id}.${index + 1}`;
    return React2.createElement(Fragment, { key }, React2.createElement($69cb30bb0017df05$export$41fb9f06171c75f4, { value: key, asChild: !0 }, React2.createElement(Item, { ariaLabel: !1, variant: "ghost", size: "medium", id: key }, index + 1, ". ", node.html)), React2.createElement($69cb30bb0017df05$export$7c6e2c02157bb7d2, { value: key, asChild: !0 }, React2.createElement(Content, { side: "left" }, getContent(node))));
  })), item.nodes.map((node, index) => {
    let key = `${type}.${item.id}.${index + 1}`;
    return React2.createElement($69cb30bb0017df05$export$7c6e2c02157bb7d2, { key, value: key, asChild: !0 }, React2.createElement(Content, { side: "right" }, getContent(node)));
  }))
));
function getContent(node) {
  let { handleCopyLink, handleJumpToElement } = useA11yContext(), { any, all, none, html, target } = node, rules = [...any, ...all, ...none];
  return React2.createElement(React2.Fragment, null, React2.createElement(Messages, null, rules.map((rule) => React2.createElement("div", { key: rule.id }, `${rule.message}${/(\.|: [^.]+\.*)$/.test(rule.message) ? "" : "."}`))), React2.createElement(Actions, null, React2.createElement(Button, { ariaLabel: !1, onClick: () => handleJumpToElement(node.target.toString()) }, React2.createElement(LocationIcon, null), " Jump to element"), React2.createElement(CopyButton, { onClick: () => handleCopyLink(node.linkPath) })), React2.createElement(
    StyledSyntaxHighlighter,
    {
      language: "jsx",
      wrapLongLines: !0
    },
    `/* element */
${html}`
  ), React2.createElement(
    StyledSyntaxHighlighter,
    {
      language: "css",
      wrapLongLines: !0
    },
    `/* selector */
${target} {}`
  ));
}

// src/components/Report/Report.tsx
var impactStatus = {
  minor: "neutral",
  moderate: "warning",
  serious: "negative",
  critical: "critical"
}, impactLabels = {
  minor: "Minor",
  moderate: "Moderate",
  serious: "Serious",
  critical: "Critical"
}, Wrapper2 = styled2.div(({ theme: theme2 }) => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  borderBottom: `1px solid ${theme2.appBorderColor}`,
  containerType: "inline-size",
  fontSize: theme2.typography.size.s2
})), Icon = styled2(ChevronSmallDownIcon)({
  transition: "transform 0.1s ease-in-out"
}), HeaderBar = styled2.div(({ theme: theme2 }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px 6px 15px",
  minHeight: 40,
  background: "none",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
  "&:hover": {
    color: theme2.color.secondary
  }
})), Title = styled2.div(({ theme: theme2 }) => ({
  display: "flex",
  alignItems: "baseline",
  flexGrow: 1,
  fontSize: theme2.typography.size.s2,
  gap: 8
})), RuleId2 = styled2.div(({ theme: theme2 }) => ({
  display: "none",
  color: theme2.textMutedColor,
  fontFamily: theme2.typography.fonts.mono,
  fontSize: theme2.typography.size.s1,
  "@container (min-width: 800px)": {
    display: "block"
  }
})), Count = styled2.div(({ theme: theme2 }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme2.textMutedColor,
  width: 28,
  height: 28
})), Report = ({
  items,
  empty,
  type,
  handleSelectionChange,
  selectedItems,
  toggleOpen
}) => React3.createElement(React3.Fragment, null, items && items.length ? items.map((item) => {
  let id = `${type}.${item.id}`, detailsId = `details:${id}`, selection = selectedItems.get(id), title = getTitleForAxeResult(item);
  return React3.createElement(Wrapper2, { key: id }, React3.createElement(HeaderBar, { onClick: (event) => toggleOpen(event, type, item), "data-active": !!selection }, React3.createElement(Title, null, React3.createElement("strong", null, title), React3.createElement(RuleId2, null, item.id)), item.impact && React3.createElement(Badge, { status: type === RuleType.PASS ? "neutral" : impactStatus[item.impact] }, impactLabels[item.impact]), React3.createElement(Count, null, item.nodes.length), React3.createElement(
    Button2,
    {
      onClick: (event) => toggleOpen(event, type, item),
      ariaLabel: `${selection ? "Collapse" : "Expand"} details for: ${title}`,
      "aria-expanded": !!selection,
      "aria-controls": detailsId,
      variant: "ghost",
      padding: "small"
    },
    React3.createElement(Icon, { style: { transform: `rotate(${selection ? -180 : 0}deg)` } })
  )), selection ? React3.createElement(
    Details,
    {
      id: detailsId,
      item,
      type,
      selection,
      handleSelectionChange
    }
  ) : React3.createElement("div", { id: detailsId }));
}) : React3.createElement(EmptyTabContent, { title: empty }));

// src/components/Tabs.tsx
import * as React4 from "react";
import { Button as Button3, TabsView } from "storybook/internal/components";
import { CollapseIcon, ExpandAltIcon, EyeCloseIcon, EyeIcon, SyncIcon } from "@storybook/icons";
import { styled as styled3, useTheme } from "storybook/theming";
var Container = styled3.div({
  width: "100%",
  position: "relative",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
}), ActionsWrapper = styled3.div({
  display: "flex",
  justifyContent: "flex-end",
  gap: 6
}), Tabs = ({ tabs }) => {
  let {
    tab,
    setTab,
    toggleHighlight,
    highlighted,
    handleManual,
    allExpanded,
    handleCollapseAll,
    handleExpandAll
  } = useA11yContext(), theme2 = useTheme();
  return React4.createElement(Container, null, React4.createElement(
    TabsView,
    {
      backgroundColor: theme2.background.app,
      panelProps: { hasScrollbar: !0 },
      tabs: tabs.map((tab2) => ({
        id: tab2.type,
        title: tab2.label,
        children: tab2.panel
      })),
      selected: tab,
      onSelectionChange: (key) => setTab(key),
      tools: React4.createElement(ActionsWrapper, null, React4.createElement(
        Button3,
        {
          variant: "ghost",
          padding: "small",
          onClick: toggleHighlight,
          ariaLabel: highlighted ? "Hide accessibility test result highlights" : "Highlight elements with accessibility test results"
        },
        highlighted ? React4.createElement(EyeCloseIcon, null) : React4.createElement(EyeIcon, null)
      ), React4.createElement(
        Button3,
        {
          variant: "ghost",
          padding: "small",
          onClick: allExpanded ? handleCollapseAll : handleExpandAll,
          ariaLabel: allExpanded ? "Collapse all results" : "Expand all results",
          "aria-expanded": allExpanded
        },
        allExpanded ? React4.createElement(CollapseIcon, null) : React4.createElement(ExpandAltIcon, null)
      ), React4.createElement(
        Button3,
        {
          variant: "ghost",
          padding: "small",
          onClick: handleManual,
          ariaLabel: "Rerun accessibility scan"
        },
        React4.createElement(SyncIcon, null)
      ))
    }
  ));
};

// src/components/TestDiscrepancyMessage.tsx
import React5, { useMemo as useMemo2 } from "react";
import { Link as Link2 } from "storybook/internal/components";
import { useStorybookApi as useStorybookApi2 } from "storybook/manager-api";
import { styled as styled4 } from "storybook/theming";
var Wrapper3 = styled4.div(({ theme: { color, typography, background } }) => ({
  textAlign: "start",
  padding: "11px 15px",
  fontSize: `${typography.size.s2}px`,
  fontWeight: typography.weight.regular,
  lineHeight: "1rem",
  background: background.app,
  borderBottom: `1px solid ${color.border}`,
  color: color.defaultText,
  backgroundClip: "padding-box",
  position: "relative",
  code: {
    fontSize: `${typography.size.s1 - 1}px`,
    color: "inherit",
    margin: "0 0.2em",
    padding: "0 0.2em",
    background: "rgba(255, 255, 255, 0.8)",
    borderRadius: "2px",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.1)"
  }
})), TestDiscrepancyMessage = ({ discrepancy }) => {
  let docsUrl = useStorybookApi2().getDocsUrl({
    subpath: DOCUMENTATION_DISCREPANCY_LINK,
    versioned: !0,
    renderer: !0
  }), message = useMemo2(() => {
    switch (discrepancy) {
      case "browserPassedCliFailed":
        return "Accessibility checks passed in this browser but failed in the CLI.";
      case "cliPassedBrowserFailed":
        return "Accessibility checks passed in the CLI but failed in this browser.";
      case "cliFailedButModeManual":
        return "Accessibility checks failed in the CLI. Run the tests manually to see the results.";
      default:
        return null;
    }
  }, [discrepancy]);
  return message ? React5.createElement(Wrapper3, null, message, " ", React5.createElement(Link2, { href: docsUrl, target: "_blank", withArrow: !0 }, "Learn what could cause this")) : null;
};

// src/components/A11YPanel.tsx
var RotatingIcon = styled5(SyncIcon2)(({ theme: theme2 }) => ({
  animation: `${theme2.animation.rotate360} 1s linear infinite;`,
  margin: 4
})), Tab = styled5.div({
  display: "flex",
  alignItems: "center",
  gap: 6
}), Centered = styled5.span(({ theme: theme2 }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  fontSize: theme2.typography.size.s2,
  height: "100%",
  gap: 24,
  div: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8
  },
  p: {
    margin: 0,
    color: theme2.textMutedColor
  },
  code: {
    display: "inline-block",
    fontSize: theme2.typography.size.s2 - 1,
    backgroundColor: theme2.background.app,
    border: `1px solid ${theme2.color.border}`,
    borderRadius: 4,
    padding: "2px 3px"
  }
})), A11YPanel = () => {
  let {
    parameters,
    tab,
    results,
    status,
    handleManual,
    error,
    discrepancy,
    handleSelectionChange,
    selectedItems,
    toggleOpen
  } = useA11yContext(), tabs = useMemo3(() => {
    let { passes, incomplete, violations } = results ?? {
      passes: [],
      incomplete: [],
      violations: []
    };
    return [
      {
        label: React6.createElement(Tab, null, "Violations", React6.createElement(Badge2, { compact: !0, status: tab === "violations" ? "active" : "neutral" }, violations.length)),
        panel: React6.createElement(
          Report,
          {
            items: violations,
            type: RuleType.VIOLATION,
            empty: "No accessibility violations found.",
            handleSelectionChange,
            selectedItems,
            toggleOpen
          }
        ),
        items: violations,
        type: RuleType.VIOLATION
      },
      {
        label: React6.createElement(Tab, null, "Passes", React6.createElement(Badge2, { compact: !0, status: tab === "passes" ? "active" : "neutral" }, passes.length)),
        panel: React6.createElement(
          Report,
          {
            items: passes,
            type: RuleType.PASS,
            empty: "No passing accessibility checks found.",
            handleSelectionChange,
            selectedItems,
            toggleOpen
          }
        ),
        items: passes,
        type: RuleType.PASS
      },
      {
        label: React6.createElement(Tab, null, "Inconclusive", React6.createElement(Badge2, { compact: !0, status: tab === "incomplete" ? "active" : "neutral" }, incomplete.length)),
        panel: React6.createElement(
          Report,
          {
            items: incomplete,
            type: RuleType.INCOMPLETION,
            empty: "No inconclusive accessibility checks found.",
            handleSelectionChange,
            selectedItems,
            toggleOpen
          }
        ),
        items: incomplete,
        type: RuleType.INCOMPLETION
      }
    ];
  }, [tab, results, handleSelectionChange, selectedItems, toggleOpen]);
  return parameters.disable || parameters.test === "off" ? React6.createElement(Centered, null, React6.createElement("div", null, React6.createElement("strong", null, "Accessibility tests are disabled for this story"), React6.createElement("p", null, "Update", " ", React6.createElement("code", null, parameters.disable ? "parameters.a11y.disable" : "parameters.a11y.test"), " ", "to enable accessibility tests."))) : React6.createElement(React6.Fragment, null, discrepancy && React6.createElement(TestDiscrepancyMessage, { discrepancy }), status === "ready" || status === "ran" ? React6.createElement(Tabs, { key: "tabs", tabs }) : React6.createElement(Centered, { style: { marginTop: discrepancy ? "1em" : 0 } }, status === "initial" && React6.createElement("div", null, React6.createElement(RotatingIcon, { size: 12 }), React6.createElement("strong", null, "Preparing accessibility scan"), React6.createElement("p", null, "Please wait while the addon is initializing...")), status === "manual" && React6.createElement(React6.Fragment, null, React6.createElement("div", null, React6.createElement("strong", null, "Accessibility tests run manually for this story"), React6.createElement("p", null, "Results will not show when using the testing module. You can still run accessibility tests manually.")), React6.createElement(Button4, { ariaLabel: !1, size: "medium", onClick: handleManual }, "Run accessibility scan"), React6.createElement("p", null, "Update ", React6.createElement("code", null, "globals.a11y.manual"), " to disable manual mode.")), status === "running" && React6.createElement("div", null, React6.createElement(RotatingIcon, { size: 12 }), React6.createElement("strong", null, "Accessibility scan in progress"), React6.createElement("p", null, "Please wait while the accessibility scan is running...")), status === "error" && React6.createElement(React6.Fragment, null, React6.createElement("div", null, React6.createElement("strong", null, "The accessibility scan encountered an error"), React6.createElement("p", null, typeof error == "string" ? error : error instanceof Error ? error.toString() : JSON.stringify(error, null, 2))), React6.createElement(Button4, { ariaLabel: !1, size: "medium", onClick: handleManual }, "Rerun accessibility scan")), status === "component-test-error" && React6.createElement(React6.Fragment, null, React6.createElement("div", null, React6.createElement("strong", null, "This story's component tests failed"), React6.createElement("p", null, "Automated accessibility tests will not run until this is resolved. You can still test manually.")), React6.createElement(Button4, { ariaLabel: !1, size: "medium", onClick: handleManual }, "Run accessibility scan"))));
};

// src/components/VisionSimulator.tsx
import React8, { useState as useState4 } from "react";
import { Select } from "storybook/internal/components";
import { AccessibilityIcon } from "@storybook/icons";
import { Global, styled as styled6 } from "storybook/theming";

// src/components/ColorFilters.tsx
import * as React7 from "react";
var Filters = (props) => React7.createElement("svg", { ...props }, React7.createElement("defs", null, React7.createElement("filter", { id: "protanopia" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0"
  }
)), React7.createElement("filter", { id: "protanomaly" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.817, 0.183, 0, 0, 0 0.333, 0.667, 0, 0, 0 0, 0.125, 0.875, 0, 0 0, 0, 0, 1, 0"
  }
)), React7.createElement("filter", { id: "deuteranopia" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0"
  }
)), React7.createElement("filter", { id: "deuteranomaly" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.8, 0.2, 0, 0, 0 0.258, 0.742, 0, 0, 0 0, 0.142, 0.858, 0, 0 0, 0, 0, 1, 0"
  }
)), React7.createElement("filter", { id: "tritanopia" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.95, 0.05,  0, 0, 0 0,  0.433, 0.567, 0, 0 0,  0.475, 0.525, 0, 0 0,  0, 0, 1, 0"
  }
)), React7.createElement("filter", { id: "tritanomaly" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.967, 0.033, 0, 0, 0 0, 0.733, 0.267, 0, 0 0, 0.183, 0.817, 0, 0 0, 0, 0, 1, 0"
  }
)), React7.createElement("filter", { id: "achromatopsia" }, React7.createElement(
  "feColorMatrix",
  {
    in: "SourceGraphic",
    type: "matrix",
    values: "0.299, 0.587, 0.114, 0, 0 0.299, 0.587, 0.114, 0, 0 0.299, 0.587, 0.114, 0, 0 0, 0, 0, 1, 0"
  }
))));

// src/components/VisionSimulator.tsx
var iframeId = "storybook-preview-iframe", baseList = [
  { name: "blurred vision", percentage: 22.9 },
  { name: "deuteranomaly", percentage: 2.7 },
  { name: "deuteranopia", percentage: 0.56 },
  { name: "protanomaly", percentage: 0.66 },
  { name: "protanopia", percentage: 0.59 },
  { name: "tritanomaly", percentage: 0.01 },
  { name: "tritanopia", percentage: 0.016 },
  { name: "achromatopsia", percentage: 1e-4 },
  { name: "grayscale" }
], getFilter = (filterName) => filterName ? filterName === "blurred vision" ? "blur(2px)" : filterName === "grayscale" ? "grayscale(100%)" : `url('#${filterName}')` : "none", Hidden = styled6.div({
  "&, & svg": {
    position: "absolute",
    width: 0,
    height: 0
  }
}), ColorIcon = styled6.span(
  {
    background: "linear-gradient(to right, #F44336, #FF9800, #FFEB3B, #8BC34A, #2196F3, #9C27B0)",
    borderRadius: "1rem",
    display: "block",
    height: "1rem",
    width: "1rem"
  },
  ({ $filter }) => ({
    filter: getFilter($filter)
  }),
  ({ theme: theme2 }) => ({
    boxShadow: `${theme2.appBorderColor} 0 0 0 1px inset`
  })
), VisionSimulator = () => {
  let [filter, setFilter] = useState4(null), options = baseList.map(({ name, percentage }) => {
    let description = percentage !== void 0 ? `${percentage}% of users` : void 0;
    return {
      title: name,
      description,
      icon: React8.createElement(ColorIcon, { $filter: name }),
      value: name
    };
  });
  return React8.createElement(React8.Fragment, null, filter && React8.createElement(
    Global,
    {
      styles: {
        [`#${iframeId}`]: {
          filter: getFilter(filter.name)
        }
      }
    }
  ), React8.createElement(
    Select,
    {
      resetLabel: "Reset color filter",
      onReset: () => setFilter(null),
      icon: React8.createElement(AccessibilityIcon, null),
      ariaLabel: "Vision simulator",
      defaultOptions: filter?.name,
      options,
      onSelect: (selected) => setFilter(() => ({ name: selected }))
    }
  ), React8.createElement(Hidden, null, React8.createElement(Filters, null)));
};

// src/manager.tsx
var Title2 = () => {
  let selectedPanel = useStorybookApi3().getSelectedPanel(), [{ results }] = useAddonState2(ADDON_ID, {
    ui: {
      highlighted: !1,
      tab: RuleType.VIOLATION
    },
    results: void 0,
    error: void 0,
    status: "initial"
  }), violationsNb = results?.violations?.length ?? 0, incompleteNb = results?.incomplete?.length ?? 0, count = violationsNb + incompleteNb, suffix = count === 0 ? null : React9.createElement(Badge3, { compact: !0, status: selectedPanel === PANEL_ID ? "active" : "neutral" }, count);
  return React9.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React9.createElement("span", null, "Accessibility"), suffix);
};
addons.register(ADDON_ID, (api) => {
  addons.add(PANEL_ID, {
    title: "",
    type: types.TOOL,
    match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
    render: () => React9.createElement(VisionSimulator, null)
  }), addons.add(PANEL_ID, {
    title: Title2,
    type: types.PANEL,
    render: ({ active = !0 }) => React9.createElement(A11yContextProvider, null, active ? React9.createElement(A11YPanel, null) : null),
    paramKey: PARAM_KEY
  });
});
