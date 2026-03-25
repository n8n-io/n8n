/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity } from '@microsoft/agents-activity';
import { AuthConfiguration } from './authConfiguration';
import { Connections } from './connections';
import { MsalTokenProvider } from './msalTokenProvider';
import { JwtPayload } from 'jsonwebtoken';
export interface ConnectionMapItem {
    audience?: string;
    serviceUrl: string;
    connection: string;
}
export declare class MsalConnectionManager implements Connections {
    private _connections;
    private _connectionsMap;
    private _serviceConnectionConfiguration;
    private static readonly DEFAULT_CONNECTION;
    constructor(connectionsConfigurations?: Map<string, AuthConfiguration>, connectionsMap?: ConnectionMapItem[], configuration?: AuthConfiguration);
    /**
     * Get the OAuth connection for the agent.
     * @param connectionName The name of the connection.
     * @returns The OAuth connection for the agent.
     */
    getConnection(connectionName: string): MsalTokenProvider;
    /**
     * Get the default OAuth connection for the agent.
     * @returns The default OAuth connection for the agent.
     */
    getDefaultConnection(): MsalTokenProvider;
    /**
     * Finds a connection based on a map.
     *
     * @param identity - The identity.  Usually TurnContext.identity.
     * @param serviceUrl The service URL.
     * @returns The TokenProvider for the connection.
     *
     * @remarks
     * Example environment variables:
     * connectionsMap__0__connection=seviceConnection
     * connectionsMap__0__serviceUrl=http://*..botframework.com/*
     * connectionsMap__0__audience=optional
     * connectionsMap__1__connection=agentic
     * connectionsMap__1__serviceUrl=agentic
     *
     * ServiceUrl is:  A regex to match with, or "*" for any serviceUrl value.
     * Connection is: A name in the 'Connections' list.
     */
    getTokenProvider(identity: JwtPayload, serviceUrl: string): MsalTokenProvider;
    /**
     * Finds a connection based on an activity's blueprint.
     * @param identity - The identity.  Usually TurnContext.identity.
     * @param activity The activity.
     * @returns The TokenProvider for the connection.
     */
    getTokenProviderFromActivity(identity: JwtPayload, activity: Activity): MsalTokenProvider;
    /**
     * Get the default connection configuration for the agent.
     * @returns The default connection configuration for the agent.
     */
    getDefaultConnectionConfiguration(): AuthConfiguration;
    private applyConnectionDefaults;
}
