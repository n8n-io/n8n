/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ManagedIdentityErrorCodes,
    createManagedIdentityError,
} from "../error/ManagedIdentityError.js";
import {
    DEFAULT_MANAGED_IDENTITY_ID,
    ManagedIdentityIdType,
} from "../utils/Constants.js";
import type { ManagedIdentityIdParams } from "./Configuration.js";

export class ManagedIdentityId {
    private _id: string;
    public get id(): string {
        return this._id;
    }
    private set id(value: string) {
        this._id = value;
    }

    private _idType: ManagedIdentityIdType;
    public get idType(): ManagedIdentityIdType {
        return this._idType;
    }
    private set idType(value: ManagedIdentityIdType) {
        this._idType = value;
    }

    constructor(managedIdentityIdParams?: ManagedIdentityIdParams) {
        const userAssignedClientId =
            managedIdentityIdParams?.userAssignedClientId;
        const userAssignedResourceId =
            managedIdentityIdParams?.userAssignedResourceId;
        const userAssignedObjectId =
            managedIdentityIdParams?.userAssignedObjectId;

        if (userAssignedClientId) {
            if (userAssignedResourceId || userAssignedObjectId) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.invalidManagedIdentityIdType
                );
            }

            this.id = userAssignedClientId;
            this.idType = ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID;
        } else if (userAssignedResourceId) {
            if (userAssignedClientId || userAssignedObjectId) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.invalidManagedIdentityIdType
                );
            }

            this.id = userAssignedResourceId;
            this.idType = ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID;
        } else if (userAssignedObjectId) {
            if (userAssignedClientId || userAssignedResourceId) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.invalidManagedIdentityIdType
                );
            }

            this.id = userAssignedObjectId;
            this.idType = ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID;
        } else {
            this.id = DEFAULT_MANAGED_IDENTITY_ID;
            this.idType = ManagedIdentityIdType.SYSTEM_ASSIGNED;
        }
    }
}
