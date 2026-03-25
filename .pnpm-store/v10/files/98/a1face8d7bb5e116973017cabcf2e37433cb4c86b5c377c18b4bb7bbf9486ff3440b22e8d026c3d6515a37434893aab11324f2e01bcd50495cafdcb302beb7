/// <reference types="node" />
import * as http from 'http';
import { OctokitOptions } from '@octokit/core/dist-types/types';
import { ProxyAgent, fetch } from 'undici';
export declare function getAuthString(token: string, options: OctokitOptions): string | undefined;
export declare function getProxyAgent(destinationUrl: string): http.Agent;
export declare function getProxyAgentDispatcher(destinationUrl: string): ProxyAgent | undefined;
export declare function getProxyFetch(destinationUrl: any): typeof fetch;
export declare function getApiBaseUrl(): string;
