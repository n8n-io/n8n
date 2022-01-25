import { IExecuteFunctions } from 'n8n-core';

import { fetch } from 'cross-fetch';

import {
  IDataObject,
  ILoadOptionsFunctions,
  LoggerProxy as Logger,
  INodePropertyOptions,
  NodeApiError,
  JsonObject,
  INodeExecutionData,
  IHookFunctions,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export enum EventTypes {
  ALL = 'ALL', //All events for all objects.
  BROWSER_ALL = 'BROWSER_ALL', //A browser was created, deleted or updated.
  BROWSER_CREATE = 'BROWSER_CREATE ', //A browser was created.
  BROWSER_DELETE = 'BROWSER_DELETE ', //A browser was deleted.
  BROWSER_UPDATE = 'BROWSER_UPDATE ', //A browser was updated.
  CANVAS_ALL = 'CANVAS_ALL ', //A canvas was created, deleted or updated.
  CANVAS_CREATE = 'CANVAS_CREATE ', //A canvas was created.
  CANVAS_DELETE = 'CANVAS_DELETE ', //A canvas was deleted.
  CANVAS_UPDATE = 'CANVAS_UPDATE ', //A canvas was updated.
  COMMENT_ALL = 'COMMENT_ALL ', //A comment was created, deleted or updated.
  COMMENT_CREATE = 'COMMENT_CREATE ', //A comment was created.
  COMMENT_DELETE = 'COMMENT_DELETE ', //A comment was deleted.
  COMMENT_UPDATE = 'COMMENT_UPDATE ', //A comment was updated.
  DOCUMENT_ALL = 'DOCUMENT_ALL ', //A document was created, deleted or updated.
  DOCUMENT_CREATE = 'DOCUMENT_CREATE ', //A document was created.
  DOCUMENT_DELETE = 'DOCUMENT_DELETE ', //A document was deleted.
  DOCUMENT_UPDATE = 'DOCUMENT_UPDATE ', //A document was updated.
  IMAGE_ALL = 'IMAGE_ALL', //An image was created, deleted or updated.
  IMAGE_CREATE = 'IMAGE_CREATE ', //An image was created.
  IMAGE_DELETE = 'IMAGE_DELETE ', //An image was deleted.
  IMAGE_UPDATE = 'IMAGE_UPDATE ', //An image was updated.
  NOTE_ALL = 'NOTE_ALL ', //A note was created, deleted or updated.
  NOTE_CREATE = 'NOTE_CREATE ', //A note was created.
  NOTE_DELETE = 'NOTE_DELETE ', //A note was deleted.
  NOTE_UPDATE = 'NOTE_UPDATE ', //A note was updated.
  STROKE_ALL = 'STROKE_ALL ', //A stroke was created, deleted or updated.
  STROKE_CREATE = 'STROKE_CREATE ', //A stroke was created.
  STROKE_DELETE = 'STROKE_DELETE ', //A stroke was deleted.
  STROKE_UPDATE = 'STROKE_UPDATE ', //A stroke was updated.
  TEXT_ALL = 'TEXT_ALL ', //A text element was created, deleted or updated.
  TEXT_CREATE = 'TEXT_CREATE ', //A text element was created.
  TEXT_DELETE = 'TEXT_DELETE ', //A text element was deleted.
  TEXT_UPDATE = 'TEXT_UPDATE ', //A text element was updated.
}
/**
 * Make an authenticated Elementary API request to Bluescape.
 */
export async function bluescapeElementaryApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  endpoint: string,
  qs: IDataObject,
  body: IDataObject,
  token: string,
): Promise<any> {
  const baseUrl = await getElementaryBaseUrl.call(this);
  return bluescapeRequest.call(
    this,
    baseUrl,
    method,
    endpoint,
    qs,
    body,
    token,
  );
}

/**
 * Make an authenticated Listeners API request to Bluescape.
 */
export async function bluescapeListenersApiRequest(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  endpoint: string,
  qs: IDataObject,
  body: IDataObject,
  token: string,
): Promise<any> {
  const baseUrl = await getListenerAPIBaseUrl.call(this);
  return bluescapeRequest.call(
    this,
    baseUrl,
    method,
    endpoint,
    qs,
    body,
    token,
  );
}

async function bluescapeRequest(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  baseUrl: string,
  method: string,
  endpoint: string,
  qs: IDataObject,
  body: IDataObject,
  token: string,
): Promise<any> {
  // tslint:disable-line:no-any
  const options: OptionsWithUri = {
    headers: {
      'user-agent': 'n8n',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method,
    qs,
    body,
    uri: `${baseUrl}${endpoint}`,
    json: true,
  };

  if (!Object.keys(body).length) {
    delete options.body;
  }

  if (!Object.keys(qs).length) {
    delete options.qs;
  }

  try {
    Logger.info(`URI: ${options.uri}`);
    Logger.info(`Token: ${token}`);
    const res = await this.helpers.request!(options);

    Logger.info(`Result: ${JSON.stringify(res)}`);
    return res;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

/**
 * Retrieve the access token needed for every API request to Bluescape.
 */
export async function getAccessToken(
  this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<any> {
  // tslint:disable-line:no-any

  const credentials = (await this.getCredentials(
    'bluescapeAuthorization',
  )) as IDataObject;

  const options: OptionsWithUri = {
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(
          `${credentials.clientId}:${credentials.clientSecret}`,
        ).toString('base64'),
    },
    method: 'POST',
    form: {
      grant_type: 'client_credentials',
    },
    uri: await getTokenUrl.call(this),
    json: true,
  };

  try {
    const { access_token } = await this.helpers.request!(options);
    return access_token;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

/**
 * Retrieve the access token needed for every API request to Bluescape.
 */
export async function getLoginAccessToken(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
): Promise<any> {
  // tslint:disable-line:no-any

  const credentials = (await this.getCredentials(
    'bluescapeLogin',
  )) as IDataObject;

  const options: OptionsWithUri = {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    form: {
      email: credentials.login,
      password: credentials.password,
    },
    uri: await getLoginUrl.call(this),
    json: true,
  };
  try {
    const result = await fetch(await getLoginUrl.call(this), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.login,
        password: credentials.password,
      }),
    });
    Logger.info(`login result:${JSON.stringify(result)}`);
    if (result.status === 200) {
      const setCookie = result.headers.get('set-cookie');
      const accessToken = parseIdToken(setCookie);
      return accessToken;
    } else {
      // Currently this will be caught at the initialization phase (schema introspection stage)
      // and results in a retry cycle to see if identity-api can be reached a little later.
      throw new Error(
        `Failed to get access token from identity-api, httpStatusCode: ${result.status} - message: ${result.statusText}`,
      );
    }
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

/**
 * Return the access token URL based on the user's environment.
 */
async function getTokenUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
  const { domain } = (await this.getCredentials(
    'bluescapeAuthorization',
  )) as IDataObject;

  return `https://identity-api.${domain}/api/v2/oauth2/token`;
}

/**
 * Return the aLogin URL based on the user's environment.
 */
async function getLoginUrl(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
  const { domain } = (await this.getCredentials(
    'bluescapeLogin',
  )) as IDataObject;

  return `https://identity-api.${domain}/api/v2/authenticate`;
}

/**
 * Return the base Elementary API URL based on the user's environment.
 */
async function getElementaryBaseUrl(
  this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
  const { domain } = (await this.getCredentials(
    'bluescapeLogin',
  )) as IDataObject;

  return await `https://elementary.${domain}`;
}

/**
 * Return the base Listeners API URL based on the user's environment.
 */
async function getListenerAPIBaseUrl(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
  const { domain } = (await this.getCredentials(
    'bluescapeLogin',
  )) as IDataObject;

  return await `https://listener-api.${domain}`;
}

/**
 * Load a element so that it can be selected by name from a dropdown.
 */

export async function loadElement(
  this: ILoadOptionsFunctions,
  workspaceId: string,
  elementId: string,
) {
  const returnData: INodePropertyOptions[] = [];
  const token = await getAccessToken.call(this);
  const endpoint = `/v3/workspaces/${workspaceId}/elements/${elementId}`;

  const { data } = await bluescapeElementaryApiRequest.call(
    this,
    'GET',
    endpoint,
    {},
    {},
    token,
  );

  data.forEach(
    ({
      id,
      name,
      externalId,
    }: {
      id: string;
      name: string;
      externalId?: string;
    }) => {
      returnData.push({
        name: externalId || name || id,
        value: id,
      });
    },
  );

  return returnData;
}

export async function loadAllElements(
  this: ILoadOptionsFunctions,
  workspaceId: string,
) {
  const returnData: INodePropertyOptions[] = [];
  const token = await getLoginAccessToken.call(this);
  const endpoint = `/v3/workspaces/${workspaceId}/elements`;
  const { data } = await bluescapeElementaryApiRequest.call(
    this,
    'GET',
    endpoint,
    {},
    {},
    token,
  );

  data.forEach(
    ({
      id,
      name,
      externalId,
    }: {
      id: string;
      name: string;
      externalId?: string;
    }) => {
      returnData.push({
        name: externalId || name || id,
        value: id,
      });
    },
  );

  return returnData;
}

export const BASE_LISTENERS_ENDPOINT = `/api/v2/listeners`;

export async function loadAllListeners(
  this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  workspace_Id: string,
): Promise<any> {
  const returnData: {
    id: string;
    status: string;
    url: string;
    workspaceId: string;
  }[] = [];
  const token = await getLoginAccessToken.call(this);
  let endpoint = BASE_LISTENERS_ENDPOINT;
  const qs = { workspace_id: workspace_Id };
  do {
    const res = await bluescapeListenersApiRequest.call(
      this,
      'GET',
      endpoint,
      qs,
      {},
      token,
    );

    Logger.info(`loadAllListeners: ${JSON.stringify(res)}`);

    const listeners = res.listeners;

    const paging = res.paging;

    endpoint = paging?.next;

    listeners.listeners.forEach(
      ({
        id,
        status,
        url,
        workspaceId,
      }: {
        eventTypes: Array<string>;
        id: string;
        organizationId?: string;
        status: string;
        targetId?: string;
        targetType?: string;
        type: string;
        url: string;
        workspaceId: string;
      }) => {
        const listenerItem = {
          id,
          status,
          url,
          workspaceId,
        };
        returnData.push(listenerItem);
      },
    );
  } while (endpoint);

  return returnData;
}

interface Tuple {
  key: string;
  value: string;
}

function parseCookiePair(cookiePair: string): Tuple {
  let firstEq = cookiePair.indexOf('=');

  let cookieName, cookieValue;
  if (firstEq <= 0) {
    cookieName = '';
    cookieValue = cookiePair.trim();
  } else {
    cookieName = cookiePair.substr(0, firstEq).trim();
    cookieValue = cookiePair.substr(firstEq + 1).trim();
  }

  return {
    key: cookieName,
    value: cookieValue,
  };
}

function parseIdToken(
  str: string | null | undefined,
): string | null | undefined {
  if (!str) {
    return null;
  }

  const unparsed = str.trim();

  if (unparsed.length < 2) {
    return null;
  }

  const cookie_avs = unparsed.split(';');
  if (!cookie_avs) {
    return null;
  }
  while (cookie_avs.length) {
    const av = cookie_avs.shift()?.trim();
    if (av?.length === 0) {
      // happens if ";;" appears
      continue;
    }
    const av_sep = av ? av.indexOf('=') : -1;
    let av_key, av_value;

    if (av_sep === -1) {
      av_key = av ? av : '';
      av_value = null;
    } else {
      av_key = av?.substr(0, av_sep);
      av_value = av?.substr(av_sep + 1);
    }

    av_key = av_key?.trim().toLowerCase();

    if (av_value) {
      av_value = av_value.trim();
    }

    if (av_key === 'idtoken') {
      return av_value;
    }
  }
}
