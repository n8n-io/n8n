/**
 * @hidden
 */
export declare type $keywords<T extends string> = {
    [key in T]: key;
};

/**
 * @hidden
 */
export declare interface $keywordsValidation extends $keywords<`${string} ${string}` | `${string}\n${string}` | `${string}\t${string}`> {
}

/**
 * A double with an optional prefix `'+'`.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/addDouble/ addDouble}
 * @group Attribute Types
 */
export declare type AddDouble = `+${Double}`;

/**
 * A point with an optional prefix `'+'`.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/addPoint/ addPoint}
 * @group Attribute Types
 */
export declare type AddPoint = `+${Point}`;

/**
 * The examples above show a set of commonly used arrow shapes.
 *
 * There is a grammar of arrow shapes which can be used to describe a collection of 3,111,696 arrow
 * combinations of the 42 variations of the primitive set of 11 arrows.
 *
 * @see {@link https://graphviz.org/docs/attr-types/arrowType/ arrowType}
 * @group Attribute Types
 */
export declare type ArrowType = ArrowType.aname | `${ArrowType.aname}${ArrowType.aname}`;

/** @hidden */
export declare namespace ArrowType {
    export type shape = keyof $shape;
    export interface $shape extends $keywords<'box' | 'crow' | 'curve' | 'icurve' | 'diamond' | 'dot' | 'inv' | 'none' | 'normal' | 'tee' | 'vee'> {
    }
    export type side = 'l' | 'r';
    export type modifiers = side | 'o' | `o${side}`;
    export type aname = shape | `${modifiers}${shape}`;
}

/**
 * ASTType is an enumeration of the different types of nodes that can be found in an AST(Abstract Syntax Tree ).
 * @group Models
 */
export declare type ASTType = 'Literal' | 'Dot' | 'Graph' | 'Attribute' | 'Comment' | 'AttributeList' | 'NodeRef' | 'NodeRefGroup' | 'Edge' | 'Node' | 'Subgraph';

/**
 * This type represents an Attribute, which is a key-value mapping of an {@link AttributeKey} to a value.
 *
 * @param T The {@link AttributeKey} to be mapped to a value.
 * @group Attribute
 */
export declare type Attribute<T extends AttributeKey> = Attribute.types[T];

export declare namespace Attribute {
    export type keys = Omit<$keys, keyof $exclude | symbol | number>;
    export type types = Omit<$types, keyof $exclude | symbol | number>;
    /** @hidden */
    export interface $keys extends $keywords<AttributeKey> {
    }
    export interface $exclude extends $keywordsValidation {
    }
    /**
     * @group Attribute
     */
    export interface $keys {
        /**
         * Factor damping force motions.
         * On each iteration, a nodes movement is limited to this factor of its potential motion.
         * By being less than 1.0, the system tends to ``cool'', thereby preventing cycling.
         *
         * @see {@link https://graphviz.org/docs/attrs/Damping/ Node, Edge and Graph Attributes#Damping}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0.99
         * @graphvizMinimum 0
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        Damping: 'Damping';
        /**
         * Spring constant used in virtual physical model.
         * It roughly corresponds to an ideal edge length (in inches), in that increasing K tends to increase the distance between nodes.
         * Note that the edge attribute {@link len} can be used to override this value for adjacent nodes.
         *
         * @see {@link https://graphviz.org/docs/attrs/K/ Node, Edge and Graph Attributes#K}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0.3
         * @graphvizMinimum 0
         * @graphvizNotes sfdp, fdp only
         * @graphvizUsedBy GC
         * @category Attribute
         */
        K: 'K';
        /**
         * Hyperlinks incorporated into device-dependent output.
         * At present, used in ps2, cmap, i*map and svg formats.
         * For all these formats, URLs can be attached to nodes, edges and clusters.
         * URL attributes can also be attached to the root graph in ps2, cmap and i*map formats.
         * This serves as the base URL for relative URLs in the former, and as the default image map file in the latter.
         *
         * For svg, cmapx and imap output, the active area for a node is its visible image.
         * For example, an unfilled node with no drawn boundary will only be active on its label.
         * For other output, the active area is its bounding box.
         * The active area for a cluster is its bounding box.
         * For edges, the active areas are small circles where the edge contacts its head and tail nodes.
         * In addition, for svg, cmapx and imap, the active area includes a thin polygon approximating the edge.
         * The circles may overlap the related node, and the edge URL dominates.
         * If the edge has a label, this will also be active. Finally, if the edge has a head or tail label, this will also be active.
         *
         * Note that, for edges, the attributes {@link headURL}, {@link tailURL}, {@link labelURL} and {@link edgeURL} allow control of various parts of an edge.
         * Also note that, if active areas of two edges overlap, it is unspecified which area dominates.
         *
         * @see {@link https://graphviz.org/docs/attrs/URL/ Node, Edge and Graph Attributes#URL}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault <none>
         * @graphvizNotes svg, postscript, map only
         * @graphvizUsedBy ENGC
         * @category Attribute
         */
        URL: 'URL';
        /**
         * A string in the {@link https://graphviz.org/_pages/doc/info/output.html#d:xdot xdot format} specifying an arbitrary background.
         * During rendering, the canvas is first filled as described in the {@link bgcolor} attribute.
         * Then, if _background is defined, the graphics operations described in the string are performed on the canvas.
         *
         * @see {@link https://graphviz.org/docs/attrs/_background/ Node, Edge and Graph Attributes#_background}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault <none>
         * @graphvizUsedBy G
         * @category Attribute
         */
        _background: '_background';
        /**
         * Indicates the preferred area for a node or empty cluster when laid out by patchwork.
         *
         * @see {@link https://graphviz.org/docs/attrs/area/ Node, Edge and Graph Attributes#area}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum >0
         * @graphvizNotes patchwork only
         * @graphvizUsedBy NC
         * @category Attribute
         */
        area: 'area';
        /**
         * Style of arrowhead on the head node of an edge.
         * This will only appear if the {@link dir} attribute is "forward" or "both".
         *
         * See the {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/arrowhead/ Node, Edge and Graph Attributes#arrowhead}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/arrowType/ arrowType}
         * @graphvizDefault normal
         * @graphvizUsedBy E
         * @category Attribute
         */
        arrowhead: 'arrowhead';
        /**
         * Multiplicative scale factor for arrowheads.
         *
         * @see {@link https://graphviz.org/docs/attrs/arrowsize/ Node, Edge and Graph Attributes#arrowsize}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum 0
         * @graphvizUsedBy E
         * @category Attribute
         */
        arrowsize: 'arrowsize';
        /**
         * Style of arrowhead on the tail node of an edge.
         * This will only appear if the {@link dir} attribute is "back" or "both".
         *
         * See the {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/arrowtail/ Node, Edge and Graph Attributes#arrowtail}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/arrowType/ arrowType}
         * @graphvizDefault normal
         * @graphvizUsedBy E
         * @category Attribute
         */
        arrowtail: 'arrowtail';
        /**
         * Bounding box of drawing in points.
         *
         * @graphvizType {@link https://graphviz.org/docs/attr-types/rect/ rect}
         * @graphvizNotes write only
         * @graphvizUsedBy G
         * @category Attribute
         */
        bb: 'bb';
        /**
         * When attached to the root graph, this color is used as the background for entire canvas.
         * When a cluster attribute, it is used as the initial background for the cluster.
         * If a cluster has a filled {@link style}, the cluster's {@link fillcolor} will overlay the background color.
         *
         * @see {@link https://graphviz.org/docs/attrs/bgcolor/ Node, Edge and Graph Attributes#bgcolor}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/color/ color}/{@link https://graphviz.org/docs/attr-types/color/List colorList}
         * @graphvizDefault <none>
         * @graphvizUsedBy GC
         * @category Attribute
         */
        bgcolor: 'bgcolor';
        /**
         * If true, the drawing is centered in the output canvas.
         *
         * @see {@link https://graphviz.org/docs/attrs/center/ Node, Edge and Graph Attributes#center}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy G
         * @category Attribute
         */
        center: 'center';
        /**
         * Specifies the character encoding used when interpreting string input as a text label.
         * The default value is "UTF-8". The other legal value is "iso-8859-1" or, equivalently, "Latin1".
         * The charset attribute is case-insensitive.
         * Note that if the character encoding used in the input does not match the charset value, the resulting output may be very strange.
         *
         * @see {@link https://graphviz.org/docs/attrs/charset/ Node, Edge and Graph Attributes#charset}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault "UTF-8"
         * @graphvizUsedBy G
         *
         * @category Attribute
         */
        charset: 'charset';
        /**
         * Classnames to attach to the node, edge, graph, or cluster's SVG element.
         * Combine with stylesheet for styling SVG output using CSS classnames.
         *
         * @see {@link https://graphviz.org/docs/attrs/class/ class}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy ENCG
         */
        class: 'class';
        /**
         * Mode used for handling clusters.
         * If clusterrank is "local", a subgraph whose name begins with "cluster" is given special treatment.
         * The subgraph is laid out separately, and then integrated as a unit into its parent graph, with a bounding rectangle drawn about it.
         * If the cluster has a label parameter, this label is displayed within the rectangle.
         * Note also that there can be clusters within clusters.
         * At present, the modes "global" and "none" appear to be identical, both turning off the special cluster processing.
         *
         * @see {@link https://graphviz.org/docs/attrs/clusterrank/ Node, Edge and Graph Attributes#clusterrank}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:clusterMode clusterMode}
         * @graphvizDefault local
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        clusterrank: 'clusterrank';
        /**
         * Basic drawing color for graphics, not text.
         * For the latter, use the fontcolor attribute.
         *
         * For edges, the value can either be a single color or a colorList.
         * In the latter case, if colorList has no fractions, the edge is drawn using parallel splines or lines, one for each color in the list, in the order given.
         * The head arrow, if any, is drawn using the first color in the list, and the tail arrow, if any, the second color.
         * This supports the common case of drawing opposing edges, but using parallel splines instead of separately routed multiedges.
         * If any fraction is used, the colors are drawn in series, with each color being given roughly its specified fraction of the edge.
         * For example, the graph
         *
         * ```dot
         *  digraph G {
         *    a -> b [dir=both color="red:blue"]
         *    c -> d [dir=none color="green:red;0.25:blue"]
         *  }
         * ```
         *
         * yields
         *
         * ![colorlist](https://graphviz.org/_pages/doc/info/colorlist.gif)
         *
         * @see {@link https://graphviz.org/docs/attrs/color/ Node, Edge and Graph Attributes#color}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/color/ color}/{@link https://graphviz.org/docs/attr-types/color/List colorList}
         * @graphvizDefault black
         * @graphvizUsedBy ENC
         * @category Attribute
         */
        color: 'color';
        /**
         * This attribute specifies a color scheme namespace.
         * If defined, it specifies the context for interpreting color names.
         * In particular, if a color value has form "xxx" or "//xxx", then the color xxx will be evaluated according to the current color scheme.
         * If no color scheme is set, the standard X11 naming is used.
         * For example, if colorscheme=bugn9, then color=7 is interpreted as "/bugn9/7".
         *
         * @see {@link https://graphviz.org/docs/attrs/colorscheme/ Node, Edge and Graph Attributes#colorscheme}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy ENCG
         * @category Attribute
         */
        colorscheme: 'colorscheme';
        /**
         * Comments are inserted into output.
         * Device-dependent
         *
         * @see {@link https://graphviz.org/docs/attrs/comment/ Node, Edge and Graph Attributes#comment}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy ENG
         * @category Attribute
         */
        comment: 'comment';
        /**
         * If true, allow edges between clusters. (See {@link lhead} and {@link ltail} below.)
         *
         * @see {@link https://graphviz.org/docs/attrs/compound/ Node, Edge and Graph Attributes#compound}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        compound: 'compound';
        /**
         * If true, use edge concentrators.
         * This merges multiedges into a single edge and causes partially parallel edges to share part of their paths.
         * The latter feature is not yet available outside of dot.
         *
         * @see {@link https://graphviz.org/docs/attrs/concentrate/ Node, Edge and Graph Attributes#concentrate}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy G
         * @category Attribute
         */
        concentrate: 'concentrate';
        /**
         * If false, the edge is not used in ranking the nodes.
         * For example, in the graph
         *
         * ```graphviz
         *  digraph G {
         *    a -> c;
         *    a -> b;
         *    b -> c [constraint=false];
         *  }
         * ```
         *
         * the edge `b -> c` does not add a constraint during rank assignment, so the only constraints are that a be above b and c, yielding the graph:
         *
         * ![constraint](https://graphviz.org/_pages/doc/info/constraint.gif)
         *
         * @see {@link https://graphviz.org/docs/attrs/constraint/ Node, Edge and Graph Attributes#constraint}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizNotes dot only
         * @graphvizUsedBy E
         * @category Attribute
         */
        constraint: 'constraint';
        /**
         * If true, attach edge label to edge by a 2-segment polyline, underlining the label, then going to the closest point of spline.
         *
         * @see {@link https://graphviz.org/docs/attrs/decorate/ Node, Edge and Graph Attributes#decorate}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy E
         * @category Attribute
         */
        decorate: 'decorate';
        /**
         * This specifies the distance between nodes in separate connected components.
         * If set too small, connected components may overlap. Only applicable if {@link pack}=false.
         *
         * @see {@link https://graphviz.org/docs/attrs/defaultdist/ Node, Edge and Graph Attributes#defaultdist}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1+(avg. len)*sqrt(|V|)
         * @graphvizMinimum epsilon
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        defaultdist: 'defaultdist';
        /**
         * Set the number of dimensions used for the layout.
         * The maximum value allowed is 10.
         *
         * @see {@link https://graphviz.org/docs/attrs/dim/ Node, Edge and Graph Attributes#dim}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 2
         * @graphvizMinimum 2
         * @graphvizNotes sfdp, fdp, neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        dim: 'dim';
        /**
         * Set the number of dimensions used for rendering.
         * The maximum value allowed is 10.
         * If both dimen and dim are set, the latter specifies the dimension used for layout, and the former for rendering.
         * If only dimen is set, this is used for both layout and rendering dimensions.
         *
         * Note that, at present, all aspects of rendering are 2D.
         * This includes the shape and size of nodes, overlap removal, and edge routing.
         * Thus, for dimen > 2, the only valid information is the pos attribute of the nodes.
         * All other coordinates will be 2D and, at best, will reflect a projection of a higher-dimensional point onto the plane.
         *
         * @see {@link https://graphviz.org/docs/attrs/dimen/ Node, Edge and Graph Attributes#dimen}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 2
         * @graphvizMinimum 2
         * @graphvizNotes sfdp, fdp, neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        dimen: 'dimen';
        /**
         * Set edge type for drawing arrowheads.
         * This indicates which ends of the edge should be decorated with an arrowhead.
         * The actual style of the arrowhead can be specified using the {@link arrowhead} and {@link arrowtail} attributes.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/dir/ Node, Edge and Graph Attributes#dir}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/dirType/ dirType}
         * @graphvizDefault "forward(directed) none(undirected)"
         * @graphvizUsedBy E
         * @category Attribute
         */
        dir: 'dir';
        /**
         * Only valid when {@link mode}="ipsep".
         * If true, constraints are generated for each edge in the largest (heuristic) directed acyclic subgraph such that the edge must point downwards.
         * If "hier", generates level constraints similar to those used with {@link mode}="hier".
         * The main difference is that, in the latter case, only these constraints are involved, so a faster solver can be used.
         *
         * @see {@link https://graphviz.org/docs/attrs/diredgeconstraints/ Node, Edge and Graph Attributes#diredgeconstraints}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}/{@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        diredgeconstraints: 'diredgeconstraints';
        /**
         * Distortion factor for {@link shape}=polygon.
         * Positive values cause top part to be larger than bottom; negative values do the opposite.
         *
         * @see {@link https://graphviz.org/docs/attrs/distortion/ Node, Edge and Graph Attributes#distortion}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault -100
         * @graphvizUsedBy N
         * @category Attribute
         */
        distortion: 'distortion';
        /**
         * This specifies the expected number of pixels per inch on a display device.
         * For bitmap output, this guarantees that text rendering will be done more accurately, both in size and in placement.
         * For SVG output, it is used to guarantee that the dimensions in the output correspond to the correct number of points or inches.
         *
         * @see {@link https://graphviz.org/docs/attrs/dpi/ Node, Edge and Graph Attributes#dpi}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault "96.0 0.0"
         * @graphvizNotes svg, bitmap output only
         * @graphvizUsedBy G
         * @category Attribute
         */
        dpi: 'dpi';
        /**
         * If **edgeURL** is defined, this is the link used for the non-label parts of an edge.
         * This value overrides any {@link URL} defined for the edge.
         * Also, this value is used near the head or tail node unless overridden by a {@link headURL} or {@link tailURL} value, respectively.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/edgeURL/ Node, Edge and Graph Attributes#edgeURL}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        edgeURL: 'edgeURL';
        /**
         * Synonym for {@link edgeURL}.
         *
         * @see {@link https://graphviz.org/docs/attrs/edgehref/ Node, Edge and Graph Attributes#edgehref}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        edgehref: 'edgehref';
        /**
         * If the edge has a {@link URL} or {@link edgeURL} attribute, this attribute determines which window of the browser is used for the URL attached to the non-label part of the edge.
         * Setting it to "_graphviz" will open a new window if it doesn't already exist, or reuse it if it does.
         * If undefined, the value of the {@link target} is used.
         *
         * @see {@link https://graphviz.org/docs/attrs/edgetarget/ Node, Edge and Graph Attributes#edgetarget}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault <none>
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        edgetarget: 'edgetarget';
        /**
         * Tooltip annotation attached to the non-label part of an edge.
         * This is used only if the edge has a {@link URL} or {@link edgeURL} attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/edgetooltip/ Node, Edge and Graph Attributes#edgetooltip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, cmap only
         * @graphvizUsedBy E
         * @category Attribute
         */
        edgetooltip: 'edgetooltip';
        /**
         * Terminating condition. If the length squared of all energy gradients are < **epsilon**, the algorithm stops.
         *
         * @see {@link https://graphviz.org/docs/attrs/epsilon/ Node, Edge and Graph Attributes#epsilon}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault .0001 * # nodes(mode == KK) .0001(mode == major)
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        epsilon: 'epsilon';
        /**
         * Margin used around polygons for purposes of spline edge routing.
         * The interpretation is the same as given for {@link sep}.
         * This should normally be strictly less than {@link sep}.
         *
         * @see {@link https://graphviz.org/docs/attrs/esep/ Node, Edge and Graph Attributes#esep}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/addDouble/ addDouble}/{@link https://graphviz.org/_pages/doc/info/attrs.html#k:addPoint addPoint}
         * @graphvizDefault 3
         * @graphvizNotes not dot
         * @graphvizUsedBy G
         * @category Attribute
         */
        esep: 'esep';
        /**
         * Color used to fill the background of a node or cluster assuming {@link style}=filled, or a filled arrowhead.
         * If fillcolor is not defined, {@link color} is used. (For clusters, if color is not defined, {@link bgcolor} is used.)
         * If this is not defined, the default is used, except for {@link shape}=point or when the output format is MIF, which use black by default.
         *
         * If the value is a {@link colorList}, a gradient fill is used.
         * By default, this is a linear fill; setting style=radial will cause a radial fill.
         * At present, only two colors are used. If the second color (after a colon) is missing, the default color is used for it.
         * See also the {@link gradientangle} attribute for setting the gradient angle.
         *
         * Note that a cluster inherits the root graph's attributes if defined.
         * Thus, if the root graph has defined a **fillcolor**, this will override a **color** or **bgcolor** attribute set for the cluster.
         *
         * @see {@link https://graphviz.org/docs/attrs/fillcolor/ Node, Edge and Graph Attributes#fillcolor}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/color/ color}/{@link https://graphviz.org/docs/attr-types/color/List colorList}
         * @graphvizDefault "lightgrey(nodes) black(clusters)"
         * @graphvizUsedBy NEC
         * @category Attribute
         */
        fillcolor: 'fillcolor';
        /**
         * If `false`, the size of a node is determined by smallest width and height needed to contain its label and image,
         * if any, with a {@link margin} specified by the margin attribute.
         * The width and height must also be at least as large as the sizes specified by the {@link width} and {@link height} attributes,
         * which specify the minimum values for these parameters.
         *
         * If `true`, the node size is specified by the values of the {@link width} and {@link height} attributes only and is not expanded to contain the text label.
         * There will be a warning if the label (with margin) cannot fit within these limits.
         *
         * If the {@link fixedsize} attribute is set to shape, the {@link width} and {@link height} attributes also determine the size of the node shape,
         * but the label can be much larger. Both the label and shape sizes are used when avoiding node overlap,
         * but all edges to the node ignore the label and only contact the node shape. No warning is given if the label is too large.
         *
         * @see {@link https://graphviz.org/docs/attrs/fixedsize/ Node, Edge and Graph Attributes#fixedsize}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}/string
         * @graphvizDefault FALSE
         * @graphvizUsedBy N
         * @category Attribute
         */
        fixedsize: 'fixedsize';
        /**
         * Color used for text.
         *
         * @see {@link https://graphviz.org/docs/attrs/fontcolor/ Node, Edge and Graph Attributes#fontcolor}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/color/ color}
         * @graphvizDefault black
         * @graphvizUsedBy ENGC
         * @category Attribute
         */
        fontcolor: 'fontcolor';
        /**
         * Font used for text.
         * This very much depends on the output format and, for non-bitmap output such as PostScript or SVG,
         * the availability of the font when the graph is displayed or printed.
         * As such, it is best to rely on font faces that are generally available,
         * such as Times-Roman, Helvetica or Courier.
         *
         * How font names are resolved also depends on the underlying library that handles font name resolution.
         * If Graphviz was built using the fontconfig library, the latter library will be used to search for the font.
         * See the commands **fc-list**, **fc-match** and the other fontconfig commands for how names are resolved and which fonts are available.
         * Other systems may provide their own font package, such as Quartz for OS X.
         *
         * Note that various font attributes, such as weight and slant, can be built into the font name.
         * Unfortunately, the syntax varies depending on which font system is dominant. Thus, using fontname="times bold italic" will produce a bold, slanted Times font using Pango, the usual main font library.
         * Alternatively, fontname="times:italic" will produce a slanted Times font from fontconfig, while fontname="times-bold" will resolve to a bold Times using Quartz.
         * You will need to ascertain which package is used by your Graphviz system and refer to the relevant documentation.
         *
         * If Graphviz is not built with a high-level font library, fontname will be considered the name of a Type 1 or True Type font file.
         * If you specify fontname=schlbk, the tool will look for a file named schlbk.ttf or schlbk.pfa or schlbk.pfb in one of the directories specified by the {@link fontpath} attribute.
         * The lookup does support various aliases for the common fonts.
         *
         * @see {@link https://graphviz.org/docs/attrs/fontname/ Node, Edge and Graph Attributes#fontname}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault "Times-Roman"
         * @graphvizUsedBy ENGC
         * @category Attribute
         */
        fontname: 'fontname';
        /**
         * Allows user control of how basic fontnames are represented in SVG output.
         * If fontnames is undefined or "svg", the output will try to use known SVG fontnames.
         * For example, the default font "Times-Roman" will be mapped to the basic SVG font "serif".
         * This can be overridden by setting fontnames to "ps" or "gd". In the former case, known PostScript font names such as "Times-Roman" will be used in the output.
         * In the latter case, the fontconfig font conventions are used. Thus, "Times-Roman" would be treated as "Nimbus Roman No9 L".
         * These last two options are useful with SVG viewers that support these richer fontname spaces.
         *
         * @see {@link https://graphviz.org/docs/attrs/fontnames/ Node, Edge and Graph Attributes#fontnames}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes svg only
         * @graphvizUsedBy G
         * @category Attribute
         */
        fontnames: 'fontnames';
        /**
         * Directory list used by libgd to search for bitmap fonts if Graphviz was not built with the fontconfig library.
         * If **fontpath** is not set, the environment variable DOTFONTPATH is checked.
         * If that is not set, GDFONTPATH is checked.
         * If not set, libgd uses its compiled-in font path.
         * Note that fontpath is an attribute of the root graph.
         *
         * @see {@link https://graphviz.org/docs/attrs/fontpath/ Node, Edge and Graph Attributes#fontpath}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault system-dependent
         * @graphvizUsedBy G
         * @category Attribute
         */
        fontpath: 'fontpath';
        /**
         * Font size, {@link https://graphviz.org/doc/info/attrs.html in points}, used for text.
         *
         * @see {@link https://graphviz.org/docs/attrs/fontsize/ Node, Edge and Graph Attributes#fontsize}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 14
         * @graphvizMinimum 1
         * @graphvizUsedBy ENGC
         * @category Attribute
         */
        fontsize: 'fontsize';
        /**
         * If true, all {@link xlabel} attributes are placed,
         * even if there is some overlap with nodes or other labels.
         *
         * @see {@link https://graphviz.org/docs/attrs/forcelabels/ Node, Edge and Graph Attributes#forcelabels}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizUsedBy G
         * @category Attribute
         */
        forcelabels: 'forcelabels';
        /**
         * If a gradient fill is being used, this determines the angle of the fill.
         * For linear fills, the colors transform along a line specified by the angle and the center of the object.
         * For radial fills, a value of zero causes the colors to transform radially from the center; for non-zero values,
         * the colors transform from a point near the object's periphery as specified by the value.
         *
         * If unset, the default angle is 0.
         *
         * @see {@link https://graphviz.org/docs/attrs/gradientangle/ Node, Edge and Graph Attributes#gradientangle}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault ""
         * @graphvizUsedBy NCG
         * @category Attribute
         */
        gradientangle: 'gradientangle';
        /**
         * If the end points of an edge belong to the same group, i.e.,
         * have the same group attribute, parameters are set to avoid crossings and keep the edges straight.
         *
         * @see {@link https://graphviz.org/docs/attrs/group/ Node, Edge and Graph Attributes#group}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes dot only
         * @graphvizUsedBy N
         * @category Attribute
         */
        group: 'group';
        /**
         * If **headURL** is defined, it is output as part of the head label of the edge.
         * Also, this value is used near the head node, overriding any {@link URL} value.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/headURL/ Node, Edge and Graph Attributes#headURL}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        headURL: 'headURL';
        /**
         * Position of an edge's head label, {@link https://graphviz.org/doc/info/attrs.html in points}.
         * The position indicates the center of the label.
         *
         * @see {@link https://graphviz.org/docs/attrs/head_lp/ Node, Edge and Graph Attributes#head_lp}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizNotes write only
         * @graphvizUsedBy E
         * @category Attribute
         */
        head_lp: 'head_lp';
        /**
         * If true, the head of an edge is clipped to the boundary of the head node; otherwise,
         * the end of the edge goes to the center of the node, or the center of a port, if applicable.
         *
         * @see {@link https://graphviz.org/docs/attrs/headclip/ Node, Edge and Graph Attributes#headclip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizUsedBy E
         * @category Attribute
         */
        headclip: 'headclip';
        /**
         * Synonym for {@link headURL}.
         *
         * @see {@link https://graphviz.org/docs/attrs/headhref/ Node, Edge and Graph Attributes#headhref}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        headhref: 'headhref';
        /**
         * Text label to be placed near head of edge.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/headlabel/ Node, Edge and Graph Attributes#headlabel}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/lblString/ lblString}
         * @graphvizDefault center
         * @graphvizUsedBy E
         * @category Attribute
         */
        headlabel: 'headlabel';
        /**
         * Indicates where on the head node to attach the head of the edge.
         * In the default case, the edge is aimed towards the center of the node, and then clipped at the node boundary.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/headport/ Node, Edge and Graph Attributes#headport}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/portPos/ portPos}
         * @graphvizDefault <none>
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        headport: 'headport';
        /**
         * If the edge has a {@link headURL}, this attribute determines which window of the browser is used for the URL.
         * Setting it to "_graphviz" will open a new window if it doesn't already exist, or reuse it if it does.
         * If undefined, the value of the {@link target} is used.
         *
         * @see {@link https://graphviz.org/docs/attrs/headtarget/ Node, Edge and Graph Attributes#headtarget}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, cmap only
         * @graphvizUsedBy E
         * @category Attribute
         */
        headtarget: 'headtarget';
        /**
         * Tooltip annotation attached to the head of an edge.
         * This is used only if the edge has a {@link headURL} attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/headtooltip/ Node, Edge and Graph Attributes#headtooltip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault 0.5
         * @graphvizMinimum 0.02
         * @graphvizUsedBy N
         * @category Attribute
         */
        headtooltip: 'headtooltip';
        /**
         * Height of node, in inches.
         * This is taken as the initial, minimum height of the node.
         * If {@link fixedsize} is true, this will be the final height of the node.
         * Otherwise, if the node label requires more height to fit, the node's **height** will be increased to contain the label.
         * Note also that, if the output format is dot, the value given to height will be the final value.
         *
         * If the node shape is regular, the width and height are made identical.
         * In this case, if either the width or the height is set explicitly, that value is used.
         * In this case, if both the width or the height are set explicitly, the maximum of the two values is used.
         * If neither is set explicitly, the minimum of the two default values is used.
         *
         * @see {@link https://graphviz.org/docs/attrs/height/ Node, Edge and Graph Attributes#height}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault ""
         * @graphvizNotes svg, postscript, map only
         * @graphvizUsedBy GCNE
         * @category Attribute
         */
        height: 'height';
        /**
         * Synonym for {@link URL}.
         *
         * @see {@link https://graphviz.org/docs/attrs/href/ Node, Edge and Graph Attributes#href}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, postscript, map only
         * @graphvizUsedBy GCNE
         * @category Attribute
         */
        href: 'href';
        /**
         * Allows the graph author to provide an id for graph objects which is to be included in the output.
         * Normal "\N", "\E", "\G" substitutions are applied.
         * If provided, it is the responsibility of the provider to keep its values sufficiently unique for its intended downstream use.
         * Note, in particular, that "\E" does not provide a unique id for multi-edges.
         * If no id attribute is provided, then a unique internal id is used.
         * However, this value is unpredictable by the graph writer.
         * An externally provided id is not used internally.
         *
         * If the graph provides an id attribute, this will be used as a prefix for internally generated attributes.
         * By making these distinct, the user can include multiple image maps in the same document.
         *
         * @see {@link https://graphviz.org/docs/attrs/id/ Node, Edge and Graph Attributes#id}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizUsedBy N
         * @category Attribute
         */
        id: 'id';
        /**
         * Gives the name of a file containing an image to be displayed inside a node.
         * The image file must be in one of the recognized {@link https://graphviz.org/docs/outputs/ formats},
         * typically JPEG, PNG, GIF, BMP, SVG or Postscript, and be able to be converted into the desired output format.
         *
         * The file must contain the image size information.
         * This is usually trivially true for the bitmap formats.
         * For PostScript, the file must contain a line starting with %%BoundingBox: followed by four integers specifying the lower left x and y coordinates and the upper right x and y coordinates of the bounding box for the image, the coordinates being in points.
         * An SVG image file must contain width and height attributes, typically as part of the svg element.
         * The values for these should have the form of a floating point number, followed by optional units, e.g.,
         * width="76pt". Recognized units are in, px, pc, pt, cm and mm for inches, pixels, picas, points, centimeters and millimeters, respectively.
         * The default unit is points.
         *
         * Unlike with the {@link shapefile} attribute, the image is treated as node content rather than the entire node. In particular, an image can be contained in a node of any shape, not just a rectangle.
         *
         * @see {@link https://graphviz.org/docs/attrs/image/ Node, Edge and Graph Attributes#image}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        image: 'image';
        /**
         * Specifies a list of directories in which to look for image files as specified by the {@link image} attribute or using the IMG element in {@link https://graphviz.org/doc/info/shapes.html HTML-like labels}.
         * The string should be a list of (absolute or relative) pathnames, each separated by a semicolon (for Windows) or a colon (all other OS).
         * The first directory in which a file of the given name is found will be used to load the image.
         * If imagepath is not set, relative pathnames for the image file will be interpreted with respect to the current working directory.
         *
         * @see {@link https://graphviz.org/docs/attrs/imagepath/ Node, Edge and Graph Attributes#imagepath}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        imagepath: 'imagepath';
        /**
         * Attribute controlling how an image is positioned within its containing node.
         * This only has an effect when the image is smaller than the containing node.
         * The default is to be centered both horizontally and vertically.
         * Valid values:
         *
         * |    |                               |
         * |----|-------------------------------|
         * | tl | Top Left                      |
         * | tc | Top Centered                  |
         * | tr | Top Right                     |
         * | ml | Middle Left                   |
         * | mc | Middle Centered (the default) |
         * | mr | Middle Right                  |
         * | bl | Bottom Left                   |
         * | bc | Bottom Centered               |
         * | br | Bottom Right                  |
         *
         * @see {@link https://graphviz.org/docs/attrs/imagepos/ Node, Edge and Graph Attributes#imagepos}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault "mc"
         * @graphvizUsedBy N
         * @category Attribute
         */
        imagepos: 'imagepos';
        /**
         * Attribute controlling how an image fills its containing node.
         * In general, the image is given its natural size, (cf. {@link dpi}), and the node size is made large enough to contain its image, its label, its margin, and its peripheries.
         * Its width and height will also be at least as large as its minimum {@link width} and {@link height}.
         * If, however, fixedsize=true, the width and height attributes specify the exact size of the node.
         *
         * During rendering, in the default case (imagescale=false), the image retains its natural size. If imagescale=true, the image is uniformly scaled (i.e., its aspect ratio is preserved) to fit inside the node. At least one dimension of the image will be as large as possible given the size of the node. When imagescale=width, the width of the image is scaled to fill the node width. The corresponding property holds when imagescale=height. When imagescale=both, both the height and the width are scaled separately to fill the node.
         *
         * In all cases, if a dimension of the image is larger than the corresponding dimension of the node,
         * that dimension of the image is scaled down to fit the node.
         * As with the case of expansion, if imagescale=true, width and height are scaled uniformly.
         *
         * @see {@link https://graphviz.org/docs/attrs/imagescale/ Node, Edge and Graph Attributes#imagescale}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}/string
         * @graphvizDefault FALSE
         * @graphvizUsedBy N
         * @category Attribute
         */
        imagescale: 'imagescale';
        /**
         * For layout algorithms that support initial input positions (specified by the pos attribute),
         * this attribute can be used to appropriately scale the values.
         * By default, fdp and neato interpret the x and y values of pos as being in inches.
         * (**NOTE**: neato -n(2) treats the coordinates as being in points, being the unit used by the layout algorithms for the pos attribute.)
         * Thus, if the graph has pos attributes in points, one should set inputscale=72.
         * This can also be set on the command line using the {@link https://graphviz.org/doc/info/command.html#-s -s flag} flag.
         *
         * If not set, no scaling is done and the units on input are treated as inches.
         * A value of 0 is equivalent to inputscale=72.
         *
         * @see {@link https://graphviz.org/docs/attrs/inputscale/ Node, Edge and Graph Attributes#inputscale}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault <none>
         * @graphvizNotes fdp, neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        inputscale: 'inputscale';
        /**
         * Text label attached to objects.
         * If a node's {@link shape} is record, then the label can have a {@link https://graphviz.org/doc/info/shapes.html special format} which describes the record layout.
         *
         * Note that a node's default label is "\N", so the node's name or ID becomes its label.
         * Technically, a node's name can be an HTML string but this will not mean that the node's label will be interpreted as an {@link https://graphviz.org/doc/info/shapes.html HTML-like} label.
         * This is because the node's actual label is an ordinary string, which will be replaced by the raw bytes stored in the node's name.
         * To get an HTML-like label, the label attribute value itself must be an HTML string.
         *
         * @see {@link https://graphviz.org/docs/attrs/label/ Node, Edge and Graph Attributes#label}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/lblString/ lblString}
         * @graphvizDefaultValu
         * "\N" (nodes)
         * "" (otherwise)
         * @graphvizUsedBy ENGC
         * @category Attribute
         */
        label: 'label';
        /**
         * If **labelURL** is defined, this is the link used for the label of an edge.
         * This value overrides any {@link URL} defined for the edge.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelURL/ Node, Edge and Graph Attributes#labelURL}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelURL: 'labelURL';
        /**
         * The value indicates whether to treat a node whose name has the form |edgelabel|* as a special node representing an edge label.
         * The default (0) produces no effect.
         * If the attribute is set to 1, sfdp uses a penalty-based method to make that kind of node close to the center of its neighbor.
         * With a value of 2, sfdp uses a penalty-based method to make that kind of node close to the old center of its neighbor.
         * Finally, a value of 3 invokes a two-step process of overlap removal and straightening.
         *
         * @see {@link https://graphviz.org/docs/attrs/label_scheme/ Node, Edge and Graph Attributes#label_scheme}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 0
         * @graphvizMinimum 0
         * @graphvizNotes sfdp only
         * @graphvizUsedBy G
         * @category Attribute
         */
        label_scheme: 'label_scheme';
        /**
         * This, along with {@link labeldistance}, determine where the headlabel (taillabel) are placed with respect to the head (tail) in polar coordinates.
         * The origin in the coordinate system is the point where the edge touches the node.
         * The ray of 0 degrees goes from the origin back along the edge, parallel to the edge at the origin.
         *
         * The angle, in degrees, specifies the rotation from the 0 degree ray, with positive angles moving counterclockwise and negative angles moving clockwise.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelangle/ Node, Edge and Graph Attributes#labelangle}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault -25
         * @graphvizMinimum -180
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelangle: 'labelangle';
        /**
         * Multiplicative scaling factor adjusting the distance that the headlabel(taillabel) is from the head(tail) node.
         * The default distance is 10 points.
         * See {@link labelangle} for more details.
         *
         * @see {@link https://graphviz.org/docs/attrs/labeldistance/ Node, Edge and Graph Attributes#labeldistance}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum 0
         * @graphvizUsedBy E
         * @category Attribute
         */
        labeldistance: 'labeldistance';
        /**
         * If true, allows edge labels to be less constrained in position.
         * In particular, it may appear on top of other edges.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelfloat/ Node, Edge and Graph Attributes#labelfloat}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelfloat: 'labelfloat';
        /**
         * Color used for headlabel and taillabel.
         * If not set, defaults to edge's fontcolor.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelfontcolor/ Node, Edge and Graph Attributes#labelfontcolor}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/color/ color}
         * @graphvizDefault black
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelfontcolor: 'labelfontcolor';
        /**
         * Font used for headlabel and taillabel.
         * If not set, defaults to edge's fontname.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelfontname/ Node, Edge and Graph Attributes#labelfontname}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault "Times-Roman"
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelfontname: 'labelfontname';
        /**
         * Font size, {@link https://graphviz.org/doc/info/attrs.html in points}, used for headlabel and taillabel.
         * If not set, defaults to edge's fontsize.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelfontsize/ Node, Edge and Graph Attributes#labelfontsize}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 14
         * @graphvizMinimum 1
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelfontsize: 'labelfontsize';
        /**
         * Synonym for {@link labelURL}.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelhref/ Node, Edge and Graph Attributes#labelhref}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        labelhref: 'labelhref';
        /**
         * Justification for cluster labels.
         * If "r", the label is right-justified within bounding rectangle; if "l", left-justified; else the label is centered.
         * Note that a subgraph inherits attributes from its parent.
         * Thus, if the root graph sets **labeljust** to "l", the subgraph inherits this value.
         *
         * @see {@link https://graphviz.org/docs/attrs/labeljust/ Node, Edge and Graph Attributes#labeljust}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault "c"
         * @graphvizUsedBy GC
         * @category Attribute
         */
        labeljust: 'labeljust';
        /**
         * Vertical placement of labels for nodes, root graphs and clusters.
         *
         * For graphs and clusters, only "t" and "b" are allowed, corresponding to placement at the top and bottom, respectively.
         * By default, root graph labels go on the bottom and cluster labels go on the top.
         * Note that a subgraph inherits attributes from its parent.
         * Thus, if the root graph sets {@link labelloc} to "b", the subgraph inherits this value.
         *
         * For nodes, this attribute is used only when the height of the node is larger than the height of its label.
         * If labelloc is set to "t", "c", or "b", the label is aligned with the top, centered, or aligned with the bottom of the node, respectively.
         * In the default case, the label is vertically centered.
         *
         * @see {@link https://graphviz.org/docs/attrs/labelloc/ Node, Edge and Graph Attributes#labelloc}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault
         * "t"(clusters)
         * "b"(root graphs)
         * "c"(nodes)
         * @graphvizUsedBy NGC
         * @category Attribute
         */
        labelloc: 'labelloc';
        /**
         * If the edge has a {@link URL} or {@link labelURL} attribute, this attribute determines which window of the browser is used for the URL attached to the label.
         * Setting it to "_graphviz" will open a new window if it doesn't already exist, or reuse it if it does.
         * If undefined, the value of the {@link target} is used.
         *
         * @see {@link https://graphviz.org/docs/attrs/labeltarget/ Node, Edge and Graph Attributes#labeltarget}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault <none>
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        labeltarget: 'labeltarget';
        /**
         * Tooltip annotation attached to label of an edge.
         * This is used only if the edge has a {@link URL} or {@link labelURL} attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/labeltooltip/ Node, Edge and Graph Attributes#labeltooltip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, cmap only
         * @graphvizUsedBy E
         * @category Attribute
         */
        labeltooltip: 'labeltooltip';
        /**
         * If true, the graph is rendered in landscape mode.
         * Synonymous with {@link rotate rotate=90} or {@link orientation orientation=landscape}.
         *
         * @see {@link https://graphviz.org/docs/attrs/landscape/ Node, Edge and Graph Attributes#landscape}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy G
         * @category Attribute
         */
        landscape: 'landscape';
        /**
         * Specifies layers in which the node, edge or cluster is present.
         *
         * @see {@link https://graphviz.org/docs/attrs/layer/ Node, Edge and Graph Attributes#layer}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:layerRange layerRange}
         * @graphvizDefault ""
         * @graphvizUsedBy ENC
         * @category Attribute
         */
        layer: 'layer';
        /**
         * Specifies the separator characters used to split an attribute of type {@link layerRange} into a list of ranges.
         *
         * @see {@link https://graphviz.org/docs/attrs/layerlistsep/ Node, Edge and Graph Attributes#layerlistsep}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        layerlistsep: 'layerlistsep';
        /**
         * Specifies a linearly ordered list of layer names attached to the graph The graph is then output in separate layers.
         * Only those components belonging to the current output layer appear.
         * For more information, see the page {@link https://graphviz.org/faq/#FaqOverlays How to use drawing layers (overlays)}.
         *
         * @see {@link https://graphviz.org/docs/attrs/layers/ Node, Edge and Graph Attributes#layers}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:layerList layerList}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        layers: 'layers';
        /**
         * Selects a list of layers to be emitted.
         *
         * @see {@link https://graphviz.org/docs/attrs/layerselect/ Node, Edge and Graph Attributes#layerselect}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:layerRange layerRange}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        layerselect: 'layerselect';
        /**
         * Specifies the separator characters used to split the {@link layers} attribute into a list of layer names.
         *
         * @see {@link https://graphviz.org/docs/attrs/layersep/ Node, Edge and Graph Attributes#layersep}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault " :\t"
         * @graphvizUsedBy G
         * @category Attribute
         */
        layersep: 'layersep';
        /**
         * Specifies the name of the layout algorithm to use, such as "dot" or "neato".
         * Normally, graphs should be kept independent of a type of layout.
         * In some cases, however, it can be convenient to embed the type of layout desired within the graph.
         * For example, a graph containing position information from a layout might want to record what the associated layout algorithm was.
         *
         * @see {@link https://graphviz.org/docs/attrs/layout/ Node, Edge and Graph Attributes#layout}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        layout: 'layout';
        /**
         * Preferred edge length, in inches.
         *
         * @see {@link https://graphviz.org/docs/attrs/len/ Node, Edge and Graph Attributes#len}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault
         * 1.0(neato)
         * 0.3(fdp)
         * @graphvizNotes fdp, neato only
         * @graphvizUsedBy E
         * @category Attribute
         */
        len: 'len';
        /**
         * Number of levels allowed in the multilevel scheme.
         *
         * @see {@link https://graphviz.org/docs/attrs/levels/ Node, Edge and Graph Attributes#levels}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault MAXINT
         * @graphvizMinimum 0
         * @graphvizNotes sfdp only
         * @graphvizUsedBy G
         * @category Attribute
         */
        levels: 'levels';
        /**
         * Specifies strictness of level constraints in neato when {@link mode}="ipsep" or "hier".
         * Larger positive values mean stricter constraints, which demand more separation between levels.
         * On the other hand, negative values will relax the constraints by allowing some overlap between the levels.
         *
         * @see {@link https://graphviz.org/docs/attrs/levelsgap/ Node, Edge and Graph Attributes#levelsgap}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        levelsgap: 'levelsgap';
        /**
         * Logical head of an edge.
         * When {@link compound} is true, if **lhead** is defined and is the name of a cluster containing the real head,
         * the edge is clipped to the boundary of the cluster.
         * See the {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/lhead/ Node, Edge and Graph Attributes#lhead}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes dot only
         * @graphvizUsedBy E
         * @category Attribute
         */
        lhead: 'lhead';
        /**
         * Height of graph or cluster label, in inches.
         *
         * @see {@link https://graphviz.org/docs/attrs/lheight/ Node, Edge and Graph Attributes#lheight}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizNotes write only
         * @graphvizUsedBy GC
         * @category Attribute
         */
        lheight: 'lheight';
        /**
         * Label position, {@link https://graphviz.org/doc/info/attrs.html in points}.
         * The position indicates the center of the label.
         *
         * @see {@link https://graphviz.org/docs/attrs/lp/ Node, Edge and Graph Attributes#lp}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizNotes write only
         * @graphvizUsedBy EGC
         * @category Attribute
         */
        lp: 'lp';
        /**
         * Logical tail of an edge.
         * When {@link compound} is true, if **ltail** is defined and is the name of a cluster containing the real tail, the edge is clipped to the boundary of the cluster.
         * See the {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/ltail/ Node, Edge and Graph Attributes#ltail}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes dot only
         * @graphvizUsedBy E
         * @category Attribute
         */
        ltail: 'ltail';
        /**
         * Width of graph or cluster label, in inches.
         *
         * @see {@link https://graphviz.org/docs/attrs/lwidth/ Node, Edge and Graph Attributes#lwidth}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizNotes write only
         * @graphvizUsedBy GC
         * @category Attribute
         */
        lwidth: 'lwidth';
        /**
         * For graphs, this sets x and y margins of canvas, in inches.
         * If the margin is a single double, both margins are set equal to the given value.
         *
         * Note that the margin is not part of the drawing but just empty space left around the drawing.
         * It basically corresponds to a translation of drawing, as would be necessary to center a drawing on a page.
         * Nothing is actually drawn in the margin.
         * To actually extend the background of a drawing, see the {@link pad} attribute.
         *
         * For clusters, this specifies the space between the nodes in the cluster and the cluster bounding box.
         * By default, this is 8 points.
         *
         * For nodes, this attribute specifies space left around the node's label.
         * By default, the value is 0.11,0.055.
         *
         * @see {@link https://graphviz.org/docs/attrs/margin/ Node, Edge and Graph Attributes#margin}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizDefault <device-dependent>
         * @graphvizUsedBy NCG
         * @category Attribute
         */
        margin: 'margin';
        /**
         * Sets the number of iterations used.
         *
         * @see {@link https://graphviz.org/docs/attrs/maxiter/ Node, Edge and Graph Attributes#maxiter}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault
         * 100 * # nodes(mode == KK)
         * 200(mode == major)
         * 600(fdp)
         * @graphvizNotes fdp, neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        maxiter: 'maxiter';
        /**
         * Multiplicative scale factor used to alter the MinQuit (default = 8) and MaxIter (default = 24) parameters used during crossing minimization.
         * These correspond to the number of tries without improvement before quitting and the maximum number of iterations in each pass.
         *
         * @see {@link https://graphviz.org/docs/attrs/mclimit/ Node, Edge and Graph Attributes#mclimit}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        mclimit: 'mclimit';
        /**
         * Specifies the minimum separation between all nodes.
         *
         * @see {@link https://graphviz.org/docs/attrs/mindist/ Node, Edge and Graph Attributes#mindist}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum 0
         * @graphvizNotes circo only
         * @graphvizUsedBy G
         * @category Attribute
         */
        mindist: 'mindist';
        /**
         * Minimum edge length (rank difference between head and tail).
         *
         * @see {@link https://graphviz.org/docs/attrs/minlen/ Node, Edge and Graph Attributes#minlen}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 1
         * @graphvizMinimum 0
         * @graphvizNotes dot only
         * @graphvizUsedBy E
         * @category Attribute
         */
        minlen: 'minlen';
        /**
         * Technique for optimizing the layout.
         * For neato, if **mode** is "major", neato uses stress majorization.
         * If **mode** is "KK", neato uses a version of the gradient descent method.
         * The only advantage to the latter technique is that it is sometimes appreciably faster for small (number of nodes < 100) graphs.
         * A significant disadvantage is that it may cycle.
         *
         * There are two experimental modes in neato, "hier", which adds a top-down directionality similar to the layout used in dot, and "ipsep",
         * which allows the graph to specify minimum vertical and horizontal distances between nodes. (See the {@link sep} attribute.)
         *
         * For sfdp, the default **mode** is "spring", which corresponds to using a spring-electrical model.
         * Setting **mode** to "maxent" causes a similar model to be run but one that also takes into account edge lengths specified by the "len" attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/mode/ Node, Edge and Graph Attributes#mode}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault major
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        mode: 'mode';
        /**
         * This value specifies how the distance matrix is computed for the input graph.
         * The distance matrix specifies the ideal distance between every pair of nodes.
         * neato attemps to find a layout which best achieves these distances.
         * By default, it uses the length of the shortest path, where the length of each edge is given by its {@link len} attribute.
         * If **model** is "circuit", neato uses the circuit resistance model to compute the distances.
         * This tends to emphasize clusters.
         * If **model** is "subset", neato uses the subset model.
         * This sets the edge length to be the number of nodes that are neighbors of exactly one of the end points, and then calculates the shortest paths.
         * This helps to separate nodes with high degree.
         *
         * For more control of distances, one can use model=mds.
         * In this case, the {@link len} of an edge is used as the ideal distance between its vertices.
         * A shortest path calculation is only used for pairs of nodes not connected by an edge.
         * Thus, by supplying a complete graph, the input can specify all of the relevant distances.
         *
         * @see {@link https://graphviz.org/docs/attrs/model/ Node, Edge and Graph Attributes#model}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault shortpath
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        model: 'model';
        /**
         * If Graphviz is built with MOSEK defined, mode=ipsep and mosek=true, the Mosek software (<www.mosek.com>) is use to solve the ipsep constraints.
         *
         * @see {@link https://graphviz.org/docs/attrs/mosek/ Node, Edge and Graph Attributes#mosek}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        mosek: 'mosek';
        /**
         * The original ranking algorithm in dot is recursive on clusters.
         * This can produce fewer ranks and a more compact layout, but sometimes at the cost of a head node being place on a higher rank than the tail node.
         * It also assumes that a node is not constrained in separate, incompatible subgraphs.
         * For example, a node cannot be in a cluster and also be constrained by rank=same with a node not in the cluster.
         *
         * If newrank=true, the ranking algorithm does a single global ranking, ignoring clusters.
         * This allows nodes to be subject to multiple constraints.
         * Rank constraints will usually take precedence over edge constraints.
         *
         * @see {@link https://graphviz.org/docs/attrs/newrank/ Node, Edge and Graph Attributes#newrank}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        newrank: 'newrank';
        /**
         * In dot, this specifies the minimum space between two adjacent nodes in the same rank, in inches.
         *
         * For other layouts, this affects the spacing between loops on a single node, or multiedges between a pair of nodes.
         *
         * @see {@link https://graphviz.org/docs/attrs/nodesep/ Node, Edge and Graph Attributes#nodesep}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0.25
         * @graphvizMinimum 0.02
         * @graphvizUsedBy G
         * @category Attribute
         */
        nodesep: 'nodesep';
        /**
         * By default, the justification of multi-line labels is done within the largest context that makes sense.
         * Thus, in the label of a polygonal node, a left-justified line will align with the left side of the node (shifted by the prescribed {@link margin}).
         * In record nodes, left-justified line will line up with the left side of the enclosing column of fields.
         * If **nojustify** is "true", multi-line labels will be justified in the context of itself.
         * For example, if the attribute is set, the first label line is long, and the second is shorter and left-justified, the second will align with the left-most character in the first line, regardless of how large the node might be.
         *
         * @see {@link https://graphviz.org/docs/attrs/nojustify/ Node, Edge and Graph Attributes#nojustify}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy GCNE
         * @category Attribute
         */
        nojustify: 'nojustify';
        /**
         * If set, normalize coordinates of final layout so that the first point is at the origin, and then rotate the layout so that the angle of the first edge is specified by the value of normalize in degrees.
         * If normalize is not a number, it is evaluated as a bool, with true corresponding to 0 degrees.
         * **NOTE**: Since the attribute is evaluated first as a number, 0 and 1 cannot be used for false and true.
         *
         * @see {@link https://graphviz.org/docs/attrs/normalize/ Node, Edge and Graph Attributes#normalize}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes not dot
         * @graphvizUsedBy G
         * @category Attribute
         */
        normalize: 'normalize';
        /**
         * By default, the final layout is translated so that the lower-left corner of the bounding box is at the origin.
         * This can be annoying if some nodes are pinned or if the user runs `neato -n`.
         * To avoid this translation, set notranslate to true.
         *
         * @see {@link https://graphviz.org/docs/attrs/notranslate/ Node, Edge and Graph Attributes#notranslate}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        notranslate: 'notranslate';
        /**
         * Used to set number of iterations in network simplex applications.
         * **nslimit** is used in computing node x coordinates, **nslimit1** for ranking nodes.
         * If defined, # iterations = **nslimit(1)** * # nodes; otherwise, # iterations = MAXINT.
         *
         * @see {@link https://graphviz.org/docs/attrs/nslimit/ Node, Edge and Graph Attributes#nslimit}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        nslimit: 'nslimit';
        /**
         * Used to set number of iterations in network simplex applications.
         * **nslimit** is used in computing node x coordinates, **nslimit1** for ranking nodes.
         * If defined, # iterations = **nslimit(1)** * # nodes; otherwise, # iterations = MAXINT.
         *
         * @see {@link https://graphviz.org/docs/attrs/nslimit1/ Node, Edge and Graph Attributes#nslimit1}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        nslimit1: 'nslimit1';
        /**
         * Angle, in degrees, used to rotate polygon node shapes. For any number of polygon sides, 0 degrees rotation results in a flat base.
         *
         * @see {@link https://graphviz.org/docs/attrs/ordering/ Node, Edge and Graph Attributes#ordering}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes dot only
         * @graphvizUsedBy GN
         * @category Attribute
         */
        ordering: 'ordering';
        /**
         * If "[lL]*", set graph orientation to landscape Used only if {@link rotate} is not defined.
         *
         * @see {@link https://graphviz.org/docs/attrs/orientation/ Node, Edge and Graph Attributes#orientation}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        orientation: 'orientation';
        /**
         * Specify order in which nodes and edges are drawn.
         *
         * @see {@link https://graphviz.org/docs/attrs/outputorder/ Node, Edge and Graph Attributes#outputorder}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:outputMode outputMode}
         * @graphvizDefault breadthfirst
         * @graphvizUsedBy G
         * @category Attribute
         */
        outputorder: 'outputorder';
        /**
         * Determines if and how node overlaps should be removed.
         * Nodes are first enlarged using the {@link sep} attribute.
         * If "true" , overlaps are retained.
         * If the value is "scale", overlaps are removed by uniformly scaling in x and y.
         * If the value converts to "false", and it is available, Prism, a proximity graph-based algorithm, is used to remove node overlaps.
         * This can also be invoked explicitly with "overlap=prism".
         * This technique starts with a small scaling up, controlled by the {@link overlap_scaling} attribute, which can remove a significant portion of the overlap.
         * The prism option also accepts an optional non-negative integer suffix.
         * This can be used to control the number of attempts made at overlap removal.
         * By default, overlap="prism" is equivalent to overlap="prism1000".
         * Setting overlap="prism0" causes only the scaling phase to be run.
         *
         * If Prism is not available, or the version of Graphviz is earlier than 2.28, "overlap=false" uses a Voronoi-based technique.
         * This can always be invoked explicitly with "overlap=voronoi".
         *
         * If the value is "scalexy", x and y are separately scaled to remove overlaps.
         *
         * If the value is "compress", the layout will be scaled down as much as possible without introducing any overlaps, obviously assuming there are none to begin with.
         *
         * **N.B.**The remaining allowed values of overlap correspond to algorithms which, at present, can produce bad aspect ratios.
         * In addition, we deprecate the use of the "ortho*" and "portho*".
         *
         * If the value is "vpsc", overlap removal is done as a quadratic optimization to minimize node displacement while removing node overlaps.
         *
         * If the value is "orthoxy" or "orthoyx", overlaps are moved by optimizing two constraint problems, one for the x axis and one for the y.
         * The suffix indicates which axis is processed first. If the value is "ortho", the technique is similar to "orthoxy" except a heuristic is used to reduce the bias between the two passes.
         * If the value is "ortho_yx", the technique is the same as "ortho", except the roles of x and y are reversed.
         * The values "portho", "porthoxy", "porthoxy", and "portho_yx" are similar to the previous four, except only pseudo-orthogonal ordering is enforced.
         *
         * If the layout is done by neato with {@link mode}="ipsep", then one can use overlap=ipsep.
         * In this case, the overlap removal constraints are incorporated into the layout algorithm itself.
         * N.B. At present, this only supports one level of clustering.
         *
         * Except for fdp and sfdp, the layouts assume overlap="true" as the default.
         * Fdp first uses a number of passes using a built-in, force-directed technique to try to remove overlaps.
         * Thus, fdp accepts **overlap** with an integer prefix followed by a colon, specifying the number of tries.
         * If there is no prefix, no initial tries will be performed.
         * If there is nothing following a colon, none of the above methods will be attempted.
         * By default, fdp uses overlap="9:prism".
         * Note that overlap="true", overlap="0:true" and overlap="0:" all turn off all overlap removal.
         *
         * By default, sfdp uses `overlap="prism0"`.
         *
         * Except for the Voronoi and prism methods, all of these transforms preserve the orthogonal ordering of the original layout.
         * That is, if the x coordinates of two nodes are originally the same, they will remain the same, and if the x coordinate of one node is originally less than the x coordinate of another, this relation will still hold in the transformed layout.
         * The similar properties hold for the y coordinates.
         * This is not quite true for the "porth*" cases.
         * For these, orthogonal ordering is only preserved among nodes related by an edge.
         *
         * @see {@link https://graphviz.org/docs/attrs/overlap/ Node, Edge and Graph Attributes#overlap}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}/{@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizNotes not dot
         * @graphvizUsedBy G
         * @category Attribute
         */
        overlap: 'overlap';
        /**
         * When overlap=prism, the layout is scaled by this factor, thereby removing a fair amount of node overlap,
         * and making node overlap removal faster and better able to retain the graph's shape.
         *
         * If overlap_scaling is negative, the layout is scaled by -1*overlap_scaling times the average label size.
         * If overlap_scaling is positive, the layout is scaled by overlap_scaling.
         * If overlap_scaling is zero, no scaling is done.
         *
         * @see {@link https://graphviz.org/docs/attrs/overlap_scaling/ Node, Edge and Graph Attributes#overlap_scaling}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault -4
         * @graphvizMinimum -1.00E+10
         * @graphvizNotes prism only
         * @graphvizUsedBy G
         * @category Attribute
         */
        overlap_scaling: 'overlap_scaling';
        /**
         * If true, the overlap removal algorithm will perform a compression pass to reduce the size of the layout.
         *
         * @see {@link https://graphviz.org/docs/attrs/overlap_shrink/ Node, Edge and Graph Attributes#overlap_shrink}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizNotes prism only
         * @graphvizUsedBy G
         * @category Attribute
         */
        overlap_shrink: 'overlap_shrink';
        /**
         * This is true if the value of pack is "true" (case-insensitive) or a non-negative integer.
         * If true, each connected component of the graph is laid out separately, and then the graphs are packed together.
         * If pack has an integral value, this is used as the size, in {@link points}, of a margin around each part; otherwise, a default margin of 8 is used.
         * If pack is interpreted as false, the entire graph is laid out together.
         * The granularity and method of packing is influenced by the {@link packmode} attribute.
         *
         * For layouts which always do packing, such a twopi, the **pack** attribute is just used to set the margin.
         *
         * @see {@link https://graphviz.org/docs/attrs/pack/ Node, Edge and Graph Attributes#pack}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}/int
         * @graphvizDefault FALSE
         * @graphvizUsedBy G
         * @category Attribute
         */
        pack: 'pack';
        /**
         * This indicates how connected components should be packed (cf. {@link https://graphviz.org/docs/attrs/packmode/ packMode}).
         * Note that defining {@link packmode} will automatically turn on packing as though one had set `pack=true`.
         *
         * @see {@link https://graphviz.org/docs/attrs/packmode/ Node, Edge and Graph Attributes#packmode}
         * @graphvizType {@link https://graphviz.org/docs/attrs/packmode/ packMode}
         * @graphvizDefault node
         * @graphvizUsedBy G
         * @category Attribute
         */
        packmode: 'packmode';
        /**
         * The pad attribute specifies how much, in inches, to extend the drawing area around the minimal area needed to draw the graph.
         * If the pad is a single double, both the x and y pad values are set equal to the given value.
         * This area is part of the drawing and will be filled with the background color, if appropriate.
         *
         * Normally, a small pad is used for aesthetic reasons, especially when a background color is used,
         * to avoid having nodes and edges abutting the boundary of the drawn region.
         *
         * @see {@link https://graphviz.org/docs/attrs/pad/ Node, Edge and Graph Attributes#pad}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizDefault 0.0555 (4 points)
         * @graphvizUsedBy G
         * @category Attribute
         */
        pad: 'pad';
        /**
         * Width and height of output pages, in inches.
         * If only a single value is given, this is used for both the width and height.
         *
         * If this is set and is smaller than the size of the layout,
         * a rectangular array of pages of the specified page size is overlaid on the layout,
         * with origins aligned in the lower-left corner, thereby partitioning the layout into pages.
         * The pages are then produced one at a time, in {@link pagedir} order.
         *
         * At present, this only works for PostScript output.
         * For other types of output, one should use another tool to split the output into multiple output files.
         * Or use the {@link viewport} to generate multiple files.
         *
         * @see {@link https://graphviz.org/docs/attrs/page/ Node, Edge and Graph Attributes#page}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizUsedBy G
         * @category Attribute
         */
        page: 'page';
        /**
         * If the page attribute is set and applicable, this attribute specifies the order in which the pages are emitted. This is limited to one of the 8 row or column major orders.
         *
         * @see {@link https://graphviz.org/docs/attrs/pagedir/ Node, Edge and Graph Attributes#pagedir}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:pagedir pagedir}
         * @graphvizDefault BL
         * @graphvizUsedBy G
         * @category Attribute
         */
        pagedir: 'pagedir';
        /**
         * Color used to draw the bounding box around a cluster.
         * If **pencolor** is not defined, {@link color} is used.
         * If this is not defined, {@link bgcolor} is used.
         * If this is not defined, the default is used.
         *
         * Note that a cluster inherits the root graph's attributes if defined.
         * Thus, if the root graph has defined a **pencolor**, this will override a **color** or **bgcolor** attribute set for the cluster.
         *
         * @see {@link https://graphviz.org/docs/attrs/pagedir/ Node, Edge and Graph Attributes#pagedir}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/color/ color}
         * @graphvizDefault black
         * @graphvizUsedBy C
         * @category Attribute
         */
        pencolor: 'pencolor';
        /**
         * Specifies the width of the pen, in points, used to draw lines and curves, including the boundaries of edges and clusters.
         * The value is inherited by subclusters.
         * It has no effect on text.
         *
         * Previous to 31 January 2008, the effect of penwidth=W was achieved by including setlinewidth(W) as part of a {@link style} specification.
         * If both are used, penwidth will be used.
         *
         * @see {@link https://graphviz.org/docs/attrs/penwidth/ Node, Edge and Graph Attributes#penwidth}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum 0
         * @graphvizUsedBy CNE
         * @category Attribute
         */
        penwidth: 'penwidth';
        /**
         * Set number of peripheries used in polygonal shapes and cluster boundaries.
         * Note that {@link https://graphviz.org/doc/info/shapes.html#epsf user-defined shapes} are treated as a form of box shape, so the default peripheries value is 1 and the user-defined shape will be drawn in a bounding rectangle.
         * Setting peripheries=0 will turn this off.
         * Also, 1 is the maximum peripheries value for clusters.
         *
         * @see {@link https://graphviz.org/docs/attrs/peripheries/ Node, Edge and Graph Attributes#peripheries}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault
         * shape default(nodes)
         * 1(clusters)
         * @graphvizMinimum 0
         * @graphvizUsedBy NC
         * @category Attribute
         */
        peripheries: 'peripheries';
        /**
         * If true and the node has a pos attribute on input, neato or fdp prevents the node from moving from the input position.
         * This property can also be specified in the pos attribute itself (cf. the {@link https://graphviz.org/docs/attr-types/point/ point} type).
         *
         * Note: Due to an artifact of the implementation, previous to 27 Feb 2014, final coordinates are translated to the origin.
         * Thus, if you look at the output coordinates given in the (x)dot or plain format, pinned nodes will not have the same output coordinates as were given on input.
         * If this is important, a simple workaround is to maintain the coordinates of a pinned node.
         * The vector difference between the old and new coordinates will give the translation, which can then be subtracted from all of the appropriate coordinates.
         *
         * After 27 Feb 2014, this translation can be avoided in neato by setting the {@link notranslate} to TRUE.
         * However, if the graph specifies {@link overlap node overlap removal} or a change in {@link ratio aspect ratio}, node coordinates may still change.
         *
         * @see {@link https://graphviz.org/docs/attrs/pin/ Node, Edge and Graph Attributes#pin}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizNotes fdp, neato only
         * @graphvizUsedBy N
         * @category Attribute
         */
        pin: 'pin';
        /**
         * Position of node, or spline control points.
         * For nodes, the position indicates the center of the node.
         * On output, the coordinates are in {@link https://graphviz.org/doc/info/attrs.html points}.
         *
         * In neato and fdp, pos can be used to set the initial position of a node.
         * By default, the coordinates are assumed to be in inches.
         * However, the {@link https://graphviz.org/_pages/doc/info/command.html#d:s -s} command line flag can be used to specify different units.
         * As the output coordinates are in points, feeding the output of a graph laid out by a Graphviz program into neato or fdp will almost always require the -s flag.
         *
         * When the {@link https://graphviz.org/_pages/doc/info/command.html#d:n -n} command line flag is used with neato,
         * it is assumed the positions have been set by one of the layout programs, and are therefore in points.
         * Thus, neato -n can accept input correctly without requiring a -s flag and, in fact, ignores any such flag.
         *
         * @see {@link https://graphviz.org/docs/attrs/pos/ Node, Edge and Graph Attributes#pos}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/point/ point}/{@link https://graphviz.org/_pages/doc/info/attrs.html#k:smoothType splineType}
         * @graphvizUsedBy EN
         * @category Attribute
         */
        pos: 'pos';
        /**
         * Quadtree scheme to use.
         *
         * A TRUE bool value corresponds to "normal"; a FALSE bool value corresponds to "none".
         * As a slight exception to the normal interpretation of bool, a value of "2" corresponds to "fast".
         *
         * @see {@link https://graphviz.org/docs/attrs/quadtree/ Node, Edge and Graph Attributes#quadtree}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:quadType quadType}/{@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault normal
         * @graphvizNotes sfdp only
         * @graphvizUsedBy G
         * @category Attribute
         */
        quadtree: 'quadtree';
        /**
         * If **quantum** > 0.0, node label dimensions will be rounded to integral multiples of the quantum.
         *
         * @see {@link https://graphviz.org/docs/attrs/quantum/ Node, Edge and Graph Attributes#quantum}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0
         * @graphvizMinimum 0
         * @graphvizUsedBy G
         * @category Attribute
         */
        quantum: 'quantum';
        /**
         * Rank constraints on the nodes in a subgraph.
         * If **rank**="same", all nodes are placed on the same rank.
         * If **rank**="min", all nodes are placed on the minimum rank.
         * If **rank**="source", all nodes are placed on the minimum rank, and the only nodes on the minimum rank belong to some subgraph whose rank attribute is "source" or "min".
         * Analogous criteria hold for rank="max" and rank="sink".
         * (Note: the minimum rank is topmost or leftmost, and the maximum rank is bottommost or rightmost.)
         *
         * @see {@link https://graphviz.org/docs/attrs/rank/ Node, Edge and Graph Attributes#rank}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:rankType rankType}
         * @graphvizNotes dot only
         * @graphvizUsedBy S
         * @category Attribute
         */
        rank: 'rank';
        /**
         * Sets direction of graph layout.
         * For example, if **rankdir**="LR", and barring cycles, an edge T -> H; will go from left to right.
         * By default, graphs are laid out from top to bottom.
         *
         * This attribute also has a side-effect in determining how record nodes are interpreted.
         * See {@link https://graphviz.org/doc/info/shapes.html record shapes}.
         *
         * @see {@link https://graphviz.org/docs/attrs/rankdir/ Node, Edge and Graph Attributes#rankdir}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:rankdir rankdir}
         * @graphvizDefault TB
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        rankdir: 'rankdir';
        /**
         * In dot, this gives the desired rank separation, in inches.
         * This is the minimum vertical distance between the bottom of the nodes in one rank and the tops of nodes in the next.
         * If the value contains "equally", the centers of all ranks are spaced equally apart.
         * Note that both settings are possible, e.g., ranksep = "1.2 equally".
         *
         * In twopi, this attribute specifies the radial separation of concentric circles.
         * For twopi, ranksep can also be a list of doubles.
         * The first double specifies the radius of the inner circle; the second double specifies the increase in radius from the first circle to the second; etc.
         * If there are more circles than numbers, the last number is used as the increment for the remainder.
         *
         * @see {@link https://graphviz.org/docs/attrs/ranksep/ Node, Edge and Graph Attributes#ranksep}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/_pages/doc/info/attrs.html#k:doubleList doubleList}
         * @graphvizDefault
         * 0.5(dot)
         * 1.0(twopi)
         * @graphvizMinimum 0.02
         * @graphvizNotes twopi, dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        ranksep: 'ranksep';
        /**
         * Sets the aspect ratio (drawing height/drawing width) for the drawing.
         * Note that this is adjusted before the {@link size} attribute constraints are enforced.
         * In addition, the calculations usually ignore the node sizes, so the final drawing size may only approximate what is desired.
         *
         * If **ratio** is numeric, it is taken as the desired aspect ratio.
         * Then, if the actual aspect ratio is less than the desired ratio, the drawing height is scaled up to achieve the desired ratio;
         * if the actual ratio is greater than that desired ratio, the drawing width is scaled up.
         *
         * If **ratio** = "fill" and the {@link size} attribute is set, node positions are scaled, separately in both x and y, so that the final drawing exactly fills the specified size.
         * If both {@link size} values exceed the width and height of the drawing, then both coordinate values of each node are scaled up accordingly.
         * However, if either size dimension is smaller than the corresponding dimension in the drawing, one dimension is scaled up so that the final drawing has the same aspect ratio as specified by {@link size}.
         * Then, when rendered, the layout will be scaled down uniformly in both dimensions to fit the given {@link size}, which may cause nodes and text to shrink as well.
         * This may not be what the user wants, but it avoids the hard problem of how to reposition the nodes in an acceptable fashion to reduce the drawing size.
         *
         * If **** = "compress" and the {@link size} attribute is set, dot attempts to compress the initial layout to fit in the given size.
         * This achieves a tighter packing of nodes but reduces the balance and symmetry.
         * This feature only works in dot.
         *
         * If **** = "expand", the {@link size} attribute is set, and both the width and the height of the graph are less than the value in {@link size},
         * node positions are scaled uniformly until at least one dimension fits {@link size} exactly.
         * Note that this is distinct from using {@link size} as the desired size, as here the drawing is expanded before edges are generated and all node and text sizes remain unchanged.
         *
         * If **** = "auto", the {@link page} attribute is set and the graph cannot be drawn on a single page, then {@link size} is set to an ``ideal'' value.
         * In particular, the size in a given dimension will be the smallest integral multiple of the page size in that dimension which is at least half the current size.
         * The two dimensions are then scaled independently to the new size.
         * This feature only works in dot.
         *
         * @see {@link https://graphviz.org/docs/attrs/ratio/ Node, Edge and Graph Attributes#ratio}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/string
         * @graphvizUsedBy G
         * @category Attribute
         */
        ratio: 'ratio';
        /**
         * Rectangles for fields of records,
         * {@link https://graphviz.org/doc/info/attrs.html in points}.
         *
         * @see {@link https://graphviz.org/docs/attrs/rects/ Node, Edge and Graph Attributes#rects}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/rect/ rect}
         * @graphvizNotes write only
         * @graphvizUsedBy N
         * @category Attribute
         */
        rects: 'rects';
        /**
         * If true, force polygon to be regular, i.e.,
         * the vertices of the polygon will lie on a circle whose center is the center of the node.
         *
         * @see {@link https://graphviz.org/docs/attrs/regular/ Node, Edge and Graph Attributes#regular}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault FALSE
         * @graphvizUsedBy N
         * @category Attribute
         */
        regular: 'regular';
        /**
         * If true and there are multiple clusters, run crossing minimization a second time.
         *
         * @see {@link https://graphviz.org/docs/attrs/remincross/ Node, Edge and Graph Attributes#remincross}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        remincross: 'remincross';
        /**
         * The power of the repulsive force used in an extended Fruchterman-Reingold force directed model.
         * Values larger than 1 tend to reduce the warping effect at the expense of less clustering.
         *
         * @see {@link https://graphviz.org/docs/attrs/repulsiveforce/ Node, Edge and Graph Attributes#repulsiveforce}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum 0
         * @graphvizNotes sfdp only
         * @graphvizUsedBy G
         * @category Attribute
         */
        repulsiveforce: 'repulsiveforce';
        /**
         * This is a synonym for the {@link dpi} attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/resolution/ Node, Edge and Graph Attributes#resolution}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault
         * 96.0
         * 0.0"
         * @graphvizNotes svg, bitmap output only
         * @graphvizUsedBy G
         * @category Attribute
         */
        resolution: 'resolution';
        /**
         * This specifies nodes to be used as the center of the layout and the root of the generated spanning tree.
         * As a graph attribute, this gives the name of the node.
         * As a node attribute, it specifies that the node should be used as a central node.
         * In twopi, this will actually be the central node.
         * In circo, the block containing the node will be central in the drawing of its connected component.
         * If not defined, twopi will pick a most central node, and circo will pick a random node.
         *
         * If the root attribute is defined as the empty string, twopi will reset it to name of the node picked as the root node.
         *
         * For twopi, it is possible to have multiple roots, presumably one for each component.
         * If more than one node in a component is marked as the root, twopi will pick one.
         *
         * @see {@link https://graphviz.org/docs/attrs/root/ Node, Edge and Graph Attributes#root}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}/{@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault
         * <none>(graphs)
         * false(nodes)
         * @graphvizMinimum
         * @graphvizNotes circo, twopi only
         * @graphvizUsedBy GN
         * @category Attribute
         */
        root: 'root';
        /**
         * If 90, set drawing orientation to landscape.
         *
         * @see {@link https://graphviz.org/docs/attrs/rotate/ Node, Edge and Graph Attributes#rotate}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 0
         * @graphvizUsedBy G
         * @category Attribute
         */
        rotate: 'rotate';
        /**
         * Causes the final layout to be rotated counter-clockwise by the specified number of degrees.
         *
         * @see {@link https://graphviz.org/docs/attrs/rotation/ Node, Edge and Graph Attributes#rotation}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0
         * @graphvizNotes sfdp only
         * @graphvizUsedBy G
         * @category Attribute
         */
        rotation: 'rotation';
        /**
         * Edges with the same head and the same **samehead** value are aimed at the same point on the head.
         * This has no effect on loops.
         * Each node can have at most 5 unique samehead values.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/samehead/ Node, Edge and Graph Attributes#samehead}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes dot only
         * @graphvizUsedBy E
         * @category Attribute
         */
        samehead: 'samehead';
        /**
         * Edges with the same tail and the same sametail value are aimed at the same point on the tail.
         * This has no effect on loops.
         * Each node can have at most 5 unique sametail values.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/sametail/ Node, Edge and Graph Attributes#sametail}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes dot only
         * @graphvizUsedBy E
         * @category Attribute
         */
        sametail: 'sametail';
        /**
         * If the input graph defines the {@link vertices} attribute, and output is dot or xdot, this gives the number of points used for a node whose shape is a circle or ellipse.
         * It plays the same role in neato, when adjusting the layout to avoid overlapping nodes, and in image maps.
         *
         * @see {@link https://graphviz.org/docs/attrs/samplepoints/ Node, Edge and Graph Attributes#samplepoints}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault
         * 8(output)
         * 20(overlap and image maps)
         * @graphvizUsedBy N
         * @category Attribute
         */
        samplepoints: 'samplepoints';
        /**
         * If set, after the initial layout, the layout is scaled by the given factors.
         * If only a single number is given, this is used for both factors.
         *
         * @see {@link https://graphviz.org/docs/attrs/scale/ Node, Edge and Graph Attributes#scale}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizNotes not dot
         * @graphvizUsedBy G
         * @category Attribute
         */
        scale: 'scale';
        /**
         * During network simplex, maximum number of edges with negative cut values to search when looking for one with minimum cut value.
         *
         * @see {@link https://graphviz.org/docs/attrs/searchsize/ Node, Edge and Graph Attributes#searchsize}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 30
         * @graphvizNotes dot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        searchsize: 'searchsize';
        /**
         * Specifies margin to leave around nodes when removing node overlap.
         * This guarantees a minimal non-zero distance between nodes.
         *
         * If the attribute begins with a plus sign '+', an additive margin is specified.
         * That is, "+w,h" causes the node's bounding box to be increased by w points on the left and right sides, and by h points on the top and bottom.
         * Without a plus sign, the node is scaled by 1 + w in the x coordinate and 1 + h in the y coordinate.
         *
         * If only a single number is given, this is used for both dimensions.
         *
         * If unset but {@link esep} is defined, the sep values will be set to the esep values divided by 0.8. If esep is unset, the default value is used.
         *
         * @see {@link https://graphviz.org/docs/attrs/sep/ Node, Edge and Graph Attributes#sep}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/addDouble/ addDouble}/{@link https://graphviz.org/_pages/doc/info/attrs.html#k:addPoint addPoint}
         * @graphvizDefault 4
         * @graphvizNotes not dot
         * @graphvizUsedBy G
         * @category Attribute
         */
        sep: 'sep';
        /**
         * Set the shape of a node.
         *
         * @see {@link https://graphviz.org/docs/attrs/shape/ Node, Edge and Graph Attributes#shape}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:shape shape}
         * @graphvizDefault ellipse
         * @graphvizUsedBy N
         * @category Attribute
         */
        shape: 'shape';
        /**
         * (Deprecated) If defined, shapefile specifies a file containing user-supplied node content.
         * The {@link shape} of the node is set to box.
         * The image in the shapefile must be rectangular.
         * The image formats supported as well as the precise semantics of how the file is used depends on the {@link https://graphviz.org/_pages/doc/info/output.html output format}.
         * For further details, see {@link https://graphviz.org/docs/outputs/ Image Formats} and {@link https://graphviz.org/faq/#ext_image External PostScript files}.
         *
         * @see {@link https://graphviz.org/docs/attrs/shapefile/ Node, Edge and Graph Attributes#shapefile}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizUsedBy N
         * @deprecated
         * @category Attribute
         */
        shapefile: 'shapefile';
        /**
         * Print guide boxes in PostScript at the beginning of routesplines if 1, or at the end if 2. (Debugging)
         *
         * @see {@link https://graphviz.org/docs/attrs/showboxes/ Node, Edge and Graph Attributes#showboxes}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 0
         * @graphvizMinimum 0
         * @graphvizNotes dot only
         * @graphvizUsedBy ENG
         * @category Attribute
         */
        showboxes: 'showboxes';
        /**
         * Number of sides if {@link shape}=polygon.
         *
         * @see {@link https://graphviz.org/docs/attrs/sides/ Node, Edge and Graph Attributes#sides}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 4
         * @graphvizMinimum 0
         * @graphvizUsedBy N
         * @category Attribute
         */
        sides: 'sides';
        /**
         * Maximum width and height of drawing, in inches.
         * If only a single number is given, this is used for both the width and the height.
         *
         * If defined and the drawing is larger than the given size, the drawing is uniformly scaled down so that it fits within the given size.
         *
         * If size ends in an exclamation point (!), then it is taken to be the desired size. In this case, if both dimensions of the drawing are less than size, the drawing is scaled up uniformly until at least one dimension equals its dimension in size.
         *
         * Note that there is some interaction between the **size** and {@link ratio} attributes.
         *
         * @see {@link https://graphviz.org/docs/attrs/size/ Node, Edge and Graph Attributes#size}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}/{@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizUsedBy G
         * @category Attribute
         */
        size: 'size';
        /**
         * Skew factor for {@link shape}=polygon. Positive values skew top of polygon to right; negative to left.
         *
         * @see {@link https://graphviz.org/docs/attrs/skew/ Node, Edge and Graph Attributes#skew}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0
         * @graphvizMinimum -100
         * @graphvizUsedBy N
         * @category Attribute
         */
        skew: 'skew';
        /**
         * Specifies a post-processing step used to smooth out an uneven distribution of nodes.
         *
         * @see {@link https://graphviz.org/docs/attrs/smoothing/ Node, Edge and Graph Attributes#smoothing}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:smoothType smoothType}
         * @graphvizDefault "none"
         * @graphvizNotes sfdp only
         * @graphvizUsedBy G
         * @category Attribute
         */
        smoothing: 'smoothing';
        /**
         * If {@link packmode} indicates an array packing, this attribute specifies an insertion order among the components,
         * with smaller values inserted first.
         *
         * @see {@link https://graphviz.org/docs/attrs/sortv/ Node, Edge and Graph Attributes#sortv}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}
         * @graphvizDefault 0
         * @graphvizMinimum 0
         * @graphvizUsedBy GCN
         * @category Attribute
         */
        sortv: 'sortv';
        /**
         * Controls how, and if, edges are represented.
         * If true, edges are drawn as splines routed around nodes; if false, edges are drawn as line segments.
         * If set to none or "", no edges are drawn at all.
         *
         * (1 March 2007) The values line and spline can be used as synonyms for false and true, respectively. In addition, the value polyline specifies that edges should be drawn as polylines.
         *
         * (28 Sep 2010) The value ortho specifies edges should be routed as polylines of axis-aligned segments. Currently, the routing does not handle ports or, in dot, edge labels.
         *
         * (25 Sep 2012) The value curved specifies edges should be drawn as curved arcs.
         *
         * |                                                                                    |                                                                                |
         * |------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
         * | ![spline_none](https://graphviz.org/_pages/doc/info/spline_none.png)               | ![spline_line](https://graphviz.org/_pages/doc/info/spline_line.png)     |
         * | `splines=none`                                                                     | `splines=line`                                                                 |
         * | `splines=""`                                                                       | `splines=false`                                                                |
         * | ![spline_polyline](https://graphviz.org/_pages/doc/info/spline_polyline.png)       | ![spline_curved](https://graphviz.org/_pages/doc/info/spline_curved.png) |
         * | `splines=polyline`                                                                 | `splines=curved`                                                               |
         * | ![spline_ortho](https://graphviz.org/_pages/doc/info/spline_ortho.png)             | ![spline_spline](https://graphviz.org/_pages/doc/info/spline_spline.png) |
         * | `splines=ortho`                                                                    | `splines=spline`                                                               |
         * |                                                                                    | `splines=true`                                                                 |
         *
         * By default, the attribute is unset. How this is interpreted depends on the layout. For dot,
         * the default is to draw edges as splines. For all other layouts,
         * the default is to draw edges as line segments.
         * Note that for these latter layouts, if splines="true", this requires non-overlapping nodes (cf. {@link overlap}). If fdp is used for layout and splines="compound",
         * then the edges are drawn to avoid clusters as well as nodes.
         *
         * @see {@link https://graphviz.org/docs/attrs/splines/ Node, Edge and Graph Attributes#splines}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}/string
         * @graphvizUsedBy G
         * @category Attribute
         */
        splines: 'splines';
        /**
         * Parameter used to determine the initial layout of nodes.
         * If unset, the nodes are randomly placed in a unit square with the same seed is always used for the random number generator, so the initial placement is repeatable.
         *
         * @see {@link https://graphviz.org/docs/attrs/start/ Node, Edge and Graph Attributes#start}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:startType startType}
         * @graphvizDefault ""
         * @graphvizNotes fdp, neato only
         * @graphvizUsedBy G
         * @category Attribute
         */
        start: 'start';
        /**
         * Set style information for components of the graph.
         * For cluster subgraphs, if style="filled", the cluster box's background is filled.
         *
         * If the default style attribute has been set for a component, an individual component can use style="" to revert to the normal default.
         * For example, if the graph has
         *
         * ```
         * edge [style="invis"]
         * ```
         *
         * making all edges invisible, a specific edge can overrride this via:
         *
         * ```
         * a -> b [style=""]
         * ```
         *
         * Of course, the component can also explicitly set its style attribute to the desired value.
         *
         * @see {@link https://graphviz.org/docs/attrs/style/ Node, Edge and Graph Attributes#style}
         * @graphvizType {@link https://graphviz.org/_pages/doc/info/attrs.html#k:style style}
         * @graphvizDefault ""
         * @graphvizUsedBy ENCG
         * @category Attribute
         */
        style: 'style';
        /**
         * A URL or pathname specifying an XML style sheet, used in SVG output.
         *
         * @see {@link https://graphviz.org/docs/attrs/stylesheet/ Node, Edge and Graph Attributes#stylesheet}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizDefault ""
         * @graphvizNotes svg only
         * @graphvizUsedBy G
         * @category Attribute
         */
        stylesheet: 'stylesheet';
        /**
         * If **tailURL** is defined, it is output as part of the tail label of the edge.
         * Also, this value is used near the tail node, overriding any {@link URL} value.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/tailURL/ Node, Edge and Graph Attributes#tailURL}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        tailURL: 'tailURL';
        /**
         * Position of an edge's tail label, {@link https://graphviz.org/doc/info/attrs.html in points}.
         * The position indicates the center of the label.
         *
         * @see {@link https://graphviz.org/docs/attrs/tail_lp/ Node, Edge and Graph Attributes#tail_lp}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizNotes write only
         * @graphvizUsedBy E
         * @category Attribute
         */
        tail_lp: 'tail_lp';
        /**
         * If true, the tail of an edge is clipped to the boundary of the tail node; otherwise,
         * the end of the edge goes to the center of the node, or the center of a port, if applicable.
         *
         * @see {@link https://graphviz.org/docs/attrs/tailclip/ Node, Edge and Graph Attributes#tailclip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizDefault TRUE
         * @graphvizUsedBy E
         * @category Attribute
         */
        tailclip: 'tailclip';
        /**
         * Synonym for {@link tailURL}.
         *
         * @see {@link https://graphviz.org/docs/attrs/tailhref/ Node, Edge and Graph Attributes#tailhref}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        tailhref: 'tailhref';
        /**
         * Text label to be placed near tail of edge.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/taillabel/ Node, Edge and Graph Attributes#taillabel}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/lblString/ lblString}
         * @graphvizDefault ""
         * @graphvizUsedBy E
         * @category Attribute
         */
        taillabel: 'taillabel';
        /**
         * Indicates where on the tail node to attach the tail of the edge.
         * See {@link https://graphviz.org/doc/info/attrs.html#undir_note limitation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/tailport/ Node, Edge and Graph Attributes#tailport}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/portPos/ portPos}
         * @graphvizDefault center
         * @graphvizUsedBy E
         * @category Attribute
         */
        tailport: 'tailport';
        /**
         * If the edge has a {@link tailURL}, this attribute determines which window of the browser is used for the URL.
         * Setting it to "_graphviz" will open a new window if it doesn't already exist, or reuse it if it does.
         * If undefined, the value of the {@link target} is used.
         *
         * @see {@link https://graphviz.org/docs/attrs/tailtarget/ Node, Edge and Graph Attributes#tailtarget}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault <none>
         * @graphvizNotes svg, map only
         * @graphvizUsedBy E
         * @category Attribute
         */
        tailtarget: 'tailtarget';
        /**
         * Tooltip annotation attached to the tail of an edge.
         * This is used only if the edge has a {@link tailURL} attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/tailtooltip/ Node, Edge and Graph Attributes#tailtooltip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, cmap only
         * @graphvizUsedBy E
         * @category Attribute
         */
        tailtooltip: 'tailtooltip';
        /**
         * If the object has a URL, this attribute determines which window of the browser is used for the URL.
         * See {@link http://www.w3.org/TR/html401/present/frames.html#adef-target W3C documentation}.
         *
         * @see {@link https://graphviz.org/docs/attrs/target/ Node, Edge and Graph Attributes#target}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}/string
         * @graphvizDefault <none>
         * @graphvizNotes svg, map only
         * @graphvizUsedBy ENGC
         * @category Attribute
         */
        target: 'target';
        /**
         * Tooltip annotation attached to the node or edge.
         * If unset, Graphviz will use the object's {@link label} if defined.
         * Note that if the label is a record specification or an HTML-like label, the resulting tooltip may be unhelpful.
         * In this case, if tooltips will be generated, the user should set a tooltip attribute explicitly.
         *
         * @see {@link https://graphviz.org/docs/attrs/tooltip/ Node, Edge and Graph Attributes#tooltip}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/escString/ escString}
         * @graphvizDefault ""
         * @graphvizNotes svg, cmap only
         * @graphvizUsedBy NEC
         * @category Attribute
         */
        tooltip: 'tooltip';
        /**
         * If set explicitly to true or false, the value determines whether or not internal bitmap rendering relies on a truecolor color model or uses a color palette.
         * If the attribute is unset, truecolor is not used unless there is a {@link shapefile} property for some node in the graph.
         * The output model will use the input model when possible.
         *
         * Use of color palettes results in less memory usage during creation of the bitmaps and smaller output files.
         *
         * Usually, the only time it is necessary to specify the truecolor model is if the graph uses more than 256 colors.
         * However, if one uses bgcolor=transparent with a color palette, font antialiasing can show up as a fuzzy white area around characters.
         * Using **truecolor**=true avoids this problem.
         *
         * @see {@link https://graphviz.org/docs/attrs/truecolor/ Node, Edge and Graph Attributes#truecolor}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/bool bool}
         * @graphvizNotes bitmap output only
         * @graphvizUsedBy G
         * @category Attribute
         */
        truecolor: 'truecolor';
        /**
         * If the input graph defines this attribute, the node is polygonal, and output is dot or xdot, this attribute provides the coordinates of the vertices of the node's polygon, in inches.
         * If the node is an ellipse or circle, the {@link samplepoints} attribute affects the output.
         *
         * @see {@link https://graphviz.org/docs/attrs/vertices/ Node, Edge and Graph Attributes#vertices}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/pointList pointList}
         * @graphvizNotes write only
         * @graphvizUsedBy N
         * @category Attribute
         */
        vertices: 'vertices';
        /**
         * Clipping window on final drawing.
         * Note that this attribute supersedes any {@link size} attribute.
         * The width and height of the viewport specify precisely the final size of the output.
         *
         * @see {@link https://graphviz.org/docs/attrs/viewport/ Node, Edge and Graph Attributes#viewport}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/viewPort/ viewPort}
         * @graphvizDefault ""
         * @graphvizUsedBy G
         * @category Attribute
         */
        viewport: 'viewport';
        /**
         * Factor to scale up drawing to allow margin for expansion in Voronoi technique.
         * dim' = (1+2*margin)*dim.
         *
         * @see {@link https://graphviz.org/docs/attrs/voro_margin/ Node, Edge and Graph Attributes#voro_margin}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0.05
         * @graphvizMinimum 0
         * @graphvizNotes not dot
         * @graphvizUsedBy G
         * @category Attribute
         */
        voro_margin: 'voro_margin';
        /**
         * Weight of edge.
         * In dot, the heavier the weight, the shorter, straighter and more vertical the edge is. **N.B.** Weights in dot must be integers.
         * For twopi, a weight of 0 indicates the edge should not be used in constructing a spanning tree from the root.
         * For other layouts, a larger weight encourages the layout to make the edge length closer to that specified by the len attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/weight/ Node, Edge and Graph Attributes#weight}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/int/ int}/{@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 1
         * @graphvizMinimum
         * 0(dot,twopi)
         * 1(neato,fdp)
         * @graphvizUsedBy E
         * @category Attribute
         */
        weight: 'weight';
        /**
         * Width of node, in inches.
         * This is taken as the initial, minimum width of the node.
         * If {@link fixedsize} is true, this will be the final width of the node.
         * Otherwise, if the node label requires more width to fit, the node's width will be increased to contain the label.
         * Note also that, if the output format is dot, the value given to width will be the final value.
         *
         * @see {@link https://graphviz.org/docs/attrs/width/ Node, Edge and Graph Attributes#width}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0.75
         * @graphvizMinimum 0.01
         * @graphvizUsedBy N
         * @category Attribute
         */
        width: 'width';
        /**
         * For xdot output, if this attribute is set, this determines the version of xdot used in output.
         * If not set, the attribute will be set to the xdot version used for output.
         *
         * @see {@link https://graphviz.org/docs/attrs/xdotversion/ Node, Edge and Graph Attributes#xdotversion}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/string/ string}
         * @graphvizNotes xdot only
         * @graphvizUsedBy G
         * @category Attribute
         */
        xdotversion: 'xdotversion';
        /**
         * External label for a node or edge.
         * For nodes, the label will be placed outside of the node but near it.
         * For edges, the label will be placed near the center of the edge.
         * This can be useful in dot to avoid the occasional problem when the use of edge labels distorts the layout.
         * For other layouts, the xlabel attribute can be viewed as a synonym for the {@link label} attribute.
         *
         * These labels are added after all nodes and edges have been placed.
         * The labels will be placed so that they do not overlap any node or label.
         * This means it may not be possible to place all of them.
         * To force placing all of them, use the {@link forcelabels} attribute.
         *
         * @see {@link https://graphviz.org/docs/attrs/xlabel/ Node, Edge and Graph Attributes#xlabel}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/lblString/ lblString}
         * @graphvizDefault ""
         * @graphvizUsedBy EN
         * @category Attribute
         */
        xlabel: 'xlabel';
        /**
         * Position of an exterior label, {@link https://graphviz.org/doc/info/attrs.html in points}.
         * The position indicates the center of the label.
         *
         * @see {@link https://graphviz.org/docs/attrs/xlp/ Node, Edge and Graph Attributes#xlp}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/point/ point}
         * @graphvizNotes write only
         * @graphvizUsedBy NE
         * @category Attribute
         */
        xlp: 'xlp';
        /**
         * Deprecated:Use {@link pos} attribute, along with {@link dimen} and/or {@link dim} to specify dimensions.
         *
         * Provides z coordinate value for 3D layouts and displays.
         * If the graph has {@link dim} set to 3 (or more), neato will use a node's **z** value for the z coordinate of its initial position if its {@link pos} attribute is also defined.
         *
         * Even if no **z** values are specified in the input, it is necessary to declare a **z** attribute for nodes, e.g,
         * using node[z=""] in order to get z values on output.
         * Thus, setting dim=3 but not declaring **z** will cause neato -Tvrml to layout the graph in 3D but project the layout onto the xy-plane for the rendering.
         * If the **z** attribute is declared, the final rendering will be in 3D.
         *
         *
         * @see {@link https://graphviz.org/docs/attrs/z/ Node, Edge and Graph Attributes#z}
         * @graphvizType {@link https://graphviz.org/docs/attr-types/double/ double}
         * @graphvizDefault 0
         * @graphvizMinimum
         * -MAXFLOAT
         * -1000
         * @graphvizUsedBy N
         * @deprecated
         * @category Attribute
         */
        z: 'z';
    }
    /**
     * $types is an interface that defines a set of attributes that can be used to configure a graph.
     */
    export interface $types {
        _background: string;
        area: Double;
        arrowhead: ArrowType;
        arrowsize: Double;
        arrowtail: ArrowType;
        bb: Rect;
        bgcolor: Color | ColorList;
        TBbalance: TBbalanceType;
        center: boolean;
        charset: string;
        class: string;
        clusterrank: ClusterMode;
        color: Color | ColorList;
        colorscheme: string;
        comment: string;
        compound: boolean;
        concentrate: boolean;
        constraint: boolean;
        Damping: Double;
        decorate: boolean;
        defaultdist: Double;
        dim: Int;
        dimen: Int;
        dir: DirType;
        diredgeconstraints: string | boolean;
        distortion: Double;
        dpi: Double;
        edgehref: EscString;
        edgetarget: EscString;
        edgetooltip: EscString;
        edgeURL: EscString;
        epsilon: Double;
        esep: AddDouble | AddPoint;
        fillcolor: Color | ColorList;
        fixedsize: boolean | string;
        fontcolor: Color;
        fontname: string;
        fontnames: string;
        fontpath: string;
        fontsize: Double;
        forcelabels: boolean;
        gradientangle: Blank | Int;
        group: string;
        head_lp: Point;
        headclip: boolean;
        headhref: EscString;
        headlabel: LblString;
        headport: PortPos;
        headtarget: EscString;
        headtooltip: EscString;
        headURL: EscString;
        height: Blank | Double;
        href: EscString;
        id: EscString;
        image: string;
        imagepath: string;
        imagepos: string;
        imagescale: string | boolean;
        inputscale: Double;
        K: Double;
        label: LblString;
        label_scheme: Int;
        labelangle: Double;
        labeldistance: Double;
        labelfloat: boolean;
        labelfontcolor: Color;
        labelfontname: string;
        labelfontsize: Double;
        labelhref: EscString;
        labeljust: string;
        labelloc: string;
        labeltarget: EscString;
        labeltooltip: EscString;
        labelURL: EscString;
        landscape: boolean;
        layer: LayerRange;
        layerlistsep: string;
        layers: LayerList;
        layerselect: LayerRange;
        layersep: string;
        layout: string;
        len: Double;
        levels: Int;
        levelsgap: Double;
        lhead: string;
        lheight: Double;
        lp: Point;
        ltail: string;
        lwidth: Double;
        margin: Double | Point;
        maxiter: Int;
        mclimit: Double;
        mindist: Double;
        minlen: Int;
        mode: string;
        model: string;
        mosek: boolean;
        newrank: boolean;
        nodesep: Double;
        nojustify: boolean;
        normalize: Double | boolean;
        notranslate: boolean;
        nslimit: Double;
        nslimit1: Double;
        ordering: string;
        orientation: string | Double;
        outputorder: OutputMode;
        overlap: string | boolean;
        overlap_scaling: Double;
        overlap_shrink: boolean;
        pack: boolean | Int;
        packmode: PackMode;
        pad: Double | Point;
        page: Double | Point;
        pagedir: Pagedir;
        pencolor: Color;
        penwidth: Double;
        peripheries: Int;
        pin: boolean;
        pos: Point | SplineType;
        quadtree: QuadType | boolean;
        quantum: Double;
        rank: RankType;
        rankdir: Rankdir;
        ranksep: Double | DoubleList;
        ratio: Double | string;
        rects: Rect;
        regular: boolean;
        remincross: boolean;
        repulsiveforce: Double;
        resolution: Double;
        root: string | boolean;
        rotate: Int;
        rotation: Double;
        samehead: string;
        sametail: string;
        samplepoints: Int;
        scale: Double | Point;
        searchsize: Int;
        sep: AddDouble | AddPoint;
        shape: Shape;
        shapefile: string;
        showboxes: Int;
        sides: Int;
        size: Double | Point;
        skew: Double;
        smoothing: SmoothType;
        sortv: Int;
        splines: boolean | string;
        start: Blank | StartType;
        style: Blank | Style;
        stylesheet: string;
        tail_lp: string;
        tailclip: Point;
        tailhref: EscString;
        taillabel: LblString;
        tailport: PortPos;
        tailtarget: EscString;
        tailtooltip: EscString;
        tailURL: EscString;
        target: EscString | string;
        tooltip: EscString;
        truecolor: boolean;
        URL: EscString;
        vertices: PointList;
        viewport: Blank | ViewPort;
        voro_margin: Double;
        weight: Int | Double;
        width: Double;
        xdotversion: string;
        xlabel: LblString;
        xlp: Point;
        z: Blank | Double;
    }
}

/**
 * Attribute types.
 * @group Attribute
 */
export declare type AttributeKey = NodeAttributeKey | EdgeAttributeKey | GraphAttributeKey | SubgraphAttributeKey | ClusterSubgraphAttributeKey;

/**
 * @group Models
 */
export declare type AttributeListKind = 'Graph' | 'Edge' | 'Node';

/**
 * A list object of attributes commonly specified for nodes, subgraphs, and edges
 * under graph and subgraph.
 *
 * @typeParam K - The type of object is being specified.
 * @typeParam T - The attribute keys to set DOT object.
 * @group Models
 */
export declare interface AttributeListModel<K extends AttributeListKind = AttributeListKind, T extends AttributeKey = AttributeKey> extends Attributes<T>, HasComment, DotObjectModel<'AttributeList'> {
    $$kind: K;
}

/**
 * DOT object with the property
 * that attributes can be held as a set of keys and values.
 *
 * @typeParam T - The attribute keys to set DOT object.
 * @group Models
 */
export declare interface Attributes<T extends AttributeKey> {
    /** Size of the set of keys and values held by the DOT object. */
    readonly size: number;
    /** The key/value tuples of the object attributes. */
    readonly values: ReadonlyArray<[T, Attribute<T>]>;
    /**
     * Get the value of an attribute by a DOT object by specifying its key.
     *
     * If the value corresponding to the key does not exist, undefined is returned.
     */
    get<K extends T>(key: K): Attribute<K> | undefined;
    /** Set a value, by specifying the key of the attributes in the DOT object. */
    set<K extends T>(key: K, value: Attribute<K>): void;
    /**
     * Apply keys and values that can be specified for DOT objects collectively.
     *
     * @param attributes - An array of objects or tuples of attribute key/value pairs.
     */
    apply(attributes: AttributesObject<T> | AttributesEntities<T>): void;
    /** Delete the value of an attribute from a DOT object by specifying a key. */
    delete(key: T): void;
    /** Delete all attributes specified for the DOT object. */
    clear(): void;
}

/**
 * An array of attribute key/value tuple.
 * @group Models
 */
export declare type AttributesEntities<T extends AttributeKey> = readonly [
T,
Attribute<T>
][];

/**
 * @group Models
 */
export declare interface AttributesGroupModel<T extends AttributeKey> extends Attributes<T>, HasComment {
}

/**
 * An objects of attribute key/value pairs.
 * @group Models
 */
export declare type AttributesObject<T extends AttributeKey> = {
    [K in T]?: Attribute<K>;
};

/**
 * @group Models
 */
export declare type AttributeValue = Attribute<AttributeKey>;

/**
 * A value specifying an empty string for resetting some values.
 * @group Attribute Types
 */
export declare type Blank = '';

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/clusterMode/ clusterMode}
 * @group Attribute Types
 */
export declare type ClusterMode = ClusterMode.values;

export declare namespace ClusterMode {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'local' | 'global' | 'none'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Attribute types available for cluster subgraph.
 * @group Attribute
 */
export declare type ClusterSubgraphAttributeKey = ClusterSubgraphAttributeKey.values;

/** @hidden */
export declare namespace ClusterSubgraphAttributeKey {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'K' | 'URL' | 'area' | 'bgcolor' | 'color' | 'colorscheme' | 'fillcolor' | 'fontcolor' | 'fontname' | 'fontsize' | 'gradientangle' | 'href' | 'id' | 'label' | 'labeljust' | 'labelloc' | 'layer' | 'lheight' | 'lp' | 'lwidth' | 'margin' | 'nojustify' | 'pencolor' | 'penwidth' | 'peripheries' | 'sortv' | 'style' | 'target' | 'tooltip' | 'class'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/color/ color}
 * @group Attribute Types
 */
export declare type Color = Color.RGB_RGBA | Color.HSV | Color.ColorName | number;

/** @hidden */
export declare namespace Color {
    /**
     * `"#%2x%2x%2x"` Red-Green-Blue (RGB)
     *
     * `"#%2x%2x%2x%2x"` Red-Green-Blue-Alpha (RGBA)
     * @note A type that is too complicated to express in TypeScript.
     */
    export type RGB_RGBA = `#${string}`;
    /**
     * Hue-Saturation-Value (HSV) 0.0 <= H,S,V <= 1.0
     */
    export type HSV = `${number}+${number}+${number}`;
    /**
     * Color names are resolved in the context of a color scheme.
     *
     * Graphviz currently supports the X11 scheme, the SVG scheme, and the Brewer schemes, with X11 being the default.
     * @see {@link https://graphviz.org/doc/info/colors.html Color Names}
     */
    export type ColorName = Exclude<keyof $colors, keyof $exclude>;
    export interface $colors extends $keywords<'aliceblue' | 'antiquewhite' | 'antiquewhite1' | 'antiquewhite2' | 'antiquewhite3' | 'antiquewhite4' | 'aqua' | 'aquamarine' | 'aquamarine1' | 'aquamarine2' | 'aquamarine3' | 'aquamarine4' | 'azure' | 'azure1' | 'azure2' | 'azure3' | 'azure4' | 'beige' | 'bisque' | 'bisque1' | 'bisque2' | 'bisque3' | 'bisque4' | 'black' | 'blanchedalmond' | 'blue' | 'blue1' | 'blue2' | 'blue3' | 'blue4' | 'blueviolet' | 'brown' | 'brown1' | 'brown2' | 'brown3' | 'brown4' | 'burlywood' | 'burlywood1' | 'burlywood2' | 'burlywood3' | 'burlywood4' | 'cadetblue' | 'cadetblue1' | 'cadetblue2' | 'cadetblue3' | 'cadetblue4' | 'chartreuse' | 'chartreuse1' | 'chartreuse2' | 'chartreuse3' | 'chartreuse4' | 'chocolate' | 'chocolate1' | 'chocolate2' | 'chocolate3' | 'chocolate4' | 'coral' | 'coral1' | 'coral2' | 'coral3' | 'coral4' | 'cornflowerblue' | 'cornsilk' | 'cornsilk1' | 'cornsilk2' | 'cornsilk3' | 'cornsilk4' | 'crimson' | 'cyan' | 'cyan1' | 'cyan2' | 'cyan3' | 'cyan4' | 'darkblue' | 'darkcyan' | 'darkgoldenrod' | 'darkgoldenrod1' | 'darkgoldenrod2' | 'darkgoldenrod3' | 'darkgoldenrod4' | 'darkgray' | 'darkgreen' | 'darkgrey' | 'darkkhaki' | 'darkmagenta' | 'darkolivegreen' | 'darkolivegreen1' | 'darkolivegreen2' | 'darkolivegreen3' | 'darkolivegreen4' | 'darkorange' | 'darkorange1' | 'darkorange2' | 'darkorange3' | 'darkorange4' | 'darkorchid' | 'darkorchid1' | 'darkorchid2' | 'darkorchid3' | 'darkorchid4' | 'darkred' | 'darksalmon' | 'darkseagreen' | 'darkseagreen1' | 'darkseagreen2' | 'darkseagreen3' | 'darkseagreen4' | 'darkslateblue' | 'darkslategray' | 'darkslategray1' | 'darkslategray2' | 'darkslategray3' | 'darkslategray4' | 'darkslategrey' | 'darkturquoise' | 'darkviolet' | 'deeppink' | 'deeppink1' | 'deeppink2' | 'deeppink3' | 'deeppink4' | 'deepskyblue' | 'deepskyblue1' | 'deepskyblue2' | 'deepskyblue3' | 'deepskyblue4' | 'dimgray' | 'dimgrey' | 'dodgerblue' | 'dodgerblue1' | 'dodgerblue2' | 'dodgerblue3' | 'dodgerblue4' | 'firebrick' | 'firebrick1' | 'firebrick2' | 'firebrick3' | 'firebrick4' | 'floralwhite' | 'forestgreen' | 'fuchsia' | 'gainsboro' | 'ghostwhite' | 'gold' | 'gold1' | 'gold2' | 'gold3' | 'gold4' | 'goldenrod' | 'goldenrod1' | 'goldenrod2' | 'goldenrod3' | 'goldenrod4' | 'gray' | 'gray0' | 'gray1' | 'gray10' | 'gray100' | 'gray11' | 'gray12' | 'gray13' | 'gray14' | 'gray15' | 'gray16' | 'gray17' | 'gray18' | 'gray19' | 'gray2' | 'gray20' | 'gray21' | 'gray22' | 'gray23' | 'gray24' | 'gray25' | 'gray26' | 'gray27' | 'gray28' | 'gray29' | 'gray3' | 'gray30' | 'gray31' | 'gray32' | 'gray33' | 'gray34' | 'gray35' | 'gray36' | 'gray37' | 'gray38' | 'gray39' | 'gray4' | 'gray40' | 'gray41' | 'gray42' | 'gray43' | 'gray44' | 'gray45' | 'gray46' | 'gray47' | 'gray48' | 'gray49' | 'gray5' | 'gray50' | 'gray51' | 'gray52' | 'gray53' | 'gray54' | 'gray55' | 'gray56' | 'gray57' | 'gray58' | 'gray59' | 'gray6' | 'gray60' | 'gray61' | 'gray62' | 'gray63' | 'gray64' | 'gray65' | 'gray66' | 'gray67' | 'gray68' | 'gray69' | 'gray7' | 'gray70' | 'gray71' | 'gray72' | 'gray73' | 'gray74' | 'gray75' | 'gray76' | 'gray77' | 'gray78' | 'gray79' | 'gray8' | 'gray80' | 'gray81' | 'gray82' | 'gray83' | 'gray84' | 'gray85' | 'gray86' | 'gray87' | 'gray88' | 'gray89' | 'gray9' | 'gray90' | 'gray91' | 'gray92' | 'gray93' | 'gray94' | 'gray95' | 'gray96' | 'gray97' | 'gray98' | 'gray99' | 'green' | 'green1' | 'green2' | 'green3' | 'green4' | 'greenyellow' | 'grey' | 'grey0' | 'grey1' | 'grey10' | 'grey100' | 'grey11' | 'grey12' | 'grey13' | 'grey14' | 'grey15' | 'grey16' | 'grey17' | 'grey18' | 'grey19' | 'grey2' | 'grey20' | 'grey21' | 'grey22' | 'grey23' | 'grey24' | 'grey25' | 'grey26' | 'grey27' | 'grey28' | 'grey29' | 'grey3' | 'grey30' | 'grey31' | 'grey32' | 'grey33' | 'grey34' | 'grey35' | 'grey36' | 'grey37' | 'grey38' | 'grey39' | 'grey4' | 'grey40' | 'grey41' | 'grey42' | 'grey43' | 'grey44' | 'grey45' | 'grey46' | 'grey47' | 'grey48' | 'grey49' | 'grey5' | 'grey50' | 'grey51' | 'grey52' | 'grey53' | 'grey54' | 'grey55' | 'grey56' | 'grey57' | 'grey58' | 'grey59' | 'grey6' | 'grey60' | 'grey61' | 'grey62' | 'grey63' | 'grey64' | 'grey65' | 'grey66' | 'grey67' | 'grey68' | 'grey69' | 'grey7' | 'grey70' | 'grey71' | 'grey72' | 'grey73' | 'grey74' | 'grey75' | 'grey76' | 'grey77' | 'grey78' | 'grey79' | 'grey8' | 'grey80' | 'grey81' | 'grey82' | 'grey83' | 'grey84' | 'grey85' | 'grey86' | 'grey87' | 'grey88' | 'grey89' | 'grey9' | 'grey90' | 'grey91' | 'grey92' | 'grey93' | 'grey94' | 'grey95' | 'grey96' | 'grey97' | 'grey98' | 'grey99' | 'honeydew' | 'honeydew1' | 'honeydew2' | 'honeydew3' | 'honeydew4' | 'hotpink' | 'hotpink1' | 'hotpink2' | 'hotpink3' | 'hotpink4' | 'indianred' | 'indianred1' | 'indianred2' | 'indianred3' | 'indianred4' | 'indigo' | 'invis' | 'ivory' | 'ivory1' | 'ivory2' | 'ivory3' | 'ivory4' | 'khaki' | 'khaki1' | 'khaki2' | 'khaki3' | 'khaki4' | 'lavender' | 'lavenderblush' | 'lavenderblush1' | 'lavenderblush2' | 'lavenderblush3' | 'lavenderblush4' | 'lawngreen' | 'lemonchiffon' | 'lemonchiffon1' | 'lemonchiffon2' | 'lemonchiffon3' | 'lemonchiffon4' | 'lightblue' | 'lightblue1' | 'lightblue2' | 'lightblue3' | 'lightblue4' | 'lightcoral' | 'lightcyan' | 'lightcyan1' | 'lightcyan2' | 'lightcyan3' | 'lightcyan4' | 'lightgoldenrod' | 'lightgoldenrod1' | 'lightgoldenrod2' | 'lightgoldenrod3' | 'lightgoldenrod4' | 'lightgoldenrodyellow' | 'lightgray' | 'lightgreen' | 'lightgrey' | 'lightpink' | 'lightpink1' | 'lightpink2' | 'lightpink3' | 'lightpink4' | 'lightsalmon' | 'lightsalmon1' | 'lightsalmon2' | 'lightsalmon3' | 'lightsalmon4' | 'lightseagreen' | 'lightskyblue' | 'lightskyblue1' | 'lightskyblue2' | 'lightskyblue3' | 'lightskyblue4' | 'lightslateblue' | 'lightslategray' | 'lightslategrey' | 'lightsteelblue' | 'lightsteelblue1' | 'lightsteelblue2' | 'lightsteelblue3' | 'lightsteelblue4' | 'lightyellow' | 'lightyellow1' | 'lightyellow2' | 'lightyellow3' | 'lightyellow4' | 'lime' | 'limegreen' | 'linen' | 'magenta' | 'magenta1' | 'magenta2' | 'magenta3' | 'magenta4' | 'maroon' | 'maroon1' | 'maroon2' | 'maroon3' | 'maroon4' | 'mediumaquamarine' | 'mediumblue' | 'mediumorchid' | 'mediumorchid1' | 'mediumorchid2' | 'mediumorchid3' | 'mediumorchid4' | 'mediumpurple' | 'mediumpurple1' | 'mediumpurple2' | 'mediumpurple3' | 'mediumpurple4' | 'mediumseagreen' | 'mediumslateblue' | 'mediumspringgreen' | 'mediumturquoise' | 'mediumvioletred' | 'midnightblue' | 'mintcream' | 'mistyrose' | 'mistyrose1' | 'mistyrose2' | 'mistyrose3' | 'mistyrose4' | 'moccasin' | 'navajowhite' | 'navajowhite1' | 'navajowhite2' | 'navajowhite3' | 'navajowhite4' | 'navy' | 'navyblue' | 'none' | 'oldlace' | 'olive' | 'olivedrab' | 'olivedrab1' | 'olivedrab2' | 'olivedrab3' | 'olivedrab4' | 'orange' | 'orange1' | 'orange2' | 'orange3' | 'orange4' | 'orangered' | 'orangered1' | 'orangered2' | 'orangered3' | 'orangered4' | 'orchid' | 'orchid1' | 'orchid2' | 'orchid3' | 'orchid4' | 'palegoldenrod' | 'palegreen' | 'palegreen1' | 'palegreen2' | 'palegreen3' | 'palegreen4' | 'paleturquoise' | 'paleturquoise1' | 'paleturquoise2' | 'paleturquoise3' | 'paleturquoise4' | 'palevioletred' | 'palevioletred1' | 'palevioletred2' | 'palevioletred3' | 'palevioletred4' | 'papayawhip' | 'peachpuff' | 'peachpuff1' | 'peachpuff2' | 'peachpuff3' | 'peachpuff4' | 'peru' | 'pink' | 'pink1' | 'pink2' | 'pink3' | 'pink4' | 'plum' | 'plum1' | 'plum2' | 'plum3' | 'plum4' | 'powderblue' | 'purple' | 'purple1' | 'purple2' | 'purple3' | 'purple4' | 'rebeccapurple' | 'red' | 'red1' | 'red2' | 'red3' | 'red4' | 'rosybrown' | 'rosybrown1' | 'rosybrown2' | 'rosybrown3' | 'rosybrown4' | 'royalblue' | 'royalblue1' | 'royalblue2' | 'royalblue3' | 'royalblue4' | 'saddlebrown' | 'salmon' | 'salmon1' | 'salmon2' | 'salmon3' | 'salmon4' | 'sandybrown' | 'seagreen' | 'seagreen1' | 'seagreen2' | 'seagreen3' | 'seagreen4' | 'seashell' | 'seashell1' | 'seashell2' | 'seashell3' | 'seashell4' | 'sienna' | 'sienna1' | 'sienna2' | 'sienna3' | 'sienna4' | 'silver' | 'skyblue' | 'skyblue1' | 'skyblue2' | 'skyblue3' | 'skyblue4' | 'slateblue' | 'slateblue1' | 'slateblue2' | 'slateblue3' | 'slateblue4' | 'slategray' | 'slategray1' | 'slategray2' | 'slategray3' | 'slategray4' | 'slategrey' | 'snow' | 'snow1' | 'snow2' | 'snow3' | 'snow4' | 'springgreen' | 'springgreen1' | 'springgreen2' | 'springgreen3' | 'springgreen4' | 'steelblue' | 'steelblue1' | 'steelblue2' | 'steelblue3' | 'steelblue4' | 'tan' | 'tan1' | 'tan2' | 'tan3' | 'tan4' | 'teal' | 'thistle' | 'thistle1' | 'thistle2' | 'thistle3' | 'thistle4' | 'tomato' | 'tomato1' | 'tomato2' | 'tomato3' | 'tomato4' | 'transparent' | 'turquoise' | 'turquoise1' | 'turquoise2' | 'turquoise3' | 'turquoise4' | 'violet' | 'violetred' | 'violetred1' | 'violetred2' | 'violetred3' | 'violetred4' | 'webgray' | 'webgreen' | 'webgrey' | 'webmaroon' | 'webpurple' | 'wheat' | 'wheat1' | 'wheat2' | 'wheat3' | 'wheat4' | 'white' | 'whitesmoke' | 'x11gray' | 'x11green' | 'x11grey' | 'x11maroon' | 'x11purple' | 'yellow' | 'yellow1' | 'yellow2' | 'yellow3' | 'yellow4' | 'yellowgreen' | 'aliceblue' | 'antiquewhite' | 'aqua' | 'aquamarine' | 'azure' | 'beige' | 'bisque' | 'black' | 'blanchedalmond' | 'blue' | 'blueviolet' | 'brown' | 'burlywood' | 'cadetblue' | 'chartreuse' | 'chocolate' | 'coral' | 'cornflowerblue' | 'cornsilk' | 'crimson' | 'cyan' | 'darkblue' | 'darkcyan' | 'darkgoldenrod' | 'darkgray' | 'darkgreen' | 'darkgrey' | 'darkkhaki' | 'darkmagenta' | 'darkolivegreen' | 'darkorange' | 'darkorchid' | 'darkred' | 'darksalmon' | 'darkseagreen' | 'darkslateblue' | 'darkslategray' | 'darkslategrey' | 'darkturquoise' | 'darkviolet' | 'deeppink' | 'deepskyblue' | 'dimgray' | 'dimgrey' | 'dodgerblue' | 'firebrick' | 'floralwhite' | 'forestgreen' | 'fuchsia' | 'gainsboro' | 'ghostwhite' | 'gold' | 'goldenrod' | 'gray' | 'grey' | 'green' | 'greenyellow' | 'honeydew' | 'hotpink' | 'indianred' | 'indigo' | 'ivory' | 'khaki' | 'lavender' | 'lavenderblush' | 'lawngreen' | 'lemonchiffon' | 'lightblue' | 'lightcoral' | 'lightcyan' | 'lightgoldenrodyellow' | 'lightgray' | 'lightgreen' | 'lightgrey' | 'lightpink' | 'lightsalmon' | 'lightseagreen' | 'lightskyblue' | 'lightslategray' | 'lightslategrey' | 'lightsteelblue' | 'lightyellow' | 'lime' | 'limegreen' | 'linen' | 'magenta' | 'maroon' | 'mediumaquamarine' | 'mediumblue' | 'mediumorchid' | 'mediumpurple' | 'mediumseagreen' | 'mediumslateblue' | 'mediumspringgreen' | 'mediumturquoise' | 'mediumvioletred' | 'midnightblue' | 'mintcream' | 'mistyrose' | 'moccasin' | 'navajowhite' | 'navy' | 'oldlace' | 'olive' | 'olivedrab' | 'orange' | 'orangered' | 'orchid' | 'palegoldenrod' | 'palegreen' | 'paleturquoise' | 'palevioletred' | 'papayawhip' | 'peachpuff' | 'peru' | 'pink' | 'plum' | 'powderblue' | 'purple' | 'red' | 'rosybrown' | 'royalblue' | 'saddlebrown' | 'salmon' | 'sandybrown' | 'seagreen' | 'seashell' | 'sienna' | 'silver' | 'skyblue' | 'slateblue' | 'slategray' | 'slategrey' | 'snow' | 'springgreen' | 'steelblue' | 'tan' | 'teal' | 'thistle' | 'tomato' | 'turquoise' | 'violet' | 'wheat' | 'white' | 'whitesmoke' | 'yellow' | 'yellowgreen'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * A colon-separated list of weighted color values: WC(:WC)* where each WC has the form C(;F)? with C a color value and the optional F a floating-point number, 0 ≤ F ≤ 1.
 *
 * The sum of the floating-point numbers in a colorList must sum to at most 1.
 *
 * @note A type that is too complicated to express in TypeScript.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/colorList/}
 * @group Attribute Types
 */
export declare type ColorList = string;

/**
 * Directive indicating which direction the Edge should point.
 * @group Attribute Types
 */
export declare type Compass = Compass.values;

/** @hidden */
export declare namespace Compass {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'c' | '_'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * @group Models Context
 */
export declare function createModelsContext(models: Partial<ModelsContext>): ModelsContext;

/**
 * Direction Type
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/dirType/ dirType}
 * @group Attribute Types
 */
export declare type DirType = DirType.values;

/** @hidden */
export declare namespace DirType {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'forward' | 'back' | 'both' | 'none'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * DotObjectModel is an interface that defines a generic type for a {@link DotObjectType}.
 *
 * @template T The type of the {@link DotObjectType}.
 * @group Models
 */
export declare interface DotObjectModel<T extends DotObjectType = DotObjectType> {
    /**
     * The type of the DotObjectType.
     */
    $$type: T;
}

/**
 * @group Models
 */
export declare type DotObjectType = 'AttributeList' | 'Node' | 'Edge' | 'Subgraph' | 'Graph';

/**
 * Double-precision floating point number.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/double/ double}
 * @group Attribute Types
 */
export declare type Double = number;

/**
 * A colon-separated list of doubles: `"%f(:%f)*"` where each %f is a double.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/doubleList/ doubleList}
 * @group Attribute Types
 */
export declare type DoubleList = Double | `${Double}:${Double}` | `${Double}:${Double}:${Double}` | `${Double}:${Double}:${Double}:${Double}` | `${Double}:${Double}:${Double}:${Double}:${Double}` | `${Double}:${Double}:${Double}:${Double}:${Double}:${Double}` | `${Double}:${Double}:${Double}:${Double}:${Double}:${Double}:${Double}` | `${Double}:${Double}:${Double}:${Double}:${Double}:${Double}:${Double}:${Double}` | `${Double}:${Double}:${Double}:${Double}:${Double}:${Double}:${Double}:${Double}:${Double}`;

/**
 * Attribute types available for edges.
 * @group Attribute
 */
export declare type EdgeAttributeKey = EdgeAttributeKey.values;

/** @hidden */
export declare namespace EdgeAttributeKey {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'URL' | 'arrowhead' | 'arrowsize' | 'arrowtail' | 'color' | 'colorscheme' | 'comment' | 'constraint' | 'decorate' | 'dir' | 'edgeURL' | 'edgehref' | 'edgetarget' | 'edgetooltip' | 'fillcolor' | 'fontcolor' | 'fontname' | 'fontsize' | 'headURL' | 'head_lp' | 'headclip' | 'headhref' | 'headlabel' | 'headport' | 'headtarget' | 'headtooltip' | 'href' | 'id' | 'label' | 'labelURL' | 'labelangle' | 'labeldistance' | 'labelfloat' | 'labelfontcolor' | 'labelfontname' | 'labelfontsize' | 'labelhref' | 'labeltarget' | 'labeltooltip' | 'layer' | 'len' | 'lhead' | 'lp' | 'ltail' | 'minlen' | 'nojustify' | 'penwidth' | 'pos' | 'samehead' | 'sametail' | 'showboxes' | 'style' | 'tailURL' | 'tail_lp' | 'tailclip' | 'tailhref' | 'taillabel' | 'tailport' | 'tailtarget' | 'tailtooltip' | 'target' | 'tooltip' | 'weight' | 'xlabel' | 'xlp' | 'class'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Attribute object that can be set to Edge.
 * @group Models
 */
export declare type EdgeAttributesObject = AttributesObject<EdgeAttributeKey>;

/**
 * @group Models
 */
export declare interface EdgeConstructor {
    new (targets: EdgeTargetTuple, attributes?: EdgeAttributesObject): EdgeModel;
    new (...args: any[]): EdgeModel;
}

/**
 * Model that can be converted to Edge in DOT language.
 * @group Models
 */
export declare interface EdgeModel extends HasComment, HasAttributes<EdgeAttributeKey>, DotObjectModel<'Edge'> {
    readonly targets: EdgeTargetTuple;
}

/**
 * @group Models
 */
export declare type EdgeTarget = NodeRef | NodeRefGroup;

/**
 * @group Models
 */
export declare type EdgeTargetLike = NodeRefLike | NodeRefGroupLike;

/**
 * @group Models
 */
export declare type EdgeTargetLikeTuple = [
from: EdgeTargetLike,
to: EdgeTargetLike,
...rest: EdgeTargetLike[]
];

/**
 * @group Models
 */
export declare type EdgeTargetTuple = [
from: EdgeTarget,
to: EdgeTarget,
...rest: EdgeTarget[]
];

/**
 * String with Escape Sequences
 *
 * A string allowing escape sequences which are replaced according to the context.
 *
 * For node attributes, the substring `"\N"` is replaced by the name of the node,
 * and the substring `"\G"` by the name of the graph.
 *
 * For graph or cluster attributes, the substring `"\G"` is replaced by the name of the graph or cluster.
 *
 * For edge attributes, the substring `"\E"` is replaced by the name of the edge, the substring `"\G"` is replaced by the name of the graph or cluster,
 * and the substrings `"\T"` and `"\H"` by the names of the tail and head nodes,
 * respectively.
 *
 * The name of an edge is the string formed from the name of the tail node,
 * the appropriate edge operator (`"--"` or `"->"`) and the name of the head node.
 *
 * In all cases, the substring `"\L"` is replaced by the object's label attribute.
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/escString/ escString}
 * @group Attribute Types
 */
export declare type EscString = string;

/**
 * @group Models
 */
export declare interface ForwardRefNode extends Partial<Port> {
    readonly id: string;
}

/**
 * Attribute types available for graph.
 * @group Attribute
 */
export declare type GraphAttributeKey = GraphAttributeKey.values;

/** @hidden */
export declare namespace GraphAttributeKey {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'Damping' | 'K' | 'URL' | '_background' | 'bb' | 'bgcolor' | 'center' | 'charset' | 'clusterrank' | 'colorscheme' | 'comment' | 'compound' | 'concentrate' | 'defaultdist' | 'dim' | 'dimen' | 'diredgeconstraints' | 'dpi' | 'epsilon' | 'esep' | 'fontcolor' | 'fontname' | 'fontnames' | 'fontpath' | 'fontsize' | 'forcelabels' | 'gradientangle' | 'href' | 'id' | 'imagepath' | 'inputscale' | 'label' | 'label_scheme' | 'labeljust' | 'labelloc' | 'landscape' | 'layerlistsep' | 'layers' | 'layerselect' | 'layersep' | 'layout' | 'levels' | 'levelsgap' | 'lheight' | 'lp' | 'lwidth' | 'margin' | 'maxiter' | 'mclimit' | 'mindist' | 'mode' | 'model' | 'mosek' | 'newrank' | 'nodesep' | 'nojustify' | 'normalize' | 'notranslate' | 'nslimit' | 'nslimit1' | 'ordering' | 'orientation' | 'outputorder' | 'overlap' | 'overlap_scaling' | 'overlap_shrink' | 'pack' | 'packmode' | 'pad' | 'page' | 'pagedir' | 'quadtree' | 'quantum' | 'rankdir' | 'ranksep' | 'ratio' | 'remincross' | 'repulsiveforce' | 'resolution' | 'root' | 'rotate' | 'rotation' | 'scale' | 'searchsize' | 'sep' | 'showboxes' | 'size' | 'smoothing' | 'sortv' | 'splines' | 'start' | 'style' | 'stylesheet' | 'target' | 'truecolor' | 'viewport' | 'voro_margin' | 'xdotversion' | 'class' | 'TBbalance'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Attribute object that can be set to Graph.
 * @group Models
 */
export declare type GraphAttributesObject = AttributesObject<GraphAttributeKey>;

/**
 * DOT model representing a graph/digraph/subgraph.
 * @group Models
 */
export declare interface GraphBaseModel<T extends AttributeKey = AttributeKey> extends HasComment, Attributes<T> {
    readonly id?: string;
    readonly attributes: Readonly<GraphCommonAttributes>;
    /** Node objects in the graph. */
    readonly nodes: ReadonlyArray<NodeModel>;
    /** Edge objects in the graph. */
    readonly edges: ReadonlyArray<EdgeModel>;
    /** Subgraph objects in the graph. */
    readonly subgraphs: ReadonlyArray<SubgraphModel>;
    with(models: Partial<ModelsContext>): void;
    /**
     * Add a Node to the graph.
     */
    addNode(node: NodeModel): void;
    /**
     * Add Edge to the graph.
     */
    addEdge(edge: EdgeModel): void;
    /**
     * Add a Subgraph to the graph.
     */
    addSubgraph(subgraph: SubgraphModel): void;
    /**
     * Check if the Node exists in the graph.
     */
    existNode(nodeId: string): boolean;
    /**
     * Check if the Edge exists in the graph.
     */
    existEdge(edge: EdgeModel): boolean;
    /**
     * Check if the Subgraph exists in the graph.
     */
    existSubgraph(subgraph: SubgraphModel): boolean;
    /**
     * Remove Node from the graph.
     */
    removeNode(node: NodeModel | string): void;
    /**
     * Remove Edge from the graph.
     */
    removeEdge(edge: EdgeModel): void;
    /**
     * Remove Subgraph from the graph.
     */
    removeSubgraph(subgraph: SubgraphModel): void;
    /**
     * Create a Node in the graph.
     */
    createNode(id: string, attributes?: NodeAttributesObject): NodeModel;
    /**
     * Create a Subgraph and add it to the graph.
     *
     * @param id - Subgraph ID
     * @param attributes - Subgraph attribute object
     */
    createSubgraph(id?: string, attributes?: SubgraphAttributesObject): SubgraphModel;
    createSubgraph(attributes?: SubgraphAttributesObject): SubgraphModel;
    /**
     * Get Subgraph in cluster by specifying id.
     *
     * If there is no Subgraph with the specified id in the graph, return undefined.
     */
    getSubgraph(id: string): SubgraphModel | undefined;
    /**
     * Get Node in cluster by specifying id.
     *
     * @description
     * If there is no Node with the specified id in the graph, return undefined.
     */
    getNode(id: string): NodeModel | undefined;
    /** Create Edge and add it to the graph. */
    createEdge(targets: EdgeTargetLikeTuple, attributes?: EdgeAttributesObject): EdgeModel;
    /**
     * Create a subgraph by specifying its id (or get it if it already exists).
     *
     * By specifying a callback function, the target subgraph can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a cluster with id as A.
     *   g.subgraph('A', (A) => {
     *     // Create a node with id as A1 in cluster A.
     *     A.node('A1');
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   subgraph "A" {
     * //     "A1";
     * //   }
     * // }
     * ```
     *
     * @param id Subgraph ID.
     * @param callback Callbacks for manipulating created or retrieved subgraph.
     */
    subgraph(id: string, callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    /**
     * Create a subgraph (or get one if it already exists) and adapt the attributes.
     *
     * By specifying a callback function, the target subgraph can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a cluster with id as A and specifying its attributes.
     *   g.subgraph('A', { [attribute.color]: 'red', [attribute.label]: 'my label' }, (A) => {
     *     // Create a node with id as A1 in cluster A.
     *     A.node('A1');
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   subgraph "A" {
     * //     color = "red";
     * //     label = "my label";
     * //     "A1";
     * //   }
     * // }
     * ```
     *
     * @param id  Subgraph ID.
     * @param attributes Object of attributes to be adapted to the subgraph.
     * @param callback Callbacks for manipulating created or retrieved subgraph.
     */
    subgraph(id: string, attributes: SubgraphAttributesObject, callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    /**
     * Create anonymous subgraphs and and adapt the attributes.
     *
     * By specifying a callback function, the target subgraph can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a anonymous cluster and specifying its attributes.
     *   g.subgraph({ [attribute.color]: 'red', [attribute.label]: 'my label' }, (A) => {
     *     // Create a node with id as A1 in anonymous cluster.
     *     A.node('A1');
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   subgraph {
     * //     color = "red";
     * //     label = "my label";
     * //     "A1";
     * //   }
     * // }
     * ```
     *
     * @param attributes Object of attributes to be adapted to the subgraph.
     * @param callback Callbacks for manipulating created or retrieved subgraph.
     */
    subgraph(attributes: SubgraphAttributesObject, callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    /**
     * Create anonymous subgraphs and manipulate them with callback functions.
     *
     * By specifying a callback function, the target subgraph can be received and manipulated as an argument.
     *
     * @param callback Callbacks for manipulating created or retrieved subgraph.
     */
    subgraph(callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    /**
     * Create a node by specifying its id (or get it if it already exists).
     *
     * By specifying a callback function, the target node can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a node with id as A.
     *   g.node('A');
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   "A";
     * // }
     * ```
     *
     * @param id Node ID.
     * @param callback Callbacks for manipulating created or retrieved node.
     */
    node(id: string, callback?: (node: NodeModel) => void): NodeModel;
    /**
     * Create a node (or get one if it already exists) and adapt the attributes.
     *
     * By specifying a callback function, the target node can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a node by specifying its id and specifying its attributes.
     *   g.node('A', {
     *     [attribute.color]: 'red',
     *     [attribute.label]: 'my label',
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   "A" [
     * //     color = "red",
     * //     label = "my label",
     * //   ];
     * // }
     * ```
     *
     * @param id Node ID.
     * @param attributes Object of attributes to be adapted to the node.
     * @param callback Callbacks for manipulating created or retrieved node.
     */
    node(id: string, attributes: NodeAttributesObject, callback?: (node: NodeModel) => void): NodeModel;
    /**
     * Set a common attribute for the nodes in the graph.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Set a common attribute for the nodes in the graph.
     *   g.node({
     *     [attribute.color]: 'red',
     *     [attribute.label]: 'my label',
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   node [
     * //     color = "red",
     * //     label = "my label",
     * //   ];
     * // }
     * ```
     *
     * @param attributes Object of attributes to be adapted to the nodes.
     */
    node(attributes: NodeAttributesObject): void;
    /**
     * Create a edge.
     *
     * By specifying a callback function, the target edge can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a edge.
     *   g.edge(['a', 'b']);
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   "a" -> "b";
     * // }
     * ```
     * @param targets Nodes.
     * @param callback Callbacks for manipulating created or retrieved edge.
     */
    edge(targets: EdgeTargetLikeTuple, callback?: (edge: EdgeModel) => void): EdgeModel;
    /**
     * Create a edge and adapt the attributes.
     *
     * By specifying a callback function, the target edge can be received and manipulated as an argument.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Create a edge and specifying its attributes.
     *   g.edge(['a', 'b'], {
     *     [attribute.color]: 'red',
     *     [attribute.label]: 'my label',
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   "a" -> "b" [
     * //     color = "red",
     * //     label = "my label",
     * //   ];
     * // }
     * ```
     *
     * @param attributes Object of attributes to be adapted to the edge.
     * @param callback Callbacks for manipulating created or retrieved edge.
     */
    edge(targets: EdgeTargetLikeTuple, attributes: EdgeAttributesObject, callback?: (edge: EdgeModel) => void): EdgeModel;
    /**
     * Set a common attribute for the edges in the graph.
     *
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   // Set a common attribute for the edges in the graph.
     *   g.edge({
     *     [attribute.color]: 'red',
     *     [attribute.label]: 'my label',
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   edge [
     * //     color = "red",
     * //     label = "my label",
     * //   ];
     * // }
     * ```
     * @param attributes Object of attributes to be adapted to the edges.
     */
    edge(attributes: EdgeAttributesObject): void;
    /**
     * Set a common attribute for the graph in the graph.
     *
     * ```ts
     * const G = digraph('G', (g) => {
     *   g.graph({
     *     [attribute.color]: 'red',
     *     [attribute.label]: 'my label',
     *   });
     * });
     *
     * console.log(toDot(G));
     * // digraph "G" {
     * //   graph [
     * //     color = "red",
     * //     label = "my label",
     * //   ];
     * // }
     * ```
     * @param attributes Object of attributes to be adapted to the graph.
     */
    graph(attributes: SubgraphAttributesObject): void;
}

/**
 * Cluster common attribute interface.
 * @group Models
 */
export declare interface GraphCommonAttributes {
    /** Manage common attributes of graphs in a graph. */
    graph: AttributeListModel<'Graph', SubgraphAttributeKey | ClusterSubgraphAttributeKey>;
    /** Manage common attributes of edges in a graph. */
    edge: AttributeListModel<'Edge', EdgeAttributeKey>;
    /** Manage common attributes of nodes in a graph. */
    node: AttributeListModel<'Node', NodeAttributeKey>;
}

/**
 * @group Models
 */
export declare interface HasAttributes<T extends AttributeKey> {
    readonly attributes: AttributesGroupModel<T>;
}

/**
 * @group Models
 */
export declare interface HasComment {
    /** Comments to include when outputting with toDot. */
    comment?: string;
}

/**
 * @see {@link https://graphviz.org/doc/info/shapes.html#html HTML-Like Labels}
 * @group Attribute Types
 */
export declare type HTMLLikeLabel = `<${string}>`;

/** @hidden */
export declare namespace HTMLLikeLabel {
    export type TableAttributes = Insensitive<{
        align?: 'CENTER' | 'LEFT' | 'RIGHT';
        bgcolor?: Color | ColorList;
        border?: number;
        cellborder?: number;
        cellPadding?: number;
        cellSpacing?: number;
        color?: Color | ColorList;
        columns?: number;
        fixedSize?: true;
        gradientAngle?: number;
        height?: number;
        href?: string;
        id?: string;
        port?: Compass | string;
        rows?: number;
        sides?: Side.Combinations;
        style?: Style;
        target?: string;
        title?: string;
        tooltip?: string;
        valign?: 'MIDDLE' | 'BOTTOM' | 'TOP';
        width?: number;
    }>;
    export type NoAttributes = Record<string, unknown>;
    export type TrAttributes = NoAttributes;
    export type TdAttributes = Insensitive<{
        align?: 'CENTER' | 'LEFT' | 'RIGHT' | 'TEXT';
        balign?: 'CENTER' | 'LEFT' | 'RIGHT';
        bgcolor?: Color | ColorList;
        border?: number;
        cellPadding?: number;
        cellSpacing?: number;
        color?: Color | ColorList;
        colspan?: number;
        fixedSize?: boolean;
        gradientAngle?: number;
        height?: number;
        href?: string;
        id?: string;
        port?: Compass | string;
        rowSpan?: number;
        sides?: Side.Combinations;
        style?: Style;
        target?: string;
        title?: string;
        tooltip?: string;
        valign?: 'MIDDLE' | 'BOTTOM' | 'TOP';
        width?: number;
    }>;
    export type FontAttributes = Insensitive<{
        color?: Color | ColorList;
        face?: string;
        'point-size'?: number;
    }>;
    export type BrAttributes = Insensitive<{
        align?: 'CENTER' | 'LEFT' | 'RIGHT';
    }>;
    export type ImgAttributes = Insensitive<{
        scale?: boolean | 'WIDTH' | 'HEIGHT' | 'BOTH';
        src?: string;
    }>;
    export type IAttributes = NoAttributes;
    export type BAttributes = NoAttributes;
    export type UAttributes = NoAttributes;
    export type OAttributes = NoAttributes;
    export type SubAttributes = NoAttributes;
    export type SupAttributes = NoAttributes;
    export type SAttributes = NoAttributes;
    export type HrAttributes = NoAttributes;
    export type VrAttributes = NoAttributes;
}

export declare type Insensitive<T> = T & Insensitive.LowercaseKeys<T> & Insensitive.UppercaseKeys<T>;

export declare namespace Insensitive {
    export type LowercaseKeys<T> = {
        [key in keyof T as Lowercase<string & key>]: T[key];
    };
    export type UppercaseKeys<T> = {
        [key in keyof T as Uppercase<string & key>]: T[key];
    };
}

/**
 * Integer number.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/int/ int}
 * @group Attribute Types
 */
export declare type Int = number;

/** @hidden */
export declare function isCompass(c: string): c is Compass;

/** @hidden */
export declare function isForwardRefNode(object: unknown): object is ForwardRefNode;

/** @hidden */
export declare function isNodeModel(object: unknown): object is NodeModel;

/** @hidden */
export declare function isNodeRef(node: unknown): node is NodeRef;

/** @hidden */
export declare function isNodeRefGroupLike(target: NodeRefLike | NodeRefGroupLike): target is NodeRefGroupLike;

/** @hidden */
export declare function isNodeRefLike(node: unknown): node is NodeRefLike;

/**
 * list of strings separated by characters from the layersep attribute (by default, colons, tabs or spaces),
 * defining layer names and implicitly numbered 1,2,…
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/layerList/ layerList}
 * @group Attribute Types
 */
export declare type LayerList = string;

/**
 * specifies a list of layers defined by the layers attribute.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/layerRange/ layerRange}
 * @group Attribute Types
 */
export declare type LayerRange = string;

/**
 * An escString or an HTML label.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/lblString/ lblString}
 * @group Attribute Types
 */
export declare type LblString = HTMLLikeLabel | EscString;

/**
 * @group Models Context
 */
export declare interface ModelsContext {
    Graph: RootGraphConstructor;
    Digraph: RootGraphConstructor;
    Subgraph: SubgraphConstructor;
    Node: NodeConstructor;
    Edge: EdgeConstructor;
}

/**
 * Attribute types available for nodes.
 * @group Attribute
 */
export declare type NodeAttributeKey = NodeAttributeKey.values;

/** @hidden */
export declare namespace NodeAttributeKey {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'URL' | 'area' | 'color' | 'colorscheme' | 'comment' | 'distortion' | 'fillcolor' | 'fixedsize' | 'fontcolor' | 'fontname' | 'fontsize' | 'gradientangle' | 'group' | 'height' | 'href' | 'id' | 'image' | 'imagepos' | 'imagescale' | 'label' | 'labelloc' | 'layer' | 'margin' | 'nojustify' | 'ordering' | 'orientation' | 'penwidth' | 'peripheries' | 'pin' | 'pos' | 'rects' | 'regular' | 'root' | 'samplepoints' | 'shape' | 'shapefile' | 'showboxes' | 'sides' | 'skew' | 'sortv' | 'style' | 'target' | 'tooltip' | 'vertices' | 'width' | 'xlabel' | 'xlp' | 'z' | 'class'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Attribute object that can be set to Node.
 * @group Models
 */
export declare type NodeAttributesObject = AttributesObject<NodeAttributeKey>;

/**
 * @group Models
 */
export declare interface NodeConstructor {
    new (id: string, attributes?: NodeAttributesObject): NodeModel;
    new (...args: any[]): NodeModel;
}

/**
 * Model that can be converted to Node in DOT language.
 * @group Models
 */
export declare interface NodeModel extends HasComment, HasAttributes<NodeAttributeKey>, DotObjectModel<'Node'> {
    /** ID of the node */
    readonly id: string;
    /** Returns ForwardRefNode with port and compass specified. */
    port(port: string | Partial<Port>): ForwardRefNode;
}

/**
 * Objects that can be Edge destinations satisfy this interface.
 * @group Models
 */
export declare type NodeRef = NodeModel | ForwardRefNode;

/**
 * @group Models
 */
export declare type NodeRefGroup = NodeRef[];

/**
 * @group Models
 */
export declare type NodeRefGroupLike = NodeRefLike[];

/**
 * string or an object implementing EdgeTarget.
 * @group Models
 */
export declare type NodeRefLike = NodeRef | string;

/**
 * These specify the order in which nodes and edges are drawn in concrete output.
 *
 * - The default `"breadthfirst"` is the simplest, but when the graph layout does not avoid edge-node overlap, this mode will sometimes have edges drawn over nodes and sometimes on top of nodes.
 * - If the mode `"nodesfirst"` is chosen, all nodes are drawn first, followed by the edges. This guarantees an edge-node overlap will not be mistaken for an edge ending at a node.
 * - On the other hand, usually for aesthetic reasons, it may be desirable that all edges appear beneath nodes, even if the resulting drawing is ambiguous. This can be achieved by choosing `"edgesfirst"`.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/outputMode/ outputMode}
 * @group Attribute Types
 */
export declare type OutputMode = OutputMode.values;

/** @hidden */
export declare namespace OutputMode {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'breadthfirst' | 'nodesfirst' | 'edgesfirst'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * @see {@link https://graphviz.org/docs/attr-types/packMode/ packMode}
 * @group Attribute Types
 */
export declare type PackMode = keyof PickMode.$values | `array${string}`;

/**
 * Page Direction
 *
 * @see {@link https://graphviz.org/docs/attr-types/pagedir/ pagedir}
 * @group Attribute Types
 */
export declare type Pagedir = `${Pagedir.TB}${Pagedir.RL}`;

/** @hidden */
export declare namespace Pagedir {
    export type TB = Side.T | Side.B;
    export type RL = Side.R | Side.L;
}

/** @hidden */
export declare namespace PickMode {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'node' | 'clust' | 'graph'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * `"%f,%f('!')?"` representing the point (x,y).
 *
 * The optional `'!'` indicates the node position should not change (input-only).
 *
 * If dim=3, point may also have the format `"%f,%f,%f('!')?"` to represent the point (x,y,z).
 * @group Attribute Types
 */
export declare type Point = Point.position | `${Point.position}!`;

/** @hidden */
export declare namespace Point {
    export type position = `${Double},${Double}` | `${Double},${Double},${Double}` | `${Double},${Double},${Double},${Double},${Double}` | `${Double},${Double},${Double},${Double},${Double},${Double}` | `${Double},${Double},${Double},${Double},${Double},${Double},${Double}` | `${Double},${Double},${Double},${Double},${Double},${Double},${Double},${Double}` | `${Double},${Double},${Double},${Double},${Double},${Double},${Double},${Double},${Double}` | `${Double},${Double},${Double},${Double},${Double},${Double},${Double},${Double},${Double},${number}`;
}

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/pointList/ pointList}
 * @group Attribute Types
 */
export declare type PointList = Point | `${Point} ${Point}` | `${Point} ${Point} ${Point}` | `${Point} ${Point} ${Point} ${Point}`;

/**
 * Port on an edge node.
 * @group Models
 */
export declare interface Port {
    port: string;
    compass: Compass;
}

/**
 * Port Position
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/portPos/ portPos}
 * @group Attribute Types
 */
export declare type PortPos = `${string}:${Compass}` | Compass;

/**
 * Using `"fast"` gives about a 2-4 times overall speedup compared with `"normal"`,
 * though layout quality can suffer a little.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/quadType/ quadType}
 * @group Attribute Types
 */
export declare type QuadType = QuadType.values;

/** @hidden */
export declare namespace QuadType {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'normal' | 'fast' | 'none'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Rank Direction
 *
 * Corresponding to directed graphs drawn from top to bottom,
 * from left to right, from bottom to top, and from right to left, respectively.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/rankdir/ rankdir}
 * @group Attribute Types
 */
export declare type Rankdir = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/rankType/ rankType}
 * @group Attribute Types
 */
export declare type RankType = RankType.values;

/** @hidden */
export declare namespace RankType {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'same' | 'min' | 'source' | 'max' | 'sink'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * `"%f,%f,%f,%f"`
 *
 * The rectangle `llx,lly,urx,ury` gives the coordinates, in points,
 * of the lower-left corner `(llx,lly)` and the upper-right corner `(urx,ury)`.
 *
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/rect/ rect}
 * @group Attribute Types
 */
export declare type Rect = `${Double},${Double},${Double},${Double}`;

/**
 * @group Models
 */
export declare interface RootGraphConstructor {
    new (id?: string, attributes?: GraphAttributesObject): RootGraphModel;
    new (id?: string, strict?: boolean, attributes?: GraphAttributesObject): RootGraphModel;
    new (strict?: boolean, attributes?: GraphAttributesObject): RootGraphModel;
    new (attributes?: GraphAttributesObject): RootGraphModel;
    new (...args: any[]): RootGraphModel;
}

/**
 * DOT model representing a root graphs(digraph and graph).
 * @group Models
 */
export declare interface RootGraphModel extends GraphBaseModel<GraphAttributeKey>, DotObjectModel<'Graph'> {
    directed: boolean;
    /**
     * Strict mode.
     *
     * @description
     * A graph may also be described as strict.
     * This forbids the creation of multi-edges, i.e., there can be at most one edge with a given tail node and head node in the directed case.
     * For undirected graphs, there can be at most one edge connected to the same two nodes.
     * Subsequent edge statements using the same two nodes will identify the edge with the previously defined one and apply any attributes given in the edge statement.
     */
    strict: boolean;
}

/**
 * @group Models Context
 */
export declare const RootModelsContext: ModelsContext;

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/shape/ shape}
 * @group Attribute Types
 */
export declare type Shape = string;

export declare namespace Side {
    export type T = 'T';
    export type B = 'B';
    export type R = 'R';
    export type L = 'L';
    export type Combinations = T | B | R | L | `${T}${B}` | `${T}${R}` | `${T}${L}` | `${B}${R}` | `${B}${L}` | `${R}${L}` | `${T}${B}${R}` | `${T}${B}${L}` | `${T}${R}${L}` | `${B}${R}${L}` | `${T}${B}${R}${L}`;
}

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/smoothType/ smoothType}
 * @group Attribute Types
 */
export declare type SmoothType = SmoothType.values;

/** @hidden */
export declare namespace SmoothType {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'none' | 'avg_dist' | 'graph_dist' | 'power_dist' | 'rng' | 'spring' | 'triangle'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/splineType/ splineType}
 * @group Attribute Types
 */
export declare type SplineType = SplineType.spline | string;

/** @hidden */
export declare namespace SplineType {
    export type prefix = endp | startp | `${endp}${startp}` | '';
    export type spline = `${prefix}point ${triple}`;
    export type triple = `${Point} ${Point} ${Point}`;
    export type endp = `e,${Double},${Double} `;
    export type startp = `s,${Double},${Double} `;
}

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/startType/ startType}
 * @group Attribute Types
 */
export declare type StartType = `${StartType.style}${StartType.seed}`;

/** @hidden */
export declare namespace StartType {
    export type style = Exclude<keyof $style, keyof $exclude>;
    export interface $style extends $keywords<'regular' | 'self' | 'random'> {
    }
    export type seed = number;
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/style/ style}
 * @group Attribute Types
 */
export declare type Style = Style.styleItem | `${Style.styleItem},${Style.styleItem}` | `${Style.styleItem},${Style.styleItem},${Style.styleItem}` | `${Style.styleItem},${Style.styleItem},${Style.styleItem},${Style.styleItem}`;

/** @hidden */
export declare namespace Style {
    export type styleItem = Exclude<keyof $styleItem, keyof $exclude>;
    export interface $styleItem extends $keywords<'dashed' | 'dotted' | 'solid' | 'invis' | 'bold' | 'tapered' | 'filled' | 'striped' | 'wedged' | 'diagonals' | 'rounded' | 'filled' | 'striped' | 'rounded' | 'radial'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Attribute types available for subgraph.
 * @group Attribute
 */
export declare type SubgraphAttributeKey = SubgraphAttributeKey.values;

/** @hidden */
export declare namespace SubgraphAttributeKey {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'rank'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/**
 * Attribute object that can be set to Subgraph.
 * @group Models
 */
export declare type SubgraphAttributesObject = AttributesObject<ClusterSubgraphAttributeKey | SubgraphAttributeKey>;

/**
 * @group Models
 */
export declare interface SubgraphConstructor {
    new (id?: string, attributes?: SubgraphAttributesObject): SubgraphModel;
    new (attributes?: SubgraphAttributesObject): SubgraphModel;
    new (...args: any[]): SubgraphModel;
}

/**
 * DOT model representing a subgraph.
 * @group Models
 */
export declare interface SubgraphModel extends GraphBaseModel<SubgraphAttributeKey | ClusterSubgraphAttributeKey>, DotObjectModel<'Subgraph'> {
    /** Determines whether the Subgraph is a SubgraphCluster. */
    isSubgraphCluster(): boolean;
}

/**
 * Which rank to move floating (loose) nodes to
 *
 * Valid options:
 * - "min": Move floating (loose) nodes to minimum rank.
 * - "max": Move floating (loose) nodes to maximum rank.
 * - Otherwise, floating nodes are placed anywhere.
 *
 * Despite the name TBbalance ("Top-Bottom Balance"), this also works with left-right ranks, e.g. rankdir=LR.
 *
 * @see {@link https://graphviz.org/docs/attrs/TBbalance/ TBbalance}
 * @group Attribute Types
 */
export declare type TBbalanceType = TBbalanceType.values;

/** @hidden */
export declare namespace TBbalanceType {
    export type values = Exclude<keyof $values, keyof $exclude | symbol | number>;
    export interface $values extends $keywords<'min' | 'max'> {
    }
    export interface $exclude extends $keywordsValidation {
    }
}

/** @hidden */
export declare function toNodeRef(target: NodeRefLike): NodeRef;

/** @hidden */
export declare function toNodeRefGroup(targets: NodeRefGroupLike): NodeRefGroup;

/**
 * @see {@link https://graphviz.gitlab.io/docs/attr-types/viewPort/ viewPort}
 * @group Attribute Types
 */
export declare type ViewPort = `${Double},${Double},${Double},${Double},${Double}` | `${Double},${Double},${Double},${string}`;

export { }
