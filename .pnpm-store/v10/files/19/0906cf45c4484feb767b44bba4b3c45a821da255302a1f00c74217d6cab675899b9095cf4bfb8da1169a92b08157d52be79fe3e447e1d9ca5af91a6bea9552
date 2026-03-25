import * as React$1 from 'react';
import React__default, { ComponentProps, AnchorHTMLAttributes, MouseEvent as MouseEvent$1, ReactNode, ReactElement, SyntheticEvent, HTMLAttributes, Component, RefObject, DOMAttributes, FC, PropsWithChildren, ForwardRefExoticComponent, ButtonHTMLAttributes, RefAttributes, ElementType } from 'react';
import { API_KeyCollection } from 'storybook/manager-api';
import { color, CSSObject, FunctionInterpolation } from 'storybook/theming';
import { DecoratorFunction } from 'storybook/internal/csf';
import { Addon_RenderOptions } from 'storybook/internal/types';

interface ComponentSelector {
    __emotion_styles: any;
}

/**
 * @desc Utility type for getting props type of React component.
 * It takes `defaultProps` into an account - making props with defaults optional.
 */
type PropsOf<C extends keyof ReactJSX.IntrinsicElements | React.JSXElementConstructor<any>> = ReactJSX.LibraryManagedAttributes<C, React.ComponentProps<C>>;

interface Theme {
}

type IsPreReact19$1 = 2 extends Parameters<React.FunctionComponent<any>>['length'] ? true : false;
/** @ts-ignore */
type ReactJSXElement = true extends IsPreReact19$1 ? JSX.Element : React.JSX.Element;
/** @ts-ignore */
type ReactJSXElementClass = true extends IsPreReact19$1 ? JSX.ElementClass : React.JSX.ElementClass;
/** @ts-ignore */
type ReactJSXElementAttributesProperty = true extends IsPreReact19$1 ? JSX.ElementAttributesProperty : React.JSX.ElementAttributesProperty;
/** @ts-ignore */
type ReactJSXElementChildrenAttribute = true extends IsPreReact19$1 ? JSX.ElementChildrenAttribute : React.JSX.ElementChildrenAttribute;
/** @ts-ignore */
type ReactJSXLibraryManagedAttributes<C, P> = true extends IsPreReact19$1 ? JSX.LibraryManagedAttributes<C, P> : React.JSX.LibraryManagedAttributes<C, P>;
/** @ts-ignore */
type ReactJSXIntrinsicAttributes = true extends IsPreReact19$1 ? JSX.IntrinsicAttributes : React.JSX.IntrinsicAttributes;
/** @ts-ignore */
type ReactJSXIntrinsicClassAttributes<T> = true extends IsPreReact19$1 ? JSX.IntrinsicClassAttributes<T> : React.JSX.IntrinsicClassAttributes<T>;
/** @ts-ignore */
type ReactJSXIntrinsicElements$1 = true extends IsPreReact19$1 ? JSX.IntrinsicElements : React.JSX.IntrinsicElements;
/** @ts-ignore */
type ReactJSXElementType = true extends IsPreReact19$1 ? string | React.JSXElementConstructor<any> : React.JSX.ElementType;
declare namespace ReactJSX {
    type ElementType = ReactJSXElementType;
    interface Element extends ReactJSXElement {
    }
    interface ElementClass extends ReactJSXElementClass {
    }
    interface ElementAttributesProperty extends ReactJSXElementAttributesProperty {
    }
    interface ElementChildrenAttribute extends ReactJSXElementChildrenAttribute {
    }
    type LibraryManagedAttributes<C, P> = ReactJSXLibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends ReactJSXIntrinsicAttributes {
    }
    interface IntrinsicClassAttributes<T> extends ReactJSXIntrinsicClassAttributes<T> {
    }
    type IntrinsicElements = ReactJSXIntrinsicElements$1;
}

type IsPreReact19 = 2 extends Parameters<React.FunctionComponent<any>>['length'] ? true : false;
/** @ts-ignore */
type ReactJSXIntrinsicElements = true extends IsPreReact19 ? JSX.IntrinsicElements : React.JSX.IntrinsicElements;

/**
 * @typeparam ComponentProps  Props which will be included when withComponent is called
 * @typeparam SpecificComponentProps  Props which will *not* be included when withComponent is called
 */
interface StyledComponent<ComponentProps extends {}, SpecificComponentProps extends {} = {}, JSXProps extends {} = {}> extends React.FC<ComponentProps & SpecificComponentProps & JSXProps>, ComponentSelector {
    withComponent<C extends React.ComponentClass<React.ComponentProps<C>>>(component: C): StyledComponent<ComponentProps & PropsOf<C>, {}, {
        ref?: React.Ref<InstanceType<C>>;
    }>;
    withComponent<C extends React.ComponentType<React.ComponentProps<C>>>(component: C): StyledComponent<ComponentProps & PropsOf<C>>;
    withComponent<Tag extends keyof ReactJSXIntrinsicElements>(tag: Tag): StyledComponent<ComponentProps, ReactJSXIntrinsicElements[Tag]>;
}

declare const A: StyledComponent<React$1.AnchorHTMLAttributes<HTMLAnchorElement> & {
    theme?: Theme;
}, {}, {}>;

declare const Blockquote: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.BlockquoteHTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>, {}>;

declare const DefaultCodeBlock: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLElement>, HTMLElement>, {}>;
declare const Code: ({ className, children, ...props }: ComponentProps<typeof DefaultCodeBlock>) => React__default.JSX.Element;

declare const Div: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;

declare const DL: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDListElement>, HTMLDListElement>, {}>;

declare const H1: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>, {}>;

declare const H2: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>, {}>;

declare const H3: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>, {}>;

declare const H4: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>, {}>;

declare const H5: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>, {}>;

declare const H6: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>, {}>;

declare const HR: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHRElement>, HTMLHRElement>, {}>;

declare const Img: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, {}>;

declare const LI: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>, {}>;

declare const OL: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>, {}>;

declare const P: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>, {}>;

declare const Pre: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLPreElement>, HTMLPreElement>, {}>;

declare const Span: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>, {}>;

declare const Table: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>, {}>;

declare const TT: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>, {}>;

declare const UL: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLUListElement>, HTMLUListElement>, {}>;

interface BadgeProps {
    compact?: boolean;
    status?: 'positive' | 'negative' | 'neutral' | 'warning' | 'critical' | 'active';
    children?: React__default.ReactNode;
}
declare const Badge: ({ ...props }: BadgeProps) => React__default.JSX.Element;

interface LinkStylesProps {
    secondary?: boolean;
    tertiary?: boolean;
    nochrome?: boolean;
    inverse?: boolean;
    isButton?: boolean;
}
interface LinkInnerProps {
    withArrow?: boolean;
    containsIcon?: boolean;
}
type AProps = AnchorHTMLAttributes<HTMLAnchorElement>;
interface LinkProps extends LinkInnerProps, LinkStylesProps, AProps {
    cancel?: boolean;
    className?: string;
    style?: object;
    onClick?: (e: MouseEvent$1) => void;
    href?: string;
}
declare const Link$1: React__default.ForwardRefExoticComponent<LinkProps & React__default.RefAttributes<HTMLAnchorElement>>;

declare const DocumentWrapper: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;

declare const supportedLanguages: {
    jsextra: any;
    jsx: any;
    json: any;
    yml: any;
    md: any;
    bash: any;
    css: any;
    html: any;
    tsx: any;
    typescript: any;
    graphql: any;
};

interface SyntaxHighlighterRendererProps {
    rows: any[];
    stylesheet: string;
    useInlineStyles: boolean;
}
type SyntaxHighlighterRenderer = (props: SyntaxHighlighterRendererProps) => ReactNode;
interface SyntaxHighlighterCustomProps {
    language: string;
    copyable?: boolean;
    bordered?: boolean;
    padded?: boolean;
    format?: SyntaxHighlighterFormatTypes;
    formatter?: (type: SyntaxHighlighterFormatTypes, source: string) => Promise<string>;
    className?: string;
    renderer?: SyntaxHighlighterRenderer;
}
type SyntaxHighlighterFormatTypes = boolean | 'dedent';
type LineTagPropsFunction = (lineNumber: number) => React.HTMLProps<HTMLElement>;
type SupportedLanguage = 'text' | keyof typeof supportedLanguages;
interface SyntaxHighlighterBaseProps {
    children?: React.ReactNode;
    codeTagProps?: React.HTMLProps<HTMLElement>;
    customStyle?: any;
    language?: SupportedLanguage;
    lineNumberStyle?: any;
    lineProps?: LineTagPropsFunction | React.HTMLProps<HTMLElement>;
    showLineNumbers?: boolean;
    startingLineNumber?: number;
    wrapLongLines?: boolean;
    style?: any;
    useInlineStyles?: boolean;
}
type SyntaxHighlighterProps = SyntaxHighlighterBaseProps & SyntaxHighlighterCustomProps;

declare const LazySyntaxHighlighter: React__default.LazyExoticComponent<(props: ComponentProps<{
    ({ children, language, copyable, bordered, padded, format, formatter, className, showLineNumbers, ...rest }: SyntaxHighlighterProps): React__default.JSX.Element | null;
    registerLanguage(name: string, func: any): void;
}>) => React__default.JSX.Element>;
declare const LazySyntaxHighlighterWithFormatter: React__default.LazyExoticComponent<(props: ComponentProps<{
    ({ children, language, copyable, bordered, padded, format, formatter, className, showLineNumbers, ...rest }: SyntaxHighlighterProps): React__default.JSX.Element | null;
    registerLanguage(name: string, func: any): void;
}>) => React__default.JSX.Element>;
declare const SyntaxHighlighter: {
    (props: ComponentProps<typeof LazySyntaxHighlighter> | ComponentProps<typeof LazySyntaxHighlighterWithFormatter>): React__default.JSX.Element;
    registerLanguage(name: string, func: any): void;
};

declare function copyUsingClipboardAPI(text: string): Promise<void>;
declare function createCopyToClipboardFunction(): typeof copyUsingClipboardAPI;

interface ActionItem {
    title: string | ReactElement;
    className?: string;
    onClick: (e: MouseEvent$1<HTMLButtonElement>) => void;
    disabled?: boolean;
}
interface ActionBarProps {
    actionItems: ActionItem[];
}
declare const ActionBar: ({ actionItems, ...props }: ActionBarProps) => React__default.JSX.Element;

declare module 'react' {
    interface ReactElement {
        $$typeof?: symbol | string;
    }
}
interface SlotProps extends React$1.HTMLAttributes<HTMLElement> {
    children?: React$1.ReactNode;
}
declare const Slot: React$1.ForwardRefExoticComponent<SlotProps & React$1.RefAttributes<HTMLElement>>;

interface ButtonProps extends Omit<ComponentProps<typeof StyledButton>, 'as'> {
    as?: ComponentProps<typeof StyledButton>['as'] | typeof Slot;
    asChild?: boolean;
    /**
     * A concise action label for the button announced by screen readers. Needed for buttons without
     * text or with text that relies on visual cues to be understood. Pass false to indicate that the
     * Button's content is already accessible to all. When a string is passed, it is also used as the
     * default tooltip text.
     */
    ariaLabel?: string | false;
    /**
     * An optional tooltip to display when the Button is hovered. If the Button has no text content,
     * consider making this the same as the aria-label.
     */
    tooltip?: string;
    /**
     * Only use this flag when tooltips on button interfere with other keyboard interactions, like
     * when building a custom select or menu button. Disables tooltips from the `tooltip`, `shortcut`
     * and `ariaLabel` props.
     */
    disableAllTooltips?: boolean;
    /**
     * A more thorough description of what the Button does, provided to non-sighted users through an
     * aria-describedby attribute. Use sparingly for buttons that trigger complex actions.
     */
    ariaDescription?: string;
    /**
     * An optional keyboard shortcut to enable the button. Will be displayed in the tooltip and passed
     * to aria-keyshortcuts for assistive technologies. The binding of the shortcut and action is
     * managed globally in the manager's shortcuts module.
     */
    shortcut?: API_KeyCollection;
}
declare const Button: React__default.ForwardRefExoticComponent<Omit<ButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement>>;
declare const StyledButton: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & {
    size?: "small" | "medium";
    padding?: "small" | "medium" | "none";
    variant?: "outline" | "solid" | "ghost";
    active?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    animating?: boolean;
    animation?: "none" | "rotate360" | "glow" | "jiggle";
}, React__default.DetailedHTMLProps<React__default.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, {}>;
declare const IconButton: React__default.ForwardRefExoticComponent<Omit<ButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement>>;

interface ToggleButtonProps extends ButtonProps {
    /** Whether the ToggleButton is currently pressed or not. */
    pressed: boolean;
}
declare const ToggleButton: React__default.ForwardRefExoticComponent<Omit<ToggleButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement>>;

type TransitionStatus =
  | 'preEnter'
  | 'entering'
  | 'entered'
  | 'preExit'
  | 'exiting'
  | 'exited'
  | 'unmounted';

declare const ActionListAction: StyledComponent<Omit<Omit<ButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement> & {
    theme?: Theme;
}, "ref"> & React__default.RefAttributes<HTMLButtonElement> & {
    theme?: Theme;
}, {}, {}>;
declare const ActionList: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLUListElement>, HTMLUListElement>, {}> & {
    Item: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    } & {
        active?: boolean;
        transitionStatus?: TransitionStatus;
    }, React__default.DetailedHTMLProps<React__default.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>, {}>;
    HoverItem: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    } & {
        active?: boolean;
        transitionStatus?: TransitionStatus;
    } & React__default.ClassAttributes<HTMLLIElement> & React__default.LiHTMLAttributes<HTMLLIElement> & {
        theme?: Theme;
    } & {
        targetId: string;
    }, {}, {}>;
    Button: React__default.ForwardRefExoticComponent<Omit<Omit<ButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement> & {
        theme?: Theme;
    }, "ref"> & React__default.RefAttributes<HTMLButtonElement>>;
    Toggle: React__default.ForwardRefExoticComponent<Omit<Omit<ToggleButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement> & {
        theme?: Theme;
    }, "ref"> & React__default.RefAttributes<HTMLButtonElement>>;
    Action: StyledComponent<Omit<Omit<ButtonProps, "ref"> & React__default.RefAttributes<HTMLButtonElement> & {
        theme?: Theme;
    }, "ref"> & React__default.RefAttributes<HTMLButtonElement> & {
        theme?: Theme;
    }, {}, {}>;
    Link: (props: ComponentProps<typeof ActionListAction> & React__default.AnchorHTMLAttributes<HTMLAnchorElement>) => React__default.JSX.Element;
    Text: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    }, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
    Icon: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    }, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
};

declare const CollapsibleContent: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & {
    collapsed?: boolean;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const Collapsible: (({ children, summary, collapsed, disabled, state: providedState, ...props }: {
    children: ReactNode | ((state: ReturnType<typeof useCollapsible>) => ReactNode);
    summary?: ReactNode | ((state: ReturnType<typeof useCollapsible>) => ReactNode);
    collapsed?: boolean;
    disabled?: boolean;
    state?: ReturnType<typeof useCollapsible>;
} & ComponentProps<typeof CollapsibleContent>) => React__default.JSX.Element) & {
    Content: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    } & {
        collapsed?: boolean;
    }, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
};
declare const useCollapsible: (collapsed?: boolean, disabled?: boolean) => {
    contentId: string;
    isCollapsed: boolean;
    isDisabled: boolean;
    setCollapsed: React__default.Dispatch<React__default.SetStateAction<boolean>>;
    toggleCollapsed: (event?: SyntheticEvent<Element, Event>) => void;
    toggleProps: {
        readonly disabled: boolean | undefined;
        readonly onClick: (event?: SyntheticEvent<Element, Event>) => void;
        readonly 'aria-controls': string;
        readonly 'aria-expanded': boolean;
    };
};

declare const CardContent: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
interface CardProps extends ComponentProps<typeof CardContent> {
    outlineAnimation?: 'none' | 'rainbow' | 'spin';
    outlineColor?: keyof typeof color;
}
declare const Card: React__default.ForwardRefExoticComponent<Omit<CardProps, "ref"> & React__default.RefAttributes<HTMLDivElement>> & {
    Content: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    }, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
    Outline: StyledComponent<{
        theme?: Theme;
        as?: React__default.ElementType;
    } & {
        animation?: "none" | "rainbow" | "spin";
        color?: keyof typeof color;
    }, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
};

/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */



type Placement$1 = 'bottom' | 'bottom left' | 'bottom right' | 'bottom start' | 'bottom end' |
    'top' | 'top left' | 'top right' | 'top start' | 'top end' |
    'left' | 'left top' | 'left bottom' | 'start' | 'start top' | 'start bottom' |
    'right' | 'right top' | 'right bottom' | 'end' | 'end top' | 'end bottom';

interface PositionProps {
  /**
   * The placement of the element with respect to its anchor element.
   * @default 'bottom'
   */
  placement?: Placement$1,
  /**
   * The placement padding that should be applied between the element and its
   * surrounding container.
   * @default 12
   */
  containerPadding?: number,
  /**
   * The additional offset applied along the main axis between the element and its
   * anchor element.
   * @default 0
   */
  offset?: number,
  /**
   * The additional offset applied along the cross axis between the element and its
   * anchor element.
   * @default 0
   */
  crossOffset?: number,
  /**
   * Whether the element should flip its orientation (e.g. top to bottom or left to right) when
   * there is insufficient room for it to render completely.
   * @default true
   */
  shouldFlip?: boolean,
  // /**
  //  * The element that should be used as the bounding container when calculating container offset
  //  * or whether it should flip.
  //  */
  // boundaryElement?: Element,
  /** Whether the element is rendered. */
  isOpen?: boolean
}

declare global {
    namespace FormatjsIntl {
        interface Message {
        }
        interface IntlConfig {
        }
        interface Formats {
        }
    }
}

interface TextProps extends HTMLAttributes<HTMLElement> {
    elementType?: string;
}
interface HeadingProps extends HTMLAttributes<HTMLElement> {
    level?: number;
}

declare const Overlay: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & {
    $status?: TransitionStatus;
    $transitionDuration?: number;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const Container: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & {
    $variant: "dialog" | "bottom-drawer";
    $status?: TransitionStatus;
    $transitionDuration?: number;
    width?: number | string;
    height?: number | string;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
interface CloseProps {
    asChild?: boolean;
    children?: React__default.ReactElement<{
        onClick?: (event: React__default.MouseEvent) => void;
    }, string | React__default.JSXElementConstructor<{
        onClick?: (event: React__default.MouseEvent) => void;
    }>>;
    onClick?: (event: React__default.MouseEvent) => void;
}
declare const Close: ({ asChild, children, onClick, ...props }: CloseProps) => React__default.JSX.Element;
declare const Dialog: {
    Close: () => React__default.JSX.Element;
};
declare const CloseButton: ({ ariaLabel, ...props }: React__default.ComponentProps<typeof Button>) => React__default.JSX.Element;
declare const Content: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const Row: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const Col: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const Header: ({ hasClose, onClose, ...props }: React__default.ComponentProps<typeof Col> & {
    hasClose?: boolean;
    onClose?: () => void;
}) => React__default.JSX.Element;
declare const Title: StyledComponent<HeadingProps & React__default.RefAttributes<HTMLHeadingElement> & {
    theme?: Theme;
}, {}, {}>;
declare const Description: StyledComponent<TextProps & React__default.RefAttributes<HTMLElement> & {
    theme?: Theme;
}, {}, {}>;
declare const Actions: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const ErrorWrapper: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
declare const Error$1: ({ children, ...props }: {
    children: React__default.ReactNode;
} & ComponentProps<typeof ErrorWrapper>) => React__default.JSX.Element;

declare const Components_Actions: typeof Actions;
declare const Components_Close: typeof Close;
declare const Components_CloseButton: typeof CloseButton;
declare const Components_Col: typeof Col;
declare const Components_Container: typeof Container;
declare const Components_Content: typeof Content;
declare const Components_Description: typeof Description;
declare const Components_Dialog: typeof Dialog;
declare const Components_ErrorWrapper: typeof ErrorWrapper;
declare const Components_Header: typeof Header;
declare const Components_Overlay: typeof Overlay;
declare const Components_Row: typeof Row;
declare const Components_Title: typeof Title;
declare namespace Components {
  export { Components_Actions as Actions, Components_Close as Close, Components_CloseButton as CloseButton, Components_Col as Col, Components_Container as Container, Components_Content as Content, Components_Description as Description, Components_Dialog as Dialog, Error$1 as Error, Components_ErrorWrapper as ErrorWrapper, Components_Header as Header, Components_Overlay as Overlay, Components_Row as Row, Components_Title as Title };
}

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
    container?: HTMLElement;
    portalSelector?: string;
    /** Width of the Modal. Defaults to `740`. */
    width?: number | string;
    /** Height of the Modal. Defaults to `auto`. */
    height?: number | string;
    /** Modal content. */
    children: React__default.ReactNode;
    /** Additional class names for the Modal. */
    className?: string;
    /** Controlled state: whether the Modal is currently open. */
    open?: boolean;
    /** Uncontrolled state: whether the Modal is initially open on the first. */
    defaultOpen?: boolean;
    /** @deprecated Use `dismissOnEscape` instead. */
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    /** @deprecated Use `dismissOnInteractOutside` instead. */
    onInteractOutside?: (event: FocusEvent | MouseEvent | TouchEvent) => void;
    /** Handler called when visibility of the Modal changes. */
    onOpenChange?: (isOpen: boolean) => void;
    /** The accessible name for the modal. */
    ariaLabel?: string;
    /** Whether the modal can be dismissed by clicking outside. Defaults to `true`. */
    dismissOnClickOutside?: boolean;
    /** Whether the modal can be dismissed by pressing Escape. Defaults to `true`. */
    dismissOnEscape?: boolean;
    /** Transition duration, so we can slow down transitions on mobile. */
    transitionDuration?: number;
    /** The max dimensions, initial position and animations of the Modal. Defaults to 'dialog'. */
    variant?: 'dialog' | 'bottom-drawer';
}
declare function BaseModal({ container, portalSelector, children, width, height, ariaLabel, dismissOnClickOutside, dismissOnEscape, className, open, onEscapeKeyDown, onInteractOutside, onOpenChange, defaultOpen, transitionDuration, variant, ...props }: ModalProps): React__default.JSX.Element | null;
declare const Modal: typeof BaseModal & typeof Components;
/**
 * Storybook decorator to help render Modals in stories with multiple theme layouts. Internal to
 * Storybook. Use at your own risk.
 */
declare const ModalDecorator: DecoratorFunction;

interface SpacedProps {
    children?: React__default.ReactNode;
    col?: number;
    row?: number;
    outer?: number | boolean;
}
declare const Spaced: ({ col, row, outer, children, ...rest }: SpacedProps) => React__default.JSX.Element;

interface PlaceholderProps {
    children?: React__default.ReactNode;
}
declare const Placeholder: ({ children, ...props }: PlaceholderProps) => React__default.JSX.Element;

interface ScrollAreaProps {
    children?: React__default.ReactNode;
    horizontal?: boolean;
    vertical?: boolean;
    className?: string;
    offset?: number;
    scrollbarSize?: number;
    scrollPadding?: number | string;
}
declare const ScrollArea: React__default.ForwardRefExoticComponent<ScrollAreaProps & React__default.RefAttributes<HTMLDivElement>>;

type ZoomProps = {
    centered?: boolean;
    scale: number;
    children: ReactElement | ReactElement[];
};
declare function ZoomElement({ centered, scale, children }: ZoomProps): React__default.JSX.Element;

type IZoomIFrameProps = {
    scale: number;
    children: ReactElement<HTMLIFrameElement>;
    iFrameRef: RefObject<HTMLIFrameElement>;
    active?: boolean;
};
declare class ZoomIFrame extends Component<IZoomIFrameProps> {
    iframe: HTMLIFrameElement;
    componentDidMount(): void;
    shouldComponentUpdate(nextProps: IZoomIFrameProps): boolean;
    setIframeInnerZoom(scale: number): void;
    setIframeZoom(scale: number): void;
    render(): React__default.JSX.Element;
}

declare const Zoom: {
    Element: typeof ZoomElement;
    IFrame: typeof ZoomIFrame;
};

interface ErrorFormatterProps {
    error: Error;
}
declare const ErrorFormatter: ({ error }: ErrorFormatterProps) => React__default.JSX.Element;

type Value = string | number | null | boolean | undefined;
interface Option {
    /** Optional rendering of the option. */
    children?: React__default.ReactNode;
    title: string;
    description?: string;
    icon?: React__default.ReactNode;
    value: Value;
}

interface SelectProps extends Omit<ButtonProps, 'onClick' | 'onChange' | 'onSelect' | 'variant'> {
    size?: 'small' | 'medium';
    padding?: 'small' | 'medium' | 'none';
    /**
     * Whether multiple options can be selected. In single select mode, this component acts like a
     * HTML select element where the selected option follows focus. In multi select mode, it acts like
     * a combobox and does not autoclose on select or autoselect the focused option.
     */
    multiSelect?: boolean;
    /**
     * Mandatory label that explains what is being selected. Do not include "change", "toggle" or
     * "select" verbs in the label. Instead, only describe the type of content with a noun.
     */
    ariaLabel: string;
    /**
     * Label for the Select component. In single-select mode, is replaced by the currently selected
     * option's title.
     */
    children?: React__default.ReactNode;
    /**
     * Icon shown next to the Select's children, still displayed when a value is selected and Select
     * shows that value instead of children.
     */
    icon?: React__default.ReactNode;
    /** Whether the Select is currently disabled. */
    disabled?: boolean;
    /** Options available in the select. */
    options: Option[];
    /** IDs of the preselected options. */
    defaultOptions?: Value | Value[];
    /** Whether the Select should render open. */
    defaultOpen?: boolean;
    /** When set, a reset option is rendered in the Select listbox. */
    onReset?: () => void;
    /** Custom text label for the reset option when it exists. */
    resetLabel?: string;
    onSelect?: (option: Value) => void;
    onDeselect?: (option: Value) => void;
    onChange?: (selected: Value[]) => void;
}
declare const Select: React__default.ForwardRefExoticComponent<Omit<SelectProps, "ref"> & React__default.RefAttributes<HTMLButtonElement>>;

type Sizes = '100%' | 'flex' | 'auto';
type Alignments = 'end' | 'center' | 'start';
type ValidationStates = 'valid' | 'error' | 'warn';

/**
 * These types are copied from `react-textarea-autosize`. I copied them because of
 * https://github.com/storybookjs/storybook/issues/18734 Maybe there's some bug in `tsup` or
 * `react-textarea-autosize`?
 */
type TextareaPropsRaw = React__default.TextareaHTMLAttributes<HTMLTextAreaElement>;
type Style = Omit<NonNullable<TextareaPropsRaw['style']>, 'maxHeight' | 'minHeight'> & {
    height?: number;
};
type TextareaHeightChangeMeta = {
    rowHeight: number;
};
interface TextareaAutosizeProps extends Omit<TextareaPropsRaw, 'style'> {
    maxRows?: number;
    minRows?: number;
    onHeightChange?: (height: number, meta: TextareaHeightChangeMeta) => void;
    cacheMeasurements?: boolean;
    style?: Style;
}

interface FieldProps {
    children?: ReactNode;
    label?: ReactNode;
}

declare const Form: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, {}> & {
    Field: ({ label, children, ...props }: FieldProps) => React$1.JSX.Element;
    Input: StyledComponent<Omit<Omit<React$1.HTMLProps<HTMLInputElement>, "align" | "height" | "size" | "valid"> & {
        size?: Sizes;
        align?: Alignments;
        valid?: ValidationStates;
        height?: number;
    }, "ref"> & React$1.RefAttributes<any> & {
        theme?: Theme;
    } & Omit<React$1.HTMLProps<HTMLInputElement>, "align" | "height" | "size" | "valid"> & {
        size?: Sizes;
        align?: Alignments;
        valid?: ValidationStates;
        height?: number;
    }, {}, {}> & {
        displayName: string;
    };
    Select: ({ children, ...props }: Omit<React$1.SelectHTMLAttributes<HTMLSelectElement>, "align" | "height" | "size" | "valid"> & {
        size?: Sizes;
        align?: Alignments;
        valid?: ValidationStates;
        height?: number;
    }) => React$1.JSX.Element;
    Textarea: StyledComponent<Omit<Omit<TextareaAutosizeProps, "align" | "height" | "size" | "valid"> & {
        size?: Sizes;
        align?: Alignments;
        valid?: ValidationStates;
        height?: number;
    } & React$1.RefAttributes<HTMLTextAreaElement>, "ref"> & React$1.RefAttributes<any> & {
        theme?: Theme;
    } & Omit<TextareaAutosizeProps, "align" | "height" | "size" | "valid"> & {
        size?: Sizes;
        align?: Alignments;
        valid?: ValidationStates;
        height?: number;
    } & React$1.RefAttributes<HTMLTextAreaElement>, {}, {}> & {
        displayName: string;
    };
    Button: React$1.ForwardRefExoticComponent<Omit<ButtonProps, "ref"> & React$1.RefAttributes<HTMLButtonElement>>;
    Checkbox: (props: React.InputHTMLAttributes<HTMLInputElement>) => React$1.JSX.Element;
    Radio: (props: React.InputHTMLAttributes<HTMLInputElement>) => React$1.JSX.Element;
};

type BasicPlacement = 'top' | 'bottom' | 'left' | 'right';
type PlacementWithModifier = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
type PopperPlacement = BasicPlacement | PlacementWithModifier;
declare const convertToReactAriaPlacement: (p: PopperPlacement) => NonNullable<PositionProps["placement"]>;

interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
    /** Content of the popover. */
    children: React__default.ReactNode;
    /** Preset popover color taken from the theme, affecting both bathground and foreground. */
    color?: 'default' | 'inverse' | 'positive' | 'negative' | 'warning' | 'none';
    /** Whether the popover is rendered with a decorative window-like appearance. */
    hasChrome: boolean;
    /** Optional callback connected to a close button. Then button is shown only when passed. */
    onHide?: () => void;
    /** Optional custom label for the close button, if there is one. */
    hideLabel?: string;
    /** Padding between the content and popover edge. */
    padding?: number | string;
}
declare const Popover: React__default.ForwardRefExoticComponent<PopoverProps & React__default.RefAttributes<HTMLDivElement>>;

interface PopoverProviderProps {
    /** Whether to display the Popover in a prestyled container. True by default. */
    hasChrome?: boolean;
    /**
     * Whether to display a close button in the top right corner of the popover overlay. Can overlap
     * with overlay content, make sure to test your use case. False by default.
     */
    hasCloseButton?: boolean;
    /** Optional custom label for the close button, if there is one. */
    closeLabel?: string;
    /** Optional custom padding for the popover overlay. */
    padding?: number | string;
    /** Distance between the trigger and Popover. Customize only if you have a good reason to. */
    offset?: number;
    /**
     * Placement of the Popover. Start and End variants involve additional JS dimension calculations
     * and should be used sparingly. Left and Right get inverted in RTL.
     */
    placement?: PopperPlacement;
    /**
     * Popover content. Pass a function to receive a onHide callback to collect to your close button,
     * or if you want to wait for the popover to be opened to call your content component.
     */
    popover: ReactNode | ((props: {
        onHide: () => void;
    }) => ReactNode);
    /** Popover trigger, must be a single child with click/press events. Must forward refs. */
    children: ReactElement<DOMAttributes<Element>, string>;
    /** Uncontrolled state: whether the Popover is initially visible. */
    defaultVisible?: boolean;
    /** Controlled state: whether the Popover is visible. */
    visible?: boolean;
    /** Controlled state: fires when user interaction causes the Popover to change visibility. */
    onVisibleChange?: (isVisible: boolean) => void;
}
declare const PopoverProvider: ({ placement: placementProp, hasChrome, hasCloseButton, closeLabel, offset, padding, popover, children, defaultVisible, visible, onVisibleChange, ...props }: PopoverProviderProps) => React__default.JSX.Element;

type TooltipProps = Omit<PopoverProps, 'onHide' | 'hideLabel'>;
declare const Tooltip: React__default.ForwardRefExoticComponent<TooltipProps & React__default.RefAttributes<HTMLDivElement>>;

interface TooltipNoteProps {
    note: string;
}
declare const TooltipNote: ({ note, ...props }: TooltipNoteProps) => React__default.JSX.Element;

interface TooltipProviderProps {
    /** Tooltips trigger on hover and focus by default. To trigger on focus only, set this to `true`. */
    triggerOnFocusOnly?: boolean;
    /** Distance between the trigger and tooltip. Customize only if you have a good reason to. */
    offset?: number;
    /**
     * Placement of the tooltip. Start and End variants involve additional JS dimension calculations
     * and should be used sparingly. Left and Right get inverted in RTL.
     */
    placement?: PopperPlacement;
    /** Tooltip content */
    tooltip: ReactNode;
    /** Tooltip trigger, must be a single child that can receive focus and click/key events. */
    children: ReactElement<DOMAttributes<Element>, string>;
    /** Delay before showing the tooltip, defaults to 200ms. Always instant on focus. */
    delayShow?: number;
    /** Delay before hiding the tooltip, defaults to 400ms. */
    delayHide?: number;
    /** Uncontrolled state: whether the tooltip is visible by default. */
    defaultVisible?: boolean;
    /** Deprecated property - use defaultVisible instead. */
    startOpen?: boolean;
    /** Controlled state: whether the tooltip is visible. */
    visible?: boolean;
    /** Controlled state: fires when user interaction causes the tooltip to change visibility. */
    onVisibleChange?: (isVisible: boolean) => void;
}
declare const TooltipProvider: ({ triggerOnFocusOnly, placement: placementProp, offset, tooltip, children, defaultVisible, startOpen, delayShow, delayHide, visible, onVisibleChange, ...props }: TooltipProviderProps) => React__default.JSX.Element;

declare const top: "top";
declare const bottom: "bottom";
declare const right: "right";
declare const left: "left";
declare type BasePlacement = typeof top | typeof bottom | typeof right | typeof left;
declare type VariationPlacement = "top-start" | "top-end" | "bottom-start" | "bottom-end" | "right-start" | "right-end" | "left-start" | "left-end";
declare type AutoPlacement = "auto" | "auto-start" | "auto-end";
declare type Placement = AutoPlacement | BasePlacement | VariationPlacement;
declare const beforeRead: "beforeRead";
declare const read: "read";
declare const afterRead: "afterRead";
declare const beforeMain: "beforeMain";
declare const main: "main";
declare const afterMain: "afterMain";
declare const beforeWrite: "beforeWrite";
declare const write: "write";
declare const afterWrite: "afterWrite";
declare type ModifierPhases = typeof beforeRead | typeof read | typeof afterRead | typeof beforeMain | typeof main | typeof afterMain | typeof beforeWrite | typeof write | typeof afterWrite;

declare type Obj = {
    [key: string]: any;
};
declare type VisualViewport = EventTarget & {
    width: number;
    height: number;
    offsetLeft: number;
    offsetTop: number;
    scale: number;
};
declare type Window = {
    innerHeight: number;
    offsetHeight: number;
    innerWidth: number;
    offsetWidth: number;
    pageXOffset: number;
    pageYOffset: number;
    getComputedStyle: typeof getComputedStyle;
    addEventListener(type: any, listener: any, optionsOrUseCapture?: any): void;
    removeEventListener(type: any, listener: any, optionsOrUseCapture?: any): void;
    Element: Element;
    HTMLElement: HTMLElement;
    Node: Node;
    toString(): "[object Window]";
    devicePixelRatio: number;
    visualViewport?: VisualViewport;
    ShadowRoot: ShadowRoot;
};
declare type Rect = {
    width: number;
    height: number;
    x: number;
    y: number;
};
declare type Offsets = {
    y: number;
    x: number;
};
declare type PositioningStrategy = "absolute" | "fixed";
declare type StateRects = {
    reference: Rect;
    popper: Rect;
};
declare type OffsetData = {
    [key in Placement]?: Offsets;
};
declare type State = {
    elements: {
        reference: Element | VirtualElement;
        popper: HTMLElement;
        arrow?: HTMLElement;
    };
    options: OptionsGeneric<any>;
    placement: Placement;
    strategy: PositioningStrategy;
    orderedModifiers: Array<Modifier<any, any>>;
    rects: StateRects;
    scrollParents: {
        reference: Array<Element | Window | VisualViewport>;
        popper: Array<Element | Window | VisualViewport>;
    };
    styles: {
        [key: string]: Partial<CSSStyleDeclaration>;
    };
    attributes: {
        [key: string]: {
            [key: string]: string | boolean;
        };
    };
    modifiersData: {
        arrow?: {
            x?: number;
            y?: number;
            centerOffset: number;
        };
        hide?: {
            isReferenceHidden: boolean;
            hasPopperEscaped: boolean;
            referenceClippingOffsets: SideObject;
            popperEscapeOffsets: SideObject;
        };
        offset?: OffsetData;
        preventOverflow?: Offsets;
        popperOffsets?: Offsets;
        [key: string]: any;
    };
    reset: boolean;
};
declare type SetAction<S> = S | ((prev: S) => S);
declare type Instance = {
    state: State;
    destroy: () => void;
    forceUpdate: () => void;
    update: () => Promise<Partial<State>>;
    setOptions: (setOptionsAction: SetAction<Partial<OptionsGeneric<any>>>) => Promise<Partial<State>>;
};
declare type ModifierArguments<Options extends Obj> = {
    state: State;
    instance: Instance;
    options: Partial<Options>;
    name: string;
};
declare type Modifier<Name, Options extends Obj> = {
    name: Name;
    enabled: boolean;
    phase: ModifierPhases;
    requires?: Array<string>;
    requiresIfExists?: Array<string>;
    fn: (arg0: ModifierArguments<Options>) => State | void;
    effect?: (arg0: ModifierArguments<Options>) => (() => void) | void;
    options?: Partial<Options>;
    data?: Obj;
};
declare type Options = {
    placement: Placement;
    modifiers: Array<Partial<Modifier<any, any>>>;
    strategy: PositioningStrategy;
    onFirstUpdate?: (arg0: Partial<State>) => void;
};
declare type OptionsGeneric<TModifier> = {
    placement: Placement;
    modifiers: Array<TModifier>;
    strategy: PositioningStrategy;
    onFirstUpdate?: (arg0: Partial<State>) => void;
};
declare type SideObject = {
    top: number;
    left: number;
    right: number;
    bottom: number;
};
declare type VirtualElement = {
    getBoundingClientRect: () => ClientRect | DOMRect;
    contextElement?: Element;
};

declare const createPopper: <TModifier extends Partial<Modifier<any, any>>>(reference: Element | VirtualElement, popper: HTMLElement, options?: Partial<OptionsGeneric<TModifier>>) => Instance;

declare type TriggerType = 'click' | 'double-click' | 'right-click' | 'hover' | 'focus';
declare type Config = {
    /**
     * Whether to close the tooltip when its trigger is out of boundary
     * @default false
     */
    closeOnTriggerHidden?: boolean;
    /**
     * Event or events that trigger the tooltip
     * @default hover
     */
    trigger?: TriggerType | TriggerType[] | null;
    /**
     * Delay in hiding the tooltip (ms)
     * @default 0
     */
    delayHide?: number;
    /**
     * Delay in showing the tooltip (ms)
     * @default 0
     */
    delayShow?: number;
    /**
     * Whether to make the tooltip spawn at cursor position
     * @default false
     */
    followCursor?: boolean;
    /**
     * Options to MutationObserver, used internally for updating
     * tooltip position based on its DOM changes
     * @default  { attributes: true, childList: true, subtree: true }
     */
    mutationObserverOptions?: MutationObserverInit | null;
    /**
     * Whether tooltip is shown by default
     * @default false
     */
    defaultVisible?: boolean;
    /**
     * Used to create controlled tooltip
     */
    visible?: boolean;
    /**
     * Called when the visibility of the tooltip changes
     */
    onVisibleChange?: (state: boolean) => void;
    /**
     * If `true`, a click outside the trigger element closes the tooltip
     * @default true
     */
    closeOnOutsideClick?: boolean;
    /**
     * If `true`, hovering the tooltip will keep it open. Normally tooltip closes when the mouse cursor moves out of
     * the trigger element. If it moves to the tooltip element, the tooltip stays open.
     * @default false
     */
    interactive?: boolean;
    /**
     * Alias for popper.js placement, see https://popper.js.org/docs/v2/constructors/#placement
     */
    placement?: Placement;
    /**
     * Shorthand for popper.js offset modifier, see https://popper.js.org/docs/v2/modifiers/offset/
     * @default [0, 6]
     */
    offset?: [number, number];
};
declare type PopperOptions = Partial<Options> & {
    createPopper?: typeof createPopper;
};

declare const TargetContainer: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & {
    trigger: Config["trigger"];
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
interface WithHideFn {
    onHide: () => void;
}
interface WithTooltipPureProps extends Omit<Config, 'closeOnOutsideClick'>, Omit<ComponentProps<typeof TargetContainer>, 'trigger'>, PopperOptions {
    svg?: boolean;
    withArrows?: boolean;
    hasChrome?: boolean;
    tooltip: ReactNode | ((p: WithHideFn) => ReactNode);
    children: ReactNode;
    onDoubleClick?: () => void;
    /**
     * If `true`, a click outside the trigger element closes the tooltip
     *
     * @default false
     */
    closeOnOutsideClick?: boolean;
    /**
     * Optional container to portal the tooltip into. Can be a CSS selector string or a DOM Element.
     * Falls back to document.body.
     */
    portalContainer?: Element | string | null;
}
interface WithTooltipStateProps extends Omit<WithTooltipPureProps, 'onVisibleChange'> {
    startOpen?: boolean;
    onVisibleChange?: (visible: boolean) => void | boolean;
}

declare const LazyWithTooltip: React__default.LazyExoticComponent<({ startOpen, onVisibleChange: onChange, ...rest }: WithTooltipStateProps) => React__default.JSX.Element>;
declare const WithTooltip: (props: ComponentProps<typeof LazyWithTooltip>) => React__default.JSX.Element;
declare const LazyWithTooltipPure: React__default.LazyExoticComponent<React__default.FC<WithTooltipPureProps>>;
declare const WithTooltipPure: (props: ComponentProps<typeof LazyWithTooltipPure>) => React__default.JSX.Element;

interface TooltipMessageProps {
    title?: ReactNode;
    desc?: ReactNode;
    links?: {
        title: string;
        href?: string;
        onClick?: () => void;
    }[];
}
declare const TooltipMessage: ({ title, desc, links }: TooltipMessageProps) => React__default.JSX.Element;

interface ItemProps {
    disabled?: boolean;
    href?: string;
    onClick?: (event: SyntheticEvent, ...args: any[]) => any;
}
declare const Item: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & ItemProps, React__default.DetailedHTMLProps<React__default.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, {}>;
type LinkWrapperType = (props: any) => ReactNode;
interface ListItemProps extends Omit<ComponentProps<typeof Item>, 'title'> {
    loading?: boolean;
    title?: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
    icon?: ReactNode;
    input?: ReactNode;
    active?: boolean;
    disabled?: boolean;
    href?: string;
    LinkWrapper?: LinkWrapperType;
    isIndented?: boolean;
}
declare const ListItem: React__default.ForwardRefExoticComponent<Omit<ListItemProps, "ref"> & React__default.RefAttributes<unknown>>;

declare const List: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
interface NormalLink extends Omit<ListItemProps, 'onClick'> {
    id: string;
    onClick?: (event: SyntheticEvent, item: Pick<ListItemProps, 'id' | 'active' | 'disabled' | 'title' | 'href'>) => void;
}
type Link = CustomLink | NormalLink;
/**
 * This is a custom link that can be used in the `TooltipLinkList` component. It allows for custom
 * content to be rendered in the list; it does not have to be a link.
 */
interface CustomLink {
    id: string;
    content: ReactNode;
}
interface TooltipLinkListProps extends ComponentProps<typeof List> {
    links: Link[] | Link[][];
    LinkWrapper?: LinkWrapperType;
}
declare const TooltipLinkList: ({ links, LinkWrapper, ...props }: TooltipLinkListProps) => React__default.JSX.Element;

declare const TabBar: React__default.ForwardRefExoticComponent<React__default.HTMLAttributes<HTMLDivElement> & React__default.RefAttributes<HTMLDivElement>>;
interface TabWrapperProps {
    active: boolean;
    render?: () => ReactElement;
    children?: ReactNode;
}
declare const TabWrapper: React__default.ForwardRefExoticComponent<TabWrapperProps & React__default.RefAttributes<HTMLDivElement>>;
interface TabsProps {
    children?: ReactElement<{
        children: FC<Addon_RenderOptions & PropsWithChildren>;
        title: ReactNode | FC<PropsWithChildren>;
    }>[];
    id?: string;
    tools?: ReactNode;
    showToolsWhenEmpty?: boolean;
    emptyState?: ReactNode;
    selected?: string;
    actions?: {
        onSelect: (id: string) => void;
    } & Record<string, any>;
    backgroundColor?: string;
    absolute?: boolean;
    bordered?: boolean;
    menuName?: string;
}
declare const Tabs: FC<TabsProps>;
interface TabsStateProps {
    children: TabsProps['children'];
    initial: string;
    absolute: boolean;
    bordered: boolean;
    backgroundColor: string;
    menuName: string;
}
interface TabsStateState {
    selected: string;
}
declare class TabsState extends Component<TabsStateProps, TabsStateState> {
    static defaultProps: TabsStateProps;
    constructor(props: TabsStateProps);
    handlers: {
        onSelect: (id: string) => void;
    };
    render(): React__default.JSX.Element;
}

interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    children: ReactNode;
    id?: string;
    textColor?: string;
}
declare const TabButton: ForwardRefExoticComponent<TabButtonProps & RefAttributes<HTMLButtonElement>>;

interface SeparatorProps {
    force?: boolean;
}
declare const Separator: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & SeparatorProps, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>, {}>;
declare const interleaveSeparators: (list: any[]) => any;

interface BarProps {
    backgroundColor?: string;
    border?: boolean;
    className?: string;
    children?: React__default.ReactNode;
    scrollable?: boolean;
    innerStyle?: CSSObject;
}
declare const Bar: React__default.ForwardRefExoticComponent<BarProps & React__default.RefAttributes<HTMLDivElement>>;
interface FlexBarProps extends BarProps {
    border?: boolean;
    backgroundColor?: string;
}
declare const FlexBar: {
    ({ children, backgroundColor, className, ...rest }: FlexBarProps): React__default.JSX.Element;
    displayName: string;
};

interface Props {
    title: React__default.ReactNode;
    description?: React__default.ReactNode;
    footer?: React__default.ReactNode;
}
declare const EmptyTabContent: ({ title, description, footer }: Props) => React__default.JSX.Element;

interface AddonPanelProps {
    active: boolean;
    children: ReactElement;
    hasScrollbar?: boolean;
}
declare const AddonPanel: ({ active, children, hasScrollbar }: AddonPanelProps) => React__default.JSX.Element;

interface AbstractToolbarProps {
    className?: string;
    children?: React__default.ReactNode;
    'aria-label'?: string;
    'aria-labelledby'?: string;
}
declare const AbstractToolbar: FC<AbstractToolbarProps>;
interface ToolbarProps extends AbstractToolbarProps, BarProps {
}
declare const Toolbar: FC<ToolbarProps>;

interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
    /** The state of the tab list. Primary mechanism for using the tabpanel. */
    state: ReturnType<typeof useTabsState>;
    /**
     * Whether the panel adds a vertical scrollbar. Disable if you want to use fixed or sticky
     * positioning on part of the tab's content. True by default.
     */
    hasScrollbar?: boolean;
    /**
     * Whether to render only the active tab's content, or all tabs. When true, non-selected tabs are
     * rendered with the hidden attribute and do not affect the accessibility object model.
     */
    renderAllChildren?: boolean;
}
declare const TabPanel: FC<TabPanelProps>;

interface TabProps {
    id: string;
    'aria-label'?: string;
    title: FC | ReactNode | string;
    children?: FC | ReactNode;
    isDisabled?: boolean;
}
interface useTabsStateProps {
    defaultSelected?: string;
    selected?: string;
    onSelectionChange?: (key: string) => void;
    tabs: TabProps[];
}
declare const useTabsState: ({ defaultSelected, onSelectionChange, selected, tabs, }: useTabsStateProps) => unknown;
interface TabsViewProps extends HTMLAttributes<HTMLDivElement> {
    /** List of tabs and their associated panel. */
    tabs: TabProps[];
    /** ID of the tab that should be selected on first render. */
    defaultSelected?: string;
    /** ID of the current tab if in controlled rendering mode. */
    selected?: string;
    /** Called when the selected tab changes, use if you want to control the component state. */
    onSelectionChange?: (key: string) => void;
    /**
     * Optional tools to avoid rendering two toolbars in a layout.
     *
     * @warning Only use this if the tools act upon the entire layout,
     * not upon a single tab panel. If you want to edit which tools are
     * visible based on the current tab, then you musn't use `tools` and
     * should handle your own toolbar inside the tabpanel instead.
     */
    tools?: ReactElement;
    /** Background color for the bar containing the tabs and tools. */
    backgroundColor?: string;
    /** Style properties for the inner layout container in the bar containing the tabs and tools. */
    barInnerStyle?: React__default.CSSProperties;
    /** Show tools instead of the empty state if there are no tabs. */
    showToolsWhenEmpty?: boolean;
    /** Custom UI for the empty state shown when there are no tabs. */
    emptyState?: ReactNode;
    /** Optional ID. */
    id?: string;
    /** Props to pass to the TabPanel component. */
    panelProps?: Omit<ComponentProps<typeof TabPanel>, 'state'>;
}
declare const TabsView: FC<TabsViewProps>;

interface TabListProps extends HTMLAttributes<HTMLDivElement> {
    state: ReturnType<typeof useTabsState>;
}
declare const TabList: FC<TabListProps>;

interface StatelessTabListProps {
    children?: ReactNode;
}
declare const StatelessTabList: FC<StatelessTabListProps>;

interface StatelessTabPanelProps {
    /** Content of the tab panel. */
    children: ReactNode;
    /** Unique id of the TabPanel, must match that of its corresponding Tab. */
    name: string;
    /**
     * Whether the panel adds a vertical scrollbar. Disable if you want to use fixed or sticky
     * positioning on part of the tab's content. True by default.
     */
    hasScrollbar?: boolean;
}
declare const StatelessTabPanel: FC<StatelessTabPanelProps>;

interface StatelessTabsViewProps extends Omit<TabsViewProps, 'tabs'> {
    children: ReactNode;
}
declare const StatelessTabsView: FC<StatelessTabsViewProps>;

interface StatelessTabProps {
    /** Unique id of the Tab, must match that of its corresponding TabPanel. */
    name: string;
    /** Tab button content */
    children: React__default.ReactNode;
}
declare const StatelessTab: FC<StatelessTabProps>;

type StorybookLogoProps = {
    alt: string;
} & React__default.SVGAttributes<SVGSVGElement>;
declare const StorybookLogo: ({ alt, ...props }: StorybookLogoProps) => React__default.JSX.Element;

declare const StorybookIcon: (props: React__default.SVGAttributes<SVGElement>) => React__default.JSX.Element;

interface Progress {
    value: number;
    message: string;
    modules?: {
        complete: number;
        total: number;
    };
}
interface LoaderProps extends React__default.HTMLAttributes<HTMLDivElement> {
    progress?: Progress;
    error?: Error;
    size?: number;
}
declare const Loader: ({ progress, error, size, ...props }: LoaderProps) => React__default.JSX.Element;

declare const Wrapper: StyledComponent<{
    theme?: Theme;
    as?: React__default.ElementType;
} & {
    size: number;
}, React__default.DetailedHTMLProps<React__default.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;
interface ProgressSpinnerProps extends Omit<ComponentProps<typeof Wrapper>, 'size'> {
    percentage?: number;
    running?: boolean;
    size?: number;
    width?: number;
    children?: React__default.ReactNode;
}
declare const ProgressSpinner: ({ percentage, running, size, width, children, ...props }: ProgressSpinnerProps) => React__default.JSX.Element;

declare const getStoryHref: (baseUrl: string, storyId: string, additionalParams?: Record<string, string>) => string;

declare const nameSpaceClassNames: ({ ...props }: {
    [x: string]: any;
}, key: string) => {
    [x: string]: any;
};

/**
 * This is a "local" reset to style subtrees with Storybook styles
 *
 * We can't style individual elements (e.g. h1, h2, etc.) in here because the CSS specificity is too
 * high, so those styles can too easily override child elements that are not expecting it.
 */
declare const ResetWrapper: StyledComponent<{
    theme?: Theme;
    as?: React.ElementType;
}, React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, {}>;

declare const codeCommon: FunctionInterpolation;
declare const withReset: FunctionInterpolation;

interface ClipboardCodeProps {
    code: string;
}
declare const ClipboardCode: ({ code, ...props }: ClipboardCodeProps) => React__default.JSX.Element;

declare const components: {
    h1: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => React$1.JSX.Element;
    h2: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => React$1.JSX.Element;
    h3: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => React$1.JSX.Element;
    h4: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => React$1.JSX.Element;
    h5: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => React$1.JSX.Element;
    h6: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => React$1.JSX.Element;
    pre: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLPreElement>, HTMLPreElement>) => React$1.JSX.Element;
    a: (props: React$1.DetailedHTMLProps<React$1.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) => React$1.JSX.Element;
    hr: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLHRElement>, HTMLHRElement>) => React$1.JSX.Element;
    dl: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDListElement>, HTMLDListElement>) => React$1.JSX.Element;
    blockquote: (props: React$1.DetailedHTMLProps<React$1.BlockquoteHTMLAttributes<HTMLElement>, HTMLElement>) => React$1.JSX.Element;
    table: (props: React$1.DetailedHTMLProps<React$1.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>) => React$1.JSX.Element;
    img: (props: React$1.DetailedHTMLProps<React$1.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) => React$1.JSX.Element;
    div: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => React$1.JSX.Element;
    span: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) => React$1.JSX.Element;
    li: (props: React$1.DetailedHTMLProps<React$1.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>) => React$1.JSX.Element;
    ul: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLUListElement>, HTMLUListElement>) => React$1.JSX.Element;
    ol: (props: React$1.DetailedHTMLProps<React$1.OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>) => React$1.JSX.Element;
    p: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>) => React$1.JSX.Element;
    code: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLElement>, HTMLElement>) => React$1.JSX.Element;
    tt: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>) => React$1.JSX.Element;
    resetwrapper: (props: React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => React$1.JSX.Element;
};
declare const resetComponents: Record<string, ElementType>;

export { A, AbstractToolbar, ActionBar, type ActionItem, ActionList, AddonPanel, Badge, Bar, type BarProps, Blockquote, Button, type ButtonProps, Card, ClipboardCode, Code, Collapsible, DL, Div, DocumentWrapper, EmptyTabContent, ErrorFormatter, FlexBar, Form, H1, H2, H3, H4, H5, H6, HR, IconButton, Img, LI, Link$1 as Link, ListItem, Loader, Modal, ModalDecorator, OL, P, Placeholder, Popover, type PopoverProps, PopoverProvider, type PopoverProviderProps, type PopperPlacement, Pre, ProgressSpinner, ResetWrapper, ScrollArea, Select, Separator, Spaced, Span, StatelessTab, StatelessTabList, type StatelessTabListProps, StatelessTabPanel, type StatelessTabPanelProps, type StatelessTabProps, StatelessTabsView, type StatelessTabsViewProps, StorybookIcon, StorybookLogo, type SupportedLanguage, SyntaxHighlighter, type SyntaxHighlighterFormatTypes, type SyntaxHighlighterProps, type SyntaxHighlighterRendererProps, TT, TabBar, TabButton, TabList, type TabListProps, TabPanel, type TabPanelProps, type TabProps, TabWrapper, Table, Tabs, TabsState, TabsView, type TabsViewProps, ToggleButton, Toolbar, Tooltip, TooltipLinkList, type Link as TooltipLinkListLink, TooltipMessage, TooltipNote, type TooltipNoteProps, type TooltipProps, TooltipProvider, type TooltipProviderProps, UL, WithTooltip, WithTooltipPure, Zoom, codeCommon, components, convertToReactAriaPlacement, createCopyToClipboardFunction, getStoryHref, interleaveSeparators, nameSpaceClassNames, resetComponents, useTabsState, withReset };
