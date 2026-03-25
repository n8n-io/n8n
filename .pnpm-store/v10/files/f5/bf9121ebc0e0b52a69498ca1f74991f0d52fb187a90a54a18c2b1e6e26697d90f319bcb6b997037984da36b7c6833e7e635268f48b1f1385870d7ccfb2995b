/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { createManagedIdentityError } from '../error/ManagedIdentityError.mjs';
import { ManagedIdentityIdType, DEFAULT_MANAGED_IDENTITY_ID } from '../utils/Constants.mjs';
import { invalidManagedIdentityIdType } from '../error/ManagedIdentityErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class ManagedIdentityId {
    get id() {
        return this._id;
    }
    set id(value) {
        this._id = value;
    }
    get idType() {
        return this._idType;
    }
    set idType(value) {
        this._idType = value;
    }
    constructor(managedIdentityIdParams) {
        const userAssignedClientId = managedIdentityIdParams?.userAssignedClientId;
        const userAssignedResourceId = managedIdentityIdParams?.userAssignedResourceId;
        const userAssignedObjectId = managedIdentityIdParams?.userAssignedObjectId;
        if (userAssignedClientId) {
            if (userAssignedResourceId || userAssignedObjectId) {
                throw createManagedIdentityError(invalidManagedIdentityIdType);
            }
            this.id = userAssignedClientId;
            this.idType = ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID;
        }
        else if (userAssignedResourceId) {
            if (userAssignedClientId || userAssignedObjectId) {
                throw createManagedIdentityError(invalidManagedIdentityIdType);
            }
            this.id = userAssignedResourceId;
            this.idType = ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID;
        }
        else if (userAssignedObjectId) {
            if (userAssignedClientId || userAssignedResourceId) {
                throw createManagedIdentityError(invalidManagedIdentityIdType);
            }
            this.id = userAssignedObjectId;
            this.idType = ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID;
        }
        else {
            this.id = DEFAULT_MANAGED_IDENTITY_ID;
            this.idType = ManagedIdentityIdType.SYSTEM_ASSIGNED;
        }
    }
}

export { ManagedIdentityId };
//# sourceMappingURL=ManagedIdentityId.mjs.map
