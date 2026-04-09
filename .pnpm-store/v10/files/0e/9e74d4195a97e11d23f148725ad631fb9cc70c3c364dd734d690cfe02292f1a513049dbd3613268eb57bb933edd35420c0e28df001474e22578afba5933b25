import { capitalize } from './string.js';
export const regex = /^(?<core>\d+\.\d+\.\d+)(?:[-_](?<type>[^-_.]+)[-_.](?<pre>\d*(?:\.\d+)*))?/;
export function parse(full, stripCore) {
    const { type, pre, core } = regex.exec(full).groups;
    const display = type
        ? `${stripCore && core == '1.0.0' ? '' : core + ' '}${capitalize(type)}${pre ? ` ${pre}` : ''}`
        : core;
    return { full, core, pre, type, display };
}
