import * as React from 'react';
import { MenuStore } from '../../services/MenuStore';
import { RedocNormalizedOptions, RedocRawOptions } from '../../services/RedocNormalizedOptions';
import { OptionsContext } from '../OptionsProvider';
export interface StickySidebarProps {
    className?: string;
    scrollYOffset?: RedocRawOptions['scrollYOffset'];
    menu: MenuStore;
}
export interface StickySidebarState {
    offsetTop?: string;
}
export declare class StickyResponsiveSidebar extends React.Component<React.PropsWithChildren<StickySidebarProps>, StickySidebarState> {
    static contextType: React.Context<RedocNormalizedOptions>;
    context: React.ContextType<typeof OptionsContext>;
    state: StickySidebarState;
    stickyElement: Element;
    componentDidMount(): void;
    componentWillUnmount(): void;
    getScrollYOffset(options: RedocNormalizedOptions): string;
    render(): React.JSX.Element;
    private toggleNavMenu;
}
