// src/constants.ts
var ADDON_ID = "storybook/a11y", PANEL_ID = `${ADDON_ID}/panel`, PARAM_KEY = "a11y", VISION_GLOBAL_KEY = "vision", UI_STATE_ID = `${ADDON_ID}/ui`, RESULT = `${ADDON_ID}/result`, REQUEST = `${ADDON_ID}/request`, RUNNING = `${ADDON_ID}/running`, ERROR = `${ADDON_ID}/error`, MANUAL = `${ADDON_ID}/manual`, SELECT = `${ADDON_ID}/select`, DOCUMENTATION_LINK = "writing-tests/accessibility-testing", DOCUMENTATION_DISCREPANCY_LINK = `${DOCUMENTATION_LINK}#why-are-my-tests-failing-in-different-environments`;
var EVENTS = { RESULT, REQUEST, RUNNING, ERROR, MANUAL, SELECT }, STATUS_TYPE_ID_COMPONENT_TEST = "storybook/component-test", STATUS_TYPE_ID_A11Y = "storybook/a11y";

// src/visionSimulatorFilters.ts
var filters = {
  blurred: {
    label: "Blurred vision",
    filter: "blur(2px)",
    percentage: 22.9
  },
  deuteranomaly: {
    label: "Deuteranomaly",
    filter: 'url("#storybook-a11y-vision-deuteranomaly")',
    percentage: 2.7
  },
  deuteranopia: {
    label: "Deuteranopia",
    filter: 'url("#storybook-a11y-vision-deuteranopia")',
    percentage: 0.56
  },
  protanomaly: {
    label: "Protanomaly",
    filter: 'url("#storybook-a11y-vision-protanomaly")',
    percentage: 0.66
  },
  protanopia: {
    label: "Protanopia",
    filter: 'url("#storybook-a11y-vision-protanopia")',
    percentage: 0.59
  },
  tritanomaly: {
    label: "Tritanomaly",
    filter: 'url("#storybook-a11y-vision-tritanomaly")',
    percentage: 0.01
  },
  tritanopia: {
    label: "Tritanopia",
    filter: 'url("#storybook-a11y-vision-tritanopia")',
    percentage: 0.016
  },
  achromatopsia: {
    label: "Achromatopsia",
    filter: 'url("#storybook-a11y-vision-achromatopsia")',
    percentage: 1e-4
  },
  grayscale: {
    label: "Grayscale",
    filter: "grayscale(100%)"
  }
}, filterDefs = `<svg id="storybook-a11y-vision-filters" style="display: none !important;">
  <defs>
    <filter id="storybook-a11y-vision-protanopia">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0"
      />
    </filter>
    <filter id="storybook-a11y-vision-protanomaly">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.817, 0.183, 0, 0, 0 0.333, 0.667, 0, 0, 0 0, 0.125, 0.875, 0, 0 0, 0, 0, 1, 0"
      />
    </filter>
    <filter id="storybook-a11y-vision-deuteranopia">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0"
      />
    </filter>
    <filter id="storybook-a11y-vision-deuteranomaly">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.8, 0.2, 0, 0, 0 0.258, 0.742, 0, 0, 0 0, 0.142, 0.858, 0, 0 0, 0, 0, 1, 0"
      />
    </filter>
    <filter id="storybook-a11y-vision-tritanopia">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.95, 0.05,  0, 0, 0 0,  0.433, 0.567, 0, 0 0,  0.475, 0.525, 0, 0 0,  0, 0, 1, 0"
      />
    </filter>
    <filter id="storybook-a11y-vision-tritanomaly">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.967, 0.033, 0, 0, 0 0, 0.733, 0.267, 0, 0 0, 0.183, 0.817, 0, 0 0, 0, 0, 1, 0"
      />
    </filter>
    <filter id="storybook-a11y-vision-achromatopsia">
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.299, 0.587, 0.114, 0, 0 0.299, 0.587, 0.114, 0, 0 0.299, 0.587, 0.114, 0, 0 0, 0, 0, 1, 0"
      />
    </filter>
  </defs>
</svg>`;

export {
  ADDON_ID,
  PANEL_ID,
  PARAM_KEY,
  VISION_GLOBAL_KEY,
  DOCUMENTATION_DISCREPANCY_LINK,
  EVENTS,
  STATUS_TYPE_ID_COMPONENT_TEST,
  STATUS_TYPE_ID_A11Y,
  filters,
  filterDefs
};
