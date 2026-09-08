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
import { LoadNodesAndCredentials } from './load-nodes-and-credentials';
let CredentialTypes = class CredentialTypes {
    loadNodesAndCredentials;
    constructor(loadNodesAndCredentials) {
        this.loadNodesAndCredentials = loadNodesAndCredentials;
    }
    recognizes(type) {
        return this.loadNodesAndCredentials.recognizesCredential(type);
    }
    getByName(type) {
        return this.loadNodesAndCredentials.getCredential(type).type;
    }
    getSupportedNodes(type) {
        return this.loadNodesAndCredentials.known.credentials[type]?.supportedNodes ?? [];
    }
    getParentTypes(_type) {
        return [];
    }
};
CredentialTypes = __decorate([
    Service(),
    __metadata("design:paramtypes", [LoadNodesAndCredentials])
], CredentialTypes);
export { CredentialTypes };
//# sourceMappingURL=credential-types.js.map