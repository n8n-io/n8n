import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './v1/actions/router';
import { versionDescription } from './v1/actions/versionDescription';

export class BambooHR implements INodeType {
  description: INodeTypeDescription;

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      ...versionDescription,
    };
  }

  async execute(this: IExecuteFunctions) {
    // Router returns INodeExecutionData[]
    // We need to output INodeExecutionData[][]
    // So we wrap in []
    return [await router.call(this)];
  }
}