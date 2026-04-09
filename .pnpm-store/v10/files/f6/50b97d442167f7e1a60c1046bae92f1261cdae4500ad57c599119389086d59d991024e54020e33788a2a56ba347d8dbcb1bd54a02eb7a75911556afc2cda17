"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Overlay1Types = void 0;
const _1 = require(".");
const Root = {
    properties: {
        overlay: { type: 'string' },
        info: 'Info',
        extends: { type: 'string' },
        actions: 'Actions',
    },
    required: ['overlay', 'info', 'actions'],
    extensionsPrefix: 'x-',
};
const Info = {
    properties: {
        title: { type: 'string' },
        version: { type: 'string' },
    },
    required: ['title', 'version'],
    extensionsPrefix: 'x-',
};
const Actions = (0, _1.listOf)('Action');
const Action = {
    properties: {
        target: { type: 'string' },
        description: { type: 'string' },
        update: {}, // any
        remove: { type: 'boolean' },
    },
    required: ['target'],
    extensionsPrefix: 'x-',
};
exports.Overlay1Types = {
    Root,
    Info,
    Actions,
    Action,
};
