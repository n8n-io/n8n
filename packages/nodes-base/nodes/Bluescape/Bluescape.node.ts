import { IExecuteFunctions } from 'n8n-core';
import { LoggerProxy as Logger } from 'n8n-workflow';
import {
  IDataObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
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
  bluescapeElementaryApiRequest,
  //getAccessToken,
  getLoginAccessToken,
  loadAllElements,
  loadElement,
} from './GenericFunctions';

import { isEmpty, partialRight } from 'lodash';

import { OptionsWithUri } from 'request';
import { regularShapeStyleFields } from './descriptions/RegularShapeStyleDescription';

export class Bluescape implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bluescape',
    name: 'bluescape',
    icon: 'file:Bluescape.svg',
    group: ['output'],
    version: 1,
    description: 'Consume Bluescape API',
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
    properties: [
      {
        displayName: 'Workspace Id',
        name: 'workspaceId',
        default: ' ',
        type: 'string',
        required: true,
      },
      {
        displayName: 'Workspace Content',
        name: 'content',
        type: 'options',
        placeholder: 'Content Type',
        default: 'elements',
        options: [
          {
            name: 'Asset',
            value: 'asset',
          },
          {
            name: 'Elements',
            value: 'elements',
          },
        ],
        description: 'Workspace content to consume',
      },
      ...elementOperations,
      ...elementFields,
      ...createUpdateElementFields,
    ],
  };

  methods = {
    loadOptions: {
      async getElement(this: ILoadOptionsFunctions) {
        console.log('loadOptions: getElement !');
        return [];
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];

    const content = this.getNodeParameter('content', 0) as string;
    Logger.info(`Content: ${content}`);
    const operation = content
      ? (this.getNodeParameter('operation', 0) as string)
      : 'none';

    let responseData;

    const token = await getLoginAccessToken.call(this);
    Logger.info(`Token: ${token}`);
    const bluescapeApiReqst = partialRight(
      bluescapeElementaryApiRequest,
      token,
    );
    const workspaceId = (
      this.getNodeParameter('workspaceId', 0) as string
    ).trim();
    // const endpoint = `/api/v3/workspaces/${workspaceId}/elements`;
    // responseData = await bluescapeApiReqst.call(this, 'GET', endpoint, {}, {});
    // responseData = responseData.data;
    Logger.info(`Operation: ${operation} Conetnt: ${content}`);
    if (isEmpty(items)) {
      Logger.info(`Items empty!`);
    } else {
      Logger.info(`Items: ${JSON.stringify(items)}`);
    }
    for (let i = 0; i < items.length; i++) {
      if (content === 'elements') {
        // *********************************************************************
        //       Elements
        // *********************************************************************

        if (operation === 'getAll') {
          // ----------------------------------
          //        element: get All
          // ----------------------------------
          const endpoint = `/api/v3/workspaces/${workspaceId}/elements`;
          responseData = await bluescapeApiReqst.call(
            this,
            'GET',
            endpoint,
            {},
            {},
          );
        } else if (operation === 'get') {
          // ----------------------------------
          //        element: get
          // ----------------------------------
          const elementId = this.getNodeParameter('elementId', i);
          const endpoint = `/api/v3/workspaces/${workspaceId}/elements/${elementId}`;
          responseData = await bluescapeApiReqst.call(
            this,
            'GET',
            endpoint,
            {},
            {},
          );
        } else if (operation === 'create') {
          // ----------------------------------
          //        element: create
          // ----------------------------------
          const elementType = this.getNodeParameter('elementType', i);
          Logger.info(`Preparing create ${elementType}`);
          const endpoint = `/api/v3/workspaces/${workspaceId}/elements`;

          const body = {
            name: undefined,
          } as IDataObject;
          const pinned = this.getNodeParameter('pinned', i) as boolean;
          if (pinned) {
            body.pinned = pinned;
          }
          const zIndex = this.getNodeParameter('zIndex', i, 0);
          if (zIndex) {
            body.zIndex = zIndex as number;
          }

          if (elementType == 'canvas') {
            // ----------------------------------
            //        element: create Canvas
            // ----------------------------------
            body.type = 'Canvas';
            const canvasFields = this.getNodeParameter(
              'canvasFields',
              i,
            ) as CanvasCreateUpdateFields;
            Logger.info(`Fields: ${JSON.stringify(canvasFields)}`);
            if (isEmpty(canvasFields)) {
              throw new NodeOperationError(
                this.getNode(),
                `Name field is required.`,
              );
            } else {
              const canvasName = canvasFields.name;
              if (canvasName === undefined) {
                throw new NodeOperationError(
                  this.getNode(),
                  `Name field is required.`,
                );
              }
              body.name = canvasName;
              if (canvasFields.style) {
                Logger.info(`Style: ${canvasFields.style}`);
                body.style = JSON.parse(canvasFields.style as string);
              }
              if (canvasFields.traits) {
                body.traits = JSON.parse(canvasFields.traits as string);
              }
              if (canvasFields.transform) {
                Logger.info(`Transform: ${canvasFields.transform}`);
                body.transform = JSON.parse(canvasFields.transform as string);
              }
            }
          } else if (elementType == 'text') {
            // ----------------------------------
            //        element: create Text
            // ----------------------------------
            body.type = 'Text';
            const textFields = this.getNodeParameter(
              'textFields',
              i,
            ) as TextCreateUpdateFields;
            Logger.info(`Fields: ${JSON.stringify(textFields)}`);
            if (!isEmpty(textFields)) {
              if (textFields.text) {
                body.text = textFields.text;
              }
              if (textFields.surface) {
                body.surface = textFields.surface;
              }
              if (textFields.blocks) {
                body.blocks = JSON.parse(textFields.blocks as string);
              }
              if (textFields.style) {
                body.style = JSON.parse(textFields.style as string);
              }
              if (textFields.traits) {
                body.traits = JSON.parse(textFields.traits as string);
              }
              if (textFields.transform) {
                body.transform = JSON.parse(textFields.transform as string);
              }
            }
          } else if (elementType == 'shape') {
            // ----------------------------------
            //        element: create Shape
            // ----------------------------------
            body.type = 'Shape';
            const shapeFields = this.getNodeParameter(
              'shapeFields',
              i,
            ) as ShapeCreateUpdateFields;
            Logger.info(`Fields: ${JSON.stringify(shapeFields)}`);
            if (isEmpty(shapeFields)) {
              throw new NodeOperationError(
                this.getNode(),
                `Please specify Shape kind.`,
              );
            } else {
              const sticky = this.getNodeParameter('sticky', i) as boolean;
              Logger.info(`Shape is sticky: ${sticky}`);
              if (shapeFields.text) {
                body.text = shapeFields.text;
              }
              if (shapeFields.surface) {
                body.surface = shapeFields.surface;
              }
              if (shapeFields.mirrorX) {
                body.mirrorX = shapeFields.mirrorX;
              }
              if (shapeFields.mirrorY) {
                body.mirrorY = shapeFields.mirrorY;
              }
              if (shapeFields.style) {
                const style = shapeFields.style;
                if (sticky) {
                  if (style.stickyShape) {
                    const stickyShape = style.stickyShape;
                    if (stickyShape.fillColor && stickyShape.fillColor.color) {
                      // Have to fix because of n8n UI
                      stickyShape.fillColor = stickyShape.fillColor.color;
                    }
                  }
                } else {
                  const regularShape = style.regularShape;
                  if (regularShape.fillColor && regularShape.fillColor.color) {
                    // Have to fix because of n8n UI
                    regularShape.fillColor = regularShape.fillColor.color;
                  }
                  if (
                    regularShape.strokeColor &&
                    regularShape.strokeColor.color
                  ) {
                    // Have to fix because of n8n UI
                    regularShape.strokeColor = regularShape.strokeColor.color;
                  }
                }
                body.style = style;
              } else {
                throw new NodeOperationError(
                  this.getNode(),
                  `Please specify Shape style.`,
                );
              }
              if (shapeFields.traits) {
                body.traits = JSON.parse(shapeFields.traits as string);
              }
              if (shapeFields.transform) {
                if (shapeFields.transform.translation) {
                  body.transform = shapeFields.transform.translation;
                }
              }
            }
          }
          Logger.info(
            `Making call create ${elementType} to ${endpoint} body: ${JSON.stringify(
              body,
            )}`,
          );
          responseData = await bluescapeApiReqst.call(
            this,
            'POST',
            endpoint,
            {},
            body,
          );
          Logger.info(`Call result: ${JSON.stringify(responseData)}`);
        } else if (operation === 'update') {
          // ----------------------------------
          //        element: update
          // ----------------------------------
          const elementType = this.getNodeParameter('elementType', i);
          Logger.info(`Preparing update ${elementType}`);
          const elementId = this.getNodeParameter('elementId', i);
          const endpoint = `/api/v3/workspaces/${workspaceId}/elements/${elementId}`;

          const body = {
            name: undefined,
          } as IDataObject;
          const pinned = this.getNodeParameter('pinned', i) as boolean;
          if (pinned) {
            body.pinned = pinned;
          }
          const zIndex = this.getNodeParameter('zIndex', i, 0);
          if (zIndex) {
            body.zIndex = zIndex as number;
          }

          if (elementType == 'canvas') {
            // ----------------------------------
            //        element: update Canvas
            // ----------------------------------
            body.type = 'Canvas';
            const canvasFields = this.getNodeParameter(
              'canvasFields',
              i,
            ) as CanvasCreateUpdateFields;
            Logger.info(`Fields: ${JSON.stringify(canvasFields)}`);
            if (isEmpty(canvasFields)) {
              throw new NodeOperationError(
                this.getNode(),
                `Name field is required.`,
              );
            } else {
              const canvasName = canvasFields.name;
              if (canvasName === undefined) {
                throw new NodeOperationError(
                  this.getNode(),
                  `Name field is required.`,
                );
              }
              body.name = canvasName;
              if (canvasFields.style) {
                Logger.info(`Style: ${canvasFields.style}`);
                body.style = JSON.parse(canvasFields.style as string);
              }
              if (canvasFields.traits) {
                body.traits = JSON.parse(canvasFields.traits as string);
              }
              if (canvasFields.transform) {
                Logger.info(`Transform: ${canvasFields.transform}`);
                body.transform = JSON.parse(canvasFields.transform as string);
              }
            }
          } else if (elementType == 'text') {
            // ----------------------------------
            //        element: update Text
            // ----------------------------------
            body.type = 'Text';
            const textFields = this.getNodeParameter(
              'textFields',
              i,
            ) as TextCreateUpdateFields;
            Logger.info(`Fields: ${JSON.stringify(textFields)}`);
            if (!isEmpty(textFields)) {
              if (textFields.text) {
                body.text = textFields.text;
              }
              if (textFields.surface) {
                body.surface = textFields.surface;
              }
              if (textFields.blocks) {
                body.blocks = JSON.parse(textFields.blocks as string);
              }
              if (textFields.style) {
                body.style = JSON.parse(textFields.style as string);
              }
              if (textFields.traits) {
                body.traits = JSON.parse(textFields.traits as string);
              }
              if (textFields.transform) {
                body.transform = JSON.parse(textFields.transform as string);
              }
            }
            Logger.info(`Text update body: ${JSON.stringify(body)}`);
          } else if (elementType == 'shape') {
            // ----------------------------------
            //        element: update Shape
            // ----------------------------------
            body.type = 'Shape';
            const shapeFields = this.getNodeParameter(
              'shapeFields',
              i,
            ) as ShapeCreateUpdateFields;
            Logger.info(`Fields: ${JSON.stringify(shapeFields)}`);
            if (isEmpty(shapeFields)) {
              throw new NodeOperationError(
                this.getNode(),
                `Please specify Shape kind.`,
              );
            } else {
              const sticky = this.getNodeParameter('sticky', i) as boolean;
              Logger.info(`Shape is sticky: ${sticky}`);
              if (shapeFields.text) {
                body.text = shapeFields.text;
              }
              if (shapeFields.surface) {
                body.surface = shapeFields.surface;
              }
              if (shapeFields.mirrorX) {
                body.mirrorX = shapeFields.mirrorX;
              }
              if (shapeFields.mirrorY) {
                body.mirrorY = shapeFields.mirrorY;
              }
              if (shapeFields.style) {
                const style = shapeFields.style;
                if (sticky) {
                  if (style.stickyShape) {
                    const stickyShape = style.stickyShape;
                    if (stickyShape.fillColor && stickyShape.fillColor.color) {
                      // Have to fix because of n8n UI
                      stickyShape.fillColor = stickyShape.fillColor.color;
                    }
                  }
                } else {
                  const regularShape = style.regularShape;
                  if (regularShape.fillColor && regularShape.fillColor.color) {
                    // Have to fix because of n8n UI
                    regularShape.fillColor = regularShape.fillColor.color;
                  }
                  if (
                    regularShape.strokeColor &&
                    regularShape.strokeColor.color
                  ) {
                    // Have to fix because of n8n UI
                    regularShape.strokeColor = regularShape.strokeColor.color;
                  }
                }
                body.style = style;
              } else {
                throw new NodeOperationError(
                  this.getNode(),
                  `Please specify Shape style.`,
                );
              }
              if (shapeFields.traits) {
                body.traits = JSON.parse(shapeFields.traits as string);
              }
              if (shapeFields.transform) {
                if (shapeFields.transform.translation) {
                  body.transform = shapeFields.transform.translation;
                }
              }
            }
          }
          Logger.info(
            `Making call update ${elementType} to ${endpoint} body: ${JSON.stringify(
              body,
            )}`,
          );
          responseData = await bluescapeApiReqst.call(
            this,
            'PATCH',
            endpoint,
            {},
            body,
          );
          Logger.info(`Call result: ${JSON.stringify(responseData)}`);
        }
      } else {
        responseData = { success: false, message: 'Not implemented yet.' };
      }

      Array.isArray(responseData)
        ? returnData.push(...responseData)
        : returnData.push(responseData);
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
