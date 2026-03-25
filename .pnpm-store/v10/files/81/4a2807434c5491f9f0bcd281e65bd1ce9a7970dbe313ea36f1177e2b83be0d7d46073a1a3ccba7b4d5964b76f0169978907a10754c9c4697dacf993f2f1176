"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const net = __importStar(require("net"));
const tls = __importStar(require("tls"));
const url_1 = require("url");
const debug_1 = __importDefault(require("debug"));
const uuid_1 = require("uuid");
const Attribute_1 = require("./Attribute");
const controls_1 = require("./controls");
const FilterParser_1 = require("./FilterParser");
const filters_1 = require("./filters");
const MessageParser_1 = require("./MessageParser");
const MessageResponseStatus_1 = require("./MessageResponseStatus");
const messages_1 = require("./messages");
const StatusCodeParser_1 = require("./StatusCodeParser");
const MAX_MESSAGE_ID = 2 ** 31 - 1;
const logDebug = (0, debug_1.default)('ldapts');
class Client {
    constructor(options) {
        this.messageId = 1;
        this.connected = false;
        this.messageParser = new MessageParser_1.MessageParser();
        this.messageDetailsByMessageId = {};
        this.socketDataHandler = (data) => {
            if (this.messageParser) {
                this.messageParser.read(data);
            }
        };
        this.clientOptions = options || {};
        if (!this.clientOptions.timeout) {
            this.clientOptions.timeout = 0;
        }
        if (!this.clientOptions.connectTimeout) {
            this.clientOptions.connectTimeout = 0;
        }
        this.clientOptions.strictDN = this.clientOptions.strictDN !== false;
        const parsedUrl = (0, url_1.parse)(options.url);
        if (!parsedUrl.protocol || !(parsedUrl.protocol === 'ldap:' || parsedUrl.protocol === 'ldaps:')) {
            throw new Error(`${options.url} is an invalid LDAP URL (protocol)`);
        }
        const isSecureProtocol = parsedUrl.protocol === 'ldaps:';
        this.secure = isSecureProtocol || !!this.clientOptions.tlsOptions;
        this.host = parsedUrl.hostname || 'localhost';
        if (parsedUrl.port) {
            this.port = Number(parsedUrl.port);
        }
        else if (isSecureProtocol) {
            this.port = 636;
        }
        else {
            this.port = 389;
        }
        this.messageParser.on('error', (err) => {
            if (err.messageDetails && err.messageDetails.messageId) {
                const messageDetails = this.messageDetailsByMessageId[err.messageDetails.messageId.toString()];
                if (messageDetails) {
                    delete this.messageDetailsByMessageId[err.messageDetails.messageId.toString()];
                    messageDetails.reject(err);
                    return;
                }
            }
            logDebug(err.stack);
        });
        this.messageParser.on('message', this._handleSendResponse.bind(this));
    }
    get isConnected() {
        return !!this.socket && this.connected;
    }
    async startTLS(options = {}, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        await this.exop('1.3.6.1.4.1.1466.20037', undefined, controls);
        const originalSocket = this.socket;
        if (originalSocket) {
            originalSocket.removeListener('data', this.socketDataHandler);
            // Reuse existing socket
            options.socket = originalSocket;
        }
        this.socket = await new Promise((resolve, reject) => {
            const secureSocket = tls.connect(options);
            secureSocket.once('secureConnect', () => {
                secureSocket.removeAllListeners('error');
                secureSocket.on('data', this.socketDataHandler);
                secureSocket.on('error', () => {
                    if (originalSocket) {
                        originalSocket.destroy();
                    }
                });
                resolve(secureSocket);
            });
            secureSocket.once('error', (err) => {
                secureSocket.removeAllListeners();
                reject(err);
            });
        });
        if (originalSocket) {
            // Allows pending messages and unbind responses to be handled and cleaned up
            this.socket.id = originalSocket.id;
        }
    }
    /**
     * Performs a simple or sasl authentication against the server.
     * @param {string|DN|SaslMechanism} dnOrSaslMechanism
     * @param {string} [password]
     * @param {Control|Control[]} [controls]
     */
    async bind(dnOrSaslMechanism, password, controls) {
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        if (typeof dnOrSaslMechanism === 'string' && messages_1.SASL_MECHANISMS.includes(dnOrSaslMechanism)) {
            await this.bindSASL(dnOrSaslMechanism, password, controls);
            return;
        }
        const req = new messages_1.BindRequest({
            messageId: this._nextMessageId(),
            dn: typeof dnOrSaslMechanism === 'string' ? dnOrSaslMechanism : dnOrSaslMechanism.toString(),
            password,
            controls,
        });
        await this._sendBind(req);
    }
    /**
     * Performs a sasl authentication against the server.
     * @param {string|SaslMechanism} mechanism
     * @param {string|DN} [dn]
     * @param {string} [password]
     * @param {Control|Control[]} [controls]
     */
    async bindSASL(mechanism, password, controls) {
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        const req = new messages_1.BindRequest({
            messageId: this._nextMessageId(),
            mechanism,
            password,
            controls,
        });
        await this._sendBind(req);
    }
    /**
     * Used to create a new entry in the directory
     * @param {string|DN} dn - The DN of the entry to add
     * @param {Attribute[]|object} attributes - Array of attributes or object where keys are the name of each attribute
     * @param {Control|Control[]} [controls]
     */
    async add(dn, attributes, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        let attributesToAdd;
        if (Array.isArray(attributes)) {
            attributesToAdd = attributes;
        }
        else {
            attributesToAdd = [];
            for (const [key, value] of Object.entries(attributes)) {
                let values;
                if (Array.isArray(value)) {
                    values = value;
                }
                else if (value == null) {
                    values = [];
                }
                else {
                    values = [value];
                }
                attributesToAdd.push(new Attribute_1.Attribute({
                    type: key,
                    values,
                }));
            }
        }
        const req = new messages_1.AddRequest({
            messageId: this._nextMessageId(),
            dn: typeof dn === 'string' ? dn : dn.toString(),
            attributes: attributesToAdd,
            controls,
        });
        const result = await this._send(req);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
    }
    /**
     * Compares an attribute/value pair with an entry on the LDAP server.
     * @param {string|DN} dn - The DN of the entry to compare attributes with
     * @param {string} attribute
     * @param {string} value
     * @param {Control|Control[]} [controls]
     */
    async compare(dn, attribute, value, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        const req = new messages_1.CompareRequest({
            messageId: this._nextMessageId(),
            dn: typeof dn === 'string' ? dn : dn.toString(),
            attribute,
            value,
            controls,
        });
        const response = await this._send(req);
        switch (response.status) {
            case messages_1.CompareResult.compareTrue:
                return true;
            case messages_1.CompareResult.compareFalse:
                return false;
            default:
                throw StatusCodeParser_1.StatusCodeParser.parse(response);
        }
    }
    /**
     * Deletes an entry from the LDAP server.
     * @param {string|DN} dn - The DN of the entry to delete
     * @param {Control|Control[]} [controls]
     */
    async del(dn, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        const req = new messages_1.DeleteRequest({
            messageId: this._nextMessageId(),
            dn: typeof dn === 'string' ? dn : dn.toString(),
            controls,
        });
        const result = await this._send(req);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
    }
    /**
     * Performs an extended operation on the LDAP server.
     * @param {string} oid - The object identifier (OID) of the extended operation to perform
     * @param {string|Buffer} [value]
     * @param {Control|Control[]} [controls]
     */
    async exop(oid, value, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        const req = new messages_1.ExtendedRequest({
            messageId: this._nextMessageId(),
            oid,
            value,
            controls,
        });
        const result = await this._send(req);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
        return {
            oid: result.oid,
            value: result.value,
        };
    }
    /**
     * Performs an LDAP modify against the server.
     * @param {string|DN} dn - The DN of the entry to modify
     * @param {Change|Change[]} changes
     * @param {Control|Control[]} [controls]
     */
    async modify(dn, changes, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (changes && !Array.isArray(changes)) {
            changes = [changes];
        }
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        const req = new messages_1.ModifyRequest({
            messageId: this._nextMessageId(),
            dn: typeof dn === 'string' ? dn : dn.toString(),
            changes,
            controls,
        });
        const result = await this._send(req);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
    }
    /**
     * Performs an LDAP modifyDN against the server.
     * @param {string|DN} dn - The DN of the entry to modify
     * @param {string|DN} newDN - The new DN to move this entry to
     * @param {Control|Control[]} [controls]
     */
    async modifyDN(dn, newDN, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (controls && !Array.isArray(controls)) {
            controls = [controls];
        }
        let newSuperior;
        if (typeof newDN === 'string' && /[^\\],/.test(newDN)) {
            const parseIndex = newDN.search(/[^\\],/);
            newSuperior = newDN.slice(parseIndex + 2);
            newDN = newDN.slice(0, parseIndex + 1);
        }
        const req = new messages_1.ModifyDNRequest({
            messageId: this._nextMessageId(),
            dn: typeof dn === 'string' ? dn : dn.toString(),
            deleteOldRdn: true,
            newRdn: typeof newDN === 'string' ? newDN : newDN.toString(),
            newSuperior,
            controls,
        });
        const result = await this._send(req);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
    }
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
    async search(baseDN, options = {}, controls) {
        if (!this.isConnected) {
            await this._connect();
        }
        if (controls) {
            if (Array.isArray(controls)) {
                controls = controls.slice(0);
            }
            else {
                controls = [controls];
            }
            // Make sure PagedResultsControl is not specified since it's handled internally
            for (const control of controls) {
                if (control instanceof controls_1.PagedResultsControl) {
                    throw new Error('Should not specify PagedResultsControl');
                }
            }
        }
        else {
            controls = [];
        }
        let pageSize = 100;
        if (typeof options.paged === 'object' && options.paged.pageSize) {
            pageSize = options.paged.pageSize;
        }
        else if (options.sizeLimit && options.sizeLimit > 1) {
            // According to the RFC, servers should ignore the paging control if
            // pageSize >= sizelimit.  Some might still send results, but it's safer
            // to stay under that figure when assigning a default value.
            pageSize = options.sizeLimit - 1;
        }
        let pagedResultsControl;
        const shouldPage = !!options.paged;
        if (shouldPage) {
            pagedResultsControl = new controls_1.PagedResultsControl({
                value: {
                    size: pageSize,
                },
            });
            controls.push(pagedResultsControl);
        }
        let filter;
        if (options.filter) {
            if (typeof options.filter === 'string') {
                filter = FilterParser_1.FilterParser.parseString(options.filter);
            }
            else {
                filter = options.filter;
            }
        }
        else {
            filter = new filters_1.PresenceFilter({ attribute: 'objectclass' });
        }
        const searchRequest = new messages_1.SearchRequest({
            messageId: -1,
            baseDN: typeof baseDN === 'string' ? baseDN : baseDN.toString(),
            scope: options.scope,
            filter,
            attributes: options.attributes,
            explicitBufferAttributes: options.explicitBufferAttributes,
            returnAttributeValues: options.returnAttributeValues,
            sizeLimit: options.sizeLimit,
            timeLimit: options.timeLimit,
            controls,
        });
        const searchResult = {
            searchEntries: [],
            searchReferences: [],
        };
        await this._sendSearch(searchRequest, searchResult, shouldPage, pageSize, pagedResultsControl);
        return searchResult;
    }
    /**
     * Unbinds this client from the LDAP server.
     * @returns {void|Promise} void if not connected; otherwise returns a promise to the request to disconnect
     */
    async unbind() {
        if (!this.connected || !this.socket) {
            return;
        }
        const req = new messages_1.UnbindRequest({
            messageId: this._nextMessageId(),
        });
        await this._send(req);
    }
    async _sendBind(req) {
        if (!this.isConnected) {
            await this._connect();
        }
        const result = await this._send(req);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
    }
    async _sendSearch(searchRequest, searchResult, paged, pageSize, pagedResultsControl) {
        searchRequest.messageId = this._nextMessageId();
        const result = await this._send(searchRequest);
        if (result.status !== MessageResponseStatus_1.MessageResponseStatus.Success && !(result.status === MessageResponseStatus_1.MessageResponseStatus.SizeLimitExceeded && searchRequest.sizeLimit)) {
            throw StatusCodeParser_1.StatusCodeParser.parse(result);
        }
        for (const searchEntry of result.searchEntries) {
            searchResult.searchEntries.push(searchEntry.toObject(searchRequest.attributes, searchRequest.explicitBufferAttributes));
        }
        for (const searchReference of result.searchReferences) {
            searchResult.searchReferences.push(...searchReference.uris);
        }
        // Recursively search if paging is specified
        if (paged && (result.searchEntries.length || result.searchReferences.length) && pagedResultsControl) {
            let pagedResultsFromResponse;
            for (const control of result.controls || []) {
                if (control instanceof controls_1.PagedResultsControl) {
                    pagedResultsFromResponse = control;
                    break;
                }
            }
            if (pagedResultsFromResponse && pagedResultsFromResponse.value && pagedResultsFromResponse.value.cookie && pagedResultsFromResponse.value.cookie.length) {
                // Recursively keep searching
                pagedResultsControl.value = pagedResultsControl.value || {
                    size: pageSize,
                };
                pagedResultsControl.value.cookie = pagedResultsFromResponse.value.cookie;
                await this._sendSearch(searchRequest, searchResult, paged, pageSize, pagedResultsControl);
            }
        }
    }
    _nextMessageId() {
        this.messageId += 1;
        if (this.messageId >= MAX_MESSAGE_ID) {
            this.messageId = 1;
        }
        return this.messageId;
    }
    /**
     * Open the socket connection
     * @returns {Promise<void>}
     * @private
     */
    _connect() {
        if (this.isConnected) {
            return;
        }
        return new Promise((resolve, reject) => {
            if (this.secure) {
                this.socket = tls.connect(this.port, this.host, this.clientOptions.tlsOptions);
                this.socket.id = (0, uuid_1.v4)();
                this.socket.once('secureConnect', () => {
                    this._onConnect(resolve);
                });
            }
            else {
                this.socket = net.connect(this.port, this.host);
                this.socket.id = (0, uuid_1.v4)();
                this.socket.once('connect', () => {
                    this._onConnect(resolve);
                });
            }
            this.socket.once('error', (err) => {
                if (this.connectTimer) {
                    clearTimeout(this.connectTimer);
                    delete this.connectTimer;
                }
                reject(err);
            });
            if (this.clientOptions.connectTimeout) {
                this.connectTimer = setTimeout(() => {
                    if (this.socket && (!this.socket.readable || !this.socket.writable)) {
                        this.connected = false;
                        this.socket.destroy();
                        delete this.socket;
                    }
                    return reject(new Error('Connection timeout'));
                }, this.clientOptions.connectTimeout);
            }
        });
    }
    _onConnect(next) {
        if (this.connectTimer) {
            clearTimeout(this.connectTimer);
        }
        // Clear out event listeners from _connect()
        if (this.socket) {
            this.socket.removeAllListeners('error');
            this.socket.removeAllListeners('connect');
            this.socket.removeAllListeners('secureConnect');
        }
        this.connected = true;
        // region Socket events handlers
        const socketError = (err) => {
            // Clean up any pending messages
            for (const [key, messageDetails] of Object.entries(this.messageDetailsByMessageId)) {
                if (messageDetails.message instanceof messages_1.UnbindRequest) {
                    // Consider unbind as success since the connection is closed.
                    messageDetails.resolve();
                }
                else {
                    messageDetails.reject(new Error(`Socket error. Message type: ${messageDetails.message.constructor.name} (0x${messageDetails.message.protocolOperation.toString(16)})\n${err.message || err.stack || 'Unknown'}`));
                }
                delete this.messageDetailsByMessageId[key];
            }
            if (this.socket) {
                this.socket.destroy();
            }
        };
        function socketEnd() {
            if (this) {
                // Acknowledge to other end of the connection that the connection is ended.
                this.end();
            }
        }
        function socketTimeout() {
            if (this) {
                // Acknowledge to other end of the connection that the connection is ended.
                this.end();
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const clientInstance = this;
        function socketClose() {
            if (this) {
                this.removeListener('error', socketError);
                this.removeListener('close', socketClose);
                this.removeListener('data', clientInstance.socketDataHandler);
                this.removeListener('end', socketEnd);
                this.removeListener('timeout', socketTimeout);
            }
            if (this === clientInstance.socket) {
                clientInstance.connected = false;
                delete clientInstance.socket;
            }
            // Clean up any pending messages
            for (const [key, messageDetails] of Object.entries(clientInstance.messageDetailsByMessageId)) {
                if (messageDetails.socket.id === this.id) {
                    if (messageDetails.message instanceof messages_1.UnbindRequest) {
                        // Consider unbind as success since the connection is closed.
                        messageDetails.resolve();
                    }
                    else {
                        messageDetails.reject(new Error(`Connection closed before message response was received. Message type: ${messageDetails.message.constructor.name} (0x${messageDetails.message.protocolOperation.toString(16)})`));
                    }
                    delete clientInstance.messageDetailsByMessageId[key];
                }
            }
        }
        // endregion
        // Hook up event listeners
        if (this.socket) {
            this.socket.on('error', socketError);
            this.socket.on('close', socketClose);
            this.socket.on('data', this.socketDataHandler);
            this.socket.on('end', socketEnd);
            this.socket.on('timeout', socketTimeout);
        }
        return next();
    }
    _endSocket(socket) {
        if (socket === this.socket) {
            this.connected = false;
        }
        // Ignore any error since the connection is being closed
        socket.removeAllListeners('error');
        socket.on('error', () => {
            // Ignore NOOP
        });
        socket.end();
    }
    /**
     * Sends request message to the ldap server over the connected socket. Each message request is given a
     * unique id (messageId), used to identify the associated response when it is sent back over the socket.
     *
     * @returns {Promise<Message>}
     * @private
     * @param {object} message
     */
    _send(message) {
        if (!this.connected || !this.socket) {
            throw new Error('Socket connection not established');
        }
        const messageContentBuffer = message.write();
        // eslint-disable-next-line func-style
        let messageResolve = () => {
            // Ignore this as a NOOP
        };
        // eslint-disable-next-line func-style
        let messageReject = () => {
            // Ignore this as a NOOP
        };
        const sendPromise = new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            messageResolve = resolve;
            messageReject = reject;
        });
        this.messageDetailsByMessageId[message.messageId.toString()] = {
            message,
            resolve: messageResolve,
            reject: messageReject,
            timeoutTimer: this.clientOptions.timeout
                ? setTimeout(() => {
                    const messageDetails = this.messageDetailsByMessageId[message.messageId.toString()];
                    if (messageDetails) {
                        this._endSocket(messageDetails.socket);
                        messageReject(new Error(`${message.constructor.name}: Operation timed out`));
                    }
                }, this.clientOptions.timeout)
                : null,
            socket: this.socket,
        };
        if (message.password) {
            logDebug(`Sending message: ${JSON.stringify({
                ...message,
                password: '__redacted__',
            })}`);
        }
        else {
            logDebug(`Sending message: ${JSON.stringify(message)}`);
        }
        // Send the message to the socket
        this.socket.write(messageContentBuffer, () => {
            if (message instanceof messages_1.AbandonRequest) {
                logDebug(`Abandoned message: ${message.messageId}`);
                delete this.messageDetailsByMessageId[message.messageId.toString()];
                messageResolve();
            }
            else if (message instanceof messages_1.UnbindRequest) {
                logDebug('Unbind success. Ending socket');
                if (this.socket) {
                    this._endSocket(this.socket);
                }
            }
            else {
                // NOTE: messageResolve will be called as 'data' events come from the socket
                logDebug('Message sent successfully.');
            }
        });
        return sendPromise;
    }
    _handleSendResponse(message) {
        const messageDetails = this.messageDetailsByMessageId[message.messageId.toString()];
        if (messageDetails) {
            // When performing a search, an arbitrary number of SearchEntry and SearchReference messages come through with the
            // same messageId as the SearchRequest. Finally, a SearchResponse will come through to complete the request.
            if (message instanceof messages_1.SearchEntry) {
                messageDetails.searchEntries = messageDetails.searchEntries || [];
                messageDetails.searchEntries.push(message);
            }
            else if (message instanceof messages_1.SearchReference) {
                messageDetails.searchReferences = messageDetails.searchReferences || [];
                messageDetails.searchReferences.push(message);
            }
            else if (message instanceof messages_1.SearchResponse) {
                // Assign any previously collected entries & references
                if (messageDetails.searchEntries) {
                    message.searchEntries.push(...messageDetails.searchEntries);
                }
                if (messageDetails.searchReferences) {
                    message.searchReferences.push(...messageDetails.searchReferences);
                }
                delete this.messageDetailsByMessageId[message.messageId.toString()];
                messageDetails.resolve(message);
            }
            else {
                delete this.messageDetailsByMessageId[message.messageId.toString()];
                messageDetails.resolve(message);
            }
        }
        else {
            logDebug(`Unable to find details related to message response: ${JSON.stringify(message)}`);
        }
    }
}
exports.Client = Client;
//# sourceMappingURL=Client.js.map