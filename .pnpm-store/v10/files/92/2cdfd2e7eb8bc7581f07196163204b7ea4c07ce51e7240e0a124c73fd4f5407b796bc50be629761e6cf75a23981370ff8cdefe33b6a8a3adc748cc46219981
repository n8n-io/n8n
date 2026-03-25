/// <reference types="node" />
/// <reference types="node" />
import * as tls from 'tls';
import { Attribute } from './Attribute';
import type { Change } from './Change';
import type { Control } from './controls';
import type { DN } from './dn';
import type { Filter } from './filters/Filter';
import type { Entry, SaslMechanism } from './messages';
export interface ClientOptions {
    /**
     * A valid LDAP URL (proto/host/port only)
     */
    url: string;
    /**
     * Milliseconds client should let operations live for before timing out (Default: no timeout)
     */
    timeout?: number;
    /**
     * Milliseconds client should wait before timing out on TCP connections
     */
    connectTimeout?: number;
    /**
     * Additional options passed to TLS connection layer when connecting via ldaps://
     */
    tlsOptions?: tls.ConnectionOptions;
    /**
     * Force strict DN parsing for client methods (Default: true)
     */
    strictDN?: boolean;
}
export interface SearchPageOptions {
    /**
     * Number of SearchEntries to return per page for a search request. If the page size is greater than or equal to the
     * sizeLimit value, the server should ignore the control as the request can be satisfied in a single page.
     */
    pageSize?: number;
}
export interface SearchOptions {
    /**
     * Specifies how broad the search context is:
     * - base - Indicates that only the entry specified as the search base should be considered. None of its subordinates will be considered.
     * - one - Indicates that only the immediate children of the entry specified as the search base should be considered. The base entry itself should not be considered, nor any descendants of the immediate children of the base entry.
     * - sub - Indicates that the entry specified as the search base, and all of its subordinates to any depth, should be considered.
     * - children - Indicates that the entry specified by the search base should not be considered, but all of its subordinates to any depth should be considered.
     */
    scope?: 'base' | 'children' | 'one' | 'sub';
    /**
     * Specifies how the server must treat references to other entries:
     * - never - Never dereferences entries, returns alias objects instead. The alias contains the reference to the real entry.
     * - always - Always returns the referenced entries, not the alias object.
     * - search - While searching subordinates of the base object, dereferences any alias within the search scope. Dereferenced objects become the bases of further search scopes where the Search operation is also applied by the server. The server should eliminate duplicate entries that arise due to alias dereferencing while searching.
     * - find - Dereferences aliases in locating the base object of the search, but not when searching subordinates of the base object.
     */
    derefAliases?: 'always' | 'find' | 'never' | 'search';
    /**
     * If true, attribute values should be included in the entries that are returned; otherwise entries that match the search criteria should be returned containing only the attribute descriptions for the attributes contained in that entry but should not include the values for those attributes.
     */
    returnAttributeValues?: boolean;
    /**
     * This specifies the maximum number of entries that should be returned from the search. A value of zero indicates no limit. Note that the server may also impose a size limit for the search operation, and in that case the smaller of the client-requested and server-imposed size limits will be enforced.
     */
    sizeLimit?: number;
    /**
     * This specifies the maximum length of time, in seconds, that the server should spend processing the search. A value of zero indicates no limit. Note that the server may also impose a time limit for the search operation, and in that case the smaller of the client-requested and server-imposed time limits will be enforced.
     */
    timeLimit?: number;
    /**
     * Used to allow paging and specify the page size
     */
    paged?: SearchPageOptions | boolean;
    /**
     * The filter of the search request. It must conform to the LDAP filter syntax specified in RFC4515
     */
    filter?: Filter | string;
    /**
     * A set of attributes to request for inclusion in entries that match the search criteria and are returned to the client. If a specific set of attribute descriptions are listed, then only those attributes should be included in matching entries. The special value “*” indicates that all user attributes should be included in matching entries. The special value “+” indicates that all operational attributes should be included in matching entries. The special value “1.1” indicates that no attributes should be included in matching entries. Some servers may also support the ability to use the “@” symbol followed by an object class name (e.g., “@inetOrgPerson”) to request all attributes associated with that object class. If the set of attributes to request is empty, then the server should behave as if the value “*” was specified to request that all user attributes be included in entries that are returned.
     */
    attributes?: string[];
    /**
     * List of attributes to explicitly return as buffers
     */
    explicitBufferAttributes?: string[];
}
export interface SearchResult {
    searchEntries: Entry[];
    searchReferences: string[];
}
export declare class Client {
    private clientOptions;
    private messageId;
    private readonly host;
    private readonly port;
    private readonly secure;
    private connected;
    private socket?;
    private connectTimer?;
    private readonly messageParser;
    private readonly messageDetailsByMessageId;
    constructor(options: ClientOptions);
    get isConnected(): boolean;
    startTLS(options?: tls.ConnectionOptions, controls?: Control | Control[]): Promise<void>;
    /**
     * Performs a simple or sasl authentication against the server.
     * @param {string|DN|SaslMechanism} dnOrSaslMechanism
     * @param {string} [password]
     * @param {Control|Control[]} [controls]
     */
    bind(dnOrSaslMechanism: DN | SaslMechanism | string, password?: string, controls?: Control | Control[]): Promise<void>;
    /**
     * Performs a sasl authentication against the server.
     * @param {string|SaslMechanism} mechanism
     * @param {string|DN} [dn]
     * @param {string} [password]
     * @param {Control|Control[]} [controls]
     */
    bindSASL(mechanism: SaslMechanism | string, password?: string, controls?: Control | Control[]): Promise<void>;
    /**
     * Used to create a new entry in the directory
     * @param {string|DN} dn - The DN of the entry to add
     * @param {Attribute[]|object} attributes - Array of attributes or object where keys are the name of each attribute
     * @param {Control|Control[]} [controls]
     */
    add(dn: DN | string, attributes: Attribute[] | {
        [index: string]: string[] | string;
    }, controls?: Control | Control[]): Promise<void>;
    /**
     * Compares an attribute/value pair with an entry on the LDAP server.
     * @param {string|DN} dn - The DN of the entry to compare attributes with
     * @param {string} attribute
     * @param {string} value
     * @param {Control|Control[]} [controls]
     */
    compare(dn: DN | string, attribute: string, value: string, controls?: Control | Control[]): Promise<boolean>;
    /**
     * Deletes an entry from the LDAP server.
     * @param {string|DN} dn - The DN of the entry to delete
     * @param {Control|Control[]} [controls]
     */
    del(dn: DN | string, controls?: Control | Control[]): Promise<void>;
    /**
     * Performs an extended operation on the LDAP server.
     * @param {string} oid - The object identifier (OID) of the extended operation to perform
     * @param {string|Buffer} [value]
     * @param {Control|Control[]} [controls]
     */
    exop(oid: string, value?: Buffer | string, controls?: Control | Control[]): Promise<{
        oid?: string;
        value?: string;
    }>;
    /**
     * Performs an LDAP modify against the server.
     * @param {string|DN} dn - The DN of the entry to modify
     * @param {Change|Change[]} changes
     * @param {Control|Control[]} [controls]
     */
    modify(dn: DN | string, changes: Change | Change[], controls?: Control | Control[]): Promise<void>;
    /**
     * Performs an LDAP modifyDN against the server.
     * @param {string|DN} dn - The DN of the entry to modify
     * @param {string|DN} newDN - The new DN to move this entry to
     * @param {Control|Control[]} [controls]
     */
    modifyDN(dn: DN | string, newDN: DN | string, controls?: Control | Control[]): Promise<void>;
    /**
     * Performs an LDAP search against the server.
     *
     * @param {string|DN} baseDN - This specifies the base of the subtree in which the search is to be constrained.
     * @param {SearchOptions} [options]
     * @param {string|Filter} [options.filter] - The filter of the search request. It must conform to the LDAP filter syntax specified in RFC4515. Defaults to (objectclass=*)
     * @param {string} [options.scope='sub'] - Specifies how broad the search context is:
     * - base - Indicates that only the entry specified as the search base should be considered. None of its subordinates will be considered.
     * - one - Indicates that only the immediate children of the entry specified as the search base should be considered. The base entry itself should not be considered, nor any descendants of the immediate children of the base entry.
     * - sub - Indicates that the entry specified as the search base, and all of its subordinates to any depth, should be considered.
     * - children - Indicates that the entry specified by the search base should not be considered, but all of its subordinates to any depth should be considered.
     * @param {string} [options.derefAliases='never'] - Specifies how the server must treat references to other entries:
     * - never - Never dereferences entries, returns alias objects instead. The alias contains the reference to the real entry.
     * - always - Always returns the referenced entries, not the alias object.
     * - search - While searching subordinates of the base object, dereferences any alias within the search scope. Dereferenced objects become the bases of further search scopes where the Search operation is also applied by the server. The server should eliminate duplicate entries that arise due to alias dereferencing while searching.
     * - find - Dereferences aliases in locating the base object of the search, but not when searching subordinates of the base object.
     * @param {boolean} [options.returnAttributeValues=true] - If true, attribute values should be included in the entries that are returned; otherwise entries that match the search criteria should be returned containing only the attribute descriptions for the attributes contained in that entry but should not include the values for those attributes.
     * @param {number} [options.sizeLimit=0] - This specifies the maximum number of entries that should be returned from the search. A value of zero indicates no limit. Note that the server may also impose a size limit for the search operation, and in that case the smaller of the client-requested and server-imposed size limits will be enforced.
     * @param {number} [options.timeLimit=10] - This specifies the maximum length of time, in seconds, that the server should spend processing the search. A value of zero indicates no limit. Note that the server may also impose a time limit for the search operation, and in that case the smaller of the client-requested and server-imposed time limits will be enforced.
     * @param {boolean|SearchPageOptions} [options.paged=false] - Used to allow paging and specify the page size
     * @param {string[]} [options.attributes] - A set of attributes to request for inclusion in entries that match the search criteria and are returned to the client. If a specific set of attribute descriptions are listed, then only those attributes should be included in matching entries. The special value “*” indicates that all user attributes should be included in matching entries. The special value “+” indicates that all operational attributes should be included in matching entries. The special value “1.1” indicates that no attributes should be included in matching entries. Some servers may also support the ability to use the “@” symbol followed by an object class name (e.g., “@inetOrgPerson”) to request all attributes associated with that object class. If the set of attributes to request is empty, then the server should behave as if the value “*” was specified to request that all user attributes be included in entries that are returned.
     * @param {string[]} [options.explicitBufferAttributes] - List of attributes to explicitly return as buffers
     * @param {Control|Control[]} [controls]
     */
    search(baseDN: DN | string, options?: SearchOptions, controls?: Control | Control[]): Promise<SearchResult>;
    /**
     * Unbinds this client from the LDAP server.
     * @returns {void|Promise} void if not connected; otherwise returns a promise to the request to disconnect
     */
    unbind(): Promise<void>;
    private _sendBind;
    private _sendSearch;
    private readonly socketDataHandler;
    private _nextMessageId;
    /**
     * Open the socket connection
     * @returns {Promise<void>}
     * @private
     */
    private _connect;
    private _onConnect;
    private _endSocket;
    /**
     * Sends request message to the ldap server over the connected socket. Each message request is given a
     * unique id (messageId), used to identify the associated response when it is sent back over the socket.
     *
     * @returns {Promise<Message>}
     * @private
     * @param {object} message
     */
    private _send;
    private _handleSendResponse;
}
