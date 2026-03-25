import {
  curriedDarken$1,
  curriedLighten$1,
  rgba
} from "./chunk-AXG2BOBL.js";

// src/theming/base.ts
var color = {
  // Official color palette
  primary: "#FF4785",
  // coral
  secondary: "#006DEB",
  // ocean
  tertiary: "#FAFBFC",
  ancillary: "#22a699",
  // Complimentary
  orange: "#FC521F",
  gold: "#FFAE00",
  green: "#66BF3C",
  seafoam: "#37D5D3",
  purple: "#6F2CAC",
  ultraviolet: "#2A0481",
  // Monochrome
  lightest: "#FFFFFF",
  lighter: "#F6F9FC",
  light: "#EEF2F6",
  mediumlight: "#ECF2F9",
  medium: "#D9E5F2",
  mediumdark: "#737F8C",
  dark: "#5C6570",
  darker: "#454C54",
  darkest: "#2E3338",
  // For borders
  border: "hsl(212 50% 30% / 0.15)",
  // Status
  positive: "#66BF3C",
  warning: "#E69D00",
  negative: "#FF4400",
  critical: "#FFFFFF",
  // Text
  defaultText: "#2E3338",
  inverseText: "#FFFFFF",
  positiveText: "#427C27",
  warningText: "#955B1E",
  negativeText: "#C23400"
}, background = {
  app: "#F6F9FC",
  bar: color.lightest,
  content: color.lightest,
  preview: color.lightest,
  gridCellSize: 10,
  hoverable: "#DBECFF",
  // Notification, error, and warning backgrounds
  positive: "#F1FFEB",
  warning: "#FFF9EB",
  negative: "#FFF0EB",
  critical: "#D13800"
}, typography = {
  fonts: {
    base: [
      '"Nunito Sans"',
      "-apple-system",
      '".SFNSText-Regular"',
      '"San Francisco"',
      "BlinkMacSystemFont",
      '"Segoe UI"',
      '"Helvetica Neue"',
      "Helvetica",
      "Arial",
      "sans-serif"
    ].join(", "),
    mono: [
      "ui-monospace",
      "Menlo",
      "Monaco",
      '"Roboto Mono"',
      '"Oxygen Mono"',
      '"Ubuntu Monospace"',
      '"Source Code Pro"',
      '"Droid Sans Mono"',
      '"Courier New"',
      "monospace"
    ].join(", ")
  },
  weight: {
    regular: 400,
    bold: 700
  },
  size: {
    s1: 12,
    s2: 14,
    s3: 16,
    m1: 20,
    m2: 24,
    m3: 28,
    l1: 32,
    l2: 40,
    l3: 48,
    code: 90
  }
}, tokens = {
  light: {
    fgColor: {
      default: color.darkest,
      muted: color.dark,
      accent: color.secondary,
      inverse: color.lightest,
      // TODO: add 'disabled'
      positive: "#427C27",
      warning: "#7A4100",
      negative: "#C23400",
      critical: "#FFFFFF"
    },
    bgColor: {
      default: color.lightest,
      muted: background.app,
      // TODO: add 'accent'? white or blue?
      positive: "#F1FFEB",
      warning: "#FFF7EB",
      negative: "#FFF0EB",
      critical: "#D13800"
    },
    borderColor: {
      default: color.border,
      muted: "hsl(0 0% 0% / 0.1)",
      inverse: "hsl(0 0% 100% / 0.1)",
      positive: "#BFE7AC",
      warning: "#FFCE85",
      negative: "#FFC3AD",
      critical: "hsl(16 100% 100% / 0)"
    }
  },
  dark: {
    fgColor: {
      default: "#C9CCCF",
      muted: "#95999D",
      accent: "#479DFF",
      inverse: "#1B1C1D",
      // TODO: add 'disabled'
      positive: "#86CE64",
      warning: "#FFAD33",
      negative: "#FF6933",
      critical: "#FF6933"
    },
    bgColor: {
      default: "#222325",
      muted: "#1B1C1D",
      // TODO: add 'accent'? white or blue?
      positive: "hsl(101 100% 100% / 0)",
      warning: "hsl(101 100% 100% / 0)",
      negative: "hsl(101 100% 100% / 0)",
      critical: "hsl(101 100% 100% / 0)"
    },
    borderColor: {
      default: "hsl(0 0% 100% / 0.1)",
      muted: "hsl(0 0% 100% / 0.5)",
      inverse: "hsl(0 0% 0% / 0.1)",
      positive: "hsl(101 52% 64% / 0.15)",
      warning: "hsl(36 100% 64% / 0.15)",
      negative: "hsl(16 100% 64% / 0.15)",
      critical: "#FF6933"
    }
  }
};

// src/theming/themes/dark.ts
var theme = {
  base: "dark",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#479DFF",
  // UI
  appBg: "#1B1C1D",
  appContentBg: "#222325",
  appHoverBg: "#233952",
  appPreviewBg: color.lightest,
  appBorderColor: "hsl(0 0% 100% / 0.1)",
  appBorderRadius: 4,
  // Fonts
  fontBase: typography.fonts.base,
  fontCode: typography.fonts.mono,
  // Text colors
  textColor: "#C9CCCF",
  textInverseColor: "#1B1C1D",
  textMutedColor: "#95999D",
  // Toolbar default and active colors
  barTextColor: "#95999D",
  barHoverColor: "#70B3FF",
  barSelectedColor: "#479DFF",
  barBg: "#222325",
  // Form colors
  buttonBg: "#1B1C1D",
  buttonBorder: "hsl(0 0% 100% / 0.1)",
  booleanBg: "#1B1C1D",
  booleanSelectedBg: "#292B2E",
  inputBg: "#1B1C1D",
  inputBorder: "hsl(0 0% 100% / 0.1)",
  inputTextColor: "#C9CCCF",
  inputBorderRadius: 4
}, dark_default = theme;

// src/theming/themes/light.ts
var theme2 = {
  base: "light",
  // Storybook-specific color palette
  colorPrimary: color.primary,
  colorSecondary: color.secondary,
  // UI
  appBg: background.app,
  appContentBg: color.lightest,
  appHoverBg: "#DBECFF",
  appPreviewBg: color.lightest,
  appBorderColor: color.border,
  appBorderRadius: 4,
  // Fonts
  fontBase: typography.fonts.base,
  fontCode: typography.fonts.mono,
  // Text colors
  textColor: color.darkest,
  textInverseColor: color.lightest,
  textMutedColor: color.dark,
  // Toolbar default and active colors
  barTextColor: color.dark,
  barHoverColor: "#005CC7",
  barSelectedColor: "#0063D6",
  barBg: color.lightest,
  // Form colors
  buttonBg: background.app,
  buttonBorder: color.medium,
  booleanBg: color.mediumlight,
  booleanSelectedBg: color.lightest,
  inputBg: color.lightest,
  inputBorder: color.border,
  inputTextColor: color.darkest,
  inputBorderRadius: 4
}, light_default = theme2;

// src/theming/utils.ts
import { logger } from "storybook/internal/client-logger";
import { global } from "@storybook/global";
var { window: globalWindow } = global, mkColor = (color2) => ({ color: color2 }), isColorString = (color2) => typeof color2 != "string" ? (logger.warn(
  `Color passed to theme object should be a string. Instead ${color2}(${typeof color2}) was passed.`
), !1) : !0, isValidColorForPolished = (color2) => !/(gradient|var|calc)/.test(color2), applyPolished = (type, color2) => type === "darken" ? rgba(`${curriedDarken$1(1, color2)}`, 0.95) : type === "lighten" ? rgba(`${curriedLighten$1(1, color2)}`, 0.95) : color2, colorFactory = (type) => (color2) => {
  if (!isColorString(color2) || !isValidColorForPolished(color2))
    return color2;
  try {
    return applyPolished(type, color2);
  } catch {
    return color2;
  }
}, lightenColor = colorFactory("lighten"), darkenColor = colorFactory("darken"), getPreferredColorScheme = () => !globalWindow || !globalWindow.matchMedia ? "light" : globalWindow.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

// src/theming/create.ts
var themesBase = {
  light: light_default,
  dark: dark_default
}, preferredColorScheme = getPreferredColorScheme(), themes = {
  ...themesBase,
  normal: themesBase[preferredColorScheme]
}, create = (vars = {
  base: preferredColorScheme
}, rest) => {
  let inherit = {
    // We always inherit the preferred color scheme.
    ...themes[preferredColorScheme],
    // And then the declared theme base if it exists.
    ...themes[vars.base] || {},
    // And then the actual theme content.
    ...vars,
    // If no theme base was declared, we declare the preferred color scheme as the base.
    base: themes[vars.base] ? vars.base : preferredColorScheme
  };
  return {
    ...rest,
    ...inherit,
    barSelectedColor: vars.barSelectedColor || inherit.colorSecondary
  };
};

export {
  color,
  background,
  typography,
  tokens,
  light_default,
  mkColor,
  lightenColor,
  darkenColor,
  getPreferredColorScheme,
  themes,
  create
};
