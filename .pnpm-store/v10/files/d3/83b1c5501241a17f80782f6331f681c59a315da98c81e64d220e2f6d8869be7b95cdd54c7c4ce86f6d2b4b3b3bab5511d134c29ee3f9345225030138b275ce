// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type {protobuf as $protobuf} from "google-gax";
import Long = require("long");
/** Namespace google. */
export namespace google {

    /** Namespace cloud. */
    namespace cloud {

        /** Namespace secretmanager. */
        namespace secretmanager {

            /** Namespace v1. */
            namespace v1 {

                /** Properties of a Secret. */
                interface ISecret {

                    /** Secret name */
                    name?: (string|null);

                    /** Secret replication */
                    replication?: (google.cloud.secretmanager.v1.IReplication|null);

                    /** Secret createTime */
                    createTime?: (google.protobuf.ITimestamp|null);

                    /** Secret labels */
                    labels?: ({ [k: string]: string }|null);

                    /** Secret topics */
                    topics?: (google.cloud.secretmanager.v1.ITopic[]|null);

                    /** Secret expireTime */
                    expireTime?: (google.protobuf.ITimestamp|null);

                    /** Secret ttl */
                    ttl?: (google.protobuf.IDuration|null);

                    /** Secret etag */
                    etag?: (string|null);

                    /** Secret rotation */
                    rotation?: (google.cloud.secretmanager.v1.IRotation|null);

                    /** Secret versionAliases */
                    versionAliases?: ({ [k: string]: (number|Long|string) }|null);

                    /** Secret annotations */
                    annotations?: ({ [k: string]: string }|null);

                    /** Secret versionDestroyTtl */
                    versionDestroyTtl?: (google.protobuf.IDuration|null);

                    /** Secret customerManagedEncryption */
                    customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryption|null);
                }

                /** Represents a Secret. */
                class Secret implements ISecret {

                    /**
                     * Constructs a new Secret.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ISecret);

                    /** Secret name. */
                    public name: string;

                    /** Secret replication. */
                    public replication?: (google.cloud.secretmanager.v1.IReplication|null);

                    /** Secret createTime. */
                    public createTime?: (google.protobuf.ITimestamp|null);

                    /** Secret labels. */
                    public labels: { [k: string]: string };

                    /** Secret topics. */
                    public topics: google.cloud.secretmanager.v1.ITopic[];

                    /** Secret expireTime. */
                    public expireTime?: (google.protobuf.ITimestamp|null);

                    /** Secret ttl. */
                    public ttl?: (google.protobuf.IDuration|null);

                    /** Secret etag. */
                    public etag: string;

                    /** Secret rotation. */
                    public rotation?: (google.cloud.secretmanager.v1.IRotation|null);

                    /** Secret versionAliases. */
                    public versionAliases: { [k: string]: (number|Long|string) };

                    /** Secret annotations. */
                    public annotations: { [k: string]: string };

                    /** Secret versionDestroyTtl. */
                    public versionDestroyTtl?: (google.protobuf.IDuration|null);

                    /** Secret customerManagedEncryption. */
                    public customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryption|null);

                    /** Secret expiration. */
                    public expiration?: ("expireTime"|"ttl");

                    /**
                     * Creates a new Secret instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Secret instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ISecret): google.cloud.secretmanager.v1.Secret;

                    /**
                     * Encodes the specified Secret message. Does not implicitly {@link google.cloud.secretmanager.v1.Secret.verify|verify} messages.
                     * @param message Secret message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ISecret, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Secret message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Secret.verify|verify} messages.
                     * @param message Secret message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ISecret, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Secret message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Secret
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Secret;

                    /**
                     * Decodes a Secret message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Secret
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Secret;

                    /**
                     * Verifies a Secret message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Secret message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Secret
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Secret;

                    /**
                     * Creates a plain object from a Secret message. Also converts values to other types if specified.
                     * @param message Secret
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.Secret, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Secret to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Secret
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a SecretVersion. */
                interface ISecretVersion {

                    /** SecretVersion name */
                    name?: (string|null);

                    /** SecretVersion createTime */
                    createTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion destroyTime */
                    destroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion state */
                    state?: (google.cloud.secretmanager.v1.SecretVersion.State|keyof typeof google.cloud.secretmanager.v1.SecretVersion.State|null);

                    /** SecretVersion replicationStatus */
                    replicationStatus?: (google.cloud.secretmanager.v1.IReplicationStatus|null);

                    /** SecretVersion etag */
                    etag?: (string|null);

                    /** SecretVersion clientSpecifiedPayloadChecksum */
                    clientSpecifiedPayloadChecksum?: (boolean|null);

                    /** SecretVersion scheduledDestroyTime */
                    scheduledDestroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion customerManagedEncryption */
                    customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus|null);
                }

                /** Represents a SecretVersion. */
                class SecretVersion implements ISecretVersion {

                    /**
                     * Constructs a new SecretVersion.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ISecretVersion);

                    /** SecretVersion name. */
                    public name: string;

                    /** SecretVersion createTime. */
                    public createTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion destroyTime. */
                    public destroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion state. */
                    public state: (google.cloud.secretmanager.v1.SecretVersion.State|keyof typeof google.cloud.secretmanager.v1.SecretVersion.State);

                    /** SecretVersion replicationStatus. */
                    public replicationStatus?: (google.cloud.secretmanager.v1.IReplicationStatus|null);

                    /** SecretVersion etag. */
                    public etag: string;

                    /** SecretVersion clientSpecifiedPayloadChecksum. */
                    public clientSpecifiedPayloadChecksum: boolean;

                    /** SecretVersion scheduledDestroyTime. */
                    public scheduledDestroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion customerManagedEncryption. */
                    public customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus|null);

                    /**
                     * Creates a new SecretVersion instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns SecretVersion instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ISecretVersion): google.cloud.secretmanager.v1.SecretVersion;

                    /**
                     * Encodes the specified SecretVersion message. Does not implicitly {@link google.cloud.secretmanager.v1.SecretVersion.verify|verify} messages.
                     * @param message SecretVersion message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ISecretVersion, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified SecretVersion message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.SecretVersion.verify|verify} messages.
                     * @param message SecretVersion message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ISecretVersion, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a SecretVersion message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns SecretVersion
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.SecretVersion;

                    /**
                     * Decodes a SecretVersion message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns SecretVersion
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.SecretVersion;

                    /**
                     * Verifies a SecretVersion message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a SecretVersion message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns SecretVersion
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.SecretVersion;

                    /**
                     * Creates a plain object from a SecretVersion message. Also converts values to other types if specified.
                     * @param message SecretVersion
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.SecretVersion, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this SecretVersion to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for SecretVersion
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace SecretVersion {

                    /** State enum. */
                    enum State {
                        STATE_UNSPECIFIED = 0,
                        ENABLED = 1,
                        DISABLED = 2,
                        DESTROYED = 3
                    }
                }

                /** Properties of a Replication. */
                interface IReplication {

                    /** Replication automatic */
                    automatic?: (google.cloud.secretmanager.v1.Replication.IAutomatic|null);

                    /** Replication userManaged */
                    userManaged?: (google.cloud.secretmanager.v1.Replication.IUserManaged|null);
                }

                /** Represents a Replication. */
                class Replication implements IReplication {

                    /**
                     * Constructs a new Replication.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IReplication);

                    /** Replication automatic. */
                    public automatic?: (google.cloud.secretmanager.v1.Replication.IAutomatic|null);

                    /** Replication userManaged. */
                    public userManaged?: (google.cloud.secretmanager.v1.Replication.IUserManaged|null);

                    /** Replication replication. */
                    public replication?: ("automatic"|"userManaged");

                    /**
                     * Creates a new Replication instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Replication instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IReplication): google.cloud.secretmanager.v1.Replication;

                    /**
                     * Encodes the specified Replication message. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.verify|verify} messages.
                     * @param message Replication message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IReplication, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Replication message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.verify|verify} messages.
                     * @param message Replication message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IReplication, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Replication message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Replication
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Replication;

                    /**
                     * Decodes a Replication message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Replication
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Replication;

                    /**
                     * Verifies a Replication message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Replication message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Replication
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Replication;

                    /**
                     * Creates a plain object from a Replication message. Also converts values to other types if specified.
                     * @param message Replication
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.Replication, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Replication to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Replication
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace Replication {

                    /** Properties of an Automatic. */
                    interface IAutomatic {

                        /** Automatic customerManagedEncryption */
                        customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryption|null);
                    }

                    /** Represents an Automatic. */
                    class Automatic implements IAutomatic {

                        /**
                         * Constructs a new Automatic.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1.Replication.IAutomatic);

                        /** Automatic customerManagedEncryption. */
                        public customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryption|null);

                        /**
                         * Creates a new Automatic instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns Automatic instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1.Replication.IAutomatic): google.cloud.secretmanager.v1.Replication.Automatic;

                        /**
                         * Encodes the specified Automatic message. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.Automatic.verify|verify} messages.
                         * @param message Automatic message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1.Replication.IAutomatic, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified Automatic message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.Automatic.verify|verify} messages.
                         * @param message Automatic message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1.Replication.IAutomatic, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes an Automatic message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns Automatic
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Replication.Automatic;

                        /**
                         * Decodes an Automatic message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns Automatic
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Replication.Automatic;

                        /**
                         * Verifies an Automatic message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates an Automatic message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns Automatic
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Replication.Automatic;

                        /**
                         * Creates a plain object from an Automatic message. Also converts values to other types if specified.
                         * @param message Automatic
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1.Replication.Automatic, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this Automatic to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for Automatic
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a UserManaged. */
                    interface IUserManaged {

                        /** UserManaged replicas */
                        replicas?: (google.cloud.secretmanager.v1.Replication.UserManaged.IReplica[]|null);
                    }

                    /** Represents a UserManaged. */
                    class UserManaged implements IUserManaged {

                        /**
                         * Constructs a new UserManaged.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1.Replication.IUserManaged);

                        /** UserManaged replicas. */
                        public replicas: google.cloud.secretmanager.v1.Replication.UserManaged.IReplica[];

                        /**
                         * Creates a new UserManaged instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns UserManaged instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1.Replication.IUserManaged): google.cloud.secretmanager.v1.Replication.UserManaged;

                        /**
                         * Encodes the specified UserManaged message. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.UserManaged.verify|verify} messages.
                         * @param message UserManaged message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1.Replication.IUserManaged, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified UserManaged message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.UserManaged.verify|verify} messages.
                         * @param message UserManaged message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1.Replication.IUserManaged, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a UserManaged message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns UserManaged
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Replication.UserManaged;

                        /**
                         * Decodes a UserManaged message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns UserManaged
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Replication.UserManaged;

                        /**
                         * Verifies a UserManaged message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a UserManaged message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns UserManaged
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Replication.UserManaged;

                        /**
                         * Creates a plain object from a UserManaged message. Also converts values to other types if specified.
                         * @param message UserManaged
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1.Replication.UserManaged, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this UserManaged to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for UserManaged
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    namespace UserManaged {

                        /** Properties of a Replica. */
                        interface IReplica {

                            /** Replica location */
                            location?: (string|null);

                            /** Replica customerManagedEncryption */
                            customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryption|null);
                        }

                        /** Represents a Replica. */
                        class Replica implements IReplica {

                            /**
                             * Constructs a new Replica.
                             * @param [properties] Properties to set
                             */
                            constructor(properties?: google.cloud.secretmanager.v1.Replication.UserManaged.IReplica);

                            /** Replica location. */
                            public location: string;

                            /** Replica customerManagedEncryption. */
                            public customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryption|null);

                            /**
                             * Creates a new Replica instance using the specified properties.
                             * @param [properties] Properties to set
                             * @returns Replica instance
                             */
                            public static create(properties?: google.cloud.secretmanager.v1.Replication.UserManaged.IReplica): google.cloud.secretmanager.v1.Replication.UserManaged.Replica;

                            /**
                             * Encodes the specified Replica message. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.UserManaged.Replica.verify|verify} messages.
                             * @param message Replica message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encode(message: google.cloud.secretmanager.v1.Replication.UserManaged.IReplica, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Encodes the specified Replica message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Replication.UserManaged.Replica.verify|verify} messages.
                             * @param message Replica message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encodeDelimited(message: google.cloud.secretmanager.v1.Replication.UserManaged.IReplica, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Decodes a Replica message from the specified reader or buffer.
                             * @param reader Reader or buffer to decode from
                             * @param [length] Message length if known beforehand
                             * @returns Replica
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Replication.UserManaged.Replica;

                            /**
                             * Decodes a Replica message from the specified reader or buffer, length delimited.
                             * @param reader Reader or buffer to decode from
                             * @returns Replica
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Replication.UserManaged.Replica;

                            /**
                             * Verifies a Replica message.
                             * @param message Plain object to verify
                             * @returns `null` if valid, otherwise the reason why it is not
                             */
                            public static verify(message: { [k: string]: any }): (string|null);

                            /**
                             * Creates a Replica message from a plain object. Also converts values to their respective internal types.
                             * @param object Plain object
                             * @returns Replica
                             */
                            public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Replication.UserManaged.Replica;

                            /**
                             * Creates a plain object from a Replica message. Also converts values to other types if specified.
                             * @param message Replica
                             * @param [options] Conversion options
                             * @returns Plain object
                             */
                            public static toObject(message: google.cloud.secretmanager.v1.Replication.UserManaged.Replica, options?: $protobuf.IConversionOptions): { [k: string]: any };

                            /**
                             * Converts this Replica to JSON.
                             * @returns JSON object
                             */
                            public toJSON(): { [k: string]: any };

                            /**
                             * Gets the default type url for Replica
                             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                             * @returns The default type url
                             */
                            public static getTypeUrl(typeUrlPrefix?: string): string;
                        }
                    }
                }

                /** Properties of a CustomerManagedEncryption. */
                interface ICustomerManagedEncryption {

                    /** CustomerManagedEncryption kmsKeyName */
                    kmsKeyName?: (string|null);
                }

                /** Represents a CustomerManagedEncryption. */
                class CustomerManagedEncryption implements ICustomerManagedEncryption {

                    /**
                     * Constructs a new CustomerManagedEncryption.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ICustomerManagedEncryption);

                    /** CustomerManagedEncryption kmsKeyName. */
                    public kmsKeyName: string;

                    /**
                     * Creates a new CustomerManagedEncryption instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CustomerManagedEncryption instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ICustomerManagedEncryption): google.cloud.secretmanager.v1.CustomerManagedEncryption;

                    /**
                     * Encodes the specified CustomerManagedEncryption message. Does not implicitly {@link google.cloud.secretmanager.v1.CustomerManagedEncryption.verify|verify} messages.
                     * @param message CustomerManagedEncryption message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ICustomerManagedEncryption, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CustomerManagedEncryption message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.CustomerManagedEncryption.verify|verify} messages.
                     * @param message CustomerManagedEncryption message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ICustomerManagedEncryption, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CustomerManagedEncryption message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CustomerManagedEncryption
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.CustomerManagedEncryption;

                    /**
                     * Decodes a CustomerManagedEncryption message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CustomerManagedEncryption
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.CustomerManagedEncryption;

                    /**
                     * Verifies a CustomerManagedEncryption message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CustomerManagedEncryption message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CustomerManagedEncryption
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.CustomerManagedEncryption;

                    /**
                     * Creates a plain object from a CustomerManagedEncryption message. Also converts values to other types if specified.
                     * @param message CustomerManagedEncryption
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.CustomerManagedEncryption, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CustomerManagedEncryption to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CustomerManagedEncryption
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ReplicationStatus. */
                interface IReplicationStatus {

                    /** ReplicationStatus automatic */
                    automatic?: (google.cloud.secretmanager.v1.ReplicationStatus.IAutomaticStatus|null);

                    /** ReplicationStatus userManaged */
                    userManaged?: (google.cloud.secretmanager.v1.ReplicationStatus.IUserManagedStatus|null);
                }

                /** Represents a ReplicationStatus. */
                class ReplicationStatus implements IReplicationStatus {

                    /**
                     * Constructs a new ReplicationStatus.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IReplicationStatus);

                    /** ReplicationStatus automatic. */
                    public automatic?: (google.cloud.secretmanager.v1.ReplicationStatus.IAutomaticStatus|null);

                    /** ReplicationStatus userManaged. */
                    public userManaged?: (google.cloud.secretmanager.v1.ReplicationStatus.IUserManagedStatus|null);

                    /** ReplicationStatus replicationStatus. */
                    public replicationStatus?: ("automatic"|"userManaged");

                    /**
                     * Creates a new ReplicationStatus instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ReplicationStatus instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IReplicationStatus): google.cloud.secretmanager.v1.ReplicationStatus;

                    /**
                     * Encodes the specified ReplicationStatus message. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.verify|verify} messages.
                     * @param message ReplicationStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IReplicationStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ReplicationStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.verify|verify} messages.
                     * @param message ReplicationStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IReplicationStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ReplicationStatus message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ReplicationStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ReplicationStatus;

                    /**
                     * Decodes a ReplicationStatus message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ReplicationStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ReplicationStatus;

                    /**
                     * Verifies a ReplicationStatus message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ReplicationStatus message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ReplicationStatus
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ReplicationStatus;

                    /**
                     * Creates a plain object from a ReplicationStatus message. Also converts values to other types if specified.
                     * @param message ReplicationStatus
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.ReplicationStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ReplicationStatus to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ReplicationStatus
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace ReplicationStatus {

                    /** Properties of an AutomaticStatus. */
                    interface IAutomaticStatus {

                        /** AutomaticStatus customerManagedEncryption */
                        customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus|null);
                    }

                    /** Represents an AutomaticStatus. */
                    class AutomaticStatus implements IAutomaticStatus {

                        /**
                         * Constructs a new AutomaticStatus.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1.ReplicationStatus.IAutomaticStatus);

                        /** AutomaticStatus customerManagedEncryption. */
                        public customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus|null);

                        /**
                         * Creates a new AutomaticStatus instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns AutomaticStatus instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1.ReplicationStatus.IAutomaticStatus): google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus;

                        /**
                         * Encodes the specified AutomaticStatus message. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus.verify|verify} messages.
                         * @param message AutomaticStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1.ReplicationStatus.IAutomaticStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified AutomaticStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus.verify|verify} messages.
                         * @param message AutomaticStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1.ReplicationStatus.IAutomaticStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes an AutomaticStatus message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns AutomaticStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus;

                        /**
                         * Decodes an AutomaticStatus message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns AutomaticStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus;

                        /**
                         * Verifies an AutomaticStatus message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates an AutomaticStatus message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns AutomaticStatus
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus;

                        /**
                         * Creates a plain object from an AutomaticStatus message. Also converts values to other types if specified.
                         * @param message AutomaticStatus
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1.ReplicationStatus.AutomaticStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this AutomaticStatus to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for AutomaticStatus
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a UserManagedStatus. */
                    interface IUserManagedStatus {

                        /** UserManagedStatus replicas */
                        replicas?: (google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.IReplicaStatus[]|null);
                    }

                    /** Represents a UserManagedStatus. */
                    class UserManagedStatus implements IUserManagedStatus {

                        /**
                         * Constructs a new UserManagedStatus.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1.ReplicationStatus.IUserManagedStatus);

                        /** UserManagedStatus replicas. */
                        public replicas: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.IReplicaStatus[];

                        /**
                         * Creates a new UserManagedStatus instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns UserManagedStatus instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1.ReplicationStatus.IUserManagedStatus): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus;

                        /**
                         * Encodes the specified UserManagedStatus message. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.verify|verify} messages.
                         * @param message UserManagedStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1.ReplicationStatus.IUserManagedStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified UserManagedStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.verify|verify} messages.
                         * @param message UserManagedStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1.ReplicationStatus.IUserManagedStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a UserManagedStatus message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns UserManagedStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus;

                        /**
                         * Decodes a UserManagedStatus message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns UserManagedStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus;

                        /**
                         * Verifies a UserManagedStatus message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a UserManagedStatus message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns UserManagedStatus
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus;

                        /**
                         * Creates a plain object from a UserManagedStatus message. Also converts values to other types if specified.
                         * @param message UserManagedStatus
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this UserManagedStatus to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for UserManagedStatus
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    namespace UserManagedStatus {

                        /** Properties of a ReplicaStatus. */
                        interface IReplicaStatus {

                            /** ReplicaStatus location */
                            location?: (string|null);

                            /** ReplicaStatus customerManagedEncryption */
                            customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus|null);
                        }

                        /** Represents a ReplicaStatus. */
                        class ReplicaStatus implements IReplicaStatus {

                            /**
                             * Constructs a new ReplicaStatus.
                             * @param [properties] Properties to set
                             */
                            constructor(properties?: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.IReplicaStatus);

                            /** ReplicaStatus location. */
                            public location: string;

                            /** ReplicaStatus customerManagedEncryption. */
                            public customerManagedEncryption?: (google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus|null);

                            /**
                             * Creates a new ReplicaStatus instance using the specified properties.
                             * @param [properties] Properties to set
                             * @returns ReplicaStatus instance
                             */
                            public static create(properties?: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.IReplicaStatus): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Encodes the specified ReplicaStatus message. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus.verify|verify} messages.
                             * @param message ReplicaStatus message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encode(message: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.IReplicaStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Encodes the specified ReplicaStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus.verify|verify} messages.
                             * @param message ReplicaStatus message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encodeDelimited(message: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.IReplicaStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Decodes a ReplicaStatus message from the specified reader or buffer.
                             * @param reader Reader or buffer to decode from
                             * @param [length] Message length if known beforehand
                             * @returns ReplicaStatus
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Decodes a ReplicaStatus message from the specified reader or buffer, length delimited.
                             * @param reader Reader or buffer to decode from
                             * @returns ReplicaStatus
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Verifies a ReplicaStatus message.
                             * @param message Plain object to verify
                             * @returns `null` if valid, otherwise the reason why it is not
                             */
                            public static verify(message: { [k: string]: any }): (string|null);

                            /**
                             * Creates a ReplicaStatus message from a plain object. Also converts values to their respective internal types.
                             * @param object Plain object
                             * @returns ReplicaStatus
                             */
                            public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Creates a plain object from a ReplicaStatus message. Also converts values to other types if specified.
                             * @param message ReplicaStatus
                             * @param [options] Conversion options
                             * @returns Plain object
                             */
                            public static toObject(message: google.cloud.secretmanager.v1.ReplicationStatus.UserManagedStatus.ReplicaStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                            /**
                             * Converts this ReplicaStatus to JSON.
                             * @returns JSON object
                             */
                            public toJSON(): { [k: string]: any };

                            /**
                             * Gets the default type url for ReplicaStatus
                             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                             * @returns The default type url
                             */
                            public static getTypeUrl(typeUrlPrefix?: string): string;
                        }
                    }
                }

                /** Properties of a CustomerManagedEncryptionStatus. */
                interface ICustomerManagedEncryptionStatus {

                    /** CustomerManagedEncryptionStatus kmsKeyVersionName */
                    kmsKeyVersionName?: (string|null);
                }

                /** Represents a CustomerManagedEncryptionStatus. */
                class CustomerManagedEncryptionStatus implements ICustomerManagedEncryptionStatus {

                    /**
                     * Constructs a new CustomerManagedEncryptionStatus.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus);

                    /** CustomerManagedEncryptionStatus kmsKeyVersionName. */
                    public kmsKeyVersionName: string;

                    /**
                     * Creates a new CustomerManagedEncryptionStatus instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CustomerManagedEncryptionStatus instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus): google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus;

                    /**
                     * Encodes the specified CustomerManagedEncryptionStatus message. Does not implicitly {@link google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus.verify|verify} messages.
                     * @param message CustomerManagedEncryptionStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CustomerManagedEncryptionStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus.verify|verify} messages.
                     * @param message CustomerManagedEncryptionStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ICustomerManagedEncryptionStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CustomerManagedEncryptionStatus message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CustomerManagedEncryptionStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus;

                    /**
                     * Decodes a CustomerManagedEncryptionStatus message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CustomerManagedEncryptionStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus;

                    /**
                     * Verifies a CustomerManagedEncryptionStatus message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CustomerManagedEncryptionStatus message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CustomerManagedEncryptionStatus
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus;

                    /**
                     * Creates a plain object from a CustomerManagedEncryptionStatus message. Also converts values to other types if specified.
                     * @param message CustomerManagedEncryptionStatus
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.CustomerManagedEncryptionStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CustomerManagedEncryptionStatus to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CustomerManagedEncryptionStatus
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a Topic. */
                interface ITopic {

                    /** Topic name */
                    name?: (string|null);
                }

                /** Represents a Topic. */
                class Topic implements ITopic {

                    /**
                     * Constructs a new Topic.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ITopic);

                    /** Topic name. */
                    public name: string;

                    /**
                     * Creates a new Topic instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Topic instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ITopic): google.cloud.secretmanager.v1.Topic;

                    /**
                     * Encodes the specified Topic message. Does not implicitly {@link google.cloud.secretmanager.v1.Topic.verify|verify} messages.
                     * @param message Topic message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ITopic, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Topic message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Topic.verify|verify} messages.
                     * @param message Topic message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ITopic, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Topic message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Topic
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Topic;

                    /**
                     * Decodes a Topic message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Topic
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Topic;

                    /**
                     * Verifies a Topic message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Topic message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Topic
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Topic;

                    /**
                     * Creates a plain object from a Topic message. Also converts values to other types if specified.
                     * @param message Topic
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.Topic, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Topic to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Topic
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a Rotation. */
                interface IRotation {

                    /** Rotation nextRotationTime */
                    nextRotationTime?: (google.protobuf.ITimestamp|null);

                    /** Rotation rotationPeriod */
                    rotationPeriod?: (google.protobuf.IDuration|null);
                }

                /** Represents a Rotation. */
                class Rotation implements IRotation {

                    /**
                     * Constructs a new Rotation.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IRotation);

                    /** Rotation nextRotationTime. */
                    public nextRotationTime?: (google.protobuf.ITimestamp|null);

                    /** Rotation rotationPeriod. */
                    public rotationPeriod?: (google.protobuf.IDuration|null);

                    /**
                     * Creates a new Rotation instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Rotation instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IRotation): google.cloud.secretmanager.v1.Rotation;

                    /**
                     * Encodes the specified Rotation message. Does not implicitly {@link google.cloud.secretmanager.v1.Rotation.verify|verify} messages.
                     * @param message Rotation message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IRotation, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Rotation message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.Rotation.verify|verify} messages.
                     * @param message Rotation message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IRotation, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Rotation message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Rotation
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.Rotation;

                    /**
                     * Decodes a Rotation message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Rotation
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.Rotation;

                    /**
                     * Verifies a Rotation message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Rotation message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Rotation
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.Rotation;

                    /**
                     * Creates a plain object from a Rotation message. Also converts values to other types if specified.
                     * @param message Rotation
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.Rotation, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Rotation to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Rotation
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a SecretPayload. */
                interface ISecretPayload {

                    /** SecretPayload data */
                    data?: (Uint8Array|string|null);

                    /** SecretPayload dataCrc32c */
                    dataCrc32c?: (number|Long|string|null);
                }

                /** Represents a SecretPayload. */
                class SecretPayload implements ISecretPayload {

                    /**
                     * Constructs a new SecretPayload.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ISecretPayload);

                    /** SecretPayload data. */
                    public data: (Uint8Array|string);

                    /** SecretPayload dataCrc32c. */
                    public dataCrc32c?: (number|Long|string|null);

                    /** SecretPayload _dataCrc32c. */
                    public _dataCrc32c?: "dataCrc32c";

                    /**
                     * Creates a new SecretPayload instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns SecretPayload instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ISecretPayload): google.cloud.secretmanager.v1.SecretPayload;

                    /**
                     * Encodes the specified SecretPayload message. Does not implicitly {@link google.cloud.secretmanager.v1.SecretPayload.verify|verify} messages.
                     * @param message SecretPayload message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ISecretPayload, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified SecretPayload message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.SecretPayload.verify|verify} messages.
                     * @param message SecretPayload message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ISecretPayload, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a SecretPayload message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns SecretPayload
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.SecretPayload;

                    /**
                     * Decodes a SecretPayload message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns SecretPayload
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.SecretPayload;

                    /**
                     * Verifies a SecretPayload message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a SecretPayload message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns SecretPayload
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.SecretPayload;

                    /**
                     * Creates a plain object from a SecretPayload message. Also converts values to other types if specified.
                     * @param message SecretPayload
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.SecretPayload, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this SecretPayload to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for SecretPayload
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Represents a SecretManagerService */
                class SecretManagerService extends $protobuf.rpc.Service {

                    /**
                     * Constructs a new SecretManagerService service.
                     * @param rpcImpl RPC implementation
                     * @param [requestDelimited=false] Whether requests are length-delimited
                     * @param [responseDelimited=false] Whether responses are length-delimited
                     */
                    constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

                    /**
                     * Creates new SecretManagerService service using the specified rpc implementation.
                     * @param rpcImpl RPC implementation
                     * @param [requestDelimited=false] Whether requests are length-delimited
                     * @param [responseDelimited=false] Whether responses are length-delimited
                     * @returns RPC service. Useful where requests and/or responses are streamed.
                     */
                    public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): SecretManagerService;

                    /**
                     * Calls ListSecrets.
                     * @param request ListSecretsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and ListSecretsResponse
                     */
                    public listSecrets(request: google.cloud.secretmanager.v1.IListSecretsRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.ListSecretsCallback): void;

                    /**
                     * Calls ListSecrets.
                     * @param request ListSecretsRequest message or plain object
                     * @returns Promise
                     */
                    public listSecrets(request: google.cloud.secretmanager.v1.IListSecretsRequest): Promise<google.cloud.secretmanager.v1.ListSecretsResponse>;

                    /**
                     * Calls CreateSecret.
                     * @param request CreateSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public createSecret(request: google.cloud.secretmanager.v1.ICreateSecretRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.CreateSecretCallback): void;

                    /**
                     * Calls CreateSecret.
                     * @param request CreateSecretRequest message or plain object
                     * @returns Promise
                     */
                    public createSecret(request: google.cloud.secretmanager.v1.ICreateSecretRequest): Promise<google.cloud.secretmanager.v1.Secret>;

                    /**
                     * Calls AddSecretVersion.
                     * @param request AddSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public addSecretVersion(request: google.cloud.secretmanager.v1.IAddSecretVersionRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.AddSecretVersionCallback): void;

                    /**
                     * Calls AddSecretVersion.
                     * @param request AddSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public addSecretVersion(request: google.cloud.secretmanager.v1.IAddSecretVersionRequest): Promise<google.cloud.secretmanager.v1.SecretVersion>;

                    /**
                     * Calls GetSecret.
                     * @param request GetSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public getSecret(request: google.cloud.secretmanager.v1.IGetSecretRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.GetSecretCallback): void;

                    /**
                     * Calls GetSecret.
                     * @param request GetSecretRequest message or plain object
                     * @returns Promise
                     */
                    public getSecret(request: google.cloud.secretmanager.v1.IGetSecretRequest): Promise<google.cloud.secretmanager.v1.Secret>;

                    /**
                     * Calls UpdateSecret.
                     * @param request UpdateSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public updateSecret(request: google.cloud.secretmanager.v1.IUpdateSecretRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.UpdateSecretCallback): void;

                    /**
                     * Calls UpdateSecret.
                     * @param request UpdateSecretRequest message or plain object
                     * @returns Promise
                     */
                    public updateSecret(request: google.cloud.secretmanager.v1.IUpdateSecretRequest): Promise<google.cloud.secretmanager.v1.Secret>;

                    /**
                     * Calls DeleteSecret.
                     * @param request DeleteSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Empty
                     */
                    public deleteSecret(request: google.cloud.secretmanager.v1.IDeleteSecretRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.DeleteSecretCallback): void;

                    /**
                     * Calls DeleteSecret.
                     * @param request DeleteSecretRequest message or plain object
                     * @returns Promise
                     */
                    public deleteSecret(request: google.cloud.secretmanager.v1.IDeleteSecretRequest): Promise<google.protobuf.Empty>;

                    /**
                     * Calls ListSecretVersions.
                     * @param request ListSecretVersionsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and ListSecretVersionsResponse
                     */
                    public listSecretVersions(request: google.cloud.secretmanager.v1.IListSecretVersionsRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.ListSecretVersionsCallback): void;

                    /**
                     * Calls ListSecretVersions.
                     * @param request ListSecretVersionsRequest message or plain object
                     * @returns Promise
                     */
                    public listSecretVersions(request: google.cloud.secretmanager.v1.IListSecretVersionsRequest): Promise<google.cloud.secretmanager.v1.ListSecretVersionsResponse>;

                    /**
                     * Calls GetSecretVersion.
                     * @param request GetSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public getSecretVersion(request: google.cloud.secretmanager.v1.IGetSecretVersionRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.GetSecretVersionCallback): void;

                    /**
                     * Calls GetSecretVersion.
                     * @param request GetSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public getSecretVersion(request: google.cloud.secretmanager.v1.IGetSecretVersionRequest): Promise<google.cloud.secretmanager.v1.SecretVersion>;

                    /**
                     * Calls AccessSecretVersion.
                     * @param request AccessSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and AccessSecretVersionResponse
                     */
                    public accessSecretVersion(request: google.cloud.secretmanager.v1.IAccessSecretVersionRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersionCallback): void;

                    /**
                     * Calls AccessSecretVersion.
                     * @param request AccessSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public accessSecretVersion(request: google.cloud.secretmanager.v1.IAccessSecretVersionRequest): Promise<google.cloud.secretmanager.v1.AccessSecretVersionResponse>;

                    /**
                     * Calls DisableSecretVersion.
                     * @param request DisableSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public disableSecretVersion(request: google.cloud.secretmanager.v1.IDisableSecretVersionRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.DisableSecretVersionCallback): void;

                    /**
                     * Calls DisableSecretVersion.
                     * @param request DisableSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public disableSecretVersion(request: google.cloud.secretmanager.v1.IDisableSecretVersionRequest): Promise<google.cloud.secretmanager.v1.SecretVersion>;

                    /**
                     * Calls EnableSecretVersion.
                     * @param request EnableSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public enableSecretVersion(request: google.cloud.secretmanager.v1.IEnableSecretVersionRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.EnableSecretVersionCallback): void;

                    /**
                     * Calls EnableSecretVersion.
                     * @param request EnableSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public enableSecretVersion(request: google.cloud.secretmanager.v1.IEnableSecretVersionRequest): Promise<google.cloud.secretmanager.v1.SecretVersion>;

                    /**
                     * Calls DestroySecretVersion.
                     * @param request DestroySecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public destroySecretVersion(request: google.cloud.secretmanager.v1.IDestroySecretVersionRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.DestroySecretVersionCallback): void;

                    /**
                     * Calls DestroySecretVersion.
                     * @param request DestroySecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public destroySecretVersion(request: google.cloud.secretmanager.v1.IDestroySecretVersionRequest): Promise<google.cloud.secretmanager.v1.SecretVersion>;

                    /**
                     * Calls SetIamPolicy.
                     * @param request SetIamPolicyRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Policy
                     */
                    public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.SetIamPolicyCallback): void;

                    /**
                     * Calls SetIamPolicy.
                     * @param request SetIamPolicyRequest message or plain object
                     * @returns Promise
                     */
                    public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                    /**
                     * Calls GetIamPolicy.
                     * @param request GetIamPolicyRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Policy
                     */
                    public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.GetIamPolicyCallback): void;

                    /**
                     * Calls GetIamPolicy.
                     * @param request GetIamPolicyRequest message or plain object
                     * @returns Promise
                     */
                    public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                    /**
                     * Calls TestIamPermissions.
                     * @param request TestIamPermissionsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and TestIamPermissionsResponse
                     */
                    public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest, callback: google.cloud.secretmanager.v1.SecretManagerService.TestIamPermissionsCallback): void;

                    /**
                     * Calls TestIamPermissions.
                     * @param request TestIamPermissionsRequest message or plain object
                     * @returns Promise
                     */
                    public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest): Promise<google.iam.v1.TestIamPermissionsResponse>;
                }

                namespace SecretManagerService {

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|listSecrets}.
                     * @param error Error, if any
                     * @param [response] ListSecretsResponse
                     */
                    type ListSecretsCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.ListSecretsResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|createSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type CreateSecretCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|addSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type AddSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|getSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type GetSecretCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|updateSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type UpdateSecretCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|deleteSecret}.
                     * @param error Error, if any
                     * @param [response] Empty
                     */
                    type DeleteSecretCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|listSecretVersions}.
                     * @param error Error, if any
                     * @param [response] ListSecretVersionsResponse
                     */
                    type ListSecretVersionsCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.ListSecretVersionsResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|getSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type GetSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|accessSecretVersion}.
                     * @param error Error, if any
                     * @param [response] AccessSecretVersionResponse
                     */
                    type AccessSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.AccessSecretVersionResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|disableSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type DisableSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|enableSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type EnableSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|destroySecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type DestroySecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|setIamPolicy}.
                     * @param error Error, if any
                     * @param [response] Policy
                     */
                    type SetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|getIamPolicy}.
                     * @param error Error, if any
                     * @param [response] Policy
                     */
                    type GetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1.SecretManagerService|testIamPermissions}.
                     * @param error Error, if any
                     * @param [response] TestIamPermissionsResponse
                     */
                    type TestIamPermissionsCallback = (error: (Error|null), response?: google.iam.v1.TestIamPermissionsResponse) => void;
                }

                /** Properties of a ListSecretsRequest. */
                interface IListSecretsRequest {

                    /** ListSecretsRequest parent */
                    parent?: (string|null);

                    /** ListSecretsRequest pageSize */
                    pageSize?: (number|null);

                    /** ListSecretsRequest pageToken */
                    pageToken?: (string|null);

                    /** ListSecretsRequest filter */
                    filter?: (string|null);
                }

                /** Represents a ListSecretsRequest. */
                class ListSecretsRequest implements IListSecretsRequest {

                    /**
                     * Constructs a new ListSecretsRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IListSecretsRequest);

                    /** ListSecretsRequest parent. */
                    public parent: string;

                    /** ListSecretsRequest pageSize. */
                    public pageSize: number;

                    /** ListSecretsRequest pageToken. */
                    public pageToken: string;

                    /** ListSecretsRequest filter. */
                    public filter: string;

                    /**
                     * Creates a new ListSecretsRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretsRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IListSecretsRequest): google.cloud.secretmanager.v1.ListSecretsRequest;

                    /**
                     * Encodes the specified ListSecretsRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretsRequest.verify|verify} messages.
                     * @param message ListSecretsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IListSecretsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretsRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretsRequest.verify|verify} messages.
                     * @param message ListSecretsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IListSecretsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretsRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ListSecretsRequest;

                    /**
                     * Decodes a ListSecretsRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ListSecretsRequest;

                    /**
                     * Verifies a ListSecretsRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretsRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretsRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ListSecretsRequest;

                    /**
                     * Creates a plain object from a ListSecretsRequest message. Also converts values to other types if specified.
                     * @param message ListSecretsRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.ListSecretsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretsRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretsRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretsResponse. */
                interface IListSecretsResponse {

                    /** ListSecretsResponse secrets */
                    secrets?: (google.cloud.secretmanager.v1.ISecret[]|null);

                    /** ListSecretsResponse nextPageToken */
                    nextPageToken?: (string|null);

                    /** ListSecretsResponse totalSize */
                    totalSize?: (number|null);
                }

                /** Represents a ListSecretsResponse. */
                class ListSecretsResponse implements IListSecretsResponse {

                    /**
                     * Constructs a new ListSecretsResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IListSecretsResponse);

                    /** ListSecretsResponse secrets. */
                    public secrets: google.cloud.secretmanager.v1.ISecret[];

                    /** ListSecretsResponse nextPageToken. */
                    public nextPageToken: string;

                    /** ListSecretsResponse totalSize. */
                    public totalSize: number;

                    /**
                     * Creates a new ListSecretsResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretsResponse instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IListSecretsResponse): google.cloud.secretmanager.v1.ListSecretsResponse;

                    /**
                     * Encodes the specified ListSecretsResponse message. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretsResponse.verify|verify} messages.
                     * @param message ListSecretsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IListSecretsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretsResponse message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretsResponse.verify|verify} messages.
                     * @param message ListSecretsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IListSecretsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretsResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ListSecretsResponse;

                    /**
                     * Decodes a ListSecretsResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ListSecretsResponse;

                    /**
                     * Verifies a ListSecretsResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretsResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretsResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ListSecretsResponse;

                    /**
                     * Creates a plain object from a ListSecretsResponse message. Also converts values to other types if specified.
                     * @param message ListSecretsResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.ListSecretsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretsResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretsResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a CreateSecretRequest. */
                interface ICreateSecretRequest {

                    /** CreateSecretRequest parent */
                    parent?: (string|null);

                    /** CreateSecretRequest secretId */
                    secretId?: (string|null);

                    /** CreateSecretRequest secret */
                    secret?: (google.cloud.secretmanager.v1.ISecret|null);
                }

                /** Represents a CreateSecretRequest. */
                class CreateSecretRequest implements ICreateSecretRequest {

                    /**
                     * Constructs a new CreateSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.ICreateSecretRequest);

                    /** CreateSecretRequest parent. */
                    public parent: string;

                    /** CreateSecretRequest secretId. */
                    public secretId: string;

                    /** CreateSecretRequest secret. */
                    public secret?: (google.cloud.secretmanager.v1.ISecret|null);

                    /**
                     * Creates a new CreateSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CreateSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.ICreateSecretRequest): google.cloud.secretmanager.v1.CreateSecretRequest;

                    /**
                     * Encodes the specified CreateSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.CreateSecretRequest.verify|verify} messages.
                     * @param message CreateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.ICreateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CreateSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.CreateSecretRequest.verify|verify} messages.
                     * @param message CreateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.ICreateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CreateSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CreateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.CreateSecretRequest;

                    /**
                     * Decodes a CreateSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CreateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.CreateSecretRequest;

                    /**
                     * Verifies a CreateSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CreateSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CreateSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.CreateSecretRequest;

                    /**
                     * Creates a plain object from a CreateSecretRequest message. Also converts values to other types if specified.
                     * @param message CreateSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.CreateSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CreateSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CreateSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AddSecretVersionRequest. */
                interface IAddSecretVersionRequest {

                    /** AddSecretVersionRequest parent */
                    parent?: (string|null);

                    /** AddSecretVersionRequest payload */
                    payload?: (google.cloud.secretmanager.v1.ISecretPayload|null);
                }

                /** Represents an AddSecretVersionRequest. */
                class AddSecretVersionRequest implements IAddSecretVersionRequest {

                    /**
                     * Constructs a new AddSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IAddSecretVersionRequest);

                    /** AddSecretVersionRequest parent. */
                    public parent: string;

                    /** AddSecretVersionRequest payload. */
                    public payload?: (google.cloud.secretmanager.v1.ISecretPayload|null);

                    /**
                     * Creates a new AddSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AddSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IAddSecretVersionRequest): google.cloud.secretmanager.v1.AddSecretVersionRequest;

                    /**
                     * Encodes the specified AddSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.AddSecretVersionRequest.verify|verify} messages.
                     * @param message AddSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IAddSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AddSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.AddSecretVersionRequest.verify|verify} messages.
                     * @param message AddSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IAddSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AddSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AddSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.AddSecretVersionRequest;

                    /**
                     * Decodes an AddSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AddSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.AddSecretVersionRequest;

                    /**
                     * Verifies an AddSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AddSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AddSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.AddSecretVersionRequest;

                    /**
                     * Creates a plain object from an AddSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message AddSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.AddSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AddSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AddSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a GetSecretRequest. */
                interface IGetSecretRequest {

                    /** GetSecretRequest name */
                    name?: (string|null);
                }

                /** Represents a GetSecretRequest. */
                class GetSecretRequest implements IGetSecretRequest {

                    /**
                     * Constructs a new GetSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IGetSecretRequest);

                    /** GetSecretRequest name. */
                    public name: string;

                    /**
                     * Creates a new GetSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns GetSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IGetSecretRequest): google.cloud.secretmanager.v1.GetSecretRequest;

                    /**
                     * Encodes the specified GetSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.GetSecretRequest.verify|verify} messages.
                     * @param message GetSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IGetSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified GetSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.GetSecretRequest.verify|verify} messages.
                     * @param message GetSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IGetSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a GetSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns GetSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.GetSecretRequest;

                    /**
                     * Decodes a GetSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns GetSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.GetSecretRequest;

                    /**
                     * Verifies a GetSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a GetSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns GetSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.GetSecretRequest;

                    /**
                     * Creates a plain object from a GetSecretRequest message. Also converts values to other types if specified.
                     * @param message GetSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.GetSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this GetSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for GetSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretVersionsRequest. */
                interface IListSecretVersionsRequest {

                    /** ListSecretVersionsRequest parent */
                    parent?: (string|null);

                    /** ListSecretVersionsRequest pageSize */
                    pageSize?: (number|null);

                    /** ListSecretVersionsRequest pageToken */
                    pageToken?: (string|null);

                    /** ListSecretVersionsRequest filter */
                    filter?: (string|null);
                }

                /** Represents a ListSecretVersionsRequest. */
                class ListSecretVersionsRequest implements IListSecretVersionsRequest {

                    /**
                     * Constructs a new ListSecretVersionsRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IListSecretVersionsRequest);

                    /** ListSecretVersionsRequest parent. */
                    public parent: string;

                    /** ListSecretVersionsRequest pageSize. */
                    public pageSize: number;

                    /** ListSecretVersionsRequest pageToken. */
                    public pageToken: string;

                    /** ListSecretVersionsRequest filter. */
                    public filter: string;

                    /**
                     * Creates a new ListSecretVersionsRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretVersionsRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IListSecretVersionsRequest): google.cloud.secretmanager.v1.ListSecretVersionsRequest;

                    /**
                     * Encodes the specified ListSecretVersionsRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretVersionsRequest.verify|verify} messages.
                     * @param message ListSecretVersionsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IListSecretVersionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretVersionsRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretVersionsRequest.verify|verify} messages.
                     * @param message ListSecretVersionsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IListSecretVersionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretVersionsRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretVersionsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ListSecretVersionsRequest;

                    /**
                     * Decodes a ListSecretVersionsRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretVersionsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ListSecretVersionsRequest;

                    /**
                     * Verifies a ListSecretVersionsRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretVersionsRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretVersionsRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ListSecretVersionsRequest;

                    /**
                     * Creates a plain object from a ListSecretVersionsRequest message. Also converts values to other types if specified.
                     * @param message ListSecretVersionsRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.ListSecretVersionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretVersionsRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretVersionsRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretVersionsResponse. */
                interface IListSecretVersionsResponse {

                    /** ListSecretVersionsResponse versions */
                    versions?: (google.cloud.secretmanager.v1.ISecretVersion[]|null);

                    /** ListSecretVersionsResponse nextPageToken */
                    nextPageToken?: (string|null);

                    /** ListSecretVersionsResponse totalSize */
                    totalSize?: (number|null);
                }

                /** Represents a ListSecretVersionsResponse. */
                class ListSecretVersionsResponse implements IListSecretVersionsResponse {

                    /**
                     * Constructs a new ListSecretVersionsResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IListSecretVersionsResponse);

                    /** ListSecretVersionsResponse versions. */
                    public versions: google.cloud.secretmanager.v1.ISecretVersion[];

                    /** ListSecretVersionsResponse nextPageToken. */
                    public nextPageToken: string;

                    /** ListSecretVersionsResponse totalSize. */
                    public totalSize: number;

                    /**
                     * Creates a new ListSecretVersionsResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretVersionsResponse instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IListSecretVersionsResponse): google.cloud.secretmanager.v1.ListSecretVersionsResponse;

                    /**
                     * Encodes the specified ListSecretVersionsResponse message. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretVersionsResponse.verify|verify} messages.
                     * @param message ListSecretVersionsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IListSecretVersionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretVersionsResponse message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.ListSecretVersionsResponse.verify|verify} messages.
                     * @param message ListSecretVersionsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IListSecretVersionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretVersionsResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretVersionsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.ListSecretVersionsResponse;

                    /**
                     * Decodes a ListSecretVersionsResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretVersionsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.ListSecretVersionsResponse;

                    /**
                     * Verifies a ListSecretVersionsResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretVersionsResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretVersionsResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.ListSecretVersionsResponse;

                    /**
                     * Creates a plain object from a ListSecretVersionsResponse message. Also converts values to other types if specified.
                     * @param message ListSecretVersionsResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.ListSecretVersionsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretVersionsResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretVersionsResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a GetSecretVersionRequest. */
                interface IGetSecretVersionRequest {

                    /** GetSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents a GetSecretVersionRequest. */
                class GetSecretVersionRequest implements IGetSecretVersionRequest {

                    /**
                     * Constructs a new GetSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IGetSecretVersionRequest);

                    /** GetSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new GetSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns GetSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IGetSecretVersionRequest): google.cloud.secretmanager.v1.GetSecretVersionRequest;

                    /**
                     * Encodes the specified GetSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.GetSecretVersionRequest.verify|verify} messages.
                     * @param message GetSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IGetSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified GetSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.GetSecretVersionRequest.verify|verify} messages.
                     * @param message GetSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IGetSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a GetSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns GetSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.GetSecretVersionRequest;

                    /**
                     * Decodes a GetSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns GetSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.GetSecretVersionRequest;

                    /**
                     * Verifies a GetSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a GetSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns GetSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.GetSecretVersionRequest;

                    /**
                     * Creates a plain object from a GetSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message GetSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.GetSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this GetSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for GetSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an UpdateSecretRequest. */
                interface IUpdateSecretRequest {

                    /** UpdateSecretRequest secret */
                    secret?: (google.cloud.secretmanager.v1.ISecret|null);

                    /** UpdateSecretRequest updateMask */
                    updateMask?: (google.protobuf.IFieldMask|null);
                }

                /** Represents an UpdateSecretRequest. */
                class UpdateSecretRequest implements IUpdateSecretRequest {

                    /**
                     * Constructs a new UpdateSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IUpdateSecretRequest);

                    /** UpdateSecretRequest secret. */
                    public secret?: (google.cloud.secretmanager.v1.ISecret|null);

                    /** UpdateSecretRequest updateMask. */
                    public updateMask?: (google.protobuf.IFieldMask|null);

                    /**
                     * Creates a new UpdateSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns UpdateSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IUpdateSecretRequest): google.cloud.secretmanager.v1.UpdateSecretRequest;

                    /**
                     * Encodes the specified UpdateSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.UpdateSecretRequest.verify|verify} messages.
                     * @param message UpdateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IUpdateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified UpdateSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.UpdateSecretRequest.verify|verify} messages.
                     * @param message UpdateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IUpdateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an UpdateSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns UpdateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.UpdateSecretRequest;

                    /**
                     * Decodes an UpdateSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns UpdateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.UpdateSecretRequest;

                    /**
                     * Verifies an UpdateSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an UpdateSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns UpdateSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.UpdateSecretRequest;

                    /**
                     * Creates a plain object from an UpdateSecretRequest message. Also converts values to other types if specified.
                     * @param message UpdateSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.UpdateSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this UpdateSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for UpdateSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AccessSecretVersionRequest. */
                interface IAccessSecretVersionRequest {

                    /** AccessSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents an AccessSecretVersionRequest. */
                class AccessSecretVersionRequest implements IAccessSecretVersionRequest {

                    /**
                     * Constructs a new AccessSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IAccessSecretVersionRequest);

                    /** AccessSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new AccessSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AccessSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IAccessSecretVersionRequest): google.cloud.secretmanager.v1.AccessSecretVersionRequest;

                    /**
                     * Encodes the specified AccessSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.AccessSecretVersionRequest.verify|verify} messages.
                     * @param message AccessSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IAccessSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AccessSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.AccessSecretVersionRequest.verify|verify} messages.
                     * @param message AccessSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IAccessSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AccessSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AccessSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.AccessSecretVersionRequest;

                    /**
                     * Decodes an AccessSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AccessSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.AccessSecretVersionRequest;

                    /**
                     * Verifies an AccessSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AccessSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AccessSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.AccessSecretVersionRequest;

                    /**
                     * Creates a plain object from an AccessSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message AccessSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.AccessSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AccessSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AccessSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AccessSecretVersionResponse. */
                interface IAccessSecretVersionResponse {

                    /** AccessSecretVersionResponse name */
                    name?: (string|null);

                    /** AccessSecretVersionResponse payload */
                    payload?: (google.cloud.secretmanager.v1.ISecretPayload|null);
                }

                /** Represents an AccessSecretVersionResponse. */
                class AccessSecretVersionResponse implements IAccessSecretVersionResponse {

                    /**
                     * Constructs a new AccessSecretVersionResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IAccessSecretVersionResponse);

                    /** AccessSecretVersionResponse name. */
                    public name: string;

                    /** AccessSecretVersionResponse payload. */
                    public payload?: (google.cloud.secretmanager.v1.ISecretPayload|null);

                    /**
                     * Creates a new AccessSecretVersionResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AccessSecretVersionResponse instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IAccessSecretVersionResponse): google.cloud.secretmanager.v1.AccessSecretVersionResponse;

                    /**
                     * Encodes the specified AccessSecretVersionResponse message. Does not implicitly {@link google.cloud.secretmanager.v1.AccessSecretVersionResponse.verify|verify} messages.
                     * @param message AccessSecretVersionResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IAccessSecretVersionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AccessSecretVersionResponse message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.AccessSecretVersionResponse.verify|verify} messages.
                     * @param message AccessSecretVersionResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IAccessSecretVersionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AccessSecretVersionResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AccessSecretVersionResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.AccessSecretVersionResponse;

                    /**
                     * Decodes an AccessSecretVersionResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AccessSecretVersionResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.AccessSecretVersionResponse;

                    /**
                     * Verifies an AccessSecretVersionResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AccessSecretVersionResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AccessSecretVersionResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.AccessSecretVersionResponse;

                    /**
                     * Creates a plain object from an AccessSecretVersionResponse message. Also converts values to other types if specified.
                     * @param message AccessSecretVersionResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.AccessSecretVersionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AccessSecretVersionResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AccessSecretVersionResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DeleteSecretRequest. */
                interface IDeleteSecretRequest {

                    /** DeleteSecretRequest name */
                    name?: (string|null);

                    /** DeleteSecretRequest etag */
                    etag?: (string|null);
                }

                /** Represents a DeleteSecretRequest. */
                class DeleteSecretRequest implements IDeleteSecretRequest {

                    /**
                     * Constructs a new DeleteSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IDeleteSecretRequest);

                    /** DeleteSecretRequest name. */
                    public name: string;

                    /** DeleteSecretRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new DeleteSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DeleteSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IDeleteSecretRequest): google.cloud.secretmanager.v1.DeleteSecretRequest;

                    /**
                     * Encodes the specified DeleteSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.DeleteSecretRequest.verify|verify} messages.
                     * @param message DeleteSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IDeleteSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DeleteSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.DeleteSecretRequest.verify|verify} messages.
                     * @param message DeleteSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IDeleteSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DeleteSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DeleteSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.DeleteSecretRequest;

                    /**
                     * Decodes a DeleteSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DeleteSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.DeleteSecretRequest;

                    /**
                     * Verifies a DeleteSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DeleteSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DeleteSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.DeleteSecretRequest;

                    /**
                     * Creates a plain object from a DeleteSecretRequest message. Also converts values to other types if specified.
                     * @param message DeleteSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.DeleteSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DeleteSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DeleteSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DisableSecretVersionRequest. */
                interface IDisableSecretVersionRequest {

                    /** DisableSecretVersionRequest name */
                    name?: (string|null);

                    /** DisableSecretVersionRequest etag */
                    etag?: (string|null);
                }

                /** Represents a DisableSecretVersionRequest. */
                class DisableSecretVersionRequest implements IDisableSecretVersionRequest {

                    /**
                     * Constructs a new DisableSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IDisableSecretVersionRequest);

                    /** DisableSecretVersionRequest name. */
                    public name: string;

                    /** DisableSecretVersionRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new DisableSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DisableSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IDisableSecretVersionRequest): google.cloud.secretmanager.v1.DisableSecretVersionRequest;

                    /**
                     * Encodes the specified DisableSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.DisableSecretVersionRequest.verify|verify} messages.
                     * @param message DisableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IDisableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DisableSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.DisableSecretVersionRequest.verify|verify} messages.
                     * @param message DisableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IDisableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DisableSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DisableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.DisableSecretVersionRequest;

                    /**
                     * Decodes a DisableSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DisableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.DisableSecretVersionRequest;

                    /**
                     * Verifies a DisableSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DisableSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DisableSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.DisableSecretVersionRequest;

                    /**
                     * Creates a plain object from a DisableSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message DisableSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.DisableSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DisableSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DisableSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an EnableSecretVersionRequest. */
                interface IEnableSecretVersionRequest {

                    /** EnableSecretVersionRequest name */
                    name?: (string|null);

                    /** EnableSecretVersionRequest etag */
                    etag?: (string|null);
                }

                /** Represents an EnableSecretVersionRequest. */
                class EnableSecretVersionRequest implements IEnableSecretVersionRequest {

                    /**
                     * Constructs a new EnableSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IEnableSecretVersionRequest);

                    /** EnableSecretVersionRequest name. */
                    public name: string;

                    /** EnableSecretVersionRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new EnableSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns EnableSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IEnableSecretVersionRequest): google.cloud.secretmanager.v1.EnableSecretVersionRequest;

                    /**
                     * Encodes the specified EnableSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.EnableSecretVersionRequest.verify|verify} messages.
                     * @param message EnableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IEnableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified EnableSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.EnableSecretVersionRequest.verify|verify} messages.
                     * @param message EnableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IEnableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an EnableSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns EnableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.EnableSecretVersionRequest;

                    /**
                     * Decodes an EnableSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns EnableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.EnableSecretVersionRequest;

                    /**
                     * Verifies an EnableSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an EnableSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns EnableSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.EnableSecretVersionRequest;

                    /**
                     * Creates a plain object from an EnableSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message EnableSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.EnableSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this EnableSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for EnableSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DestroySecretVersionRequest. */
                interface IDestroySecretVersionRequest {

                    /** DestroySecretVersionRequest name */
                    name?: (string|null);

                    /** DestroySecretVersionRequest etag */
                    etag?: (string|null);
                }

                /** Represents a DestroySecretVersionRequest. */
                class DestroySecretVersionRequest implements IDestroySecretVersionRequest {

                    /**
                     * Constructs a new DestroySecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1.IDestroySecretVersionRequest);

                    /** DestroySecretVersionRequest name. */
                    public name: string;

                    /** DestroySecretVersionRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new DestroySecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DestroySecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1.IDestroySecretVersionRequest): google.cloud.secretmanager.v1.DestroySecretVersionRequest;

                    /**
                     * Encodes the specified DestroySecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1.DestroySecretVersionRequest.verify|verify} messages.
                     * @param message DestroySecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1.IDestroySecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DestroySecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1.DestroySecretVersionRequest.verify|verify} messages.
                     * @param message DestroySecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1.IDestroySecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DestroySecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DestroySecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1.DestroySecretVersionRequest;

                    /**
                     * Decodes a DestroySecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DestroySecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1.DestroySecretVersionRequest;

                    /**
                     * Verifies a DestroySecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DestroySecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DestroySecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1.DestroySecretVersionRequest;

                    /**
                     * Creates a plain object from a DestroySecretVersionRequest message. Also converts values to other types if specified.
                     * @param message DestroySecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1.DestroySecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DestroySecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DestroySecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }
            }

            /** Namespace v1beta2. */
            namespace v1beta2 {

                /** Properties of a Secret. */
                interface ISecret {

                    /** Secret name */
                    name?: (string|null);

                    /** Secret replication */
                    replication?: (google.cloud.secretmanager.v1beta2.IReplication|null);

                    /** Secret createTime */
                    createTime?: (google.protobuf.ITimestamp|null);

                    /** Secret labels */
                    labels?: ({ [k: string]: string }|null);

                    /** Secret topics */
                    topics?: (google.cloud.secretmanager.v1beta2.ITopic[]|null);

                    /** Secret expireTime */
                    expireTime?: (google.protobuf.ITimestamp|null);

                    /** Secret ttl */
                    ttl?: (google.protobuf.IDuration|null);

                    /** Secret etag */
                    etag?: (string|null);

                    /** Secret rotation */
                    rotation?: (google.cloud.secretmanager.v1beta2.IRotation|null);

                    /** Secret versionAliases */
                    versionAliases?: ({ [k: string]: (number|Long|string) }|null);

                    /** Secret annotations */
                    annotations?: ({ [k: string]: string }|null);

                    /** Secret versionDestroyTtl */
                    versionDestroyTtl?: (google.protobuf.IDuration|null);

                    /** Secret customerManagedEncryption */
                    customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption|null);
                }

                /** Represents a Secret. */
                class Secret implements ISecret {

                    /**
                     * Constructs a new Secret.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ISecret);

                    /** Secret name. */
                    public name: string;

                    /** Secret replication. */
                    public replication?: (google.cloud.secretmanager.v1beta2.IReplication|null);

                    /** Secret createTime. */
                    public createTime?: (google.protobuf.ITimestamp|null);

                    /** Secret labels. */
                    public labels: { [k: string]: string };

                    /** Secret topics. */
                    public topics: google.cloud.secretmanager.v1beta2.ITopic[];

                    /** Secret expireTime. */
                    public expireTime?: (google.protobuf.ITimestamp|null);

                    /** Secret ttl. */
                    public ttl?: (google.protobuf.IDuration|null);

                    /** Secret etag. */
                    public etag: string;

                    /** Secret rotation. */
                    public rotation?: (google.cloud.secretmanager.v1beta2.IRotation|null);

                    /** Secret versionAliases. */
                    public versionAliases: { [k: string]: (number|Long|string) };

                    /** Secret annotations. */
                    public annotations: { [k: string]: string };

                    /** Secret versionDestroyTtl. */
                    public versionDestroyTtl?: (google.protobuf.IDuration|null);

                    /** Secret customerManagedEncryption. */
                    public customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption|null);

                    /** Secret expiration. */
                    public expiration?: ("expireTime"|"ttl");

                    /**
                     * Creates a new Secret instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Secret instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ISecret): google.cloud.secretmanager.v1beta2.Secret;

                    /**
                     * Encodes the specified Secret message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Secret.verify|verify} messages.
                     * @param message Secret message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ISecret, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Secret message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Secret.verify|verify} messages.
                     * @param message Secret message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ISecret, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Secret message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Secret
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Secret;

                    /**
                     * Decodes a Secret message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Secret
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Secret;

                    /**
                     * Verifies a Secret message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Secret message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Secret
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Secret;

                    /**
                     * Creates a plain object from a Secret message. Also converts values to other types if specified.
                     * @param message Secret
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.Secret, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Secret to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Secret
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a SecretVersion. */
                interface ISecretVersion {

                    /** SecretVersion name */
                    name?: (string|null);

                    /** SecretVersion createTime */
                    createTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion destroyTime */
                    destroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion state */
                    state?: (google.cloud.secretmanager.v1beta2.SecretVersion.State|keyof typeof google.cloud.secretmanager.v1beta2.SecretVersion.State|null);

                    /** SecretVersion replicationStatus */
                    replicationStatus?: (google.cloud.secretmanager.v1beta2.IReplicationStatus|null);

                    /** SecretVersion etag */
                    etag?: (string|null);

                    /** SecretVersion clientSpecifiedPayloadChecksum */
                    clientSpecifiedPayloadChecksum?: (boolean|null);

                    /** SecretVersion scheduledDestroyTime */
                    scheduledDestroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion customerManagedEncryption */
                    customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus|null);
                }

                /** Represents a SecretVersion. */
                class SecretVersion implements ISecretVersion {

                    /**
                     * Constructs a new SecretVersion.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ISecretVersion);

                    /** SecretVersion name. */
                    public name: string;

                    /** SecretVersion createTime. */
                    public createTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion destroyTime. */
                    public destroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion state. */
                    public state: (google.cloud.secretmanager.v1beta2.SecretVersion.State|keyof typeof google.cloud.secretmanager.v1beta2.SecretVersion.State);

                    /** SecretVersion replicationStatus. */
                    public replicationStatus?: (google.cloud.secretmanager.v1beta2.IReplicationStatus|null);

                    /** SecretVersion etag. */
                    public etag: string;

                    /** SecretVersion clientSpecifiedPayloadChecksum. */
                    public clientSpecifiedPayloadChecksum: boolean;

                    /** SecretVersion scheduledDestroyTime. */
                    public scheduledDestroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion customerManagedEncryption. */
                    public customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus|null);

                    /**
                     * Creates a new SecretVersion instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns SecretVersion instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ISecretVersion): google.cloud.secretmanager.v1beta2.SecretVersion;

                    /**
                     * Encodes the specified SecretVersion message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.SecretVersion.verify|verify} messages.
                     * @param message SecretVersion message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ISecretVersion, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified SecretVersion message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.SecretVersion.verify|verify} messages.
                     * @param message SecretVersion message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ISecretVersion, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a SecretVersion message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns SecretVersion
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.SecretVersion;

                    /**
                     * Decodes a SecretVersion message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns SecretVersion
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.SecretVersion;

                    /**
                     * Verifies a SecretVersion message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a SecretVersion message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns SecretVersion
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.SecretVersion;

                    /**
                     * Creates a plain object from a SecretVersion message. Also converts values to other types if specified.
                     * @param message SecretVersion
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.SecretVersion, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this SecretVersion to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for SecretVersion
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace SecretVersion {

                    /** State enum. */
                    enum State {
                        STATE_UNSPECIFIED = 0,
                        ENABLED = 1,
                        DISABLED = 2,
                        DESTROYED = 3
                    }
                }

                /** Properties of a Replication. */
                interface IReplication {

                    /** Replication automatic */
                    automatic?: (google.cloud.secretmanager.v1beta2.Replication.IAutomatic|null);

                    /** Replication userManaged */
                    userManaged?: (google.cloud.secretmanager.v1beta2.Replication.IUserManaged|null);
                }

                /** Represents a Replication. */
                class Replication implements IReplication {

                    /**
                     * Constructs a new Replication.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IReplication);

                    /** Replication automatic. */
                    public automatic?: (google.cloud.secretmanager.v1beta2.Replication.IAutomatic|null);

                    /** Replication userManaged. */
                    public userManaged?: (google.cloud.secretmanager.v1beta2.Replication.IUserManaged|null);

                    /** Replication replication. */
                    public replication?: ("automatic"|"userManaged");

                    /**
                     * Creates a new Replication instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Replication instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IReplication): google.cloud.secretmanager.v1beta2.Replication;

                    /**
                     * Encodes the specified Replication message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.verify|verify} messages.
                     * @param message Replication message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IReplication, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Replication message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.verify|verify} messages.
                     * @param message Replication message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IReplication, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Replication message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Replication
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Replication;

                    /**
                     * Decodes a Replication message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Replication
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Replication;

                    /**
                     * Verifies a Replication message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Replication message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Replication
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Replication;

                    /**
                     * Creates a plain object from a Replication message. Also converts values to other types if specified.
                     * @param message Replication
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.Replication, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Replication to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Replication
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace Replication {

                    /** Properties of an Automatic. */
                    interface IAutomatic {

                        /** Automatic customerManagedEncryption */
                        customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption|null);
                    }

                    /** Represents an Automatic. */
                    class Automatic implements IAutomatic {

                        /**
                         * Constructs a new Automatic.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1beta2.Replication.IAutomatic);

                        /** Automatic customerManagedEncryption. */
                        public customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption|null);

                        /**
                         * Creates a new Automatic instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns Automatic instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1beta2.Replication.IAutomatic): google.cloud.secretmanager.v1beta2.Replication.Automatic;

                        /**
                         * Encodes the specified Automatic message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.Automatic.verify|verify} messages.
                         * @param message Automatic message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1beta2.Replication.IAutomatic, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified Automatic message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.Automatic.verify|verify} messages.
                         * @param message Automatic message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.Replication.IAutomatic, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes an Automatic message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns Automatic
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Replication.Automatic;

                        /**
                         * Decodes an Automatic message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns Automatic
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Replication.Automatic;

                        /**
                         * Verifies an Automatic message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates an Automatic message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns Automatic
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Replication.Automatic;

                        /**
                         * Creates a plain object from an Automatic message. Also converts values to other types if specified.
                         * @param message Automatic
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1beta2.Replication.Automatic, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this Automatic to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for Automatic
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a UserManaged. */
                    interface IUserManaged {

                        /** UserManaged replicas */
                        replicas?: (google.cloud.secretmanager.v1beta2.Replication.UserManaged.IReplica[]|null);
                    }

                    /** Represents a UserManaged. */
                    class UserManaged implements IUserManaged {

                        /**
                         * Constructs a new UserManaged.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1beta2.Replication.IUserManaged);

                        /** UserManaged replicas. */
                        public replicas: google.cloud.secretmanager.v1beta2.Replication.UserManaged.IReplica[];

                        /**
                         * Creates a new UserManaged instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns UserManaged instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1beta2.Replication.IUserManaged): google.cloud.secretmanager.v1beta2.Replication.UserManaged;

                        /**
                         * Encodes the specified UserManaged message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.UserManaged.verify|verify} messages.
                         * @param message UserManaged message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1beta2.Replication.IUserManaged, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified UserManaged message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.UserManaged.verify|verify} messages.
                         * @param message UserManaged message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.Replication.IUserManaged, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a UserManaged message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns UserManaged
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Replication.UserManaged;

                        /**
                         * Decodes a UserManaged message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns UserManaged
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Replication.UserManaged;

                        /**
                         * Verifies a UserManaged message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a UserManaged message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns UserManaged
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Replication.UserManaged;

                        /**
                         * Creates a plain object from a UserManaged message. Also converts values to other types if specified.
                         * @param message UserManaged
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1beta2.Replication.UserManaged, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this UserManaged to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for UserManaged
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    namespace UserManaged {

                        /** Properties of a Replica. */
                        interface IReplica {

                            /** Replica location */
                            location?: (string|null);

                            /** Replica customerManagedEncryption */
                            customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption|null);
                        }

                        /** Represents a Replica. */
                        class Replica implements IReplica {

                            /**
                             * Constructs a new Replica.
                             * @param [properties] Properties to set
                             */
                            constructor(properties?: google.cloud.secretmanager.v1beta2.Replication.UserManaged.IReplica);

                            /** Replica location. */
                            public location: string;

                            /** Replica customerManagedEncryption. */
                            public customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption|null);

                            /**
                             * Creates a new Replica instance using the specified properties.
                             * @param [properties] Properties to set
                             * @returns Replica instance
                             */
                            public static create(properties?: google.cloud.secretmanager.v1beta2.Replication.UserManaged.IReplica): google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica;

                            /**
                             * Encodes the specified Replica message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica.verify|verify} messages.
                             * @param message Replica message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encode(message: google.cloud.secretmanager.v1beta2.Replication.UserManaged.IReplica, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Encodes the specified Replica message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica.verify|verify} messages.
                             * @param message Replica message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.Replication.UserManaged.IReplica, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Decodes a Replica message from the specified reader or buffer.
                             * @param reader Reader or buffer to decode from
                             * @param [length] Message length if known beforehand
                             * @returns Replica
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica;

                            /**
                             * Decodes a Replica message from the specified reader or buffer, length delimited.
                             * @param reader Reader or buffer to decode from
                             * @returns Replica
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica;

                            /**
                             * Verifies a Replica message.
                             * @param message Plain object to verify
                             * @returns `null` if valid, otherwise the reason why it is not
                             */
                            public static verify(message: { [k: string]: any }): (string|null);

                            /**
                             * Creates a Replica message from a plain object. Also converts values to their respective internal types.
                             * @param object Plain object
                             * @returns Replica
                             */
                            public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica;

                            /**
                             * Creates a plain object from a Replica message. Also converts values to other types if specified.
                             * @param message Replica
                             * @param [options] Conversion options
                             * @returns Plain object
                             */
                            public static toObject(message: google.cloud.secretmanager.v1beta2.Replication.UserManaged.Replica, options?: $protobuf.IConversionOptions): { [k: string]: any };

                            /**
                             * Converts this Replica to JSON.
                             * @returns JSON object
                             */
                            public toJSON(): { [k: string]: any };

                            /**
                             * Gets the default type url for Replica
                             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                             * @returns The default type url
                             */
                            public static getTypeUrl(typeUrlPrefix?: string): string;
                        }
                    }
                }

                /** Properties of a CustomerManagedEncryption. */
                interface ICustomerManagedEncryption {

                    /** CustomerManagedEncryption kmsKeyName */
                    kmsKeyName?: (string|null);
                }

                /** Represents a CustomerManagedEncryption. */
                class CustomerManagedEncryption implements ICustomerManagedEncryption {

                    /**
                     * Constructs a new CustomerManagedEncryption.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption);

                    /** CustomerManagedEncryption kmsKeyName. */
                    public kmsKeyName: string;

                    /**
                     * Creates a new CustomerManagedEncryption instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CustomerManagedEncryption instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption): google.cloud.secretmanager.v1beta2.CustomerManagedEncryption;

                    /**
                     * Encodes the specified CustomerManagedEncryption message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.CustomerManagedEncryption.verify|verify} messages.
                     * @param message CustomerManagedEncryption message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CustomerManagedEncryption message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.CustomerManagedEncryption.verify|verify} messages.
                     * @param message CustomerManagedEncryption message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryption, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CustomerManagedEncryption message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CustomerManagedEncryption
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.CustomerManagedEncryption;

                    /**
                     * Decodes a CustomerManagedEncryption message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CustomerManagedEncryption
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.CustomerManagedEncryption;

                    /**
                     * Verifies a CustomerManagedEncryption message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CustomerManagedEncryption message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CustomerManagedEncryption
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.CustomerManagedEncryption;

                    /**
                     * Creates a plain object from a CustomerManagedEncryption message. Also converts values to other types if specified.
                     * @param message CustomerManagedEncryption
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.CustomerManagedEncryption, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CustomerManagedEncryption to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CustomerManagedEncryption
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ReplicationStatus. */
                interface IReplicationStatus {

                    /** ReplicationStatus automatic */
                    automatic?: (google.cloud.secretmanager.v1beta2.ReplicationStatus.IAutomaticStatus|null);

                    /** ReplicationStatus userManaged */
                    userManaged?: (google.cloud.secretmanager.v1beta2.ReplicationStatus.IUserManagedStatus|null);
                }

                /** Represents a ReplicationStatus. */
                class ReplicationStatus implements IReplicationStatus {

                    /**
                     * Constructs a new ReplicationStatus.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IReplicationStatus);

                    /** ReplicationStatus automatic. */
                    public automatic?: (google.cloud.secretmanager.v1beta2.ReplicationStatus.IAutomaticStatus|null);

                    /** ReplicationStatus userManaged. */
                    public userManaged?: (google.cloud.secretmanager.v1beta2.ReplicationStatus.IUserManagedStatus|null);

                    /** ReplicationStatus replicationStatus. */
                    public replicationStatus?: ("automatic"|"userManaged");

                    /**
                     * Creates a new ReplicationStatus instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ReplicationStatus instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IReplicationStatus): google.cloud.secretmanager.v1beta2.ReplicationStatus;

                    /**
                     * Encodes the specified ReplicationStatus message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.verify|verify} messages.
                     * @param message ReplicationStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IReplicationStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ReplicationStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.verify|verify} messages.
                     * @param message ReplicationStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IReplicationStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ReplicationStatus message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ReplicationStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ReplicationStatus;

                    /**
                     * Decodes a ReplicationStatus message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ReplicationStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ReplicationStatus;

                    /**
                     * Verifies a ReplicationStatus message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ReplicationStatus message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ReplicationStatus
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ReplicationStatus;

                    /**
                     * Creates a plain object from a ReplicationStatus message. Also converts values to other types if specified.
                     * @param message ReplicationStatus
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.ReplicationStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ReplicationStatus to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ReplicationStatus
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace ReplicationStatus {

                    /** Properties of an AutomaticStatus. */
                    interface IAutomaticStatus {

                        /** AutomaticStatus customerManagedEncryption */
                        customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus|null);
                    }

                    /** Represents an AutomaticStatus. */
                    class AutomaticStatus implements IAutomaticStatus {

                        /**
                         * Constructs a new AutomaticStatus.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1beta2.ReplicationStatus.IAutomaticStatus);

                        /** AutomaticStatus customerManagedEncryption. */
                        public customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus|null);

                        /**
                         * Creates a new AutomaticStatus instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns AutomaticStatus instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1beta2.ReplicationStatus.IAutomaticStatus): google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus;

                        /**
                         * Encodes the specified AutomaticStatus message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus.verify|verify} messages.
                         * @param message AutomaticStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.IAutomaticStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified AutomaticStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus.verify|verify} messages.
                         * @param message AutomaticStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.IAutomaticStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes an AutomaticStatus message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns AutomaticStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus;

                        /**
                         * Decodes an AutomaticStatus message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns AutomaticStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus;

                        /**
                         * Verifies an AutomaticStatus message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates an AutomaticStatus message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns AutomaticStatus
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus;

                        /**
                         * Creates a plain object from an AutomaticStatus message. Also converts values to other types if specified.
                         * @param message AutomaticStatus
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.AutomaticStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this AutomaticStatus to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for AutomaticStatus
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a UserManagedStatus. */
                    interface IUserManagedStatus {

                        /** UserManagedStatus replicas */
                        replicas?: (google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.IReplicaStatus[]|null);
                    }

                    /** Represents a UserManagedStatus. */
                    class UserManagedStatus implements IUserManagedStatus {

                        /**
                         * Constructs a new UserManagedStatus.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secretmanager.v1beta2.ReplicationStatus.IUserManagedStatus);

                        /** UserManagedStatus replicas. */
                        public replicas: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.IReplicaStatus[];

                        /**
                         * Creates a new UserManagedStatus instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns UserManagedStatus instance
                         */
                        public static create(properties?: google.cloud.secretmanager.v1beta2.ReplicationStatus.IUserManagedStatus): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus;

                        /**
                         * Encodes the specified UserManagedStatus message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.verify|verify} messages.
                         * @param message UserManagedStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.IUserManagedStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified UserManagedStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.verify|verify} messages.
                         * @param message UserManagedStatus message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.IUserManagedStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a UserManagedStatus message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns UserManagedStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus;

                        /**
                         * Decodes a UserManagedStatus message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns UserManagedStatus
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus;

                        /**
                         * Verifies a UserManagedStatus message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a UserManagedStatus message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns UserManagedStatus
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus;

                        /**
                         * Creates a plain object from a UserManagedStatus message. Also converts values to other types if specified.
                         * @param message UserManagedStatus
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this UserManagedStatus to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for UserManagedStatus
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    namespace UserManagedStatus {

                        /** Properties of a ReplicaStatus. */
                        interface IReplicaStatus {

                            /** ReplicaStatus location */
                            location?: (string|null);

                            /** ReplicaStatus customerManagedEncryption */
                            customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus|null);
                        }

                        /** Represents a ReplicaStatus. */
                        class ReplicaStatus implements IReplicaStatus {

                            /**
                             * Constructs a new ReplicaStatus.
                             * @param [properties] Properties to set
                             */
                            constructor(properties?: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.IReplicaStatus);

                            /** ReplicaStatus location. */
                            public location: string;

                            /** ReplicaStatus customerManagedEncryption. */
                            public customerManagedEncryption?: (google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus|null);

                            /**
                             * Creates a new ReplicaStatus instance using the specified properties.
                             * @param [properties] Properties to set
                             * @returns ReplicaStatus instance
                             */
                            public static create(properties?: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.IReplicaStatus): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Encodes the specified ReplicaStatus message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus.verify|verify} messages.
                             * @param message ReplicaStatus message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encode(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.IReplicaStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Encodes the specified ReplicaStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus.verify|verify} messages.
                             * @param message ReplicaStatus message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.IReplicaStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Decodes a ReplicaStatus message from the specified reader or buffer.
                             * @param reader Reader or buffer to decode from
                             * @param [length] Message length if known beforehand
                             * @returns ReplicaStatus
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Decodes a ReplicaStatus message from the specified reader or buffer, length delimited.
                             * @param reader Reader or buffer to decode from
                             * @returns ReplicaStatus
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Verifies a ReplicaStatus message.
                             * @param message Plain object to verify
                             * @returns `null` if valid, otherwise the reason why it is not
                             */
                            public static verify(message: { [k: string]: any }): (string|null);

                            /**
                             * Creates a ReplicaStatus message from a plain object. Also converts values to their respective internal types.
                             * @param object Plain object
                             * @returns ReplicaStatus
                             */
                            public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus;

                            /**
                             * Creates a plain object from a ReplicaStatus message. Also converts values to other types if specified.
                             * @param message ReplicaStatus
                             * @param [options] Conversion options
                             * @returns Plain object
                             */
                            public static toObject(message: google.cloud.secretmanager.v1beta2.ReplicationStatus.UserManagedStatus.ReplicaStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                            /**
                             * Converts this ReplicaStatus to JSON.
                             * @returns JSON object
                             */
                            public toJSON(): { [k: string]: any };

                            /**
                             * Gets the default type url for ReplicaStatus
                             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                             * @returns The default type url
                             */
                            public static getTypeUrl(typeUrlPrefix?: string): string;
                        }
                    }
                }

                /** Properties of a CustomerManagedEncryptionStatus. */
                interface ICustomerManagedEncryptionStatus {

                    /** CustomerManagedEncryptionStatus kmsKeyVersionName */
                    kmsKeyVersionName?: (string|null);
                }

                /** Represents a CustomerManagedEncryptionStatus. */
                class CustomerManagedEncryptionStatus implements ICustomerManagedEncryptionStatus {

                    /**
                     * Constructs a new CustomerManagedEncryptionStatus.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus);

                    /** CustomerManagedEncryptionStatus kmsKeyVersionName. */
                    public kmsKeyVersionName: string;

                    /**
                     * Creates a new CustomerManagedEncryptionStatus instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CustomerManagedEncryptionStatus instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus): google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus;

                    /**
                     * Encodes the specified CustomerManagedEncryptionStatus message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus.verify|verify} messages.
                     * @param message CustomerManagedEncryptionStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CustomerManagedEncryptionStatus message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus.verify|verify} messages.
                     * @param message CustomerManagedEncryptionStatus message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ICustomerManagedEncryptionStatus, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CustomerManagedEncryptionStatus message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CustomerManagedEncryptionStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus;

                    /**
                     * Decodes a CustomerManagedEncryptionStatus message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CustomerManagedEncryptionStatus
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus;

                    /**
                     * Verifies a CustomerManagedEncryptionStatus message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CustomerManagedEncryptionStatus message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CustomerManagedEncryptionStatus
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus;

                    /**
                     * Creates a plain object from a CustomerManagedEncryptionStatus message. Also converts values to other types if specified.
                     * @param message CustomerManagedEncryptionStatus
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.CustomerManagedEncryptionStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CustomerManagedEncryptionStatus to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CustomerManagedEncryptionStatus
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a Topic. */
                interface ITopic {

                    /** Topic name */
                    name?: (string|null);
                }

                /** Represents a Topic. */
                class Topic implements ITopic {

                    /**
                     * Constructs a new Topic.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ITopic);

                    /** Topic name. */
                    public name: string;

                    /**
                     * Creates a new Topic instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Topic instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ITopic): google.cloud.secretmanager.v1beta2.Topic;

                    /**
                     * Encodes the specified Topic message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Topic.verify|verify} messages.
                     * @param message Topic message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ITopic, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Topic message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Topic.verify|verify} messages.
                     * @param message Topic message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ITopic, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Topic message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Topic
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Topic;

                    /**
                     * Decodes a Topic message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Topic
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Topic;

                    /**
                     * Verifies a Topic message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Topic message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Topic
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Topic;

                    /**
                     * Creates a plain object from a Topic message. Also converts values to other types if specified.
                     * @param message Topic
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.Topic, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Topic to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Topic
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a Rotation. */
                interface IRotation {

                    /** Rotation nextRotationTime */
                    nextRotationTime?: (google.protobuf.ITimestamp|null);

                    /** Rotation rotationPeriod */
                    rotationPeriod?: (google.protobuf.IDuration|null);
                }

                /** Represents a Rotation. */
                class Rotation implements IRotation {

                    /**
                     * Constructs a new Rotation.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IRotation);

                    /** Rotation nextRotationTime. */
                    public nextRotationTime?: (google.protobuf.ITimestamp|null);

                    /** Rotation rotationPeriod. */
                    public rotationPeriod?: (google.protobuf.IDuration|null);

                    /**
                     * Creates a new Rotation instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Rotation instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IRotation): google.cloud.secretmanager.v1beta2.Rotation;

                    /**
                     * Encodes the specified Rotation message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Rotation.verify|verify} messages.
                     * @param message Rotation message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IRotation, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Rotation message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.Rotation.verify|verify} messages.
                     * @param message Rotation message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IRotation, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Rotation message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Rotation
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.Rotation;

                    /**
                     * Decodes a Rotation message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Rotation
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.Rotation;

                    /**
                     * Verifies a Rotation message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Rotation message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Rotation
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.Rotation;

                    /**
                     * Creates a plain object from a Rotation message. Also converts values to other types if specified.
                     * @param message Rotation
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.Rotation, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Rotation to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Rotation
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a SecretPayload. */
                interface ISecretPayload {

                    /** SecretPayload data */
                    data?: (Uint8Array|string|null);

                    /** SecretPayload dataCrc32c */
                    dataCrc32c?: (number|Long|string|null);
                }

                /** Represents a SecretPayload. */
                class SecretPayload implements ISecretPayload {

                    /**
                     * Constructs a new SecretPayload.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ISecretPayload);

                    /** SecretPayload data. */
                    public data: (Uint8Array|string);

                    /** SecretPayload dataCrc32c. */
                    public dataCrc32c?: (number|Long|string|null);

                    /** SecretPayload _dataCrc32c. */
                    public _dataCrc32c?: "dataCrc32c";

                    /**
                     * Creates a new SecretPayload instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns SecretPayload instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ISecretPayload): google.cloud.secretmanager.v1beta2.SecretPayload;

                    /**
                     * Encodes the specified SecretPayload message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.SecretPayload.verify|verify} messages.
                     * @param message SecretPayload message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ISecretPayload, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified SecretPayload message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.SecretPayload.verify|verify} messages.
                     * @param message SecretPayload message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ISecretPayload, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a SecretPayload message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns SecretPayload
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.SecretPayload;

                    /**
                     * Decodes a SecretPayload message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns SecretPayload
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.SecretPayload;

                    /**
                     * Verifies a SecretPayload message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a SecretPayload message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns SecretPayload
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.SecretPayload;

                    /**
                     * Creates a plain object from a SecretPayload message. Also converts values to other types if specified.
                     * @param message SecretPayload
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.SecretPayload, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this SecretPayload to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for SecretPayload
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Represents a SecretManagerService */
                class SecretManagerService extends $protobuf.rpc.Service {

                    /**
                     * Constructs a new SecretManagerService service.
                     * @param rpcImpl RPC implementation
                     * @param [requestDelimited=false] Whether requests are length-delimited
                     * @param [responseDelimited=false] Whether responses are length-delimited
                     */
                    constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

                    /**
                     * Creates new SecretManagerService service using the specified rpc implementation.
                     * @param rpcImpl RPC implementation
                     * @param [requestDelimited=false] Whether requests are length-delimited
                     * @param [responseDelimited=false] Whether responses are length-delimited
                     * @returns RPC service. Useful where requests and/or responses are streamed.
                     */
                    public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): SecretManagerService;

                    /**
                     * Calls ListSecrets.
                     * @param request ListSecretsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and ListSecretsResponse
                     */
                    public listSecrets(request: google.cloud.secretmanager.v1beta2.IListSecretsRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.ListSecretsCallback): void;

                    /**
                     * Calls ListSecrets.
                     * @param request ListSecretsRequest message or plain object
                     * @returns Promise
                     */
                    public listSecrets(request: google.cloud.secretmanager.v1beta2.IListSecretsRequest): Promise<google.cloud.secretmanager.v1beta2.ListSecretsResponse>;

                    /**
                     * Calls CreateSecret.
                     * @param request CreateSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public createSecret(request: google.cloud.secretmanager.v1beta2.ICreateSecretRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.CreateSecretCallback): void;

                    /**
                     * Calls CreateSecret.
                     * @param request CreateSecretRequest message or plain object
                     * @returns Promise
                     */
                    public createSecret(request: google.cloud.secretmanager.v1beta2.ICreateSecretRequest): Promise<google.cloud.secretmanager.v1beta2.Secret>;

                    /**
                     * Calls AddSecretVersion.
                     * @param request AddSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public addSecretVersion(request: google.cloud.secretmanager.v1beta2.IAddSecretVersionRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.AddSecretVersionCallback): void;

                    /**
                     * Calls AddSecretVersion.
                     * @param request AddSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public addSecretVersion(request: google.cloud.secretmanager.v1beta2.IAddSecretVersionRequest): Promise<google.cloud.secretmanager.v1beta2.SecretVersion>;

                    /**
                     * Calls GetSecret.
                     * @param request GetSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public getSecret(request: google.cloud.secretmanager.v1beta2.IGetSecretRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.GetSecretCallback): void;

                    /**
                     * Calls GetSecret.
                     * @param request GetSecretRequest message or plain object
                     * @returns Promise
                     */
                    public getSecret(request: google.cloud.secretmanager.v1beta2.IGetSecretRequest): Promise<google.cloud.secretmanager.v1beta2.Secret>;

                    /**
                     * Calls UpdateSecret.
                     * @param request UpdateSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public updateSecret(request: google.cloud.secretmanager.v1beta2.IUpdateSecretRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.UpdateSecretCallback): void;

                    /**
                     * Calls UpdateSecret.
                     * @param request UpdateSecretRequest message or plain object
                     * @returns Promise
                     */
                    public updateSecret(request: google.cloud.secretmanager.v1beta2.IUpdateSecretRequest): Promise<google.cloud.secretmanager.v1beta2.Secret>;

                    /**
                     * Calls DeleteSecret.
                     * @param request DeleteSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Empty
                     */
                    public deleteSecret(request: google.cloud.secretmanager.v1beta2.IDeleteSecretRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.DeleteSecretCallback): void;

                    /**
                     * Calls DeleteSecret.
                     * @param request DeleteSecretRequest message or plain object
                     * @returns Promise
                     */
                    public deleteSecret(request: google.cloud.secretmanager.v1beta2.IDeleteSecretRequest): Promise<google.protobuf.Empty>;

                    /**
                     * Calls ListSecretVersions.
                     * @param request ListSecretVersionsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and ListSecretVersionsResponse
                     */
                    public listSecretVersions(request: google.cloud.secretmanager.v1beta2.IListSecretVersionsRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.ListSecretVersionsCallback): void;

                    /**
                     * Calls ListSecretVersions.
                     * @param request ListSecretVersionsRequest message or plain object
                     * @returns Promise
                     */
                    public listSecretVersions(request: google.cloud.secretmanager.v1beta2.IListSecretVersionsRequest): Promise<google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse>;

                    /**
                     * Calls GetSecretVersion.
                     * @param request GetSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public getSecretVersion(request: google.cloud.secretmanager.v1beta2.IGetSecretVersionRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.GetSecretVersionCallback): void;

                    /**
                     * Calls GetSecretVersion.
                     * @param request GetSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public getSecretVersion(request: google.cloud.secretmanager.v1beta2.IGetSecretVersionRequest): Promise<google.cloud.secretmanager.v1beta2.SecretVersion>;

                    /**
                     * Calls AccessSecretVersion.
                     * @param request AccessSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and AccessSecretVersionResponse
                     */
                    public accessSecretVersion(request: google.cloud.secretmanager.v1beta2.IAccessSecretVersionRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.AccessSecretVersionCallback): void;

                    /**
                     * Calls AccessSecretVersion.
                     * @param request AccessSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public accessSecretVersion(request: google.cloud.secretmanager.v1beta2.IAccessSecretVersionRequest): Promise<google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse>;

                    /**
                     * Calls DisableSecretVersion.
                     * @param request DisableSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public disableSecretVersion(request: google.cloud.secretmanager.v1beta2.IDisableSecretVersionRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.DisableSecretVersionCallback): void;

                    /**
                     * Calls DisableSecretVersion.
                     * @param request DisableSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public disableSecretVersion(request: google.cloud.secretmanager.v1beta2.IDisableSecretVersionRequest): Promise<google.cloud.secretmanager.v1beta2.SecretVersion>;

                    /**
                     * Calls EnableSecretVersion.
                     * @param request EnableSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public enableSecretVersion(request: google.cloud.secretmanager.v1beta2.IEnableSecretVersionRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.EnableSecretVersionCallback): void;

                    /**
                     * Calls EnableSecretVersion.
                     * @param request EnableSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public enableSecretVersion(request: google.cloud.secretmanager.v1beta2.IEnableSecretVersionRequest): Promise<google.cloud.secretmanager.v1beta2.SecretVersion>;

                    /**
                     * Calls DestroySecretVersion.
                     * @param request DestroySecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public destroySecretVersion(request: google.cloud.secretmanager.v1beta2.IDestroySecretVersionRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.DestroySecretVersionCallback): void;

                    /**
                     * Calls DestroySecretVersion.
                     * @param request DestroySecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public destroySecretVersion(request: google.cloud.secretmanager.v1beta2.IDestroySecretVersionRequest): Promise<google.cloud.secretmanager.v1beta2.SecretVersion>;

                    /**
                     * Calls SetIamPolicy.
                     * @param request SetIamPolicyRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Policy
                     */
                    public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.SetIamPolicyCallback): void;

                    /**
                     * Calls SetIamPolicy.
                     * @param request SetIamPolicyRequest message or plain object
                     * @returns Promise
                     */
                    public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                    /**
                     * Calls GetIamPolicy.
                     * @param request GetIamPolicyRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Policy
                     */
                    public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.GetIamPolicyCallback): void;

                    /**
                     * Calls GetIamPolicy.
                     * @param request GetIamPolicyRequest message or plain object
                     * @returns Promise
                     */
                    public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                    /**
                     * Calls TestIamPermissions.
                     * @param request TestIamPermissionsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and TestIamPermissionsResponse
                     */
                    public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest, callback: google.cloud.secretmanager.v1beta2.SecretManagerService.TestIamPermissionsCallback): void;

                    /**
                     * Calls TestIamPermissions.
                     * @param request TestIamPermissionsRequest message or plain object
                     * @returns Promise
                     */
                    public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest): Promise<google.iam.v1.TestIamPermissionsResponse>;
                }

                namespace SecretManagerService {

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|listSecrets}.
                     * @param error Error, if any
                     * @param [response] ListSecretsResponse
                     */
                    type ListSecretsCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.ListSecretsResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|createSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type CreateSecretCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|addSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type AddSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|getSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type GetSecretCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|updateSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type UpdateSecretCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|deleteSecret}.
                     * @param error Error, if any
                     * @param [response] Empty
                     */
                    type DeleteSecretCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|listSecretVersions}.
                     * @param error Error, if any
                     * @param [response] ListSecretVersionsResponse
                     */
                    type ListSecretVersionsCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|getSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type GetSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|accessSecretVersion}.
                     * @param error Error, if any
                     * @param [response] AccessSecretVersionResponse
                     */
                    type AccessSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|disableSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type DisableSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|enableSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type EnableSecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|destroySecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type DestroySecretVersionCallback = (error: (Error|null), response?: google.cloud.secretmanager.v1beta2.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|setIamPolicy}.
                     * @param error Error, if any
                     * @param [response] Policy
                     */
                    type SetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|getIamPolicy}.
                     * @param error Error, if any
                     * @param [response] Policy
                     */
                    type GetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                    /**
                     * Callback as used by {@link google.cloud.secretmanager.v1beta2.SecretManagerService|testIamPermissions}.
                     * @param error Error, if any
                     * @param [response] TestIamPermissionsResponse
                     */
                    type TestIamPermissionsCallback = (error: (Error|null), response?: google.iam.v1.TestIamPermissionsResponse) => void;
                }

                /** Properties of a ListSecretsRequest. */
                interface IListSecretsRequest {

                    /** ListSecretsRequest parent */
                    parent?: (string|null);

                    /** ListSecretsRequest pageSize */
                    pageSize?: (number|null);

                    /** ListSecretsRequest pageToken */
                    pageToken?: (string|null);

                    /** ListSecretsRequest filter */
                    filter?: (string|null);
                }

                /** Represents a ListSecretsRequest. */
                class ListSecretsRequest implements IListSecretsRequest {

                    /**
                     * Constructs a new ListSecretsRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IListSecretsRequest);

                    /** ListSecretsRequest parent. */
                    public parent: string;

                    /** ListSecretsRequest pageSize. */
                    public pageSize: number;

                    /** ListSecretsRequest pageToken. */
                    public pageToken: string;

                    /** ListSecretsRequest filter. */
                    public filter: string;

                    /**
                     * Creates a new ListSecretsRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretsRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IListSecretsRequest): google.cloud.secretmanager.v1beta2.ListSecretsRequest;

                    /**
                     * Encodes the specified ListSecretsRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretsRequest.verify|verify} messages.
                     * @param message ListSecretsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IListSecretsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretsRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretsRequest.verify|verify} messages.
                     * @param message ListSecretsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IListSecretsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretsRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ListSecretsRequest;

                    /**
                     * Decodes a ListSecretsRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ListSecretsRequest;

                    /**
                     * Verifies a ListSecretsRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretsRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretsRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ListSecretsRequest;

                    /**
                     * Creates a plain object from a ListSecretsRequest message. Also converts values to other types if specified.
                     * @param message ListSecretsRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.ListSecretsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretsRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretsRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretsResponse. */
                interface IListSecretsResponse {

                    /** ListSecretsResponse secrets */
                    secrets?: (google.cloud.secretmanager.v1beta2.ISecret[]|null);

                    /** ListSecretsResponse nextPageToken */
                    nextPageToken?: (string|null);

                    /** ListSecretsResponse totalSize */
                    totalSize?: (number|null);
                }

                /** Represents a ListSecretsResponse. */
                class ListSecretsResponse implements IListSecretsResponse {

                    /**
                     * Constructs a new ListSecretsResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IListSecretsResponse);

                    /** ListSecretsResponse secrets. */
                    public secrets: google.cloud.secretmanager.v1beta2.ISecret[];

                    /** ListSecretsResponse nextPageToken. */
                    public nextPageToken: string;

                    /** ListSecretsResponse totalSize. */
                    public totalSize: number;

                    /**
                     * Creates a new ListSecretsResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretsResponse instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IListSecretsResponse): google.cloud.secretmanager.v1beta2.ListSecretsResponse;

                    /**
                     * Encodes the specified ListSecretsResponse message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretsResponse.verify|verify} messages.
                     * @param message ListSecretsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IListSecretsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretsResponse message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretsResponse.verify|verify} messages.
                     * @param message ListSecretsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IListSecretsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretsResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ListSecretsResponse;

                    /**
                     * Decodes a ListSecretsResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ListSecretsResponse;

                    /**
                     * Verifies a ListSecretsResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretsResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretsResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ListSecretsResponse;

                    /**
                     * Creates a plain object from a ListSecretsResponse message. Also converts values to other types if specified.
                     * @param message ListSecretsResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.ListSecretsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretsResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretsResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a CreateSecretRequest. */
                interface ICreateSecretRequest {

                    /** CreateSecretRequest parent */
                    parent?: (string|null);

                    /** CreateSecretRequest secretId */
                    secretId?: (string|null);

                    /** CreateSecretRequest secret */
                    secret?: (google.cloud.secretmanager.v1beta2.ISecret|null);
                }

                /** Represents a CreateSecretRequest. */
                class CreateSecretRequest implements ICreateSecretRequest {

                    /**
                     * Constructs a new CreateSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.ICreateSecretRequest);

                    /** CreateSecretRequest parent. */
                    public parent: string;

                    /** CreateSecretRequest secretId. */
                    public secretId: string;

                    /** CreateSecretRequest secret. */
                    public secret?: (google.cloud.secretmanager.v1beta2.ISecret|null);

                    /**
                     * Creates a new CreateSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CreateSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.ICreateSecretRequest): google.cloud.secretmanager.v1beta2.CreateSecretRequest;

                    /**
                     * Encodes the specified CreateSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.CreateSecretRequest.verify|verify} messages.
                     * @param message CreateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.ICreateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CreateSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.CreateSecretRequest.verify|verify} messages.
                     * @param message CreateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.ICreateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CreateSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CreateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.CreateSecretRequest;

                    /**
                     * Decodes a CreateSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CreateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.CreateSecretRequest;

                    /**
                     * Verifies a CreateSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CreateSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CreateSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.CreateSecretRequest;

                    /**
                     * Creates a plain object from a CreateSecretRequest message. Also converts values to other types if specified.
                     * @param message CreateSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.CreateSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CreateSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CreateSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AddSecretVersionRequest. */
                interface IAddSecretVersionRequest {

                    /** AddSecretVersionRequest parent */
                    parent?: (string|null);

                    /** AddSecretVersionRequest payload */
                    payload?: (google.cloud.secretmanager.v1beta2.ISecretPayload|null);
                }

                /** Represents an AddSecretVersionRequest. */
                class AddSecretVersionRequest implements IAddSecretVersionRequest {

                    /**
                     * Constructs a new AddSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IAddSecretVersionRequest);

                    /** AddSecretVersionRequest parent. */
                    public parent: string;

                    /** AddSecretVersionRequest payload. */
                    public payload?: (google.cloud.secretmanager.v1beta2.ISecretPayload|null);

                    /**
                     * Creates a new AddSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AddSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IAddSecretVersionRequest): google.cloud.secretmanager.v1beta2.AddSecretVersionRequest;

                    /**
                     * Encodes the specified AddSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.AddSecretVersionRequest.verify|verify} messages.
                     * @param message AddSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IAddSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AddSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.AddSecretVersionRequest.verify|verify} messages.
                     * @param message AddSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IAddSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AddSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AddSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.AddSecretVersionRequest;

                    /**
                     * Decodes an AddSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AddSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.AddSecretVersionRequest;

                    /**
                     * Verifies an AddSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AddSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AddSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.AddSecretVersionRequest;

                    /**
                     * Creates a plain object from an AddSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message AddSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.AddSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AddSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AddSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a GetSecretRequest. */
                interface IGetSecretRequest {

                    /** GetSecretRequest name */
                    name?: (string|null);
                }

                /** Represents a GetSecretRequest. */
                class GetSecretRequest implements IGetSecretRequest {

                    /**
                     * Constructs a new GetSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IGetSecretRequest);

                    /** GetSecretRequest name. */
                    public name: string;

                    /**
                     * Creates a new GetSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns GetSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IGetSecretRequest): google.cloud.secretmanager.v1beta2.GetSecretRequest;

                    /**
                     * Encodes the specified GetSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.GetSecretRequest.verify|verify} messages.
                     * @param message GetSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IGetSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified GetSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.GetSecretRequest.verify|verify} messages.
                     * @param message GetSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IGetSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a GetSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns GetSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.GetSecretRequest;

                    /**
                     * Decodes a GetSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns GetSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.GetSecretRequest;

                    /**
                     * Verifies a GetSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a GetSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns GetSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.GetSecretRequest;

                    /**
                     * Creates a plain object from a GetSecretRequest message. Also converts values to other types if specified.
                     * @param message GetSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.GetSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this GetSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for GetSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretVersionsRequest. */
                interface IListSecretVersionsRequest {

                    /** ListSecretVersionsRequest parent */
                    parent?: (string|null);

                    /** ListSecretVersionsRequest pageSize */
                    pageSize?: (number|null);

                    /** ListSecretVersionsRequest pageToken */
                    pageToken?: (string|null);

                    /** ListSecretVersionsRequest filter */
                    filter?: (string|null);
                }

                /** Represents a ListSecretVersionsRequest. */
                class ListSecretVersionsRequest implements IListSecretVersionsRequest {

                    /**
                     * Constructs a new ListSecretVersionsRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IListSecretVersionsRequest);

                    /** ListSecretVersionsRequest parent. */
                    public parent: string;

                    /** ListSecretVersionsRequest pageSize. */
                    public pageSize: number;

                    /** ListSecretVersionsRequest pageToken. */
                    public pageToken: string;

                    /** ListSecretVersionsRequest filter. */
                    public filter: string;

                    /**
                     * Creates a new ListSecretVersionsRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretVersionsRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IListSecretVersionsRequest): google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest;

                    /**
                     * Encodes the specified ListSecretVersionsRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest.verify|verify} messages.
                     * @param message ListSecretVersionsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IListSecretVersionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretVersionsRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest.verify|verify} messages.
                     * @param message ListSecretVersionsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IListSecretVersionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretVersionsRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretVersionsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest;

                    /**
                     * Decodes a ListSecretVersionsRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretVersionsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest;

                    /**
                     * Verifies a ListSecretVersionsRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretVersionsRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretVersionsRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest;

                    /**
                     * Creates a plain object from a ListSecretVersionsRequest message. Also converts values to other types if specified.
                     * @param message ListSecretVersionsRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.ListSecretVersionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretVersionsRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretVersionsRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretVersionsResponse. */
                interface IListSecretVersionsResponse {

                    /** ListSecretVersionsResponse versions */
                    versions?: (google.cloud.secretmanager.v1beta2.ISecretVersion[]|null);

                    /** ListSecretVersionsResponse nextPageToken */
                    nextPageToken?: (string|null);

                    /** ListSecretVersionsResponse totalSize */
                    totalSize?: (number|null);
                }

                /** Represents a ListSecretVersionsResponse. */
                class ListSecretVersionsResponse implements IListSecretVersionsResponse {

                    /**
                     * Constructs a new ListSecretVersionsResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IListSecretVersionsResponse);

                    /** ListSecretVersionsResponse versions. */
                    public versions: google.cloud.secretmanager.v1beta2.ISecretVersion[];

                    /** ListSecretVersionsResponse nextPageToken. */
                    public nextPageToken: string;

                    /** ListSecretVersionsResponse totalSize. */
                    public totalSize: number;

                    /**
                     * Creates a new ListSecretVersionsResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretVersionsResponse instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IListSecretVersionsResponse): google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse;

                    /**
                     * Encodes the specified ListSecretVersionsResponse message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse.verify|verify} messages.
                     * @param message ListSecretVersionsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IListSecretVersionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretVersionsResponse message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse.verify|verify} messages.
                     * @param message ListSecretVersionsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IListSecretVersionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretVersionsResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretVersionsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse;

                    /**
                     * Decodes a ListSecretVersionsResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretVersionsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse;

                    /**
                     * Verifies a ListSecretVersionsResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretVersionsResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretVersionsResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse;

                    /**
                     * Creates a plain object from a ListSecretVersionsResponse message. Also converts values to other types if specified.
                     * @param message ListSecretVersionsResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.ListSecretVersionsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretVersionsResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretVersionsResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a GetSecretVersionRequest. */
                interface IGetSecretVersionRequest {

                    /** GetSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents a GetSecretVersionRequest. */
                class GetSecretVersionRequest implements IGetSecretVersionRequest {

                    /**
                     * Constructs a new GetSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IGetSecretVersionRequest);

                    /** GetSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new GetSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns GetSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IGetSecretVersionRequest): google.cloud.secretmanager.v1beta2.GetSecretVersionRequest;

                    /**
                     * Encodes the specified GetSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.GetSecretVersionRequest.verify|verify} messages.
                     * @param message GetSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IGetSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified GetSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.GetSecretVersionRequest.verify|verify} messages.
                     * @param message GetSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IGetSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a GetSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns GetSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.GetSecretVersionRequest;

                    /**
                     * Decodes a GetSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns GetSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.GetSecretVersionRequest;

                    /**
                     * Verifies a GetSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a GetSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns GetSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.GetSecretVersionRequest;

                    /**
                     * Creates a plain object from a GetSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message GetSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.GetSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this GetSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for GetSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an UpdateSecretRequest. */
                interface IUpdateSecretRequest {

                    /** UpdateSecretRequest secret */
                    secret?: (google.cloud.secretmanager.v1beta2.ISecret|null);

                    /** UpdateSecretRequest updateMask */
                    updateMask?: (google.protobuf.IFieldMask|null);
                }

                /** Represents an UpdateSecretRequest. */
                class UpdateSecretRequest implements IUpdateSecretRequest {

                    /**
                     * Constructs a new UpdateSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IUpdateSecretRequest);

                    /** UpdateSecretRequest secret. */
                    public secret?: (google.cloud.secretmanager.v1beta2.ISecret|null);

                    /** UpdateSecretRequest updateMask. */
                    public updateMask?: (google.protobuf.IFieldMask|null);

                    /**
                     * Creates a new UpdateSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns UpdateSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IUpdateSecretRequest): google.cloud.secretmanager.v1beta2.UpdateSecretRequest;

                    /**
                     * Encodes the specified UpdateSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.UpdateSecretRequest.verify|verify} messages.
                     * @param message UpdateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IUpdateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified UpdateSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.UpdateSecretRequest.verify|verify} messages.
                     * @param message UpdateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IUpdateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an UpdateSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns UpdateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.UpdateSecretRequest;

                    /**
                     * Decodes an UpdateSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns UpdateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.UpdateSecretRequest;

                    /**
                     * Verifies an UpdateSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an UpdateSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns UpdateSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.UpdateSecretRequest;

                    /**
                     * Creates a plain object from an UpdateSecretRequest message. Also converts values to other types if specified.
                     * @param message UpdateSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.UpdateSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this UpdateSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for UpdateSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AccessSecretVersionRequest. */
                interface IAccessSecretVersionRequest {

                    /** AccessSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents an AccessSecretVersionRequest. */
                class AccessSecretVersionRequest implements IAccessSecretVersionRequest {

                    /**
                     * Constructs a new AccessSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IAccessSecretVersionRequest);

                    /** AccessSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new AccessSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AccessSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IAccessSecretVersionRequest): google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest;

                    /**
                     * Encodes the specified AccessSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest.verify|verify} messages.
                     * @param message AccessSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IAccessSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AccessSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest.verify|verify} messages.
                     * @param message AccessSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IAccessSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AccessSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AccessSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest;

                    /**
                     * Decodes an AccessSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AccessSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest;

                    /**
                     * Verifies an AccessSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AccessSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AccessSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest;

                    /**
                     * Creates a plain object from an AccessSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message AccessSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.AccessSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AccessSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AccessSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AccessSecretVersionResponse. */
                interface IAccessSecretVersionResponse {

                    /** AccessSecretVersionResponse name */
                    name?: (string|null);

                    /** AccessSecretVersionResponse payload */
                    payload?: (google.cloud.secretmanager.v1beta2.ISecretPayload|null);
                }

                /** Represents an AccessSecretVersionResponse. */
                class AccessSecretVersionResponse implements IAccessSecretVersionResponse {

                    /**
                     * Constructs a new AccessSecretVersionResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IAccessSecretVersionResponse);

                    /** AccessSecretVersionResponse name. */
                    public name: string;

                    /** AccessSecretVersionResponse payload. */
                    public payload?: (google.cloud.secretmanager.v1beta2.ISecretPayload|null);

                    /**
                     * Creates a new AccessSecretVersionResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AccessSecretVersionResponse instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IAccessSecretVersionResponse): google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse;

                    /**
                     * Encodes the specified AccessSecretVersionResponse message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse.verify|verify} messages.
                     * @param message AccessSecretVersionResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IAccessSecretVersionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AccessSecretVersionResponse message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse.verify|verify} messages.
                     * @param message AccessSecretVersionResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IAccessSecretVersionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AccessSecretVersionResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AccessSecretVersionResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse;

                    /**
                     * Decodes an AccessSecretVersionResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AccessSecretVersionResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse;

                    /**
                     * Verifies an AccessSecretVersionResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AccessSecretVersionResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AccessSecretVersionResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse;

                    /**
                     * Creates a plain object from an AccessSecretVersionResponse message. Also converts values to other types if specified.
                     * @param message AccessSecretVersionResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.AccessSecretVersionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AccessSecretVersionResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AccessSecretVersionResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DeleteSecretRequest. */
                interface IDeleteSecretRequest {

                    /** DeleteSecretRequest name */
                    name?: (string|null);

                    /** DeleteSecretRequest etag */
                    etag?: (string|null);
                }

                /** Represents a DeleteSecretRequest. */
                class DeleteSecretRequest implements IDeleteSecretRequest {

                    /**
                     * Constructs a new DeleteSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IDeleteSecretRequest);

                    /** DeleteSecretRequest name. */
                    public name: string;

                    /** DeleteSecretRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new DeleteSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DeleteSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IDeleteSecretRequest): google.cloud.secretmanager.v1beta2.DeleteSecretRequest;

                    /**
                     * Encodes the specified DeleteSecretRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.DeleteSecretRequest.verify|verify} messages.
                     * @param message DeleteSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IDeleteSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DeleteSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.DeleteSecretRequest.verify|verify} messages.
                     * @param message DeleteSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IDeleteSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DeleteSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DeleteSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.DeleteSecretRequest;

                    /**
                     * Decodes a DeleteSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DeleteSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.DeleteSecretRequest;

                    /**
                     * Verifies a DeleteSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DeleteSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DeleteSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.DeleteSecretRequest;

                    /**
                     * Creates a plain object from a DeleteSecretRequest message. Also converts values to other types if specified.
                     * @param message DeleteSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.DeleteSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DeleteSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DeleteSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DisableSecretVersionRequest. */
                interface IDisableSecretVersionRequest {

                    /** DisableSecretVersionRequest name */
                    name?: (string|null);

                    /** DisableSecretVersionRequest etag */
                    etag?: (string|null);
                }

                /** Represents a DisableSecretVersionRequest. */
                class DisableSecretVersionRequest implements IDisableSecretVersionRequest {

                    /**
                     * Constructs a new DisableSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IDisableSecretVersionRequest);

                    /** DisableSecretVersionRequest name. */
                    public name: string;

                    /** DisableSecretVersionRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new DisableSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DisableSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IDisableSecretVersionRequest): google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest;

                    /**
                     * Encodes the specified DisableSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest.verify|verify} messages.
                     * @param message DisableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IDisableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DisableSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest.verify|verify} messages.
                     * @param message DisableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IDisableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DisableSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DisableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest;

                    /**
                     * Decodes a DisableSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DisableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest;

                    /**
                     * Verifies a DisableSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DisableSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DisableSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest;

                    /**
                     * Creates a plain object from a DisableSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message DisableSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.DisableSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DisableSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DisableSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an EnableSecretVersionRequest. */
                interface IEnableSecretVersionRequest {

                    /** EnableSecretVersionRequest name */
                    name?: (string|null);

                    /** EnableSecretVersionRequest etag */
                    etag?: (string|null);
                }

                /** Represents an EnableSecretVersionRequest. */
                class EnableSecretVersionRequest implements IEnableSecretVersionRequest {

                    /**
                     * Constructs a new EnableSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IEnableSecretVersionRequest);

                    /** EnableSecretVersionRequest name. */
                    public name: string;

                    /** EnableSecretVersionRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new EnableSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns EnableSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IEnableSecretVersionRequest): google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest;

                    /**
                     * Encodes the specified EnableSecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest.verify|verify} messages.
                     * @param message EnableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IEnableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified EnableSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest.verify|verify} messages.
                     * @param message EnableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IEnableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an EnableSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns EnableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest;

                    /**
                     * Decodes an EnableSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns EnableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest;

                    /**
                     * Verifies an EnableSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an EnableSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns EnableSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest;

                    /**
                     * Creates a plain object from an EnableSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message EnableSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.EnableSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this EnableSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for EnableSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DestroySecretVersionRequest. */
                interface IDestroySecretVersionRequest {

                    /** DestroySecretVersionRequest name */
                    name?: (string|null);

                    /** DestroySecretVersionRequest etag */
                    etag?: (string|null);
                }

                /** Represents a DestroySecretVersionRequest. */
                class DestroySecretVersionRequest implements IDestroySecretVersionRequest {

                    /**
                     * Constructs a new DestroySecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secretmanager.v1beta2.IDestroySecretVersionRequest);

                    /** DestroySecretVersionRequest name. */
                    public name: string;

                    /** DestroySecretVersionRequest etag. */
                    public etag: string;

                    /**
                     * Creates a new DestroySecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DestroySecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secretmanager.v1beta2.IDestroySecretVersionRequest): google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest;

                    /**
                     * Encodes the specified DestroySecretVersionRequest message. Does not implicitly {@link google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest.verify|verify} messages.
                     * @param message DestroySecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secretmanager.v1beta2.IDestroySecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DestroySecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest.verify|verify} messages.
                     * @param message DestroySecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secretmanager.v1beta2.IDestroySecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DestroySecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DestroySecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest;

                    /**
                     * Decodes a DestroySecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DestroySecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest;

                    /**
                     * Verifies a DestroySecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DestroySecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DestroySecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest;

                    /**
                     * Creates a plain object from a DestroySecretVersionRequest message. Also converts values to other types if specified.
                     * @param message DestroySecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secretmanager.v1beta2.DestroySecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DestroySecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DestroySecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }
            }
        }

        /** Namespace secrets. */
        namespace secrets {

            /** Namespace v1beta1. */
            namespace v1beta1 {

                /** Properties of a Secret. */
                interface ISecret {

                    /** Secret name */
                    name?: (string|null);

                    /** Secret replication */
                    replication?: (google.cloud.secrets.v1beta1.IReplication|null);

                    /** Secret createTime */
                    createTime?: (google.protobuf.ITimestamp|null);

                    /** Secret labels */
                    labels?: ({ [k: string]: string }|null);
                }

                /** Represents a Secret. */
                class Secret implements ISecret {

                    /**
                     * Constructs a new Secret.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.ISecret);

                    /** Secret name. */
                    public name: string;

                    /** Secret replication. */
                    public replication?: (google.cloud.secrets.v1beta1.IReplication|null);

                    /** Secret createTime. */
                    public createTime?: (google.protobuf.ITimestamp|null);

                    /** Secret labels. */
                    public labels: { [k: string]: string };

                    /**
                     * Creates a new Secret instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Secret instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.ISecret): google.cloud.secrets.v1beta1.Secret;

                    /**
                     * Encodes the specified Secret message. Does not implicitly {@link google.cloud.secrets.v1beta1.Secret.verify|verify} messages.
                     * @param message Secret message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.ISecret, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Secret message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.Secret.verify|verify} messages.
                     * @param message Secret message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.ISecret, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Secret message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Secret
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.Secret;

                    /**
                     * Decodes a Secret message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Secret
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.Secret;

                    /**
                     * Verifies a Secret message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Secret message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Secret
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.Secret;

                    /**
                     * Creates a plain object from a Secret message. Also converts values to other types if specified.
                     * @param message Secret
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.Secret, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Secret to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Secret
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a SecretVersion. */
                interface ISecretVersion {

                    /** SecretVersion name */
                    name?: (string|null);

                    /** SecretVersion createTime */
                    createTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion destroyTime */
                    destroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion state */
                    state?: (google.cloud.secrets.v1beta1.SecretVersion.State|keyof typeof google.cloud.secrets.v1beta1.SecretVersion.State|null);
                }

                /** Represents a SecretVersion. */
                class SecretVersion implements ISecretVersion {

                    /**
                     * Constructs a new SecretVersion.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.ISecretVersion);

                    /** SecretVersion name. */
                    public name: string;

                    /** SecretVersion createTime. */
                    public createTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion destroyTime. */
                    public destroyTime?: (google.protobuf.ITimestamp|null);

                    /** SecretVersion state. */
                    public state: (google.cloud.secrets.v1beta1.SecretVersion.State|keyof typeof google.cloud.secrets.v1beta1.SecretVersion.State);

                    /**
                     * Creates a new SecretVersion instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns SecretVersion instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.ISecretVersion): google.cloud.secrets.v1beta1.SecretVersion;

                    /**
                     * Encodes the specified SecretVersion message. Does not implicitly {@link google.cloud.secrets.v1beta1.SecretVersion.verify|verify} messages.
                     * @param message SecretVersion message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.ISecretVersion, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified SecretVersion message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.SecretVersion.verify|verify} messages.
                     * @param message SecretVersion message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.ISecretVersion, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a SecretVersion message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns SecretVersion
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.SecretVersion;

                    /**
                     * Decodes a SecretVersion message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns SecretVersion
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.SecretVersion;

                    /**
                     * Verifies a SecretVersion message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a SecretVersion message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns SecretVersion
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.SecretVersion;

                    /**
                     * Creates a plain object from a SecretVersion message. Also converts values to other types if specified.
                     * @param message SecretVersion
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.SecretVersion, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this SecretVersion to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for SecretVersion
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace SecretVersion {

                    /** State enum. */
                    enum State {
                        STATE_UNSPECIFIED = 0,
                        ENABLED = 1,
                        DISABLED = 2,
                        DESTROYED = 3
                    }
                }

                /** Properties of a Replication. */
                interface IReplication {

                    /** Replication automatic */
                    automatic?: (google.cloud.secrets.v1beta1.Replication.IAutomatic|null);

                    /** Replication userManaged */
                    userManaged?: (google.cloud.secrets.v1beta1.Replication.IUserManaged|null);
                }

                /** Represents a Replication. */
                class Replication implements IReplication {

                    /**
                     * Constructs a new Replication.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IReplication);

                    /** Replication automatic. */
                    public automatic?: (google.cloud.secrets.v1beta1.Replication.IAutomatic|null);

                    /** Replication userManaged. */
                    public userManaged?: (google.cloud.secrets.v1beta1.Replication.IUserManaged|null);

                    /** Replication replication. */
                    public replication?: ("automatic"|"userManaged");

                    /**
                     * Creates a new Replication instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Replication instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IReplication): google.cloud.secrets.v1beta1.Replication;

                    /**
                     * Encodes the specified Replication message. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.verify|verify} messages.
                     * @param message Replication message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IReplication, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Replication message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.verify|verify} messages.
                     * @param message Replication message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IReplication, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Replication message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Replication
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.Replication;

                    /**
                     * Decodes a Replication message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Replication
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.Replication;

                    /**
                     * Verifies a Replication message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Replication message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Replication
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.Replication;

                    /**
                     * Creates a plain object from a Replication message. Also converts values to other types if specified.
                     * @param message Replication
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.Replication, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Replication to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for Replication
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                namespace Replication {

                    /** Properties of an Automatic. */
                    interface IAutomatic {
                    }

                    /** Represents an Automatic. */
                    class Automatic implements IAutomatic {

                        /**
                         * Constructs a new Automatic.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secrets.v1beta1.Replication.IAutomatic);

                        /**
                         * Creates a new Automatic instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns Automatic instance
                         */
                        public static create(properties?: google.cloud.secrets.v1beta1.Replication.IAutomatic): google.cloud.secrets.v1beta1.Replication.Automatic;

                        /**
                         * Encodes the specified Automatic message. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.Automatic.verify|verify} messages.
                         * @param message Automatic message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secrets.v1beta1.Replication.IAutomatic, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified Automatic message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.Automatic.verify|verify} messages.
                         * @param message Automatic message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secrets.v1beta1.Replication.IAutomatic, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes an Automatic message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns Automatic
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.Replication.Automatic;

                        /**
                         * Decodes an Automatic message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns Automatic
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.Replication.Automatic;

                        /**
                         * Verifies an Automatic message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates an Automatic message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns Automatic
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.Replication.Automatic;

                        /**
                         * Creates a plain object from an Automatic message. Also converts values to other types if specified.
                         * @param message Automatic
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secrets.v1beta1.Replication.Automatic, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this Automatic to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for Automatic
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a UserManaged. */
                    interface IUserManaged {

                        /** UserManaged replicas */
                        replicas?: (google.cloud.secrets.v1beta1.Replication.UserManaged.IReplica[]|null);
                    }

                    /** Represents a UserManaged. */
                    class UserManaged implements IUserManaged {

                        /**
                         * Constructs a new UserManaged.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: google.cloud.secrets.v1beta1.Replication.IUserManaged);

                        /** UserManaged replicas. */
                        public replicas: google.cloud.secrets.v1beta1.Replication.UserManaged.IReplica[];

                        /**
                         * Creates a new UserManaged instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns UserManaged instance
                         */
                        public static create(properties?: google.cloud.secrets.v1beta1.Replication.IUserManaged): google.cloud.secrets.v1beta1.Replication.UserManaged;

                        /**
                         * Encodes the specified UserManaged message. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.UserManaged.verify|verify} messages.
                         * @param message UserManaged message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: google.cloud.secrets.v1beta1.Replication.IUserManaged, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified UserManaged message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.UserManaged.verify|verify} messages.
                         * @param message UserManaged message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: google.cloud.secrets.v1beta1.Replication.IUserManaged, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a UserManaged message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns UserManaged
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.Replication.UserManaged;

                        /**
                         * Decodes a UserManaged message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns UserManaged
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.Replication.UserManaged;

                        /**
                         * Verifies a UserManaged message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a UserManaged message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns UserManaged
                         */
                        public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.Replication.UserManaged;

                        /**
                         * Creates a plain object from a UserManaged message. Also converts values to other types if specified.
                         * @param message UserManaged
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: google.cloud.secrets.v1beta1.Replication.UserManaged, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this UserManaged to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for UserManaged
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    namespace UserManaged {

                        /** Properties of a Replica. */
                        interface IReplica {

                            /** Replica location */
                            location?: (string|null);
                        }

                        /** Represents a Replica. */
                        class Replica implements IReplica {

                            /**
                             * Constructs a new Replica.
                             * @param [properties] Properties to set
                             */
                            constructor(properties?: google.cloud.secrets.v1beta1.Replication.UserManaged.IReplica);

                            /** Replica location. */
                            public location: string;

                            /**
                             * Creates a new Replica instance using the specified properties.
                             * @param [properties] Properties to set
                             * @returns Replica instance
                             */
                            public static create(properties?: google.cloud.secrets.v1beta1.Replication.UserManaged.IReplica): google.cloud.secrets.v1beta1.Replication.UserManaged.Replica;

                            /**
                             * Encodes the specified Replica message. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.UserManaged.Replica.verify|verify} messages.
                             * @param message Replica message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encode(message: google.cloud.secrets.v1beta1.Replication.UserManaged.IReplica, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Encodes the specified Replica message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.Replication.UserManaged.Replica.verify|verify} messages.
                             * @param message Replica message or plain object to encode
                             * @param [writer] Writer to encode to
                             * @returns Writer
                             */
                            public static encodeDelimited(message: google.cloud.secrets.v1beta1.Replication.UserManaged.IReplica, writer?: $protobuf.Writer): $protobuf.Writer;

                            /**
                             * Decodes a Replica message from the specified reader or buffer.
                             * @param reader Reader or buffer to decode from
                             * @param [length] Message length if known beforehand
                             * @returns Replica
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.Replication.UserManaged.Replica;

                            /**
                             * Decodes a Replica message from the specified reader or buffer, length delimited.
                             * @param reader Reader or buffer to decode from
                             * @returns Replica
                             * @throws {Error} If the payload is not a reader or valid buffer
                             * @throws {$protobuf.util.ProtocolError} If required fields are missing
                             */
                            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.Replication.UserManaged.Replica;

                            /**
                             * Verifies a Replica message.
                             * @param message Plain object to verify
                             * @returns `null` if valid, otherwise the reason why it is not
                             */
                            public static verify(message: { [k: string]: any }): (string|null);

                            /**
                             * Creates a Replica message from a plain object. Also converts values to their respective internal types.
                             * @param object Plain object
                             * @returns Replica
                             */
                            public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.Replication.UserManaged.Replica;

                            /**
                             * Creates a plain object from a Replica message. Also converts values to other types if specified.
                             * @param message Replica
                             * @param [options] Conversion options
                             * @returns Plain object
                             */
                            public static toObject(message: google.cloud.secrets.v1beta1.Replication.UserManaged.Replica, options?: $protobuf.IConversionOptions): { [k: string]: any };

                            /**
                             * Converts this Replica to JSON.
                             * @returns JSON object
                             */
                            public toJSON(): { [k: string]: any };

                            /**
                             * Gets the default type url for Replica
                             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                             * @returns The default type url
                             */
                            public static getTypeUrl(typeUrlPrefix?: string): string;
                        }
                    }
                }

                /** Properties of a SecretPayload. */
                interface ISecretPayload {

                    /** SecretPayload data */
                    data?: (Uint8Array|string|null);
                }

                /** Represents a SecretPayload. */
                class SecretPayload implements ISecretPayload {

                    /**
                     * Constructs a new SecretPayload.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.ISecretPayload);

                    /** SecretPayload data. */
                    public data: (Uint8Array|string);

                    /**
                     * Creates a new SecretPayload instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns SecretPayload instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.ISecretPayload): google.cloud.secrets.v1beta1.SecretPayload;

                    /**
                     * Encodes the specified SecretPayload message. Does not implicitly {@link google.cloud.secrets.v1beta1.SecretPayload.verify|verify} messages.
                     * @param message SecretPayload message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.ISecretPayload, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified SecretPayload message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.SecretPayload.verify|verify} messages.
                     * @param message SecretPayload message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.ISecretPayload, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a SecretPayload message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns SecretPayload
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.SecretPayload;

                    /**
                     * Decodes a SecretPayload message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns SecretPayload
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.SecretPayload;

                    /**
                     * Verifies a SecretPayload message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a SecretPayload message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns SecretPayload
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.SecretPayload;

                    /**
                     * Creates a plain object from a SecretPayload message. Also converts values to other types if specified.
                     * @param message SecretPayload
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.SecretPayload, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this SecretPayload to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for SecretPayload
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Represents a SecretManagerService */
                class SecretManagerService extends $protobuf.rpc.Service {

                    /**
                     * Constructs a new SecretManagerService service.
                     * @param rpcImpl RPC implementation
                     * @param [requestDelimited=false] Whether requests are length-delimited
                     * @param [responseDelimited=false] Whether responses are length-delimited
                     */
                    constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

                    /**
                     * Creates new SecretManagerService service using the specified rpc implementation.
                     * @param rpcImpl RPC implementation
                     * @param [requestDelimited=false] Whether requests are length-delimited
                     * @param [responseDelimited=false] Whether responses are length-delimited
                     * @returns RPC service. Useful where requests and/or responses are streamed.
                     */
                    public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): SecretManagerService;

                    /**
                     * Calls ListSecrets.
                     * @param request ListSecretsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and ListSecretsResponse
                     */
                    public listSecrets(request: google.cloud.secrets.v1beta1.IListSecretsRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.ListSecretsCallback): void;

                    /**
                     * Calls ListSecrets.
                     * @param request ListSecretsRequest message or plain object
                     * @returns Promise
                     */
                    public listSecrets(request: google.cloud.secrets.v1beta1.IListSecretsRequest): Promise<google.cloud.secrets.v1beta1.ListSecretsResponse>;

                    /**
                     * Calls CreateSecret.
                     * @param request CreateSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public createSecret(request: google.cloud.secrets.v1beta1.ICreateSecretRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.CreateSecretCallback): void;

                    /**
                     * Calls CreateSecret.
                     * @param request CreateSecretRequest message or plain object
                     * @returns Promise
                     */
                    public createSecret(request: google.cloud.secrets.v1beta1.ICreateSecretRequest): Promise<google.cloud.secrets.v1beta1.Secret>;

                    /**
                     * Calls AddSecretVersion.
                     * @param request AddSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public addSecretVersion(request: google.cloud.secrets.v1beta1.IAddSecretVersionRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.AddSecretVersionCallback): void;

                    /**
                     * Calls AddSecretVersion.
                     * @param request AddSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public addSecretVersion(request: google.cloud.secrets.v1beta1.IAddSecretVersionRequest): Promise<google.cloud.secrets.v1beta1.SecretVersion>;

                    /**
                     * Calls GetSecret.
                     * @param request GetSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public getSecret(request: google.cloud.secrets.v1beta1.IGetSecretRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.GetSecretCallback): void;

                    /**
                     * Calls GetSecret.
                     * @param request GetSecretRequest message or plain object
                     * @returns Promise
                     */
                    public getSecret(request: google.cloud.secrets.v1beta1.IGetSecretRequest): Promise<google.cloud.secrets.v1beta1.Secret>;

                    /**
                     * Calls UpdateSecret.
                     * @param request UpdateSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Secret
                     */
                    public updateSecret(request: google.cloud.secrets.v1beta1.IUpdateSecretRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.UpdateSecretCallback): void;

                    /**
                     * Calls UpdateSecret.
                     * @param request UpdateSecretRequest message or plain object
                     * @returns Promise
                     */
                    public updateSecret(request: google.cloud.secrets.v1beta1.IUpdateSecretRequest): Promise<google.cloud.secrets.v1beta1.Secret>;

                    /**
                     * Calls DeleteSecret.
                     * @param request DeleteSecretRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Empty
                     */
                    public deleteSecret(request: google.cloud.secrets.v1beta1.IDeleteSecretRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.DeleteSecretCallback): void;

                    /**
                     * Calls DeleteSecret.
                     * @param request DeleteSecretRequest message or plain object
                     * @returns Promise
                     */
                    public deleteSecret(request: google.cloud.secrets.v1beta1.IDeleteSecretRequest): Promise<google.protobuf.Empty>;

                    /**
                     * Calls ListSecretVersions.
                     * @param request ListSecretVersionsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and ListSecretVersionsResponse
                     */
                    public listSecretVersions(request: google.cloud.secrets.v1beta1.IListSecretVersionsRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.ListSecretVersionsCallback): void;

                    /**
                     * Calls ListSecretVersions.
                     * @param request ListSecretVersionsRequest message or plain object
                     * @returns Promise
                     */
                    public listSecretVersions(request: google.cloud.secrets.v1beta1.IListSecretVersionsRequest): Promise<google.cloud.secrets.v1beta1.ListSecretVersionsResponse>;

                    /**
                     * Calls GetSecretVersion.
                     * @param request GetSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public getSecretVersion(request: google.cloud.secrets.v1beta1.IGetSecretVersionRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.GetSecretVersionCallback): void;

                    /**
                     * Calls GetSecretVersion.
                     * @param request GetSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public getSecretVersion(request: google.cloud.secrets.v1beta1.IGetSecretVersionRequest): Promise<google.cloud.secrets.v1beta1.SecretVersion>;

                    /**
                     * Calls AccessSecretVersion.
                     * @param request AccessSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and AccessSecretVersionResponse
                     */
                    public accessSecretVersion(request: google.cloud.secrets.v1beta1.IAccessSecretVersionRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.AccessSecretVersionCallback): void;

                    /**
                     * Calls AccessSecretVersion.
                     * @param request AccessSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public accessSecretVersion(request: google.cloud.secrets.v1beta1.IAccessSecretVersionRequest): Promise<google.cloud.secrets.v1beta1.AccessSecretVersionResponse>;

                    /**
                     * Calls DisableSecretVersion.
                     * @param request DisableSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public disableSecretVersion(request: google.cloud.secrets.v1beta1.IDisableSecretVersionRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.DisableSecretVersionCallback): void;

                    /**
                     * Calls DisableSecretVersion.
                     * @param request DisableSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public disableSecretVersion(request: google.cloud.secrets.v1beta1.IDisableSecretVersionRequest): Promise<google.cloud.secrets.v1beta1.SecretVersion>;

                    /**
                     * Calls EnableSecretVersion.
                     * @param request EnableSecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public enableSecretVersion(request: google.cloud.secrets.v1beta1.IEnableSecretVersionRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.EnableSecretVersionCallback): void;

                    /**
                     * Calls EnableSecretVersion.
                     * @param request EnableSecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public enableSecretVersion(request: google.cloud.secrets.v1beta1.IEnableSecretVersionRequest): Promise<google.cloud.secrets.v1beta1.SecretVersion>;

                    /**
                     * Calls DestroySecretVersion.
                     * @param request DestroySecretVersionRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and SecretVersion
                     */
                    public destroySecretVersion(request: google.cloud.secrets.v1beta1.IDestroySecretVersionRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.DestroySecretVersionCallback): void;

                    /**
                     * Calls DestroySecretVersion.
                     * @param request DestroySecretVersionRequest message or plain object
                     * @returns Promise
                     */
                    public destroySecretVersion(request: google.cloud.secrets.v1beta1.IDestroySecretVersionRequest): Promise<google.cloud.secrets.v1beta1.SecretVersion>;

                    /**
                     * Calls SetIamPolicy.
                     * @param request SetIamPolicyRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Policy
                     */
                    public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.SetIamPolicyCallback): void;

                    /**
                     * Calls SetIamPolicy.
                     * @param request SetIamPolicyRequest message or plain object
                     * @returns Promise
                     */
                    public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                    /**
                     * Calls GetIamPolicy.
                     * @param request GetIamPolicyRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and Policy
                     */
                    public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.GetIamPolicyCallback): void;

                    /**
                     * Calls GetIamPolicy.
                     * @param request GetIamPolicyRequest message or plain object
                     * @returns Promise
                     */
                    public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                    /**
                     * Calls TestIamPermissions.
                     * @param request TestIamPermissionsRequest message or plain object
                     * @param callback Node-style callback called with the error, if any, and TestIamPermissionsResponse
                     */
                    public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest, callback: google.cloud.secrets.v1beta1.SecretManagerService.TestIamPermissionsCallback): void;

                    /**
                     * Calls TestIamPermissions.
                     * @param request TestIamPermissionsRequest message or plain object
                     * @returns Promise
                     */
                    public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest): Promise<google.iam.v1.TestIamPermissionsResponse>;
                }

                namespace SecretManagerService {

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|listSecrets}.
                     * @param error Error, if any
                     * @param [response] ListSecretsResponse
                     */
                    type ListSecretsCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.ListSecretsResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|createSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type CreateSecretCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|addSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type AddSecretVersionCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|getSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type GetSecretCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|updateSecret}.
                     * @param error Error, if any
                     * @param [response] Secret
                     */
                    type UpdateSecretCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.Secret) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|deleteSecret}.
                     * @param error Error, if any
                     * @param [response] Empty
                     */
                    type DeleteSecretCallback = (error: (Error|null), response?: google.protobuf.Empty) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|listSecretVersions}.
                     * @param error Error, if any
                     * @param [response] ListSecretVersionsResponse
                     */
                    type ListSecretVersionsCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.ListSecretVersionsResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|getSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type GetSecretVersionCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|accessSecretVersion}.
                     * @param error Error, if any
                     * @param [response] AccessSecretVersionResponse
                     */
                    type AccessSecretVersionCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.AccessSecretVersionResponse) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|disableSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type DisableSecretVersionCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|enableSecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type EnableSecretVersionCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|destroySecretVersion}.
                     * @param error Error, if any
                     * @param [response] SecretVersion
                     */
                    type DestroySecretVersionCallback = (error: (Error|null), response?: google.cloud.secrets.v1beta1.SecretVersion) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|setIamPolicy}.
                     * @param error Error, if any
                     * @param [response] Policy
                     */
                    type SetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|getIamPolicy}.
                     * @param error Error, if any
                     * @param [response] Policy
                     */
                    type GetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                    /**
                     * Callback as used by {@link google.cloud.secrets.v1beta1.SecretManagerService|testIamPermissions}.
                     * @param error Error, if any
                     * @param [response] TestIamPermissionsResponse
                     */
                    type TestIamPermissionsCallback = (error: (Error|null), response?: google.iam.v1.TestIamPermissionsResponse) => void;
                }

                /** Properties of a ListSecretsRequest. */
                interface IListSecretsRequest {

                    /** ListSecretsRequest parent */
                    parent?: (string|null);

                    /** ListSecretsRequest pageSize */
                    pageSize?: (number|null);

                    /** ListSecretsRequest pageToken */
                    pageToken?: (string|null);
                }

                /** Represents a ListSecretsRequest. */
                class ListSecretsRequest implements IListSecretsRequest {

                    /**
                     * Constructs a new ListSecretsRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IListSecretsRequest);

                    /** ListSecretsRequest parent. */
                    public parent: string;

                    /** ListSecretsRequest pageSize. */
                    public pageSize: number;

                    /** ListSecretsRequest pageToken. */
                    public pageToken: string;

                    /**
                     * Creates a new ListSecretsRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretsRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IListSecretsRequest): google.cloud.secrets.v1beta1.ListSecretsRequest;

                    /**
                     * Encodes the specified ListSecretsRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretsRequest.verify|verify} messages.
                     * @param message ListSecretsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IListSecretsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretsRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretsRequest.verify|verify} messages.
                     * @param message ListSecretsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IListSecretsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretsRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.ListSecretsRequest;

                    /**
                     * Decodes a ListSecretsRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.ListSecretsRequest;

                    /**
                     * Verifies a ListSecretsRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretsRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretsRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.ListSecretsRequest;

                    /**
                     * Creates a plain object from a ListSecretsRequest message. Also converts values to other types if specified.
                     * @param message ListSecretsRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.ListSecretsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretsRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretsRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretsResponse. */
                interface IListSecretsResponse {

                    /** ListSecretsResponse secrets */
                    secrets?: (google.cloud.secrets.v1beta1.ISecret[]|null);

                    /** ListSecretsResponse nextPageToken */
                    nextPageToken?: (string|null);

                    /** ListSecretsResponse totalSize */
                    totalSize?: (number|null);
                }

                /** Represents a ListSecretsResponse. */
                class ListSecretsResponse implements IListSecretsResponse {

                    /**
                     * Constructs a new ListSecretsResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IListSecretsResponse);

                    /** ListSecretsResponse secrets. */
                    public secrets: google.cloud.secrets.v1beta1.ISecret[];

                    /** ListSecretsResponse nextPageToken. */
                    public nextPageToken: string;

                    /** ListSecretsResponse totalSize. */
                    public totalSize: number;

                    /**
                     * Creates a new ListSecretsResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretsResponse instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IListSecretsResponse): google.cloud.secrets.v1beta1.ListSecretsResponse;

                    /**
                     * Encodes the specified ListSecretsResponse message. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretsResponse.verify|verify} messages.
                     * @param message ListSecretsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IListSecretsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretsResponse message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretsResponse.verify|verify} messages.
                     * @param message ListSecretsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IListSecretsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretsResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.ListSecretsResponse;

                    /**
                     * Decodes a ListSecretsResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.ListSecretsResponse;

                    /**
                     * Verifies a ListSecretsResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretsResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretsResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.ListSecretsResponse;

                    /**
                     * Creates a plain object from a ListSecretsResponse message. Also converts values to other types if specified.
                     * @param message ListSecretsResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.ListSecretsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretsResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretsResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a CreateSecretRequest. */
                interface ICreateSecretRequest {

                    /** CreateSecretRequest parent */
                    parent?: (string|null);

                    /** CreateSecretRequest secretId */
                    secretId?: (string|null);

                    /** CreateSecretRequest secret */
                    secret?: (google.cloud.secrets.v1beta1.ISecret|null);
                }

                /** Represents a CreateSecretRequest. */
                class CreateSecretRequest implements ICreateSecretRequest {

                    /**
                     * Constructs a new CreateSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.ICreateSecretRequest);

                    /** CreateSecretRequest parent. */
                    public parent: string;

                    /** CreateSecretRequest secretId. */
                    public secretId: string;

                    /** CreateSecretRequest secret. */
                    public secret?: (google.cloud.secrets.v1beta1.ISecret|null);

                    /**
                     * Creates a new CreateSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns CreateSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.ICreateSecretRequest): google.cloud.secrets.v1beta1.CreateSecretRequest;

                    /**
                     * Encodes the specified CreateSecretRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.CreateSecretRequest.verify|verify} messages.
                     * @param message CreateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.ICreateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified CreateSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.CreateSecretRequest.verify|verify} messages.
                     * @param message CreateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.ICreateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a CreateSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns CreateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.CreateSecretRequest;

                    /**
                     * Decodes a CreateSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns CreateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.CreateSecretRequest;

                    /**
                     * Verifies a CreateSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a CreateSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns CreateSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.CreateSecretRequest;

                    /**
                     * Creates a plain object from a CreateSecretRequest message. Also converts values to other types if specified.
                     * @param message CreateSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.CreateSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this CreateSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for CreateSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AddSecretVersionRequest. */
                interface IAddSecretVersionRequest {

                    /** AddSecretVersionRequest parent */
                    parent?: (string|null);

                    /** AddSecretVersionRequest payload */
                    payload?: (google.cloud.secrets.v1beta1.ISecretPayload|null);
                }

                /** Represents an AddSecretVersionRequest. */
                class AddSecretVersionRequest implements IAddSecretVersionRequest {

                    /**
                     * Constructs a new AddSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IAddSecretVersionRequest);

                    /** AddSecretVersionRequest parent. */
                    public parent: string;

                    /** AddSecretVersionRequest payload. */
                    public payload?: (google.cloud.secrets.v1beta1.ISecretPayload|null);

                    /**
                     * Creates a new AddSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AddSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IAddSecretVersionRequest): google.cloud.secrets.v1beta1.AddSecretVersionRequest;

                    /**
                     * Encodes the specified AddSecretVersionRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.AddSecretVersionRequest.verify|verify} messages.
                     * @param message AddSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IAddSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AddSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.AddSecretVersionRequest.verify|verify} messages.
                     * @param message AddSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IAddSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AddSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AddSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.AddSecretVersionRequest;

                    /**
                     * Decodes an AddSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AddSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.AddSecretVersionRequest;

                    /**
                     * Verifies an AddSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AddSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AddSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.AddSecretVersionRequest;

                    /**
                     * Creates a plain object from an AddSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message AddSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.AddSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AddSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AddSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a GetSecretRequest. */
                interface IGetSecretRequest {

                    /** GetSecretRequest name */
                    name?: (string|null);
                }

                /** Represents a GetSecretRequest. */
                class GetSecretRequest implements IGetSecretRequest {

                    /**
                     * Constructs a new GetSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IGetSecretRequest);

                    /** GetSecretRequest name. */
                    public name: string;

                    /**
                     * Creates a new GetSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns GetSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IGetSecretRequest): google.cloud.secrets.v1beta1.GetSecretRequest;

                    /**
                     * Encodes the specified GetSecretRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.GetSecretRequest.verify|verify} messages.
                     * @param message GetSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IGetSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified GetSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.GetSecretRequest.verify|verify} messages.
                     * @param message GetSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IGetSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a GetSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns GetSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.GetSecretRequest;

                    /**
                     * Decodes a GetSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns GetSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.GetSecretRequest;

                    /**
                     * Verifies a GetSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a GetSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns GetSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.GetSecretRequest;

                    /**
                     * Creates a plain object from a GetSecretRequest message. Also converts values to other types if specified.
                     * @param message GetSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.GetSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this GetSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for GetSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretVersionsRequest. */
                interface IListSecretVersionsRequest {

                    /** ListSecretVersionsRequest parent */
                    parent?: (string|null);

                    /** ListSecretVersionsRequest pageSize */
                    pageSize?: (number|null);

                    /** ListSecretVersionsRequest pageToken */
                    pageToken?: (string|null);
                }

                /** Represents a ListSecretVersionsRequest. */
                class ListSecretVersionsRequest implements IListSecretVersionsRequest {

                    /**
                     * Constructs a new ListSecretVersionsRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IListSecretVersionsRequest);

                    /** ListSecretVersionsRequest parent. */
                    public parent: string;

                    /** ListSecretVersionsRequest pageSize. */
                    public pageSize: number;

                    /** ListSecretVersionsRequest pageToken. */
                    public pageToken: string;

                    /**
                     * Creates a new ListSecretVersionsRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretVersionsRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IListSecretVersionsRequest): google.cloud.secrets.v1beta1.ListSecretVersionsRequest;

                    /**
                     * Encodes the specified ListSecretVersionsRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretVersionsRequest.verify|verify} messages.
                     * @param message ListSecretVersionsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IListSecretVersionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretVersionsRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretVersionsRequest.verify|verify} messages.
                     * @param message ListSecretVersionsRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IListSecretVersionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretVersionsRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretVersionsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.ListSecretVersionsRequest;

                    /**
                     * Decodes a ListSecretVersionsRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretVersionsRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.ListSecretVersionsRequest;

                    /**
                     * Verifies a ListSecretVersionsRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretVersionsRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretVersionsRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.ListSecretVersionsRequest;

                    /**
                     * Creates a plain object from a ListSecretVersionsRequest message. Also converts values to other types if specified.
                     * @param message ListSecretVersionsRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.ListSecretVersionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretVersionsRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretVersionsRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a ListSecretVersionsResponse. */
                interface IListSecretVersionsResponse {

                    /** ListSecretVersionsResponse versions */
                    versions?: (google.cloud.secrets.v1beta1.ISecretVersion[]|null);

                    /** ListSecretVersionsResponse nextPageToken */
                    nextPageToken?: (string|null);

                    /** ListSecretVersionsResponse totalSize */
                    totalSize?: (number|null);
                }

                /** Represents a ListSecretVersionsResponse. */
                class ListSecretVersionsResponse implements IListSecretVersionsResponse {

                    /**
                     * Constructs a new ListSecretVersionsResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IListSecretVersionsResponse);

                    /** ListSecretVersionsResponse versions. */
                    public versions: google.cloud.secrets.v1beta1.ISecretVersion[];

                    /** ListSecretVersionsResponse nextPageToken. */
                    public nextPageToken: string;

                    /** ListSecretVersionsResponse totalSize. */
                    public totalSize: number;

                    /**
                     * Creates a new ListSecretVersionsResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns ListSecretVersionsResponse instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IListSecretVersionsResponse): google.cloud.secrets.v1beta1.ListSecretVersionsResponse;

                    /**
                     * Encodes the specified ListSecretVersionsResponse message. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretVersionsResponse.verify|verify} messages.
                     * @param message ListSecretVersionsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IListSecretVersionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified ListSecretVersionsResponse message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.ListSecretVersionsResponse.verify|verify} messages.
                     * @param message ListSecretVersionsResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IListSecretVersionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a ListSecretVersionsResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns ListSecretVersionsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.ListSecretVersionsResponse;

                    /**
                     * Decodes a ListSecretVersionsResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns ListSecretVersionsResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.ListSecretVersionsResponse;

                    /**
                     * Verifies a ListSecretVersionsResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a ListSecretVersionsResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns ListSecretVersionsResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.ListSecretVersionsResponse;

                    /**
                     * Creates a plain object from a ListSecretVersionsResponse message. Also converts values to other types if specified.
                     * @param message ListSecretVersionsResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.ListSecretVersionsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this ListSecretVersionsResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for ListSecretVersionsResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a GetSecretVersionRequest. */
                interface IGetSecretVersionRequest {

                    /** GetSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents a GetSecretVersionRequest. */
                class GetSecretVersionRequest implements IGetSecretVersionRequest {

                    /**
                     * Constructs a new GetSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IGetSecretVersionRequest);

                    /** GetSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new GetSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns GetSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IGetSecretVersionRequest): google.cloud.secrets.v1beta1.GetSecretVersionRequest;

                    /**
                     * Encodes the specified GetSecretVersionRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.GetSecretVersionRequest.verify|verify} messages.
                     * @param message GetSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IGetSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified GetSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.GetSecretVersionRequest.verify|verify} messages.
                     * @param message GetSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IGetSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a GetSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns GetSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.GetSecretVersionRequest;

                    /**
                     * Decodes a GetSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns GetSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.GetSecretVersionRequest;

                    /**
                     * Verifies a GetSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a GetSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns GetSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.GetSecretVersionRequest;

                    /**
                     * Creates a plain object from a GetSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message GetSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.GetSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this GetSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for GetSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an UpdateSecretRequest. */
                interface IUpdateSecretRequest {

                    /** UpdateSecretRequest secret */
                    secret?: (google.cloud.secrets.v1beta1.ISecret|null);

                    /** UpdateSecretRequest updateMask */
                    updateMask?: (google.protobuf.IFieldMask|null);
                }

                /** Represents an UpdateSecretRequest. */
                class UpdateSecretRequest implements IUpdateSecretRequest {

                    /**
                     * Constructs a new UpdateSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IUpdateSecretRequest);

                    /** UpdateSecretRequest secret. */
                    public secret?: (google.cloud.secrets.v1beta1.ISecret|null);

                    /** UpdateSecretRequest updateMask. */
                    public updateMask?: (google.protobuf.IFieldMask|null);

                    /**
                     * Creates a new UpdateSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns UpdateSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IUpdateSecretRequest): google.cloud.secrets.v1beta1.UpdateSecretRequest;

                    /**
                     * Encodes the specified UpdateSecretRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.UpdateSecretRequest.verify|verify} messages.
                     * @param message UpdateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IUpdateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified UpdateSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.UpdateSecretRequest.verify|verify} messages.
                     * @param message UpdateSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IUpdateSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an UpdateSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns UpdateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.UpdateSecretRequest;

                    /**
                     * Decodes an UpdateSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns UpdateSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.UpdateSecretRequest;

                    /**
                     * Verifies an UpdateSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an UpdateSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns UpdateSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.UpdateSecretRequest;

                    /**
                     * Creates a plain object from an UpdateSecretRequest message. Also converts values to other types if specified.
                     * @param message UpdateSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.UpdateSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this UpdateSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for UpdateSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AccessSecretVersionRequest. */
                interface IAccessSecretVersionRequest {

                    /** AccessSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents an AccessSecretVersionRequest. */
                class AccessSecretVersionRequest implements IAccessSecretVersionRequest {

                    /**
                     * Constructs a new AccessSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IAccessSecretVersionRequest);

                    /** AccessSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new AccessSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AccessSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IAccessSecretVersionRequest): google.cloud.secrets.v1beta1.AccessSecretVersionRequest;

                    /**
                     * Encodes the specified AccessSecretVersionRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.AccessSecretVersionRequest.verify|verify} messages.
                     * @param message AccessSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IAccessSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AccessSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.AccessSecretVersionRequest.verify|verify} messages.
                     * @param message AccessSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IAccessSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AccessSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AccessSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.AccessSecretVersionRequest;

                    /**
                     * Decodes an AccessSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AccessSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.AccessSecretVersionRequest;

                    /**
                     * Verifies an AccessSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AccessSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AccessSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.AccessSecretVersionRequest;

                    /**
                     * Creates a plain object from an AccessSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message AccessSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.AccessSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AccessSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AccessSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an AccessSecretVersionResponse. */
                interface IAccessSecretVersionResponse {

                    /** AccessSecretVersionResponse name */
                    name?: (string|null);

                    /** AccessSecretVersionResponse payload */
                    payload?: (google.cloud.secrets.v1beta1.ISecretPayload|null);
                }

                /** Represents an AccessSecretVersionResponse. */
                class AccessSecretVersionResponse implements IAccessSecretVersionResponse {

                    /**
                     * Constructs a new AccessSecretVersionResponse.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IAccessSecretVersionResponse);

                    /** AccessSecretVersionResponse name. */
                    public name: string;

                    /** AccessSecretVersionResponse payload. */
                    public payload?: (google.cloud.secrets.v1beta1.ISecretPayload|null);

                    /**
                     * Creates a new AccessSecretVersionResponse instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns AccessSecretVersionResponse instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IAccessSecretVersionResponse): google.cloud.secrets.v1beta1.AccessSecretVersionResponse;

                    /**
                     * Encodes the specified AccessSecretVersionResponse message. Does not implicitly {@link google.cloud.secrets.v1beta1.AccessSecretVersionResponse.verify|verify} messages.
                     * @param message AccessSecretVersionResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IAccessSecretVersionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified AccessSecretVersionResponse message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.AccessSecretVersionResponse.verify|verify} messages.
                     * @param message AccessSecretVersionResponse message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IAccessSecretVersionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an AccessSecretVersionResponse message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns AccessSecretVersionResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.AccessSecretVersionResponse;

                    /**
                     * Decodes an AccessSecretVersionResponse message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns AccessSecretVersionResponse
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.AccessSecretVersionResponse;

                    /**
                     * Verifies an AccessSecretVersionResponse message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an AccessSecretVersionResponse message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns AccessSecretVersionResponse
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.AccessSecretVersionResponse;

                    /**
                     * Creates a plain object from an AccessSecretVersionResponse message. Also converts values to other types if specified.
                     * @param message AccessSecretVersionResponse
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.AccessSecretVersionResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this AccessSecretVersionResponse to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for AccessSecretVersionResponse
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DeleteSecretRequest. */
                interface IDeleteSecretRequest {

                    /** DeleteSecretRequest name */
                    name?: (string|null);
                }

                /** Represents a DeleteSecretRequest. */
                class DeleteSecretRequest implements IDeleteSecretRequest {

                    /**
                     * Constructs a new DeleteSecretRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IDeleteSecretRequest);

                    /** DeleteSecretRequest name. */
                    public name: string;

                    /**
                     * Creates a new DeleteSecretRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DeleteSecretRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IDeleteSecretRequest): google.cloud.secrets.v1beta1.DeleteSecretRequest;

                    /**
                     * Encodes the specified DeleteSecretRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.DeleteSecretRequest.verify|verify} messages.
                     * @param message DeleteSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IDeleteSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DeleteSecretRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.DeleteSecretRequest.verify|verify} messages.
                     * @param message DeleteSecretRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IDeleteSecretRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DeleteSecretRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DeleteSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.DeleteSecretRequest;

                    /**
                     * Decodes a DeleteSecretRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DeleteSecretRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.DeleteSecretRequest;

                    /**
                     * Verifies a DeleteSecretRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DeleteSecretRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DeleteSecretRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.DeleteSecretRequest;

                    /**
                     * Creates a plain object from a DeleteSecretRequest message. Also converts values to other types if specified.
                     * @param message DeleteSecretRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.DeleteSecretRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DeleteSecretRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DeleteSecretRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DisableSecretVersionRequest. */
                interface IDisableSecretVersionRequest {

                    /** DisableSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents a DisableSecretVersionRequest. */
                class DisableSecretVersionRequest implements IDisableSecretVersionRequest {

                    /**
                     * Constructs a new DisableSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IDisableSecretVersionRequest);

                    /** DisableSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new DisableSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DisableSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IDisableSecretVersionRequest): google.cloud.secrets.v1beta1.DisableSecretVersionRequest;

                    /**
                     * Encodes the specified DisableSecretVersionRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.DisableSecretVersionRequest.verify|verify} messages.
                     * @param message DisableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IDisableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DisableSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.DisableSecretVersionRequest.verify|verify} messages.
                     * @param message DisableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IDisableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DisableSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DisableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.DisableSecretVersionRequest;

                    /**
                     * Decodes a DisableSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DisableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.DisableSecretVersionRequest;

                    /**
                     * Verifies a DisableSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DisableSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DisableSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.DisableSecretVersionRequest;

                    /**
                     * Creates a plain object from a DisableSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message DisableSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.DisableSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DisableSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DisableSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of an EnableSecretVersionRequest. */
                interface IEnableSecretVersionRequest {

                    /** EnableSecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents an EnableSecretVersionRequest. */
                class EnableSecretVersionRequest implements IEnableSecretVersionRequest {

                    /**
                     * Constructs a new EnableSecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IEnableSecretVersionRequest);

                    /** EnableSecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new EnableSecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns EnableSecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IEnableSecretVersionRequest): google.cloud.secrets.v1beta1.EnableSecretVersionRequest;

                    /**
                     * Encodes the specified EnableSecretVersionRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.EnableSecretVersionRequest.verify|verify} messages.
                     * @param message EnableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IEnableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified EnableSecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.EnableSecretVersionRequest.verify|verify} messages.
                     * @param message EnableSecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IEnableSecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes an EnableSecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns EnableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.EnableSecretVersionRequest;

                    /**
                     * Decodes an EnableSecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns EnableSecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.EnableSecretVersionRequest;

                    /**
                     * Verifies an EnableSecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates an EnableSecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns EnableSecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.EnableSecretVersionRequest;

                    /**
                     * Creates a plain object from an EnableSecretVersionRequest message. Also converts values to other types if specified.
                     * @param message EnableSecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.EnableSecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this EnableSecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for EnableSecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }

                /** Properties of a DestroySecretVersionRequest. */
                interface IDestroySecretVersionRequest {

                    /** DestroySecretVersionRequest name */
                    name?: (string|null);
                }

                /** Represents a DestroySecretVersionRequest. */
                class DestroySecretVersionRequest implements IDestroySecretVersionRequest {

                    /**
                     * Constructs a new DestroySecretVersionRequest.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: google.cloud.secrets.v1beta1.IDestroySecretVersionRequest);

                    /** DestroySecretVersionRequest name. */
                    public name: string;

                    /**
                     * Creates a new DestroySecretVersionRequest instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns DestroySecretVersionRequest instance
                     */
                    public static create(properties?: google.cloud.secrets.v1beta1.IDestroySecretVersionRequest): google.cloud.secrets.v1beta1.DestroySecretVersionRequest;

                    /**
                     * Encodes the specified DestroySecretVersionRequest message. Does not implicitly {@link google.cloud.secrets.v1beta1.DestroySecretVersionRequest.verify|verify} messages.
                     * @param message DestroySecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: google.cloud.secrets.v1beta1.IDestroySecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified DestroySecretVersionRequest message, length delimited. Does not implicitly {@link google.cloud.secrets.v1beta1.DestroySecretVersionRequest.verify|verify} messages.
                     * @param message DestroySecretVersionRequest message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: google.cloud.secrets.v1beta1.IDestroySecretVersionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a DestroySecretVersionRequest message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns DestroySecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.cloud.secrets.v1beta1.DestroySecretVersionRequest;

                    /**
                     * Decodes a DestroySecretVersionRequest message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns DestroySecretVersionRequest
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.cloud.secrets.v1beta1.DestroySecretVersionRequest;

                    /**
                     * Verifies a DestroySecretVersionRequest message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a DestroySecretVersionRequest message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns DestroySecretVersionRequest
                     */
                    public static fromObject(object: { [k: string]: any }): google.cloud.secrets.v1beta1.DestroySecretVersionRequest;

                    /**
                     * Creates a plain object from a DestroySecretVersionRequest message. Also converts values to other types if specified.
                     * @param message DestroySecretVersionRequest
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: google.cloud.secrets.v1beta1.DestroySecretVersionRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this DestroySecretVersionRequest to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };

                    /**
                     * Gets the default type url for DestroySecretVersionRequest
                     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns The default type url
                     */
                    public static getTypeUrl(typeUrlPrefix?: string): string;
                }
            }
        }
    }

    /** Namespace api. */
    namespace api {

        /** FieldBehavior enum. */
        enum FieldBehavior {
            FIELD_BEHAVIOR_UNSPECIFIED = 0,
            OPTIONAL = 1,
            REQUIRED = 2,
            OUTPUT_ONLY = 3,
            INPUT_ONLY = 4,
            IMMUTABLE = 5,
            UNORDERED_LIST = 6,
            NON_EMPTY_DEFAULT = 7,
            IDENTIFIER = 8
        }

        /** Properties of a ResourceDescriptor. */
        interface IResourceDescriptor {

            /** ResourceDescriptor type */
            type?: (string|null);

            /** ResourceDescriptor pattern */
            pattern?: (string[]|null);

            /** ResourceDescriptor nameField */
            nameField?: (string|null);

            /** ResourceDescriptor history */
            history?: (google.api.ResourceDescriptor.History|keyof typeof google.api.ResourceDescriptor.History|null);

            /** ResourceDescriptor plural */
            plural?: (string|null);

            /** ResourceDescriptor singular */
            singular?: (string|null);

            /** ResourceDescriptor style */
            style?: (google.api.ResourceDescriptor.Style[]|null);
        }

        /** Represents a ResourceDescriptor. */
        class ResourceDescriptor implements IResourceDescriptor {

            /**
             * Constructs a new ResourceDescriptor.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IResourceDescriptor);

            /** ResourceDescriptor type. */
            public type: string;

            /** ResourceDescriptor pattern. */
            public pattern: string[];

            /** ResourceDescriptor nameField. */
            public nameField: string;

            /** ResourceDescriptor history. */
            public history: (google.api.ResourceDescriptor.History|keyof typeof google.api.ResourceDescriptor.History);

            /** ResourceDescriptor plural. */
            public plural: string;

            /** ResourceDescriptor singular. */
            public singular: string;

            /** ResourceDescriptor style. */
            public style: google.api.ResourceDescriptor.Style[];

            /**
             * Creates a new ResourceDescriptor instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ResourceDescriptor instance
             */
            public static create(properties?: google.api.IResourceDescriptor): google.api.ResourceDescriptor;

            /**
             * Encodes the specified ResourceDescriptor message. Does not implicitly {@link google.api.ResourceDescriptor.verify|verify} messages.
             * @param message ResourceDescriptor message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IResourceDescriptor, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ResourceDescriptor message, length delimited. Does not implicitly {@link google.api.ResourceDescriptor.verify|verify} messages.
             * @param message ResourceDescriptor message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IResourceDescriptor, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ResourceDescriptor message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ResourceDescriptor
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.ResourceDescriptor;

            /**
             * Decodes a ResourceDescriptor message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ResourceDescriptor
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.ResourceDescriptor;

            /**
             * Verifies a ResourceDescriptor message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ResourceDescriptor message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ResourceDescriptor
             */
            public static fromObject(object: { [k: string]: any }): google.api.ResourceDescriptor;

            /**
             * Creates a plain object from a ResourceDescriptor message. Also converts values to other types if specified.
             * @param message ResourceDescriptor
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.ResourceDescriptor, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ResourceDescriptor to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ResourceDescriptor
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace ResourceDescriptor {

            /** History enum. */
            enum History {
                HISTORY_UNSPECIFIED = 0,
                ORIGINALLY_SINGLE_PATTERN = 1,
                FUTURE_MULTI_PATTERN = 2
            }

            /** Style enum. */
            enum Style {
                STYLE_UNSPECIFIED = 0,
                DECLARATIVE_FRIENDLY = 1
            }
        }

        /** Properties of a ResourceReference. */
        interface IResourceReference {

            /** ResourceReference type */
            type?: (string|null);

            /** ResourceReference childType */
            childType?: (string|null);
        }

        /** Represents a ResourceReference. */
        class ResourceReference implements IResourceReference {

            /**
             * Constructs a new ResourceReference.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IResourceReference);

            /** ResourceReference type. */
            public type: string;

            /** ResourceReference childType. */
            public childType: string;

            /**
             * Creates a new ResourceReference instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ResourceReference instance
             */
            public static create(properties?: google.api.IResourceReference): google.api.ResourceReference;

            /**
             * Encodes the specified ResourceReference message. Does not implicitly {@link google.api.ResourceReference.verify|verify} messages.
             * @param message ResourceReference message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IResourceReference, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ResourceReference message, length delimited. Does not implicitly {@link google.api.ResourceReference.verify|verify} messages.
             * @param message ResourceReference message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IResourceReference, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ResourceReference message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ResourceReference
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.ResourceReference;

            /**
             * Decodes a ResourceReference message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ResourceReference
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.ResourceReference;

            /**
             * Verifies a ResourceReference message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ResourceReference message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ResourceReference
             */
            public static fromObject(object: { [k: string]: any }): google.api.ResourceReference;

            /**
             * Creates a plain object from a ResourceReference message. Also converts values to other types if specified.
             * @param message ResourceReference
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.ResourceReference, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ResourceReference to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ResourceReference
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Http. */
        interface IHttp {

            /** Http rules */
            rules?: (google.api.IHttpRule[]|null);

            /** Http fullyDecodeReservedExpansion */
            fullyDecodeReservedExpansion?: (boolean|null);
        }

        /** Represents a Http. */
        class Http implements IHttp {

            /**
             * Constructs a new Http.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IHttp);

            /** Http rules. */
            public rules: google.api.IHttpRule[];

            /** Http fullyDecodeReservedExpansion. */
            public fullyDecodeReservedExpansion: boolean;

            /**
             * Creates a new Http instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Http instance
             */
            public static create(properties?: google.api.IHttp): google.api.Http;

            /**
             * Encodes the specified Http message. Does not implicitly {@link google.api.Http.verify|verify} messages.
             * @param message Http message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IHttp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Http message, length delimited. Does not implicitly {@link google.api.Http.verify|verify} messages.
             * @param message Http message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IHttp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Http message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Http
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.Http;

            /**
             * Decodes a Http message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Http
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.Http;

            /**
             * Verifies a Http message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Http message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Http
             */
            public static fromObject(object: { [k: string]: any }): google.api.Http;

            /**
             * Creates a plain object from a Http message. Also converts values to other types if specified.
             * @param message Http
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.Http, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Http to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Http
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a HttpRule. */
        interface IHttpRule {

            /** HttpRule selector */
            selector?: (string|null);

            /** HttpRule get */
            get?: (string|null);

            /** HttpRule put */
            put?: (string|null);

            /** HttpRule post */
            post?: (string|null);

            /** HttpRule delete */
            "delete"?: (string|null);

            /** HttpRule patch */
            patch?: (string|null);

            /** HttpRule custom */
            custom?: (google.api.ICustomHttpPattern|null);

            /** HttpRule body */
            body?: (string|null);

            /** HttpRule responseBody */
            responseBody?: (string|null);

            /** HttpRule additionalBindings */
            additionalBindings?: (google.api.IHttpRule[]|null);
        }

        /** Represents a HttpRule. */
        class HttpRule implements IHttpRule {

            /**
             * Constructs a new HttpRule.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IHttpRule);

            /** HttpRule selector. */
            public selector: string;

            /** HttpRule get. */
            public get?: (string|null);

            /** HttpRule put. */
            public put?: (string|null);

            /** HttpRule post. */
            public post?: (string|null);

            /** HttpRule delete. */
            public delete?: (string|null);

            /** HttpRule patch. */
            public patch?: (string|null);

            /** HttpRule custom. */
            public custom?: (google.api.ICustomHttpPattern|null);

            /** HttpRule body. */
            public body: string;

            /** HttpRule responseBody. */
            public responseBody: string;

            /** HttpRule additionalBindings. */
            public additionalBindings: google.api.IHttpRule[];

            /** HttpRule pattern. */
            public pattern?: ("get"|"put"|"post"|"delete"|"patch"|"custom");

            /**
             * Creates a new HttpRule instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HttpRule instance
             */
            public static create(properties?: google.api.IHttpRule): google.api.HttpRule;

            /**
             * Encodes the specified HttpRule message. Does not implicitly {@link google.api.HttpRule.verify|verify} messages.
             * @param message HttpRule message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IHttpRule, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HttpRule message, length delimited. Does not implicitly {@link google.api.HttpRule.verify|verify} messages.
             * @param message HttpRule message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IHttpRule, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HttpRule message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns HttpRule
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.HttpRule;

            /**
             * Decodes a HttpRule message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns HttpRule
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.HttpRule;

            /**
             * Verifies a HttpRule message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a HttpRule message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns HttpRule
             */
            public static fromObject(object: { [k: string]: any }): google.api.HttpRule;

            /**
             * Creates a plain object from a HttpRule message. Also converts values to other types if specified.
             * @param message HttpRule
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.HttpRule, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this HttpRule to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for HttpRule
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CustomHttpPattern. */
        interface ICustomHttpPattern {

            /** CustomHttpPattern kind */
            kind?: (string|null);

            /** CustomHttpPattern path */
            path?: (string|null);
        }

        /** Represents a CustomHttpPattern. */
        class CustomHttpPattern implements ICustomHttpPattern {

            /**
             * Constructs a new CustomHttpPattern.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.ICustomHttpPattern);

            /** CustomHttpPattern kind. */
            public kind: string;

            /** CustomHttpPattern path. */
            public path: string;

            /**
             * Creates a new CustomHttpPattern instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CustomHttpPattern instance
             */
            public static create(properties?: google.api.ICustomHttpPattern): google.api.CustomHttpPattern;

            /**
             * Encodes the specified CustomHttpPattern message. Does not implicitly {@link google.api.CustomHttpPattern.verify|verify} messages.
             * @param message CustomHttpPattern message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.ICustomHttpPattern, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CustomHttpPattern message, length delimited. Does not implicitly {@link google.api.CustomHttpPattern.verify|verify} messages.
             * @param message CustomHttpPattern message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.ICustomHttpPattern, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CustomHttpPattern message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CustomHttpPattern
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.CustomHttpPattern;

            /**
             * Decodes a CustomHttpPattern message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CustomHttpPattern
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.CustomHttpPattern;

            /**
             * Verifies a CustomHttpPattern message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CustomHttpPattern message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CustomHttpPattern
             */
            public static fromObject(object: { [k: string]: any }): google.api.CustomHttpPattern;

            /**
             * Creates a plain object from a CustomHttpPattern message. Also converts values to other types if specified.
             * @param message CustomHttpPattern
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.CustomHttpPattern, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CustomHttpPattern to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CustomHttpPattern
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CommonLanguageSettings. */
        interface ICommonLanguageSettings {

            /** CommonLanguageSettings referenceDocsUri */
            referenceDocsUri?: (string|null);

            /** CommonLanguageSettings destinations */
            destinations?: (google.api.ClientLibraryDestination[]|null);
        }

        /** Represents a CommonLanguageSettings. */
        class CommonLanguageSettings implements ICommonLanguageSettings {

            /**
             * Constructs a new CommonLanguageSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.ICommonLanguageSettings);

            /** CommonLanguageSettings referenceDocsUri. */
            public referenceDocsUri: string;

            /** CommonLanguageSettings destinations. */
            public destinations: google.api.ClientLibraryDestination[];

            /**
             * Creates a new CommonLanguageSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CommonLanguageSettings instance
             */
            public static create(properties?: google.api.ICommonLanguageSettings): google.api.CommonLanguageSettings;

            /**
             * Encodes the specified CommonLanguageSettings message. Does not implicitly {@link google.api.CommonLanguageSettings.verify|verify} messages.
             * @param message CommonLanguageSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.ICommonLanguageSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CommonLanguageSettings message, length delimited. Does not implicitly {@link google.api.CommonLanguageSettings.verify|verify} messages.
             * @param message CommonLanguageSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.ICommonLanguageSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CommonLanguageSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CommonLanguageSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.CommonLanguageSettings;

            /**
             * Decodes a CommonLanguageSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CommonLanguageSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.CommonLanguageSettings;

            /**
             * Verifies a CommonLanguageSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CommonLanguageSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CommonLanguageSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.CommonLanguageSettings;

            /**
             * Creates a plain object from a CommonLanguageSettings message. Also converts values to other types if specified.
             * @param message CommonLanguageSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.CommonLanguageSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CommonLanguageSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CommonLanguageSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ClientLibrarySettings. */
        interface IClientLibrarySettings {

            /** ClientLibrarySettings version */
            version?: (string|null);

            /** ClientLibrarySettings launchStage */
            launchStage?: (google.api.LaunchStage|keyof typeof google.api.LaunchStage|null);

            /** ClientLibrarySettings restNumericEnums */
            restNumericEnums?: (boolean|null);

            /** ClientLibrarySettings javaSettings */
            javaSettings?: (google.api.IJavaSettings|null);

            /** ClientLibrarySettings cppSettings */
            cppSettings?: (google.api.ICppSettings|null);

            /** ClientLibrarySettings phpSettings */
            phpSettings?: (google.api.IPhpSettings|null);

            /** ClientLibrarySettings pythonSettings */
            pythonSettings?: (google.api.IPythonSettings|null);

            /** ClientLibrarySettings nodeSettings */
            nodeSettings?: (google.api.INodeSettings|null);

            /** ClientLibrarySettings dotnetSettings */
            dotnetSettings?: (google.api.IDotnetSettings|null);

            /** ClientLibrarySettings rubySettings */
            rubySettings?: (google.api.IRubySettings|null);

            /** ClientLibrarySettings goSettings */
            goSettings?: (google.api.IGoSettings|null);
        }

        /** Represents a ClientLibrarySettings. */
        class ClientLibrarySettings implements IClientLibrarySettings {

            /**
             * Constructs a new ClientLibrarySettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IClientLibrarySettings);

            /** ClientLibrarySettings version. */
            public version: string;

            /** ClientLibrarySettings launchStage. */
            public launchStage: (google.api.LaunchStage|keyof typeof google.api.LaunchStage);

            /** ClientLibrarySettings restNumericEnums. */
            public restNumericEnums: boolean;

            /** ClientLibrarySettings javaSettings. */
            public javaSettings?: (google.api.IJavaSettings|null);

            /** ClientLibrarySettings cppSettings. */
            public cppSettings?: (google.api.ICppSettings|null);

            /** ClientLibrarySettings phpSettings. */
            public phpSettings?: (google.api.IPhpSettings|null);

            /** ClientLibrarySettings pythonSettings. */
            public pythonSettings?: (google.api.IPythonSettings|null);

            /** ClientLibrarySettings nodeSettings. */
            public nodeSettings?: (google.api.INodeSettings|null);

            /** ClientLibrarySettings dotnetSettings. */
            public dotnetSettings?: (google.api.IDotnetSettings|null);

            /** ClientLibrarySettings rubySettings. */
            public rubySettings?: (google.api.IRubySettings|null);

            /** ClientLibrarySettings goSettings. */
            public goSettings?: (google.api.IGoSettings|null);

            /**
             * Creates a new ClientLibrarySettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ClientLibrarySettings instance
             */
            public static create(properties?: google.api.IClientLibrarySettings): google.api.ClientLibrarySettings;

            /**
             * Encodes the specified ClientLibrarySettings message. Does not implicitly {@link google.api.ClientLibrarySettings.verify|verify} messages.
             * @param message ClientLibrarySettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IClientLibrarySettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ClientLibrarySettings message, length delimited. Does not implicitly {@link google.api.ClientLibrarySettings.verify|verify} messages.
             * @param message ClientLibrarySettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IClientLibrarySettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ClientLibrarySettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ClientLibrarySettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.ClientLibrarySettings;

            /**
             * Decodes a ClientLibrarySettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ClientLibrarySettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.ClientLibrarySettings;

            /**
             * Verifies a ClientLibrarySettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ClientLibrarySettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ClientLibrarySettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.ClientLibrarySettings;

            /**
             * Creates a plain object from a ClientLibrarySettings message. Also converts values to other types if specified.
             * @param message ClientLibrarySettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.ClientLibrarySettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ClientLibrarySettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ClientLibrarySettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Publishing. */
        interface IPublishing {

            /** Publishing methodSettings */
            methodSettings?: (google.api.IMethodSettings[]|null);

            /** Publishing newIssueUri */
            newIssueUri?: (string|null);

            /** Publishing documentationUri */
            documentationUri?: (string|null);

            /** Publishing apiShortName */
            apiShortName?: (string|null);

            /** Publishing githubLabel */
            githubLabel?: (string|null);

            /** Publishing codeownerGithubTeams */
            codeownerGithubTeams?: (string[]|null);

            /** Publishing docTagPrefix */
            docTagPrefix?: (string|null);

            /** Publishing organization */
            organization?: (google.api.ClientLibraryOrganization|keyof typeof google.api.ClientLibraryOrganization|null);

            /** Publishing librarySettings */
            librarySettings?: (google.api.IClientLibrarySettings[]|null);

            /** Publishing protoReferenceDocumentationUri */
            protoReferenceDocumentationUri?: (string|null);
        }

        /** Represents a Publishing. */
        class Publishing implements IPublishing {

            /**
             * Constructs a new Publishing.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IPublishing);

            /** Publishing methodSettings. */
            public methodSettings: google.api.IMethodSettings[];

            /** Publishing newIssueUri. */
            public newIssueUri: string;

            /** Publishing documentationUri. */
            public documentationUri: string;

            /** Publishing apiShortName. */
            public apiShortName: string;

            /** Publishing githubLabel. */
            public githubLabel: string;

            /** Publishing codeownerGithubTeams. */
            public codeownerGithubTeams: string[];

            /** Publishing docTagPrefix. */
            public docTagPrefix: string;

            /** Publishing organization. */
            public organization: (google.api.ClientLibraryOrganization|keyof typeof google.api.ClientLibraryOrganization);

            /** Publishing librarySettings. */
            public librarySettings: google.api.IClientLibrarySettings[];

            /** Publishing protoReferenceDocumentationUri. */
            public protoReferenceDocumentationUri: string;

            /**
             * Creates a new Publishing instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Publishing instance
             */
            public static create(properties?: google.api.IPublishing): google.api.Publishing;

            /**
             * Encodes the specified Publishing message. Does not implicitly {@link google.api.Publishing.verify|verify} messages.
             * @param message Publishing message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IPublishing, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Publishing message, length delimited. Does not implicitly {@link google.api.Publishing.verify|verify} messages.
             * @param message Publishing message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IPublishing, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Publishing message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Publishing
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.Publishing;

            /**
             * Decodes a Publishing message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Publishing
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.Publishing;

            /**
             * Verifies a Publishing message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Publishing message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Publishing
             */
            public static fromObject(object: { [k: string]: any }): google.api.Publishing;

            /**
             * Creates a plain object from a Publishing message. Also converts values to other types if specified.
             * @param message Publishing
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.Publishing, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Publishing to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Publishing
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a JavaSettings. */
        interface IJavaSettings {

            /** JavaSettings libraryPackage */
            libraryPackage?: (string|null);

            /** JavaSettings serviceClassNames */
            serviceClassNames?: ({ [k: string]: string }|null);

            /** JavaSettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a JavaSettings. */
        class JavaSettings implements IJavaSettings {

            /**
             * Constructs a new JavaSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IJavaSettings);

            /** JavaSettings libraryPackage. */
            public libraryPackage: string;

            /** JavaSettings serviceClassNames. */
            public serviceClassNames: { [k: string]: string };

            /** JavaSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new JavaSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns JavaSettings instance
             */
            public static create(properties?: google.api.IJavaSettings): google.api.JavaSettings;

            /**
             * Encodes the specified JavaSettings message. Does not implicitly {@link google.api.JavaSettings.verify|verify} messages.
             * @param message JavaSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IJavaSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified JavaSettings message, length delimited. Does not implicitly {@link google.api.JavaSettings.verify|verify} messages.
             * @param message JavaSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IJavaSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a JavaSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns JavaSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.JavaSettings;

            /**
             * Decodes a JavaSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns JavaSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.JavaSettings;

            /**
             * Verifies a JavaSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a JavaSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns JavaSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.JavaSettings;

            /**
             * Creates a plain object from a JavaSettings message. Also converts values to other types if specified.
             * @param message JavaSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.JavaSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this JavaSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for JavaSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CppSettings. */
        interface ICppSettings {

            /** CppSettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a CppSettings. */
        class CppSettings implements ICppSettings {

            /**
             * Constructs a new CppSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.ICppSettings);

            /** CppSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new CppSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CppSettings instance
             */
            public static create(properties?: google.api.ICppSettings): google.api.CppSettings;

            /**
             * Encodes the specified CppSettings message. Does not implicitly {@link google.api.CppSettings.verify|verify} messages.
             * @param message CppSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.ICppSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CppSettings message, length delimited. Does not implicitly {@link google.api.CppSettings.verify|verify} messages.
             * @param message CppSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.ICppSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CppSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CppSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.CppSettings;

            /**
             * Decodes a CppSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CppSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.CppSettings;

            /**
             * Verifies a CppSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CppSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CppSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.CppSettings;

            /**
             * Creates a plain object from a CppSettings message. Also converts values to other types if specified.
             * @param message CppSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.CppSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CppSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CppSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PhpSettings. */
        interface IPhpSettings {

            /** PhpSettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a PhpSettings. */
        class PhpSettings implements IPhpSettings {

            /**
             * Constructs a new PhpSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IPhpSettings);

            /** PhpSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new PhpSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PhpSettings instance
             */
            public static create(properties?: google.api.IPhpSettings): google.api.PhpSettings;

            /**
             * Encodes the specified PhpSettings message. Does not implicitly {@link google.api.PhpSettings.verify|verify} messages.
             * @param message PhpSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IPhpSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PhpSettings message, length delimited. Does not implicitly {@link google.api.PhpSettings.verify|verify} messages.
             * @param message PhpSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IPhpSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PhpSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PhpSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.PhpSettings;

            /**
             * Decodes a PhpSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PhpSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.PhpSettings;

            /**
             * Verifies a PhpSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PhpSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PhpSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.PhpSettings;

            /**
             * Creates a plain object from a PhpSettings message. Also converts values to other types if specified.
             * @param message PhpSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.PhpSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PhpSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PhpSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PythonSettings. */
        interface IPythonSettings {

            /** PythonSettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a PythonSettings. */
        class PythonSettings implements IPythonSettings {

            /**
             * Constructs a new PythonSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IPythonSettings);

            /** PythonSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new PythonSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PythonSettings instance
             */
            public static create(properties?: google.api.IPythonSettings): google.api.PythonSettings;

            /**
             * Encodes the specified PythonSettings message. Does not implicitly {@link google.api.PythonSettings.verify|verify} messages.
             * @param message PythonSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IPythonSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PythonSettings message, length delimited. Does not implicitly {@link google.api.PythonSettings.verify|verify} messages.
             * @param message PythonSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IPythonSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PythonSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PythonSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.PythonSettings;

            /**
             * Decodes a PythonSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PythonSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.PythonSettings;

            /**
             * Verifies a PythonSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PythonSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PythonSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.PythonSettings;

            /**
             * Creates a plain object from a PythonSettings message. Also converts values to other types if specified.
             * @param message PythonSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.PythonSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PythonSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PythonSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a NodeSettings. */
        interface INodeSettings {

            /** NodeSettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a NodeSettings. */
        class NodeSettings implements INodeSettings {

            /**
             * Constructs a new NodeSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.INodeSettings);

            /** NodeSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new NodeSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NodeSettings instance
             */
            public static create(properties?: google.api.INodeSettings): google.api.NodeSettings;

            /**
             * Encodes the specified NodeSettings message. Does not implicitly {@link google.api.NodeSettings.verify|verify} messages.
             * @param message NodeSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.INodeSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NodeSettings message, length delimited. Does not implicitly {@link google.api.NodeSettings.verify|verify} messages.
             * @param message NodeSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.INodeSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NodeSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns NodeSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.NodeSettings;

            /**
             * Decodes a NodeSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NodeSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.NodeSettings;

            /**
             * Verifies a NodeSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a NodeSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns NodeSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.NodeSettings;

            /**
             * Creates a plain object from a NodeSettings message. Also converts values to other types if specified.
             * @param message NodeSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.NodeSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this NodeSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for NodeSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a DotnetSettings. */
        interface IDotnetSettings {

            /** DotnetSettings common */
            common?: (google.api.ICommonLanguageSettings|null);

            /** DotnetSettings renamedServices */
            renamedServices?: ({ [k: string]: string }|null);

            /** DotnetSettings renamedResources */
            renamedResources?: ({ [k: string]: string }|null);

            /** DotnetSettings ignoredResources */
            ignoredResources?: (string[]|null);

            /** DotnetSettings forcedNamespaceAliases */
            forcedNamespaceAliases?: (string[]|null);

            /** DotnetSettings handwrittenSignatures */
            handwrittenSignatures?: (string[]|null);
        }

        /** Represents a DotnetSettings. */
        class DotnetSettings implements IDotnetSettings {

            /**
             * Constructs a new DotnetSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IDotnetSettings);

            /** DotnetSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /** DotnetSettings renamedServices. */
            public renamedServices: { [k: string]: string };

            /** DotnetSettings renamedResources. */
            public renamedResources: { [k: string]: string };

            /** DotnetSettings ignoredResources. */
            public ignoredResources: string[];

            /** DotnetSettings forcedNamespaceAliases. */
            public forcedNamespaceAliases: string[];

            /** DotnetSettings handwrittenSignatures. */
            public handwrittenSignatures: string[];

            /**
             * Creates a new DotnetSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DotnetSettings instance
             */
            public static create(properties?: google.api.IDotnetSettings): google.api.DotnetSettings;

            /**
             * Encodes the specified DotnetSettings message. Does not implicitly {@link google.api.DotnetSettings.verify|verify} messages.
             * @param message DotnetSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IDotnetSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DotnetSettings message, length delimited. Does not implicitly {@link google.api.DotnetSettings.verify|verify} messages.
             * @param message DotnetSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IDotnetSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DotnetSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns DotnetSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.DotnetSettings;

            /**
             * Decodes a DotnetSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DotnetSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.DotnetSettings;

            /**
             * Verifies a DotnetSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a DotnetSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns DotnetSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.DotnetSettings;

            /**
             * Creates a plain object from a DotnetSettings message. Also converts values to other types if specified.
             * @param message DotnetSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.DotnetSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this DotnetSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for DotnetSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a RubySettings. */
        interface IRubySettings {

            /** RubySettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a RubySettings. */
        class RubySettings implements IRubySettings {

            /**
             * Constructs a new RubySettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IRubySettings);

            /** RubySettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new RubySettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RubySettings instance
             */
            public static create(properties?: google.api.IRubySettings): google.api.RubySettings;

            /**
             * Encodes the specified RubySettings message. Does not implicitly {@link google.api.RubySettings.verify|verify} messages.
             * @param message RubySettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IRubySettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RubySettings message, length delimited. Does not implicitly {@link google.api.RubySettings.verify|verify} messages.
             * @param message RubySettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IRubySettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RubySettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RubySettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.RubySettings;

            /**
             * Decodes a RubySettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RubySettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.RubySettings;

            /**
             * Verifies a RubySettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RubySettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RubySettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.RubySettings;

            /**
             * Creates a plain object from a RubySettings message. Also converts values to other types if specified.
             * @param message RubySettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.RubySettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RubySettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RubySettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GoSettings. */
        interface IGoSettings {

            /** GoSettings common */
            common?: (google.api.ICommonLanguageSettings|null);
        }

        /** Represents a GoSettings. */
        class GoSettings implements IGoSettings {

            /**
             * Constructs a new GoSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IGoSettings);

            /** GoSettings common. */
            public common?: (google.api.ICommonLanguageSettings|null);

            /**
             * Creates a new GoSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GoSettings instance
             */
            public static create(properties?: google.api.IGoSettings): google.api.GoSettings;

            /**
             * Encodes the specified GoSettings message. Does not implicitly {@link google.api.GoSettings.verify|verify} messages.
             * @param message GoSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IGoSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GoSettings message, length delimited. Does not implicitly {@link google.api.GoSettings.verify|verify} messages.
             * @param message GoSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IGoSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GoSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GoSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.GoSettings;

            /**
             * Decodes a GoSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GoSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.GoSettings;

            /**
             * Verifies a GoSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GoSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GoSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.GoSettings;

            /**
             * Creates a plain object from a GoSettings message. Also converts values to other types if specified.
             * @param message GoSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.GoSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GoSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GoSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a MethodSettings. */
        interface IMethodSettings {

            /** MethodSettings selector */
            selector?: (string|null);

            /** MethodSettings longRunning */
            longRunning?: (google.api.MethodSettings.ILongRunning|null);

            /** MethodSettings autoPopulatedFields */
            autoPopulatedFields?: (string[]|null);
        }

        /** Represents a MethodSettings. */
        class MethodSettings implements IMethodSettings {

            /**
             * Constructs a new MethodSettings.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.api.IMethodSettings);

            /** MethodSettings selector. */
            public selector: string;

            /** MethodSettings longRunning. */
            public longRunning?: (google.api.MethodSettings.ILongRunning|null);

            /** MethodSettings autoPopulatedFields. */
            public autoPopulatedFields: string[];

            /**
             * Creates a new MethodSettings instance using the specified properties.
             * @param [properties] Properties to set
             * @returns MethodSettings instance
             */
            public static create(properties?: google.api.IMethodSettings): google.api.MethodSettings;

            /**
             * Encodes the specified MethodSettings message. Does not implicitly {@link google.api.MethodSettings.verify|verify} messages.
             * @param message MethodSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.api.IMethodSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified MethodSettings message, length delimited. Does not implicitly {@link google.api.MethodSettings.verify|verify} messages.
             * @param message MethodSettings message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.api.IMethodSettings, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a MethodSettings message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MethodSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.MethodSettings;

            /**
             * Decodes a MethodSettings message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns MethodSettings
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.MethodSettings;

            /**
             * Verifies a MethodSettings message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a MethodSettings message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns MethodSettings
             */
            public static fromObject(object: { [k: string]: any }): google.api.MethodSettings;

            /**
             * Creates a plain object from a MethodSettings message. Also converts values to other types if specified.
             * @param message MethodSettings
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.api.MethodSettings, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this MethodSettings to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for MethodSettings
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace MethodSettings {

            /** Properties of a LongRunning. */
            interface ILongRunning {

                /** LongRunning initialPollDelay */
                initialPollDelay?: (google.protobuf.IDuration|null);

                /** LongRunning pollDelayMultiplier */
                pollDelayMultiplier?: (number|null);

                /** LongRunning maxPollDelay */
                maxPollDelay?: (google.protobuf.IDuration|null);

                /** LongRunning totalPollTimeout */
                totalPollTimeout?: (google.protobuf.IDuration|null);
            }

            /** Represents a LongRunning. */
            class LongRunning implements ILongRunning {

                /**
                 * Constructs a new LongRunning.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.api.MethodSettings.ILongRunning);

                /** LongRunning initialPollDelay. */
                public initialPollDelay?: (google.protobuf.IDuration|null);

                /** LongRunning pollDelayMultiplier. */
                public pollDelayMultiplier: number;

                /** LongRunning maxPollDelay. */
                public maxPollDelay?: (google.protobuf.IDuration|null);

                /** LongRunning totalPollTimeout. */
                public totalPollTimeout?: (google.protobuf.IDuration|null);

                /**
                 * Creates a new LongRunning instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns LongRunning instance
                 */
                public static create(properties?: google.api.MethodSettings.ILongRunning): google.api.MethodSettings.LongRunning;

                /**
                 * Encodes the specified LongRunning message. Does not implicitly {@link google.api.MethodSettings.LongRunning.verify|verify} messages.
                 * @param message LongRunning message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.api.MethodSettings.ILongRunning, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified LongRunning message, length delimited. Does not implicitly {@link google.api.MethodSettings.LongRunning.verify|verify} messages.
                 * @param message LongRunning message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.api.MethodSettings.ILongRunning, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a LongRunning message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns LongRunning
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.api.MethodSettings.LongRunning;

                /**
                 * Decodes a LongRunning message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns LongRunning
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.api.MethodSettings.LongRunning;

                /**
                 * Verifies a LongRunning message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a LongRunning message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns LongRunning
                 */
                public static fromObject(object: { [k: string]: any }): google.api.MethodSettings.LongRunning;

                /**
                 * Creates a plain object from a LongRunning message. Also converts values to other types if specified.
                 * @param message LongRunning
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.api.MethodSettings.LongRunning, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this LongRunning to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for LongRunning
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** ClientLibraryOrganization enum. */
        enum ClientLibraryOrganization {
            CLIENT_LIBRARY_ORGANIZATION_UNSPECIFIED = 0,
            CLOUD = 1,
            ADS = 2,
            PHOTOS = 3,
            STREET_VIEW = 4,
            SHOPPING = 5,
            GEO = 6,
            GENERATIVE_AI = 7
        }

        /** ClientLibraryDestination enum. */
        enum ClientLibraryDestination {
            CLIENT_LIBRARY_DESTINATION_UNSPECIFIED = 0,
            GITHUB = 10,
            PACKAGE_MANAGER = 20
        }

        /** LaunchStage enum. */
        enum LaunchStage {
            LAUNCH_STAGE_UNSPECIFIED = 0,
            UNIMPLEMENTED = 6,
            PRELAUNCH = 7,
            EARLY_ACCESS = 1,
            ALPHA = 2,
            BETA = 3,
            GA = 4,
            DEPRECATED = 5
        }
    }

    /** Namespace protobuf. */
    namespace protobuf {

        /** Properties of a FileDescriptorSet. */
        interface IFileDescriptorSet {

            /** FileDescriptorSet file */
            file?: (google.protobuf.IFileDescriptorProto[]|null);
        }

        /** Represents a FileDescriptorSet. */
        class FileDescriptorSet implements IFileDescriptorSet {

            /**
             * Constructs a new FileDescriptorSet.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFileDescriptorSet);

            /** FileDescriptorSet file. */
            public file: google.protobuf.IFileDescriptorProto[];

            /**
             * Creates a new FileDescriptorSet instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileDescriptorSet instance
             */
            public static create(properties?: google.protobuf.IFileDescriptorSet): google.protobuf.FileDescriptorSet;

            /**
             * Encodes the specified FileDescriptorSet message. Does not implicitly {@link google.protobuf.FileDescriptorSet.verify|verify} messages.
             * @param message FileDescriptorSet message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFileDescriptorSet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileDescriptorSet message, length delimited. Does not implicitly {@link google.protobuf.FileDescriptorSet.verify|verify} messages.
             * @param message FileDescriptorSet message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFileDescriptorSet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileDescriptorSet message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FileDescriptorSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FileDescriptorSet;

            /**
             * Decodes a FileDescriptorSet message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FileDescriptorSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FileDescriptorSet;

            /**
             * Verifies a FileDescriptorSet message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FileDescriptorSet message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileDescriptorSet
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FileDescriptorSet;

            /**
             * Creates a plain object from a FileDescriptorSet message. Also converts values to other types if specified.
             * @param message FileDescriptorSet
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FileDescriptorSet, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FileDescriptorSet to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FileDescriptorSet
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Edition enum. */
        enum Edition {
            EDITION_UNKNOWN = 0,
            EDITION_PROTO2 = 998,
            EDITION_PROTO3 = 999,
            EDITION_2023 = 1000,
            EDITION_2024 = 1001,
            EDITION_1_TEST_ONLY = 1,
            EDITION_2_TEST_ONLY = 2,
            EDITION_99997_TEST_ONLY = 99997,
            EDITION_99998_TEST_ONLY = 99998,
            EDITION_99999_TEST_ONLY = 99999,
            EDITION_MAX = 2147483647
        }

        /** Properties of a FileDescriptorProto. */
        interface IFileDescriptorProto {

            /** FileDescriptorProto name */
            name?: (string|null);

            /** FileDescriptorProto package */
            "package"?: (string|null);

            /** FileDescriptorProto dependency */
            dependency?: (string[]|null);

            /** FileDescriptorProto publicDependency */
            publicDependency?: (number[]|null);

            /** FileDescriptorProto weakDependency */
            weakDependency?: (number[]|null);

            /** FileDescriptorProto messageType */
            messageType?: (google.protobuf.IDescriptorProto[]|null);

            /** FileDescriptorProto enumType */
            enumType?: (google.protobuf.IEnumDescriptorProto[]|null);

            /** FileDescriptorProto service */
            service?: (google.protobuf.IServiceDescriptorProto[]|null);

            /** FileDescriptorProto extension */
            extension?: (google.protobuf.IFieldDescriptorProto[]|null);

            /** FileDescriptorProto options */
            options?: (google.protobuf.IFileOptions|null);

            /** FileDescriptorProto sourceCodeInfo */
            sourceCodeInfo?: (google.protobuf.ISourceCodeInfo|null);

            /** FileDescriptorProto syntax */
            syntax?: (string|null);

            /** FileDescriptorProto edition */
            edition?: (google.protobuf.Edition|keyof typeof google.protobuf.Edition|null);
        }

        /** Represents a FileDescriptorProto. */
        class FileDescriptorProto implements IFileDescriptorProto {

            /**
             * Constructs a new FileDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFileDescriptorProto);

            /** FileDescriptorProto name. */
            public name: string;

            /** FileDescriptorProto package. */
            public package: string;

            /** FileDescriptorProto dependency. */
            public dependency: string[];

            /** FileDescriptorProto publicDependency. */
            public publicDependency: number[];

            /** FileDescriptorProto weakDependency. */
            public weakDependency: number[];

            /** FileDescriptorProto messageType. */
            public messageType: google.protobuf.IDescriptorProto[];

            /** FileDescriptorProto enumType. */
            public enumType: google.protobuf.IEnumDescriptorProto[];

            /** FileDescriptorProto service. */
            public service: google.protobuf.IServiceDescriptorProto[];

            /** FileDescriptorProto extension. */
            public extension: google.protobuf.IFieldDescriptorProto[];

            /** FileDescriptorProto options. */
            public options?: (google.protobuf.IFileOptions|null);

            /** FileDescriptorProto sourceCodeInfo. */
            public sourceCodeInfo?: (google.protobuf.ISourceCodeInfo|null);

            /** FileDescriptorProto syntax. */
            public syntax: string;

            /** FileDescriptorProto edition. */
            public edition: (google.protobuf.Edition|keyof typeof google.protobuf.Edition);

            /**
             * Creates a new FileDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IFileDescriptorProto): google.protobuf.FileDescriptorProto;

            /**
             * Encodes the specified FileDescriptorProto message. Does not implicitly {@link google.protobuf.FileDescriptorProto.verify|verify} messages.
             * @param message FileDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFileDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.FileDescriptorProto.verify|verify} messages.
             * @param message FileDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFileDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FileDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FileDescriptorProto;

            /**
             * Decodes a FileDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FileDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FileDescriptorProto;

            /**
             * Verifies a FileDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FileDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FileDescriptorProto;

            /**
             * Creates a plain object from a FileDescriptorProto message. Also converts values to other types if specified.
             * @param message FileDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FileDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FileDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FileDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a DescriptorProto. */
        interface IDescriptorProto {

            /** DescriptorProto name */
            name?: (string|null);

            /** DescriptorProto field */
            field?: (google.protobuf.IFieldDescriptorProto[]|null);

            /** DescriptorProto extension */
            extension?: (google.protobuf.IFieldDescriptorProto[]|null);

            /** DescriptorProto nestedType */
            nestedType?: (google.protobuf.IDescriptorProto[]|null);

            /** DescriptorProto enumType */
            enumType?: (google.protobuf.IEnumDescriptorProto[]|null);

            /** DescriptorProto extensionRange */
            extensionRange?: (google.protobuf.DescriptorProto.IExtensionRange[]|null);

            /** DescriptorProto oneofDecl */
            oneofDecl?: (google.protobuf.IOneofDescriptorProto[]|null);

            /** DescriptorProto options */
            options?: (google.protobuf.IMessageOptions|null);

            /** DescriptorProto reservedRange */
            reservedRange?: (google.protobuf.DescriptorProto.IReservedRange[]|null);

            /** DescriptorProto reservedName */
            reservedName?: (string[]|null);
        }

        /** Represents a DescriptorProto. */
        class DescriptorProto implements IDescriptorProto {

            /**
             * Constructs a new DescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IDescriptorProto);

            /** DescriptorProto name. */
            public name: string;

            /** DescriptorProto field. */
            public field: google.protobuf.IFieldDescriptorProto[];

            /** DescriptorProto extension. */
            public extension: google.protobuf.IFieldDescriptorProto[];

            /** DescriptorProto nestedType. */
            public nestedType: google.protobuf.IDescriptorProto[];

            /** DescriptorProto enumType. */
            public enumType: google.protobuf.IEnumDescriptorProto[];

            /** DescriptorProto extensionRange. */
            public extensionRange: google.protobuf.DescriptorProto.IExtensionRange[];

            /** DescriptorProto oneofDecl. */
            public oneofDecl: google.protobuf.IOneofDescriptorProto[];

            /** DescriptorProto options. */
            public options?: (google.protobuf.IMessageOptions|null);

            /** DescriptorProto reservedRange. */
            public reservedRange: google.protobuf.DescriptorProto.IReservedRange[];

            /** DescriptorProto reservedName. */
            public reservedName: string[];

            /**
             * Creates a new DescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DescriptorProto instance
             */
            public static create(properties?: google.protobuf.IDescriptorProto): google.protobuf.DescriptorProto;

            /**
             * Encodes the specified DescriptorProto message. Does not implicitly {@link google.protobuf.DescriptorProto.verify|verify} messages.
             * @param message DescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.DescriptorProto.verify|verify} messages.
             * @param message DescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns DescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.DescriptorProto;

            /**
             * Decodes a DescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.DescriptorProto;

            /**
             * Verifies a DescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a DescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns DescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.DescriptorProto;

            /**
             * Creates a plain object from a DescriptorProto message. Also converts values to other types if specified.
             * @param message DescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.DescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this DescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for DescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace DescriptorProto {

            /** Properties of an ExtensionRange. */
            interface IExtensionRange {

                /** ExtensionRange start */
                start?: (number|null);

                /** ExtensionRange end */
                end?: (number|null);

                /** ExtensionRange options */
                options?: (google.protobuf.IExtensionRangeOptions|null);
            }

            /** Represents an ExtensionRange. */
            class ExtensionRange implements IExtensionRange {

                /**
                 * Constructs a new ExtensionRange.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.DescriptorProto.IExtensionRange);

                /** ExtensionRange start. */
                public start: number;

                /** ExtensionRange end. */
                public end: number;

                /** ExtensionRange options. */
                public options?: (google.protobuf.IExtensionRangeOptions|null);

                /**
                 * Creates a new ExtensionRange instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ExtensionRange instance
                 */
                public static create(properties?: google.protobuf.DescriptorProto.IExtensionRange): google.protobuf.DescriptorProto.ExtensionRange;

                /**
                 * Encodes the specified ExtensionRange message. Does not implicitly {@link google.protobuf.DescriptorProto.ExtensionRange.verify|verify} messages.
                 * @param message ExtensionRange message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.DescriptorProto.IExtensionRange, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ExtensionRange message, length delimited. Does not implicitly {@link google.protobuf.DescriptorProto.ExtensionRange.verify|verify} messages.
                 * @param message ExtensionRange message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.DescriptorProto.IExtensionRange, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ExtensionRange message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ExtensionRange
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.DescriptorProto.ExtensionRange;

                /**
                 * Decodes an ExtensionRange message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ExtensionRange
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.DescriptorProto.ExtensionRange;

                /**
                 * Verifies an ExtensionRange message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ExtensionRange message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ExtensionRange
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.DescriptorProto.ExtensionRange;

                /**
                 * Creates a plain object from an ExtensionRange message. Also converts values to other types if specified.
                 * @param message ExtensionRange
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.DescriptorProto.ExtensionRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ExtensionRange to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for ExtensionRange
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a ReservedRange. */
            interface IReservedRange {

                /** ReservedRange start */
                start?: (number|null);

                /** ReservedRange end */
                end?: (number|null);
            }

            /** Represents a ReservedRange. */
            class ReservedRange implements IReservedRange {

                /**
                 * Constructs a new ReservedRange.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.DescriptorProto.IReservedRange);

                /** ReservedRange start. */
                public start: number;

                /** ReservedRange end. */
                public end: number;

                /**
                 * Creates a new ReservedRange instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ReservedRange instance
                 */
                public static create(properties?: google.protobuf.DescriptorProto.IReservedRange): google.protobuf.DescriptorProto.ReservedRange;

                /**
                 * Encodes the specified ReservedRange message. Does not implicitly {@link google.protobuf.DescriptorProto.ReservedRange.verify|verify} messages.
                 * @param message ReservedRange message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.DescriptorProto.IReservedRange, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ReservedRange message, length delimited. Does not implicitly {@link google.protobuf.DescriptorProto.ReservedRange.verify|verify} messages.
                 * @param message ReservedRange message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.DescriptorProto.IReservedRange, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ReservedRange message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ReservedRange
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.DescriptorProto.ReservedRange;

                /**
                 * Decodes a ReservedRange message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ReservedRange
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.DescriptorProto.ReservedRange;

                /**
                 * Verifies a ReservedRange message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ReservedRange message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ReservedRange
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.DescriptorProto.ReservedRange;

                /**
                 * Creates a plain object from a ReservedRange message. Also converts values to other types if specified.
                 * @param message ReservedRange
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.DescriptorProto.ReservedRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ReservedRange to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for ReservedRange
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of an ExtensionRangeOptions. */
        interface IExtensionRangeOptions {

            /** ExtensionRangeOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);

            /** ExtensionRangeOptions declaration */
            declaration?: (google.protobuf.ExtensionRangeOptions.IDeclaration[]|null);

            /** ExtensionRangeOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** ExtensionRangeOptions verification */
            verification?: (google.protobuf.ExtensionRangeOptions.VerificationState|keyof typeof google.protobuf.ExtensionRangeOptions.VerificationState|null);
        }

        /** Represents an ExtensionRangeOptions. */
        class ExtensionRangeOptions implements IExtensionRangeOptions {

            /**
             * Constructs a new ExtensionRangeOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IExtensionRangeOptions);

            /** ExtensionRangeOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /** ExtensionRangeOptions declaration. */
            public declaration: google.protobuf.ExtensionRangeOptions.IDeclaration[];

            /** ExtensionRangeOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** ExtensionRangeOptions verification. */
            public verification: (google.protobuf.ExtensionRangeOptions.VerificationState|keyof typeof google.protobuf.ExtensionRangeOptions.VerificationState);

            /**
             * Creates a new ExtensionRangeOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ExtensionRangeOptions instance
             */
            public static create(properties?: google.protobuf.IExtensionRangeOptions): google.protobuf.ExtensionRangeOptions;

            /**
             * Encodes the specified ExtensionRangeOptions message. Does not implicitly {@link google.protobuf.ExtensionRangeOptions.verify|verify} messages.
             * @param message ExtensionRangeOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IExtensionRangeOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ExtensionRangeOptions message, length delimited. Does not implicitly {@link google.protobuf.ExtensionRangeOptions.verify|verify} messages.
             * @param message ExtensionRangeOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IExtensionRangeOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an ExtensionRangeOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ExtensionRangeOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.ExtensionRangeOptions;

            /**
             * Decodes an ExtensionRangeOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ExtensionRangeOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.ExtensionRangeOptions;

            /**
             * Verifies an ExtensionRangeOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an ExtensionRangeOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ExtensionRangeOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.ExtensionRangeOptions;

            /**
             * Creates a plain object from an ExtensionRangeOptions message. Also converts values to other types if specified.
             * @param message ExtensionRangeOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.ExtensionRangeOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ExtensionRangeOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ExtensionRangeOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace ExtensionRangeOptions {

            /** Properties of a Declaration. */
            interface IDeclaration {

                /** Declaration number */
                number?: (number|null);

                /** Declaration fullName */
                fullName?: (string|null);

                /** Declaration type */
                type?: (string|null);

                /** Declaration reserved */
                reserved?: (boolean|null);

                /** Declaration repeated */
                repeated?: (boolean|null);
            }

            /** Represents a Declaration. */
            class Declaration implements IDeclaration {

                /**
                 * Constructs a new Declaration.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.ExtensionRangeOptions.IDeclaration);

                /** Declaration number. */
                public number: number;

                /** Declaration fullName. */
                public fullName: string;

                /** Declaration type. */
                public type: string;

                /** Declaration reserved. */
                public reserved: boolean;

                /** Declaration repeated. */
                public repeated: boolean;

                /**
                 * Creates a new Declaration instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Declaration instance
                 */
                public static create(properties?: google.protobuf.ExtensionRangeOptions.IDeclaration): google.protobuf.ExtensionRangeOptions.Declaration;

                /**
                 * Encodes the specified Declaration message. Does not implicitly {@link google.protobuf.ExtensionRangeOptions.Declaration.verify|verify} messages.
                 * @param message Declaration message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.ExtensionRangeOptions.IDeclaration, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Declaration message, length delimited. Does not implicitly {@link google.protobuf.ExtensionRangeOptions.Declaration.verify|verify} messages.
                 * @param message Declaration message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.ExtensionRangeOptions.IDeclaration, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Declaration message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Declaration
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.ExtensionRangeOptions.Declaration;

                /**
                 * Decodes a Declaration message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Declaration
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.ExtensionRangeOptions.Declaration;

                /**
                 * Verifies a Declaration message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Declaration message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Declaration
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.ExtensionRangeOptions.Declaration;

                /**
                 * Creates a plain object from a Declaration message. Also converts values to other types if specified.
                 * @param message Declaration
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.ExtensionRangeOptions.Declaration, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Declaration to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Declaration
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** VerificationState enum. */
            enum VerificationState {
                DECLARATION = 0,
                UNVERIFIED = 1
            }
        }

        /** Properties of a FieldDescriptorProto. */
        interface IFieldDescriptorProto {

            /** FieldDescriptorProto name */
            name?: (string|null);

            /** FieldDescriptorProto number */
            number?: (number|null);

            /** FieldDescriptorProto label */
            label?: (google.protobuf.FieldDescriptorProto.Label|keyof typeof google.protobuf.FieldDescriptorProto.Label|null);

            /** FieldDescriptorProto type */
            type?: (google.protobuf.FieldDescriptorProto.Type|keyof typeof google.protobuf.FieldDescriptorProto.Type|null);

            /** FieldDescriptorProto typeName */
            typeName?: (string|null);

            /** FieldDescriptorProto extendee */
            extendee?: (string|null);

            /** FieldDescriptorProto defaultValue */
            defaultValue?: (string|null);

            /** FieldDescriptorProto oneofIndex */
            oneofIndex?: (number|null);

            /** FieldDescriptorProto jsonName */
            jsonName?: (string|null);

            /** FieldDescriptorProto options */
            options?: (google.protobuf.IFieldOptions|null);

            /** FieldDescriptorProto proto3Optional */
            proto3Optional?: (boolean|null);
        }

        /** Represents a FieldDescriptorProto. */
        class FieldDescriptorProto implements IFieldDescriptorProto {

            /**
             * Constructs a new FieldDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFieldDescriptorProto);

            /** FieldDescriptorProto name. */
            public name: string;

            /** FieldDescriptorProto number. */
            public number: number;

            /** FieldDescriptorProto label. */
            public label: (google.protobuf.FieldDescriptorProto.Label|keyof typeof google.protobuf.FieldDescriptorProto.Label);

            /** FieldDescriptorProto type. */
            public type: (google.protobuf.FieldDescriptorProto.Type|keyof typeof google.protobuf.FieldDescriptorProto.Type);

            /** FieldDescriptorProto typeName. */
            public typeName: string;

            /** FieldDescriptorProto extendee. */
            public extendee: string;

            /** FieldDescriptorProto defaultValue. */
            public defaultValue: string;

            /** FieldDescriptorProto oneofIndex. */
            public oneofIndex: number;

            /** FieldDescriptorProto jsonName. */
            public jsonName: string;

            /** FieldDescriptorProto options. */
            public options?: (google.protobuf.IFieldOptions|null);

            /** FieldDescriptorProto proto3Optional. */
            public proto3Optional: boolean;

            /**
             * Creates a new FieldDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FieldDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IFieldDescriptorProto): google.protobuf.FieldDescriptorProto;

            /**
             * Encodes the specified FieldDescriptorProto message. Does not implicitly {@link google.protobuf.FieldDescriptorProto.verify|verify} messages.
             * @param message FieldDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFieldDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FieldDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.FieldDescriptorProto.verify|verify} messages.
             * @param message FieldDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFieldDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FieldDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FieldDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FieldDescriptorProto;

            /**
             * Decodes a FieldDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FieldDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FieldDescriptorProto;

            /**
             * Verifies a FieldDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FieldDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FieldDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FieldDescriptorProto;

            /**
             * Creates a plain object from a FieldDescriptorProto message. Also converts values to other types if specified.
             * @param message FieldDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FieldDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FieldDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FieldDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace FieldDescriptorProto {

            /** Type enum. */
            enum Type {
                TYPE_DOUBLE = 1,
                TYPE_FLOAT = 2,
                TYPE_INT64 = 3,
                TYPE_UINT64 = 4,
                TYPE_INT32 = 5,
                TYPE_FIXED64 = 6,
                TYPE_FIXED32 = 7,
                TYPE_BOOL = 8,
                TYPE_STRING = 9,
                TYPE_GROUP = 10,
                TYPE_MESSAGE = 11,
                TYPE_BYTES = 12,
                TYPE_UINT32 = 13,
                TYPE_ENUM = 14,
                TYPE_SFIXED32 = 15,
                TYPE_SFIXED64 = 16,
                TYPE_SINT32 = 17,
                TYPE_SINT64 = 18
            }

            /** Label enum. */
            enum Label {
                LABEL_OPTIONAL = 1,
                LABEL_REPEATED = 3,
                LABEL_REQUIRED = 2
            }
        }

        /** Properties of an OneofDescriptorProto. */
        interface IOneofDescriptorProto {

            /** OneofDescriptorProto name */
            name?: (string|null);

            /** OneofDescriptorProto options */
            options?: (google.protobuf.IOneofOptions|null);
        }

        /** Represents an OneofDescriptorProto. */
        class OneofDescriptorProto implements IOneofDescriptorProto {

            /**
             * Constructs a new OneofDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IOneofDescriptorProto);

            /** OneofDescriptorProto name. */
            public name: string;

            /** OneofDescriptorProto options. */
            public options?: (google.protobuf.IOneofOptions|null);

            /**
             * Creates a new OneofDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns OneofDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IOneofDescriptorProto): google.protobuf.OneofDescriptorProto;

            /**
             * Encodes the specified OneofDescriptorProto message. Does not implicitly {@link google.protobuf.OneofDescriptorProto.verify|verify} messages.
             * @param message OneofDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IOneofDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified OneofDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.OneofDescriptorProto.verify|verify} messages.
             * @param message OneofDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IOneofDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an OneofDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns OneofDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.OneofDescriptorProto;

            /**
             * Decodes an OneofDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns OneofDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.OneofDescriptorProto;

            /**
             * Verifies an OneofDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an OneofDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns OneofDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.OneofDescriptorProto;

            /**
             * Creates a plain object from an OneofDescriptorProto message. Also converts values to other types if specified.
             * @param message OneofDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.OneofDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this OneofDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for OneofDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an EnumDescriptorProto. */
        interface IEnumDescriptorProto {

            /** EnumDescriptorProto name */
            name?: (string|null);

            /** EnumDescriptorProto value */
            value?: (google.protobuf.IEnumValueDescriptorProto[]|null);

            /** EnumDescriptorProto options */
            options?: (google.protobuf.IEnumOptions|null);

            /** EnumDescriptorProto reservedRange */
            reservedRange?: (google.protobuf.EnumDescriptorProto.IEnumReservedRange[]|null);

            /** EnumDescriptorProto reservedName */
            reservedName?: (string[]|null);
        }

        /** Represents an EnumDescriptorProto. */
        class EnumDescriptorProto implements IEnumDescriptorProto {

            /**
             * Constructs a new EnumDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IEnumDescriptorProto);

            /** EnumDescriptorProto name. */
            public name: string;

            /** EnumDescriptorProto value. */
            public value: google.protobuf.IEnumValueDescriptorProto[];

            /** EnumDescriptorProto options. */
            public options?: (google.protobuf.IEnumOptions|null);

            /** EnumDescriptorProto reservedRange. */
            public reservedRange: google.protobuf.EnumDescriptorProto.IEnumReservedRange[];

            /** EnumDescriptorProto reservedName. */
            public reservedName: string[];

            /**
             * Creates a new EnumDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnumDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IEnumDescriptorProto): google.protobuf.EnumDescriptorProto;

            /**
             * Encodes the specified EnumDescriptorProto message. Does not implicitly {@link google.protobuf.EnumDescriptorProto.verify|verify} messages.
             * @param message EnumDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IEnumDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnumDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.EnumDescriptorProto.verify|verify} messages.
             * @param message EnumDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IEnumDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnumDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnumDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.EnumDescriptorProto;

            /**
             * Decodes an EnumDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnumDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.EnumDescriptorProto;

            /**
             * Verifies an EnumDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnumDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnumDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.EnumDescriptorProto;

            /**
             * Creates a plain object from an EnumDescriptorProto message. Also converts values to other types if specified.
             * @param message EnumDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.EnumDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnumDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnumDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace EnumDescriptorProto {

            /** Properties of an EnumReservedRange. */
            interface IEnumReservedRange {

                /** EnumReservedRange start */
                start?: (number|null);

                /** EnumReservedRange end */
                end?: (number|null);
            }

            /** Represents an EnumReservedRange. */
            class EnumReservedRange implements IEnumReservedRange {

                /**
                 * Constructs a new EnumReservedRange.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.EnumDescriptorProto.IEnumReservedRange);

                /** EnumReservedRange start. */
                public start: number;

                /** EnumReservedRange end. */
                public end: number;

                /**
                 * Creates a new EnumReservedRange instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns EnumReservedRange instance
                 */
                public static create(properties?: google.protobuf.EnumDescriptorProto.IEnumReservedRange): google.protobuf.EnumDescriptorProto.EnumReservedRange;

                /**
                 * Encodes the specified EnumReservedRange message. Does not implicitly {@link google.protobuf.EnumDescriptorProto.EnumReservedRange.verify|verify} messages.
                 * @param message EnumReservedRange message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.EnumDescriptorProto.IEnumReservedRange, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified EnumReservedRange message, length delimited. Does not implicitly {@link google.protobuf.EnumDescriptorProto.EnumReservedRange.verify|verify} messages.
                 * @param message EnumReservedRange message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.EnumDescriptorProto.IEnumReservedRange, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an EnumReservedRange message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns EnumReservedRange
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.EnumDescriptorProto.EnumReservedRange;

                /**
                 * Decodes an EnumReservedRange message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns EnumReservedRange
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.EnumDescriptorProto.EnumReservedRange;

                /**
                 * Verifies an EnumReservedRange message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an EnumReservedRange message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns EnumReservedRange
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.EnumDescriptorProto.EnumReservedRange;

                /**
                 * Creates a plain object from an EnumReservedRange message. Also converts values to other types if specified.
                 * @param message EnumReservedRange
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.EnumDescriptorProto.EnumReservedRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this EnumReservedRange to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for EnumReservedRange
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of an EnumValueDescriptorProto. */
        interface IEnumValueDescriptorProto {

            /** EnumValueDescriptorProto name */
            name?: (string|null);

            /** EnumValueDescriptorProto number */
            number?: (number|null);

            /** EnumValueDescriptorProto options */
            options?: (google.protobuf.IEnumValueOptions|null);
        }

        /** Represents an EnumValueDescriptorProto. */
        class EnumValueDescriptorProto implements IEnumValueDescriptorProto {

            /**
             * Constructs a new EnumValueDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IEnumValueDescriptorProto);

            /** EnumValueDescriptorProto name. */
            public name: string;

            /** EnumValueDescriptorProto number. */
            public number: number;

            /** EnumValueDescriptorProto options. */
            public options?: (google.protobuf.IEnumValueOptions|null);

            /**
             * Creates a new EnumValueDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnumValueDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IEnumValueDescriptorProto): google.protobuf.EnumValueDescriptorProto;

            /**
             * Encodes the specified EnumValueDescriptorProto message. Does not implicitly {@link google.protobuf.EnumValueDescriptorProto.verify|verify} messages.
             * @param message EnumValueDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IEnumValueDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnumValueDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.EnumValueDescriptorProto.verify|verify} messages.
             * @param message EnumValueDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IEnumValueDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnumValueDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnumValueDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.EnumValueDescriptorProto;

            /**
             * Decodes an EnumValueDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnumValueDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.EnumValueDescriptorProto;

            /**
             * Verifies an EnumValueDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnumValueDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnumValueDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.EnumValueDescriptorProto;

            /**
             * Creates a plain object from an EnumValueDescriptorProto message. Also converts values to other types if specified.
             * @param message EnumValueDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.EnumValueDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnumValueDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnumValueDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ServiceDescriptorProto. */
        interface IServiceDescriptorProto {

            /** ServiceDescriptorProto name */
            name?: (string|null);

            /** ServiceDescriptorProto method */
            method?: (google.protobuf.IMethodDescriptorProto[]|null);

            /** ServiceDescriptorProto options */
            options?: (google.protobuf.IServiceOptions|null);
        }

        /** Represents a ServiceDescriptorProto. */
        class ServiceDescriptorProto implements IServiceDescriptorProto {

            /**
             * Constructs a new ServiceDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IServiceDescriptorProto);

            /** ServiceDescriptorProto name. */
            public name: string;

            /** ServiceDescriptorProto method. */
            public method: google.protobuf.IMethodDescriptorProto[];

            /** ServiceDescriptorProto options. */
            public options?: (google.protobuf.IServiceOptions|null);

            /**
             * Creates a new ServiceDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ServiceDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IServiceDescriptorProto): google.protobuf.ServiceDescriptorProto;

            /**
             * Encodes the specified ServiceDescriptorProto message. Does not implicitly {@link google.protobuf.ServiceDescriptorProto.verify|verify} messages.
             * @param message ServiceDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IServiceDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ServiceDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.ServiceDescriptorProto.verify|verify} messages.
             * @param message ServiceDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IServiceDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ServiceDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ServiceDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.ServiceDescriptorProto;

            /**
             * Decodes a ServiceDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ServiceDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.ServiceDescriptorProto;

            /**
             * Verifies a ServiceDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ServiceDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ServiceDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.ServiceDescriptorProto;

            /**
             * Creates a plain object from a ServiceDescriptorProto message. Also converts values to other types if specified.
             * @param message ServiceDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.ServiceDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ServiceDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ServiceDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a MethodDescriptorProto. */
        interface IMethodDescriptorProto {

            /** MethodDescriptorProto name */
            name?: (string|null);

            /** MethodDescriptorProto inputType */
            inputType?: (string|null);

            /** MethodDescriptorProto outputType */
            outputType?: (string|null);

            /** MethodDescriptorProto options */
            options?: (google.protobuf.IMethodOptions|null);

            /** MethodDescriptorProto clientStreaming */
            clientStreaming?: (boolean|null);

            /** MethodDescriptorProto serverStreaming */
            serverStreaming?: (boolean|null);
        }

        /** Represents a MethodDescriptorProto. */
        class MethodDescriptorProto implements IMethodDescriptorProto {

            /**
             * Constructs a new MethodDescriptorProto.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IMethodDescriptorProto);

            /** MethodDescriptorProto name. */
            public name: string;

            /** MethodDescriptorProto inputType. */
            public inputType: string;

            /** MethodDescriptorProto outputType. */
            public outputType: string;

            /** MethodDescriptorProto options. */
            public options?: (google.protobuf.IMethodOptions|null);

            /** MethodDescriptorProto clientStreaming. */
            public clientStreaming: boolean;

            /** MethodDescriptorProto serverStreaming. */
            public serverStreaming: boolean;

            /**
             * Creates a new MethodDescriptorProto instance using the specified properties.
             * @param [properties] Properties to set
             * @returns MethodDescriptorProto instance
             */
            public static create(properties?: google.protobuf.IMethodDescriptorProto): google.protobuf.MethodDescriptorProto;

            /**
             * Encodes the specified MethodDescriptorProto message. Does not implicitly {@link google.protobuf.MethodDescriptorProto.verify|verify} messages.
             * @param message MethodDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IMethodDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified MethodDescriptorProto message, length delimited. Does not implicitly {@link google.protobuf.MethodDescriptorProto.verify|verify} messages.
             * @param message MethodDescriptorProto message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IMethodDescriptorProto, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a MethodDescriptorProto message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MethodDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.MethodDescriptorProto;

            /**
             * Decodes a MethodDescriptorProto message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns MethodDescriptorProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.MethodDescriptorProto;

            /**
             * Verifies a MethodDescriptorProto message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a MethodDescriptorProto message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns MethodDescriptorProto
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.MethodDescriptorProto;

            /**
             * Creates a plain object from a MethodDescriptorProto message. Also converts values to other types if specified.
             * @param message MethodDescriptorProto
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.MethodDescriptorProto, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this MethodDescriptorProto to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for MethodDescriptorProto
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a FileOptions. */
        interface IFileOptions {

            /** FileOptions javaPackage */
            javaPackage?: (string|null);

            /** FileOptions javaOuterClassname */
            javaOuterClassname?: (string|null);

            /** FileOptions javaMultipleFiles */
            javaMultipleFiles?: (boolean|null);

            /** FileOptions javaGenerateEqualsAndHash */
            javaGenerateEqualsAndHash?: (boolean|null);

            /** FileOptions javaStringCheckUtf8 */
            javaStringCheckUtf8?: (boolean|null);

            /** FileOptions optimizeFor */
            optimizeFor?: (google.protobuf.FileOptions.OptimizeMode|keyof typeof google.protobuf.FileOptions.OptimizeMode|null);

            /** FileOptions goPackage */
            goPackage?: (string|null);

            /** FileOptions ccGenericServices */
            ccGenericServices?: (boolean|null);

            /** FileOptions javaGenericServices */
            javaGenericServices?: (boolean|null);

            /** FileOptions pyGenericServices */
            pyGenericServices?: (boolean|null);

            /** FileOptions deprecated */
            deprecated?: (boolean|null);

            /** FileOptions ccEnableArenas */
            ccEnableArenas?: (boolean|null);

            /** FileOptions objcClassPrefix */
            objcClassPrefix?: (string|null);

            /** FileOptions csharpNamespace */
            csharpNamespace?: (string|null);

            /** FileOptions swiftPrefix */
            swiftPrefix?: (string|null);

            /** FileOptions phpClassPrefix */
            phpClassPrefix?: (string|null);

            /** FileOptions phpNamespace */
            phpNamespace?: (string|null);

            /** FileOptions phpMetadataNamespace */
            phpMetadataNamespace?: (string|null);

            /** FileOptions rubyPackage */
            rubyPackage?: (string|null);

            /** FileOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** FileOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);

            /** FileOptions .google.api.resourceDefinition */
            ".google.api.resourceDefinition"?: (google.api.IResourceDescriptor[]|null);
        }

        /** Represents a FileOptions. */
        class FileOptions implements IFileOptions {

            /**
             * Constructs a new FileOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFileOptions);

            /** FileOptions javaPackage. */
            public javaPackage: string;

            /** FileOptions javaOuterClassname. */
            public javaOuterClassname: string;

            /** FileOptions javaMultipleFiles. */
            public javaMultipleFiles: boolean;

            /** FileOptions javaGenerateEqualsAndHash. */
            public javaGenerateEqualsAndHash: boolean;

            /** FileOptions javaStringCheckUtf8. */
            public javaStringCheckUtf8: boolean;

            /** FileOptions optimizeFor. */
            public optimizeFor: (google.protobuf.FileOptions.OptimizeMode|keyof typeof google.protobuf.FileOptions.OptimizeMode);

            /** FileOptions goPackage. */
            public goPackage: string;

            /** FileOptions ccGenericServices. */
            public ccGenericServices: boolean;

            /** FileOptions javaGenericServices. */
            public javaGenericServices: boolean;

            /** FileOptions pyGenericServices. */
            public pyGenericServices: boolean;

            /** FileOptions deprecated. */
            public deprecated: boolean;

            /** FileOptions ccEnableArenas. */
            public ccEnableArenas: boolean;

            /** FileOptions objcClassPrefix. */
            public objcClassPrefix: string;

            /** FileOptions csharpNamespace. */
            public csharpNamespace: string;

            /** FileOptions swiftPrefix. */
            public swiftPrefix: string;

            /** FileOptions phpClassPrefix. */
            public phpClassPrefix: string;

            /** FileOptions phpNamespace. */
            public phpNamespace: string;

            /** FileOptions phpMetadataNamespace. */
            public phpMetadataNamespace: string;

            /** FileOptions rubyPackage. */
            public rubyPackage: string;

            /** FileOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** FileOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new FileOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FileOptions instance
             */
            public static create(properties?: google.protobuf.IFileOptions): google.protobuf.FileOptions;

            /**
             * Encodes the specified FileOptions message. Does not implicitly {@link google.protobuf.FileOptions.verify|verify} messages.
             * @param message FileOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFileOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FileOptions message, length delimited. Does not implicitly {@link google.protobuf.FileOptions.verify|verify} messages.
             * @param message FileOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFileOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FileOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FileOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FileOptions;

            /**
             * Decodes a FileOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FileOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FileOptions;

            /**
             * Verifies a FileOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FileOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FileOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FileOptions;

            /**
             * Creates a plain object from a FileOptions message. Also converts values to other types if specified.
             * @param message FileOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FileOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FileOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FileOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace FileOptions {

            /** OptimizeMode enum. */
            enum OptimizeMode {
                SPEED = 1,
                CODE_SIZE = 2,
                LITE_RUNTIME = 3
            }
        }

        /** Properties of a MessageOptions. */
        interface IMessageOptions {

            /** MessageOptions messageSetWireFormat */
            messageSetWireFormat?: (boolean|null);

            /** MessageOptions noStandardDescriptorAccessor */
            noStandardDescriptorAccessor?: (boolean|null);

            /** MessageOptions deprecated */
            deprecated?: (boolean|null);

            /** MessageOptions mapEntry */
            mapEntry?: (boolean|null);

            /** MessageOptions deprecatedLegacyJsonFieldConflicts */
            deprecatedLegacyJsonFieldConflicts?: (boolean|null);

            /** MessageOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** MessageOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);

            /** MessageOptions .google.api.resource */
            ".google.api.resource"?: (google.api.IResourceDescriptor|null);
        }

        /** Represents a MessageOptions. */
        class MessageOptions implements IMessageOptions {

            /**
             * Constructs a new MessageOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IMessageOptions);

            /** MessageOptions messageSetWireFormat. */
            public messageSetWireFormat: boolean;

            /** MessageOptions noStandardDescriptorAccessor. */
            public noStandardDescriptorAccessor: boolean;

            /** MessageOptions deprecated. */
            public deprecated: boolean;

            /** MessageOptions mapEntry. */
            public mapEntry: boolean;

            /** MessageOptions deprecatedLegacyJsonFieldConflicts. */
            public deprecatedLegacyJsonFieldConflicts: boolean;

            /** MessageOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** MessageOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new MessageOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns MessageOptions instance
             */
            public static create(properties?: google.protobuf.IMessageOptions): google.protobuf.MessageOptions;

            /**
             * Encodes the specified MessageOptions message. Does not implicitly {@link google.protobuf.MessageOptions.verify|verify} messages.
             * @param message MessageOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IMessageOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified MessageOptions message, length delimited. Does not implicitly {@link google.protobuf.MessageOptions.verify|verify} messages.
             * @param message MessageOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IMessageOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a MessageOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MessageOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.MessageOptions;

            /**
             * Decodes a MessageOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns MessageOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.MessageOptions;

            /**
             * Verifies a MessageOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a MessageOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns MessageOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.MessageOptions;

            /**
             * Creates a plain object from a MessageOptions message. Also converts values to other types if specified.
             * @param message MessageOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.MessageOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this MessageOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for MessageOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a FieldOptions. */
        interface IFieldOptions {

            /** FieldOptions ctype */
            ctype?: (google.protobuf.FieldOptions.CType|keyof typeof google.protobuf.FieldOptions.CType|null);

            /** FieldOptions packed */
            packed?: (boolean|null);

            /** FieldOptions jstype */
            jstype?: (google.protobuf.FieldOptions.JSType|keyof typeof google.protobuf.FieldOptions.JSType|null);

            /** FieldOptions lazy */
            lazy?: (boolean|null);

            /** FieldOptions unverifiedLazy */
            unverifiedLazy?: (boolean|null);

            /** FieldOptions deprecated */
            deprecated?: (boolean|null);

            /** FieldOptions weak */
            weak?: (boolean|null);

            /** FieldOptions debugRedact */
            debugRedact?: (boolean|null);

            /** FieldOptions retention */
            retention?: (google.protobuf.FieldOptions.OptionRetention|keyof typeof google.protobuf.FieldOptions.OptionRetention|null);

            /** FieldOptions targets */
            targets?: (google.protobuf.FieldOptions.OptionTargetType[]|null);

            /** FieldOptions editionDefaults */
            editionDefaults?: (google.protobuf.FieldOptions.IEditionDefault[]|null);

            /** FieldOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** FieldOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);

            /** FieldOptions .google.api.fieldBehavior */
            ".google.api.fieldBehavior"?: (google.api.FieldBehavior[]|null);

            /** FieldOptions .google.api.resourceReference */
            ".google.api.resourceReference"?: (google.api.IResourceReference|null);
        }

        /** Represents a FieldOptions. */
        class FieldOptions implements IFieldOptions {

            /**
             * Constructs a new FieldOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFieldOptions);

            /** FieldOptions ctype. */
            public ctype: (google.protobuf.FieldOptions.CType|keyof typeof google.protobuf.FieldOptions.CType);

            /** FieldOptions packed. */
            public packed: boolean;

            /** FieldOptions jstype. */
            public jstype: (google.protobuf.FieldOptions.JSType|keyof typeof google.protobuf.FieldOptions.JSType);

            /** FieldOptions lazy. */
            public lazy: boolean;

            /** FieldOptions unverifiedLazy. */
            public unverifiedLazy: boolean;

            /** FieldOptions deprecated. */
            public deprecated: boolean;

            /** FieldOptions weak. */
            public weak: boolean;

            /** FieldOptions debugRedact. */
            public debugRedact: boolean;

            /** FieldOptions retention. */
            public retention: (google.protobuf.FieldOptions.OptionRetention|keyof typeof google.protobuf.FieldOptions.OptionRetention);

            /** FieldOptions targets. */
            public targets: google.protobuf.FieldOptions.OptionTargetType[];

            /** FieldOptions editionDefaults. */
            public editionDefaults: google.protobuf.FieldOptions.IEditionDefault[];

            /** FieldOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** FieldOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new FieldOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FieldOptions instance
             */
            public static create(properties?: google.protobuf.IFieldOptions): google.protobuf.FieldOptions;

            /**
             * Encodes the specified FieldOptions message. Does not implicitly {@link google.protobuf.FieldOptions.verify|verify} messages.
             * @param message FieldOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFieldOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FieldOptions message, length delimited. Does not implicitly {@link google.protobuf.FieldOptions.verify|verify} messages.
             * @param message FieldOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFieldOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FieldOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FieldOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FieldOptions;

            /**
             * Decodes a FieldOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FieldOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FieldOptions;

            /**
             * Verifies a FieldOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FieldOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FieldOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FieldOptions;

            /**
             * Creates a plain object from a FieldOptions message. Also converts values to other types if specified.
             * @param message FieldOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FieldOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FieldOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FieldOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace FieldOptions {

            /** CType enum. */
            enum CType {
                STRING = 0,
                CORD = 1,
                STRING_PIECE = 2
            }

            /** JSType enum. */
            enum JSType {
                JS_NORMAL = 0,
                JS_STRING = 1,
                JS_NUMBER = 2
            }

            /** OptionRetention enum. */
            enum OptionRetention {
                RETENTION_UNKNOWN = 0,
                RETENTION_RUNTIME = 1,
                RETENTION_SOURCE = 2
            }

            /** OptionTargetType enum. */
            enum OptionTargetType {
                TARGET_TYPE_UNKNOWN = 0,
                TARGET_TYPE_FILE = 1,
                TARGET_TYPE_EXTENSION_RANGE = 2,
                TARGET_TYPE_MESSAGE = 3,
                TARGET_TYPE_FIELD = 4,
                TARGET_TYPE_ONEOF = 5,
                TARGET_TYPE_ENUM = 6,
                TARGET_TYPE_ENUM_ENTRY = 7,
                TARGET_TYPE_SERVICE = 8,
                TARGET_TYPE_METHOD = 9
            }

            /** Properties of an EditionDefault. */
            interface IEditionDefault {

                /** EditionDefault edition */
                edition?: (google.protobuf.Edition|keyof typeof google.protobuf.Edition|null);

                /** EditionDefault value */
                value?: (string|null);
            }

            /** Represents an EditionDefault. */
            class EditionDefault implements IEditionDefault {

                /**
                 * Constructs a new EditionDefault.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.FieldOptions.IEditionDefault);

                /** EditionDefault edition. */
                public edition: (google.protobuf.Edition|keyof typeof google.protobuf.Edition);

                /** EditionDefault value. */
                public value: string;

                /**
                 * Creates a new EditionDefault instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns EditionDefault instance
                 */
                public static create(properties?: google.protobuf.FieldOptions.IEditionDefault): google.protobuf.FieldOptions.EditionDefault;

                /**
                 * Encodes the specified EditionDefault message. Does not implicitly {@link google.protobuf.FieldOptions.EditionDefault.verify|verify} messages.
                 * @param message EditionDefault message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.FieldOptions.IEditionDefault, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified EditionDefault message, length delimited. Does not implicitly {@link google.protobuf.FieldOptions.EditionDefault.verify|verify} messages.
                 * @param message EditionDefault message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.FieldOptions.IEditionDefault, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an EditionDefault message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns EditionDefault
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FieldOptions.EditionDefault;

                /**
                 * Decodes an EditionDefault message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns EditionDefault
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FieldOptions.EditionDefault;

                /**
                 * Verifies an EditionDefault message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an EditionDefault message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns EditionDefault
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.FieldOptions.EditionDefault;

                /**
                 * Creates a plain object from an EditionDefault message. Also converts values to other types if specified.
                 * @param message EditionDefault
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.FieldOptions.EditionDefault, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this EditionDefault to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for EditionDefault
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of an OneofOptions. */
        interface IOneofOptions {

            /** OneofOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** OneofOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);
        }

        /** Represents an OneofOptions. */
        class OneofOptions implements IOneofOptions {

            /**
             * Constructs a new OneofOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IOneofOptions);

            /** OneofOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** OneofOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new OneofOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns OneofOptions instance
             */
            public static create(properties?: google.protobuf.IOneofOptions): google.protobuf.OneofOptions;

            /**
             * Encodes the specified OneofOptions message. Does not implicitly {@link google.protobuf.OneofOptions.verify|verify} messages.
             * @param message OneofOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IOneofOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified OneofOptions message, length delimited. Does not implicitly {@link google.protobuf.OneofOptions.verify|verify} messages.
             * @param message OneofOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IOneofOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an OneofOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns OneofOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.OneofOptions;

            /**
             * Decodes an OneofOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns OneofOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.OneofOptions;

            /**
             * Verifies an OneofOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an OneofOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns OneofOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.OneofOptions;

            /**
             * Creates a plain object from an OneofOptions message. Also converts values to other types if specified.
             * @param message OneofOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.OneofOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this OneofOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for OneofOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an EnumOptions. */
        interface IEnumOptions {

            /** EnumOptions allowAlias */
            allowAlias?: (boolean|null);

            /** EnumOptions deprecated */
            deprecated?: (boolean|null);

            /** EnumOptions deprecatedLegacyJsonFieldConflicts */
            deprecatedLegacyJsonFieldConflicts?: (boolean|null);

            /** EnumOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** EnumOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);
        }

        /** Represents an EnumOptions. */
        class EnumOptions implements IEnumOptions {

            /**
             * Constructs a new EnumOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IEnumOptions);

            /** EnumOptions allowAlias. */
            public allowAlias: boolean;

            /** EnumOptions deprecated. */
            public deprecated: boolean;

            /** EnumOptions deprecatedLegacyJsonFieldConflicts. */
            public deprecatedLegacyJsonFieldConflicts: boolean;

            /** EnumOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** EnumOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new EnumOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnumOptions instance
             */
            public static create(properties?: google.protobuf.IEnumOptions): google.protobuf.EnumOptions;

            /**
             * Encodes the specified EnumOptions message. Does not implicitly {@link google.protobuf.EnumOptions.verify|verify} messages.
             * @param message EnumOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IEnumOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnumOptions message, length delimited. Does not implicitly {@link google.protobuf.EnumOptions.verify|verify} messages.
             * @param message EnumOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IEnumOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnumOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnumOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.EnumOptions;

            /**
             * Decodes an EnumOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnumOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.EnumOptions;

            /**
             * Verifies an EnumOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnumOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnumOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.EnumOptions;

            /**
             * Creates a plain object from an EnumOptions message. Also converts values to other types if specified.
             * @param message EnumOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.EnumOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnumOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnumOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an EnumValueOptions. */
        interface IEnumValueOptions {

            /** EnumValueOptions deprecated */
            deprecated?: (boolean|null);

            /** EnumValueOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** EnumValueOptions debugRedact */
            debugRedact?: (boolean|null);

            /** EnumValueOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);
        }

        /** Represents an EnumValueOptions. */
        class EnumValueOptions implements IEnumValueOptions {

            /**
             * Constructs a new EnumValueOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IEnumValueOptions);

            /** EnumValueOptions deprecated. */
            public deprecated: boolean;

            /** EnumValueOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** EnumValueOptions debugRedact. */
            public debugRedact: boolean;

            /** EnumValueOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new EnumValueOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnumValueOptions instance
             */
            public static create(properties?: google.protobuf.IEnumValueOptions): google.protobuf.EnumValueOptions;

            /**
             * Encodes the specified EnumValueOptions message. Does not implicitly {@link google.protobuf.EnumValueOptions.verify|verify} messages.
             * @param message EnumValueOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IEnumValueOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnumValueOptions message, length delimited. Does not implicitly {@link google.protobuf.EnumValueOptions.verify|verify} messages.
             * @param message EnumValueOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IEnumValueOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnumValueOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnumValueOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.EnumValueOptions;

            /**
             * Decodes an EnumValueOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnumValueOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.EnumValueOptions;

            /**
             * Verifies an EnumValueOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnumValueOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnumValueOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.EnumValueOptions;

            /**
             * Creates a plain object from an EnumValueOptions message. Also converts values to other types if specified.
             * @param message EnumValueOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.EnumValueOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnumValueOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnumValueOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ServiceOptions. */
        interface IServiceOptions {

            /** ServiceOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** ServiceOptions deprecated */
            deprecated?: (boolean|null);

            /** ServiceOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);

            /** ServiceOptions .google.api.defaultHost */
            ".google.api.defaultHost"?: (string|null);

            /** ServiceOptions .google.api.oauthScopes */
            ".google.api.oauthScopes"?: (string|null);
        }

        /** Represents a ServiceOptions. */
        class ServiceOptions implements IServiceOptions {

            /**
             * Constructs a new ServiceOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IServiceOptions);

            /** ServiceOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** ServiceOptions deprecated. */
            public deprecated: boolean;

            /** ServiceOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new ServiceOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ServiceOptions instance
             */
            public static create(properties?: google.protobuf.IServiceOptions): google.protobuf.ServiceOptions;

            /**
             * Encodes the specified ServiceOptions message. Does not implicitly {@link google.protobuf.ServiceOptions.verify|verify} messages.
             * @param message ServiceOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IServiceOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ServiceOptions message, length delimited. Does not implicitly {@link google.protobuf.ServiceOptions.verify|verify} messages.
             * @param message ServiceOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IServiceOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ServiceOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ServiceOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.ServiceOptions;

            /**
             * Decodes a ServiceOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ServiceOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.ServiceOptions;

            /**
             * Verifies a ServiceOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ServiceOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ServiceOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.ServiceOptions;

            /**
             * Creates a plain object from a ServiceOptions message. Also converts values to other types if specified.
             * @param message ServiceOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.ServiceOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ServiceOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ServiceOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a MethodOptions. */
        interface IMethodOptions {

            /** MethodOptions deprecated */
            deprecated?: (boolean|null);

            /** MethodOptions idempotencyLevel */
            idempotencyLevel?: (google.protobuf.MethodOptions.IdempotencyLevel|keyof typeof google.protobuf.MethodOptions.IdempotencyLevel|null);

            /** MethodOptions features */
            features?: (google.protobuf.IFeatureSet|null);

            /** MethodOptions uninterpretedOption */
            uninterpretedOption?: (google.protobuf.IUninterpretedOption[]|null);

            /** MethodOptions .google.api.http */
            ".google.api.http"?: (google.api.IHttpRule|null);

            /** MethodOptions .google.api.methodSignature */
            ".google.api.methodSignature"?: (string[]|null);
        }

        /** Represents a MethodOptions. */
        class MethodOptions implements IMethodOptions {

            /**
             * Constructs a new MethodOptions.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IMethodOptions);

            /** MethodOptions deprecated. */
            public deprecated: boolean;

            /** MethodOptions idempotencyLevel. */
            public idempotencyLevel: (google.protobuf.MethodOptions.IdempotencyLevel|keyof typeof google.protobuf.MethodOptions.IdempotencyLevel);

            /** MethodOptions features. */
            public features?: (google.protobuf.IFeatureSet|null);

            /** MethodOptions uninterpretedOption. */
            public uninterpretedOption: google.protobuf.IUninterpretedOption[];

            /**
             * Creates a new MethodOptions instance using the specified properties.
             * @param [properties] Properties to set
             * @returns MethodOptions instance
             */
            public static create(properties?: google.protobuf.IMethodOptions): google.protobuf.MethodOptions;

            /**
             * Encodes the specified MethodOptions message. Does not implicitly {@link google.protobuf.MethodOptions.verify|verify} messages.
             * @param message MethodOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IMethodOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified MethodOptions message, length delimited. Does not implicitly {@link google.protobuf.MethodOptions.verify|verify} messages.
             * @param message MethodOptions message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IMethodOptions, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a MethodOptions message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MethodOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.MethodOptions;

            /**
             * Decodes a MethodOptions message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns MethodOptions
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.MethodOptions;

            /**
             * Verifies a MethodOptions message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a MethodOptions message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns MethodOptions
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.MethodOptions;

            /**
             * Creates a plain object from a MethodOptions message. Also converts values to other types if specified.
             * @param message MethodOptions
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.MethodOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this MethodOptions to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for MethodOptions
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace MethodOptions {

            /** IdempotencyLevel enum. */
            enum IdempotencyLevel {
                IDEMPOTENCY_UNKNOWN = 0,
                NO_SIDE_EFFECTS = 1,
                IDEMPOTENT = 2
            }
        }

        /** Properties of an UninterpretedOption. */
        interface IUninterpretedOption {

            /** UninterpretedOption name */
            name?: (google.protobuf.UninterpretedOption.INamePart[]|null);

            /** UninterpretedOption identifierValue */
            identifierValue?: (string|null);

            /** UninterpretedOption positiveIntValue */
            positiveIntValue?: (number|Long|string|null);

            /** UninterpretedOption negativeIntValue */
            negativeIntValue?: (number|Long|string|null);

            /** UninterpretedOption doubleValue */
            doubleValue?: (number|null);

            /** UninterpretedOption stringValue */
            stringValue?: (Uint8Array|string|null);

            /** UninterpretedOption aggregateValue */
            aggregateValue?: (string|null);
        }

        /** Represents an UninterpretedOption. */
        class UninterpretedOption implements IUninterpretedOption {

            /**
             * Constructs a new UninterpretedOption.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IUninterpretedOption);

            /** UninterpretedOption name. */
            public name: google.protobuf.UninterpretedOption.INamePart[];

            /** UninterpretedOption identifierValue. */
            public identifierValue: string;

            /** UninterpretedOption positiveIntValue. */
            public positiveIntValue: (number|Long|string);

            /** UninterpretedOption negativeIntValue. */
            public negativeIntValue: (number|Long|string);

            /** UninterpretedOption doubleValue. */
            public doubleValue: number;

            /** UninterpretedOption stringValue. */
            public stringValue: (Uint8Array|string);

            /** UninterpretedOption aggregateValue. */
            public aggregateValue: string;

            /**
             * Creates a new UninterpretedOption instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UninterpretedOption instance
             */
            public static create(properties?: google.protobuf.IUninterpretedOption): google.protobuf.UninterpretedOption;

            /**
             * Encodes the specified UninterpretedOption message. Does not implicitly {@link google.protobuf.UninterpretedOption.verify|verify} messages.
             * @param message UninterpretedOption message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IUninterpretedOption, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UninterpretedOption message, length delimited. Does not implicitly {@link google.protobuf.UninterpretedOption.verify|verify} messages.
             * @param message UninterpretedOption message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IUninterpretedOption, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UninterpretedOption message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns UninterpretedOption
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.UninterpretedOption;

            /**
             * Decodes an UninterpretedOption message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UninterpretedOption
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.UninterpretedOption;

            /**
             * Verifies an UninterpretedOption message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an UninterpretedOption message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns UninterpretedOption
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.UninterpretedOption;

            /**
             * Creates a plain object from an UninterpretedOption message. Also converts values to other types if specified.
             * @param message UninterpretedOption
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.UninterpretedOption, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this UninterpretedOption to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for UninterpretedOption
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace UninterpretedOption {

            /** Properties of a NamePart. */
            interface INamePart {

                /** NamePart namePart */
                namePart: string;

                /** NamePart isExtension */
                isExtension: boolean;
            }

            /** Represents a NamePart. */
            class NamePart implements INamePart {

                /**
                 * Constructs a new NamePart.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.UninterpretedOption.INamePart);

                /** NamePart namePart. */
                public namePart: string;

                /** NamePart isExtension. */
                public isExtension: boolean;

                /**
                 * Creates a new NamePart instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns NamePart instance
                 */
                public static create(properties?: google.protobuf.UninterpretedOption.INamePart): google.protobuf.UninterpretedOption.NamePart;

                /**
                 * Encodes the specified NamePart message. Does not implicitly {@link google.protobuf.UninterpretedOption.NamePart.verify|verify} messages.
                 * @param message NamePart message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.UninterpretedOption.INamePart, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified NamePart message, length delimited. Does not implicitly {@link google.protobuf.UninterpretedOption.NamePart.verify|verify} messages.
                 * @param message NamePart message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.UninterpretedOption.INamePart, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a NamePart message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns NamePart
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.UninterpretedOption.NamePart;

                /**
                 * Decodes a NamePart message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns NamePart
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.UninterpretedOption.NamePart;

                /**
                 * Verifies a NamePart message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a NamePart message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns NamePart
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.UninterpretedOption.NamePart;

                /**
                 * Creates a plain object from a NamePart message. Also converts values to other types if specified.
                 * @param message NamePart
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.UninterpretedOption.NamePart, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this NamePart to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for NamePart
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of a FeatureSet. */
        interface IFeatureSet {

            /** FeatureSet fieldPresence */
            fieldPresence?: (google.protobuf.FeatureSet.FieldPresence|keyof typeof google.protobuf.FeatureSet.FieldPresence|null);

            /** FeatureSet enumType */
            enumType?: (google.protobuf.FeatureSet.EnumType|keyof typeof google.protobuf.FeatureSet.EnumType|null);

            /** FeatureSet repeatedFieldEncoding */
            repeatedFieldEncoding?: (google.protobuf.FeatureSet.RepeatedFieldEncoding|keyof typeof google.protobuf.FeatureSet.RepeatedFieldEncoding|null);

            /** FeatureSet utf8Validation */
            utf8Validation?: (google.protobuf.FeatureSet.Utf8Validation|keyof typeof google.protobuf.FeatureSet.Utf8Validation|null);

            /** FeatureSet messageEncoding */
            messageEncoding?: (google.protobuf.FeatureSet.MessageEncoding|keyof typeof google.protobuf.FeatureSet.MessageEncoding|null);

            /** FeatureSet jsonFormat */
            jsonFormat?: (google.protobuf.FeatureSet.JsonFormat|keyof typeof google.protobuf.FeatureSet.JsonFormat|null);
        }

        /** Represents a FeatureSet. */
        class FeatureSet implements IFeatureSet {

            /**
             * Constructs a new FeatureSet.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFeatureSet);

            /** FeatureSet fieldPresence. */
            public fieldPresence: (google.protobuf.FeatureSet.FieldPresence|keyof typeof google.protobuf.FeatureSet.FieldPresence);

            /** FeatureSet enumType. */
            public enumType: (google.protobuf.FeatureSet.EnumType|keyof typeof google.protobuf.FeatureSet.EnumType);

            /** FeatureSet repeatedFieldEncoding. */
            public repeatedFieldEncoding: (google.protobuf.FeatureSet.RepeatedFieldEncoding|keyof typeof google.protobuf.FeatureSet.RepeatedFieldEncoding);

            /** FeatureSet utf8Validation. */
            public utf8Validation: (google.protobuf.FeatureSet.Utf8Validation|keyof typeof google.protobuf.FeatureSet.Utf8Validation);

            /** FeatureSet messageEncoding. */
            public messageEncoding: (google.protobuf.FeatureSet.MessageEncoding|keyof typeof google.protobuf.FeatureSet.MessageEncoding);

            /** FeatureSet jsonFormat. */
            public jsonFormat: (google.protobuf.FeatureSet.JsonFormat|keyof typeof google.protobuf.FeatureSet.JsonFormat);

            /**
             * Creates a new FeatureSet instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FeatureSet instance
             */
            public static create(properties?: google.protobuf.IFeatureSet): google.protobuf.FeatureSet;

            /**
             * Encodes the specified FeatureSet message. Does not implicitly {@link google.protobuf.FeatureSet.verify|verify} messages.
             * @param message FeatureSet message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFeatureSet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FeatureSet message, length delimited. Does not implicitly {@link google.protobuf.FeatureSet.verify|verify} messages.
             * @param message FeatureSet message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFeatureSet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FeatureSet message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FeatureSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FeatureSet;

            /**
             * Decodes a FeatureSet message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FeatureSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FeatureSet;

            /**
             * Verifies a FeatureSet message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FeatureSet message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FeatureSet
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FeatureSet;

            /**
             * Creates a plain object from a FeatureSet message. Also converts values to other types if specified.
             * @param message FeatureSet
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FeatureSet, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FeatureSet to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FeatureSet
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace FeatureSet {

            /** FieldPresence enum. */
            enum FieldPresence {
                FIELD_PRESENCE_UNKNOWN = 0,
                EXPLICIT = 1,
                IMPLICIT = 2,
                LEGACY_REQUIRED = 3
            }

            /** EnumType enum. */
            enum EnumType {
                ENUM_TYPE_UNKNOWN = 0,
                OPEN = 1,
                CLOSED = 2
            }

            /** RepeatedFieldEncoding enum. */
            enum RepeatedFieldEncoding {
                REPEATED_FIELD_ENCODING_UNKNOWN = 0,
                PACKED = 1,
                EXPANDED = 2
            }

            /** Utf8Validation enum. */
            enum Utf8Validation {
                UTF8_VALIDATION_UNKNOWN = 0,
                VERIFY = 2,
                NONE = 3
            }

            /** MessageEncoding enum. */
            enum MessageEncoding {
                MESSAGE_ENCODING_UNKNOWN = 0,
                LENGTH_PREFIXED = 1,
                DELIMITED = 2
            }

            /** JsonFormat enum. */
            enum JsonFormat {
                JSON_FORMAT_UNKNOWN = 0,
                ALLOW = 1,
                LEGACY_BEST_EFFORT = 2
            }
        }

        /** Properties of a FeatureSetDefaults. */
        interface IFeatureSetDefaults {

            /** FeatureSetDefaults defaults */
            defaults?: (google.protobuf.FeatureSetDefaults.IFeatureSetEditionDefault[]|null);

            /** FeatureSetDefaults minimumEdition */
            minimumEdition?: (google.protobuf.Edition|keyof typeof google.protobuf.Edition|null);

            /** FeatureSetDefaults maximumEdition */
            maximumEdition?: (google.protobuf.Edition|keyof typeof google.protobuf.Edition|null);
        }

        /** Represents a FeatureSetDefaults. */
        class FeatureSetDefaults implements IFeatureSetDefaults {

            /**
             * Constructs a new FeatureSetDefaults.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFeatureSetDefaults);

            /** FeatureSetDefaults defaults. */
            public defaults: google.protobuf.FeatureSetDefaults.IFeatureSetEditionDefault[];

            /** FeatureSetDefaults minimumEdition. */
            public minimumEdition: (google.protobuf.Edition|keyof typeof google.protobuf.Edition);

            /** FeatureSetDefaults maximumEdition. */
            public maximumEdition: (google.protobuf.Edition|keyof typeof google.protobuf.Edition);

            /**
             * Creates a new FeatureSetDefaults instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FeatureSetDefaults instance
             */
            public static create(properties?: google.protobuf.IFeatureSetDefaults): google.protobuf.FeatureSetDefaults;

            /**
             * Encodes the specified FeatureSetDefaults message. Does not implicitly {@link google.protobuf.FeatureSetDefaults.verify|verify} messages.
             * @param message FeatureSetDefaults message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFeatureSetDefaults, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FeatureSetDefaults message, length delimited. Does not implicitly {@link google.protobuf.FeatureSetDefaults.verify|verify} messages.
             * @param message FeatureSetDefaults message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFeatureSetDefaults, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FeatureSetDefaults message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FeatureSetDefaults
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FeatureSetDefaults;

            /**
             * Decodes a FeatureSetDefaults message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FeatureSetDefaults
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FeatureSetDefaults;

            /**
             * Verifies a FeatureSetDefaults message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FeatureSetDefaults message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FeatureSetDefaults
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FeatureSetDefaults;

            /**
             * Creates a plain object from a FeatureSetDefaults message. Also converts values to other types if specified.
             * @param message FeatureSetDefaults
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FeatureSetDefaults, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FeatureSetDefaults to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FeatureSetDefaults
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace FeatureSetDefaults {

            /** Properties of a FeatureSetEditionDefault. */
            interface IFeatureSetEditionDefault {

                /** FeatureSetEditionDefault edition */
                edition?: (google.protobuf.Edition|keyof typeof google.protobuf.Edition|null);

                /** FeatureSetEditionDefault features */
                features?: (google.protobuf.IFeatureSet|null);
            }

            /** Represents a FeatureSetEditionDefault. */
            class FeatureSetEditionDefault implements IFeatureSetEditionDefault {

                /**
                 * Constructs a new FeatureSetEditionDefault.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.FeatureSetDefaults.IFeatureSetEditionDefault);

                /** FeatureSetEditionDefault edition. */
                public edition: (google.protobuf.Edition|keyof typeof google.protobuf.Edition);

                /** FeatureSetEditionDefault features. */
                public features?: (google.protobuf.IFeatureSet|null);

                /**
                 * Creates a new FeatureSetEditionDefault instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns FeatureSetEditionDefault instance
                 */
                public static create(properties?: google.protobuf.FeatureSetDefaults.IFeatureSetEditionDefault): google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault;

                /**
                 * Encodes the specified FeatureSetEditionDefault message. Does not implicitly {@link google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault.verify|verify} messages.
                 * @param message FeatureSetEditionDefault message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.FeatureSetDefaults.IFeatureSetEditionDefault, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified FeatureSetEditionDefault message, length delimited. Does not implicitly {@link google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault.verify|verify} messages.
                 * @param message FeatureSetEditionDefault message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.FeatureSetDefaults.IFeatureSetEditionDefault, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a FeatureSetEditionDefault message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns FeatureSetEditionDefault
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault;

                /**
                 * Decodes a FeatureSetEditionDefault message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns FeatureSetEditionDefault
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault;

                /**
                 * Verifies a FeatureSetEditionDefault message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a FeatureSetEditionDefault message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns FeatureSetEditionDefault
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault;

                /**
                 * Creates a plain object from a FeatureSetEditionDefault message. Also converts values to other types if specified.
                 * @param message FeatureSetEditionDefault
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this FeatureSetEditionDefault to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for FeatureSetEditionDefault
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of a SourceCodeInfo. */
        interface ISourceCodeInfo {

            /** SourceCodeInfo location */
            location?: (google.protobuf.SourceCodeInfo.ILocation[]|null);
        }

        /** Represents a SourceCodeInfo. */
        class SourceCodeInfo implements ISourceCodeInfo {

            /**
             * Constructs a new SourceCodeInfo.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.ISourceCodeInfo);

            /** SourceCodeInfo location. */
            public location: google.protobuf.SourceCodeInfo.ILocation[];

            /**
             * Creates a new SourceCodeInfo instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SourceCodeInfo instance
             */
            public static create(properties?: google.protobuf.ISourceCodeInfo): google.protobuf.SourceCodeInfo;

            /**
             * Encodes the specified SourceCodeInfo message. Does not implicitly {@link google.protobuf.SourceCodeInfo.verify|verify} messages.
             * @param message SourceCodeInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.ISourceCodeInfo, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SourceCodeInfo message, length delimited. Does not implicitly {@link google.protobuf.SourceCodeInfo.verify|verify} messages.
             * @param message SourceCodeInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.ISourceCodeInfo, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SourceCodeInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SourceCodeInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.SourceCodeInfo;

            /**
             * Decodes a SourceCodeInfo message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SourceCodeInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.SourceCodeInfo;

            /**
             * Verifies a SourceCodeInfo message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SourceCodeInfo message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SourceCodeInfo
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.SourceCodeInfo;

            /**
             * Creates a plain object from a SourceCodeInfo message. Also converts values to other types if specified.
             * @param message SourceCodeInfo
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.SourceCodeInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SourceCodeInfo to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SourceCodeInfo
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace SourceCodeInfo {

            /** Properties of a Location. */
            interface ILocation {

                /** Location path */
                path?: (number[]|null);

                /** Location span */
                span?: (number[]|null);

                /** Location leadingComments */
                leadingComments?: (string|null);

                /** Location trailingComments */
                trailingComments?: (string|null);

                /** Location leadingDetachedComments */
                leadingDetachedComments?: (string[]|null);
            }

            /** Represents a Location. */
            class Location implements ILocation {

                /**
                 * Constructs a new Location.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.SourceCodeInfo.ILocation);

                /** Location path. */
                public path: number[];

                /** Location span. */
                public span: number[];

                /** Location leadingComments. */
                public leadingComments: string;

                /** Location trailingComments. */
                public trailingComments: string;

                /** Location leadingDetachedComments. */
                public leadingDetachedComments: string[];

                /**
                 * Creates a new Location instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Location instance
                 */
                public static create(properties?: google.protobuf.SourceCodeInfo.ILocation): google.protobuf.SourceCodeInfo.Location;

                /**
                 * Encodes the specified Location message. Does not implicitly {@link google.protobuf.SourceCodeInfo.Location.verify|verify} messages.
                 * @param message Location message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.SourceCodeInfo.ILocation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Location message, length delimited. Does not implicitly {@link google.protobuf.SourceCodeInfo.Location.verify|verify} messages.
                 * @param message Location message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.SourceCodeInfo.ILocation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Location message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Location
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.SourceCodeInfo.Location;

                /**
                 * Decodes a Location message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Location
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.SourceCodeInfo.Location;

                /**
                 * Verifies a Location message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Location message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Location
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.SourceCodeInfo.Location;

                /**
                 * Creates a plain object from a Location message. Also converts values to other types if specified.
                 * @param message Location
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.SourceCodeInfo.Location, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Location to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Location
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }

        /** Properties of a GeneratedCodeInfo. */
        interface IGeneratedCodeInfo {

            /** GeneratedCodeInfo annotation */
            annotation?: (google.protobuf.GeneratedCodeInfo.IAnnotation[]|null);
        }

        /** Represents a GeneratedCodeInfo. */
        class GeneratedCodeInfo implements IGeneratedCodeInfo {

            /**
             * Constructs a new GeneratedCodeInfo.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IGeneratedCodeInfo);

            /** GeneratedCodeInfo annotation. */
            public annotation: google.protobuf.GeneratedCodeInfo.IAnnotation[];

            /**
             * Creates a new GeneratedCodeInfo instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GeneratedCodeInfo instance
             */
            public static create(properties?: google.protobuf.IGeneratedCodeInfo): google.protobuf.GeneratedCodeInfo;

            /**
             * Encodes the specified GeneratedCodeInfo message. Does not implicitly {@link google.protobuf.GeneratedCodeInfo.verify|verify} messages.
             * @param message GeneratedCodeInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IGeneratedCodeInfo, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GeneratedCodeInfo message, length delimited. Does not implicitly {@link google.protobuf.GeneratedCodeInfo.verify|verify} messages.
             * @param message GeneratedCodeInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IGeneratedCodeInfo, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GeneratedCodeInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GeneratedCodeInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.GeneratedCodeInfo;

            /**
             * Decodes a GeneratedCodeInfo message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GeneratedCodeInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.GeneratedCodeInfo;

            /**
             * Verifies a GeneratedCodeInfo message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GeneratedCodeInfo message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GeneratedCodeInfo
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.GeneratedCodeInfo;

            /**
             * Creates a plain object from a GeneratedCodeInfo message. Also converts values to other types if specified.
             * @param message GeneratedCodeInfo
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.GeneratedCodeInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GeneratedCodeInfo to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GeneratedCodeInfo
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace GeneratedCodeInfo {

            /** Properties of an Annotation. */
            interface IAnnotation {

                /** Annotation path */
                path?: (number[]|null);

                /** Annotation sourceFile */
                sourceFile?: (string|null);

                /** Annotation begin */
                begin?: (number|null);

                /** Annotation end */
                end?: (number|null);

                /** Annotation semantic */
                semantic?: (google.protobuf.GeneratedCodeInfo.Annotation.Semantic|keyof typeof google.protobuf.GeneratedCodeInfo.Annotation.Semantic|null);
            }

            /** Represents an Annotation. */
            class Annotation implements IAnnotation {

                /**
                 * Constructs a new Annotation.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.protobuf.GeneratedCodeInfo.IAnnotation);

                /** Annotation path. */
                public path: number[];

                /** Annotation sourceFile. */
                public sourceFile: string;

                /** Annotation begin. */
                public begin: number;

                /** Annotation end. */
                public end: number;

                /** Annotation semantic. */
                public semantic: (google.protobuf.GeneratedCodeInfo.Annotation.Semantic|keyof typeof google.protobuf.GeneratedCodeInfo.Annotation.Semantic);

                /**
                 * Creates a new Annotation instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Annotation instance
                 */
                public static create(properties?: google.protobuf.GeneratedCodeInfo.IAnnotation): google.protobuf.GeneratedCodeInfo.Annotation;

                /**
                 * Encodes the specified Annotation message. Does not implicitly {@link google.protobuf.GeneratedCodeInfo.Annotation.verify|verify} messages.
                 * @param message Annotation message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.protobuf.GeneratedCodeInfo.IAnnotation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Annotation message, length delimited. Does not implicitly {@link google.protobuf.GeneratedCodeInfo.Annotation.verify|verify} messages.
                 * @param message Annotation message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.protobuf.GeneratedCodeInfo.IAnnotation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an Annotation message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Annotation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.GeneratedCodeInfo.Annotation;

                /**
                 * Decodes an Annotation message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Annotation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.GeneratedCodeInfo.Annotation;

                /**
                 * Verifies an Annotation message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an Annotation message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Annotation
                 */
                public static fromObject(object: { [k: string]: any }): google.protobuf.GeneratedCodeInfo.Annotation;

                /**
                 * Creates a plain object from an Annotation message. Also converts values to other types if specified.
                 * @param message Annotation
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.protobuf.GeneratedCodeInfo.Annotation, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Annotation to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Annotation
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace Annotation {

                /** Semantic enum. */
                enum Semantic {
                    NONE = 0,
                    SET = 1,
                    ALIAS = 2
                }
            }
        }

        /** Properties of a Duration. */
        interface IDuration {

            /** Duration seconds */
            seconds?: (number|Long|string|null);

            /** Duration nanos */
            nanos?: (number|null);
        }

        /** Represents a Duration. */
        class Duration implements IDuration {

            /**
             * Constructs a new Duration.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IDuration);

            /** Duration seconds. */
            public seconds: (number|Long|string);

            /** Duration nanos. */
            public nanos: number;

            /**
             * Creates a new Duration instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Duration instance
             */
            public static create(properties?: google.protobuf.IDuration): google.protobuf.Duration;

            /**
             * Encodes the specified Duration message. Does not implicitly {@link google.protobuf.Duration.verify|verify} messages.
             * @param message Duration message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IDuration, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Duration message, length delimited. Does not implicitly {@link google.protobuf.Duration.verify|verify} messages.
             * @param message Duration message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IDuration, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Duration message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Duration
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Duration;

            /**
             * Decodes a Duration message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Duration
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Duration;

            /**
             * Verifies a Duration message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Duration message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Duration
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Duration;

            /**
             * Creates a plain object from a Duration message. Also converts values to other types if specified.
             * @param message Duration
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Duration, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Duration to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Duration
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Timestamp. */
        interface ITimestamp {

            /** Timestamp seconds */
            seconds?: (number|Long|string|null);

            /** Timestamp nanos */
            nanos?: (number|null);
        }

        /** Represents a Timestamp. */
        class Timestamp implements ITimestamp {

            /**
             * Constructs a new Timestamp.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.ITimestamp);

            /** Timestamp seconds. */
            public seconds: (number|Long|string);

            /** Timestamp nanos. */
            public nanos: number;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Timestamp instance
             */
            public static create(properties?: google.protobuf.ITimestamp): google.protobuf.Timestamp;

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Timestamp;

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Timestamp;

            /**
             * Verifies a Timestamp message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Timestamp
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Timestamp;

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @param message Timestamp
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Timestamp, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Timestamp to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Timestamp
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a FieldMask. */
        interface IFieldMask {

            /** FieldMask paths */
            paths?: (string[]|null);
        }

        /** Represents a FieldMask. */
        class FieldMask implements IFieldMask {

            /**
             * Constructs a new FieldMask.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IFieldMask);

            /** FieldMask paths. */
            public paths: string[];

            /**
             * Creates a new FieldMask instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FieldMask instance
             */
            public static create(properties?: google.protobuf.IFieldMask): google.protobuf.FieldMask;

            /**
             * Encodes the specified FieldMask message. Does not implicitly {@link google.protobuf.FieldMask.verify|verify} messages.
             * @param message FieldMask message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IFieldMask, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FieldMask message, length delimited. Does not implicitly {@link google.protobuf.FieldMask.verify|verify} messages.
             * @param message FieldMask message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IFieldMask, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FieldMask message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns FieldMask
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.FieldMask;

            /**
             * Decodes a FieldMask message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FieldMask
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.FieldMask;

            /**
             * Verifies a FieldMask message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a FieldMask message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns FieldMask
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.FieldMask;

            /**
             * Creates a plain object from a FieldMask message. Also converts values to other types if specified.
             * @param message FieldMask
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.FieldMask, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this FieldMask to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for FieldMask
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an Empty. */
        interface IEmpty {
        }

        /** Represents an Empty. */
        class Empty implements IEmpty {

            /**
             * Constructs a new Empty.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IEmpty);

            /**
             * Creates a new Empty instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Empty instance
             */
            public static create(properties?: google.protobuf.IEmpty): google.protobuf.Empty;

            /**
             * Encodes the specified Empty message. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
             * @param message Empty message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IEmpty, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Empty message, length delimited. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
             * @param message Empty message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IEmpty, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Empty message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Empty
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Empty;

            /**
             * Decodes an Empty message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Empty
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Empty;

            /**
             * Verifies an Empty message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Empty message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Empty
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Empty;

            /**
             * Creates a plain object from an Empty message. Also converts values to other types if specified.
             * @param message Empty
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Empty, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Empty to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Empty
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Namespace iam. */
    namespace iam {

        /** Namespace v1. */
        namespace v1 {

            /** Represents a IAMPolicy */
            class IAMPolicy extends $protobuf.rpc.Service {

                /**
                 * Constructs a new IAMPolicy service.
                 * @param rpcImpl RPC implementation
                 * @param [requestDelimited=false] Whether requests are length-delimited
                 * @param [responseDelimited=false] Whether responses are length-delimited
                 */
                constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

                /**
                 * Creates new IAMPolicy service using the specified rpc implementation.
                 * @param rpcImpl RPC implementation
                 * @param [requestDelimited=false] Whether requests are length-delimited
                 * @param [responseDelimited=false] Whether responses are length-delimited
                 * @returns RPC service. Useful where requests and/or responses are streamed.
                 */
                public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): IAMPolicy;

                /**
                 * Calls SetIamPolicy.
                 * @param request SetIamPolicyRequest message or plain object
                 * @param callback Node-style callback called with the error, if any, and Policy
                 */
                public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest, callback: google.iam.v1.IAMPolicy.SetIamPolicyCallback): void;

                /**
                 * Calls SetIamPolicy.
                 * @param request SetIamPolicyRequest message or plain object
                 * @returns Promise
                 */
                public setIamPolicy(request: google.iam.v1.ISetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                /**
                 * Calls GetIamPolicy.
                 * @param request GetIamPolicyRequest message or plain object
                 * @param callback Node-style callback called with the error, if any, and Policy
                 */
                public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest, callback: google.iam.v1.IAMPolicy.GetIamPolicyCallback): void;

                /**
                 * Calls GetIamPolicy.
                 * @param request GetIamPolicyRequest message or plain object
                 * @returns Promise
                 */
                public getIamPolicy(request: google.iam.v1.IGetIamPolicyRequest): Promise<google.iam.v1.Policy>;

                /**
                 * Calls TestIamPermissions.
                 * @param request TestIamPermissionsRequest message or plain object
                 * @param callback Node-style callback called with the error, if any, and TestIamPermissionsResponse
                 */
                public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest, callback: google.iam.v1.IAMPolicy.TestIamPermissionsCallback): void;

                /**
                 * Calls TestIamPermissions.
                 * @param request TestIamPermissionsRequest message or plain object
                 * @returns Promise
                 */
                public testIamPermissions(request: google.iam.v1.ITestIamPermissionsRequest): Promise<google.iam.v1.TestIamPermissionsResponse>;
            }

            namespace IAMPolicy {

                /**
                 * Callback as used by {@link google.iam.v1.IAMPolicy|setIamPolicy}.
                 * @param error Error, if any
                 * @param [response] Policy
                 */
                type SetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                /**
                 * Callback as used by {@link google.iam.v1.IAMPolicy|getIamPolicy}.
                 * @param error Error, if any
                 * @param [response] Policy
                 */
                type GetIamPolicyCallback = (error: (Error|null), response?: google.iam.v1.Policy) => void;

                /**
                 * Callback as used by {@link google.iam.v1.IAMPolicy|testIamPermissions}.
                 * @param error Error, if any
                 * @param [response] TestIamPermissionsResponse
                 */
                type TestIamPermissionsCallback = (error: (Error|null), response?: google.iam.v1.TestIamPermissionsResponse) => void;
            }

            /** Properties of a SetIamPolicyRequest. */
            interface ISetIamPolicyRequest {

                /** SetIamPolicyRequest resource */
                resource?: (string|null);

                /** SetIamPolicyRequest policy */
                policy?: (google.iam.v1.IPolicy|null);

                /** SetIamPolicyRequest updateMask */
                updateMask?: (google.protobuf.IFieldMask|null);
            }

            /** Represents a SetIamPolicyRequest. */
            class SetIamPolicyRequest implements ISetIamPolicyRequest {

                /**
                 * Constructs a new SetIamPolicyRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.ISetIamPolicyRequest);

                /** SetIamPolicyRequest resource. */
                public resource: string;

                /** SetIamPolicyRequest policy. */
                public policy?: (google.iam.v1.IPolicy|null);

                /** SetIamPolicyRequest updateMask. */
                public updateMask?: (google.protobuf.IFieldMask|null);

                /**
                 * Creates a new SetIamPolicyRequest instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SetIamPolicyRequest instance
                 */
                public static create(properties?: google.iam.v1.ISetIamPolicyRequest): google.iam.v1.SetIamPolicyRequest;

                /**
                 * Encodes the specified SetIamPolicyRequest message. Does not implicitly {@link google.iam.v1.SetIamPolicyRequest.verify|verify} messages.
                 * @param message SetIamPolicyRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.ISetIamPolicyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SetIamPolicyRequest message, length delimited. Does not implicitly {@link google.iam.v1.SetIamPolicyRequest.verify|verify} messages.
                 * @param message SetIamPolicyRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.ISetIamPolicyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SetIamPolicyRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SetIamPolicyRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.SetIamPolicyRequest;

                /**
                 * Decodes a SetIamPolicyRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SetIamPolicyRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.SetIamPolicyRequest;

                /**
                 * Verifies a SetIamPolicyRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SetIamPolicyRequest message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SetIamPolicyRequest
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.SetIamPolicyRequest;

                /**
                 * Creates a plain object from a SetIamPolicyRequest message. Also converts values to other types if specified.
                 * @param message SetIamPolicyRequest
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.SetIamPolicyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SetIamPolicyRequest to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for SetIamPolicyRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a GetIamPolicyRequest. */
            interface IGetIamPolicyRequest {

                /** GetIamPolicyRequest resource */
                resource?: (string|null);

                /** GetIamPolicyRequest options */
                options?: (google.iam.v1.IGetPolicyOptions|null);
            }

            /** Represents a GetIamPolicyRequest. */
            class GetIamPolicyRequest implements IGetIamPolicyRequest {

                /**
                 * Constructs a new GetIamPolicyRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IGetIamPolicyRequest);

                /** GetIamPolicyRequest resource. */
                public resource: string;

                /** GetIamPolicyRequest options. */
                public options?: (google.iam.v1.IGetPolicyOptions|null);

                /**
                 * Creates a new GetIamPolicyRequest instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns GetIamPolicyRequest instance
                 */
                public static create(properties?: google.iam.v1.IGetIamPolicyRequest): google.iam.v1.GetIamPolicyRequest;

                /**
                 * Encodes the specified GetIamPolicyRequest message. Does not implicitly {@link google.iam.v1.GetIamPolicyRequest.verify|verify} messages.
                 * @param message GetIamPolicyRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IGetIamPolicyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified GetIamPolicyRequest message, length delimited. Does not implicitly {@link google.iam.v1.GetIamPolicyRequest.verify|verify} messages.
                 * @param message GetIamPolicyRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IGetIamPolicyRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a GetIamPolicyRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GetIamPolicyRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.GetIamPolicyRequest;

                /**
                 * Decodes a GetIamPolicyRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns GetIamPolicyRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.GetIamPolicyRequest;

                /**
                 * Verifies a GetIamPolicyRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a GetIamPolicyRequest message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns GetIamPolicyRequest
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.GetIamPolicyRequest;

                /**
                 * Creates a plain object from a GetIamPolicyRequest message. Also converts values to other types if specified.
                 * @param message GetIamPolicyRequest
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.GetIamPolicyRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this GetIamPolicyRequest to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for GetIamPolicyRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a TestIamPermissionsRequest. */
            interface ITestIamPermissionsRequest {

                /** TestIamPermissionsRequest resource */
                resource?: (string|null);

                /** TestIamPermissionsRequest permissions */
                permissions?: (string[]|null);
            }

            /** Represents a TestIamPermissionsRequest. */
            class TestIamPermissionsRequest implements ITestIamPermissionsRequest {

                /**
                 * Constructs a new TestIamPermissionsRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.ITestIamPermissionsRequest);

                /** TestIamPermissionsRequest resource. */
                public resource: string;

                /** TestIamPermissionsRequest permissions. */
                public permissions: string[];

                /**
                 * Creates a new TestIamPermissionsRequest instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns TestIamPermissionsRequest instance
                 */
                public static create(properties?: google.iam.v1.ITestIamPermissionsRequest): google.iam.v1.TestIamPermissionsRequest;

                /**
                 * Encodes the specified TestIamPermissionsRequest message. Does not implicitly {@link google.iam.v1.TestIamPermissionsRequest.verify|verify} messages.
                 * @param message TestIamPermissionsRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.ITestIamPermissionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified TestIamPermissionsRequest message, length delimited. Does not implicitly {@link google.iam.v1.TestIamPermissionsRequest.verify|verify} messages.
                 * @param message TestIamPermissionsRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.ITestIamPermissionsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a TestIamPermissionsRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns TestIamPermissionsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.TestIamPermissionsRequest;

                /**
                 * Decodes a TestIamPermissionsRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns TestIamPermissionsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.TestIamPermissionsRequest;

                /**
                 * Verifies a TestIamPermissionsRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a TestIamPermissionsRequest message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns TestIamPermissionsRequest
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.TestIamPermissionsRequest;

                /**
                 * Creates a plain object from a TestIamPermissionsRequest message. Also converts values to other types if specified.
                 * @param message TestIamPermissionsRequest
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.TestIamPermissionsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this TestIamPermissionsRequest to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for TestIamPermissionsRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a TestIamPermissionsResponse. */
            interface ITestIamPermissionsResponse {

                /** TestIamPermissionsResponse permissions */
                permissions?: (string[]|null);
            }

            /** Represents a TestIamPermissionsResponse. */
            class TestIamPermissionsResponse implements ITestIamPermissionsResponse {

                /**
                 * Constructs a new TestIamPermissionsResponse.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.ITestIamPermissionsResponse);

                /** TestIamPermissionsResponse permissions. */
                public permissions: string[];

                /**
                 * Creates a new TestIamPermissionsResponse instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns TestIamPermissionsResponse instance
                 */
                public static create(properties?: google.iam.v1.ITestIamPermissionsResponse): google.iam.v1.TestIamPermissionsResponse;

                /**
                 * Encodes the specified TestIamPermissionsResponse message. Does not implicitly {@link google.iam.v1.TestIamPermissionsResponse.verify|verify} messages.
                 * @param message TestIamPermissionsResponse message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.ITestIamPermissionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified TestIamPermissionsResponse message, length delimited. Does not implicitly {@link google.iam.v1.TestIamPermissionsResponse.verify|verify} messages.
                 * @param message TestIamPermissionsResponse message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.ITestIamPermissionsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a TestIamPermissionsResponse message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns TestIamPermissionsResponse
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.TestIamPermissionsResponse;

                /**
                 * Decodes a TestIamPermissionsResponse message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns TestIamPermissionsResponse
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.TestIamPermissionsResponse;

                /**
                 * Verifies a TestIamPermissionsResponse message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a TestIamPermissionsResponse message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns TestIamPermissionsResponse
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.TestIamPermissionsResponse;

                /**
                 * Creates a plain object from a TestIamPermissionsResponse message. Also converts values to other types if specified.
                 * @param message TestIamPermissionsResponse
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.TestIamPermissionsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this TestIamPermissionsResponse to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for TestIamPermissionsResponse
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a GetPolicyOptions. */
            interface IGetPolicyOptions {

                /** GetPolicyOptions requestedPolicyVersion */
                requestedPolicyVersion?: (number|null);
            }

            /** Represents a GetPolicyOptions. */
            class GetPolicyOptions implements IGetPolicyOptions {

                /**
                 * Constructs a new GetPolicyOptions.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IGetPolicyOptions);

                /** GetPolicyOptions requestedPolicyVersion. */
                public requestedPolicyVersion: number;

                /**
                 * Creates a new GetPolicyOptions instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns GetPolicyOptions instance
                 */
                public static create(properties?: google.iam.v1.IGetPolicyOptions): google.iam.v1.GetPolicyOptions;

                /**
                 * Encodes the specified GetPolicyOptions message. Does not implicitly {@link google.iam.v1.GetPolicyOptions.verify|verify} messages.
                 * @param message GetPolicyOptions message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IGetPolicyOptions, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified GetPolicyOptions message, length delimited. Does not implicitly {@link google.iam.v1.GetPolicyOptions.verify|verify} messages.
                 * @param message GetPolicyOptions message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IGetPolicyOptions, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a GetPolicyOptions message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GetPolicyOptions
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.GetPolicyOptions;

                /**
                 * Decodes a GetPolicyOptions message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns GetPolicyOptions
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.GetPolicyOptions;

                /**
                 * Verifies a GetPolicyOptions message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a GetPolicyOptions message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns GetPolicyOptions
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.GetPolicyOptions;

                /**
                 * Creates a plain object from a GetPolicyOptions message. Also converts values to other types if specified.
                 * @param message GetPolicyOptions
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.GetPolicyOptions, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this GetPolicyOptions to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for GetPolicyOptions
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Policy. */
            interface IPolicy {

                /** Policy version */
                version?: (number|null);

                /** Policy bindings */
                bindings?: (google.iam.v1.IBinding[]|null);

                /** Policy auditConfigs */
                auditConfigs?: (google.iam.v1.IAuditConfig[]|null);

                /** Policy etag */
                etag?: (Uint8Array|string|null);
            }

            /** Represents a Policy. */
            class Policy implements IPolicy {

                /**
                 * Constructs a new Policy.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IPolicy);

                /** Policy version. */
                public version: number;

                /** Policy bindings. */
                public bindings: google.iam.v1.IBinding[];

                /** Policy auditConfigs. */
                public auditConfigs: google.iam.v1.IAuditConfig[];

                /** Policy etag. */
                public etag: (Uint8Array|string);

                /**
                 * Creates a new Policy instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Policy instance
                 */
                public static create(properties?: google.iam.v1.IPolicy): google.iam.v1.Policy;

                /**
                 * Encodes the specified Policy message. Does not implicitly {@link google.iam.v1.Policy.verify|verify} messages.
                 * @param message Policy message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IPolicy, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Policy message, length delimited. Does not implicitly {@link google.iam.v1.Policy.verify|verify} messages.
                 * @param message Policy message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IPolicy, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Policy message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Policy
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.Policy;

                /**
                 * Decodes a Policy message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Policy
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.Policy;

                /**
                 * Verifies a Policy message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Policy message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Policy
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.Policy;

                /**
                 * Creates a plain object from a Policy message. Also converts values to other types if specified.
                 * @param message Policy
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.Policy, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Policy to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Policy
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Binding. */
            interface IBinding {

                /** Binding role */
                role?: (string|null);

                /** Binding members */
                members?: (string[]|null);

                /** Binding condition */
                condition?: (google.type.IExpr|null);
            }

            /** Represents a Binding. */
            class Binding implements IBinding {

                /**
                 * Constructs a new Binding.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IBinding);

                /** Binding role. */
                public role: string;

                /** Binding members. */
                public members: string[];

                /** Binding condition. */
                public condition?: (google.type.IExpr|null);

                /**
                 * Creates a new Binding instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Binding instance
                 */
                public static create(properties?: google.iam.v1.IBinding): google.iam.v1.Binding;

                /**
                 * Encodes the specified Binding message. Does not implicitly {@link google.iam.v1.Binding.verify|verify} messages.
                 * @param message Binding message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IBinding, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Binding message, length delimited. Does not implicitly {@link google.iam.v1.Binding.verify|verify} messages.
                 * @param message Binding message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IBinding, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Binding message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Binding
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.Binding;

                /**
                 * Decodes a Binding message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Binding
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.Binding;

                /**
                 * Verifies a Binding message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Binding message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Binding
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.Binding;

                /**
                 * Creates a plain object from a Binding message. Also converts values to other types if specified.
                 * @param message Binding
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.Binding, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Binding to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for Binding
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of an AuditConfig. */
            interface IAuditConfig {

                /** AuditConfig service */
                service?: (string|null);

                /** AuditConfig auditLogConfigs */
                auditLogConfigs?: (google.iam.v1.IAuditLogConfig[]|null);
            }

            /** Represents an AuditConfig. */
            class AuditConfig implements IAuditConfig {

                /**
                 * Constructs a new AuditConfig.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IAuditConfig);

                /** AuditConfig service. */
                public service: string;

                /** AuditConfig auditLogConfigs. */
                public auditLogConfigs: google.iam.v1.IAuditLogConfig[];

                /**
                 * Creates a new AuditConfig instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns AuditConfig instance
                 */
                public static create(properties?: google.iam.v1.IAuditConfig): google.iam.v1.AuditConfig;

                /**
                 * Encodes the specified AuditConfig message. Does not implicitly {@link google.iam.v1.AuditConfig.verify|verify} messages.
                 * @param message AuditConfig message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IAuditConfig, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified AuditConfig message, length delimited. Does not implicitly {@link google.iam.v1.AuditConfig.verify|verify} messages.
                 * @param message AuditConfig message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IAuditConfig, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an AuditConfig message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns AuditConfig
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.AuditConfig;

                /**
                 * Decodes an AuditConfig message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns AuditConfig
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.AuditConfig;

                /**
                 * Verifies an AuditConfig message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an AuditConfig message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns AuditConfig
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.AuditConfig;

                /**
                 * Creates a plain object from an AuditConfig message. Also converts values to other types if specified.
                 * @param message AuditConfig
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.AuditConfig, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this AuditConfig to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for AuditConfig
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of an AuditLogConfig. */
            interface IAuditLogConfig {

                /** AuditLogConfig logType */
                logType?: (google.iam.v1.AuditLogConfig.LogType|keyof typeof google.iam.v1.AuditLogConfig.LogType|null);

                /** AuditLogConfig exemptedMembers */
                exemptedMembers?: (string[]|null);
            }

            /** Represents an AuditLogConfig. */
            class AuditLogConfig implements IAuditLogConfig {

                /**
                 * Constructs a new AuditLogConfig.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IAuditLogConfig);

                /** AuditLogConfig logType. */
                public logType: (google.iam.v1.AuditLogConfig.LogType|keyof typeof google.iam.v1.AuditLogConfig.LogType);

                /** AuditLogConfig exemptedMembers. */
                public exemptedMembers: string[];

                /**
                 * Creates a new AuditLogConfig instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns AuditLogConfig instance
                 */
                public static create(properties?: google.iam.v1.IAuditLogConfig): google.iam.v1.AuditLogConfig;

                /**
                 * Encodes the specified AuditLogConfig message. Does not implicitly {@link google.iam.v1.AuditLogConfig.verify|verify} messages.
                 * @param message AuditLogConfig message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IAuditLogConfig, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified AuditLogConfig message, length delimited. Does not implicitly {@link google.iam.v1.AuditLogConfig.verify|verify} messages.
                 * @param message AuditLogConfig message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IAuditLogConfig, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an AuditLogConfig message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns AuditLogConfig
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.AuditLogConfig;

                /**
                 * Decodes an AuditLogConfig message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns AuditLogConfig
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.AuditLogConfig;

                /**
                 * Verifies an AuditLogConfig message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an AuditLogConfig message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns AuditLogConfig
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.AuditLogConfig;

                /**
                 * Creates a plain object from an AuditLogConfig message. Also converts values to other types if specified.
                 * @param message AuditLogConfig
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.AuditLogConfig, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this AuditLogConfig to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for AuditLogConfig
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace AuditLogConfig {

                /** LogType enum. */
                enum LogType {
                    LOG_TYPE_UNSPECIFIED = 0,
                    ADMIN_READ = 1,
                    DATA_WRITE = 2,
                    DATA_READ = 3
                }
            }

            /** Properties of a PolicyDelta. */
            interface IPolicyDelta {

                /** PolicyDelta bindingDeltas */
                bindingDeltas?: (google.iam.v1.IBindingDelta[]|null);

                /** PolicyDelta auditConfigDeltas */
                auditConfigDeltas?: (google.iam.v1.IAuditConfigDelta[]|null);
            }

            /** Represents a PolicyDelta. */
            class PolicyDelta implements IPolicyDelta {

                /**
                 * Constructs a new PolicyDelta.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IPolicyDelta);

                /** PolicyDelta bindingDeltas. */
                public bindingDeltas: google.iam.v1.IBindingDelta[];

                /** PolicyDelta auditConfigDeltas. */
                public auditConfigDeltas: google.iam.v1.IAuditConfigDelta[];

                /**
                 * Creates a new PolicyDelta instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns PolicyDelta instance
                 */
                public static create(properties?: google.iam.v1.IPolicyDelta): google.iam.v1.PolicyDelta;

                /**
                 * Encodes the specified PolicyDelta message. Does not implicitly {@link google.iam.v1.PolicyDelta.verify|verify} messages.
                 * @param message PolicyDelta message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IPolicyDelta, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PolicyDelta message, length delimited. Does not implicitly {@link google.iam.v1.PolicyDelta.verify|verify} messages.
                 * @param message PolicyDelta message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IPolicyDelta, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PolicyDelta message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PolicyDelta
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.PolicyDelta;

                /**
                 * Decodes a PolicyDelta message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PolicyDelta
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.PolicyDelta;

                /**
                 * Verifies a PolicyDelta message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a PolicyDelta message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns PolicyDelta
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.PolicyDelta;

                /**
                 * Creates a plain object from a PolicyDelta message. Also converts values to other types if specified.
                 * @param message PolicyDelta
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.PolicyDelta, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this PolicyDelta to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for PolicyDelta
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a BindingDelta. */
            interface IBindingDelta {

                /** BindingDelta action */
                action?: (google.iam.v1.BindingDelta.Action|keyof typeof google.iam.v1.BindingDelta.Action|null);

                /** BindingDelta role */
                role?: (string|null);

                /** BindingDelta member */
                member?: (string|null);

                /** BindingDelta condition */
                condition?: (google.type.IExpr|null);
            }

            /** Represents a BindingDelta. */
            class BindingDelta implements IBindingDelta {

                /**
                 * Constructs a new BindingDelta.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IBindingDelta);

                /** BindingDelta action. */
                public action: (google.iam.v1.BindingDelta.Action|keyof typeof google.iam.v1.BindingDelta.Action);

                /** BindingDelta role. */
                public role: string;

                /** BindingDelta member. */
                public member: string;

                /** BindingDelta condition. */
                public condition?: (google.type.IExpr|null);

                /**
                 * Creates a new BindingDelta instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns BindingDelta instance
                 */
                public static create(properties?: google.iam.v1.IBindingDelta): google.iam.v1.BindingDelta;

                /**
                 * Encodes the specified BindingDelta message. Does not implicitly {@link google.iam.v1.BindingDelta.verify|verify} messages.
                 * @param message BindingDelta message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IBindingDelta, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified BindingDelta message, length delimited. Does not implicitly {@link google.iam.v1.BindingDelta.verify|verify} messages.
                 * @param message BindingDelta message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IBindingDelta, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a BindingDelta message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns BindingDelta
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.BindingDelta;

                /**
                 * Decodes a BindingDelta message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns BindingDelta
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.BindingDelta;

                /**
                 * Verifies a BindingDelta message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a BindingDelta message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns BindingDelta
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.BindingDelta;

                /**
                 * Creates a plain object from a BindingDelta message. Also converts values to other types if specified.
                 * @param message BindingDelta
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.BindingDelta, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this BindingDelta to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for BindingDelta
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace BindingDelta {

                /** Action enum. */
                enum Action {
                    ACTION_UNSPECIFIED = 0,
                    ADD = 1,
                    REMOVE = 2
                }
            }

            /** Properties of an AuditConfigDelta. */
            interface IAuditConfigDelta {

                /** AuditConfigDelta action */
                action?: (google.iam.v1.AuditConfigDelta.Action|keyof typeof google.iam.v1.AuditConfigDelta.Action|null);

                /** AuditConfigDelta service */
                service?: (string|null);

                /** AuditConfigDelta exemptedMember */
                exemptedMember?: (string|null);

                /** AuditConfigDelta logType */
                logType?: (string|null);
            }

            /** Represents an AuditConfigDelta. */
            class AuditConfigDelta implements IAuditConfigDelta {

                /**
                 * Constructs a new AuditConfigDelta.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: google.iam.v1.IAuditConfigDelta);

                /** AuditConfigDelta action. */
                public action: (google.iam.v1.AuditConfigDelta.Action|keyof typeof google.iam.v1.AuditConfigDelta.Action);

                /** AuditConfigDelta service. */
                public service: string;

                /** AuditConfigDelta exemptedMember. */
                public exemptedMember: string;

                /** AuditConfigDelta logType. */
                public logType: string;

                /**
                 * Creates a new AuditConfigDelta instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns AuditConfigDelta instance
                 */
                public static create(properties?: google.iam.v1.IAuditConfigDelta): google.iam.v1.AuditConfigDelta;

                /**
                 * Encodes the specified AuditConfigDelta message. Does not implicitly {@link google.iam.v1.AuditConfigDelta.verify|verify} messages.
                 * @param message AuditConfigDelta message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: google.iam.v1.IAuditConfigDelta, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified AuditConfigDelta message, length delimited. Does not implicitly {@link google.iam.v1.AuditConfigDelta.verify|verify} messages.
                 * @param message AuditConfigDelta message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: google.iam.v1.IAuditConfigDelta, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an AuditConfigDelta message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns AuditConfigDelta
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.iam.v1.AuditConfigDelta;

                /**
                 * Decodes an AuditConfigDelta message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns AuditConfigDelta
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.iam.v1.AuditConfigDelta;

                /**
                 * Verifies an AuditConfigDelta message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an AuditConfigDelta message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns AuditConfigDelta
                 */
                public static fromObject(object: { [k: string]: any }): google.iam.v1.AuditConfigDelta;

                /**
                 * Creates a plain object from an AuditConfigDelta message. Also converts values to other types if specified.
                 * @param message AuditConfigDelta
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: google.iam.v1.AuditConfigDelta, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this AuditConfigDelta to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };

                /**
                 * Gets the default type url for AuditConfigDelta
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            namespace AuditConfigDelta {

                /** Action enum. */
                enum Action {
                    ACTION_UNSPECIFIED = 0,
                    ADD = 1,
                    REMOVE = 2
                }
            }
        }
    }

    /** Namespace type. */
    namespace type {

        /** Properties of an Expr. */
        interface IExpr {

            /** Expr expression */
            expression?: (string|null);

            /** Expr title */
            title?: (string|null);

            /** Expr description */
            description?: (string|null);

            /** Expr location */
            location?: (string|null);
        }

        /** Represents an Expr. */
        class Expr implements IExpr {

            /**
             * Constructs a new Expr.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.type.IExpr);

            /** Expr expression. */
            public expression: string;

            /** Expr title. */
            public title: string;

            /** Expr description. */
            public description: string;

            /** Expr location. */
            public location: string;

            /**
             * Creates a new Expr instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Expr instance
             */
            public static create(properties?: google.type.IExpr): google.type.Expr;

            /**
             * Encodes the specified Expr message. Does not implicitly {@link google.type.Expr.verify|verify} messages.
             * @param message Expr message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.type.IExpr, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Expr message, length delimited. Does not implicitly {@link google.type.Expr.verify|verify} messages.
             * @param message Expr message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.type.IExpr, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Expr message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Expr
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.type.Expr;

            /**
             * Decodes an Expr message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Expr
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.type.Expr;

            /**
             * Verifies an Expr message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Expr message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Expr
             */
            public static fromObject(object: { [k: string]: any }): google.type.Expr;

            /**
             * Creates a plain object from an Expr message. Also converts values to other types if specified.
             * @param message Expr
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.type.Expr, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Expr to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Expr
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }
}
