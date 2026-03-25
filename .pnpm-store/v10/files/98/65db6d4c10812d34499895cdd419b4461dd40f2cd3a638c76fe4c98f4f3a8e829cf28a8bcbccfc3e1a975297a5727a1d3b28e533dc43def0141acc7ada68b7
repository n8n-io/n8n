// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * This is a helper class to construct a string representing the services accessible by an AccountSAS. Setting a value
 * to true means that any SAS which uses these permissions will grant access to that service. Once all the
 * values are set, this should be serialized with toString and set as the services field on an
 * {@link AccountSASSignatureValues} object. It is possible to construct the services string without this class, but
 * the order of the services is particular and this class guarantees correctness.
 */
export class AccountSASServices {
    constructor() {
        /**
         * Permission to access blob resources granted.
         */
        this.blob = false;
        /**
         * Permission to access file resources granted.
         */
        this.file = false;
        /**
         * Permission to access queue resources granted.
         */
        this.queue = false;
        /**
         * Permission to access table resources granted.
         */
        this.table = false;
    }
    /**
     * Creates an {@link AccountSASServices} from the specified services string. This method will throw an
     * Error if it encounters a character that does not correspond to a valid service.
     *
     * @param services -
     */
    static parse(services) {
        const accountSASServices = new AccountSASServices();
        for (const c of services) {
            switch (c) {
                case "b":
                    accountSASServices.blob = true;
                    break;
                case "f":
                    accountSASServices.file = true;
                    break;
                case "q":
                    accountSASServices.queue = true;
                    break;
                case "t":
                    accountSASServices.table = true;
                    break;
                default:
                    throw new RangeError(`Invalid service character: ${c}`);
            }
        }
        return accountSASServices;
    }
    /**
     * Converts the given services to a string.
     *
     */
    toString() {
        const services = [];
        if (this.blob) {
            services.push("b");
        }
        if (this.table) {
            services.push("t");
        }
        if (this.queue) {
            services.push("q");
        }
        if (this.file) {
            services.push("f");
        }
        return services.join("");
    }
}
//# sourceMappingURL=AccountSASServices.js.map