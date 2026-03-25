import { combineConfig, Facet } from '@codemirror/state';

export interface IndentationMarkerConfiguration {
    /**
     * Determines whether active block marker is styled differently.
     */
    highlightActiveBlock?: boolean

    /**
     * Determines whether markers in the first column are omitted.
     */
    hideFirstIndent?: boolean

    /**
     * Determines the type of indentation marker.
     */
    markerType?: "fullScope" | "codeOnly"

    /**
     * Determines the thickness of marker (in pixels).
     */
    thickness?: number

    /**
     * Determines the thickness of active marker (in pixels).
     *
     * If undefined or null, then regular thickness will be used.
     */
    activeThickness?: number

    /**
     * Determines the color of marker.
     */
    colors?: {
        /**
         * Color of inactive indent markers when using a light theme.
         */
        light?: string

        /**
         * Color of inactive indent markers when using a dark theme.
         */
        dark?: string

        /**
         * Color of active indent markers when using a light theme.
         */
        activeLight?: string

        /**
         * Color of active indent markers when using a dark theme.
         */
        activeDark?: string
    }
}

export const indentationMarkerConfig = Facet.define<IndentationMarkerConfiguration, Required<IndentationMarkerConfiguration>>({
    combine(configs) {
        return combineConfig(configs, {
            highlightActiveBlock: true,
            hideFirstIndent: false,
            markerType: "fullScope",
            thickness: 1,
        });
    }
});
