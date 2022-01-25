import { IExecuteFunctions } from 'n8n-core';
import { LoggerProxy as Logger } from 'n8n-workflow';
import {
  IDataObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHookFunctions,
  IWebhookFunctions,
  IWebhookResponseData,
  NodeOperationError,
} from 'n8n-workflow';
import {
  elementFields,
  elementOperations,
  ElementUpdateFields,
} from './descriptions/OperationsDescription';
import { createUpdateElementFields } from './descriptions/CreateUpdateElementFieldsDescription';
import { CanvasCreateUpdateFields } from './descriptions/CreateUpdateCanvasFieldsDescription';
import { TextCreateUpdateFields } from './descriptions/CreateUpdateTextFieldsDescription';
import {
  ShapeCreateUpdateFields,
  ShapeStyleFields,
} from './descriptions/CreateUpdateShapeFieldsDescription';

import {
  loadAllListeners,
  BASE_LISTENERS_ENDPOINT,
  bluescapeListenersApiRequest,
  //getAccessToken,
  getLoginAccessToken,
  loadAllElements,
  loadElement,
} from './GenericFunctions';

import { isEmpty, partialRight } from 'lodash';

import { OptionsWithUri } from 'request';
import { regularShapeStyleFields } from './descriptions/RegularShapeStyleDescription';

export class BluescapeTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bluescape Triiger',
    name: 'bluescapeTriiger',
    icon: 'file:Bluescape.svg',
    group: ['trigger'],
    version: 1,
    description: 'Bluescape Evebts',
    defaults: {
      name: 'Bluescape',
      color: '#0073ff',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'bluescapeLogin',
        required: true,
      },
      // {
      // 	name: 'bluescapeAuthorization',
      // 	required: true,
      // },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Workspace Id',
        name: 'workspaceId',
        default: ' ',
        type: 'string',
        required: true,
      },
      {
        displayName: 'Event Types',
        name: 'eventTypes',
        type: 'multiOptions',
        placeholder: 'Event Types',
        required: true,
        default: [],
        options: [
          {
            //ALL
            name: 'ALL',
            value: 'WORKSPACE_ALL',
            description: 'All events for all objects.',
          },
          {
            //BROWSER
            name: 'BROWSER',
            value: 'BROWSER_ALL',
            description: 'A browser was created, deleted or updated.',
          },
          {
            //BROWSER CREATE
            name: 'BROWSER CREATE',
            value: 'BROWSER_CREATE',
            description: 'A browser was created.',
          },
          {
            //BROWSER UPDATE
            name: 'BROWSER UPDATE',
            value: 'BROWSER_UPDATE',
            description: 'A browser was updated.',
          },
          {
            //BROWSER DELETE
            name: 'BROWSER DELETE',
            value: 'BROWSER_DELETE',
            description: 'A browser was deleted.',
          },
          {
            //CANVAS
            name: 'CANVAS',
            value: 'CANVAS_ALL',
            description: 'A canvas was created, deleted or updated.',
          },
          {
            //CANVAS CREATE
            name: 'CANVAS CREATE',
            value: 'CANVAS_CREATE',
            description: 'A canvas was created.',
          },
          {
            //CANVAS UPDATE
            name: 'CANVAS UPDATE',
            value: 'CANVAS_UPDATE',
            description: 'A canvas was updated.',
          },
          {
            //CANVAS DELETE
            name: 'CANVAS DELETE',
            value: 'CANVAS_DELETE',
            description: 'A canvas was cdeleted.',
          },
          {
            //COMMENT
            name: 'COMMENT',
            value: 'COMMENT_ALL',
            description: 'A comment was created, deleted or updated.',
          },
          {
            //COMMENT CREATE
            name: 'COMMENT CREATE',
            value: 'COMMENT_CREATE',
            description: 'A comment was created.',
          },
          // {
          //   //COMMENT UPDATE
          //   name: 'COMMENT UPDATE',
          //   value: 'COMMENT_UPDATE',
          //   description: 'A comment was updated.',
          // },
          // {
          //   //COMMENT DELETE
          //   name: 'COMMENT DELETE',
          //   value: 'COMMENT_DELETE',
          //   description: 'A comment was deleted.',
          // },
          {
            //DOCUMENT
            name: 'DOCUMENT',
            value: 'DOCUMENT_ALL',
            description: 'A document was created, deleted or updated.',
          },
          {
            //DOCUMENT CREATE
            name: 'DOCUMENT CREATE',
            value: 'DOCUMENT_CREATE',
            description: 'A document was created.',
          },
          {
            //DOCUMENT UPDATE
            name: 'DOCUMENT UPDATE',
            value: 'DOCUMENT_UPDATE',
            description: 'A document was updated.',
          },
          {
            //DOCUMENT DELETE
            name: 'DOCUMENT DELETE',
            value: 'DOCUMENT_DELETE',
            description: 'A document was deleted.',
          },
          {
            //IMAGE
            name: 'IMAGE',
            value: 'IMAGE_ALL',
            description: 'An image was created, deleted or updated.',
          },
          {
            //IMAGE CREATE
            name: 'IMAGE CREATE',
            value: 'IMAGE_CREATE',
            description: 'An image was created.',
          },
          {
            //IMAGE UPDATE
            name: 'IMAGE UPDATE',
            value: 'IMAGE_UPDATE',
            description: 'An image updated.',
          },
          {
            //IMAGE DELETE
            name: 'IMAGE DELETE',
            value: 'IMAGE_DELETE',
            description: 'An image was deleted.',
          },
          {
            //NOTE
            name: 'NOTE',
            value: 'NOTE_ALL',
            description: 'A note was created, deleted or updated.',
          },
          {
            //NOTE CREATE
            name: 'NOTE CREATE',
            value: 'NOTE_CREATE',
            description: 'A note was created.',
          },
          {
            //NOTE UPDATE
            name: 'NOTE UPDATE',
            value: 'NOTE_UPDATE',
            description: 'A note was updated.',
          },
          {
            //NOTE DELETE
            name: 'NOTE DELETE',
            value: 'NOTE_DELETE',
            description: 'A note was deleted.',
          },
          {
            //STROKE
            name: 'STROKE',
            value: 'STROKE_ALL',
            description: 'A stroke was created, deleted or updated.',
          },
          {
            //STROKE CREATE
            name: 'STROKE CREATE',
            value: 'STROKE_CREATE',
            description: 'A stroke was created.',
          },
          {
            //STROKE UPDATE
            name: 'STROKE UPDATE',
            value: 'STROKE_UPDATE',
            description: 'A stroke was updated.',
          },
          {
            //STROKE DELETE
            name: 'STROKE',
            value: 'STROKE_DELETE',
            description: 'A stroke wasdeleted.',
          },
          {
            //TEXT
            name: 'TEXT',
            value: 'TEXT_ALL',
            description: 'A text element was created, deleted or updated.',
          },
          {
            //TEXT CREATE
            name: 'TEXT CREATE',
            value: 'TEXT_CREATE',
            description: 'A text element was created.',
          },
          {
            //TEXT UPDATE
            name: 'TEXT UPDATE',
            value: 'TEXT_UPDATE',
            description: 'A text element updated.',
          },
          {
            //TEXT DELETE
            name: 'TEXT DELETE',
            value: 'TEXT_DELETE',
            description: 'A text element deleted.',
          },
        ],
        description: 'Workspace content event source types to consume',
      },
      /*{
        displayName: 'Action Type',
        name: 'action',
        type: 'options',
        placeholder: 'Action Type Source',
        default: 'ALL',
        options: [
          {
            //ALL
            name: 'ALL',
            value: 'ALL',
            description: 'Any action.',
          },
          {
            //CREATE
            name: 'CREATE',
            value: 'CREATE',
            description: 'An elment create action.',
          },
          {
            //UPDATE
            name: 'UPDATE',
            value: 'UPDATE',
            description: 'An elment update action.',
          },
          {
            //DELETE
            name: 'DELETE',
            value: 'DELETE',
            description: 'An elment delete action.',
          },
        ],
        description: 'Workspace action types.',
      }, */
      {
        displayName: 'Add Fields',
        name: 'eventFields',
        type: 'collection',
        placeholder: 'Add fields',
        default: {},
        options: [
          {
            displayName: 'Organization Id',
            name: 'organizationId',
            type: 'string',
            default: '',
            description: 'Organization Id in Bluescape System.',
          },
          {
            displayName: 'Target Id',
            name: 'targetId',
            type: 'string',
            default: '',
            description: 'Element Id targeted to listen events.',
          },
        ],
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default') as string;
        Logger.info(`\nCheck Webhook exists: ${JSON.stringify(webhookUrl)}\n`);

        const webhookData = this.getWorkflowStaticData('node');

        const workspaceId = (
          this.getNodeParameter('workspaceId', 0) as string
        ).trim();

        const eventTypes = this.getNodeParameter('eventTypes') as string[];

        const listeners = await loadAllListeners.call(this, workspaceId);

        Logger.info(`\nCheck Webhook Response: ${JSON.stringify(listeners)}\n`);

        for (const listener of listeners) {
          Logger.info(
            `\n== Checking Listener: ${JSON.stringify(listener)}\n
						${listener} \n ${listener.json}\n
						listener.url = ${listener.url} ==> webhookUrl = ${webhookUrl}\n
            listener.workspaceId = ${
              listener.workspaceId
            } ==>  workspaceId = ${workspaceId}\n
            webhookData.webhookId = ${
              webhookData.webhookId
            } ==>  listener.id = ${listener.id} \n
						*************************************\n`,
          );
          if (
            listener.url === webhookUrl &&
            listener.workspaceId === workspaceId &&
            stringArraysEqual(eventTypes, listener.ty) === listener.eventTypes
          ) {
            webhookData.webhookId = listener.id;
            Logger.info(
              `\n***** Webhook exists!!! ID: ${webhookData.webhookId}\n`,
            );
            return true;
          }
        }
        Logger.info(`\n**** Webhook does NOT exist!!!\n`);
        return false;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default') as string;
        Logger.info(`\nCreating Webhook : ${JSON.stringify(webhookUrl)}\n`);

        const workspaceId = (
          this.getNodeParameter('workspaceId', 0) as string
        ).trim();

        const eventTypes = this.getNodeParameter('eventTypes') as string[];
        const additionalFields = this.getNodeParameter(
          'eventFields',
        ) as IDataObject;

        const endpoint = BASE_LISTENERS_ENDPOINT;

        const webhookData = this.getWorkflowStaticData('node');

        const body: ListenerData = {
          eventTypes: eventTypes,
          type: 'workspace',
          url: webhookUrl,
          workspaceId: workspaceId,
        };

        if (additionalFields.organizationId) {
          body.organizationId = additionalFields.organizationId as string;
        }

        if (additionalFields.targetId) {
          body.targetId = additionalFields.targetId as string;
        }

        Logger.info(`\nCreating Listener : ${JSON.stringify(body)}\n`);

        const token = await getLoginAccessToken.call(this);
        const responseData = await bluescapeListenersApiRequest.call(
          this,
          'POST',
          endpoint,
          {},
          body,
          token,
        );

        Logger.info(
          `\nCreated Webhook Response: ${JSON.stringify(responseData)}\n`,
        );

        webhookData.webhookId = responseData.listener?.id;

        Logger.info(`\n Webhook Id: ${webhookData.webhookId}\n`);

        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');

        if (webhookData.webhookId !== undefined) {
          const endpoint = `${BASE_LISTENERS_ENDPOINT}/${webhookData.webhookId}`;
          Logger.info(`\nDeleting Webhook Id: ${webhookData.webhookId}\n`);
          const body = {};
          const token = await getLoginAccessToken.call(this);

          try {
            await bluescapeListenersApiRequest.call(
              this,
              'DELETE',
              endpoint,
              {},
              body,
              token,
            );
          } catch (error) {
            Logger.info(
              `\nDeleting Webhook failed: ${JSON.stringify(error)}\n`,
            );
            return false;
          }
          // Remove from the static workflow data so that it is clear
          // that no webhooks are registred anymore
          Logger.info(`\nDeleted Webhook Id: ${webhookData.webhookId}\n`);
          delete webhookData.webhookId;
        }

        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();
    const queryData = this.getQueryData();

    Logger.info(`Webhook: ${JSON.stringify(bodyData)}`);

    if (bodyData.eventType == 'TEST_HOOK') {
      Logger.info(`Test event!!!`);
      return {};
    }

    Object.assign(bodyData, queryData);

    return {
      workflowData: [this.helpers.returnJsonArray(bodyData)],
    };
  }
}

function stringArraysEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  var sortedA: string[] = a.sort((e1, e2) => compare(e1, e2));
  var sortedB: string[] = b.sort((e1, e2) => compare(e1, e2));

  for (var i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

function compare(e1: string, e2: string): number {
  if (e1 > e2) {
    return 1;
  }
  if (e1 < e2) {
    return -1;
  }
  return 0;
}

interface ListenerData extends IDataObject {
  eventTypes: Array<string>;
  organizationId?: string;
  targetId?: string;
  type: string;
  url: string;
  workspaceId: string;
}
