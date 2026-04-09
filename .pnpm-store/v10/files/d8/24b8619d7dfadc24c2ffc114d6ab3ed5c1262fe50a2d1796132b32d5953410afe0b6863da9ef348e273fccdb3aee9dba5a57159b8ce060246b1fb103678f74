// Internal helper types

/**
 * This is the global JSX.ElementType if it’s defined, otherwise never.
 */
// @ts-ignore JSX runtimes may optionally define JSX.ElementType. The MDX types need to work regardless whether this is
// defined or not.
type ElementType = any extends JSX.ElementType ? never : JSX.ElementType;

/**
 * This matches any function component types that ar part of `ElementType`.
 */
type FunctionElementType = Extract<ElementType, (props: Record<string, any>) => any>;

/**
 * This matches any class component types that ar part of `ElementType`.
 */
type ClassElementType = Extract<ElementType, new(props: Record<string, any>) => any>;

/**
 * A valid JSX string component.
 */
type StringComponent = Extract<keyof JSX.IntrinsicElements, ElementType extends never ? string : ElementType>;

/**
 * A JSX element returned by MDX content.
 */
export type Element = JSX.Element;

/**
 * A valid JSX function component.
 */
type FunctionComponent<Props> = ElementType extends never
    // If JSX.ElementType isn’t defined, the valid return type is JSX.Element
    ? (props: Props) => Element | null
    : FunctionElementType extends never
    // If JSX.ElementType is defined, but doesn’t allow function components, function components are disallowed.
        ? never
    // If JSX.ElementType allows function components, its return value determines what is a valid.
    : (props: Props) => ReturnType<FunctionElementType>;

/**
 * A valid JSX class component.
 */
type ClassComponent<Props> = ElementType extends never
    // If JSX.ElementType isn’t defined, the valid return type is a constructor that returns JSX.ElementClass
    ? new(props: Props) => JSX.ElementClass
    : ClassElementType extends never
    // If JSX.ElementType is defined, but doesn’t allow constructors, function components are disallowed.
        ? never
    // If JSX.ElementType allows class components, its return value determines what is a valid.
    : new(props: Props) => InstanceType<ClassElementType>;

/**
 * Any allowed JSX component.
 */
type Component<Props> = FunctionComponent<Props> | ClassComponent<Props> | StringComponent;

interface NestedMDXComponents {
    [key: string]: NestedMDXComponents | Component<any>;
}

// Public MDX helper types

/**
 * MDX components may be passed as the `components`.
 *
 * The key is the name of the element to override. The value is the component to render instead.
 */
export type MDXComponents =
    & NestedMDXComponents
    & {
        [Key in StringComponent]?: Component<JSX.IntrinsicElements[Key]>;
    }
    & {
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
export type MDXContent = (props: MDXProps) => Element;

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

// This marks the file as a module, meaning not all types are implicitly exported.
export {};
