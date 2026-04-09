import * as React from 'react';
import type { IMenuItem } from '../../services';
import { OperationModel } from '../../services';
export interface MenuItemProps {
    item: IMenuItem;
    onActivate?: (item: IMenuItem) => void;
    withoutChildren?: boolean;
    children?: React.ReactChild;
}
export declare class MenuItem extends React.Component<MenuItemProps> {
    ref: React.RefObject<HTMLLabelElement>;
    activate: (evt: React.MouseEvent<HTMLElement>) => void;
    componentDidMount(): void;
    componentDidUpdate(): void;
    scrollIntoViewIfActive(): void;
    render(): React.JSX.Element;
}
export interface OperationMenuItemContentProps {
    item: OperationModel;
    children?: React.ReactChild;
}
export declare const OperationMenuItemContent: (props: OperationMenuItemContentProps) => React.JSX.Element;
