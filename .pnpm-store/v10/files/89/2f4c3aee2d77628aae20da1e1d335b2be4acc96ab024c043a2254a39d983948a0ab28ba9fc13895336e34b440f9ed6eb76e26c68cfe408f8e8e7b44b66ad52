import { type NodeType, listOf } from '.';

const Root: NodeType = {
  properties: {
    overlay: { type: 'string' },
    info: 'Info',
    extends: { type: 'string' },
    actions: 'Actions',
  },
  required: ['overlay', 'info', 'actions'],
  extensionsPrefix: 'x-',
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};

const Actions: NodeType = listOf('Action');
const Action: NodeType = {
  properties: {
    target: { type: 'string' },
    description: { type: 'string' },
    update: {}, // any
    remove: { type: 'boolean' },
  },
  required: ['target'],
  extensionsPrefix: 'x-',
};

export const Overlay1Types: Record<string, NodeType> = {
  Root,
  Info,
  Actions,
  Action,
};
