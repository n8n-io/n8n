import * as React from 'react';
import { DropdownOption, DropdownProps } from '../../common-elements';
import { MediaTypeModel } from '../../services/models';
export interface PayloadSamplesProps {
    mediaType: MediaTypeModel;
    renderDropdown: (props: DropdownProps) => JSX.Element;
}
interface MediaTypeSamplesState {
    activeIdx: number;
}
export declare class MediaTypeSamples extends React.Component<PayloadSamplesProps, MediaTypeSamplesState> {
    state: {
        activeIdx: number;
    };
    switchMedia: ({ idx }: DropdownOption) => void;
    render(): React.JSX.Element;
}
export {};
