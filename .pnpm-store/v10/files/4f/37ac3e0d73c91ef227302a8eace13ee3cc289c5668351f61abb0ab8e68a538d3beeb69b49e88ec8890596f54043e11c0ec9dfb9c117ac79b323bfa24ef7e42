import type { CssColor, GeoJSON, Opacity, PixelSize } from '../../chart/types';
import type { LineDashOptions } from '../cartesian/commonOptions';
export interface AgMapLineBackgroundThemeableOptions extends LineDashOptions {
    /** The colour for the stroke of the line. */
    stroke?: CssColor;
    /** The width of the stroke in pixels. */
    strokeWidth?: PixelSize;
    /** The opacity of the stroke colour. */
    strokeOpacity?: Opacity;
}
export interface AgMapLineBackgroundOptions extends AgMapLineBackgroundThemeableOptions {
    /** Configuration for the Map Shape Background. */
    type: 'map-line-background';
    /** GeoJSON data. */
    topology?: GeoJSON;
}
