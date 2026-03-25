import * as React from 'react';
import { AppStore, RedocNormalizedOptions } from '../../services';
import { BaseMarkdownProps } from './Markdown';
export interface AdvancedMarkdownProps extends BaseMarkdownProps {
    htmlWrap?: (part: JSX.Element) => JSX.Element;
    parentId?: string;
}
export declare class AdvancedMarkdown extends React.Component<AdvancedMarkdownProps> {
    render(): React.JSX.Element;
    renderWithOptionsAndStore(options: RedocNormalizedOptions, store?: AppStore): React.JSX.Element[] | null;
}
