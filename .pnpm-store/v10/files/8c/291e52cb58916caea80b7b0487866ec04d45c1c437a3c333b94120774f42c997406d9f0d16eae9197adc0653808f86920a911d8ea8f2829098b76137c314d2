export type CodeWalkthroughStepAttr = {
    id: string;
    title?: string;
    stepKey: number;
};
export type FilesetsMarkdocAttr = WithConditions<{
    files?: string[];
    downloadAssociatedFiles?: string[];
}>[];
export type InputsMarkdocAttr = {
    [id: string]: WithConditions<{
        value: string;
    }>;
};
export type TogglesMarkdocAttr = {
    [id: string]: CodeWalkthroughConditionsObject;
};
export type CodeWalkthroughConditions = {
    [key: string]: string | string[] | undefined | boolean;
};
export type CodeWalkthroughFileset = WithConditions<{
    files?: CodeWalkthroughFile[];
    downloadAssociatedFiles?: CodeWalkthroughFile[];
}>;
export type CodeWalkthroughAttr = {
    steps: CodeWalkthroughStepAttr[];
    filters: Record<string, CodeWalkthroughFilter>;
    filesets: CodeWalkthroughFileset[];
    preview: React.ReactNode[];
    inputs: InputsMarkdocAttr;
    toggles: TogglesMarkdocAttr;
    __idx: number;
};
export type CodeWalkthroughFile = {
    path: string;
    content: CodeWalkthroughNode[];
    basename: string;
    metadata: CodeWalkthroughFileMetadata;
    language: string;
};
export type CodeWalkthroughChunk = {
    start: number;
    children: CodeWalkthroughNode[];
    condition: CodeWalkthroughChunkCondition;
};
export type CodeWalkthroughChunkCondition = WithConditions<{
    steps: string[];
}>;
export type CodeWalkthroughNode = CodeWalkthroughChunk | string;
export type CodeWalkthroughFileMetadata = {
    steps: string[];
};
export type CodeWalkthroughFilter = WithConditions<{
    id: string;
    label?: string;
    items: CodeWalkthroughFilterItem[];
}>;
export type CodeWalkthroughFilterItem = WithConditions<{
    value: string;
}>;
export type CodeWalkthroughConditionsObject = {
    when?: CodeWalkthroughConditions;
    unless?: CodeWalkthroughConditions;
};
export type WithConditions<T> = T & CodeWalkthroughConditionsObject;
export type CodeWalkthroughControls = {
    toggle: boolean;
    input: string;
    filter: string;
};
export type CodeWalkthroughControlState = WithConditions<{
    value: string;
    render: boolean;
    type: 'input';
} | {
    value: string;
    render: boolean;
    type: 'filter';
} | {
    value: boolean;
    render: boolean;
    type: 'toggle';
}>;
export type CodeWalkthroughControlsState = Record<string, CodeWalkthroughControlState>;
