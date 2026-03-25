/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
} from "../error/ClientConfigurationError.js";
import { StringUtils } from "../utils/StringUtils.js";
import { IUri } from "./IUri.js";
import { AADAuthorityConstants, Constants } from "../utils/Constants.js";
import * as UrlUtils from "../utils/UrlUtils.js";

/**
 * Url object class which can perform various transformations on url strings.
 */
export class UrlString {
    // internal url string field
    private _urlString: string;
    public get urlString(): string {
        return this._urlString;
    }

    constructor(url: string) {
        this._urlString = url;
        if (!this._urlString) {
            // Throws error if url is empty
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.urlEmptyError
            );
        }

        if (!url.includes("#")) {
            this._urlString = UrlString.canonicalizeUri(url);
        }
    }

    /**
     * Ensure urls are lower case and end with a / character.
     * @param url
     */
    static canonicalizeUri(url: string): string {
        if (url) {
            let lowerCaseUrl = url.toLowerCase();

            if (StringUtils.endsWith(lowerCaseUrl, "?")) {
                lowerCaseUrl = lowerCaseUrl.slice(0, -1);
            } else if (StringUtils.endsWith(lowerCaseUrl, "?/")) {
                lowerCaseUrl = lowerCaseUrl.slice(0, -2);
            }

            if (!StringUtils.endsWith(lowerCaseUrl, "/")) {
                lowerCaseUrl += "/";
            }

            return lowerCaseUrl;
        }

        return url;
    }

    /**
     * Throws if urlString passed is not a valid authority URI string.
     */
    validateAsUri(): void {
        // Attempts to parse url for uri components
        let components;
        try {
            components = this.getUrlComponents();
        } catch (e) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.urlParseError
            );
        }

        // Throw error if URI or path segments are not parseable.
        if (!components.HostNameAndPort || !components.PathSegments) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.urlParseError
            );
        }

        // Throw error if uri is insecure.
        if (
            !components.Protocol ||
            components.Protocol.toLowerCase() !== "https:"
        ) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.authorityUriInsecure
            );
        }
    }

    /**
     * Given a url and a query string return the url with provided query string appended
     * @param url
     * @param queryString
     */
    static appendQueryString(url: string, queryString: string): string {
        if (!queryString) {
            return url;
        }

        return url.indexOf("?") < 0
            ? `${url}?${queryString}`
            : `${url}&${queryString}`;
    }

    /**
     * Returns a url with the hash removed
     * @param url
     */
    static removeHashFromUrl(url: string): string {
        return UrlString.canonicalizeUri(url.split("#")[0]);
    }

    /**
     * Given a url like https://a:b/common/d?e=f#g, and a tenantId, returns https://a:b/tenantId/d
     * @param href The url
     * @param tenantId The tenant id to replace
     */
    replaceTenantPath(tenantId: string): UrlString {
        const urlObject = this.getUrlComponents();
        const pathArray = urlObject.PathSegments;
        if (
            tenantId &&
            pathArray.length !== 0 &&
            (pathArray[0] === AADAuthorityConstants.COMMON ||
                pathArray[0] === AADAuthorityConstants.ORGANIZATIONS)
        ) {
            pathArray[0] = tenantId;
        }
        return UrlString.constructAuthorityUriFromObject(urlObject);
    }

    /**
     * Parses out the components from a url string.
     * @returns An object with the various components. Please cache this value insted of calling this multiple times on the same url.
     */
    getUrlComponents(): IUri {
        // https://gist.github.com/curtisz/11139b2cfcaef4a261e0
        const regEx = RegExp(
            "^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"
        );

        // If url string does not match regEx, we throw an error
        const match = this.urlString.match(regEx);
        if (!match) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.urlParseError
            );
        }

        // Url component object
        const urlComponents = {
            Protocol: match[1],
            HostNameAndPort: match[4],
            AbsolutePath: match[5],
            QueryString: match[7],
        } as IUri;

        let pathSegments = urlComponents.AbsolutePath.split("/");
        pathSegments = pathSegments.filter((val) => val && val.length > 0); // remove empty elements
        urlComponents.PathSegments = pathSegments;

        if (
            urlComponents.QueryString &&
            urlComponents.QueryString.endsWith("/")
        ) {
            urlComponents.QueryString = urlComponents.QueryString.substring(
                0,
                urlComponents.QueryString.length - 1
            );
        }
        return urlComponents;
    }

    static getDomainFromUrl(url: string): string {
        const regEx = RegExp("^([^:/?#]+://)?([^/?#]*)");

        const match = url.match(regEx);

        if (!match) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.urlParseError
            );
        }

        return match[2];
    }

    static getAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
        if (relativeUrl[0] === Constants.FORWARD_SLASH) {
            const url = new UrlString(baseUrl);
            const baseComponents = url.getUrlComponents();

            return (
                baseComponents.Protocol +
                "//" +
                baseComponents.HostNameAndPort +
                relativeUrl
            );
        }

        return relativeUrl;
    }

    static constructAuthorityUriFromObject(urlObject: IUri): UrlString {
        return new UrlString(
            urlObject.Protocol +
                "//" +
                urlObject.HostNameAndPort +
                "/" +
                urlObject.PathSegments.join("/")
        );
    }

    /**
     * Check if the hash of the URL string contains known properties
     * @deprecated This API will be removed in a future version
     */
    static hashContainsKnownProperties(response: string): boolean {
        return !!UrlUtils.getDeserializedResponse(response);
    }
}
