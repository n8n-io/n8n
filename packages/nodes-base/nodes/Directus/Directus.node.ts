import { BINARY_ENCODING, IExecuteFunctions } from "n8n-core";

import {
  IBinaryData,
  IBinaryKeyData,
  IDataObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  //	NodeApiError,
  //	NodeOperationError,
  LoggerProxy as Logger,
} from "n8n-workflow";

import {
  directusApiRequest,
  //	directusApiRequestAllItems,
  directusApiAssetRequest,
  directusApiFileRequest,
  validateJSON,
} from "./GenericFunctions";

import { OptionsWithUri } from "request";

import {
  activityOperations,
  activityFields,
} from "./Descriptions/ActivityDescription";

import {
  assetsOperations,
  assetsFields,
} from "./Descriptions/AssetsDescription";

import { authOperations, authFields } from "./Descriptions/AuthDescription";

import {
  collectionsOperations,
  collectionsFields,
} from "./Descriptions/CollectionsDescription";

import {
  extensionsOperations,
  extensionsFields,
} from "./Descriptions/ExtensionsDescription";

import {
  fieldsOperations,
  fieldsFields,
} from "./Descriptions/FieldsDescription";

import { filesOperations, filesFields } from "./Descriptions/FilesDescription";

import {
  foldersOperations,
  foldersFields,
} from "./Descriptions/FoldersDescription";

import { itemsOperations, itemsFields } from "./Descriptions/ItemsDescription";

import {
  permissionsOperations,
  permissionsFields,
} from "./Descriptions/PermissionsDescription";

import {
  presetsOperations,
  presetsFields,
} from "./Descriptions/PresetsDescription";

import {
  relationsOperations,
  relationsFields,
} from "./Descriptions/RelationsDescription";

import {
  revisionsOperations,
  revisionsFields,
} from "./Descriptions/RevisionsDescription";

import { rolesOperations, rolesFields } from "./Descriptions/RolesDescription";

import {
  serverOperations,
  serverFields,
} from "./Descriptions/ServerDescription";

import {
  settingsOperations,
  settingsFields,
} from "./Descriptions/SettingsDescription";

import { usersOperations, usersFields } from "./Descriptions/UsersDescription";

import { utilsOperations, utilsFields } from "./Descriptions/UtilsDescription";

import {
  webhooksOperations,
  webhooksFields,
} from "./Descriptions/WebhooksDescription";

export class Directus implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Directus",
    name: "directus",
    icon: "file:directus.svg",
    group: ["transform"],
    version: 1,
    description: "Consume Directus API",
    subtitle: '={{$parameter["operation"] + " : " + $parameter["resource"]}}',
    defaults: {
      name: "Directus",
      color: "#2ECFA8",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "directusApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        options: [
          {
            name: "Activity",
            value: "activity",
          },
          {
            name: "Assets",
            value: "assets",
          },
          {
            name: "Authentication",
            value: "auth",
          },
          {
            name: "Collections",
            value: "collections",
          },
          {
            name: "Extensions",
            value: "extensions",
          },
          {
            name: "Fields",
            value: "fields",
          },
          {
            name: "Files",
            value: "files",
          },
          {
            name: "Folders",
            value: "folders",
          },
          {
            name: "Items",
            value: "items",
          },
          {
            name: "Permissions",
            value: "permissions",
          },
          {
            name: "Presets",
            value: "presets",
          },
          {
            name: "Relations",
            value: "relations",
          },
          {
            name: "Revisions",
            value: "revisions",
          },
          {
            name: "Roles",
            value: "roles",
          },
          {
            name: "Server",
            value: "server",
          },
          {
            name: "Settings",
            value: "settings",
          },
          {
            name: "Users",
            value: "users",
          },
          {
            name: "Utilities",
            value: "utils",
          },
          {
            name: "Webhooks",
            value: "webhooks",
          },
        ],
        default: "items",
        required: true,
        description: "Resource to consume",
      },

      // ACTIVITY
      ...activityOperations,
      ...activityFields,

      // ASSETS
      ...assetsOperations,
      ...assetsFields,

      // AUTH
      ...authOperations,
      ...authFields,

      // COLLECTIONS
      ...collectionsOperations,
      ...collectionsFields,

      // EXTENSIONS
      ...extensionsOperations,
      ...extensionsFields,

      // FIELDS
      ...fieldsOperations,
      ...fieldsFields,

      // FILES
      ...filesOperations,
      ...filesFields,

      // FOLDERS
      ...foldersOperations,
      ...foldersFields,

      // ITEMS
      ...itemsOperations,
      ...itemsFields,

      // PERMISSIONS
      ...permissionsOperations,
      ...permissionsFields,

      // PRESETS
      ...presetsOperations,
      ...presetsFields,

      // RELATIONS
      ...relationsOperations,
      ...relationsFields,

      // REVISIONS
      ...revisionsOperations,
      ...revisionsFields,

      // ROLES
      ...rolesOperations,
      ...rolesFields,

      // SERVER
      ...serverOperations,
      ...serverFields,

      // SETTINGS
      ...settingsOperations,
      ...settingsFields,

      // USERS
      ...usersOperations,
      ...usersFields,

      // UTILS
      ...utilsOperations,
      ...utilsFields,

      // WEBHOOKS
      ...webhooksOperations,
      ...webhooksFields,
    ],
  };

  methods = {
    loadOptions: {
      // Get all Collections
      async getCollections(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        try {
          const returnData: INodePropertyOptions[] = [];

          const collections = await directusApiRequest.call(
            this,
            "GET",
            "collections"
          );
          console.log("1. collections :");
          for (const collection of collections.data) {
            console.log(collection.collection);
            const name = collection.collection;
            const nameInCapital = name.charAt(0).toUpperCase() + name.slice(1);
            returnData.push({
              name: nameInCapital,
              value: name,
            });
          }
          return returnData;
        } catch (error) {
          //throw new NodeApiError(this.getNode(), error);
          throw new Error(error);
        }
      },
      // Get only user created Collections
      async getCustomCollections(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        try {
          const returnData: INodePropertyOptions[] = [];

          const collections = await directusApiRequest.call(
            this,
            "GET",
            "collections"
          );
          console.log("1. collections :");
          for (const collection of collections.data) {
            console.log(collection.collection);
            const name = collection.collection;
            const nameInCapital = name.charAt(0).toUpperCase() + name.slice(1);
            const isSystem = (collection.meta?.system ?? false) as boolean;
            if (!isSystem) {
              returnData.push({
                name: nameInCapital,
                value: name,
              });
            }
          }
          return returnData;
        } catch (error) {
          //throw new NodeApiError(this.getNode(), error);
          throw new Error(error);
        }
      },
      // Get Relational fields in a collection
      async getRelationalFields(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        try {
          const collection = this.getCurrentNodeParameter(
            "collection"
          ) as string;
          const returnData: INodePropertyOptions[] = [];

          const fields = await directusApiRequest.call(
            this,
            "GET",
            `relations/${collection}`
          );

          for (const fieldObject of fields.data) {
            //const nameInCapital = field.charAt(0).toUpperCase() + field.slice(1);
            returnData.push({
              name: fieldObject.field,
              value: fieldObject.field,
            });
          }
          return returnData;
        } catch (error) {
          //throw new NodeApiError(this.getNode(), error);
          throw new Error(error);
        }
      },
      // Get fields in a collection
      async getFieldsInCollection(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        try {
          const collection =
            (this.getCurrentNodeParameter("collection") as string) ??
            (`directus_${this.getNodeParameter("resource", 0)}` as string);
          const returnData: INodePropertyOptions[] = [];

          const fields = await directusApiRequest.call(
            this,
            "GET",
            `fields/${collection}`
          );

          for (const fieldObject of fields.data) {
            const nameInCapital =
              fieldObject.field.charAt(0).toUpperCase() +
              fieldObject.field.slice(1);
            returnData.push({
              name: nameInCapital,
              value: fieldObject.field,
            });
          }
          return returnData;
        } catch (error) {
          //throw new NodeApiError(this.getNode(), error);
          throw new Error(error);
        }
      },
      // Get User Roles
      async getRoles(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        try {
          const returnData: INodePropertyOptions[] = [];

          const roles = await directusApiRequest.call(this, "GET", `roles`);

          for (const roleObject of roles.data) {
            const nameInCapital =
              roleObject.name.charAt(0).toUpperCase() +
              roleObject.name.slice(1);
            returnData.push({
              name: nameInCapital,
              value: roleObject.id,
            });
          }
          return returnData;
        } catch (error) {
          //throw new NodeApiError(this.getNode(), error);
          throw new Error(error);
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    //return [[]];

    //Get credentials the user provided for this node
    const credentials = (await this.getCredentials(
      "directusApi"
    )) as unknown as IDataObject;

    const items = this.getInputData();
    const length = items.length as unknown as number;

    const returnItems: INodeExecutionData[] = [];
    const returnData: any = [];
    let responseData;

    let qs: IDataObject = {};
    let body: IDataObject = {};

    let returnAll = false;
    let endpoint = "";
    let requestMethod = "";

    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < length; i++) {
      if (resource === "activity") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              null;
            const fields = (additionalFields["fields"] as string) ?? {};
            const meta = (additionalFields["meta"] as string) ?? null;

            requestMethod = "GET";
            endpoint = `activity/${ID}`;

            let response;

            if (fields) qs["fields"] = meta;
            if (meta) qs["meta"] = meta;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;
            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            if (additionalFields && additionalFields.aggregate) {
              const aggregation = (additionalFields.aggregate as IDataObject)
                .aggregationFunctions as IDataObject[];
              if (aggregation) {
                aggregation.forEach((a) => {
                  qs[`aggregate[${a.name}]`] = a.value;
                });
              }
            }

            requestMethod = "GET";
            endpoint = `activity`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            const meta = (additionalFields["meta"] as string) ?? "";

            requestMethod = "POST";
            endpoint = `activity/comment`;

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              const collection = this.getNodeParameter(
                "collection",
                i
              ) as string;
              const comment = this.getNodeParameter("comment", i) as string;
              const item = this.getNodeParameter("item", i) as number;
              for (const key in additionalFields) {
                qs[key] = additionalFields[key];
              }
              body["comment"] = comment;
              body["collection"] = collection;
              body["item"] = item;
            }

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const comment = this.getNodeParameter("comment", i) as string;
            const ID = this.getNodeParameter("id", i) as number;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              {};
            const meta = (additionalFields["meta"] as string) ?? "";

            requestMethod = "PATCH";
            endpoint = `activity/comment/${ID}`;

            if (meta) qs["meta"] = meta;

            body["comment"] = comment;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `activity/comment/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "assets") {
        if (operation == "get") {
          try {
            const parametersAreJson = this.getNodeParameter(
              "jsonParameters",
              i
            ) as boolean;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};

            const ID = (this.getNodeParameter("id", i) as string) ?? null;
            const dataPropertyName = this.getNodeParameter(
              "binaryPropertyName",
              i
            ) as string;
            const includeFileData = this.getNodeParameter(
              "includeFileData",
              i
            ) as boolean;

            requestMethod = "GET";
            endpoint = `assets`;

            let response;

            if (ID) endpoint += `/${ID}`;

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                body = JSON.parse(queryParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key of Object.keys(additionalFields)) {
                if (key != "id" && key != "transforms")
                  qs[key] = additionalFields[key];
                if (key == "transforms") {
                  if (typeof additionalFields[key] == "string") {
                    qs[key] = JSON.parse(additionalFields[key] as string);
                  } else {
                    qs[key] = JSON.parse(JSON.stringify(additionalFields[key]));
                  }
                }
              }
            }

            response = await directusApiAssetRequest.call(
              this,
              requestMethod,
              endpoint,
              ID,
              dataPropertyName,
              qs
            );
            if (!includeFileData) delete response.json["file"];
            responseData = response;
            returnItems.push(responseData);
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "auth") {
        if (operation == "login") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            const email = !parametersAreJson
              ? (this.getNodeParameter("email", i) as string)
              : "";
            const password = !parametersAreJson
              ? (this.getNodeParameter("password", i) as string)
              : "";

            requestMethod = "POST";
            endpoint = `auth/login`;

            let response;

            if (parametersAreJson) {
              const data =
                (this.getNodeParameter("bodyParametersJson", i) as
                  | object
                  | string) ?? {};

              if (typeof data == "string") {
                body = JSON.parse(data);
              } else {
                body = JSON.parse(JSON.stringify(data));
              }
            } else {
              body["email"] = email;
              body["password"] = password;

              for (const key in additionalFields) {
                if (["fields"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    body[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    body[key] = JSON.stringify(object);
                  }
                } else {
                  body[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "logout") {
          try {
            const refreshToken = this.getNodeParameter("data", i) as string;

            requestMethod = "POST";
            endpoint = `auth/logout`;

            let response;
            body["refresh_token"] = refreshToken;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "refreshToken") {
          try {
            const refreshToken = this.getNodeParameter(
              "refreshToken",
              i
            ) as string;

            requestMethod = "POST";
            endpoint = `auth/refresh`;

            let response;
            body["refresh_token"] = refreshToken;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "requestReset") {
          try {
            const email = this.getNodeParameter("email", i) as string;

            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ||
              {};
            const resetUrl = (additionalFields?.["resetUrl"] as string) ?? null;

            requestMethod = "POST";
            endpoint = `auth/password/request`;

            let response;
            body["email"] = email;
            if (resetUrl) body["reset_url"] = resetUrl;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "resetPassword") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            //const additionalFields = !parametersAreJson ? (this.getNodeParameter('additionalFields', i) as IDataObject) : {};

            requestMethod = "POST";
            endpoint = `auth/password/reset`;

            let response;

            if (parametersAreJson) {
              const bodyParametersJson =
                (this.getNodeParameter("bodyParametersJson", i) as
                  | object
                  | string) ?? {};
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              const token = (this.getNodeParameter("token", i) as string) ?? "";
              const password =
                (this.getNodeParameter("password", i) as string) ?? "";

              body["token"] = token;
              body["password"] = password;
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            requestMethod = "GET";
            endpoint = `auth/oauth`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            console.log(response);

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            } else {
              returnItems.push({ json: responseData });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "startOauthFlow") {
          try {
            const provider = this.getNodeParameter("provider", i) as string;

            requestMethod = "GET";
            endpoint = `auth/oauth/${provider}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "collections") {
        if (operation == "get") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;

            requestMethod = "GET";
            endpoint = `collections/${collection}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            requestMethod = "GET";
            endpoint = `collections`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            } else {
              returnItems.push({ json: responseData });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const collection = !parametersAreJson
              ? (this.getNodeParameter("collection", i) as string)
              : null;

            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            const data = parametersAreJson
              ? (this.getNodeParameter("bodyParametersJson", i) as object)
              : {};

            requestMethod = "POST";
            endpoint = `collections`;

            if (parametersAreJson) {
              if (typeof data == "string") {
                body = JSON.parse(data);
              } else {
                body = JSON.parse(JSON.stringify(data));
              }
            } else {
              for (const key in data) {
                if (["fields"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    body[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    body[key] = JSON.stringify(object);
                  }
                } else {
                  body[key] = additionalFields[key];
                }
              }
              body["collection"] = collection;
            }
            let response;

            response =
              (await directusApiRequest.call(
                this,
                requestMethod,
                endpoint,
                body,
                qs
              )) ?? null;

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {} ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              {};
            const data = additionalFields["meta"] as object;

            requestMethod = "PATCH";
            endpoint = `collections/${collection}`;

            let response;
            if (typeof data == "string") {
              body["meta"] = JSON.parse(data);
            } else {
              body["meta"] = JSON.parse(JSON.stringify(data));
            }
            body["collection"] = collection;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;

            requestMethod = "DELETE";
            endpoint = `collections/${collection}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "extensions") {
        if (operation == "list") {
          try {
            const type = this.getNodeParameter("type", i) as string;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            requestMethod = "GET";
            endpoint = `extensions/${type}`;

            let response;
            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "fields") {
        if (operation === "create") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const parametersAreJson = this.getNodeParameter(
              "jsonParameters",
              0
            ) as boolean;

            const type = this.getNodeParameter("type", i) as string;
            const field = this.getNodeParameter("field", i) as string;

            requestMethod = "POST";
            endpoint = `fields/${collection}`;

            body = { type, field };

            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              null;

            for (const key of Object.keys(additionalFields)) {
              body[key] = additionalFields[key];
            }

            if (parametersAreJson) {
              const bodyParametersJson = additionalFields.bodyParametersJson as
                | object
                | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(body));
              }
            }

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response.data ?? {};

            //////////////////////////////////
            let timerLabel = `${resource} | ${operation}`;
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "get") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const field = this.getNodeParameter("field", i) as string;

            requestMethod = "GET";
            endpoint = `fields/${collection}/${field}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response.data ?? {};

            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "list") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            //returnAll = this.getNodeParameter('returnAll', i) as boolean ?? null;

            requestMethod = "GET";
            endpoint = `fields/${collection}`;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? null;
            /*
						const additionalFields =
							(this.getNodeParameter('additionalFields', i) as IDataObject) ??
							null;

						for (const key of Object.keys(additionalFields)) {
							qs[key] = additionalFields[key];
						}
						*/
            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            /* 
						if (returnAll === true) {
							qs.limit = -1;
						} else {
							qs.limit = this.getNodeParameter('limit', i) ? this.getNodeParameter('limit', i) as number : null;
						} 

						response = await directusApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
 */
            responseData = response.data ?? {};

            //////////////////////////////////
            let timerLabel = `${resource} | ${operation}`;
            console.log("Start");
            console.time(timerLabel);
            ////////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
                console.log("1.");
                console.log(index);
                console.timeLog(timerLabel);
              });
              console.log("2.");
              console.timeLog(timerLabel);
            } else {
              returnItems.push({ json: responseData });
              console.log("3.");
              console.timeLog(timerLabel);
            }
            console.log("End");
            console.timeEnd(timerLabel);
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "listAll") {
          try {
            requestMethod = "GET";
            endpoint = `fields`;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? null;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            responseData = response.data ?? {};

            //////////////////////////////////
            let timerLabel = `${resource} | ${operation}`;

            console.time(timerLabel);
            ////////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            } else {
              returnItems.push({ json: responseData });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "update") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            const field = this.getNodeParameter("field", i) as string;

            requestMethod = "PATCH";
            endpoint = `fields/${collection}/${field}`;

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              for (const key of Object.keys(additionalFields)) {
                body[key] = additionalFields[key];
              }
            }

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response.data ?? {};
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "delete") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const field = this.getNodeParameter("field", i) as string;

            requestMethod = "DELETE";
            endpoint = `fields/${collection}/${field}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response;
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "files") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `files/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? null;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? null;
            const parametersAreJson = this.getNodeParameter(
              "jsonParameters",
              i
            ) as boolean;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `files`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            for (const key of Object.keys(additionalFields)) {
              if (!["deep", "filter"].includes(key)) {
                qs[key] = additionalFields[key];
              } else {
                let data = additionalFields[key];

                if (data && typeof data == "string") {
                  qs[key] = JSON.parse(data);
                } else if (data && typeof data != "string") {
                  qs[key] = JSON.parse(JSON.stringify(data));
                } else {
                  qs[key] = "";
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            } else {
              returnItems.push({ json: responseData });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const sendBinaryData = this.getNodeParameter(
              "sendBinaryData",
              i
            ) as boolean;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              null;

            const data = additionalFields.data ?? ({} as object | string);

            requestMethod = "POST";
            endpoint = `files`;

            let response;

            if (sendBinaryData) {
              const item = items[i].binary as IBinaryKeyData;
              const binaryPropertyName =
                (this.getNodeParameter("binaryPropertyName", i) as string) ??
                null;
              const binaryData = item[binaryPropertyName] as IBinaryData;
              const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
                i,
                binaryPropertyName
              );

              const formData = {};
              Object.assign(formData, {
                file: {
                  value: binaryDataBuffer,
                  options: {
                    filename: binaryData.fileName,
                    contentType: binaryData.mimeType,
                  },
                },
              });

              if (data && typeof data == "string") {
                body = JSON.parse(data);
              } else if (data && typeof data != "string") {
                body = JSON.parse(JSON.stringify(data));
              } else {
                body = {};
              }

              response = await directusApiFileRequest.call(
                this,
                requestMethod,
                endpoint,
                formData,
                body
              );
            } else {
              if (data && typeof data == "string") {
                body = JSON.parse(data);
              } else if (data && typeof data != "string") {
                body = JSON.parse(JSON.stringify(data));
              } else {
                body = {};
              }

              response = await directusApiRequest.call(
                this,
                requestMethod,
                endpoint,
                body
              );
            }

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = JSON.parse(JSON.stringify(response)).data;
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "importFile") {
          try {
            const URL = this.getNodeParameter("url", i) as string;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              null;
            const data = (additionalFields?.data as object | string) ?? null;

            requestMethod = "POST";
            endpoint = `files/import`;

            let response;
            if (typeof data == "string") {
              body["data"] = JSON.parse(data);
              body["url"] = URL;
            } else if (data && typeof data != "string") {
              body["data"] = JSON.parse(JSON.stringify(data));
              body["url"] = URL;
            } else {
              body["url"] = URL;
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const sendBinaryData = this.getNodeParameter(
              "sendBinaryData",
              i
            ) as boolean;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              null;

            const data = additionalFields.data ?? ({} as object | string);

            requestMethod = "PATCH";
            endpoint = `files/${ID}`;

            let response;

            if (sendBinaryData) {
              const item = items[i].binary as IBinaryKeyData;
              const binaryPropertyName =
                (this.getNodeParameter("binaryPropertyName", i) as string) ??
                null;
              const binaryData = item[binaryPropertyName] as IBinaryData;
              const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
                i,
                binaryPropertyName
              );

              const formData = {};
              Object.assign(formData, {
                file: {
                  value: binaryDataBuffer,
                  options: {
                    filename: binaryData.fileName,
                    contentType: binaryData.mimeType,
                  },
                },
              });

              if (data && typeof data == "string") {
                body = JSON.parse(data);
              } else if (data && typeof data != "string") {
                body = JSON.parse(JSON.stringify(data));
              } else {
                body = {};
              }

              response = await directusApiFileRequest.call(
                this,
                requestMethod,
                endpoint,
                formData,
                body
              );
            } else {
              if (data && typeof data == "string") {
                body = JSON.parse(data);
              } else if (data && typeof data != "string") {
                body = JSON.parse(JSON.stringify(data));
              } else {
                body = {};
              }

              response = await directusApiRequest.call(
                this,
                requestMethod,
                endpoint,
                body
              );
            }

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = JSON.parse(JSON.stringify(response)).data;
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `files`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `files/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("keys", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `files`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "folders") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `folders/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `folders`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const queryParametersJson =
                (this.getNodeParameter("queryParametersJson", i) as
                  | object
                  | string) ?? {};
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              //const data = binaryData!.toString('base64');
              //binary = { [binaryPropertyName]: {data,fileName,mimeType} as IBinaryData } as IBinaryKeyData;
              //binary: IBinaryKeyData = {};
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            const name = !parametersAreJson
              ? (this.getNodeParameter("name", i) as string)
              : "";
            const parent = (additionalFields?.["parent"] as string) ?? "";
            const data =
              (additionalFields["bodyParametersJson"] as object) ?? {};

            requestMethod = "POST";
            endpoint = `folders`;

            if (parametersAreJson) {
              const data = this.getNodeParameter("bodyParametersJson", i) as
                | object
                | string;
              if (typeof data == "string") {
                body = JSON.parse(data);
              } else {
                body = JSON.parse(JSON.stringify(data));
              }
            } else {
              body["name"] = name;
              for (const key in additionalFields) {
                body[key] = additionalFields[key];
              }
            }

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `folders`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};

            requestMethod = "PATCH";
            endpoint = `folders/${ID}`;

            let response;

            if (parametersAreJson) {
              const bodyParametersJson =
                (this.getNodeParameter("bodyParametersJson", i) as
                  | object
                  | string) ?? {};
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    body[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    body[key] = JSON.stringify(object);
                  }
                } else {
                  body[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `folders`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `folders/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("keys", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `folders`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "items") {
        if (operation == "get") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `items/${collection}/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;

            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `items/${collection}`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `items/${collection}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `items/${collection}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `items/${collection}/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `items/${collection}/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `items/${collection}/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `items/${collection}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "permissions") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `permissions/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `permissions`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////

            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////

            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;

            requestMethod = "POST";
            endpoint = `permissions`;

            let response;

            if (parametersAreJson) {
              const data = this.getNodeParameter("bodyParametersJson", i) as
                | object
                | string;
              if (typeof data == "string") {
                body = JSON.parse(data);
              } else {
                body = JSON.parse(JSON.stringify(data));
              }
            } else {
              const action = this.getNodeParameter("collection", i) as string;
              const collection = this.getNodeParameter(
                "collection",
                i
              ) as string;
              body["collection"] = collection;
              body["action"] = action;
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `permissions`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `permissions/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `permissions`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `permissions/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("keys", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `permissions`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "presets") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `presets/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `presets`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////

            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////

            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;

            requestMethod = "POST";
            endpoint = `presets`;

            let response;

            const data = this.getNodeParameter("bodyParametersJson", i) as
              | object
              | string;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `presets`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `presets/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `presets`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `presets/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("keys", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `presets`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "relations") {
        if (operation === "create") {
          try {
            const data =
              (this.getNodeParameter("data", i) as object | string) ?? {};

            requestMethod = "POST";
            endpoint = `relations`;

            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response.data ?? {};

            //////////////////////////////////
            let timerLabel = `${resource} | ${operation}`;
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "get") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const field = this.getNodeParameter("field", i) as string;

            requestMethod = "GET";
            endpoint = `relations/${collection}/${field}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response.data ?? {};

            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "list") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;

            requestMethod = "GET";
            endpoint = `relations/${collection}`;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? null;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            responseData = response.data ?? {};

            //////////////////////////////////
            let timerLabel = `${resource} | ${operation}`;
            console.log("Start");
            console.time(timerLabel);
            ////////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            } else {
              returnItems.push({ json: responseData });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "listAll") {
          try {
            requestMethod = "GET";
            endpoint = `relations`;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? null;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            responseData = response.data ?? {};

            ////////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                returnItems.push({ json: item });
              });
            } else {
              returnItems.push({ json: responseData });
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "update") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const field = this.getNodeParameter("field", i) as string;
            const data =
              (this.getNodeParameter("data", i) as object | string) ?? {};

            requestMethod = "PATCH";
            endpoint = `relations/${collection}/${field}`;

            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response.data ?? {};
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation === "delete") {
          try {
            const collection = this.getNodeParameter("collection", i) as string;
            const field = this.getNodeParameter("field", i) as string;

            requestMethod = "DELETE";
            endpoint = `relations/${collection}/${field}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            responseData = response;
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "revisions") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `revisions/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `revisions`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "roles") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `roles/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `roles`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////

            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////

            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;

            requestMethod = "POST";
            endpoint = `roles`;

            let response;

            const data = this.getNodeParameter("bodyParametersJson", i) as
              | object
              | string;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `roles`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `roles/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `roles`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `roles/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("keys", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `roles`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "server") {
        if (operation == "systemInfo") {
          try {
            requestMethod = "GET";
            endpoint = `server/info`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "pingServer") {
          try {
            requestMethod = "GET";
            endpoint = `server/ping`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response;
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "getGraphQL") {
          try {
            requestMethod = "GET";
            endpoint = `server/specs/graphql`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response;
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "getOpenAPI") {
          try {
            requestMethod = "GET";
            endpoint = `server/specs/oas`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response;
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "serverHealth") {
          try {
            requestMethod = "GET";
            endpoint = `server/health`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response;
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "settings") {
        if (operation == "get") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};

            requestMethod = "GET";
            endpoint = `settings`;

            let response;

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////

            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////

            if (Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
            const data =
              (this.getNodeParameter("data", i) as object | string) ?? {};

            requestMethod = "PATCH";
            endpoint = `settings`;

            let response;
            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "users") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `users/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `users`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};

            requestMethod = "POST";
            endpoint = `users`;

            let response;

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    body[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    body[key] = JSON.stringify(object);
                  }
                } else {
                  body[key] = additionalFields[key];
                }
              }
              body["email"] = this.getNodeParameter("email", i) as string;
              body["password"] = this.getNodeParameter("password", i) as string;
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `users`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `users/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `users`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `users/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("keys", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `users`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "getCurrent") {
          try {
            requestMethod = "GET";
            endpoint = `users/me`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMe") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `users/me`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "inviteUser") {
          try {
            const email = this.getNodeParameter("email", i) as string;
            const role = this.getNodeParameter("role", i) as string;
            const additionalFields =
              (this.getNodeParameter("additionalFields", i) as IDataObject) ??
              {};

            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `users/invite`;

            let response;

            for (const key in additionalFields) {
              if (["deep", "filter"].includes(key)) {
                let object = additionalFields[key] as object | string;
                if (typeof object == "string") {
                  body[key] = JSON.stringify(JSON.parse(object)) as string;
                } else {
                  body[key] = JSON.stringify(object);
                }
              } else {
                body[key] = additionalFields[key];
              }
            }
            body["email"] = email;
            body["role"] = role;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "acceptUserInvite") {
          try {
            const token = this.getNodeParameter("token", i) as string;
            const password = this.getNodeParameter("password", i) as string;

            requestMethod = "POST";
            endpoint = `users/invite/accept`;

            let response;
            body = { token, password };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "generate2FA") {
          try {
            const password = this.getNodeParameter("password", i) as string;

            requestMethod = "POST";
            endpoint = `users/me/tfa/generate`;

            let response;
            body = { password };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "enable2FA") {
          try {
            const secret = this.getNodeParameter("secret", i) as string;
            const otp = this.getNodeParameter("otp", i) as string;

            requestMethod = "POST";
            endpoint = `users/me/tfa/enable`;

            let response;
            body = { secret, otp };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "disable2FA") {
          try {
            const otp = this.getNodeParameter("otp", i) as string;

            requestMethod = "POST";
            endpoint = `users/me/tfa/disable`;

            let response;
            body = { otp };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "utils") {
        if (operation == "clearCache") {
          try {
            requestMethod = "POST";
            endpoint = `utils/cache/clear`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }

            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "generateHash") {
          try {
            const String = this.getNodeParameter("string", i) as string;

            requestMethod = "POST";
            endpoint = `utils/hash/generate`;

            let response;
            body = { string: String };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            console.log({ response });

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "getRandomString") {
          try {
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i
            ) as IDataObject;
            const length = (additionalFields?.["length"] as number) ?? null;

            requestMethod = "GET";
            endpoint = `utils/random/string`;

            let response;

            if (length) qs = { length };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }

            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "verfiyHash") {
          try {
            const String = this.getNodeParameter("string", i) as string;
            const hash = this.getNodeParameter("hash", i) as string;

            requestMethod = "POST";
            endpoint = `utils/hash/verify`;

            let response;
            body = {
              hash,
              string: String,
            };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            console.log(typeof response);
            console.log(response);

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }

            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "sortItems") {
          try {
            const item = this.getNodeParameter("item", i) as number;
            const to = this.getNodeParameter("to", i) as number;
            const collection = this.getNodeParameter("collection", i) as string;

            requestMethod = "POST";
            endpoint = `utils/sort/${collection}`;

            let response;
            body = { item, to };

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }

            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "importFileData") {
          try {
            const sendBinaryData = true; //this.getNodeParameter( 'sendBinaryData', i ) as boolean;
            const collection = this.getNodeParameter("collection", i) as string;

            requestMethod = "POST";
            endpoint = `utils/import/${collection}`;

            let response;

            if (sendBinaryData) {
              const item = items[i].binary as IBinaryKeyData;
              const binaryPropertyName =
                (this.getNodeParameter("binaryPropertyName", i) as string) ??
                null;
              const binaryData = item[binaryPropertyName] as IBinaryData;
              const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
                i,
                binaryPropertyName
              );

              const formData = {};
              Object.assign(formData, {
                file: {
                  value: binaryDataBuffer,
                  options: {
                    filename: binaryData.fileName,
                    contentType: binaryData.mimeType,
                  },
                },
              });

              response = await directusApiFileRequest.call(
                this,
                requestMethod,
                endpoint,
                formData,
                body
              );
            }

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = JSON.parse(JSON.stringify(response)).data;
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }

            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
      if (resource === "webhooks") {
        if (operation == "get") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "GET";
            endpoint = `webhooks/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "list") {
          try {
            returnAll =
              (this.getNodeParameter("returnAll", i) as boolean) ?? false;

            const splitIntoItems =
              (this.getNodeParameter("splitIntoItems", i) as boolean) ?? false;

            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;
            const additionalFields = !parametersAreJson
              ? (this.getNodeParameter("additionalFields", i) as IDataObject)
              : {};
			  if(additionalFields && additionalFields.aggregate){
				  const aggregation = (additionalFields.aggregate as IDataObject).aggregationFunctions as IDataObject[];
				  if(aggregation){
					  aggregation.forEach(a => {
						  qs[`aggregate[${a.name}]`] = a.value;
					  })
				  }
			  }

            requestMethod = "GET";
            endpoint = `webhooks`;

            let response;

            if (!parametersAreJson && returnAll === true) {
              qs.limit = -1;
            } else if (!parametersAreJson) {
              qs.limit =
                this.getNodeParameter("limit", i) != undefined
                  ? (this.getNodeParameter("limit", i) as number)
                  : 10;
            } else {
              qs.limit = null;
            }

            if (parametersAreJson) {
              const queryParametersJson = this.getNodeParameter(
                "queryParametersJson",
                i
              ) as object | string;
              if (typeof queryParametersJson == "string") {
                qs = JSON.parse(queryParametersJson);
              } else {
                qs = JSON.parse(JSON.stringify(queryParametersJson));
              }
            } else {
              for (const key in additionalFields) {
                if (["deep", "filter"].includes(key)) {
                  let object = additionalFields[key] as object | string;
                  if (typeof object == "string") {
                    qs[key] = JSON.stringify(JSON.parse(object)) as string;
                  } else {
                    qs[key] = JSON.stringify(object);
                  }
                } else {
                  qs[key] = additionalFields[key];
                }
              }
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );

            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            const exportType = (additionalFields.export as string) ?? null;
            let binary: IBinaryKeyData = {};
            if (exportType) {
              const binaryPropertyName =
                (additionalFields.binaryPropertyName as string) || "data";
              let fileName = (additionalFields.fileName as string) || "export";
              let binaryData: Buffer, mimeType, fileExtension;

              if (exportType == "json") {
                binaryData = Buffer.from(JSON.stringify(response));
                mimeType = "application/json";
                fileExtension = "json";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "csv") {
                binaryData = Buffer.from(response);
                mimeType = "text/csv";
                fileExtension = "csv";
                fileName = `${fileName}.${fileExtension}`;
              } else if (exportType == "xml") {
                binaryData = Buffer.from(response);
                mimeType = "application/xml";
                fileExtension = "xml";
                fileName = `${fileName}.${fileExtension}`;
              } else {
                binaryData = Buffer.alloc(0);
                mimeType = "";
              }
              binary![binaryPropertyName] =
                await this.helpers.prepareBinaryData(
                  binaryData,
                  fileName,
                  mimeType
                );
            }
            //////////////////////////////////
            if (splitIntoItems === true && Array.isArray(responseData)) {
              responseData.forEach((item, index) => {
                if (exportType) {
                  returnItems.push({ json: item, binary });
                } else {
                  returnItems.push({ json: item });
                }
              });
            } else {
              if (exportType) {
                returnItems.push({ json: responseData, binary });
              } else {
                returnItems.push({ json: responseData });
              }
            }
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "create") {
          try {
            const parametersAreJson =
              (this.getNodeParameter("jsonParameters", i) as boolean) ?? false;

            requestMethod = "POST";
            endpoint = `webhooks`;

            let response;

            if (parametersAreJson) {
              const bodyParametersJson = this.getNodeParameter(
                "bodyParametersJson",
                i
              ) as object | string;
              if (typeof bodyParametersJson == "string") {
                body = JSON.parse(bodyParametersJson);
              } else {
                body = JSON.parse(JSON.stringify(bodyParametersJson));
              }
            } else {
              const name = this.getNodeParameter("name", i) as string;
              const url = this.getNodeParameter("url", i) as string;
              const actions = this.getNodeParameter("actions", i) as
                | object
                | string;
              const collections = this.getNodeParameter("collections", i) as
                | object
                | string;
              console.log({ name, url, actions, collections });

              if (typeof actions == "string") {
                body["actions"] = JSON.parse(actions);
              } else {
                body["actions"] = JSON.parse(JSON.stringify(actions));
              }
              if (typeof collections == "string") {
                body["collections"] = JSON.parse(collections);
              } else {
                body["collections"] = JSON.parse(JSON.stringify(collections));
              }
              body["name"] = name;
              body["url"] = url;
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "createMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "POST";
            endpoint = `webhooks`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "update") {
          try {
            const ID = this.getNodeParameter("id", i) as string;
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `webhooks/${ID}`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "updateMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "PATCH";
            endpoint = `webhooks`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "delete") {
          try {
            const ID = this.getNodeParameter("id", i) as string;

            requestMethod = "DELETE";
            endpoint = `webhooks/${ID}`;

            let response;

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
        if (operation == "deleteMultiple") {
          try {
            const data = this.getNodeParameter("data", i) as object | string;

            requestMethod = "DELETE";
            endpoint = `webhooks`;

            let response;
            if (typeof data == "string") {
              body = JSON.parse(data);
            } else {
              body = JSON.parse(JSON.stringify(data));
            }

            response = await directusApiRequest.call(
              this,
              requestMethod,
              endpoint,
              body,
              qs
            );
            if (typeof response != "object") {
              responseData = { response };
            } else {
              responseData = response.data ?? {};
              if (
                ["string", "number", "boolean"].includes(typeof responseData)
              ) {
                let temp = responseData;
                responseData = { result: temp };
              }
            }
            //////////////////////////////////
            returnItems.push({ json: responseData });
          } catch (error) {
            if (this.continueOnFail()) {
              returnItems.push({ json: { error: error.message } });
              continue;
            }
            throw error;
          }
        }
      }
    }
    return this.prepareOutputData(returnItems);
  }
}
