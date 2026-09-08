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
import path from 'node:path';
import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from '../dist/errors';
import { LazyPackageDirectoryLoader } from '../dist/nodes-loader/lazy-package-directory-loader';
import { TestDataNode } from './test-data-node';
let LoadNodesAndCredentials = class LoadNodesAndCredentials {
    loaders = {};
    directNodes = {
        'n8n-nodes-testing.testData': {
            type: new TestDataNode(),
            sourcePath: __filename,
        },
    };
    known = {
        nodes: {
            'n8n-nodes-testing.testData': {
                className: 'TestDataNode',
                sourcePath: __filename,
            },
        },
        credentials: {},
    };
    loaded = { nodes: {}, credentials: {} };
    constructor(packagePaths) {
        for (const packagePath of packagePaths) {
            const loader = new LazyPackageDirectoryLoader(packagePath);
            this.loaders[loader.packageName] = loader;
        }
    }
    async init() {
        for (const [packageName, loader] of Object.entries(this.loaders)) {
            await loader.loadAll();
            const { known, directory } = loader;
            for (const type in known.nodes) {
                const { className, sourcePath } = known.nodes[type];
                this.known.nodes[`${packageName}.${type}`] = {
                    className,
                    sourcePath: path.join(directory, sourcePath),
                };
            }
            for (const type in known.credentials) {
                const { className, sourcePath, supportedNodes, extends: extendsArr, } = known.credentials[type];
                this.known.credentials[type] = {
                    className,
                    sourcePath: path.join(directory, sourcePath),
                    supportedNodes: supportedNodes?.map((nodeName) => `${loader.packageName}.${nodeName}`),
                    extends: extendsArr,
                };
            }
        }
    }
    recognizesCredential(credentialType) {
        return credentialType in this.known.credentials;
    }
    getCredential(credentialType) {
        for (const loader of Object.values(this.loaders)) {
            if (credentialType in loader.known.credentials) {
                const loaded = loader.getCredential(credentialType);
                this.loaded.credentials[credentialType] = loaded;
            }
        }
        if (credentialType in this.loaded.credentials) {
            return this.loaded.credentials[credentialType];
        }
        throw new UnrecognizedCredentialTypeError(credentialType);
    }
    getNode(fullNodeType) {
        const directNode = this.directNodes[fullNodeType];
        if (directNode) {
            return directNode;
        }
        const [packageName, nodeType] = fullNodeType.split('.');
        const { loaders } = this;
        const loader = loaders[packageName];
        if (!loader) {
            throw new UnrecognizedNodeTypeError(packageName, nodeType);
        }
        return loader.getNode(nodeType);
    }
};
LoadNodesAndCredentials = __decorate([
    Service(),
    __metadata("design:paramtypes", [Array])
], LoadNodesAndCredentials);
export { LoadNodesAndCredentials };
//# sourceMappingURL=load-nodes-and-credentials.js.map