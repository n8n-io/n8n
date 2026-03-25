/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class CustomAuthInterationClientFactory {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, customAuthApiClient, customAuthAuthority) {
        this.config = config;
        this.storageImpl = storageImpl;
        this.browserCrypto = browserCrypto;
        this.logger = logger;
        this.eventHandler = eventHandler;
        this.navigationClient = navigationClient;
        this.performanceClient = performanceClient;
        this.customAuthApiClient = customAuthApiClient;
        this.customAuthAuthority = customAuthAuthority;
    }
    create(clientConstructor) {
        return new clientConstructor(this.config, this.storageImpl, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.customAuthApiClient, this.customAuthAuthority);
    }
}

export { CustomAuthInterationClientFactory };
//# sourceMappingURL=CustomAuthInterationClientFactory.mjs.map
