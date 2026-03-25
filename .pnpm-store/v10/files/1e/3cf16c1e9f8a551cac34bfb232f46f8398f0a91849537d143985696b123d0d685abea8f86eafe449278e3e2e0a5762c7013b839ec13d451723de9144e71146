import { $keywords, $keywordsValidation, EdgeAttributesObject, GraphAttributesObject, NodeAttributesObject, SubgraphAttributesObject } from '@ts-graphviz/common';
export type Format = Format.values;
export declare namespace Format {
    type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    interface $values extends $keywords<'png' | 'svg' | 'json' | 'jpg' | 'pdf' | 'xdot' | 'dot' | 'plain' | 'dot_json'> {
    }
    interface $exclude extends $keywordsValidation {
    }
}
export type Layout = Layout.values;
export declare namespace Layout {
    type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    interface $values extends $keywords<'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'nop' | 'nop2' | 'osage' | 'patchwork'> {
    }
    interface $exclude extends $keywordsValidation {
    }
}
/**
 * NeatoOptions interface provides options for the neato layout.
 * @public
 */
export interface NeatoOptions {
    layout: 'neato';
    /**
     * Sets no-op flag in neato.
     */
    noop?: number;
    /**
     * Reduce graph.
     */
    reduce?: boolean;
}
/**
 * FdpOptions interface provides options for the fdp layout.
 * @public
 */
export interface FdpOptions {
    layout: 'fdp';
    /**
     * Use grid.
     *
     * @default true
     */
    grid?: boolean;
    /**
     * Use old attractive force
     *
     * @default true
     */
    oldAttractive?: boolean;
    /**
     * Set number of iterations.
     */
    iterations?: number;
    /**
     * Set unscaled factor
     */
    unscaledFactor?: number;
    /**
     * Set overlap expansion factor.
     */
    overlapExpansionFactor?: number;
    /**
     * Set temperature.
     */
    temperature?: number;
}
/**
 * This interface describes an optional parameter called "layout" which is used to set a layout engine.
 * The default value for this parameter is 'dot', and it must be an option of the Layout type,
 * excluding 'neato' and 'fdp'.
 * @public
 */
export interface OtherOptions {
    /**
     * Set layout engine.
     *
     * @default 'dot'
     */
    layout?: Exclude<Layout, 'neato' | 'fdp'>;
}
/**
 * This interface represents the CommonOptions for setting output format.
 * @public
 */
export interface CommonOptions {
    /**
     * Set output format.
     *
     * @default 'svg'
     */
    format?: Format;
    /**
     * If true, set level of message suppression (=1).
     *
     * @default true
     */
    suppressWarnings?: boolean;
    /**
     * Path of graphviz dot command.
     */
    dotCommand?: string;
    attributes?: {
        /**
         * Set edge attribute.
         */
        edge?: EdgeAttributesObject;
        /**
         * Set node attribute.
         */
        node?: NodeAttributesObject;
        /**
         * Set graph attribute.
         */
        graph?: GraphAttributesObject & SubgraphAttributesObject;
    };
    /**
     * Scale input
     */
    scale?: number;
    /**
     * Use external library.
     */
    library?: string[];
    /**
     * Invert y coordinate in output.
     */
    y?: boolean;
}
export type Options<T extends Layout = Layout> = CommonOptions & (T extends 'neato' ? NeatoOptions : T extends 'fdp' ? FdpOptions : OtherOptions);
