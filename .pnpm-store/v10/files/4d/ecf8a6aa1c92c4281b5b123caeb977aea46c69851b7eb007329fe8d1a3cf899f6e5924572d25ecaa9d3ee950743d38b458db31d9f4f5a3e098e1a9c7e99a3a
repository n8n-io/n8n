import StyleSheet from '../sheet';
import { Keyframes as KeyframesType, Stringifier } from '../types';
export default class Keyframes implements KeyframesType {
    id: string;
    name: string;
    rules: string;
    constructor(name: string, rules: string);
    inject: (styleSheet: StyleSheet, stylisInstance?: Stringifier) => void;
    getName(stylisInstance?: Stringifier): string;
}
