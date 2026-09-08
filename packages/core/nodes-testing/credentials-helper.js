var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Service } from '@n8n/di';
import { ICredentialsHelper } from 'n8n-workflow';
import { Credentials } from '../dist/credentials';
import { CredentialTypes } from './credential-types';
let CredentialsHelper = class CredentialsHelper extends ICredentialsHelper {
    credentialTypes;
    credentialsMap = {};
    constructor(credentialTypes) {
        super();
        this.credentialTypes = credentialTypes;
    }
    setCredentials(credentialsMap) {
        this.credentialsMap = credentialsMap;
    }
    getCredentialsProperties() {
        return [];
    }
    async authenticate(credentials, typeName, requestParams) {
        const credentialType = this.credentialTypes.getByName(typeName);
        if (typeof credentialType.authenticate === 'function') {
            return await credentialType.authenticate(credentials, requestParams);
        }
        return requestParams;
    }
    async preAuthentication(_helpers, _credentials, _typeName, _node, _credentialsExpired) {
        return undefined;
    }
    async runPreAuthentication(_helpers, _credentials, _typeName) {
        return undefined;
    }
    getParentTypes(_name) {
        return [];
    }
    async getDecrypted(_additionalData, _nodeCredentials, type) {
        return this.credentialsMap[type] ?? {};
    }
    async getCredentials(_nodeCredentials, _type) {
        return new Credentials({ id: null, name: '' }, '', '');
    }
    async updateCredentials(_nodeCredentials, _type, _data) { }
    async updateCredentialsOauthTokenData(_nodeCredentials, _type, _data) { }
    isCredentialUsableByNode(credentialType, nodeType) {
        try {
            const typeDef = this.credentialTypes.getByName(credentialType);
            if (!typeDef.restrictToSupportedNodes)
                return true;
            // `typeDef.supportedNodes` from the loader holds short node names; the FQ
            // list (matching `nodeType`) is exposed via `getSupportedNodes`.
            return this.credentialTypes.getSupportedNodes(credentialType).includes(nodeType);
        }
        catch {
            return true;
        }
    }
};
CredentialsHelper = __decorate([
    Service(),
    __metadata("design:paramtypes", [CredentialTypes])
], CredentialsHelper);
export { CredentialsHelper };
//# sourceMappingURL=credentials-helper.js.map