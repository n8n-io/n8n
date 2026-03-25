// Internal helper types

// tslint:disable-next-line: strict-export-declare-modifiers
type FunctionComponent<Props> = (props: Props) => JSX.Element | null;
// tslint:disable-next-line: strict-export-declare-modifiers
type ClassComponent<Props> = new (props: Props) => JSX.ElementClass;
// tslint:disable-next-line: strict-export-declare-modifiers
type Component<Props> = FunctionComponent<Props> | ClassComponent<Props>;
// tslint:disable-next-line: strict-export-declare-modifiers
interface NestedMDXComponents {
    [key: string]: NestedMDXComponents | Component<any> | keyof JSX.IntrinsicElements;
}

// Public MDX helper types

/**
 * MDX components may be passed as the `components`.
 *
 * The key is the name of the element to override. The value is the component to render instead.
 */
export type MDXComponents = NestedMDXComponents & {
    [Key in keyof JSX.IntrinsicElements]?: Component<JSX.IntrinsicElements[Key]> | keyof JSX.IntrinsicElements;
} & {
    /**
     * If a wrapper component is defined, the MDX content will be wrapped inside of it.
     */
    wrapper?: Component<any>;
};

/**
 * The props that may be passed to an MDX component.
 */
export interface MDXProps {
    /**
     * Which props exactly may be passed into the component depends on the contents of the MDX
     * file.
     */
    [key: string]: unknown;

    /**
     * This prop may be used to customize how certain components are rendered.
     */
    components?: MDXComponents;
}

/**
 * The type of the default export of an MDX module.
 */
export type MDXContent = (props: MDXProps) => JSX.Element;

/**
 * A generic MDX module type.
 */
export interface MDXModule {
    /**
     * This could be any value that is exported from the MDX file.
     */
    [key: string]: unknown;

    /**
     * A functional JSX component which renders the content of the MDX file.
     */
    default: MDXContent;
}
