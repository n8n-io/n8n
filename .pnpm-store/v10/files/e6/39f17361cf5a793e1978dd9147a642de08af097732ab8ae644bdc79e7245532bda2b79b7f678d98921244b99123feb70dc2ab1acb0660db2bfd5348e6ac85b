// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * This is a helper class to construct a string representing the permissions granted by a ServiceSAS to a container.
 * Setting a value to true means that any SAS which uses these permissions will grant permissions for that operation.
 * Once all the values are set, this should be serialized with toString and set as the permissions field on a
 * {@link BlobSASSignatureValues} object. It is possible to construct the permissions string without this class, but
 * the order of the permissions is particular and this class guarantees correctness.
 */
export class ContainerSASPermissions {
    constructor() {
        /**
         * Specifies Read access granted.
         */
        this.read = false;
        /**
         * Specifies Add access granted.
         */
        this.add = false;
        /**
         * Specifies Create access granted.
         */
        this.create = false;
        /**
         * Specifies Write access granted.
         */
        this.write = false;
        /**
         * Specifies Delete access granted.
         */
        this.delete = false;
        /**
         * Specifies Delete version access granted.
         */
        this.deleteVersion = false;
        /**
         * Specifies List access granted.
         */
        this.list = false;
        /**
         * Specfies Tag access granted.
         */
        this.tag = false;
        /**
         * Specifies Move access granted.
         */
        this.move = false;
        /**
         * Specifies Execute access granted.
         */
        this.execute = false;
        /**
         * Specifies SetImmutabilityPolicy access granted.
         */
        this.setImmutabilityPolicy = false;
        /**
         * Specifies that Permanent Delete is permitted.
         */
        this.permanentDelete = false;
        /**
         * Specifies that Filter Blobs by Tags is permitted.
         */
        this.filterByTags = false;
    }
    /**
     * Creates an {@link ContainerSASPermissions} from the specified permissions string. This method will throw an
     * Error if it encounters a character that does not correspond to a valid permission.
     *
     * @param permissions -
     */
    static parse(permissions) {
        const containerSASPermissions = new ContainerSASPermissions();
        for (const char of permissions) {
            switch (char) {
                case "r":
                    containerSASPermissions.read = true;
                    break;
                case "a":
                    containerSASPermissions.add = true;
                    break;
                case "c":
                    containerSASPermissions.create = true;
                    break;
                case "w":
                    containerSASPermissions.write = true;
                    break;
                case "d":
                    containerSASPermissions.delete = true;
                    break;
                case "l":
                    containerSASPermissions.list = true;
                    break;
                case "t":
                    containerSASPermissions.tag = true;
                    break;
                case "x":
                    containerSASPermissions.deleteVersion = true;
                    break;
                case "m":
                    containerSASPermissions.move = true;
                    break;
                case "e":
                    containerSASPermissions.execute = true;
                    break;
                case "i":
                    containerSASPermissions.setImmutabilityPolicy = true;
                    break;
                case "y":
                    containerSASPermissions.permanentDelete = true;
                    break;
                case "f":
                    containerSASPermissions.filterByTags = true;
                    break;
                default:
                    throw new RangeError(`Invalid permission ${char}`);
            }
        }
        return containerSASPermissions;
    }
    /**
     * Creates a {@link ContainerSASPermissions} from a raw object which contains same keys as it
     * and boolean values for them.
     *
     * @param permissionLike -
     */
    static from(permissionLike) {
        const containerSASPermissions = new ContainerSASPermissions();
        if (permissionLike.read) {
            containerSASPermissions.read = true;
        }
        if (permissionLike.add) {
            containerSASPermissions.add = true;
        }
        if (permissionLike.create) {
            containerSASPermissions.create = true;
        }
        if (permissionLike.write) {
            containerSASPermissions.write = true;
        }
        if (permissionLike.delete) {
            containerSASPermissions.delete = true;
        }
        if (permissionLike.list) {
            containerSASPermissions.list = true;
        }
        if (permissionLike.deleteVersion) {
            containerSASPermissions.deleteVersion = true;
        }
        if (permissionLike.tag) {
            containerSASPermissions.tag = true;
        }
        if (permissionLike.move) {
            containerSASPermissions.move = true;
        }
        if (permissionLike.execute) {
            containerSASPermissions.execute = true;
        }
        if (permissionLike.setImmutabilityPolicy) {
            containerSASPermissions.setImmutabilityPolicy = true;
        }
        if (permissionLike.permanentDelete) {
            containerSASPermissions.permanentDelete = true;
        }
        if (permissionLike.filterByTags) {
            containerSASPermissions.filterByTags = true;
        }
        return containerSASPermissions;
    }
    /**
     * Converts the given permissions to a string. Using this method will guarantee the permissions are in an
     * order accepted by the service.
     *
     * The order of the characters should be as specified here to ensure correctness.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     */
    toString() {
        const permissions = [];
        if (this.read) {
            permissions.push("r");
        }
        if (this.add) {
            permissions.push("a");
        }
        if (this.create) {
            permissions.push("c");
        }
        if (this.write) {
            permissions.push("w");
        }
        if (this.delete) {
            permissions.push("d");
        }
        if (this.deleteVersion) {
            permissions.push("x");
        }
        if (this.list) {
            permissions.push("l");
        }
        if (this.tag) {
            permissions.push("t");
        }
        if (this.move) {
            permissions.push("m");
        }
        if (this.execute) {
            permissions.push("e");
        }
        if (this.setImmutabilityPolicy) {
            permissions.push("i");
        }
        if (this.permanentDelete) {
            permissions.push("y");
        }
        if (this.filterByTags) {
            permissions.push("f");
        }
        return permissions.join("");
    }
}
//# sourceMappingURL=ContainerSASPermissions.js.map