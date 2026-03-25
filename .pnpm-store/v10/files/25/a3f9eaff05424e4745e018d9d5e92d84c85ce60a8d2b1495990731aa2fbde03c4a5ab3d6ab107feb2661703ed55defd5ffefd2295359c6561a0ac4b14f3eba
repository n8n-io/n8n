/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseOperatingContext } from "../../operatingcontext/BaseOperatingContext.js";
import {
    CustomAuthBrowserConfiguration,
    CustomAuthConfiguration,
    CustomAuthOptions,
} from "../configuration/CustomAuthConfiguration.js";

export class CustomAuthOperatingContext extends BaseOperatingContext {
    private readonly customAuthOptions: CustomAuthOptions;
    private static readonly MODULE_NAME: string = "";
    private static readonly ID: string = "CustomAuthOperatingContext";

    constructor(configuration: CustomAuthConfiguration) {
        super(configuration);

        this.customAuthOptions = configuration.customAuth;
    }

    getModuleName(): string {
        return CustomAuthOperatingContext.MODULE_NAME;
    }

    getId(): string {
        return CustomAuthOperatingContext.ID;
    }

    getCustomAuthConfig(): CustomAuthBrowserConfiguration {
        return {
            ...this.getConfig(),
            customAuth: this.customAuthOptions,
        };
    }

    async initialize(): Promise<boolean> {
        this.available = typeof window !== "undefined";
        return this.available;
    }
}
