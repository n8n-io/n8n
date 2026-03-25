/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ICustomAuthApiClient } from "../network_client/custom_auth_api/ICustomAuthApiClient.js";
import { CustomAuthAuthority } from "../CustomAuthAuthority.js";
import { CustomAuthInteractionClientBase } from "./CustomAuthInteractionClientBase.js";
import { BrowserConfiguration } from "../../../config/Configuration.js";
import { BrowserCacheManager } from "../../../cache/BrowserCacheManager.js";
import {
    ICrypto,
    IPerformanceClient,
    Logger,
} from "@azure/msal-common/browser";
import { EventHandler } from "../../../event/EventHandler.js";
import { INavigationClient } from "../../../navigation/INavigationClient.js";

export class CustomAuthInterationClientFactory {
    constructor(
        private config: BrowserConfiguration,
        private storageImpl: BrowserCacheManager,
        private browserCrypto: ICrypto,
        private logger: Logger,
        private eventHandler: EventHandler,
        private navigationClient: INavigationClient,
        private performanceClient: IPerformanceClient,
        private customAuthApiClient: ICustomAuthApiClient,
        private customAuthAuthority: CustomAuthAuthority
    ) {}

    create<TClient extends CustomAuthInteractionClientBase>(
        clientConstructor: new (
            config: BrowserConfiguration,
            storageImpl: BrowserCacheManager,
            browserCrypto: ICrypto,
            logger: Logger,
            eventHandler: EventHandler,
            navigationClient: INavigationClient,
            performanceClient: IPerformanceClient,
            customAuthApiClient: ICustomAuthApiClient,
            customAuthAuthority: CustomAuthAuthority
        ) => TClient
    ): TClient {
        return new clientConstructor(
            this.config,
            this.storageImpl,
            this.browserCrypto,
            this.logger,
            this.eventHandler,
            this.navigationClient,
            this.performanceClient,
            this.customAuthApiClient,
            this.customAuthAuthority
        );
    }
}
