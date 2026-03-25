import * as React from 'react';
import { MenuStore } from '../../services';
import type { IMenuItem } from '../../services';
import { OptionsContext } from '../OptionsProvider';
export declare class SideMenu extends React.Component<{
    menu: MenuStore;
    className?: string;
}> {
    static contextType: React.Context<import("../../services").RedocNormalizedOptions>;
    context: React.ContextType<typeof OptionsContext>;
    private _updateScroll?;
    render(): React.JSX.Element;
    activate: (item: IMenuItem) => void;
    private saveScrollUpdate;
}
