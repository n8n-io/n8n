import React from 'react';
import { type PipeableStream } from 'react-dom/server';
import StyleSheet from '../sheet';
export default class ServerStyleSheet {
    instance: StyleSheet;
    sealed: boolean;
    constructor();
    _emitSheetCSS: () => string;
    collectStyles(children: any): React.JSX.Element;
    getStyleTags: () => string;
    getStyleElement: () => React.JSX.Element[];
    interleaveWithNodeStream(input: NodeJS.ReadableStream | PipeableStream): NodeJS.ReadWriteStream;
    seal: () => void;
}
