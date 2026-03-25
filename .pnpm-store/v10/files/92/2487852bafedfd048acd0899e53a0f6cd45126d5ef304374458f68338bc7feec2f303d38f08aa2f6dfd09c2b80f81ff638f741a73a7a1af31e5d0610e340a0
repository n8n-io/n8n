import * as React from 'react';
import { DropdownOption, DropdownProps } from '../../common-elements/Dropdown';
import { MediaContentModel, MediaTypeModel, SchemaModel } from '../../services/models';
export interface MediaTypeChildProps {
    schema: SchemaModel;
    mime?: string;
}
export interface MediaTypesSwitchProps {
    content?: MediaContentModel;
    withLabel?: boolean;
    renderDropdown: (props: DropdownProps) => JSX.Element;
    children: (activeMime: MediaTypeModel) => JSX.Element;
}
export declare class MediaTypesSwitch extends React.Component<MediaTypesSwitchProps> {
    switchMedia: ({ idx }: DropdownOption) => void;
    render(): React.JSX.Element | null;
}
