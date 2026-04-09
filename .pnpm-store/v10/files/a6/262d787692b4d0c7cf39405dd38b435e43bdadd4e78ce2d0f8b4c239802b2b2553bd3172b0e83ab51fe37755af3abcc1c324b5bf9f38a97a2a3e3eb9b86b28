import type { AgInitialStateOptions } from '../api/initialStateOptions';
import type { BorderOptions, Padding, PaddingOptions, TextOrSegments } from '../series/cartesian/commonOptions';
import type { AgAnimationOptions } from './animationOptions';
import type { AgChartBackgroundImage } from './backgroundOptions';
import type { Renderer } from './callbackOptions';
import type { AgContextMenuOptions } from './contextMenuOptions';
import type { AgDataSourceOptions } from './dataSourceOptions';
import type { AgBaseChartListeners } from './eventOptions';
import type { FormatterConfiguration } from './formatterOptions';
import type { AgGradientLegendOptions } from './gradientLegendOptions';
import type { AgChartLegendOptions } from './legendOptions';
import type { AgLocaleOptions } from './localeOptions';
import type { AgNavigatorOptions } from './navigatorOptions';
import type { AgRangesOptions } from './rangesOptions';
import type { AgChartTooltipOptions } from './tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, FontFamilyFull, FontSize, FontStyle, FontWeight, PixelSize, TextAlign, TextWrap } from './types';
import type { AgZoomOptions } from './zoomOptions';
export interface AgChartPaddingOptions {
    /** The number of pixels of padding at the top of the chart area. */
    top?: PixelSize;
    /** The number of pixels of padding at the right of the chart area. */
    right?: PixelSize;
    /** The number of pixels of padding at the bottom of the chart area. */
    bottom?: PixelSize;
    /** The number of pixels of padding at the left of the chart area. */
    left?: PixelSize;
}
/** @deprecated v12.1.0 Use `Padding` or `PaddingOptions` instead. */
export interface AgSeriesAreaPaddingOptions extends PaddingOptions {
}
export interface AgSeriesAreaOptions {
    /** The border around the series area. */
    border?: BorderOptions;
    /** Controls whether to strictly clip the series rendering to the series area. */
    clip?: boolean;
    /** The corner radius of the series area. */
    cornerRadius?: number;
    /** Configuration for the padding inside the series area. */
    padding?: Padding;
}
export interface AgChartOverlayRendererParams<TContext> {
    /** Context for this callback. */
    context?: TContext;
}
export interface AgChartOverlayOptions<TContext = ContextDefault> {
    /**
     * Enabled or disable use of the overlay.
     *
     * Default: `true`
     */
    enabled?: boolean;
    /** Text to render in the overlay. */
    text?: TextOrSegments;
    /** A function for generating HTML element or string for overlay content. */
    renderer?: Renderer<AgChartOverlayRendererParams<TContext>, HTMLElement>;
}
export interface AgChartOverlaysOptions<TContext = ContextDefault> {
    /** An overlay to be displayed when there is no data. */
    loading?: AgChartOverlayOptions<TContext>;
    /** An overlay to be displayed when there is no data. */
    noData?: AgChartOverlayOptions<TContext>;
    /** An overlay to be displayed when there are no series visible. */
    noVisibleSeries?: AgChartOverlayOptions<TContext>;
    /** An overlay to be displayed when chart is running in an unsupported browser. */
    unsupportedBrowser?: AgChartOverlayOptions<TContext>;
}
export interface AgChartCaptionOptions {
    /** Whether the text should be shown. */
    enabled?: boolean;
    /** The text to display. */
    text?: TextOrSegments;
    /** Horizontal position of the text. */
    textAlign?: TextAlign;
    /** The font style to use for the text. */
    fontStyle?: FontStyle;
    /** The font weight to use for the text. */
    fontWeight?: FontWeight;
    /** The font size in pixels to use for the text. */
    fontSize?: FontSize;
    /** The font family to use for the text. */
    fontFamily?: FontFamilyFull;
    /** The colour to use for the text. */
    color?: CssColor;
    /** Spacing added to help position the text. */
    spacing?: PixelSize;
    /** Used to constrain the width of the title before text is wrapped or truncated. */
    maxWidth?: PixelSize;
    /** Used to constrain the height of the title before text is truncated. */
    maxHeight?: PixelSize;
    /**
     * Text wrapping strategy for long text.
     * - `'always'` will always wrap text to fit within the `maxWidth`.
     * - `'hyphenate'` is similar to `'always'`, but inserts a hyphen (`-`) if forced to wrap in the middle of a word.
     * - `'on-space'` will only wrap on white space. If there is no possibility to wrap a line on space and satisfy the `maxWidth`, the text will be truncated.
     * - `'never'` disables text wrapping.
     *
     * Default: `'on-space'`
     */
    wrapping?: TextWrap;
}
export interface AgChartSubtitleOptions extends AgChartCaptionOptions {
}
export interface AgChartFooterOptions extends AgChartCaptionOptions {
}
export interface AgChartBackground {
    /** Whether the background should be visible. */
    visible?: boolean;
    /** Colour of the chart background. */
    fill?: CssColor;
    /** Background image. May be combined with fill colour. */
    image?: AgChartBackgroundImage;
}
export type AgChartHighlightRange = 'tooltip' | 'node';
export interface AgChartHighlightOptions {
    /** By default, nodes will be highlighted when the cursor is within the `tooltip.range`. Set this to `'node'` to highlight nodes when within the `series[].nodeClickRange`. */
    range?: AgChartHighlightRange;
    /**
     * Defines how the highlight should be rendered relative to the existing chart content.
     * - 'overlay': Draws on top of the existing content.
     * - 'cutout': Removes the existing content where it overlaps the highlight node.
     */
    drawingMode?: AgDrawingMode;
}
export type AgDrawingMode = 'overlay' | 'cutout';
export interface AgChartSyncOptions {
    /** Toggles the synchronization feature. It is implicitly enabled when configuration options are provided; otherwise, it defaults to `false`. */
    enabled?: boolean;
    /** Specifies the synchronization group identifier for the chart. Omitting this assigns the chart to a default synchronization group. */
    groupId?: string;
    /**
     * Determines the axes to be synchronized across charts.
     *
     * Default: `x`
     */
    axes?: 'x' | 'y' | 'xy';
    /**
     * Enables synchronization of node interactions across charts.
     *
     * Default: `true`
     */
    nodeInteraction?: boolean;
    /**
     * Enables synchronization of zoom actions across charts.
     *
     * Default: `true`
     */
    zoom?: boolean;
}
export interface AgKeyboardOptions {
    /** Toggles the keyboard navigation feature.
     *
     * Default: `true`
     */
    enabled?: boolean;
    /** Allows setting the tabIndex of the chart canvas.
     *
     * Default: `0`
     */
    tabIndex?: number;
}
export interface AgTouchOptions {
    /** Sets the input handling behavior for single-finger touch drag events.
     *
     * - `'none'` - ignores these events, typically causing the default page-scrolling behavior.
     * - `'hover'` - makes these behave like mouse hover events, showing tooltip and crosshairs.
     * - `'drag'` - makes these behave like mouse drag events (moving while holding left-button).
     *
     * Default: `'drag'`
     */
    dragAction?: 'none' | 'drag' | 'hover';
}
export interface AgBaseThemeableChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** The width of the chart in pixels. */
    width?: PixelSize;
    /** The height of the chart in pixels. */
    height?: PixelSize;
    /**
     * Sets the minimum height of the chart. Ignored if `height` is specified.
     *
     * Default: `300`
     */
    minHeight?: PixelSize;
    /**
     * Sets the minimum width of the chart. Ignored if `width` is specified.
     *
     * Default: `300`
     */
    minWidth?: PixelSize;
    /** Configuration for the padding of the chart. */
    padding?: AgChartPaddingOptions;
    /** Configuration relating to the series area. */
    seriesArea?: AgSeriesAreaOptions;
    /** Configuration for the background shown behind the chart. */
    background?: AgChartBackground;
    /** Configuration for the title shown at the top of the chart. */
    title?: AgChartCaptionOptions;
    /** Configuration for the subtitle shown beneath the chart title. */
    subtitle?: AgChartSubtitleOptions;
    /** Configuration for the footnote shown at the bottom of the chart. */
    footnote?: AgChartFooterOptions;
    /** Configuration for the chart highlighting. */
    highlight?: AgChartHighlightOptions;
    /** HTML overlays. */
    overlays?: AgChartOverlaysOptions<TContext>;
    /** Global configuration that applies to all tooltips in the chart. */
    tooltip?: AgChartTooltipOptions;
    /** Configuration for the chart legend. */
    legend?: AgChartLegendOptions<TContext>;
    /** Configuration for the gradient legend. */
    gradientLegend?: AgGradientLegendOptions<TContext>;
    /** Configuration for chart animations. */
    animation?: AgAnimationOptions;
    /** Configuration for asynchronously loaded data. */
    dataSource?: AgDataSourceOptions<TDatum, TContext>;
    /** Configuration for the context menu. */
    contextMenu?: AgContextMenuOptions<TDatum, TContext>;
    /** Context object to use in callbacks. */
    context?: TContext;
    /** Configuration for localisation. */
    locale?: AgLocaleOptions;
    /** Configuration for the ranges buttons. */
    ranges?: AgRangesOptions;
    /** Keyboard navigation options. */
    keyboard?: AgKeyboardOptions;
    /** Touch input options. */
    touch?: AgTouchOptions;
    /**
     * Suppress treatment of series keys as JavaScript paths when `true`.
     *
     * Default: `false`
     */
    suppressFieldDotNotation?: boolean;
    /**
     * A nonce to be used by any dynamically injected CSS `<style>` tags to assist with Content Security Policy.
     *
     *
     * See [https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce).
     *
     * Default: `undefined`
     */
    styleNonce?: string;
    /** A map of event names to event listeners. */
    listeners?: AgBaseChartListeners<TDatum, TContext>;
    /**
     * Load fonts automatically from Google's CDN.
     *
     * Default: `false`
     */
    loadGoogleFonts?: boolean;
    /** Configuration for the Navigator. */
    navigator?: AgNavigatorOptions<TDatum, TContext>;
    /** Configuration for synchronizing multiple charts. */
    sync?: AgChartSyncOptions;
    /** Configuration for the zoom options. */
    zoom?: AgZoomOptions;
    /** Global formatter configuration. */
    formatter?: FormatterConfiguration<TDatum, TContext>;
}
/** Configuration common to all charts.  */
export interface AgBaseChartOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
    /** The data to render the chart from. If this is not specified, it must be set on individual series instead. */
    data?: TDatum[];
    /** The element to place the rendered chart into. */
    container?: HTMLElement | null;
    /** The initial state of the chart. This must be a serializable value. */
    initialState?: AgInitialStateOptions;
}
