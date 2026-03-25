import * as React from 'react';
export interface StylingMarkdownProps {
    compact?: boolean;
    inline?: boolean;
}
export interface BaseMarkdownProps {
    sanitize?: boolean;
    source: string;
}
export type MarkdownProps = BaseMarkdownProps & StylingMarkdownProps & {
    source: string;
    className?: string;
    'data-role'?: string;
};
export declare class Markdown extends React.Component<MarkdownProps> {
    render(): React.JSX.Element;
}
