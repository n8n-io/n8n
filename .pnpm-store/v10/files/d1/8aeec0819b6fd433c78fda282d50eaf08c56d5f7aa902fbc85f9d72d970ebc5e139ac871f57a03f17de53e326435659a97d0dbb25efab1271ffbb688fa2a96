import type { CssColor, CssShadow, FontFamilyFull, FontSize, FontWeight, PixelSize } from './types';
export interface AgBaseChartThemeParams {
    /**
     * The 'brand colour' for the chart, used wherever a non-neutral colour is required. Selections, focus outlines and
     * checkboxes use the accent colour by default.
     */
    accentColor?: CssColor;
    /**
     * Background colour of the chart. Most text, borders and backgrounds are defined as a blend between the background
     * and foreground colors.
     */
    backgroundColor?: CssColor;
    /** Default colour for borders. */
    borderColor?: CssColor;
    /** Default corner radius for many UI elements such as menus and dialogs.  */
    borderRadius?: PixelSize;
    /** Background colour of standard action buttons. */
    buttonBackgroundColor?: CssColor;
    /** Border around standard action buttons. */
    buttonBorder?: boolean;
    /** Font weight of standard action buttons. */
    buttonFontWeight?: FontWeight;
    /** Text colour of standard action buttons. */
    buttonTextColor?: CssColor;
    /** Shadow around UI controls that have focus e.g. text inputs and buttons. The value must a valid CSS box-shadow. */
    focusShadow?: CssShadow;
    /**
     * Default colour for neutral UI elements. Most text, borders and backgrounds are defined as a blend between the
     * background and foreground colors.
     */
    foregroundColor?: CssColor;
    /** Font family used for all text. */
    fontFamily?: FontFamilyFull;
    /** Default font size used for all text. Titles and some other text are scaled to this font size. */
    fontSize?: FontSize;
    /**
     * Background colour for text inputs.
     *
     * Default: `backgroundColor`
     */
    inputBackgroundColor?: CssColor;
    /** Border around text inputs. */
    inputBorder?: boolean;
    /**
     * Colour of text within text inputs.
     *
     * Default: `textColor`
     */
    inputTextColor?: CssColor;
    /** Background colour for menus, e.g. right-click context menus. */
    menuBackgroundColor?: CssColor;
    /** Border around menus. */
    menuBorder?: boolean;
    /** Text colour for menus. */
    menuTextColor?: CssColor;
    /** Background colour for panels and dialogs. */
    panelBackgroundColor?: CssColor;
    /** Colour of text that should stand out less in panels and dialogs. */
    panelSubtleTextColor?: CssColor;
    /** Default shadow for elements that float above the chart and are intended to appear separated from it, e.g. dialogs and menus. */
    popupShadow?: CssShadow;
    /**
     * Colour of text that should stand out less than the default.
     *
     * Default: `foregroundColor + backgroundColor`
     */
    subtleTextColor?: CssColor;
    /**
     * Default colour for all text.
     *
     * Default: `foregroundColor`
     */
    textColor?: CssColor;
    /** Background colour for tooltips. */
    tooltipBackgroundColor?: CssColor;
    /** Border around tooltips. */
    tooltipBorder?: boolean;
    /** Text colour for tooltips. */
    tooltipTextColor?: CssColor;
    /** Colour of text that should stand out less in tooltips. */
    tooltipSubtleTextColor?: CssColor;
}
export interface AgChartThemeParams extends AgBaseChartThemeParams {
    /** Default colour for axis lines and ticks. */
    axisColor?: CssColor;
    /** Background colour of the chart. */
    chartBackgroundColor?: CssColor;
    /** The outer chart padding. */
    chartPadding?: PixelSize;
    /**
     * Background colour of tooltips, menus, dialogs, toolbars and buttons.
     *
     * Default: `foregroundColor + backgroundColor`
     */
    chromeBackgroundColor?: CssColor;
    /**
     * Font family used for text in tooltips, menus, dialogs, toolbars, buttons and text inputs.
     *
     * Default: `fontFamily`
     */
    chromeFontFamily?: FontFamilyFull;
    /**
     * Font size used for text in tooltips, menus, dialogs, toolbars, buttons and text inputs.
     *
     * Default: `fontSize`
     */
    chromeFontSize?: FontSize;
    /**
     * Font weight used for text in tooltips, menus, dialogs, toolbars, buttons and text inputs.
     *
     * Default: `fontWeight`
     */
    chromeFontWeight?: FontWeight;
    /**
     * Default colour for text in tooltips, menus, dialogs, toolbars, buttons and text inputs.
     *
     * Default: `textColor`
     */
    chromeTextColor?: CssColor;
    /**
     * Colour of text that should stand out less than the default in tooltips, menus, dialogs, toolbars and buttons.
     *
     * Default: `subtleTextColor`
     */
    chromeSubtleTextColor?: CssColor;
    /**
     * Background colour of crosshair labels.
     *
     * Default: `foregroundColor`
     */
    crosshairLabelBackgroundColor?: CssColor;
    /**
     * Colour for text in crosshair labels.
     *
     * Default: `backgroundColor`
     */
    crosshairLabelTextColor?: CssColor;
    /** Default font weight used for all text. */
    fontWeight?: FontWeight;
    /** Default colour for grid lines. */
    gridLineColor?: CssColor;
}
