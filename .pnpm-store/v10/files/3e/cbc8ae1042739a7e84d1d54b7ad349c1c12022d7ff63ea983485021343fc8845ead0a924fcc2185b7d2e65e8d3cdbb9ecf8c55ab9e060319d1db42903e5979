/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type TokenResponse = {
    access_token: string;
    expires_in: number;
    id_token: string;
    properties: TokenResponseProperties | null;
    scope?: string;
    shr?: string; // token binding enabled at native layer it is the access token, not the signing keys
    extendedLifetimeToken?: boolean;
    authority?: string;
};

export type TokenResponseProperties = {
    MATS?: string;
};

/*
 * Sample response below
 * {
 * "body":{
 *   "access_token":"<token>",
 *      "account":{"environment":"login.microsoftonline.com",
 *        "homeAccountId":"2995ae49-d9dd-409d-8d62-ba969ce58a81.51178b70-16cc-41b5-bef1-ae1808139065",
 *        "idTokenClaims":{
 *          "aud":"a076930c-cfc9-4ebd-9607-7963bccbf666",
 *          "exp":"1680557128",
 *          "graph_url":"https://graph.microsoft.com",
 *          "iat":"1680553228",
 *          "iss":"https://login.microsoftonline.com/51178b70-16cc-41b5-bef1-ae1808139065/v2.0",
 *          "name":"Adele Vance",
 *          "nbf":"1680553228",
 *          "oid":"2995ae49-d9dd-409d-8d62-ba969ce58a81",
 *          "preferred_username":"AdeleV@vc6w6.onmicrosoft.com",
 *          "rh":"0.AX0AcIsXUcwWtUG-8a4YCBOQZQyTdqDJz71Olgd5Y7zL9maaAHs.",
 *          "sovereignty2":"Global",
 *          "sub":"wtxUI1WD2C--Bl8vN1p-P-VgadGud8QSqXD4Vp5i9sc",
 *          "tid":"51178b70-16cc-41b5-bef1-ae1808139065",
 *          "uti":"39pEKQyYDU6SXjD_phaCAA",
 *          "ver":"2.0"},
 *        "localAccountId":"2995ae49-d9dd-409d-8d62-ba969ce58a81",
 *        "name":"Adele Vance",
 *        "tenantId":"51178b70-16cc-41b5-bef1-ae1808139065",
 *        "username":"AdeleV@vc6w6.onmicrosoft.com"
 *   },
 *   "client_info":"",
 *   "expires_in":4290,
 *   "id_token":"",
 *   "properties":null,
 *   "scope":"User.Read",
 *   "state":""},
 * "requestId":"8863d6e8-a539-43e3-84b6-ca1bf64943f3",
 * "success":true}
 */
